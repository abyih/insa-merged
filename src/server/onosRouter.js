import express from "express";
import { execFile, exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root data directory for slice state persistence
const ROOT_DIR = path.resolve(__dirname, "../../");
const DATA_DIR = path.join(ROOT_DIR, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SLICES_FILE = path.join(DATA_DIR, "onos_slices.json");
const CONFIG_FILE = path.join(DATA_DIR, "onos_slice_config.json");

// Helper for persistent JSON store
function readJsonSafe(file, defaultValue) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`[ONOS Store] Could not read ${file}, using default:`, e.message);
  }
  return defaultValue;
}

function writeJsonSafe(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`[ONOS Store] Could not write ${file}:`, e.message);
  }
}

// In-memory cache synced with disk
let onosSlices = readJsonSafe(SLICES_FILE, []);
let onosSliceConfig = readJsonSafe(CONFIG_FILE, {
  id: 1,
  totalCapacityKbps: 100000,
  vlanCounter: 100,
  updatedAt: new Date().toISOString(),
});

const router = express.Router();

// ONOS Controller Configuration
const ONOS_HOST = process.env.ONOS_HOST || "localhost";
const ONOS_PORT = process.env.ONOS_PORT || "8183";
const ONOS_URL = process.env.ONOS_URL || `http://${ONOS_HOST}:${ONOS_PORT}`;
const ONOS_USERNAME = process.env.ONOS_USERNAME || "onos";
const ONOS_PASSWORD = process.env.ONOS_PASSWORD || "rocks";
const ONOS_AUTH = "Basic " + Buffer.from(`${ONOS_USERNAME}:${ONOS_PASSWORD}`).toString("base64");

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
   1. ONOS SLICES & CAPACITY PERSISTENCE
   ============================================================================== */

router.get("/slices/capacity", (req, res) => {
  try {
    res.json({ totalCapacityKbps: onosSliceConfig.totalCapacityKbps || 100000 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/slices/capacity", (req, res) => {
  try {
    const { totalCapacityKbps } = req.body;
    onosSliceConfig.totalCapacityKbps = Number(totalCapacityKbps) || 100000;
    onosSliceConfig.updatedAt = new Date().toISOString();
    writeJsonSafe(CONFIG_FILE, onosSliceConfig);
    res.json({ success: true, totalCapacityKbps: onosSliceConfig.totalCapacityKbps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/slices/vlan/next", (req, res) => {
  try {
    const currentVlan = onosSliceConfig.vlanCounter || 100;
    onosSliceConfig.vlanCounter = currentVlan + 1;
    onosSliceConfig.updatedAt = new Date().toISOString();
    writeJsonSafe(CONFIG_FILE, onosSliceConfig);
    res.json({ vlanId: currentVlan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/slices", (req, res) => {
  try {
    res.json(onosSlices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/slices/:id", (req, res) => {
  try {
    const s = onosSlices.find((slice) => String(slice.id) === String(req.params.id));
    if (!s) return res.status(404).json({ error: "Slice not found" });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/slices", (req, res) => {
  try {
    const s = req.body;
    if (!s.id || !s.name) {
      return res.status(400).json({ error: "Slice ID and name required" });
    }

    const formattedSlice = {
      id: s.id,
      name: s.name,
      type: s.type || s.slice_type || "CUSTOM",
      color: s.color || "#6366f1",
      vlanId: s.vlanId || s.vlan_id || null,
      bandwidth: s.bandwidth ?? s.bandwidthKbps ?? s.bandwidth_kbps ?? 10000,
      bandwidthKbps: s.bandwidth ?? s.bandwidthKbps ?? s.bandwidth_kbps ?? 10000,
      burstSize: s.burstSize ?? s.burstKbps ?? s.burst_kbps ?? 15000,
      burstKbps: s.burstSize ?? s.burstKbps ?? s.burst_kbps ?? 15000,
      hosts: s.hosts || [],
      status: s.status || "ACTIVE",
      meterIds: s.meterIds || s.meter_ids || {},
      flowRuleIds: s.flowRuleIds || s.flow_rule_ids || [],
      priority: s.priority || 40000,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = onosSlices.findIndex((slice) => String(slice.id) === String(s.id));
    if (existingIdx >= 0) {
      onosSlices[existingIdx] = { ...onosSlices[existingIdx], ...formattedSlice };
    } else {
      onosSlices.unshift(formattedSlice);
    }

    writeJsonSafe(SLICES_FILE, onosSlices);
    res.json({ success: true, slice: formattedSlice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/slices/:id", (req, res) => {
  try {
    const { id } = req.params;
    onosSlices = onosSlices.filter((slice) => String(slice.id) !== String(id));
    writeJsonSafe(SLICES_FILE, onosSlices);
    res.json({ success: true, message: `Slice ${id} removed successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==============================================================================
   2. ONOS DIAGNOSTIC & SUMMARY PROXIES
   ============================================================================== */

router.get("/ping", async (req, res) => {
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
      hint: `Ensure ONOS is running at ${ONOS_URL}`,
    });
  }
});

router.get(["/summary", "/cloud-summary"], async (req, res) => {
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
        guaranteedRate: "60 MB/s",
        priority: 1,
      },
      standardQueue: {
        queueId: 1,
        dscp: "Unmarked",
        description: "Standard / Best Effort",
        guaranteedRate: "15 MB/s",
        priority: 2,
      },
      totalLinkCeiling: "80 MB/s",
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

router.get("/devices", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/devices");
    res.json(data?.devices || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/hosts", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/hosts");
    res.json(data?.hosts || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/flows", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/flows");
    res.json(data?.flows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/meters", async (req, res) => {
  try {
    const data = await onosFetch("/onos/v1/meters");
    res.json(data?.meters || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==============================================================================
   3. NEURAL INTENT SERVICE PROXY (Scoped under /api/onos/intent/*)
   ============================================================================== */
const INTENT_SERVICE_URL = process.env.INTENT_SERVICE_URL || "http://127.0.0.1:5005";

router.get("/intent/health", async (req, res) => {
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
      hint: "Use cloud AI providers or start local neural intent service",
    });
  }
});

router.post("/intent/compile", async (req, res) => {
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
    res.status(500).json({
      error: err.message,
      hint: "Verify local intent service is running on http://127.0.0.1:5005",
    });
  }
});

/* ==============================================================================
   4. READ-ONLY QoS TELEMETRY (SAFE — DOES NOT ALTER OR CONFLICT WITH QoS STATE)
   ============================================================================== */
const execPromise = promisify(exec);
const MININET_HOST = process.env.MININET_HOST || "localhost";
const MININET_USER = process.env.MININET_USER || "mininet";
const MININET_SSH_KEY = process.env.MININET_SSH_KEY || path.join(process.env.HOME || "/home/abigiya", ".ssh", "id_main");

async function runMininetCmd(command, timeout = 30000) {
  if (MININET_HOST && MININET_HOST !== "localhost" && MININET_HOST !== "127.0.0.1") {
    const escaped = command.replace(/'/g, "'\\''");
    const sshCmd = `ssh -i "${MININET_SSH_KEY}" -o StrictHostKeyChecking=no -o LogLevel=ERROR -o ConnectTimeout=5 ${MININET_USER}@${MININET_HOST} '${escaped}'`;
    return execPromise(sshCmd, { timeout });
  }
  return execPromise(command, { timeout });
}

router.get("/qos/status", async (req, res) => {
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
   5. LIVE VERIFICATION & REAL-TIME SLA TESTING (MININET NAMESPACE RUNNERS)
   ============================================================================== */

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

async function execInHost(hostname, command, timeout = 30000) {
  const pid = await findHostPid(hostname);
  const { stdout, stderr } = await runMininetCmd(
    `sudo mnexec -a ${pid} ${command}`,
    timeout
  );
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

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

function parseIperfOutput(output) {
  const result = {
    bandwidth: null, bandwidthUnit: "Mbits/sec", transfer: null,
    jitter: null, lostPackets: null, totalPackets: null, packetLoss: null,
  };
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

function validateHostname(h) { return /^h\d+$/.test(h); }
function validateIp(ip) { return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip); }

router.post("/verify/ping", async (req, res) => {
  const { srcHost, dstIp, count = 10 } = req.body;
  if (!srcHost || !dstIp) return res.status(400).json({ error: "srcHost and dstIp required" });
  if (!validateHostname(srcHost)) return res.status(400).json({ error: "Invalid hostname" });
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

router.post("/verify/iperf", async (req, res) => {
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

router.get("/verify/queues", async (req, res) => {
  try {
    const results = {};
    const { stdout: bridges } = await runMininetCmd("sudo ovs-vsctl list-br", 5000);
    for (const br of bridges.trim().split("\n").filter(Boolean)) {
      const { stdout: ports } = await runMininetCmd(`sudo ovs-vsctl list-ports ${br}`, 5000);
      results[br] = { ports: {} };
      for (const p of ports.trim().split("\n").filter(Boolean)) {
        try {
          const { stdout: tcOut } = await runMininetCmd(`tc -s class show dev ${p}`, 5000);
          results[br].ports[p] = { tcStats: tcOut.trim() || "No HTB classes" };
        } catch {
          results[br].ports[p] = { tcStats: "No tc stats available" };
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

router.get("/verify/dscp", async (req, res) => {
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

router.post("/verify/compare", async (req, res) => {
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
    try {
      const { stdout } = await execInHost(srcHost, `ping -c 5 -i 0.2 ${dstIp}`, 10000);
      entry.ping = parsePingOutput(stdout);
    } catch (err) {
      entry.ping = { error: err.message, avg: null, jitter: null, packetLoss: 100 };
    }
    if (includeBandwidth && dstHost && validateHostname(dstHost)) {
      try {
        const testPort = 5005 + i;
        const dstPid = await findHostPid(dstHost);
        const srcPid = await findHostPid(srcHost);
        const script = `nohup sudo mnexec -a ${dstPid} timeout 7 iperf -s -u -p ${testPort} >/dev/null 2>&1 & sleep 1; sudo mnexec -a ${srcPid} iperf -c ${dstIp} -u -b 100M -t 2 -p ${testPort}; sudo killall -9 iperf 2>/dev/null || true`;
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

export default router;

