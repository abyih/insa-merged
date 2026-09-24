import dotenv from "dotenv";
import * as odlSync from "./odlSync.js";
import * as ovsDirect from "./ovsDirect.js";
import * as llmProviders from "./llmProviders.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
dotenv.config();

// Prevent server process from crashing on unhandled promise rejections / network errors
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection in server:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception in server:", err?.message || err);
});

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { execFile } from "child_process";
import http from "http";
import { Server } from "socket.io";
import linkguardRouter, { startPolling, onosClient } from "./linkguard.js";
import { updateOdlTlsConfig, updateOnosTlsConfig } from "./tlsOrchestrator.js";
import { registerDigestJobs } from "./digest.js";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import https from "https";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

const upload = multer({ dest: os.tmpdir() });

const PAX_WEB_CFG_PATH = path.join(os.homedir(), "karaf-0.23.1", "etc", "org.ops4j.pax.web.cfg");
const ODL_HOST = "localhost";
const ODL_PORT = 8443;
const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");

function odlRequest(reqPath, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: ODL_HOST,
        port: ODL_PORT,
        path: reqPath,
        method,
        rejectUnauthorized: false,
        headers: {
          Authorization: ODL_AUTH,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          let parsed = {};
          if (chunks) {
            try {
              parsed = JSON.parse(chunks);
            } catch {
              parsed = { raw: chunks };
            }
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                parsed.errors?.error?.[0]?.["error-message"] ||
                  `ODL request failed ${res.statusCode}: ${chunks}`
              )
            );
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const db = new Database("users.db");

// Users table schema initialization & migration
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin'"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT NULL"); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL"); } catch (_) {}
try { db.exec("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL"); } catch (_) {}
try { db.exec("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL"); } catch (_) {}

// Ensure default admin user: admin / admin
const existingAdminCheck = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!existingAdminCheck) {
  const adminHash = bcrypt.hashSync("admin", 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email)
    VALUES (?, ?, ?, ?, ?)
  `).run("admin", adminHash, "admin", "System Administrator", "admin@pntc.local");
  console.log("Created default admin user 'admin' (password: admin).");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS slices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_id TEXT,
    network_id TEXT,
    network_name TEXT,
    vm_ids TEXT,              -- JSON array
    slice_type TEXT,
    bandwidth_min TEXT,
    bandwidth_max TEXT,
    priority TEXT,
    isolation_level TEXT,
    latency_requirement TEXT,
    status TEXT DEFAULT 'ACTIVE',
    qos_status TEXT DEFAULT 'unsupported',
    isolation_status TEXT DEFAULT 'not_configured',
    security_group_id TEXT,
    odl_shadow_flow_ids TEXT, -- JSON array
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS slice_manager_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_capacity_mbps REAL NOT NULL DEFAULT 1000,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
db.prepare(
  `INSERT OR IGNORE INTO slice_manager_config (id, total_capacity_mbps) VALUES (1, 1000)`
).run();
try { db.exec("ALTER TABLE slice_manager_config ADD COLUMN total_pps_capacity REAL DEFAULT 10000"); } catch (_) {}
db.exec(`
  CREATE TABLE IF NOT EXISTS provider_keys (
    provider TEXT PRIMARY KEY,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    tag TEXT NOT NULL,
    model TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// qos_policy_id + allocated_mbps columns are needed by the Slice Manager
// (ADD COLUMN fails harmlessly if they already exist from a prior run)
try { db.exec("ALTER TABLE slices ADD COLUMN qos_policy_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN allocated_mbps REAL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN per_vm_mbps REAL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN bandwidth_limit_rule_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN minimum_bandwidth_rule_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN dscp_marking_rule_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN priority_enforcement_status TEXT DEFAULT 'not_configured'"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN color TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN max_pps REAL"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN allocated_pps REAL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN pps_enforcement_status TEXT DEFAULT 'not_configured'"); } catch (_) {}

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

async function sendAlertEmail(subject, text) {
  if (!process.env.SMTP_EMAIL || !process.env.ALERT_EMAIL) {
    console.warn("Alert email not configured, skipping:", subject);
    return;
  }
  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: process.env.ALERT_EMAIL,
      subject: `[SDN Dashboard Alert] ${subject}`,
      text,
    });
    console.log("Alert email sent:", subject);
  } catch (err) {
    console.error("Failed to send alert email:", err.message);
  }
}

const app = express();
const server = http.createServer(app);
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
app.set("io", io);

const port = process.env.PORT || 5000;

// DevStack credentials — defaults to localhost (127.0.0.1) for same-machine deployments
// When running on Windows with DevStack in WSL, auto-detection below will correct this.
let KEYSTONE_URL =
  process.env.KEYSTONE_URL || "http://127.0.0.1/identity/v3";
let NEUTRON_URL = process.env.NEUTRON_URL;
const DEFAULT_SLICE_PALETTE = [
  "#FF6B6B", "#4ECDC4", "#FFD166", "#A78BFA",
  "#06D6A0", "#F472B6", "#60A5FA", "#FB923C",
];
let NOVA_URL = process.env.NOVA_URL;
let GLANCE_URL = process.env.GLANCE_URL;

const OS_USERNAME = process.env.OS_USERNAME || "admin";
const OS_PASSWORD = process.env.OS_PASSWORD || "secret";
const OS_PROJECT_NAME = process.env.OS_PROJECT_NAME || "admin";
const OS_USER_DOMAIN_NAME = process.env.OS_USER_DOMAIN_NAME || "default";
const OS_PROJECT_DOMAIN_NAME = process.env.OS_PROJECT_DOMAIN_NAME || "default";
let tokenCache = {
  token: null,
  expiresAt: 0,
};

app.use(
  cors({
    origin: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
  }),
);

app.use(bodyParser.json());
app.use(express.json());
app.use("/api/security", linkguardRouter);

// Insa-dluxf original node endpoint
app.get("/api/nodes", (req, res) => {
  res.json({
    nodes: [
      { id: 1, name: "Node1" },
      { id: 2, name: "Node2" },
    ],
  });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid username or password" });
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (match) {
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || "admin",
        full_name: user.full_name || "",
        email: user.email || "",
      },
    });
  } else {
    sendAlertEmail(
      "Failed login attempt",
      `A failed login attempt was made for username "${username}" at ${new Date().toISOString()}.`
    );
    res.status(401).json({ success: false, error: "Invalid username or password" });
  }
});

// GET /api/users - List all users (excluding password hashes)
app.get("/api/users", (req, res) => {
  try {
    const users = db
      .prepare("SELECT id, username, role, full_name, email, created_at, updated_at FROM users ORDER BY id ASC")
      .all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { username, password, role, full_name, email } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required" });
    }
    const cleanUsername = String(username).trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, error: "Username must be at least 3 characters" });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ success: false, error: "Password must be at least 4 characters" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername);
    if (existing) {
      return res.status(409).json({ success: false, error: `Username "${cleanUsername}" is already taken` });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const validRole = ["admin", "operator", "viewer"].includes(role) ? role : "operator";
    const cleanFullName = full_name ? String(full_name).trim() : "";
    const cleanEmail = email ? String(email).trim() : "";

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, role, full_name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const info = stmt.run(cleanUsername, password_hash, validRole, cleanFullName, cleanEmail);

    const newUser = db
      .prepare("SELECT id, username, role, full_name, email, created_at, updated_at FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id - Update user profile & optionally change password
app.put("/api/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const { username, password, role, full_name, email } = req.body || {};
    const cleanUsername = username ? String(username).trim() : existing.username;
    const cleanFullName = full_name !== undefined ? String(full_name).trim() : existing.full_name;
    const cleanEmail = email !== undefined ? String(email).trim() : existing.email;
    const targetRole = role && ["admin", "operator", "viewer"].includes(role) ? role : existing.role;

    if (cleanUsername !== existing.username) {
      const clash = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(cleanUsername, userId);
      if (clash) {
        return res.status(409).json({ success: false, error: `Username "${cleanUsername}" is already taken` });
      }
    }

    // Safety: ensure admin username is not renamed and role is not demoted
    if (existing.username === "admin") {
      if (cleanUsername !== "admin") {
        return res.status(400).json({ success: false, error: "The primary 'admin' account username cannot be renamed" });
      }
      if (targetRole !== "admin") {
        return res.status(400).json({ success: false, error: "The primary 'admin' account role cannot be changed" });
      }
    }

    // Safety: ensure we don't demote the last remaining admin
    if (existing.role === "admin" && targetRole !== "admin") {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, error: "Cannot demote the last remaining administrator" });
      }
    }

    if (password && String(password).trim().length > 0) {
      if (String(password).length < 4) {
        return res.status(400).json({ success: false, error: "Password must be at least 4 characters" });
      }
      const newHash = await bcrypt.hash(password, 10);
      db.prepare(`
        UPDATE users
        SET username = ?, password_hash = ?, role = ?, full_name = ?, email = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanUsername, newHash, targetRole, cleanFullName, cleanEmail, userId);
    } else {
      db.prepare(`
        UPDATE users
        SET username = ?, role = ?, full_name = ?, email = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanUsername, targetRole, cleanFullName, cleanEmail, userId);
    }

    const updatedUser = db
      .prepare("SELECT id, username, role, full_name, email, created_at, updated_at FROM users WHERE id = ?")
      .get(userId);

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Delete a user
app.delete("/api/users/:id", (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Prevent deleting the primary admin
    if (targetUser.username === "admin") {
      return res.status(400).json({ success: false, error: "The primary administrator 'admin' cannot be deleted" });
    }

    // Prevent deleting the last remaining admin
    if (targetUser.role === "admin") {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, error: "Cannot delete the last remaining administrator" });
      }
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    res.json({ success: true, message: `User "${targetUser.username}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   DIAGNOSTIC: PING ENDPOINT — visit /api/openstack/ping to debug connection issues
   ========================= */
app.get("/api/openstack/ping", async (req, res) => {
  try {
    const token = await getToken();
    res.json({
      ok: true,
      status: "connected",
      keystoneUrl: KEYSTONE_URL,
      neutronUrl: NEUTRON_URL,
      novaUrl: NOVA_URL,
      glanceUrl: GLANCE_URL,
      authenticated: !!token,
      message: "OpenStack Keystone and core services connected successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: "disconnected",
      keystoneUrl: KEYSTONE_URL,
      error: err.message,
      hint: "Verify KEYSTONE_URL in .env and ensure the DevStack VM is reachable at 192.168.122.156",
      timestamp: new Date().toISOString(),
    });
  }
});

/* =========================
   HELPER: NORMALIZE PROTOCOL (NO CRASH FOR ICMP)
   ========================= */
function resolvePortablePath(rawPath) {
  if (!rawPath) return "";
  const systemUser = process.env.VM_USER || os.userInfo().username;
  return rawPath
    .replace(/\${VM_USER}/g, systemUser)
    .replace(/\$VM_USER/g, systemUser)
    .replace(/^~/, os.homedir());
}

const normalizeProtocol = (protocol) => {
  if (!protocol) return "icmp";
  return protocol.toLowerCase();
};

/* Removed hardcoded resolveLogicalSwitch - now using dynamic findNetwork */

/* =========================
   TOKEN MANAGEMENT
   ========================= */
const getToken = async () => {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30000) {
    return tokenCache.token;
  }

  const response = await fetch(`${KEYSTONE_URL}/auth/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: OS_USERNAME,
              password: OS_PASSWORD,
              domain: { name: OS_USER_DOMAIN_NAME },
            },
          },
        },
        scope: {
          project: {
            name: OS_PROJECT_NAME,
            domain: { name: OS_PROJECT_DOMAIN_NAME },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Keystone token request failed ${response.status}: ${text}`,
    );
  }

  const token = response.headers.get("x-subject-token");
  const payload = await response.json();
  const expiresAt = Date.parse(payload.token.expires_at);

  // -- DYNAMIC SERVICE DISCOVERY (LEARNING PHASE) --
  const catalog = payload.token.catalog;
  if (catalog) {
    const keystoneUrlObj = new URL(KEYSTONE_URL);
    const keystoneHost = keystoneUrlObj.hostname;
    const isLocalKeystone =
      keystoneHost === "127.0.0.1" || keystoneHost === "localhost";

    const getUrl = (type) => {
      const service = catalog.find((s) => s.type === type);
      if (service && service.endpoints && service.endpoints.length > 0) {
        // Prefer public interface, fallback to whatever is available
        const endpoint =
          service.endpoints.find((e) => e.interface === "public") ||
          service.endpoints[0];
        let serviceUrl = endpoint.url;

        // If we are accessing Keystone locally (e.g. via port forwarding/tunneling),
        // OpenStack will likely still return its internal network IP (e.g., 172.x.x.x)
        // We must rewrite the hostname to match our local Keystone host to maintain connectivity.
        if (isLocalKeystone) {
          try {
            const urlObj = new URL(serviceUrl);
            urlObj.hostname = keystoneHost;
            serviceUrl = urlObj.toString();
          } catch (e) {
            // ignore
          }
        }
        return serviceUrl;
      }
      return null;
    };

    let nova = getUrl("compute");
    if (nova) NOVA_URL = nova;

    let neutron = getUrl("network");
    if (neutron)
      NEUTRON_URL = neutron.includes("/v2.0")
        ? neutron
        : `${neutron.replace(/\/$/, "")}/v2.0`;

    let glance = getUrl("image");
    if (glance)
      GLANCE_URL = glance.includes("/v2")
        ? glance
        : `${glance.replace(/\/$/, "")}/v2`;
  }
  // ------------------------------------------------

  tokenCache = { token, expiresAt, projectId: payload.token?.project?.id };
  return token;
};

const osFetch = async (url, options = {}) => {
  const token = await getToken();
  const headers = {
    Accept: "application/json",
    "X-Auth-Token": token,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
};

const osJson = async (url, options = {}) => {
  const response = await osFetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenStack request failed ${response.status}: ${text}`);
  }
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`OpenStack returned invalid JSON: ${text.slice(0, 200)}`);
  }
};

/* =========================
   FIX: DEFINE findServerByName — WAS MISSING, CAUSING ReferenceError CRASH
   ========================= */
async function findServerByName(name) {
  const data = await osJson(
    `${NOVA_URL}/servers?name=${encodeURIComponent(name)}`,
  );
  const servers = data.servers || [];
  if (servers.length === 0) {
    throw new Error(`Server not found: ${name}`);
  }
  // Get full server details to access security groups
  const detail = await osJson(`${NOVA_URL}/servers/${servers[0].id}`);
  return detail.server;
}

/* =========================
   FIX: DEFINE findNetwork — WAS MISSING, CAUSING ReferenceError CRASH
   ========================= */
async function findNetwork(nameOrId) {
  const data = await osJson(
    `${NEUTRON_URL}/networks?name=${encodeURIComponent(nameOrId)}`,
  );
  const networks = data.networks || [];
  if (networks.length === 0) {
    throw new Error(`Network not found: ${nameOrId}`);
  }
  const net = networks[0];
  // Get subnet CIDR
  if (net.subnets && net.subnets.length > 0) {
    try {
      const subnetData = await osJson(
        `${NEUTRON_URL}/subnets/${net.subnets[0]}`,
      );
      net.cidr = subnetData.subnet?.cidr || "0.0.0.0/0";
    } catch (_) {
      net.cidr = "0.0.0.0/0";
    }
  } else {
    net.cidr = "0.0.0.0/0";
  }
  return net;
}

/* =========================
   FIX: ADD MISSING /api/openstack/cloud-summary ENDPOINT
   Cloud.jsx line 59 calls this — it was COMPLETELY MISSING from server.js
   ========================= */
app.get("/api/openstack/cloud-summary", async (req, res) => {
  try {
    const token = await getToken();

    // Fetch servers (VMs) from Nova
    const [serversData, networksData, routersData, portsData, imagesData, flavorsData] =
      await Promise.all([
        osJson(`${NOVA_URL}/servers/detail`),
        osJson(`${NEUTRON_URL}/networks`),
        osJson(`${NEUTRON_URL}/routers`),
        osJson(`${NEUTRON_URL}/ports`),
        osJson(`${GLANCE_URL}/images`).catch(() => ({ images: [] })),
        osJson(`${NOVA_URL}/flavors/detail`).catch(() => ({ flavors: [] })),
      ]);

    const servers = serversData.servers || [];
    const currentProjectId = tokenCache.projectId;
    const networks = (networksData.networks || []).filter(
      (n) => n.shared || (currentProjectId ? n.project_id === currentProjectId : true),
    );
    const routers = routersData.routers || [];
    const ports = portsData.ports || [];
    const images = (imagesData.images || []).filter((img) => img.status === "active");

    // Get subnets for CIDR info
    let subnets = [];
    try {
      const subnetData = await osJson(`${NEUTRON_URL}/subnets`);
      subnets = subnetData.subnets || [];
    } catch (_) {}

    // Map subnet id -> cidr
    const subnetMap = {};
    subnets.forEach((s) => {
      subnetMap[s.id] = s;
    });

    // Build port map: server_id -> port info (first port, kept for
    // backward compatibility) and server_id -> ALL ports, since a VM
    // can be attached to more than one slice/network at once.
    const portByServer = {};
    const portsByServer = {};
    ports.forEach((port) => {
      if (port.device_owner === "compute:nova" && port.device_id) {
        if (!portByServer[port.device_id]) {
          portByServer[port.device_id] = port;
        }
        if (!portsByServer[port.device_id]) portsByServer[port.device_id] = [];
        portsByServer[port.device_id].push(port);
      }
    });

    // Build virtualMachines list matching what Cloud.jsx expects
    const virtualMachines = servers.map((server) => {
      const port = portByServer[server.id];
      const fixedIp = port?.fixed_ips?.[0];
      const ipAddr =
        fixedIp?.ip_address ||
        Object.values(server.addresses || {})?.[0]?.[0]?.addr ||
        "N/A";
      const networkName =
        Object.keys(server.addresses || {})?.[0] || port?.network_id || "N/A";
      const subnetInfo = fixedIp ? subnetMap[fixedIp.subnet_id] : null;

      return {
        id: server.id,
        name: server.name,
        status: server.status,
        ip: ipAddr,
        network: networkName,
        zone: server["OS-EXT-AZ:availability_zone"] || "nova",
        logicalPort: port?.id || null,
        logicalSwitch: port ? `neutron-${port.network_id}` : null,
        logicalSwitches: (portsByServer[server.id] || []).map(
          (p) => `neutron-${p.network_id}`
        ),
      };
    });

    // Count tunnels (VXLAN/Geneve) from network segmentation
    const tunnelNetworks = networks.filter(
      (n) =>
        n.provider_network_type === "vxlan" ||
        n.provider_network_type === "geneve",
    );

    // Build stats for the dashboard cards
    const stats = [
      {
        title: "Active Instances",
        value: servers.filter((s) => s.status === "ACTIVE").length,
        icon: "🖥️",
      },
      {
        title: "OVN Logical Switches",
        value: networks.length,
        icon: "🌐",
      },
      {
        title: "Routers",
        value: routers.length,
        icon: "📡",
      },
      {
        title: "VXLAN/Geneve Tunnels",
        value: tunnelNetworks.length || networks.length,
        icon: "🔗",
      },
    ];

    // Build OVN networks for Cloud.jsx OVN Networks panel
    const ovnNetworks = networks.map((net) => {
      const subnetId = net.subnets?.[0];
      const subnet = subnetId ? subnetMap[subnetId] : null;
      const segId = net.provider_segmentation_id;
      const netType = (net.provider_network_type || "vxlan").toUpperCase();

      return {
        name: net.name,
        type: "OVN Logical Switch",
        cidr: subnet?.cidr || "N/A",
        segmentation: segId ? `${netType}-${segId}` : netType,
        status: net.admin_state_up ? "ACTIVE" : "DOWN",
        id: net.id,
      };
    });

    // Infrastructure status — check OVN/OVS health via ovn-nbctl
    const infrastructureStatus = await checkInfrastructureStatus();

    // Security rules — fetch existing security group rules
    let securityRules = [];
    try {
      const sgData = await osJson(
        `${NEUTRON_URL}/security-group-rules?limit=20`,
      );
      securityRules = (sgData.security_group_rules || [])
        .slice(0, 10)
        .map((r) => ({
          id: r.id,
          protocol: r.protocol || "any",
          port: r.port_range_min
            ? `${r.port_range_min}-${r.port_range_max}`
            : "any",
          direction: r.direction,
          action: "ALLOW",
        }));
    } catch (_) {}

    const flavors = (flavorsData?.flavors || []).sort((a, b) => a.ram - b.ram);

    res.json({
      stats,
      virtualMachines,
      networks: ovnNetworks,
      routers,
      ports,
      flows: [], // Live flows come from OVN southbound; placeholder for now
      securityRules,
      infrastructureStatus,
      availableFlavors: flavors.map((f) => ({ id: f.id, name: f.name, ram: f.ram, vcpus: f.vcpus, disk: f.disk })),
      flavors: flavors.map((f) => ({ id: f.id, name: f.name, ram: f.ram, vcpus: f.vcpus, disk: f.disk })),
      availableImages: images.map((img) => ({ id: img.id, name: img.name })),
      images: images.map((img) => ({ id: img.id, name: img.name })),
    });
  } catch (error) {
    console.error("Cloud summary error:", error.message);
    console.error("  → Keystone URL tried:", KEYSTONE_URL);

    // Return a descriptive error — not a crash
    res.status(500).json({
      error: "OpenStack unreachable",
      details: error.message,
      keystoneUrl: KEYSTONE_URL,
      hint: KEYSTONE_URL.includes("127.0.0.1")
        ? "If DevStack runs in WSL, 127.0.0.1 points to Windows — not WSL. Run 'wsl hostname -I' in PowerShell, then update KEYSTONE_URL in .env."
        : "Check that DevStack is running: cd ~/devstack && ./rejoin-stack.sh",
      stats: [],
      virtualMachines: [],
      networks: [],
      flows: [],
      securityRules: [],
    });
  }
});

/* =========================
   HELPER: CHECK OVN/OVS INFRASTRUCTURE STATUS
   ========================= */
async function checkInfrastructureStatus() {
  const status = {
    ovnNbDb: { status: "Unknown", health: 0 },
    ovnSbDb: { status: "Unknown", health: 0 },
    neutronApi: { status: "Unknown", health: 0 },
    ovsBridges: { status: "Unknown", health: 0 },
  };

  // Check Neutron API
  try {
    await osJson(`${NEUTRON_URL}/networks?limit=1`);
    status.neutronApi = { status: "Healthy", health: 90 };
  } catch (_) {
    status.neutronApi = { status: "Unreachable", health: 0 };
  }

  // Check OVN Northbound DB
  await new Promise((resolve) => {
    execFile("sudo", ["-n", "ovn-nbctl", "show"], { timeout: 3000 }, (error) => {
      if (!error) {
        status.ovnNbDb = { status: "Healthy", health: 95 };
        status.ovnSbDb = { status: "Connected", health: 88 };
        status.ovsBridges = { status: "Operational", health: 92 };
      } else {
        status.ovnNbDb = { status: "Not Available", health: 20 };
        status.ovnSbDb = { status: "Not Available", health: 20 };
        status.ovsBridges = { status: "Not Available", health: 20 };
      }
      resolve();
    });
  });

  return status;
}

/* =========================
   FIX: SECURITY RULE CREATION (ICMP SAFE + findServerByName/findNetwork NOW DEFINED)
   ========================= */
app.post("/api/openstack/security-groups/rules", async (req, res) => {
  const rule = req.body;

  if (
    !rule ||
    !rule.source ||
    !rule.destination ||
    !rule.protocol ||
    (rule.protocol.toUpperCase() !== "ICMP" && !rule.port)
  ) {
    return res.status(400).json({
      error: "Source, destination, and port are required.",
    });
  }

  if (rule.action && rule.action.toUpperCase() !== "ALLOW") {
    return res.status(400).json({
      error: "OpenStack security groups only support ALLOW rules.",
    });
  }

  try {
    const server = await findServerByName(rule.source);
    const securityGroupName = server.security_groups?.[0]?.name;

    if (!securityGroupName) {
      return res.status(400).json({
        error: "Source VM has no security group attached.",
      });
    }

    const network = await findNetwork(rule.destination);

    const groupResponse = await osJson(
      `${NEUTRON_URL}/security-groups?name=${encodeURIComponent(securityGroupName)}`,
    );

    const securityGroup = (groupResponse.security_groups || [])[0];

    if (!securityGroup) {
      return res.status(400).json({
        error: `Security group not found: ${securityGroupName}`,
      });
    }

    const cidr = network.cidr || "0.0.0.0/0";
    const ethertype = cidr.includes(":") ? "IPv6" : "IPv4";
    const reqProtocol = normalizeProtocol(rule.protocol);

    const rulesToCreate = [];

    if (reqProtocol === "icmp") {
      // Create BOTH IPv4 and IPv6 ICMP rules to support NAT64/IPv6 instances
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype: "IPv4",
          protocol: "icmp",
          remote_ip_prefix: cidr.includes(":") ? "0.0.0.0/0" : cidr,
        },
      });
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype: "IPv6",
          protocol: "ipv6-icmp",
          // Use ::/0 for IPv6 if the provided CIDR was IPv4
          remote_ip_prefix: cidr.includes(":") ? cidr : "::/0",
        },
      });
    } else {
      // TCP / UDP
      rulesToCreate.push({
        security_group_rule: {
          security_group_id: securityGroup.id,
          direction: "ingress",
          ethertype,
          protocol: reqProtocol,
          remote_ip_prefix: cidr,
          port_range_min: Number(rule.port),
          port_range_max: Number(rule.port),
        },
      });
    }

    const createdRules = await Promise.all(
      rulesToCreate.map((body) =>
        osJson(`${NEUTRON_URL}/security-group-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch((err) => {
          // If the rule already exists, OpenStack throws a 409 Conflict.
          // We can safely ignore this and pretend it succeeded.
          if (err.message && err.message.includes("409")) {
            return { security_group_rule: { id: "existing-rule" } };
          }
          throw err;
        }),
      ),
    );

    const firstRuleId = createdRules[0]?.security_group_rule?.id;

    let odlSyncResult = null;
    let odlSyncError = null;
    try {
      odlSyncResult = await odlSync.pushSecurityRuleShadow({
        protocol: rule.protocol,
        port: rule.port,
        destination: network.name,
      });
    } catch (syncErr) {
      odlSyncError = syncErr.message;
      console.error("ODL sync (non-fatal):", syncErr.message);
    }

    res.json({
      success: true,
      acl: {
        id: firstRuleId,
        source: rule.source,
        destination: network.name,
        protocol: rule.protocol,
        port: rule.port,
        action: "ALLOW",
      },
      message: "Security group rule created successfully.",
      odlSync: odlSyncResult
        ? { synced: true, ...odlSyncResult }
        : { synced: false, error: odlSyncError },
    });
  } catch (error) {
    console.error("Security rule creation error:", error);

    if (error.message.includes("409")) {
      return res.status(409).json({
        error: "Security group rule already exists.",
      });
    }

    res.status(500).json({
      error: error.message || "Failed to create security group rule",
    });
  }
});

/* =========================
   FIX: ACL LIST (OVN switch name resolution)
   ========================= */
app.get("/api/openstack/vm-topology-map", async (req, res) => {
  try {
    const [serversData, portsData] = await Promise.all([
      osJson(`${NOVA_URL}/servers/detail`),
      osJson(`${NEUTRON_URL}/ports`),
    ]);
    const servers = serversData.servers || [];
    const ports = (portsData.ports || []).filter(
      (p) => p.device_owner === "compute:nova",
    );

    // Detect if ONOS or ODL is the active controller
    let controllerType = "odl";
    let onosDevices = [];
    try {
      const onosRes = await fetch("http://localhost:8181/onos/v1/devices", {
        headers: {
          Authorization: "Basic " + Buffer.from("onos:rocks").toString("base64"),
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(2000),
      });
      if (onosRes.ok) {
        const onosData = await onosRes.json();
        onosDevices = onosData.devices || [];
        controllerType = "onos";
      }
    } catch {}

    let odlConnectors = [];
    let brIntNodeId = null;

    if (controllerType === "onos") {
      // Find OVSDB controller/device in ONOS (e.g. ovsdb:172.17.0.1)
      const ovsdbDev = onosDevices.find(
        (d) => (d.id?.includes("ovsdb") || d.type === "CONTROLLER") && d.available,
      );
      brIntNodeId = ovsdbDev ? `${ovsdbDev.id}/bridge/br-int` : "ovsdb:172.17.0.1/bridge/br-int";
    } else {
      // Pull ODL's live node-connector list for br-int so we can match tap<id> names
      try {
        brIntNodeId = await odlSync.findBrIntNodeId();
        const odlRes = await fetch(
          `${odlSync.__ODL_BASE || "http://localhost:8181"}/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
            brIntNodeId,
          )}?content=nonconfig`,
          {
            headers: {
              Authorization: "Basic " + Buffer.from("admin:admin").toString("base64"),
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(2500),
          },
        );
        if (odlRes.ok) {
          const odlData = await odlRes.json();
          const node = odlData["opendaylight-inventory:node"]?.[0];
          odlConnectors = node?.["node-connector"] || [];
        }
      } catch (odlErr) {
        console.error("ODL topology fetch (non-fatal):", odlErr.message);
      }
    }

    const mapping = servers.map((server) => {
      const port = ports.find((p) => p.device_id === server.id);
      const tapName = port ? `tap${port.id.slice(0, 11)}` : null;

      let connectorId = null;
      let isVisible = false;

      if (controllerType === "onos") {
        // In ONOS: DevStack OVS host is connected via OVSDB, VM is active with TAP bound to br-int
        const isBoundToBrInt =
          port?.binding_vif_details?.bridge_name === "br-int" ||
          port?.["binding:vif_details"]?.bridge_name === "br-int" ||
          port?.status === "ACTIVE";
        isVisible = server.status === "ACTIVE" && !!tapName && isBoundToBrInt;
        connectorId = isVisible ? `${brIntNodeId}/${tapName}` : null;
      } else {
        // In ODL: Match tap interface name in ODL inventory
        const connector = tapName
          ? odlConnectors.find(
              (nc) => nc["flow-node-inventory:name"] === tapName,
            )
          : null;
        connectorId = connector?.id || null;
        isVisible = !!connector;
      }

      return {
        vmId: server.id,
        vmName: server.name,
        vmStatus: server.status,
        neutronPortId: port?.id || null,
        macAddress: port?.mac_address || null,
        ipAddress: port?.fixed_ips?.[0]?.ip_address || null,
        ovsInterface: tapName,
        controllerNodeConnectorId: connectorId,
        controllerVisible: isVisible,
        // Backward compatibility
        odlNodeConnectorId: connectorId,
        odlVisible: isVisible,
      };
    });

    res.json({
      controllerType,
      controllerName: controllerType === "onos" ? "ONOS" : "OpenDaylight",
      brIntNodeId,
      mapping,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= NETWORK SLICE MANAGER =============
import { randomUUID } from "crypto";

function rowToSlice(row) {
  if (!row) return null;
  return {
    ...row,
    vmIds: row.vm_ids ? JSON.parse(row.vm_ids) : [],
    odlShadowFlowIds: row.odl_shadow_flow_ids ? JSON.parse(row.odl_shadow_flow_ids) : [],
  };
}

app.get("/api/slices", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM slices ORDER BY created_at DESC").all();
    res.json({ slices: rows.map(rowToSlice) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/slices/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Slice not found" });
    res.json({ slice: rowToSlice(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Slice Manager: capacity pool helpers ----
function getSliceManagerConfig() {
  return db.prepare("SELECT * FROM slice_manager_config WHERE id = 1").get();
}

function getAllocatedMbps(excludeSliceId) {
  const rows = db
    .prepare("SELECT id, allocated_mbps FROM slices WHERE status = 'ACTIVE'")
    .all();
  let total = 0;
  for (const r of rows) {
    if (excludeSliceId && r.id === excludeSliceId) continue;
    total += r.allocated_mbps || 0;
  }
  return total;
}
function getAllocatedPps(excludeSliceId) {
  const rows = db
    .prepare("SELECT id, allocated_pps FROM slices WHERE status = 'ACTIVE'")
    .all();
  let total = 0;
  for (const r of rows) {
    if (excludeSliceId && r.id === excludeSliceId) continue;
    total += r.allocated_pps || 0;
  }
  return total;
}

app.get("/api/slice-manager/capacity", (req, res) => {
  const config = getSliceManagerConfig();
  const allocated = getAllocatedMbps();
  const allocatedPps = getAllocatedPps();
  const totalPps = config.total_pps_capacity || 10000;
  res.json({
    totalMbps: config.total_capacity_mbps,
    allocatedMbps: allocated,
    remainingMbps: config.total_capacity_mbps - allocated,
    totalPps,
    allocatedPps,
    remainingPps: totalPps - allocatedPps,
  });
});

app.put("/api/slice-manager/capacity", (req, res) => {
  const { totalMbps } = req.body;
  if (!totalMbps || totalMbps <= 0) {
    return res.status(400).json({ error: "totalMbps must be a positive number" });
  }
  const allocated = getAllocatedMbps();
  if (totalMbps < allocated) {
    return res.status(409).json({
      error: `Cannot set total capacity below what is currently allocated (${allocated} Mbps already committed across active slices).`,
    });
  }
  db.prepare(
    "UPDATE slice_manager_config SET total_capacity_mbps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
  ).run(totalMbps);
  res.json({ totalMbps, allocatedMbps: allocated, remainingMbps: totalMbps - allocated });
});

// ---- Rule-based intent parser: plain-English -> technical slice parameters ----
function parseIntent(text) {
  const raw = text || "";
  const lower = raw.toLowerCase();

  const matchedKeywords = [];
  const prioritySuggestions = [];
  const isolationSuggestions = [];
  const latencySuggestions = [];
  const bandwidthSuggestions = [];

  const RULES = [
    {
      keywords: ["critical", "hospital", "medical", "emergency"],
      explanation: "critical/medical context -> HIGH priority, STRICT isolation, LOW latency, higher bandwidth",
      apply: () => {
        prioritySuggestions.push("HIGH");
        isolationSuggestions.push("STRICT");
        latencySuggestions.push("LOW");
        bandwidthSuggestions.push(500);
      },
    },
    {
      keywords: ["guest", "visitor", "public"],
      explanation: "guest/public-facing context -> LOW priority, lower bandwidth",
      apply: () => {
        prioritySuggestions.push("LOW");
        bandwidthSuggestions.push(50);
      },
    },
    {
      keywords: ["research", "data", "analysis"],
      explanation: "research/data-analysis context -> higher bandwidth, STRICT isolation",
      apply: () => {
        bandwidthSuggestions.push(300);
        isolationSuggestions.push("STRICT");
      },
    },
    {
      keywords: ["fast", "low latency", "real-time", "real time", "urgent"],
      explanation: "time-sensitivity keyword -> LOW latency",
      apply: () => {
        latencySuggestions.push("LOW");
      },
    },
    {
      keywords: ["secure", "isolated", "private", "protected"],
      explanation: "security keyword -> STRICT isolation",
      apply: () => {
        isolationSuggestions.push("STRICT");
      },
    },
    {
      keywords: ["high bandwidth", "video", "streaming"],
      explanation: "high-throughput workload -> higher bandwidth",
      apply: () => {
        bandwidthSuggestions.push(500);
      },
    },
  ];

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(lower)) {
        matchedKeywords.push({ keyword: kw, reason: rule.explanation });
        rule.apply();
      }
    }
  }

  const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const priority = prioritySuggestions.length
    ? prioritySuggestions.reduce((best, p) => (PRIORITY_RANK[p] > PRIORITY_RANK[best] ? p : best), "LOW")
    : "MEDIUM";

  const isolationLevel = isolationSuggestions.includes("STRICT") ? "STRICT" : "STANDARD";
  const latencyRequirement = latencySuggestions.includes("LOW") ? "LOW" : "STANDARD";
  const bandwidthMbps = bandwidthSuggestions.length ? Math.max(...bandwidthSuggestions) : 200;

  return {
    priority,
    isolationLevel,
    latencyRequirement,
    bandwidthMbps,
    matchedKeywords,
    usedDefaults: matchedKeywords.length === 0,
  };
}

// ---- Intent preview endpoint: parses text into params, creates nothing ----
// ---- LLM provider key settings ----
app.get("/api/settings/llm-keys", (req, res) => {
  try {
    const rows = db.prepare("SELECT provider, model, updated_at FROM provider_keys").all();
    const saved = {};
    rows.forEach((r) => { saved[r.provider] = { model: r.model, updatedAt: r.updated_at }; });
    const providers = Object.entries(llmProviders.PROVIDERS).map(([id, meta]) => ({
      id,
      label: meta.label,
      defaultModel: meta.defaultModel,
      saved: !!saved[id],
      model: saved[id]?.model || null,
      updatedAt: saved[id]?.updatedAt || null,
    }));
    res.json({ providers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/llm-keys", (req, res) => {
  try {
    const { provider, apiKey, model } = req.body || {};
    if (!provider || !llmProviders.PROVIDERS[provider]) {
      return res.status(400).json({ error: "Unknown or missing provider" });
    }
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: "apiKey is required" });
    }
    const enc = llmProviders.encryptSecret(apiKey.trim());
    db.prepare(
      `INSERT INTO provider_keys (provider, encrypted_key, iv, tag, model, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(provider) DO UPDATE SET
         encrypted_key = excluded.encrypted_key,
         iv = excluded.iv,
         tag = excluded.tag,
         model = excluded.model,
         updated_at = CURRENT_TIMESTAMP`
    ).run(provider, enc.data, enc.iv, enc.tag, model || null);
    res.json({ ok: true, provider, saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/settings/llm-keys/:provider", (req, res) => {
  try {
    db.prepare("DELETE FROM provider_keys WHERE provider = ?").run(req.params.provider);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/parse-intent", async (req, res) => {
  const { text, provider } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  if (provider && llmProviders.PROVIDERS[provider]) {
    try {
      const row = db.prepare("SELECT * FROM provider_keys WHERE provider = ?").get(provider);
      if (row) {
        const apiKey = llmProviders.decryptSecret({ iv: row.iv, tag: row.tag, data: row.encrypted_key });
        const result = await llmProviders.parseIntentViaLLM(provider, apiKey, text, row.model);
        return res.json(result);
      }
    } catch (err) {
      console.error(`LLM intent parse failed (${provider}), falling back to rule-based:`, err.message);
    }
  }

  const result = parseIntent(text);
  res.json({ ...result, source: "rules" });
});

// ---- Slice creation: admission control + real network + real QoS ----
app.post("/api/slices", async (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: "Slice name is required" });

  const requestedMbps = parseFloat(b.bandwidthMbps ?? b.requestedBandwidthMbps ?? 0);
  if (!requestedMbps || requestedMbps <= 0) {
    return res.status(400).json({ error: "A positive requested bandwidth (bandwidthMbps) is required" });
  }

  // maxPacketsPerSecond is optional - only validated/admission-checked if provided
  const requestedPps = (b.maxPacketsPerSecond !== undefined && b.maxPacketsPerSecond !== null && b.maxPacketsPerSecond !== "")
    ? parseFloat(b.maxPacketsPerSecond)
    : null;
  if (requestedPps !== null && (!Number.isFinite(requestedPps) || requestedPps <= 0)) {
    return res.status(400).json({ error: "maxPacketsPerSecond must be a positive number" });
  }

  const config = getSliceManagerConfig();
  const allocated = getAllocatedMbps();
  const remaining = config.total_capacity_mbps - allocated;

  // ---- Admission control (bandwidth) ----
  if (requestedMbps > remaining) {
    return res.status(409).json({
      error: "Insufficient network capacity for this slice.",
      details: {
        requestedMbps,
        allocatedMbps: allocated,
        totalMbps: config.total_capacity_mbps,
        remainingMbps: remaining,
      },
    });
  }

  // ---- Admission control (packets per second) ----
  if (requestedPps !== null) {
    const allocatedPps = getAllocatedPps();
    const totalPps = config.total_pps_capacity || 10000;
    const remainingPps = totalPps - allocatedPps;
    if (requestedPps > remainingPps) {
      return res.status(409).json({
        error: "Insufficient packet-processing capacity for this slice.",
        details: { requestedPps, allocatedPps, totalPps, remainingPps },
      });
    }
  }

  const id = randomUUID();
  let networkId = null;
  let networkName = null;
  let qosPolicyId = null;
  let qosStatus = "pending";
  let creationError = null;
  let bandwidthLimitRuleId = null;
  let minimumBandwidthRuleId = null;
  let dscpMarkingRuleId = null;
  let priorityEnforcementStatus = "pending";
  let ppsEnforcementStatus = requestedPps ? "pending" : "not_configured";

  const vmCount = Math.max((b.vmIds || []).length, 1);
  const perVmMbps = requestedMbps / vmCount;
  const perVmPps = requestedPps ? requestedPps / vmCount : null;

  try {
    // 1. Create a real Neutron network dedicated to this slice
    networkName = `slice-${b.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${id.slice(0, 8)}`;
    const networkData = await osJson(`${NEUTRON_URL}/networks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: { name: networkName, admin_state_up: true } }),
    });
    networkId = networkData.network.id;

    // 1b. Create a subnet on this new network - Nova refuses to attach any
    //     VM to a network with no subnet, so without this every slice would
    //     be unusable by real VMs. CIDR is derived from the slice id (with
    //     retries on collision) so different slices don't overlap.
    let subnetCreated = false;
    for (let attempt = 0; attempt < 5 && !subnetCreated; attempt++) {
      const octet = (parseInt(id.replace(/-/g, "").slice(attempt * 2, attempt * 2 + 2), 16) % 254) + 1;
      try {
        await osJson(`${NEUTRON_URL}/subnets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subnet: {
              network_id: networkId,
              ip_version: 4,
              cidr: `10.200.${octet}.0/24`,
              name: `${networkName}-subnet`,
            },
          }),
        });
        subnetCreated = true;
      } catch (subnetErr) {
        if (attempt === 4) throw subnetErr;
      }
    }

    // 1c. Attach each selected VM's port directly to this slice's network.
    //     Bandwidth cap and DSCP marking apply at the network level, so a
    //     VM only actually experiences them once it has a real port on
    //     this specific network - simply listing it in vmIds is not
    //     enough. Priority (the OVS queue, applied further below) does not
    //     depend on this attachment, since it targets the VM's port
    //     directly wherever it already is.
    const vmAttachResults = await Promise.all(
      (b.vmIds || []).map(async (vmId) => {
        try {
          await osJson(`${NOVA_URL}/servers/${vmId}/os-interface`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interfaceAttachment: { net_id: networkId } }),
          });
          return { vmId, attached: true };
        } catch (attachErr) {
          console.error(`Slice Manager: failed to attach VM ${vmId} to slice network:`, attachErr.message);
          return { vmId, attached: false, error: attachErr.message };
        }
      })
    );

    // 2. Attempt to create a real Neutron QoS policy for this slice (if QoS extension is available)
    const maxKbps = Math.round(perVmMbps * 1000);
    try {
      const policyData = await osJson(`${NEUTRON_URL}/qos/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: { name: `${networkName}-qos`, description: `QoS policy for slice: ${b.name}` },
        }),
      });
      qosPolicyId = policyData.policy?.id;

      if (qosPolicyId) {
        const bwLimitData = await osJson(`${NEUTRON_URL}/qos/policies/${qosPolicyId}/bandwidth_limit_rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bandwidth_limit_rule: {
              max_kbps: maxKbps,
              max_burst_kbps: Math.round(maxKbps * 0.125),
            },
          }),
        });
        bandwidthLimitRuleId = bwLimitData.bandwidth_limit_rule?.id;
      }
    } catch (qosErr) {
      console.warn("Neutron QoS policy creation skipped (plugin unavailable):", qosErr.message);
    }

    // 2b. Priority -> guaranteed bandwidth floor (ingress direction, the only
    //     direction this DevStack's minimum-bandwidth extension supports).
    //     LOW priority gets no floor rule at all (best-effort only).
    // 2b. Priority -> guaranteed bandwidth floor. NOTE: we do NOT create a
    //     Neutron minimum_bandwidth rule here - on this DevStack, any
    //     network carrying that rule blocks Nova from creating ANY port on
    //     it at all (NetworksWithQoSPolicyNotSupported), because Nova
    //     requires Placement bandwidth-resource tracking, which is not
    //     wired up and is structurally incompatible with Geneve overlay
    //     networks (confirmed via direct testing). Instead, the guarantee
    //     is enforced directly on OVS via a Linux HTB queue (min-rate)
    //     below, applied to each VM already in vmIds, and re-applied
    //     automatically in PUT /api/slices/:id whenever VM membership or
    //     priority changes - the same bypass-Neutron-QoS approach
    //     enforce-bandwidth already uses for the ceiling.
    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[b.priority || "MEDIUM"] ?? 0.5;
    const fastLaneKbps = Math.round(maxKbps * priorityFraction);
    const standardMinKbps = Math.round(maxKbps * 0.1);
    const needsFastLane = (b.latencyRequirement || "STANDARD") === "LOW";
    if ((priorityFraction > 0 || needsFastLane) && (b.vmIds || []).length > 0) {
      try {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => (b.vmIds || []).includes(s.id));
        const ports = portsData.ports || [];
        const results = [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id && p.network_id === networkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);
          results.push({ vmId: server.id, ...r });
        }
        const baseStatus = results.length > 0 && results.every((r) => r.success)
          ? "enforced (direct OVS HTB queue, verified on device)"
          : results.some((r) => r.success)
          ? "partially enforced (direct OVS HTB queue)"
          : results.length > 0
          ? "virtual interface attached (host OVS queue skipped)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
        priorityEnforcementStatus = priorityFraction === 0
          ? `${baseStatus} (LOW priority, no bandwidth guarantee; fast lane active for latency)`
          : baseStatus;
      } catch (priErr) {
        console.error("Slice Manager: direct priority enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else if (priorityFraction === 0) {
      priorityEnforcementStatus = "best-effort (LOW priority, no guarantee)";
    } else {
      priorityEnforcementStatus = "no VMs assigned yet (attach VMs, then update the slice to apply)";
    }

    // 2d. Packets-per-second ceiling - independent of priority/bandwidth,
    //     real per-packet enforcement via a host-level tc ingress policer
    //     (see ovsDirect.js enforcePpsLimitDirect). Lives entirely outside
    //     OVN's territory, so it can't be wiped by ovn-controller's
    //     reconciliation the way an OpenFlow meter on br-int could be.
    if (requestedPps && (b.vmIds || []).length > 0) {
      try {
        const [ppsServersData, ppsPortsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const ppsServers = (ppsServersData.servers || []).filter((s) => (b.vmIds || []).includes(s.id));
        const ppsPorts = ppsPortsData.ports || [];
        const ppsResults = [];
        for (const server of ppsServers) {
          // Match by network_id too, not just device_id - a VM can belong to
          // multiple slices/networks at once, and device_id alone would grab
          // whichever port Neutron lists first, which may belong to a
          // completely different slice.
          const port = ppsPorts.find((p) => p.device_id === server.id && p.network_id === networkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforcePpsLimitDirect(ifaceName, Math.round(perVmPps));
          ppsResults.push({ vmId: server.id, ...r });
        }
        ppsEnforcementStatus = ppsResults.length > 0 && ppsResults.every((r) => r.success)
          ? "enforced (direct tc ingress policer, verified on device)"
          : ppsResults.some((r) => r.success)
          ? "partially enforced (direct tc ingress policer)"
          : ppsResults.length > 0
          ? "virtual interface attached (host tc policer skipped)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
      } catch (ppsErr) {
        console.error("Slice Manager: direct PPS enforcement failed:", ppsErr.message);
        ppsEnforcementStatus = `enforcement failed: ${ppsErr.message}`;
      }
    } else if (requestedPps) {
      ppsEnforcementStatus = "no VMs assigned yet (attach VMs, then update the slice to apply)";
    }

    // 2c & 3. Latency requirement -> DSCP marking & network-level QoS policy attachment
    if (qosPolicyId) {
      try {
        const dscpValue = LATENCY_DSCP_VALUE[b.latencyRequirement || "STANDARD"] ?? 0;
        if (dscpValue > 0) {
          const dscpData = await osJson(`${NEUTRON_URL}/qos/policies/${qosPolicyId}/dscp_marking_rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dscp_marking_rule: { dscp_mark: dscpValue },
            }),
          });
          dscpMarkingRuleId = dscpData.dscp_marking_rule?.id;
        }

        await osJson(`${NEUTRON_URL}/networks/${networkId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network: { qos_policy_id: qosPolicyId } }),
        });

        qosStatus = "enforced (Neutron QoS policy applied at network level)";
      } catch (applyQosErr) {
        console.warn("Neutron QoS network application skipped:", applyQosErr.message);
      }
    } else {
      qosStatus = "qos_plugin_unavailable (direct OVS/tc rate limiting supported)";
    }
  } catch (err) {
    console.error("Slice Manager: OpenStack resource creation failed:", err.message);
    creationError = err.message;
    qosStatus = `creation failed: ${err.message}`;
  }

  db.prepare(
    `INSERT INTO slices
      (id, name, description, project_id, network_id, network_name, vm_ids,
       slice_type, bandwidth_min, bandwidth_max, priority, isolation_level,
       latency_requirement, status, qos_status, isolation_status, qos_policy_id,
       allocated_mbps, per_vm_mbps, bandwidth_limit_rule_id, minimum_bandwidth_rule_id,
       dscp_marking_rule_id, priority_enforcement_status, color,
       max_pps, allocated_pps, pps_enforcement_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.name,
    b.description || "",
    b.projectId || "",
    networkId || "",
    networkName || "",
    JSON.stringify(b.vmIds || []),
    b.sliceType || "custom",
    `${requestedMbps} Mbps`,
    `${requestedMbps} Mbps`,
    b.priority || "MEDIUM",
    b.isolationLevel || "STANDARD",
    b.latencyRequirement || "STANDARD",
    creationError ? "ERROR" : "ACTIVE",
    qosStatus,
    "not_configured",
    qosPolicyId,
    creationError ? 0 : requestedMbps,
    creationError ? 0 : perVmMbps,
    bandwidthLimitRuleId,
    minimumBandwidthRuleId,
    dscpMarkingRuleId,
    priorityEnforcementStatus,
    b.color || DEFAULT_SLICE_PALETTE[parseInt(id.replace(/-/g, "").slice(0, 4), 16) % DEFAULT_SLICE_PALETTE.length],
    requestedPps,
    creationError ? 0 : (requestedPps || 0),
    ppsEnforcementStatus,
  );

  const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(id);
  const statusCode = creationError ? 207 : 201; // 207: slice recorded, but OpenStack resources partially/fully failed
  res.status(statusCode).json({
    slice: rowToSlice(row),
    capacity: {
      totalMbps: config.total_capacity_mbps,
      allocatedMbps: creationError ? allocated : allocated + requestedMbps,
      remainingMbps: creationError ? remaining : remaining - requestedMbps,
    },
    warning: creationError
      ? `Slice was recorded, but creating the real OpenStack network/QoS policy failed: ${creationError}`
      : undefined,
  });
});

app.put("/api/slices/:id", async (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Slice not found" });

    const b = req.body;
    const newVmIds = b.vmIds ?? JSON.parse(existing.vm_ids || "[]");
    const newPriority = b.priority ?? existing.priority;

    db.prepare(
      `UPDATE slices SET
        name = ?, description = ?, network_id = ?, network_name = ?, vm_ids = ?,
        slice_type = ?, bandwidth_min = ?, bandwidth_max = ?, priority = ?,
        isolation_level = ?, latency_requirement = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      b.name ?? existing.name,
      b.description ?? existing.description,
      b.networkId ?? existing.network_id,
      b.networkName ?? existing.network_name,
      JSON.stringify(newVmIds),
      b.sliceType ?? existing.slice_type,
      b.bandwidthMin ?? existing.bandwidth_min,
      b.bandwidthMax ?? existing.bandwidth_max,
      newPriority,
      b.isolationLevel ?? existing.isolation_level,
      b.latencyRequirement ?? existing.latency_requirement,
      req.params.id,
    );

    // Attach any newly selected VMs to the slice's network, and detach removed VMs
    const targetNetworkId = b.networkId ?? existing.network_id;
    if (targetNetworkId && b.vmIds) {
      const existingVmIds = JSON.parse(existing.vm_ids || "[]");
      const newlyAddedVms = newVmIds.filter((id) => !existingVmIds.includes(id));
      const removedVms = existingVmIds.filter((id) => !newVmIds.includes(id));

      if (newlyAddedVms.length > 0) {
        await Promise.all(
          newlyAddedVms.map(async (vmId) => {
            try {
              await osJson(`${NOVA_URL}/servers/${vmId}/os-interface`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interfaceAttachment: { net_id: targetNetworkId } }),
              });
            } catch (attachErr) {
              console.error(`Slice Manager: failed to attach VM ${vmId} during edit:`, attachErr.message);
            }
          })
        );
      }

      if (removedVms.length > 0) {
        try {
          const portsData = await osJson(`${NEUTRON_URL}/ports?network_id=${targetNetworkId}`);
          const netPorts = portsData.ports || [];
          await Promise.all(
            removedVms.map(async (vmId) => {
              const port = netPorts.find((p) => p.device_id === vmId);
              if (port) {
                try {
                  await osJson(`${NOVA_URL}/servers/${vmId}/os-interface/${port.id}`, { method: "DELETE" });
                } catch (detErr) {
                  console.error(`Slice Manager: failed to detach VM ${vmId} during edit:`, detErr.message);
                }
              }
            })
          );
        } catch (portsErr) {
          console.error("Slice Manager: failed to query ports for VM detachment:", portsErr.message);
        }
      }
    }

    // Reconcile the Neutron DSCP marking rule with the new latency requirement if QoS policy exists
    const newLatencyReq = b.latencyRequirement ?? existing.latency_requirement;
    let newDscpMarkingRuleId = existing.dscp_marking_rule_id;
    if (existing.qos_policy_id) {
      try {
        if (newLatencyReq !== "LOW" && existing.dscp_marking_rule_id) {
          await osJson(
            `${NEUTRON_URL}/qos/policies/${existing.qos_policy_id}/dscp_marking_rules/${existing.dscp_marking_rule_id}`,
            { method: "DELETE" },
          );
          newDscpMarkingRuleId = null;
        } else if (newLatencyReq === "LOW" && !existing.dscp_marking_rule_id) {
          const dscpData = await osJson(
            `${NEUTRON_URL}/qos/policies/${existing.qos_policy_id}/dscp_marking_rules`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dscp_marking_rule: { dscp_mark: 46 } }),
            },
          );
          newDscpMarkingRuleId = dscpData.dscp_marking_rule?.id;
        }
        db.prepare("UPDATE slices SET dscp_marking_rule_id = ? WHERE id = ?").run(
          newDscpMarkingRuleId,
          req.params.id,
        );
      } catch (dscpErr) {
        console.error("Slice Manager: DSCP marking rule reconciliation failed:", dscpErr.message);
      }
    }

    // Re-apply the direct-OVS priority guarantee whenever VM membership or
    // priority changes, so enforced state stays in sync with declared state
    // without needing a manual button (mirrors how the bandwidth ceiling and
    // DSCP mark are always network-level, so they're never out of sync).
    let priorityEnforcementStatus = existing.priority_enforcement_status || "not_configured";
    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[newPriority] ?? 0.5;
    const needsFastLane = (b.latencyRequirement ?? existing.latency_requirement) === "LOW";
    if ((priorityFraction > 0 || needsFastLane) && newVmIds.length > 0) {
      try {
        const perVm = existing.per_vm_mbps || parseFloat(String(existing.bandwidth_max).match(/[\d.]+/)?.[0] || "0");
        const maxKbps = Math.round(perVm * 1000);
        const fastLaneKbps = Math.round(maxKbps * priorityFraction);
        const standardMinKbps = Math.round(maxKbps * 0.1);
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ports = portsData.ports || [];
        const results = [];
        const targetNetworkId = b.networkId ?? existing.network_id;
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id && p.network_id === targetNetworkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);
          results.push({ vmId: server.id, ...r });
        }
        const baseStatus = results.length > 0 && results.every((r) => r.success)
          ? "enforced (direct OVS HTB queue, verified on device)"
          : results.some((r) => r.success)
          ? "partially enforced (direct OVS HTB queue)"
          : results.length > 0
          ? "virtual interface attached (host OVS queue skipped)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
        priorityEnforcementStatus = priorityFraction === 0
          ? `${baseStatus} (LOW priority, no bandwidth guarantee; fast lane active for latency)`
          : baseStatus;
      } catch (priErr) {
        console.error("Slice Manager: direct priority re-enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else {
      // Priority/latency no longer needs a queue guarantee (e.g. downgraded
      // from LOW to STANDARD). Actively remove any leftover OVS queue + tc
      // filter so it doesn't keep enforcing a guarantee the slice no longer
      // declares - this is the cleanup half of the persistence requirement.
      try {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ports = portsData.ports || [];
        const clearTargetNetworkId = b.networkId ?? existing.network_id;
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id && p.network_id === clearTargetNetworkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearQueueDirect(ifaceName);
        }
        priorityEnforcementStatus = "best-effort (no priority/latency guarantee; queue cleared)";
      } catch (clearErr) {
        console.error("Slice Manager: queue cleanup failed:", clearErr.message);
        priorityEnforcementStatus = `best-effort (queue cleanup failed: ${clearErr.message})`;
      }
    }

    db.prepare("UPDATE slices SET priority_enforcement_status = ? WHERE id = ?").run(
      priorityEnforcementStatus,
      req.params.id,
    );

    // Re-apply (or clear) the PPS tc policer whenever VM membership or
    // the declared PPS cap changes, mirroring the priority-guarantee
    // reconciliation just above. `undefined` in the body means "leave as
    // is"; an explicit falsy value (empty string/null) means "remove the
    // limit entirely".
    let ppsEnforcementStatus = existing.pps_enforcement_status || "not_configured";
    const newMaxPps = b.maxPacketsPerSecond !== undefined
      ? (b.maxPacketsPerSecond ? parseFloat(b.maxPacketsPerSecond) : null)
      : existing.max_pps;
    if (newMaxPps && newVmIds.length > 0) {
      try {
        const perVmPps = newMaxPps / newVmIds.length;
        const [ppsServersData, ppsPortsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const targetNetworkId = b.networkId ?? existing.network_id;
        const ppsServers = (ppsServersData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ppsPorts = ppsPortsData.ports || [];
        const ppsResults = [];
        for (const server of ppsServers) {
          const port = ppsPorts.find((p) => p.device_id === server.id && p.network_id === targetNetworkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforcePpsLimitDirect(ifaceName, Math.round(perVmPps));
          ppsResults.push({ vmId: server.id, ...r });
        }
        ppsEnforcementStatus = ppsResults.length > 0 && ppsResults.every((r) => r.success)
          ? "enforced (direct tc ingress policer, verified on device)"
          : ppsResults.some((r) => r.success)
          ? "partially enforced (direct tc ingress policer)"
          : ppsResults.length > 0
          ? "virtual interface attached (host tc policer skipped)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
      } catch (ppsErr) {
        console.error("Slice Manager: direct PPS re-enforcement failed:", ppsErr.message);
        ppsEnforcementStatus = `enforcement failed: ${ppsErr.message}`;
      }
    } else if (newMaxPps) {
      ppsEnforcementStatus = "no VMs assigned yet (attach VMs, then update the slice to apply)";
    } else if (existing.max_pps) {
      // PPS limit removed - actively clear any existing tc policer so it
      // doesn't keep enforcing a cap the slice no longer declares (same
      // cleanup philosophy as the priority queue teardown above).
      try {
        const [ppsServersData, ppsPortsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const clearTargetNetworkId = b.networkId ?? existing.network_id;
        const ppsServers = (ppsServersData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ppsPorts = ppsPortsData.ports || [];
        for (const server of ppsServers) {
          const port = ppsPorts.find((p) => p.device_id === server.id && p.network_id === clearTargetNetworkId);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearPpsLimitDirect(ifaceName);
        }
        ppsEnforcementStatus = "not_configured (limit removed; tc policer cleared)";
      } catch (clearErr) {
        console.error("Slice Manager: PPS rule cleanup failed:", clearErr.message);
        ppsEnforcementStatus = `not_configured (cleanup failed: ${clearErr.message})`;
      }
    } else {
      ppsEnforcementStatus = "not_configured";
    }

    db.prepare("UPDATE slices SET max_pps = ?, allocated_pps = ?, pps_enforcement_status = ? WHERE id = ?").run(
      newMaxPps,
      newMaxPps || 0,
      ppsEnforcementStatus,
      req.params.id,
    );

    const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    res.json({ slice: rowToSlice(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/:id/activate", (req, res) => {
  try {
    db.prepare("UPDATE slices SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Slice not found" });
    res.json({ slice: rowToSlice(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/:id/deactivate", (req, res) => {
  try {
    db.prepare("UPDATE slices SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Slice not found" });
    res.json({ slice: rowToSlice(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletes ONLY the slice record — never touches real OpenStack resources
app.delete("/api/slices/:id", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });

    const cleanupErrors = [];

    // Clean up the direct-OVS priority queue (HTB + tc classifier) on each
    // VM's port before removing the slice record, so a deleted slice
    // doesn't leave a stale bandwidth guarantee running on the interface.
    try {
      const vmIdsForCleanup = JSON.parse(slice.vm_ids || "[]");
      if (vmIdsForCleanup.length > 0) {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => vmIdsForCleanup.includes(s.id));
        const ports = portsData.ports || [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearQueueDirect(ifaceName);
        }
      }
    } catch (queueCleanupErr) {
      cleanupErrors.push(`queue cleanup: ${queueCleanupErr.message}`);
    }

    // Clean up the direct-tc PPS policer on each VM's port too, for the
    // same reason as the HTB queue cleanup above: a deleted slice should
    // not leave a stale packet-rate cap silently dropping that VM's
    // traffic forever. Lives outside OVN's territory (see ovsDirect.js),
    // so nothing else would ever clean this up on its own.
    try {
      const vmIdsForPpsCleanup = JSON.parse(slice.vm_ids || "[]");
      if (slice.max_pps && vmIdsForPpsCleanup.length > 0) {
        const [ppsServersData, ppsPortsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const ppsServers = (ppsServersData.servers || []).filter((s) => vmIdsForPpsCleanup.includes(s.id));
        const ppsPorts = ppsPortsData.ports || [];
        for (const server of ppsServers) {
          const port = ppsPorts.find((p) => p.device_id === server.id && p.network_id === slice.network_id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearPpsLimitDirect(ifaceName);
        }
      }
    } catch (ppsCleanupErr) {
      cleanupErrors.push(`pps cleanup: ${ppsCleanupErr.message}`);
    }

    // Cleanup of the real OpenStack resources this slice created. The
    // network delete is NOT best-effort: if it fails for a reason other
    // than "already gone" (404), we do not delete the DB row, so the
    // slices table and Neutron can never silently drift apart the way
    // they did before (DB row removed, network+VMs left running).
    let networkDeleteBlocking = false;
    if (slice.network_id) {
      // Detach any VM ports attached to this network before deleting it
      let detachedComputePorts = false;
      try {
        const portsData = await osJson(`${NEUTRON_URL}/ports?network_id=${slice.network_id}`);
        const netPorts = portsData.ports || [];
        await Promise.all(
          netPorts.map(async (port) => {
            if (port.device_id && port.device_owner?.startsWith("compute:")) {
              detachedComputePorts = true;
              try {
                await osJson(`${NOVA_URL}/servers/${port.device_id}/os-interface/${port.id}`, { method: "DELETE" });
              } catch (detachErr) {
                console.error(`Slice Manager: error detaching port ${port.id} from VM ${port.device_id}:`, detachErr.message);
              }
            } else {
              try {
                await osJson(`${NEUTRON_URL}/ports/${port.id}`, { method: "DELETE" });
              } catch (_) {}
            }
          })
        );
      } catch (portsErr) {
        cleanupErrors.push(`port cleanup: ${portsErr.message}`);
      }

      // If compute ports were detached, poll briefly for Nova to finish unbinding them from Neutron
      if (detachedComputePorts) {
        for (let wait = 0; wait < 10; wait++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const checkData = await osJson(`${NEUTRON_URL}/ports?network_id=${slice.network_id}`);
            const remainingCompute = (checkData.ports || []).filter((p) => p.device_owner?.startsWith("compute:"));
            if (remainingCompute.length === 0) break;
          } catch (_) {
            break;
          }
        }
      }

      // Retry network deletion up to 4 times if Neutron still reports ports in use
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await osJson(`${NEUTRON_URL}/networks/${slice.network_id}`, { method: "DELETE" });
          networkDeleteBlocking = false;
          break;
        } catch (err) {
          const is404 = /failed 404/.test(err.message);
          if (is404) {
            networkDeleteBlocking = false;
            break;
          }
          if (attempt < 3 && /409|NetworkInUse|ports still in use/i.test(err.message)) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          cleanupErrors.push(`network: ${err.message}`);
          networkDeleteBlocking = true;
        }
      }
    }
    if (networkDeleteBlocking) {
      return res.status(500).json({
        error: "Failed to delete the slice's network in OpenStack. The slice record was NOT removed, so it stays visible and in sync with Neutron. Retry the delete, or investigate the network manually.",
        cleanupErrors,
        networkId: slice.network_id,
      });
    }
    // QoS policy cleanup remains best-effort: a leftover unused policy is
    // inert clutter, not a data-consistency problem like an orphaned
    // network with live VMs would be, so it doesn't block the DB delete.
    if (slice.qos_policy_id) {
      try {
        await osJson(`${NEUTRON_URL}/qos/policies/${slice.qos_policy_id}`, { method: "DELETE" });
      } catch (err) {
        cleanupErrors.push(`qos policy: ${err.message}`);
      }
    }

    db.prepare("DELETE FROM slices WHERE id = ?").run(req.params.id);

    const config = getSliceManagerConfig();
    const allocated = getAllocatedMbps();

    res.json({
      success: true,
      deleted: req.params.id,
      releasedMbps: slice.allocated_mbps || 0,
      cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
      capacity: {
        totalMbps: config.total_capacity_mbps,
        allocatedMbps: allocated,
        remainingMbps: config.total_capacity_mbps - allocated,
      },
      cleanupErrors: cleanupErrors.length ? cleanupErrors : undefined,
      note: cleanupErrors.length
        ? "Slice deleted and bandwidth released. Some underlying OpenStack resources may not have been fully cleaned up — see cleanupErrors."
        : "Slice deleted, bandwidth released, and underlying OpenStack network + QoS policy removed.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Capability detection — honest status of what's actually available in this environment
app.get("/api/slices/capacity/status", async (req, res) => {
  try {
    // Real compute capacity, from OpenStack's own hypervisor accounting
    const hvData = await osJson(`${NOVA_URL}/os-hypervisors/statistics`);
    const stats = hvData.hypervisor_statistics || {};

    // Real network capacity, from the actual NIC speed (ethtool)
    let networkSpeedMbps = null;
    try {
      const { stdout } = await execAsync(`ethtool eth0 2>&1 | grep -i speed`);
      const match = stdout.match(/(\d+)Mb\/s/);
      if (match) networkSpeedMbps = parseInt(match[1]);
    } catch (_) {}

    // Sum up what's already allocated across all slices
    const slices = db.prepare("SELECT * FROM slices").all();
    let allocatedBandwidthMbps = 0;
    for (const s of slices) {
      const m = (s.bandwidth_max || "").match(/([\d.]+)\s*(kbps|mbps|gbps)/i);
      if (m) {
        const num = parseFloat(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === "gbps") allocatedBandwidthMbps += num * 1000;
        else if (unit === "mbps") allocatedBandwidthMbps += num;
        else allocatedBandwidthMbps += num / 1000;
      }
    }

    res.json({
      compute: {
        totalVcpus: stats.vcpus,
        usedVcpus: stats.vcpus_used,
        remainingVcpus: stats.vcpus - stats.vcpus_used,
        totalRamMb: stats.memory_mb,
        usedRamMb: stats.memory_mb_used,
        remainingRamMb: stats.memory_mb - stats.memory_mb_used,
      },
      network: {
        totalCapacityMbps: networkSpeedMbps,
        allocatedAcrossSlicesMbps: allocatedBandwidthMbps,
        remainingMbps: networkSpeedMbps ? networkSpeedMbps - allocatedBandwidthMbps : null,
      },
      note: "Compute capacity read live from OpenStack's hypervisor statistics. Network capacity read live from the host's actual NIC speed (ethtool). Allocated bandwidth is the sum of bandwidth_max declared across all existing slices — this is intent tracking, not yet a hard admission-control check.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/slices/capabilities/status", async (req, res) => {
  const capabilities = {
    neutron: { available: false },
    nova: { available: false },
    glance: { available: false },
    odlRestconf: { available: false },
    odlTopology: { available: false },
    ovs: { available: true, note: "Confirmed present (br-int observed by ODL)" },
    qos: { available: false, note: "Checking..." },
    flowEnforcement: { available: false },
  };
  try {
    await osJson(`${NEUTRON_URL}/networks?limit=1`);
    capabilities.neutron.available = true;
  } catch (_) {}
  try {
    await osJson(`${NOVA_URL}/servers?limit=1`);
    capabilities.nova.available = true;
  } catch (_) {}
  try {
    await osJson(`${GLANCE_URL}/images?limit=1`);
    capabilities.glance.available = true;
  } catch (_) {}
  try {
    await osJson(`${NEUTRON_URL}/qos/policies?limit=1`);
    capabilities.qos.available = true;
    capabilities.qos.note = "Neutron QoS extension is enabled and reachable.";
  } catch (err) {
    capabilities.qos.note = `QoS check failed: ${err.message}`;
  }
  try {
    await odlSync.findBrIntNodeId();
    capabilities.odlRestconf.available = true;
    capabilities.odlTopology.available = true;
    capabilities.flowEnforcement.available = true;
  } catch (_) {}
  res.json({ capabilities });
});

// ---- Priority -> guaranteed bandwidth floor (fraction of per-VM ceiling) ----
const PRIORITY_MIN_BANDWIDTH_FRACTION = { HIGH: 0.8, MEDIUM: 0.5, LOW: 0 };
// ---- Latency requirement -> DSCP marking value (46 = Expedited Forwarding) ----
const LATENCY_DSCP_VALUE = { LOW: 46, STANDARD: 0 };

function parseRateToKbps(str) {
  if (!str) return null;
  const m = String(str).match(/([\d.]+)\s*(kbps|mbps|gbps)/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "gbps") return Math.round(num * 1_000_000);
  if (unit === "mbps") return Math.round(num * 1_000);
  return Math.round(num);
}

app.get("/api/slices/:id/violations", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });

    if (slice.isolation_level !== "STRICT") {
      return res.json({
        supported: false,
        reason: "Violation monitoring requires STRICT isolation (explicit deny flows carry OVS packet counters). STANDARD slices rely on implicit default-deny, which OVS does not count.",
        violations: [],
      });
    }

    const { stdout } = await execAsync(
      `sudo ovs-ofctl -O OpenFlow13 dump-flows br-int table=250`,
    );
    const lines = stdout.split("\n").filter((l) => l.includes("priority=700") && l.includes("actions=drop"));

    const violations = lines.map((line) => {
      const ipMatch = line.match(/nw_src=([\d.]+)/);
      const pktMatch = line.match(/n_packets=(\d+)/);
      const byteMatch = line.match(/n_bytes=(\d+)/);
      return {
        blockedSourceIp: ipMatch ? ipMatch[1] : null,
        blockedPacketCount: pktMatch ? parseInt(pktMatch[1]) : 0,
        blockedByteCount: byteMatch ? parseInt(byteMatch[1]) : 0,
      };
    });

    const totalBlockedPackets = violations.reduce((sum, v) => sum + v.blockedPacketCount, 0);

    res.json({
      supported: true,
      sliceId: slice.id,
      sliceName: slice.name,
      totalBlockedPackets,
      violations,
      note: "Packet/byte counts are read live from OVS's own per-flow statistics (ovs-ofctl dump-flows) for this slice's explicit STRICT deny rules — real traffic attempts that were actually dropped by the switch, not simulated.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/:id/recompute-bandwidth", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });
    if (!slice.qos_policy_id) {
      return res.status(400).json({ error: "This slice has no QoS policy to recompute (creation may have failed)." });
    }

    const declaredMatch = String(slice.bandwidth_max || "").match(/[\d.]+/);
    const declaredMbps = declaredMatch ? parseFloat(declaredMatch[0]) : 0;
    if (!declaredMbps) {
      return res.status(400).json({ error: "Could not parse this slice's declared bandwidth_max." });
    }

    const vmIds = JSON.parse(slice.vm_ids || "[]");
    const vmCount = Math.max(vmIds.length, 1);
    const newPerVmMbps = declaredMbps / vmCount;
    const newMaxKbps = Math.round(newPerVmMbps * 1000);
    const previousPerVmMbps = slice.per_vm_mbps || declaredMbps;

    if (slice.bandwidth_limit_rule_id) {
      await osJson(
        `${NEUTRON_URL}/qos/policies/${slice.qos_policy_id}/bandwidth_limit_rules/${slice.bandwidth_limit_rule_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bandwidth_limit_rule: {
              max_kbps: newMaxKbps,
              max_burst_kbps: Math.round(newMaxKbps * 0.125),
            },
          }),
        },
      );
    }

    if (slice.minimum_bandwidth_rule_id) {
      const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[slice.priority || "MEDIUM"] ?? 0.5;
      const newMinKbps = Math.round(newMaxKbps * priorityFraction);
      await osJson(
        `${NEUTRON_URL}/qos/policies/${slice.qos_policy_id}/minimum_bandwidth_rules/${slice.minimum_bandwidth_rule_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minimum_bandwidth_rule: { min_kbps: newMinKbps },
          }),
        },
      );
    }

    db.prepare(
      "UPDATE slices SET per_vm_mbps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(newPerVmMbps, slice.id);

    res.json({
      sliceId: slice.id,
      vmCount,
      declaredTotalMbps: declaredMbps,
      previousPerVmMbps,
      newPerVmMbps,
      note: `Recomputed: ${vmCount} VM(s) now share ${declaredMbps} Mbps -> ${newPerVmMbps.toFixed(2)} Mbps each (was ${Number(previousPerVmMbps).toFixed(2)} Mbps each). Updated live on the existing Neutron QoS policy - all ports on this slice's network inherit the new rate immediately.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/:id/enforce-bandwidth", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });

    const rateKbps = parseRateToKbps(slice.bandwidth_max);
    if (!rateKbps) {
      return res.status(400).json({
        error: "Could not parse a bandwidth_max value for this slice (expected e.g. '500 Mbps').",
      });
    }

    const vmIds = JSON.parse(slice.vm_ids || "[]");
    if (vmIds.length === 0) {
      return res.status(400).json({ error: "Slice has no VMs assigned." });
    }

    const [serversData, portsData] = await Promise.all([
      osJson(`${NOVA_URL}/servers/detail`),
      osJson(`${NEUTRON_URL}/ports`),
    ]);
    const servers = (serversData.servers || []).filter((s) => vmIds.includes(s.id));
    const ports = portsData.ports || [];

    const results = [];
    let meterIdCounter = parseInt(slice.id.replace(/-/g, "").slice(0, 4), 16) % 6000 + 1000;

    for (const server of servers) {
      const port = ports.find((p) => p.device_id === server.id);
      const vmIp = port?.fixed_ips?.[0]?.ip_address;
      if (!vmIp) {
        results.push({ vmId: server.id, vmName: server.name, success: false, error: "No IP found" });
        continue;
      }
      try {
        const meterResult = await ovsDirect.enforceBandwidthDirect(vmIp, meterIdCounter++, rateKbps);
        if (!meterResult.success) {
          results.push({ vmId: server.id, vmName: server.name, vmIp, success: false, error: meterResult.error || meterResult.stderr });
        } else {
          results.push({ vmId: server.id, vmName: server.name, vmIp, success: true, ...meterResult });
        }
      } catch (err) {
        results.push({ vmId: server.id, vmName: server.name, vmIp, success: false, error: err.message });
      }
    }

    const allSucceeded = results.length > 0 && results.every((r) => r.success);
    // Enforced directly via ovs-ofctl (bypassing ODL's RESTCONF meter path, which
    // has a confirmed device-sync bug in this ODL build — see build report).
    // Verified reliable via direct ovs-ofctl testing before being wired in here.
    const qosStatus = allSucceeded
      ? "enforced (direct OVS meter, verified on device)"
      : results.some((r) => r.success)
      ? "partially enforced (direct OVS meter)"
      : "unsupported";

    db.prepare("UPDATE slices SET qos_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      qosStatus,
      slice.id,
    );

    res.json({
      qosStatus,
      rateKbps,
      results,
      note: "Enforced via a direct ovs-ofctl call to br-int (bypassing ODL's RESTCONF meter API, which showed a device-sync bug — a deserializer error in this ODL build's OpenFlow protocol layer — during earlier testing). Verified independently via 'ovs-ofctl dump-meters' / 'dump-flows br-int table=250', confirming the meter and matching flow genuinely exist on the switch with the correct rate. This is NOT Neutron QoS (confirmed unavailable in this DevStack) — it is real rate-limiting enforced directly at the OVS/OpenFlow layer.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slices/:id/enforce-isolation", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });

    const sgName = `slice-${slice.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${slice.id.slice(0, 8)}`;
    let securityGroupId = slice.security_group_id;
    let sgCreated = false;

    // 1. Create (or reuse) a dedicated Neutron security group for this slice
    if (!securityGroupId) {
      try {
        const sgData = await osJson(`${NEUTRON_URL}/security-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            security_group: {
              name: sgName,
              description: `Isolation boundary for slice: ${slice.name} (level: ${slice.isolation_level})`,
            },
          }),
        });
        securityGroupId = sgData.security_group.id;
        sgCreated = true;
      } catch (sgErr) {
        return res.status(500).json({
          error: "Failed to create isolation security group",
          details: sgErr.message,
        });
      }
    }

    // 2. Push a tagging shadow flow into ODL for this slice (builds on existing sync service)
    let odlResult = null;
    let odlError = null;
    try {
      odlResult = await odlSync.pushSecurityRuleShadow({
        protocol: "TCP",
        port: "0",
        destination: `slice-${slice.id.slice(0, 8)}`,
      });
    } catch (err) {
      odlError = err.message;
    }

    // 3. Add a self-referencing rule so VMs WITHIN the slice can still talk to each other
    //    (a fresh security group denies all ingress by default in OpenStack)
    if (sgCreated) {
      try {
        await osJson(`${NEUTRON_URL}/security-group-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            security_group_rule: {
              security_group_id: securityGroupId,
              direction: "ingress",
              ethertype: "IPv4",
              remote_group_id: securityGroupId,
            },
          }),
        });
      } catch (ruleErr) {
        console.error("Slice self-rule creation (non-fatal):", ruleErr.message);
      }
    }

    // 4. Attach the security group to each VM port in the slice (ADDS isolation,
    //    does not remove existing default security groups)
    const vmIds = JSON.parse(slice.vm_ids || "[]");
    const attachResults = [];
    if (vmIds.length > 0) {
      try {
        const portsData = await osJson(`${NEUTRON_URL}/ports`);
        const slicePorts = (portsData.ports || []).filter(
          (p) => vmIds.includes(p.device_id) && p.device_owner === "compute:nova",
        );
        for (const port of slicePorts) {
          try {
            const currentGroups = port.security_groups || [];
            if (!currentGroups.includes(securityGroupId)) {
              await osJson(`${NEUTRON_URL}/ports/${port.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  port: { security_groups: [...currentGroups, securityGroupId] },
                }),
              });
            }
            attachResults.push({ portId: port.id, deviceId: port.device_id, attached: true });
          } catch (attachErr) {
            attachResults.push({ portId: port.id, deviceId: port.device_id, attached: false, error: attachErr.message });
          }
        }
      } catch (portsErr) {
        console.error("Port lookup for isolation attach (non-fatal):", portsErr.message);
      }
    }

    const allAttached = attachResults.length > 0 && attachResults.every((r) => r.attached);
    let isolationStatus = allAttached ? "enforced" : securityGroupId ? "configured" : "not_configured";

    // STRICT slices get a SECOND, independent enforcement layer: explicit DROP
    // flows on br-int blocking traffic from every OTHER slice's VM IPs. This is
    // real defense-in-depth — Neutron security groups only support ALLOW rules
    // (implicit default-deny), so this adds a genuine explicit-deny mechanism
    // at the SDN layer that STANDARD slices do not get.
    const denyFlowResults = [];
    if (slice.isolation_level === "STRICT") {
      try {
        const ownVmIds = new Set(vmIds);
        const allSlices = db.prepare("SELECT * FROM slices WHERE id != ?").all(slice.id);
        const otherVmIds = [
          ...new Set(allSlices.flatMap((s) => JSON.parse(s.vm_ids || "[]"))),
        ].filter((id) => !ownVmIds.has(id)); // never block this slice's own VMs
        if (otherVmIds.length > 0) {
          const portsData = await osJson(`${NEUTRON_URL}/ports`);
          const otherPorts = (portsData.ports || []).filter(
            (p) => otherVmIds.includes(p.device_id) && p.device_owner === "compute:nova",
          );
          for (const p of otherPorts) {
            const ip = p.fixed_ips?.[0]?.ip_address;
            if (!ip) continue;
            const result = await ovsDirect.pushDenyFlow(ip);
            denyFlowResults.push({ blockedIp: ip, deviceId: p.device_id, ...result });
          }
        }
        if (denyFlowResults.length === 0 || denyFlowResults.every((r) => r.success)) {
          isolationStatus = allAttached ? "enforced (STRICT: security group + explicit deny flows)" : isolationStatus;
        }
      } catch (denyErr) {
        console.error("STRICT deny-flow enforcement (non-fatal):", denyErr.message);
      }
    }

    db.prepare(
      "UPDATE slices SET security_group_id = ?, isolation_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(securityGroupId, isolationStatus, slice.id);

    res.json({
      isolationStatus,
      securityGroupId,
      securityGroupName: sgName,
      securityGroupCreated: sgCreated,
      vmPortsAttached: attachResults,
      strictDenyFlows: slice.isolation_level === "STRICT" ? denyFlowResults : null,
      odlShadowFlow: odlResult,
      odlSyncError: odlError,
      note:
        slice.isolation_level === "STRICT"
          ? "STRICT isolation: (1) dedicated Neutron security group attached to each slice VM's port (allow-only, implicit default-deny), PLUS (2) explicit DROP flows on br-int blocking traffic from every other slice's VM IPs — a second, independent enforcement layer verified directly on OVS. STANDARD slices only get layer (1)."
          : "STANDARD isolation enforced via a dedicated Neutron security group attached to each slice VM's port (real OpenStack enforcement, additive to existing security groups, relies on implicit default-deny). ODL shadow flow tags slice traffic for observability.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/slices/:id/topology", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });
    const vmIds = JSON.parse(slice.vm_ids || "[]");

    const [serversData, portsData] = await Promise.all([
      osJson(`${NOVA_URL}/servers/detail`),
      osJson(`${NEUTRON_URL}/ports`),
    ]);
    const servers = (serversData.servers || []).filter((s) => vmIds.includes(s.id));
    const ports = (portsData.ports || []).filter((p) => p.device_owner === "compute:nova");

    let odlConnectors = [];
    let brIntNodeId = null;
    try {
      brIntNodeId = await odlSync.findBrIntNodeId();
      const odlRes = await fetch(
        `http://localhost:8181/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(brIntNodeId)}?content=nonconfig`,
        {
          headers: {
            Authorization: "Basic " + Buffer.from("admin:admin").toString("base64"),
            Accept: "application/json",
          },
        },
      );
      if (odlRes.ok) {
        const odlData = await odlRes.json();
        const node = odlData["opendaylight-inventory:node"]?.[0];
        odlConnectors = node?.["node-connector"] || [];
      }
    } catch (_) {}

    const topology = servers.map((server) => {
      const port = ports.find((p) => p.device_id === server.id);
      const tapName = port ? `tap${port.id.slice(0, 11)}` : null;
      const connector = tapName
        ? odlConnectors.find((nc) => nc["flow-node-inventory:name"] === tapName)
        : null;
      return {
        vmId: server.id,
        vmName: server.name,
        vmStatus: server.status,
        ipAddress: port?.fixed_ips?.[0]?.ip_address || null,
        ovsInterface: tapName,
        odlNodeConnectorId: connector?.id || null,
        odlVisible: !!connector,
      };
    });

    res.json({
      sliceId: slice.id,
      sliceName: slice.name,
      brIntNodeId,
      sharedSwitch: "br-int (shared with all OpenStack tenants)",
      topology,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/openstack/odl-sync-status", async (req, res) => {
  try {
    const nodeId = await odlSync.findBrIntNodeId();
    const flows = await odlSync.listShadowFlows();
    res.json({ connected: true, nodeId, shadowFlowCount: flows.length, flows });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get("/api/openstack/acl-list/:logicalSwitch", async (req, res) => {
  let logicalSwitch = req.params.logicalSwitch;

  if (!logicalSwitch) {
    return res.status(400).json({ error: "Logical switch is required." });
  }

  try {
    if (!logicalSwitch.startsWith("neutron-")) {
      const network = await findNetwork(logicalSwitch);
      logicalSwitch = `neutron-${network.id}`;
    }
  } catch (error) {
    return res
      .status(404)
      .json({
        error: `Could not resolve network name ${logicalSwitch} to OVN logical switch.`,
      });
  }

  execFile(
    "sudo",
    ["-n", "ovn-nbctl", "acl-list", logicalSwitch],
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          error: stderr || error.message,
          message: "Failed to verify ACLs (OVN permission or switch mismatch).",
          available: false,
        });
      }

      let acls = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      // If no ACLs on the switch directly, query all ACLs (as OpenStack uses Port Groups)
      if (acls.length === 0) {
        execFile(
          "sudo",
          ["-n", "ovn-nbctl", "list", "acl"],
          (err2, stdout2) => {
            if (!err2 && stdout2) {
              acls = stdout2
                .split("\n")
                .filter(
                  (line) =>
                    line.includes("match") ||
                    line.includes("action") ||
                    line.includes("direction"),
                )
                .map((line) => line.trim())
                .slice(0, 15); // limit output to keep it readable

              if (acls.length > 0) {
                acls.unshift("--- Port Group ACLs found in OVN DB ---");
              }
            }
            res.json({ logicalSwitch, acls, available: true });
          },
        );
        return;
      }

      res.json({ logicalSwitch, acls, available: true });
    },
  );
});

/* =========================
   CREATE INSTANCE
   ========================= */
app.post(["/api/openstack/create-vm", "/api/openstack/launch-instance"], async (req, res) => {
  let { name, flavor, image, network } = req.body;
  if (!name) {
    return res.status(400).json({ error: "VM name is required." });
  }

  try {
    const flavorsData = await osJson(`${NOVA_URL}/flavors/detail`);
    let flavorObj;
    if (!flavor || flavor === "Auto-select Smallest Flavor") {
      flavorObj = (flavorsData.flavors || []).sort((a, b) => a.ram - b.ram)[0];
    } else {
      flavorObj = (flavorsData.flavors || []).find((f) => f.name === flavor || f.id === flavor);
    }
    if (!flavorObj) return res.status(400).json({ error: `Flavor not found: ${flavor}` });

    // Real hypervisor capacity check (RAM, vCPU, and disk)
    try {
      const hvData = await osJson(`${NOVA_URL}/os-hypervisors/statistics`);
      const stats = hvData.hypervisor_statistics || {};
      const remainingRamMb = stats.memory_mb - stats.memory_mb_used;
      const remainingVcpus = stats.vcpus - stats.vcpus_used;
      const remainingDiskGb = stats.free_disk_gb ?? (stats.local_gb - stats.local_gb_used);
      const neededRamMb = flavorObj.ram || 0;
      const neededVcpus = flavorObj.vcpus || 0;
      const neededDiskGb = flavorObj.disk || 0;
      if (neededRamMb > remainingRamMb || neededVcpus > remainingVcpus || (neededDiskGb > 0 && neededDiskGb > remainingDiskGb)) {
        return res.status(409).json({
          error: `Insufficient hypervisor capacity. Flavor requires ${neededRamMb}MB RAM, ${neededVcpus} vCPU, ${neededDiskGb}GB disk, but hypervisor has ${remainingRamMb}MB RAM, ${remainingVcpus} vCPU, ${remainingDiskGb}GB disk free.`,
        });
      }
    } catch (capErr) {
      console.error("Capacity check (non-fatal):", capErr.message);
    }

    const imagesData = await osJson(`${GLANCE_URL}/images`);
    let imageObj;
    if (!image || image === "Auto-select Active Image") {
      imageObj = (imagesData.images || []).find((img) => img.status === "active");
    } else {
      imageObj = (imagesData.images || []).find((img) => img.name === image || img.id === image);
    }
    if (!imageObj) return res.status(400).json({ error: `Image not found: ${image}` });

    const networksData = await osJson(`${NEUTRON_URL}/networks`);
    const currentProjectId = tokenCache.projectId;
    const accessibleNets = (networksData.networks || []).filter(
      (n) => n.shared || (currentProjectId ? n.project_id === currentProjectId : true)
    );
    let networkObj;
    if (!network || network === "Auto-select Private Network") {
      networkObj = accessibleNets.find((n) => !n["router:external"]) || accessibleNets[0];
    } else {
      networkObj = (networksData.networks || []).find((n) => n.name === network || n.id === network);
    }
    if (!networkObj) return res.status(400).json({ error: `Network not found: ${network}` });

    if (!networkObj.shared && currentProjectId && networkObj.project_id !== currentProjectId) {
      return res.status(400).json({
        error: `Network "${network}" belongs to another project and is not shared.`,
      });
    }

    const serverBody = {
      server: {
        name,
        flavorRef: flavorObj.id,
        imageRef: imageObj.id,
        networks: [{ uuid: networkObj.id }],
      },
    };

    const created = await osJson(`${NOVA_URL}/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverBody),
    });

    res.json({
      success: true,
      server: created.server,
      message: `Instance "${name}" created successfully.`,
    });
  } catch (error) {
    console.error("[Create VM] Error:", error.message);
    res.status(500).json({ error: error.message || "Failed to create VM" });
  }
});

/* =========================
   VM CONSOLE ACCESS (noVNC)
   ========================= */
app.get("/api/openstack/console/:serverId", async (req, res) => {
  const { serverId } = req.params;
  if (!serverId) {
    return res.status(400).json({ error: "Server ID is required." });
  }

  try {
    // 1. Try modern Nova 2.6+ remote-consoles API
    try {
      const consoleData = await osJson(`${NOVA_URL}/servers/${serverId}/remote-consoles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "OpenStack-API-Version": "compute 2.6",
        },
        body: JSON.stringify({
          remote_console: { protocol: "vnc", type: "novnc" },
        }),
      });

      if (consoleData?.remote_console?.url) {
        return res.json({
          success: true,
          url: consoleData.remote_console.url,
        });
      }
    } catch (modernErr) {
      console.warn(
        `[Console] Modern Nova remote-consoles API failed for ${serverId} (${modernErr.message}), trying legacy os-getVNCConsole fallback...`
      );
    }

    // 2. Fallback: Classic os-getVNCConsole action API
    const legacyData = await osJson(`${NOVA_URL}/servers/${serverId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "os-getVNCConsole": { type: "novnc" },
      }),
    });

    if (legacyData?.console?.url) {
      return res.json({
        success: true,
        url: legacyData.console.url,
      });
    }

    throw new Error("No VNC console URL returned by OpenStack Nova");
  } catch (error) {
    console.error(`[Console] Error fetching console for server ${serverId}:`, error.message);
    res.status(500).json({ error: error.message || "Failed to get console URL" });
  }
});

/* =========================
   VM INSTANCE ACTIONS (Start / Stop / Reboot)
   ========================= */
app.post("/api/openstack/servers/:id/action", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  let body = {};
  if (action === "start") body = { "os-start": null };
  else if (action === "stop") body = { "os-stop": null };
  else if (action === "reboot") body = { reboot: { type: "SOFT" } };
  else if (typeof action === "object") body = action;
  else body = { [action]: null };

  try {
    await osJson(`${NOVA_URL}/servers/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    res.json({ success: true, message: `Action "${action}" sent to instance.` });
  } catch (error) {
    console.error(`[VM Action] Failed to execute ${action} on ${id}:`, error.message);
    res.status(500).json({ error: error.message || `Failed to execute action ${action}` });
  }
});

/* =========================
   FIX: ADD MISSING /api/openstack/create-network ENDPOINT
   ========================= */
app.post("/api/openstack/create-network", async (req, res) => {
  const { name, cidr, segmentation } = req.body;

  if (!name || !cidr) {
    return res.status(400).json({ error: "name and cidr are required." });
  }

  try {
    // Create network (let Neutron auto-assign type based on tenant config)
    const networkBody = {
      network: {
        name,
        admin_state_up: true,
      },
    };

    const createdNetwork = await osJson(`${NEUTRON_URL}/networks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(networkBody),
    });

    const networkId = createdNetwork.network.id;

    // Create subnet
    const subnetBody = {
      subnet: {
        network_id: networkId,
        ip_version: 4,
        cidr,
        name: `${name}-subnet`,
      },
    };

    const createdSubnet = await osJson(`${NEUTRON_URL}/subnets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subnetBody),
    });

    res.json({
      success: true,
      network: createdNetwork.network,
      subnet: createdSubnet.subnet,
      message: `Network "${name}" created successfully.`,
    });
  } catch (error) {
    console.error("Create network error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create network" });
  }
});

app.delete("/api/openstack/networks/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "network id is required." });
  }

  try {
    await osJson(`${NEUTRON_URL}/networks/${id}`, {
      method: "DELETE",
    });

    res.json({
      success: true,
      message: `Network deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete network error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete network" });
  }
});

/* =========================
   IMAGE EXPLORER — Glance image management
   ========================= */

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function detectOs(image) {
  const haystack = `${image.name || ""} ${image.os_distro || ""} ${image.os_type || ""}`.toLowerCase();
  if (haystack.includes("windows") || haystack.includes("win")) return "windows";
  if (
    haystack.includes("linux") ||
    haystack.includes("ubuntu") ||
    haystack.includes("centos") ||
    haystack.includes("cirros") ||
    haystack.includes("alpine") ||
    haystack.includes("debian") ||
    haystack.includes("fedora") ||
    haystack.includes("rhel")
  )
    return "linux";
  return "unknown";
}

function shapeImage(img) {
  return {
    id: img.id,
    name: img.name || "(unnamed)",
    os: detectOs(img),
    os_distro: img.os_distro || null,
    disk_format: img.disk_format || "unknown",
    container_format: img.container_format || "unknown",
    size_bytes: img.size || 0,
    size_human: humanSize(img.size),
    visibility: img.visibility || "private",
    status: img.status || "unknown",
    protected: !!img.protected,
    created_at: img.created_at || null,
    updated_at: img.updated_at || null,
    owner: img.owner || null,
    tags: img.tags || [],
    min_disk: img.min_disk || 0,
    min_ram: img.min_ram || 0,
    checksum: img.checksum || null,
    bootable: ["active"].includes(img.status) && !!img.disk_format,
    properties: img,
  };
}

app.get("/api/glance/images", async (req, res) => {
  try {
    const data = await osJson(`${GLANCE_URL}/images?limit=1000`);
    const images = (data.images || []).map(shapeImage);
    res.json({ images });
  } catch (error) {
    console.error("List images error:", error);
    res.status(500).json({ error: error.message || "Failed to list images" });
  }
});

app.get("/api/glance/images/stats", async (req, res) => {
  try {
    const data = await osJson(`${GLANCE_URL}/images?limit=1000`);
    const images = data.images || [];
    const totalStorage = images.reduce((sum, img) => sum + (img.size || 0), 0);
    res.json({
      total: images.length,
      public: images.filter((i) => i.visibility === "public").length,
      private: images.filter((i) => i.visibility === "private").length,
      shared: images.filter((i) => i.visibility === "shared").length,
      community: images.filter((i) => i.visibility === "community").length,
      total_storage_bytes: totalStorage,
      total_storage_human: humanSize(totalStorage),
    });
  } catch (error) {
    console.error("Image stats error:", error);
    res.status(500).json({ error: error.message || "Failed to load image stats" });
  }
});

app.get("/api/glance/images/:id", async (req, res) => {
  try {
    const img = await osJson(`${GLANCE_URL}/images/${req.params.id}`);
    res.json(shapeImage(img));
  } catch (error) {
    console.error("Image details error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch image details" });
  }
});

app.get("/api/glance/images/:id/download", async (req, res) => {
  try {
    const response = await osFetch(`${GLANCE_URL}/images/${req.params.id}/file`, {
      method: "GET",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Glance download failed ${response.status}: ${text}`);
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.img"`);
    response.body.pipe(res);
  } catch (error) {
    console.error("Image download error:", error);
    res.status(500).json({ error: error.message || "Failed to download image" });
  }
});

app.post("/api/glance/images/upload", upload.single("file"), async (req, res) => {
  const { name, disk_format, container_format, visibility, protected: isProtected, min_ram, min_disk, tags } = req.body;

  if (!name || !disk_format || !container_format || !req.file) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "name, disk_format, container_format, and file are required." });
  }

  try {
    const createBody = {
      name,
      disk_format,
      container_format,
      visibility: visibility || "private",
      protected: isProtected === "true" || isProtected === true,
    };
    if (min_ram) createBody.min_ram = parseInt(min_ram, 10);
    if (min_disk) createBody.min_disk = parseInt(min_disk, 10);
    if (tags) {
      createBody.tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const created = await osJson(`${GLANCE_URL}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createBody),
    });

    const fileStream = fs.createReadStream(req.file.path);
    const stat = fs.statSync(req.file.path);

    await osJson(`${GLANCE_URL}/images/${created.id}/file`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": stat.size,
      },
      body: fileStream,
      duplex: "half",
    });

    fs.unlink(req.file.path, () => {});

    res.json({ success: true, image: shapeImage(created), message: `Image "${name}" uploaded successfully.` });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error("Image upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload image" });
  }
});

app.delete("/api/glance/images/:id", async (req, res) => {
  try {
    await osJson(`${GLANCE_URL}/images/${req.params.id}`, { method: "DELETE" });
    res.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ error: error.message || "Failed to delete image" });
  }
});

app.post("/api/glance/images/:id/refresh", async (req, res) => {
  try {
    const img = await osJson(`${GLANCE_URL}/images/${req.params.id}`);
    res.json({ success: true, image: shapeImage(img) });
  } catch (error) {
    console.error("Refresh image metadata error:", error);
    res.status(500).json({ error: error.message || "Failed to refresh image metadata" });
  }
});


app.delete(["/api/openstack/vms/:id", "/api/openstack/delete-vm/:id"], async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "instance id is required." });
  }

  try {
    await osJson(`${NOVA_URL}/servers/${id}`, {
      method: "DELETE",
    });

    res.json({
      success: true,
      message: `Instance deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete VM error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete instance" });
  }
});

/* =========================
   FIX: ADD MISSING /api/openstack/launch-instance ENDPOINT
   (Same as create-vm but named differently for the Launch Instance modal)
   ========================= */
app.post("/api/openstack/launch-instance", async (req, res) => {
  const { name, flavor, image, network } = req.body;

  if (!name || !flavor || !image || !network) {
    return res
      .status(400)
      .json({ error: "name, flavor, image, and network are required." });
  }

  try {
    const flavorsData = await osJson(`${NOVA_URL}/flavors`);
    const flavorObj = (flavorsData.flavors || []).find(
      (f) => f.name === flavor || f.id === flavor,
    );
    if (!flavorObj) {
      return res.status(400).json({ error: `Flavor not found: ${flavor}` });
    }

    // Real capacity check — compare flavor RAM/vCPU against genuinely
    // remaining hypervisor capacity, read live from OpenStack hardware accounting.
    try {
      const flavorDetail = await osJson(`${NOVA_URL}/flavors/${flavorObj.id}`);
      const neededRamMb = flavorDetail.flavor?.ram || 0;
      const neededVcpus = flavorDetail.flavor?.vcpus || 0;
      const hvData = await osJson(`${NOVA_URL}/os-hypervisors/statistics`);
      const stats = hvData.hypervisor_statistics || {};
      const remainingRamMb = stats.memory_mb - stats.memory_mb_used;
      const remainingVcpus = stats.vcpus - stats.vcpus_used;
      if (neededRamMb > remainingRamMb || neededVcpus > remainingVcpus) {
        return res.status(409).json({
          error: "Insufficient real compute capacity to create this VM.",
          requested: { ramMb: neededRamMb, vcpus: neededVcpus },
          available: { ramMb: remainingRamMb, vcpus: remainingVcpus },
          note: "Checked against OpenStack live hypervisor statistics.",
        });
      }
    } catch (capErr) {
      console.error("Capacity check (non-fatal):", capErr.message);
    }

    const imagesData = await osJson(
      `${GLANCE_URL}/images?name=${encodeURIComponent(image)}`,
    );
    const imageObj = (imagesData.images || [])[0];
    if (!imageObj) {
      return res.status(400).json({ error: `Image not found: ${image}` });
    }

    const networksData = await osJson(
      `${NEUTRON_URL}/networks?name=${encodeURIComponent(network)}`,
    );
    const networkObj = (networksData.networks || [])[0];
    if (!networkObj) {
      return res.status(400).json({ error: `Network not found: ${network}` });
    }

    const serverBody = {
      server: {
        name,
        flavorRef: flavorObj.id,
        imageRef: imageObj.id,
        networks: [{ uuid: networkObj.id }],
      },
    };

    const created = await osJson(`${NOVA_URL}/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverBody),
    });

    res.json({
      success: true,
      server: created.server,
      message: `Instance "${name}" launched successfully.`,
    });
  } catch (error) {
    console.error("Launch instance error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to launch instance" });
  }
});

/* =========================
   AUTO-DETECT WSL IP: If KEYSTONE_URL uses 127.0.0.1 and is unreachable from Windows,
   automatically discover the WSL IP via `wsl hostname -I`.
   ========================= */
async function resolveKeystoneUrl() {
  // If URL already has a non-loopback IP, use it as-is
  if (!KEYSTONE_URL.includes("127.0.0.1") && !KEYSTONE_URL.includes("localhost")) {
    return;
  }

  // Try reaching the current KEYSTONE_URL first
  try {
    const probe = await fetch(KEYSTONE_URL, { signal: AbortSignal.timeout(3000) });
    if (probe.ok || probe.status < 500) {
      console.log(`  ✓ Keystone reachable at ${KEYSTONE_URL}`);
      return; // already working, no change needed
    }
  } catch (_) {
    // unreachable — try WSL auto-detection
  }

  console.log("  ⚠ 127.0.0.1 not reachable. Attempting WSL IP auto-detection...");
  try {
    const wslIp = await new Promise((resolve, reject) => {
      execFile("wsl", ["hostname", "-I"], { timeout: 6000 }, (err, stdout) => {
        if (err) return reject(err);
        const ip = stdout.trim().split(/\s+/)[0];
        if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) resolve(ip);
        else reject(new Error(`Unexpected output: ${stdout.trim()}`));
      });
    });
    KEYSTONE_URL = KEYSTONE_URL.replace("127.0.0.1", wslIp).replace("localhost", wslIp);
    console.log(`  ✓ WSL IP auto-detected: ${wslIp}`);
    console.log(`  ✓ Updated KEYSTONE_URL: ${KEYSTONE_URL}`);
  } catch (wslErr) {
    console.warn(`  ⚠ WSL IP auto-detection failed: ${wslErr.message}`);
    console.warn("  → Set KEYSTONE_URL manually in .env to your WSL IP");
  }
}

/* ==========================================
   SDN TLS CONFIGURATION ROUTES (NORTHBOUND & SOUTHBOUND)
   ========================================== */

app.get(["/api/tls/status", "/api/openstack/tls/status"], async (req, res) => {
  const controller = (req.query.controller || "onos").toLowerCase();

  try {
    if (controller === "onos") {
      const containerName = process.env.ONOS_CONTAINER_NAME || "onos-2.7";
      const internalEtc = process.env.ONOS_INTERNAL_ETC || "/root/onos/apache-karaf-4.2.9/etc";
      const ofFileName = "org.onosproject.openflow.controller.impl.OpenFlowControllerImpl.cfg";
      const logFile = path.posix.join(internalEtc, "..", "data", "log", "karaf.log");

      // 1. Check Southbound status (OpenFlow 6653)
      let isSouthbound = false;
      const logCmd = `docker exec ${containerName} sh -c "grep -o 'TlsParams{tlsMode=[a-z]*' ${logFile} | tail -1"`;
      try {
        const { stdout: logOut } = await execAsync(logCmd);
        const m = (logOut || "").match(/tlsMode=(\w+)/);
        if (m) {
          isSouthbound = m[1] !== "disabled";
        } else {
          const { stdout: cfgOut } = await execAsync(`docker exec ${containerName} cat ${internalEtc}/${ofFileName}`);
          isSouthbound = /tlsMode\s*=\s*(strict|enabled)/.test(cfgOut);
        }
      } catch (_) {}

      return res.json({
        controller: "onos",
        isEnabled: isSouthbound,
        southbound: isSouthbound,
      });

    } else if (controller === "odl") {
      const vmUser = process.env.VM_USER || os.userInfo().username;
      const rawEtcPath = process.env.ODL_ETC_PATH || `/home/${vmUser}/karaf-0.23.0/etc`;
      const odlEtcPath = resolvePortablePath(rawEtcPath);
      const ofPluginPath = path.join(odlEtcPath, "org.opendaylight.openflowplugin.cfg");

      let isSouthbound = false;
      if (fs.existsSync(ofPluginPath)) {
        const content = fs.readFileSync(ofPluginPath, "utf8");
        isSouthbound =
          content.includes("use-transport-tls=true") || content.includes("transport-protocol=TLS");
      }

      return res.json({
        controller: "odl",
        isEnabled: isSouthbound,
        southbound: isSouthbound,
      });
    } else {
      return res.status(400).json({ error: "Unsupported controller. Choose 'odl' or 'onos'." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read configuration status.", details: error.message });
  }
});

// ONOS can take 2-3 minutes (container restart), which browsers/proxies drop as a
// "Network Error". So ONOS toggles run as a background job the UI polls for the result.
const tlsJobs = {};

// Unified Toggle Route (Handles both Northbound and Southbound)
app.post(["/api/tls/toggle", "/api/openstack/tls/toggle"], async (req, res) => {
  const { controller, enable } = req.body;
  if (!controller || typeof enable !== "boolean") {
    return res
      .status(400)
      .json({ error: "Invalid request. 'controller' and boolean 'enable' required." });
  }

  const target = controller.toLowerCase();

  // Route 2: Southbound (Port 6653)
  try {
    if (target === "odl") {
      await updateOdlTlsConfig(enable);
      return res.json({
        success: true,
        message: `ODL Southbound TLS is now ${enable ? "ENABLED" : "DISABLED"}`,
      });
    } else if (target === "onos") {
      if (tlsJobs.onos?.state === "running") {
        return res.status(202).json({ success: true, pending: true, message: "ONOS update already running." });
      }
      tlsJobs.onos = { state: "running", enable, message: "", startedAt: Date.now() };
      updateOnosTlsConfig(enable)
        .then(() => {
          tlsJobs.onos = {
            ...tlsJobs.onos,
            state: "done",
            message: `ONOS Southbound TLS is now ${enable ? "ENABLED" : "DISABLED"}`,
          };
        })
        .catch((err) => {
          console.error("[TLS Toggle Error]", err.message);
          tlsJobs.onos = { ...tlsJobs.onos, state: "error", message: err.message };
        });
      return res.status(202).json({ success: true, pending: true });
    } else {
      return res.status(400).json({ error: "TLS orchestration is only supported for ODL or ONOS." });
    }
  } catch (error) {
    console.error("[TLS Toggle Error]", error.message);
    res
      .status(500)
      .json({ error: "Failed to update controller configuration.", details: error.message });
  }
});

app.get("/api/tls/job", (req, res) => {
  const target = String(req.query.controller || "").toLowerCase();
  res.json(tlsJobs[target] || { state: "idle" });
});

const bootstrap = async () => {
  console.log("--- BEGINNING LEARNING PHASE (SERVICE DISCOVERY) ---");

  // Auto-detect WSL IP if server.js is running on Windows and DevStack is in WSL
  await resolveKeystoneUrl();

  try {
    // Calling getToken forces the backend to query Keystone and learn the dynamic IPs
    await getToken();
    console.log("--- LEARNING PHASE COMPLETE: STARTING APIS ---");
    console.log(`LEARNED IP ADDRESSES:`);
    console.log(`  Keystone (Registry): ${KEYSTONE_URL}`);
    console.log(`  Neutron  (Network):  ${NEUTRON_URL}`);
    console.log(`  Nova     (Compute):  ${NOVA_URL}`);
    console.log(`  Glance   (Image):    ${GLANCE_URL}`);
  } catch (error) {
    console.error(
      "Warning: Failed to learn OpenStack environment addresses at startup:",
      error.message,
    );
    console.error(
      "The backend will still start, but OpenStack API calls may fail until Keystone is reachable.",
    );
  }


// ---------------------------------------------------------------------------
// Persistence reconciliation loop
// ---------------------------------------------------------------------------
// Addresses the review gap: OpenFlow rules and tc/HTB queue config are not
// persistent across OVS/Neutron restarts, br-int rebuilds, or VM migration
// (confirmed directly: an unrelated `mn -c` wiped br-int and silently reset
// both demo ports to OVN's linux-noop QoS default, with no automatic
// recovery until a human noticed and manually re-triggered
// enforceDualQueueDirect). This loop makes that recovery automatic by
// periodically re-checking drift and self-healing it, reusing the exact
// same enforcement functions the PUT /api/slices/:id handler already calls
// on manual edits - just on a timer instead of waiting for a human.
const RECONCILE_INTERVAL_MS = 30000;

async function reconcileSlicePersistence() {
  try {
    const activeSlices = db.prepare("SELECT * FROM slices WHERE status = 'ACTIVE'").all();
    if (activeSlices.length === 0) return;

    const [serversData, portsData] = await Promise.all([
      osJson(`${NOVA_URL}/servers/detail`),
      osJson(`${NEUTRON_URL}/ports`),
    ]);
    const servers = serversData.servers || [];
    const ports = portsData.ports || [];

    for (const slice of activeSlices) {
      const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[slice.priority || "MEDIUM"] ?? 0.5;
      const needsFastLane = (slice.latency_requirement || "STANDARD") === "LOW";
      if (priorityFraction === 0 && !needsFastLane) continue; // nothing to reconcile for this slice

      const vmIds = JSON.parse(slice.vm_ids || "[]");
      if (vmIds.length === 0) continue;

      const perVm = slice.per_vm_mbps || parseFloat(String(slice.bandwidth_max).match(/[\d.]+/)?.[0] || "0");
      const maxKbps = Math.round(perVm * 1000);
      const fastLaneKbps = Math.round(maxKbps * priorityFraction);
      const standardMinKbps = Math.round(maxKbps * 0.1);

      for (const vmId of vmIds) {
        const server = servers.find((s) => s.id === vmId);
        if (!server) continue;
        const port = ports.find((p) => p.device_id === server.id);
        if (!port) continue;
        const ifaceName = `tap${port.id.slice(0, 11)}`;

        const status = await ovsDirect.isQueueConfigured(ifaceName);
        if (status.configured) continue; // already correct, don't touch it

        console.warn(
          `[reconcile] Drift detected on ${ifaceName} (slice "${slice.name}"): ${status.reason}. Re-applying...`
        );
        const result = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);
        if (result.success) {
          console.log(`[reconcile] Restored queue config on ${ifaceName}`);
        } else {
          console.error(`[reconcile] Failed to restore ${ifaceName}:`, result);
        }
      }
    }

    // Same drift detection/self-healing for the PPS nftables rule. Separate
    // loop over the same activeSlices/servers/ports data already fetched
    // above - no extra API calls needed. Only slices that actually declared
    // a PPS cap are checked.
    for (const slice of activeSlices) {
      if (!slice.max_pps) continue;

      const vmIds = JSON.parse(slice.vm_ids || "[]");
      if (vmIds.length === 0) continue;

      const perVmPps = slice.max_pps / vmIds.length;

      for (const vmId of vmIds) {
        const server = servers.find((s) => s.id === vmId);
        if (!server) continue;
        const port = ports.find((p) => p.device_id === server.id && p.network_id === slice.network_id);
        if (!port) continue;
        const ifaceName = `tap${port.id.slice(0, 11)}`;

        const ppsStatus = await ovsDirect.isPpsConfigured(ifaceName);
        if (ppsStatus.configured) continue; // already correct, don't touch it

        console.warn(
          `[reconcile] PPS drift detected on ${ifaceName} (slice "${slice.name}"): ${ppsStatus.reason}. Re-applying...`
        );
        const ppsResult = await ovsDirect.enforcePpsLimitDirect(ifaceName, Math.round(perVmPps));
        if (ppsResult.success) {
          console.log(`[reconcile] Restored PPS rule on ${ifaceName}`);
        } else {
          console.error(`[reconcile] Failed to restore PPS rule on ${ifaceName}:`, ppsResult);
        }
      }
    }
  } catch (err) {
    console.error("[reconcile] Reconciliation pass failed:", err.message);
  }
}

setInterval(reconcileSlicePersistence, RECONCILE_INTERVAL_MS);
console.log(`Persistence reconciliation loop started (every ${RECONCILE_INTERVAL_MS / 1000}s)`);
  // Start Background Pollers for LinkGuard
  startPolling(server);

  // Start Digest Cron Scheduler
  registerDigestJobs(onosClient);

  server.listen(port, () => {
    console.log(`\nDashboard backend + Sockets + Cron scheduler listening on Port ${port}`);
  });
};

bootstrap();
