import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { execFile, exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database connection
const db = new Database("users.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS onos_slices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slice_type TEXT,
    color TEXT,
    vlan_id INTEGER,
    bandwidth_kbps INTEGER,
    burst_kbps INTEGER,
    hosts TEXT,            -- JSON array
    status TEXT DEFAULT 'ACTIVE',
    meter_ids TEXT,        -- JSON object { deviceId: meterId }
    flow_rule_ids TEXT,    -- JSON array of flow IDs
    priority INTEGER DEFAULT 40000,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS onos_slice_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_capacity_kbps INTEGER DEFAULT 100000,
    vlan_counter INTEGER DEFAULT 100,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
db.prepare(
  `INSERT OR IGNORE INTO onos_slice_config (id, total_capacity_kbps, vlan_counter) VALUES (1, 100000, 100)`
).run();

// Prevent server process from crashing on unhandled promise rejections / network errors
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection in ONOS server:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception in ONOS server:", err?.message || err);
});

const app = express();
const port = process.env.ONOS_SERVER_PORT || 5001;

// ONOS Controller Configuration
const ONOS_URL = process.env.ONOS_URL || "http://localhost:8181";
const ONOS_USERNAME = process.env.ONOS_USERNAME || "onos";
const ONOS_PASSWORD = process.env.ONOS_PASSWORD || "rocks";
const ONOS_AUTH = "Basic " + Buffer.from(`${ONOS_USERNAME}:${ONOS_PASSWORD}`).toString("base64");

app.use(
  cors({
    origin: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
  }),
);

app.use(express.json());

/* ==============================================================================
   SQLITE PERSISTENCE: ONOS SLICES & CAPACITY ENDPOINTS
   ============================================================================== */

app.get(["/api/onos/slices/capacity", "/api/onos-service/slices/capacity"], (req, res) => {
  try {
    const cfg = db.prepare("SELECT * FROM onos_slice_config WHERE id = 1").get();
    res.json({ totalCapacityKbps: cfg?.total_capacity_kbps || 100000 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put(["/api/onos/slices/capacity", "/api/onos-service/slices/capacity"], (req, res) => {
  try {
    const { totalCapacityKbps } = req.body;
    db.prepare("UPDATE onos_slice_config SET total_capacity_kbps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(Number(totalCapacityKbps) || 100000);
    res.json({ success: true, totalCapacityKbps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/onos/slices/vlan/next", "/api/onos-service/slices/vlan/next"], (req, res) => {
  try {
    const cfg = db.prepare("SELECT vlan_counter FROM onos_slice_config WHERE id = 1").get();
    const currentVlan = cfg?.vlan_counter || 100;
    db.prepare("UPDATE onos_slice_config SET vlan_counter = vlan_counter + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run();
    res.json({ vlanId: currentVlan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/onos/slices", "/api/onos-service/slices"], (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM onos_slices ORDER BY created_at DESC").all();
    const slices = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.slice_type,
      color: r.color,
      vlanId: r.vlan_id,
      bandwidth: r.bandwidth_kbps,
      bandwidthKbps: r.bandwidth_kbps,
      burstSize: r.burst_kbps,
      burstKbps: r.burst_kbps,
      hosts: JSON.parse(r.hosts || "[]"),
      status: r.status,
      meterIds: JSON.parse(r.meter_ids || "{}"),
      flowRuleIds: JSON.parse(r.flow_rule_ids || "[]"),
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(slices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/api/onos/slices/:id", "/api/onos-service/slices/:id"], (req, res) => {
  try {
    const r = db.prepare("SELECT * FROM onos_slices WHERE id = ?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Slice not found" });
    res.json({
      id: r.id,
      name: r.name,
      type: r.slice_type,
      color: r.color,
      vlanId: r.vlan_id,
      bandwidth: r.bandwidth_kbps,
      bandwidthKbps: r.bandwidth_kbps,
      burstSize: r.burst_kbps,
      burstKbps: r.burst_kbps,
      hosts: JSON.parse(r.hosts || "[]"),
      status: r.status,
      meterIds: JSON.parse(r.meter_ids || "{}"),
      flowRuleIds: JSON.parse(r.flow_rule_ids || "[]"),
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/onos/slices", "/api/onos-service/slices"], (req, res) => {
  try {
    const s = req.body;
    if (!s.id || !s.name) {
      return res.status(400).json({ error: "Slice ID and name required" });
    }
    const existing = db.prepare("SELECT id FROM onos_slices WHERE id = ?").get(s.id);
    if (existing) {
      db.prepare(`
        UPDATE onos_slices SET
          name = ?, slice_type = ?, color = ?, vlan_id = ?,
          bandwidth_kbps = ?, burst_kbps = ?, hosts = ?, status = ?,
          meter_ids = ?, flow_rule_ids = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        s.name, s.type || s.slice_type || "CUSTOM", s.color || "#6366f1", s.vlanId || s.vlan_id || null,
        s.bandwidth ?? s.bandwidthKbps ?? s.bandwidth_kbps ?? 10000, s.burstSize ?? s.burstKbps ?? s.burst_kbps ?? 15000,
        JSON.stringify(s.hosts || []), s.status || "ACTIVE",
        JSON.stringify(s.meterIds || s.meter_ids || {}), JSON.stringify(s.flowRuleIds || s.flow_rule_ids || []),
        s.priority || 40000, s.id
      );
    } else {
      db.prepare(`
        INSERT INTO onos_slices (
          id, name, slice_type, color, vlan_id, bandwidth_kbps, burst_kbps,
          hosts, status, meter_ids, flow_rule_ids, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        s.id, s.name, s.type || s.slice_type || "CUSTOM", s.color || "#6366f1", s.vlanId || s.vlan_id || null,
        s.bandwidth ?? s.bandwidthKbps ?? s.bandwidth_kbps ?? 10000, s.burstSize ?? s.burstKbps ?? s.burst_kbps ?? 15000,
        JSON.stringify(s.hosts || []), s.status || "ACTIVE",
        JSON.stringify(s.meterIds || s.meter_ids || {}), JSON.stringify(s.flowRuleIds || s.flow_rule_ids || []),
        s.priority || 40000
      );
    }
    res.json({ success: true, slice: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(["/api/onos/slices/:id", "/api/onos-service/slices/:id"], (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM onos_slices WHERE id = ?").run(id);
    res.json({ success: true, message: `Slice ${id} removed from SQLite database` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: ONOS REST Fetch
const onosFetch = async (apiPath, options = {}) => {
  const headers = {
    Authorization: ONOS_AUTH,
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const resp = await fetch(`${ONOS_URL}${apiPath}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ONOS request ${apiPath} failed (${resp.status}): ${text}`);
  }
  return resp.json();
};

/* ==============================================================================
   DIAGNOSTIC: PING ENDPOINT
   ============================================================================== */
app.get(["/api/onos/ping", "/api/ping"], async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/info");
    res.json({
      ok: true,
      onosUrl: ONOS_URL,
      version: data?.version || "ONOS REST v1",
      name: data?.name || "ONOS",
      status: "CONNECTED",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      onosUrl: ONOS_URL,
      error: err.message,
      status: "DISCONNECTED",
      hint: "Ensure ONOS is running at http://localhost:8181 and credentials are onos:rocks",
    });
  }
});

/* ==============================================================================
   SUMMARY ENDPOINT: DISCOVERED MININET TOPOLOGY, HOSTS, DEVICES, FLOWS, QoS
   ============================================================================== */
app.get(["/api/onos/summary", "/api/onos/cloud-summary"], async (req, res) => {
  try {
    const [hostsRes, devicesRes, linksRes, flowsRes, metersRes, clusterRes] =
      await Promise.allSettled([
        onosFetch("/onos/v1/hosts"),
        onosFetch("/onos/v1/devices"),
        onosFetch("/onos/v1/links"),
        onosFetch("/onos/v1/flows"),
        onosFetch("/onos/v1/meters"),
        onosFetch("/onos/v1/cluster/nodes"),
      ]);

    const rawHosts = hostsRes.status === "fulfilled" ? hostsRes.value?.hosts || [] : [];
    const rawDevices = devicesRes.status === "fulfilled" ? devicesRes.value?.devices || [] : [];
    const rawLinks = linksRes.status === "fulfilled" ? linksRes.value?.links || [] : [];
    const rawFlows = flowsRes.status === "fulfilled" ? flowsRes.value?.flows || [] : [];
    const rawMeters = metersRes.status === "fulfilled" ? metersRes.value?.meters || [] : [];
    const clusterNodes = clusterRes.status === "fulfilled" ? clusterRes.value?.nodes || [] : [];

    const hosts = rawHosts.map((h) => {
      const loc = h.locations?.[0] || {};
      return {
        id: h.id,
        name: h.id,
        mac: h.mac,
        ip: h.ipAddresses?.[0] || "N/A",
        ipAddresses: h.ipAddresses || [],
        status: h.suspended ? "SUSPENDED" : "ACTIVE",
        network: h.vlan && h.vlan !== "None" ? `VLAN-${h.vlan}` : "Default",
        zone: loc.elementId || loc.deviceId || "Mininet",
        logicalPort: loc.port || null,
        logicalSwitch: loc.elementId || loc.deviceId || null,
        configured: h.configured,
      };
    });

    const devices = rawDevices.map((d) => ({
      id: d.id,
      name: d.annotations?.datapathDescription || d.id,
      type: d.type || "SWITCH",
      available: d.available,
      role: d.role || "MASTER",
      hw: d.hw,
      sw: d.sw,
      serial: d.serial,
      chassisId: d.chassisId,
      status: d.available ? "ACTIVE" : "INACTIVE",
    }));

    const stats = [
      { title: "Discovered Hosts", value: hosts.length, icon: "🖥️" },
      { title: "OpenFlow Switches", value: devices.length, icon: "🌐" },
      { title: "Active Links", value: rawLinks.length, icon: "🔗" },
      { title: "Flow Rules", value: rawFlows.length, icon: "⚡" },
      { title: "Active Meters", value: rawMeters.length, icon: "📊" },
    ];

    const isConnected = hostsRes.status === "fulfilled" || devicesRes.status === "fulfilled";

    const infrastructureStatus = {
      onosCore: {
        status: isConnected ? "Healthy" : "Unreachable",
        health: isConnected ? 98 : 0,
        nodes: clusterNodes.length || 1,
      },
      openflowApp: {
        status: isConnected ? "Active" : "Down",
        health: isConnected ? 95 : 0,
      },
      restApi: {
        status: isConnected ? "Connected" : "Failed",
        health: isConnected ? 100 : 0,
      },
      connectedDevices: {
        status: `${devices.filter((d) => d.available).length} Online`,
        health: devices.length > 0 ? 92 : 40,
      },
    };

    const qosPolicy = {
      enabled: true,
      highPriorityQueue: {
        queueId: 0,
        dscp: 46,
        description: "URLLC / Expedited Forwarding",
        guaranteedRate: "60 Mbps",
        priority: 1,
      },
      standardQueue: {
        queueId: 1,
        dscp: "Unmarked",
        description: "Standard / Best Effort",
        guaranteedRate: "15 Mbps",
        priority: 2,
      },
      totalLinkCeiling: "80 Mbps",
    };

    res.json({
      success: true,
      stats,
      hosts,
      devices,
      links: rawLinks,
      flows: rawFlows,
      meters: rawMeters,
      infrastructureStatus,
      qosPolicy,
    });
  } catch (err) {
    console.error("ONOS summary error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch ONOS summary" });
  }
});

/* ==============================================================================
   DIRECT ONOS INVENTORY PROXIES
   ============================================================================== */
app.get("/api/onos/devices", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/devices");
    res.json(data?.devices || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/onos/hosts", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/hosts");
    res.json(data?.hosts || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/onos/flows", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/flows");
    res.json(data?.flows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/onos/meters", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/meters");
    res.json(data?.meters || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==============================================================================
   LOCAL NEURAL INTENT SERVICE PROXY (Offline all-MiniLM-L6-v2 NLP Engine)
   ============================================================================== */
const INTENT_SERVICE_URL = process.env.INTENT_SERVICE_URL || "http://127.0.0.1:5005";

app.get(["/api/onos/intent/health", "/api/intent/health"], async (req, res) => {
  try {
    const resp = await fetch(`${INTENT_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const data = await resp.json();
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(503).json({
      ok: false,
      status: "OFFLINE",
      error: "Local Neural Intent Service is not reachable on port 5005",
      hint: "Start it with: bun run intent:service (or cd anomaly && uv run python intent_service.py)",
    });
  }
});

app.post(["/api/onos/intent/compile", "/api/intent/compile"], async (req, res) => {
  try {
    const resp = await fetch(`${INTENT_SERVICE_URL}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Intent compiler returned ${resp.status}: ${errText}`);
    }
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error("[Intent Engine Proxy Error]:", err.message);
    res.status(500).json({
      error: err.message,
      hint: "Verify local intent service is running on http://127.0.0.1:5005",
    });
  }
});

/* ==============================================================================
/* ==============================================================================
   MININET & OVS COMMAND EXECUTION (SSH / LOCAL)
   ============================================================================== */
const execPromise = promisify(exec);
const MININET_HOST = process.env.MININET_HOST || "192.168.122.88";
const MININET_USER = process.env.MININET_USER || "mininet";
const MININET_SSH_KEY = process.env.MININET_SSH_KEY || path.join(process.env.HOME || "/home/abyih", ".ssh", "id_main");

/**
 * Execute a command either in Mininet VM via SSH or locally if Mininet is local.
 */
async function runMininetCmd(command, timeout = 30000) {
  if (MININET_HOST && MININET_HOST !== "localhost" && MININET_HOST !== "127.0.0.1") {
    const escaped = command.replace(/'/g, "'\\''");
    const sshCmd = `ssh -i "${MININET_SSH_KEY}" -o StrictHostKeyChecking=no -o LogLevel=ERROR -o ConnectTimeout=5 ${MININET_USER}@${MININET_HOST} '${escaped}'`;
    return execPromise(sshCmd, { timeout });
  }
  return execPromise(command, { timeout });
}

/* ==============================================================================
   MININET OVS HTB QoS QUEUE MANAGEMENT
   ============================================================================== */
app.post("/api/onos/qos/setup", async (req, res) => {
  const { ports = [] } = req.body;
  const args = ports.length > 0 ? ports.join(" ") : "--auto";
  try {
    const cmd = `sudo /home/mininet/setup_mininet_qos.sh ${args}`;
    const { stdout } = await runMininetCmd(cmd, 15000);
    res.json({
      success: true,
      output: stdout,
      message: "OVS HTB queues (60M / 15M / 80M) configured successfully.",
    });
  } catch (err) {
    console.error("[QoS] Setup failed:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "Ensure script has sudo permission and Open vSwitch is running",
    });
  }
});

app.get("/api/onos/qos/status", async (req, res) => {
  try {
    const { stdout } = await runMininetCmd("sudo ovs-vsctl list qos", 5000);
    res.json({
      configured: stdout.trim().length > 0,
      details: stdout,
    });
  } catch (err) {
    res.json({
      configured: false,
      summary: "No OVS QoS records detected or ovs-vsctl not accessible.",
      error: err.message,
    });
  }
});

/* ==============================================================================
   LIVE VERIFICATION & REAL-TIME TESTING ENDPOINTS
   Runs actual ping, iperf, tc, and ovs-ofctl commands inside Mininet host
   network namespaces to produce real, measured performance data.
   ============================================================================== */

/**
 * Discover Mininet host process PID by hostname (e.g. "h1").
 * Mininet hosts run as bash processes with argument "mininet:h1".
 */
async function findHostPid(hostname) {
  try {
    const { stdout } = await runMininetCmd(`pgrep -f "mininet:${hostname}$"`, 5000);
    const pid = stdout.trim().split("\n")[0]?.trim();
    if (!pid || isNaN(Number(pid))) throw new Error(`No PID found`);
    return pid;
  } catch {
    throw new Error(`Mininet host "${hostname}" not found. Is Mininet running?`);
  }
}

/**
 * Execute a command inside a Mininet host's network namespace.
 * Uses mnexec to enter the host process's network namespace.
 */
async function execInHost(hostname, command, timeout = 30000) {
  const pid = await findHostPid(hostname);
  const { stdout, stderr } = await runMininetCmd(
    `sudo mnexec -a ${pid} ${command}`,
    timeout
  );
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

/** Parse ping output into structured metrics */
function parsePingOutput(output) {
  const rtts = [];
  for (const match of output.matchAll(/time[=<]([\d.]+)\s*ms/g)) {
    rtts.push(parseFloat(match[1]));
  }
  const lossMatch = output.match(/([\d.]+)%\s*packet\s*loss/);
  const packetLoss = lossMatch ? parseFloat(lossMatch[1]) : null;
  const summaryMatch = output.match(
    /rtt\s+min\/avg\/max\/mdev\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s*ms/
  );
  let min = null, avg = null, max = null, mdev = null;
  if (summaryMatch) {
    min = parseFloat(summaryMatch[1]);
    avg = parseFloat(summaryMatch[2]);
    max = parseFloat(summaryMatch[3]);
    mdev = parseFloat(summaryMatch[4]);
  } else if (rtts.length > 0) {
    min = Math.min(...rtts);
    max = Math.max(...rtts);
    avg = rtts.reduce((a, b) => a + b, 0) / rtts.length;
    mdev = Math.sqrt(rtts.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rtts.length);
  }
  return { rtts, min, avg, max, jitter: mdev, packetLoss, count: rtts.length };
}

/** Parse iperf v2 output into structured metrics */
function parseIperfOutput(output) {
  const result = {
    bandwidth: null, bandwidthUnit: "Mbits/sec", transfer: null,
    jitter: null, lostPackets: null, totalPackets: null, packetLoss: null,
  };
  // Search lines in reverse to find server report (most complete) first
  const lines = output.split("\n").reverse();
  for (const line of lines) {
    const full = line.match(
      /\[\s*\d+\]\s+[\d.]+-\s*[\d.]+\s+sec\s+([\d.]+)\s+([KMGT]?)Bytes\s+([\d.]+)\s+([KMGT]?)bits\/sec\s+([\d.]+)\s+ms\s+(\d+)\/\s*(\d+)\s+\(([\d.]+)%\)/
    );
    if (full) {
      result.transfer = parseFloat(full[1]);
      result.bandwidth = parseFloat(full[3]);
      result.bandwidthUnit = `${full[4] || "M"}bits/sec`;
      result.jitter = parseFloat(full[5]);
      result.lostPackets = parseInt(full[6]);
      result.totalPackets = parseInt(full[7]);
      result.packetLoss = parseFloat(full[8]);
      return result;
    }
  }
  // Fallback: bandwidth-only line
  const bw = output.match(
    /\[\s*\d+\]\s+[\d.]+-\s*[\d.]+\s+sec\s+([\d.]+)\s+([KMGT]?)Bytes\s+([\d.]+)\s+([KMGT]?)bits\/sec/
  );
  if (bw) {
    result.transfer = parseFloat(bw[1]);
    result.bandwidth = parseFloat(bw[3]);
    result.bandwidthUnit = `${bw[4] || "M"}bits/sec`;
  }
  return result;
}

const verifyDelay = (ms) => new Promise((r) => setTimeout(r, ms));
function validateHostname(h) { return /^h\d+$/.test(h); }
function validateIp(ip) { return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip); }

// ── Live Ping Test ──────────────────────────────────────────────────────────
app.post("/api/onos/verify/ping", async (req, res) => {
  const { srcHost, dstIp, count = 10 } = req.body;
  if (!srcHost || !dstIp) return res.status(400).json({ error: "srcHost and dstIp required" });
  if (!validateHostname(srcHost)) return res.status(400).json({ error: "Invalid hostname (expected h1, h2, etc.)" });
  if (!validateIp(dstIp)) return res.status(400).json({ error: "Invalid IP address" });
  const safeCount = Math.min(Math.max(1, parseInt(count) || 10), 50);
  try {
    const { stdout } = await execInHost(srcHost, `ping -c ${safeCount} -i 0.2 ${dstIp}`, 30000);
    const parsed = parsePingOutput(stdout);
    res.json({ success: true, srcHost, dstIp, ...parsed, raw: stdout });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Live Bandwidth Test (iperf v2) ──────────────────────────────────────────
app.post("/api/onos/verify/iperf", async (req, res) => {
  const { srcHost, dstHost, dstIp, duration = 3, bandwidth = "50M", port = 5005 } = req.body;
  if (!srcHost || !dstHost || !dstIp) return res.status(400).json({ error: "srcHost, dstHost, and dstIp required" });
  if (!validateHostname(srcHost) || !validateHostname(dstHost)) return res.status(400).json({ error: "Invalid hostname" });
  if (!validateIp(dstIp)) return res.status(400).json({ error: "Invalid IP" });
  const safeDuration = Math.min(Math.max(1, parseInt(duration) || 3), 15);
  const safePort = Math.min(Math.max(5001, parseInt(port) || 5005), 5200);
  try {
    const dstPid = await findHostPid(dstHost);
    const srcPid = await findHostPid(srcHost);
    const script = `nohup sudo mnexec -a ${dstPid} timeout ${safeDuration + 5} iperf -s -u -p ${safePort} >/dev/null 2>&1 & sleep 1; sudo mnexec -a ${srcPid} iperf -c ${dstIp} -u -b ${bandwidth} -t ${safeDuration} -p ${safePort}; sudo killall -9 iperf 2>/dev/null || true`;
    const { stdout } = await runMininetCmd(script, (safeDuration + 10) * 1000);
    const parsed = parseIperfOutput(stdout);
    res.json({ success: true, srcHost, dstHost, dstIp, ...parsed, raw: stdout });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── OVS Queue Statistics ────────────────────────────────────────────────────
app.get("/api/onos/verify/queues", async (req, res) => {
  try {
    const results = {};
    const { stdout: bridges } = await runMininetCmd("sudo ovs-vsctl list-br", 5000);
    for (const br of bridges.trim().split("\n").filter(Boolean)) {
      const { stdout: ports } = await runMininetCmd(`sudo ovs-vsctl list-ports ${br}`, 5000);
      results[br] = { ports: {} };
      for (const port of ports.trim().split("\n").filter(Boolean)) {
        try {
          const { stdout: tcOut } = await runMininetCmd(`tc -s class show dev ${port}`, 5000);
          results[br].ports[port] = { tcStats: tcOut.trim() || "No HTB classes" };
        } catch {
          results[br].ports[port] = { tcStats: "No tc stats available" };
        }
      }
    }
    const { stdout: qosRec } = await runMininetCmd("sudo ovs-vsctl list qos", 5000).catch(() => ({ stdout: "" }));
    const { stdout: queueRec } = await runMininetCmd("sudo ovs-vsctl list queue", 5000).catch(() => ({ stdout: "" }));
    res.json({ success: true, switches: results, qosRecords: qosRec.trim(), queueRecords: queueRec.trim(), configured: qosRec.trim().length > 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DSCP 46 Flow Verification ───────────────────────────────────────────────
app.get("/api/onos/verify/dscp", async (req, res) => {
  try {
    const flowsData = await onosFetch("/onos/v1/flows").catch(() => ({ flows: [] }));
    const allFlows = flowsData.flows || [];
    const dscpFlows = allFlows.filter((f) => {
      const criteria = f.selector?.criteria || [];
      return criteria.some((c) => (c.type === "IP_DSCP" && c.ipDscp === 46) || (c.type === "IP_PROTO"));
    });
    const queueFlows = allFlows.filter((f) => {
      const instructions = f.treatment?.instructions || [];
      return instructions.some((i) => i.type === "QUEUE" && i.queueId === 0);
    });
    // Dump OVS flows for DSCP matching from Mininet
    const { stdout: bridges } = await runMininetCmd("sudo ovs-vsctl list-br", 5000).catch(() => ({ stdout: "" }));
    const ovsFlowDumps = {};
    for (const br of (bridges.trim().split("\n").filter(Boolean))) {
      try {
        const { stdout } = await runMininetCmd(`sudo ovs-ofctl dump-flows ${br} -O OpenFlow13`, 5000);
        const lines = stdout.split("\n");
        ovsFlowDumps[br] = {
          totalFlows: lines.filter((l) => l.includes("cookie=")).length,
          dscpFlows: lines.filter((l) => l.includes("nw_tos=184") || l.includes("ip_dscp=46") || l.includes("ip_dscp=0x2e")),
          queueFlows: lines.filter((l) => l.includes("set_queue:0") || l.includes("enqueue:0")),
        };
      } catch {
        ovsFlowDumps[br] = { totalFlows: 0, dscpFlows: [], queueFlows: [] };
      }
    }
    res.json({
      success: true,
      onos: {
        dscpFlowCount: dscpFlows.length,
        queueFlowCount: queueFlows.length,
        dscpFlows: dscpFlows.map((f) => ({ id: f.id, deviceId: f.deviceId, priority: f.priority, selector: f.selector, treatment: f.treatment })),
      },
      ovs: ovsFlowDumps,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Full 4-Way Comparison Suite ─────────────────────────────────────────────
app.post("/api/onos/verify/compare", async (req, res) => {
  const { tests = [] } = req.body;
  if (!tests.length) return res.status(400).json({ error: "No tests specified" });
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const { label, srcHost, dstHost, dstIp, sliceType, includeBandwidth } = tests[i];
    if (!srcHost || !dstIp || !validateHostname(srcHost) || !validateIp(dstIp)) {
      results.push({ label, sliceType, error: "Invalid test configuration" });
      continue;
    }
    const entry = { label, sliceType, srcHost, dstHost, dstIp };
    // 1. Ping test
    try {
      const { stdout } = await execInHost(srcHost, `ping -c 5 -i 0.2 ${dstIp}`, 10000);
      entry.ping = parsePingOutput(stdout);
    } catch (err) {
      entry.ping = { error: err.message, avg: null, jitter: null, packetLoss: 100 };
    }
    // 2. Bandwidth test (optional)
    if (includeBandwidth && dstHost && validateHostname(dstHost)) {
      try {
        const port = 5005 + i;
        const dstPid = await findHostPid(dstHost);
        const srcPid = await findHostPid(srcHost);
        const script = `nohup sudo mnexec -a ${dstPid} timeout 7 iperf -s -u -p ${port} >/dev/null 2>&1 & sleep 1; sudo mnexec -a ${srcPid} iperf -c ${dstIp} -u -b 100M -t 2 -p ${port}; sudo killall -9 iperf 2>/dev/null || true`;
        const { stdout } = await runMininetCmd(script, 10000);
        entry.iperf = parseIperfOutput(stdout);
      } catch (err) {
        entry.iperf = { error: err.message };
      }
    }
    results.push(entry);
  }
  res.json({ success: true, results, timestamp: new Date().toISOString() });
});

/* ==============================================================================
   START SERVER
   ============================================================================== */
app.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Dedicated ONOS & Mininet Backend listening on :${port}`);
  console.log(`📡 ONOS Target Controller: ${ONOS_URL}`);
  console.log(`⚡ Low-Latency QoS: Queue 0 (60 Mbps) + Queue 1 (15 Mbps)`);
  console.log(`======================================================\n`);
});
