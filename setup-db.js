import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("users.db");

// 1. Users table
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

// Default admin user: admin / admin
const existingAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!existingAdmin) {
  const adminHash = bcrypt.hashSync("admin", 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, email)
    VALUES (?, ?, ?, ?, ?)
  `).run("admin", adminHash, "admin", "System Administrator", "admin@pntc.local");
  console.log("Created default admin user 'admin' (password: admin).");
} else {
  console.log("Admin user 'admin' already exists.");
}

// Fallback user: insa / insa123
const existingInsa = db.prepare("SELECT * FROM users WHERE username = ?").get("insa");
if (!existingInsa) {
  const hash = bcrypt.hashSync("insa123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)").run(
    "insa",
    hash,
    "operator",
    "INSA Operator",
    "insa@pntc.local"
  );
  console.log("Created user 'insa' with hashed password.");
} else {
  console.log("User 'insa' already exists.");
}

// 2. OpenStack Slices table
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
    total_pps_capacity REAL DEFAULT 10000,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
db.prepare(
  `INSERT OR IGNORE INTO slice_manager_config (id, total_capacity_mbps, total_pps_capacity) VALUES (1, 1000, 10000)`
).run();

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

// 3. ONOS Slices table
db.exec(`
  CREATE TABLE IF NOT EXISTS onos_slices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slice_type TEXT,
    color TEXT,
    vlan_id INTEGER,
    bandwidth_kbps INTEGER,
    burst_kbps INTEGER,
    hosts TEXT,            -- JSON array of host objects
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

console.log("Database tables initialized successfully.");
db.close();

