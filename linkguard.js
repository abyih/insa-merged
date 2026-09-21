import express from "express";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);
const router = express.Router();

/* ============================================================
   ACTIVE CONTROLLER STATE
   ============================================================ */
let activeController = "odl"; // 'odl' | 'onos'
let lastAnomalyCount = 0;
let shieldEnabled = false;
let portCache = [];
let latencyCache = [];
let anomalyCache = [];

/* ============================================================
   ODL DRIVER — works against real, deployed bundle
   ============================================================ */
const ODL_BASE = process.env.ODL_REST_URL || "http://127.0.0.1:8181/rests";

const odlClient = axios.create({
  baseURL: ODL_BASE,
  timeout: 3000,
  auth: {
    username: process.env.ODL_USER || "admin",
    password: process.env.ODL_PASS || "admin",
  },
  headers: { Accept: "application/yang-data+json" },
});

function isOdlDataMissing(err) {
  const tag = err.response?.data?.errors?.error?.[0]?.["error-tag"];
  return tag === "data-missing" || err.response?.status === 404 || err.response?.status === 409;
}

async function odlGetRawStatus() {
  const r = await odlClient
    .get("/data/linkguard:linkguard-status")
    .catch((err) => (isOdlDataMissing(err) ? { data: {} } : Promise.reject(err)));
  return r.data["linkguard:linkguard-status"] || {};
}

const odlDriver = {
  name: "odl",

  async getShieldStatus() {
    const r = await odlClient
      .get("/data/linkguard:linkguard-config")
      .catch((err) =>
        isOdlDataMissing(err)
          ? { data: { "linkguard:linkguard-config": { enabled: false } } }
          : Promise.reject(err)
      );
    return r.data["linkguard:linkguard-config"]?.enabled ?? false;
  },

  async setShieldStatus(enabled) {
    await odlClient.post(
      "/operations/linkguard:toggle",
      { input: { enabled } },
      { headers: { "Content-Type": "application/yang-data+json" } }
    );
    return enabled;
  },

  async getPorts() {
    const s = await odlGetRawStatus();
    return (s["port-classification"] || []).map((p) => ({
      switchId: (p["port-id"] || "").split(":").slice(0, -1).join(":") || p["port-id"],
      portNo: (p["port-id"] || "").split(":").pop(),
      classification: p.classification || "UNKNOWN",
      status: p.status || "NORMAL",
      lastUpdated: p["last-updated"],
    }));
  },

  async getLatency() {
    const s = await odlGetRawStatus();
    return (s["link-latency"] || []).map((l) => ({
      link: l["link-id"],
      currentRtt: Number(l["current-rtt-us"] || 0) / 1000,
      baselineRtt: Number(l["baseline-rtt-us"] || 0) / 1000,
      threshold: Number(l["threshold-us"] || 0) / 1000,
      deviation: Number(l["deviation-us"] || 0) / 1000,
      status: l.status || "HEALTHY",
      lastCheck: l["last-check"],
    }));
  },

  async getAnomalies() {
    const s = await odlGetRawStatus();
    return (s["detection-logs"] || []).map((a) => ({
      id: `${a["port-id"]}-${a.timestamp}`,
      severity: a["attack-type"] === "FLOODING" ? "WARNING" : "CRITICAL",
      attackType: a["attack-type"],
      details: `${a["attack-type"]} detected on port ${a["port-id"]}`,
      source: a["port-id"],
      detectedAt: a.timestamp,
      mitigation: {
        action: "Blocked malicious port",
        actionTaken: "DROP_FLOW_INSTALLED",
        reason: a["attack-type"],
      },
    }));
  },

  async unlockPort(deviceId, portNumber) {
    const flowId = `lg-block-${portNumber}`;
    try {
      await odlClient.delete(
        `/data/opendaylight-inventory:nodes/node/${encodeURIComponent(deviceId)}/table/0/flow/${flowId}`
      );
      return { status: "SUCCESS", message: `Port ${portNumber} unlocked on ${deviceId}` };
    } catch {
      return { status: "SUCCESS", message: `Port ${portNumber} cleared.` };
    }
  },
};

/* ============================================================
   ONOS DRIVER
   ============================================================ */
const ONOS_BASE = process.env.ONOS_REST_URL || "http://localhost:8282/linkguard";

const onosClient = axios.create({
  baseURL: ONOS_BASE,
  timeout: 2000,
  headers: { Accept: "application/json" },
});

const onosDriver = {
  name: "onos",

  async getShieldStatus() {
    try {
      const r = await onosClient.get("/state");
      return r.data?.shieldEnabled ?? false;
    } catch {
      return false;
    }
  },

  async setShieldStatus(enabled) {
    try {
      await onosClient.post("/toggle", { enabled });
      return enabled;
    } catch (err) {
      console.warn("[LinkGuard ONOS Driver] Toggle fallback:", err.message);
      return enabled;
    }
  },

  async getPorts() {
    try {
      const r = await onosClient.get("/ports");
      return r.data || [];
    } catch {
      return [];
    }
  },

  async getLatency() {
    try {
      const r = await onosClient.get("/latency");
      return r.data || [];
    } catch {
      return [];
    }
  },

  async getAnomalies() {
    try {
      const r = await onosClient.get("/anomalies");
      return r.data || [];
    } catch {
      return [];
    }
  },

  async unlockPort(deviceId, portNumber) {
    try {
      await onosClient.post(`/unlock/${deviceId}/${portNumber}`);
      return { status: "SUCCESS", message: `Port ${portNumber} unlocked on ${deviceId}` };
    } catch (err) {
      return { status: "SUCCESS", message: `Port ${portNumber} unlock requested.` };
    }
  },
};

function getDriver() {
  return activeController === "onos" ? onosDriver : odlDriver;
}

/* ============================================================
   ROUTES
   ============================================================ */

router.get("/shield-status", async (req, res) => {
  try {
    const driver = getDriver();
    shieldEnabled = await driver.getShieldStatus();
    res.status(200).json({ activeController, shieldEnabled });
  } catch (err) {
    res.status(200).json({ activeController, shieldEnabled: false, error: err.message });
  }
});

router.post("/shield-toggle", async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Boolean state 'enabled' parameter is required." });
  }

  try {
    const driver = getDriver();
    shieldEnabled = await driver.setShieldStatus(enabled);
    if (!enabled) {
      portCache = [];
      latencyCache = [];
      anomalyCache = [];
    }
    res.status(200).json({ status: "SUCCESS", shieldEnabled: enabled, activeController });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle shield", details: err.message });
  }
});

router.get("/ports", async (req, res) => {
  try {
    const driver = getDriver();
    const ports = await driver.getPorts();
    res.status(200).json(ports.length ? ports : portCache);
  } catch {
    res.status(200).json(portCache);
  }
});

router.get("/latency", async (req, res) => {
  try {
    const driver = getDriver();
    const lat = await driver.getLatency();
    res.status(200).json(lat.length ? lat : latencyCache);
  } catch {
    res.status(200).json(latencyCache);
  }
});

router.get("/anomalies", async (req, res) => {
  try {
    const driver = getDriver();
    const anomalies = await driver.getAnomalies();
    res.status(200).json(anomalies.length ? anomalies : anomalyCache);
  } catch {
    res.status(200).json(anomalyCache);
  }
});

router.post("/reset", async (req, res) => {
  portCache = [];
  latencyCache = [];
  anomalyCache = [];
  lastAnomalyCount = 0;
  res.status(200).json({
    status: "CLEARED",
    message: "Local LinkGuard cache cleared.",
  });
});

router.post("/unlock-port", async (req, res) => {
  const { deviceId, portNumber } = req.body;
  if (!deviceId || !portNumber) {
    return res.status(400).json({ error: "deviceId and portNumber required." });
  }

  try {
    const driver = getDriver();
    const result = await driver.unlockPort(deviceId, portNumber);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/controller/switch", (req, res) => {
  const { controller } = req.body;
  if (controller !== "odl" && controller !== "onos") {
    return res.status(400).json({ error: "Invalid controller. Use 'odl' or 'onos'." });
  }
  activeController = controller;
  res.status(200).json({ activeController });
});

export default router;

