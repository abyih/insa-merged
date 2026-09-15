import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
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
      bandwidthKbps: r.bandwidth_kbps,
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
      bandwidthKbps: r.bandwidth_kbps,
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
        s.bandwidthKbps || s.bandwidth_kbps || 10000, s.burstKbps || s.burst_kbps || 15000,
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
        s.bandwidthKbps || s.bandwidth_kbps || 10000, s.burstKbps || s.burst_kbps || 15000,
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
   MININET OVS HTB QoS QUEUE MANAGEMENT
   ============================================================================== */
app.post("/api/onos/qos/setup", (req, res) => {
  const { ports = [] } = req.body;
  const scriptPath = path.join(__dirname, "scripts", "setup_mininet_qos.sh");
  const args = ports.length > 0 ? ports : ["--auto"];

  execFile("sudo", [scriptPath, ...args], { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("[QoS] Setup failed:", stderr || err.message);
      return res.status(500).json({
        success: false,
        error: stderr || err.message,
        hint: "Ensure script has sudo permission and Open vSwitch is running",
      });
    }
    res.json({
      success: true,
      output: stdout,
      message: "OVS HTB queues (60M / 15M / 80M) configured successfully.",
    });
  });
});

app.get("/api/onos/qos/status", (req, res) => {
  execFile("ovs-vsctl", ["list", "qos"], { timeout: 5000 }, (err, stdout) => {
    if (err) {
      return res.json({
        configured: false,
        summary: "No OVS QoS records detected or ovs-vsctl not accessible.",
      });
    }
    res.json({
      configured: stdout.trim().length > 0,
      details: stdout,
    });
  });
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
