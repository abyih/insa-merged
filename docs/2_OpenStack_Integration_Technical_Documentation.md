# OpenStack Integration — Technical Documentation
## Integration with OpenDaylight (ODL) and ONOS Controllers

> **Project**: INSA SDN Dashboard
> **Subsystem**: Cloud Infrastructure Integration

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Environment Setup](#2-environment-setup)
3. [ODL-OpenStack Integration](#3-odl-openstack-integration)
4. [ONOS-OpenStack/Mininet Integration](#4-onos-openstackmininet-integration)
5. [Implementation Details](#5-implementation-details)
6. [Challenges and Solutions](#6-challenges-and-solutions)
7. [Limitations](#7-limitations)

---

## 1. Overview & Architecture

The project integrates with OpenStack cloud infrastructure through two SDN controllers:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                          │
│                     Cloud.jsx  |  Topology Pages                        │
└──────────┬──────────────────────────────┬────────────────────────────────┘
           │ :5173 proxy                  │ :5173 proxy
┌──────────▼──────────────┐    ┌──────────▼─────────────────┐
│  server.js (port 5000)  │    │  server-onos.js (port 5001)│
│  ──────────────────     │    │  ─────────────────────     │
│  Keystone Auth (v3)     │    │  ONOS REST API Proxy      │
│  Service Discovery      │    │  Mininet SSH Execution     │
│  Nova (Compute)         │    │  OVS Queue Management      │
│  Neutron (Network)      │    │  SQLite Slice Persistence  │
│  Glance (Image)         │    │  Live Verification Tests   │
│  OVN Infrastructure     │    │  Intent Service Proxy      │
│  ODL HTTPS RESTCONF     │    │                            │
│  LinkGuard (Socket.IO)  │    │                            │
│  User Authentication    │    │                            │
└──────────┬──────────────┘    └──────────┬─────────────────┘
           │                              │
┌──────────▼──────────────┐    ┌──────────▼─────────────────┐
│  DevStack / OpenStack   │    │  ONOS Controller           │
│  ──────────────────     │    │  Mininet VM (SSH)          │
│  Keystone (Identity)    │    │  Open vSwitch (OVS)        │
│  Neutron  (Networking)  │    │                            │
│  Nova     (Compute)     │    │                            │
│  Glance   (Image)       │    │                            │
└─────────────────────────┘    └────────────────────────────┘
           │
┌──────────▼──────────────┐
│  ODL Controller         │
│  (HTTPS port 8443)      │
│  RESTCONF API           │
└─────────────────────────┘
```

### Process Stability

Both backend servers install global handlers to prevent process crashes from network failures:

```javascript
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
});
```

This ensures that transient network errors (e.g., OpenStack API timeouts, SSH connection failures) are logged but do not terminate the server processes.

---

## 2. Environment Setup

### Prerequisites

| Component | Version / Platform | Purpose |
|-----------|-------------------|---------|
| **Operating System** | Linux (Ubuntu 26.04 LTS) | Host operating system |
| **DevStack** | Latest stable branch | OpenStack single-node development deployment |
| **Keystone** | v3 Identity API | Authentication and service catalog |
| **Neutron** | ML2/OVN driver | Network virtualization and OpenFlow routing |
| **Nova** | Compute API v2.1 | Virtual machine lifecycle management |
| **Glance** | Image API v2 | Virtual machine image repository |

#### DevStack Installation (on a dedicated VM or bare metal):

```bash
# 1. Create stack user
sudo useradd -s /bin/bash -d /opt/stack -m stack
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo -u stack -i

# 2. Clone DevStack
git clone https://opendev.org/openstack/devstack
cd devstack

# 3. Create local.conf
cat > local.conf <<EOF
[[local|localrc]]
ADMIN_PASSWORD=secret
DATABASE_PASSWORD=$ADMIN_PASSWORD
RABBIT_PASSWORD=$ADMIN_PASSWORD
SERVICE_PASSWORD=$ADMIN_PASSWORD
HOST_IP=<your-ip>
EOF

# 4. Run DevStack
./stack.sh
```

#### Environment Variables (`.env` file in project root)

The `.env` file configures all backend service connections. Below is the complete variable reference:

**OpenStack / DevStack Variables:**

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `KEYSTONE_URL` | `http://192.168.122.156/identity/v3` | Keystone Identity API v3 endpoint |
| `OS_USERNAME` | `admin` | OpenStack authentication username |
| `OS_PASSWORD` | `123456` | OpenStack authentication password |
| `OS_PROJECT_NAME` | `admin` | OpenStack project/tenant name |
| `OS_USER_DOMAIN_NAME` | `default` | Keystone user domain |
| `OS_PROJECT_DOMAIN_NAME` | `default` | Keystone project domain |
| `PORT` | `5000` | Backend server port for `server.js` |

> **Note**: `NEUTRON_URL`, `NOVA_URL`, and `GLANCE_URL` are intentionally **not** required in `.env`. These are automatically discovered from the Keystone service catalog at authentication time (see [Dynamic Service Discovery](#dynamic-service-discovery-serverjs)).

**ONOS Controller Variables:**

| Variable | Example Value | Purpose |
|----------|---------------|---------|
| `ONOS_URL` | `http://localhost:8181` | ONOS REST API base URL |
| `ONOS_USERNAME` | `onos` | ONOS authentication username |
| `ONOS_PASSWORD` | `rocks` | ONOS authentication password |

**Mininet SSH Variables:**

| Variable | Default Value | Purpose |
|----------|---------------|---------|
| `MININET_HOST` | `192.168.122.88` | Mininet VM IP address |
| `MININET_USER` | `mininet` | SSH username on Mininet VM |
| `MININET_SSH_KEY` | `~/.ssh/id_main` | Path to SSH private key |

**Optional Variables:**

| Variable | Purpose |
|----------|---------|
| `ONOS_SERVER_PORT` | Override ONOS backend port (default: 5001) |
| `INTENT_SERVICE_URL` | Override intent service URL (default: `http://127.0.0.1:5005`) |
| `SMTP_EMAIL` | Gmail address for alert emails |
| `SMTP_APP_PASSWORD` | Gmail app password for alert emails |
| `ALERT_EMAIL` | Recipient address for security alerts |
| `VITE_ODL_HOST` | Override ODL target for Vite proxy (default: `http://localhost:8181`) |

### ONOS Setup

```bash
# Option 1: Docker (recommended)
docker run -d --name onos \
  -p 8181:8181 -p 6653:6653 -p 8101:8101 \
  onosproject/onos:2.7.0

# Option 2: From source
git clone https://gerrit.onosproject.org/onos
cd onos
bazel build onos
```

Activate required ONOS apps:
```bash
# Via ONOS CLI (port 8101, user: onos, password: rocks)
app activate org.onosproject.openflow
app activate org.onosproject.fwd
app activate org.onosproject.ofagent
```

### Mininet VM Setup (for ONOS integration)

```bash
# Install Mininet
sudo apt-get install mininet

# Or download the Mininet VM image
# Configure SSH access from the host
ssh-keygen -t rsa -f ~/.ssh/id_main
ssh-copy-id -i ~/.ssh/id_main mininet@<mininet-vm-ip>
```

### Node.js Setup

```bash
# Install Node.js dependencies
npm install

# Key dependencies:
# express ^4.21.2 — Backend API server
# axios ^1.7.9 — HTTP client for OpenStack APIs
# cors ^2.8.5 — Cross-origin resource sharing
# better-sqlite3 ^13.0.3 — SQLite for slice and user persistence
# dotenv ^17.4.2 — Environment variable loading
# bcryptjs ^3.0.3 — Password hashing for user authentication
# jsonwebtoken ^9.0.3 — JWT token generation
# socket.io ^4.8.3 — Real-time WebSocket communication (LinkGuard)
# nodemailer ^10.0.10 — Email alert notifications
```

### Available npm Scripts

| Script | Command | Services Started |
|--------|---------|-----------------|
| `npm run server` | `node --watch server.js` | DevStack/ODL backend server only (port 5000) |
| `npm run server:onos` | `node --watch server-onos.js` | ONOS backend server only (port 5001) |
| `npm run server:all` | `concurrently` | Both server.js and server-onos.js |
| `npm run all` | `concurrently` | Vite frontend + DevStack server |
| `npm run all:full` | `concurrently` | Vite frontend + both servers |
| `npm run all:onos` | `concurrently` | Vite frontend + ONOS server |
| `npm run all:onos:intent` | `concurrently` | Vite frontend + ONOS server + Intent service |
| `npm run services` | `concurrently` | Both servers + RF detector + IF detector + Intent service |
| `npm run all:services` | `concurrently` | All services + Vite frontend |
| `npm run dev` | `vite` | Frontend dev server only (port 5173) |

---

## 3. ODL-OpenStack Integration

### ODL HTTPS Communication (`server.js`)

The ODL Potassium release uses **HTTPS** (port 8443) by default. The `server.js` backend communicates with ODL via a dedicated `odlRequest()` helper:

```javascript
const ODL_HOST = "localhost";
const ODL_PORT = 8443;
const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");

function odlRequest(reqPath, method = "GET", body = null) {
    const req = https.request({
        hostname: ODL_HOST,
        port: ODL_PORT,
        path: reqPath,
        method,
        rejectUnauthorized: false,  // Accept self-signed TLS certificates
        headers: {
            Authorization: ODL_AUTH,
            "Content-Type": "application/json",
        },
    }, callback);
}
```

**Key implementation detail**: The `rejectUnauthorized: false` option is required because ODL Potassium ships with self-signed TLS certificates. Without this setting, Node.js rejects the connection.

### Dynamic Service Discovery (`server.js`)

The server implements **automatic Keystone-based service discovery**. On first token request:

1. Authenticates with Keystone using password credentials
2. Parses the service catalog from the token response
3. **Dynamically learns** the URLs for Nova, Neutron, and Glance from the catalog endpoints
4. If Keystone is on localhost, rewrites remote service URLs to use localhost hostname

**Keystone Authentication Payload**:

```json
{
  "auth": {
    "identity": {
      "methods": ["password"],
      "password": {
        "user": {
          "name": "<OS_USERNAME>",
          "password": "<OS_PASSWORD>",
          "domain": { "name": "<OS_USER_DOMAIN_NAME>" }
        }
      }
    },
    "scope": {
      "project": {
        "name": "<OS_PROJECT_NAME>",
        "domain": { "name": "<OS_PROJECT_DOMAIN_NAME>" }
      }
    }
  }
}
```

**Service Discovery Algorithm**:

```
POST to KEYSTONE_URL/auth/tokens
  → Extract x-subject-token header (the token itself)
  → Parse token.catalog from JSON body
  → For each service type (compute, network, image):
       → Find the "public" interface endpoint (or first available)
       → If Keystone is on localhost:
            → Rewrite the endpoint's hostname to match Keystone's hostname
            → (e.g., http://172.24.4.2:8774 → http://localhost:8774)
       → For Neutron: ensure URL ends with /v2.0
       → For Glance: ensure URL ends with /v2
  → Cache token with expiry time
```

### Token Caching

Tokens are cached with their expiry time. A new token is only requested when the cached token will expire within 30 seconds:

```javascript
let tokenCache = { token: null, expiresAt: 0 };
// Reuse if: tokenCache.expiresAt > Date.now() + 30000
```

### OpenStack API Proxying

All OpenStack API calls go through authenticated helper functions:

```javascript
const osFetch = async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, { headers: { "X-Auth-Token": token } });
};

const osJson = async (url, options = {}) => {
    const response = await osFetch(url, options);
    return response.json();
};
```

### Implemented OpenStack Operations

| Endpoint | Method | Operation |
|----------|--------|-----------|
| `/api/openstack/ping` | GET | Diagnostic: test Keystone connectivity, show discovered service URLs |
| `/api/openstack/cloud-summary` | GET | Full dashboard: instances, networks, routers, ports, subnets, security rules |
| `/api/openstack/console/:serverId` | GET | noVNC console URL (Nova 2.6+ with legacy fallback) |
| `/api/openstack/servers/:id/action` | POST | Start / Stop / Reboot instances |
| `/api/openstack/vms/:id` | DELETE | Delete instances |
| `/api/openstack/create-vm` | POST | Create instances (with flavor, image, network resolution) |
| `/api/openstack/create-network` | POST | Create networks with auto-subnet |

### Cloud Summary Data Enrichment (`server.js`)

The `/api/openstack/cloud-summary` endpoint aggregates data from multiple OpenStack APIs:

1. **Nova** `/servers/detail` — All instances with full details
2. **Neutron** `/networks` — OVN logical switches
3. **Neutron** `/routers` — Virtual routers
4. **Neutron** `/ports` — Port bindings (maps instances to networks)
5. **Neutron** `/subnets` — CIDR and IP pool information
6. **Neutron** `/security-group-rules` — Security policy rules
7. **OVN** `ovn-nbctl show` — Infrastructure health check

Virtual machines are enriched with:
- IP address (from port fixed_ips or server addresses)
- Network name
- Availability zone
- Logical port and logical switch (Neutron port → `neutron-<network_id>`)

### User Authentication System (`server.js`)

The backend includes a user authentication system backed by SQLite:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | `better-sqlite3` (`users.db`) | User storage |
| **Password hashing** | `bcryptjs` | Secure password storage |
| **Login endpoint** | `POST /api/login` | Username/password authentication |
| **Failed login alerts** | `nodemailer` | Email notification on failed attempts |

```
POST /api/login { "username": "...", "password": "..." }
  → Look up user in SQLite
  → bcrypt.compare(password, password_hash)
  → Success: { success: true }
  → Failure: Send alert email + { success: false }
```

### LinkGuard Real-Time Monitoring (`server.js`)

The server integrates a **LinkGuard** module that provides real-time network security monitoring via Socket.IO:

```javascript
import linkguardRouter, { startPolling } from "./linkguard.js";

// Mount LinkGuard routes under /api/security
app.use("/api/security", linkguardRouter);

// Start polling once Keystone is authenticated
const bootstrap = async () => {
    await getToken();
    startPolling(server);
    server.listen(port);
};
```

LinkGuard polls the SDN topology periodically and pushes updates to connected frontend clients via WebSocket, enabling real-time topology change detection and security event notifications.

### Infrastructure Health Check (`server.js`)

```javascript
async function checkInfrastructureStatus() {
    // 1. Test Neutron API connectivity
    await osJson(`${NEUTRON_URL}/networks?limit=1`);
    
    // 2. Test OVN NB/SB database connectivity
    execFile("sudo", ["ovn-nbctl", "show"], ...);
}
```

---

## 4. ONOS-OpenStack/Mininet Integration

### ONOS REST API Proxy (`server-onos.js`)

All ONOS API calls are proxied through an authenticated helper:

```javascript
const onosFetch = async (apiPath, options = {}) => {
    const headers = {
        Authorization: "Basic " + Buffer.from("onos:rocks").toString("base64"),
        Accept: "application/json",
    };
    return fetch(`${ONOS_URL}${apiPath}`, {
        ...options, headers,
        signal: AbortSignal.timeout(5000)
    });
};
```

The `AbortSignal.timeout(5000)` ensures that slow or unreachable ONOS queries are terminated after 5 seconds, preventing indefinite hangs.

### ONOS Summary Endpoint (`server-onos.js`)

The `/api/onos/summary` endpoint aggregates:
- ONOS hosts → Discovered hosts with IP, MAC, VLAN, location
- ONOS devices → OpenFlow switches with availability status
- ONOS links → Inter-switch connections
- ONOS flows → Installed flow rules
- ONOS meters → Active bandwidth meters
- ONOS cluster → Controller cluster node info

### Mininet SSH Command Execution (`server-onos.js`)

Commands are executed inside the Mininet VM via SSH. The SSH configuration supports both remote and local Mininet installations:

```javascript
const MININET_HOST = process.env.MININET_HOST || "192.168.122.88";
const MININET_USER = process.env.MININET_USER || "mininet";
const MININET_SSH_KEY = process.env.MININET_SSH_KEY
    || path.join(process.env.HOME, ".ssh", "id_main");

async function runMininetCmd(command, timeout = 30000) {
    if (MININET_HOST !== "localhost" && MININET_HOST !== "127.0.0.1") {
        const sshCmd = `ssh -i "${MININET_SSH_KEY}" \
            -o StrictHostKeyChecking=no \
            -o LogLevel=ERROR \
            -o ConnectTimeout=5 \
            ${MININET_USER}@${MININET_HOST} '${command}'`;
        return execPromise(sshCmd, { timeout });
    }
    return execPromise(command, { timeout });
}
```

For host-namespace commands (ping, iperf inside Mininet hosts):

```javascript
async function execInHost(hostname, command, timeout = 30000) {
    const pid = await findHostPid(hostname);  // pgrep -f "mininet:h1"
    return runMininetCmd(`sudo mnexec -a ${pid} ${command}`, timeout);
}
```

### Intent Service Proxy (`server-onos.js`)

The ONOS backend server proxies requests to the local Neural Intent Service (port 5005):

| Endpoint | Backend Target | Timeout |
|----------|---------------|---------|
| `GET /api/onos/intent/health` | `GET http://127.0.0.1:5005/health` | 3s |
| `POST /api/onos/intent/compile` | `POST http://127.0.0.1:5005/compile` | 8s |

If the intent service is unreachable, the proxy returns HTTP 503 with a hint message suggesting the startup command.

### QoS Management Endpoints (`server-onos.js`)

| Endpoint | Method | Operation |
|----------|--------|-----------|
| `POST /api/onos/qos/setup` | POST | Run QoS setup script on Mininet VM (supports `ports` array or `--auto`) |
| `GET /api/onos/qos/status` | GET | Query OVS QoS configuration via `ovs-vsctl list qos` |

### Vite Proxy Configuration (`vite.config.js`)

The frontend proxy routes requests to the correct backend. The complete proxy routing table:

| Frontend Path | Backend Target | Timeout | Purpose |
|---------------|---------------|---------|---------|
| `/api/rests/*` | ODL `:8181` | 5s | ODL RESTCONF (RFC 8040) |
| `/api/restconf/*` | ODL `:8181` | 5s | ODL Legacy RESTCONF |
| `/api/onos/slices/*` | `server-onos.js :5001` | 10s | ONOS slice persistence |
| `/api/onos/intent/*` | `server-onos.js :5001` | 10s | Neural intent service proxy |
| `/api/onos/qos/*` | `server-onos.js :5001` | 10s | QoS management |
| `/api/onos/summary` | `server-onos.js :5001` | 10s | ONOS topology summary |
| `/api/onos/verify/*` | `server-onos.js :5001` | 30s | Live verification tests |
| `/api/onos-service/*` | `server-onos.js :5001` | 10s | Rewrites to `/api/onos/*` |
| `/api/onos/*` | ONOS `:8181` | 5s | Direct ONOS REST API (with Basic Auth injection) |
| `/api/openstack/*` | `server.js :5000` | 15s | OpenStack proxy |
| `/api/slices/*` | `server.js :5000` | 60s | OpenStack slice management |
| `/api/slice-manager/*` | `server.js :5000` | 15s | Slice manager operations |
| `/api/settings/*` | `server.js :5000` | 15s | Application settings |
| `/api/glance/*` | `server.js :5000` | 30s | Glance image API |
| `/api/tls/*` | `server.js :5000` | 15s | TLS configuration |
| `/api/security/*` | `server.js :5000` | 15s | LinkGuard security (WebSocket) |
| `/api/login` | `server.js :5000` | 10s | User authentication |

**Proxy Details**:
- ODL and direct ONOS proxies strip the `www-authenticate` header from responses to prevent browser authentication popups
- The ONOS direct proxy (`/api/onos/*`) injects Basic Auth credentials automatically
- The OpenStack proxy includes error handling that returns HTTP 502 with a JSON error if the backend is restarting

### Dual-Controller Auto-Detection (`api-controller.js`)

The frontend automatically detects whether ONOS or ODL is the active controller:

```javascript
async function detectController() {
    try {
        const res = await onosApi.get("/devices");
        if (res.data?.devices) return "onos";
    } catch { /* not ONOS */ }
    return "odl";
}
```

This allows the frontend to adapt its API calls, component rendering, and feature availability based on which controller is online.

---

## 5. Implementation Details

### Token Lifecycle

```
[Frontend Request] → [server.js] → getToken()
                                     ├── Cache valid? → Return cached token
                                     └── Cache expired? → POST to Keystone
                                                            ├── Get x-subject-token header
                                                            ├── Parse service catalog
                                                            ├── Learn Nova/Neutron/Glance URLs
                                                            ├── Cache token + expiry + projectId
                                                            └── Return token
```

### VM Console Access (noVNC)

Two methods are tried in sequence:
1. **Modern API** (Nova 2.6+): `POST /servers/{id}/remote-consoles` with `OpenStack-API-Version: compute 2.6`
2. **Legacy Fallback**: `POST /servers/{id}/action` with `os-getVNCConsole`

### SQLite Persistence for ONOS Slices

`server-onos.js` uses `better-sqlite3` for persistent slice storage:

```sql
CREATE TABLE onos_slices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slice_type TEXT,
    color TEXT,
    vlan_id INTEGER,
    bandwidth_kbps INTEGER,
    burst_kbps INTEGER,
    hosts TEXT,          -- JSON array
    status TEXT DEFAULT 'ACTIVE',
    meter_ids TEXT,      -- JSON object
    flow_rule_ids TEXT,  -- JSON array
    priority INTEGER DEFAULT 40000,
    created_at TEXT,
    updated_at TEXT
);
```

### SQLite Persistence for OpenStack Slices

`server.js` uses a separate `slices` table for OpenStack-based network slicing:

```sql
CREATE TABLE slices (
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
    allocated_mbps REAL DEFAULT 0,
    color TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Slice Manager Configuration

```sql
CREATE TABLE slice_manager_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_capacity_mbps REAL NOT NULL DEFAULT 1000,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Bootstrap & Service Discovery Flow

```javascript
const bootstrap = async () => {
    // 1. Authenticate with Keystone
    await getToken();
    // 2. Service catalog is parsed, URLs are learned
    // 3. Start Socket.IO polling for LinkGuard
    startPolling(server);
    // 4. Listen on port 5000
    server.listen(port);
};
```

### OpenStack API Call Flow

```
Frontend → Vite Proxy (:5173) → server.js (:5000) → getToken() → Keystone
                                                   → osFetch(url) → Nova/Neutron/Glance
                                                   → response → Frontend
```

---

## 6. Challenges and Solutions

This section documents the key engineering challenges encountered during development and the solutions implemented to address them.

### 6.1 Keystone Service Catalog URL Locality

**Challenge**: When DevStack runs on a virtual machine (e.g., `192.168.122.156`) but the dashboard server accesses Keystone via port forwarding or a localhost tunnel, the Keystone service catalog returns service URLs with the VM's internal IP (e.g., `http://172.24.4.2:8774`). These internal addresses are unreachable from the dashboard server.

**Solution**: Automatic URL rewriting was implemented in the `getToken()` function. After parsing the service catalog, the function checks whether `KEYSTONE_URL` points to localhost. If so, it rewrites the hostname of all discovered service URLs (Nova, Neutron, Glance) to match the Keystone hostname. For example, `http://172.24.4.2:8774` becomes `http://localhost:8774`. This ensures all API calls use routable addresses.

### 6.2 DevStack Token Expiry

**Challenge**: Keystone tokens have a limited lifetime (typically 1 hour in default DevStack configuration). Making an API call with an expired token returns HTTP 401, breaking the dashboard.

**Solution**: Token caching with a 30-second safety buffer was implemented. Before each API call, `getToken()` checks whether the cached token's `expiresAt` timestamp is more than 30 seconds in the future. If not, a new token is requested. The buffer prevents race conditions where a token expires between the validity check and the actual API call.

### 6.3 ODL Self-Signed TLS Certificates

**Challenge**: ODL Potassium uses HTTPS by default (port 8443) with self-signed TLS certificates. Node.js rejects HTTPS connections to servers with untrusted certificates, making all ODL API calls fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

**Solution**: The `odlRequest()` function configures `rejectUnauthorized: false` in the `https.request()` options. This instructs Node.js to accept self-signed certificates. While this bypasses certificate validation, it is acceptable for lab environments where ODL runs on localhost or a trusted internal network.

### 6.4 noVNC Console API Version Fragmentation

**Challenge**: Nova API versions ≥2.6 introduced a new remote consoles endpoint (`POST /servers/{id}/remote-consoles`), but older versions only support the legacy `os-getVNCConsole` action. Targeting only one version breaks compatibility with the other.

**Solution**: A try-catch fallback strategy was implemented. The system first attempts the modern API with the `OpenStack-API-Version: compute 2.6` header. If this fails (e.g., on older Nova deployments), it automatically falls back to the legacy `os-getVNCConsole` action endpoint.

### 6.5 ONOS REST API Timeouts on Large Topologies

**Challenge**: Some ONOS REST API queries (particularly flow rule enumeration on large topologies) take longer than the default HTTP timeout, causing the dashboard to show stale data or errors.

**Solution**: `AbortSignal.timeout(5000)` was added to all ONOS REST API calls via the `onosFetch()` helper. This provides a deterministic 5-second timeout with graceful degradation — if a query times out, the error is caught and an appropriate error response is returned to the frontend rather than hanging indefinitely.

### 6.6 Process Stability Under Network Failures

**Challenge**: Unhandled promise rejections from failed HTTP calls (e.g., DevStack VM offline, ONOS unreachable) crash the Node.js process, requiring manual restart of the backend server.

**Solution**: Global `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers were installed on both `server.js` and `server-onos.js`. These handlers log the error but allow the process to continue running. This is critical for development and demo environments where network connectivity is intermittent.

### 6.7 Dynamic Service URL Discovery vs. Static Configuration

**Challenge**: OpenStack service URLs change depending on the deployment (single-node DevStack, multi-node deployment, port-forwarded access). Hardcoding service URLs in configuration files requires manual updates for every environment change.

**Solution**: A fully dynamic service discovery approach was adopted. Instead of requiring `NOVA_URL`, `NEUTRON_URL`, and `GLANCE_URL` in the `.env` file, only `KEYSTONE_URL` is required. All other service URLs are automatically parsed from the Keystone service catalog on first authentication. The system additionally appends required API version paths (e.g., `/v2.0` for Neutron, `/v2` for Glance) if not already present.

### 6.8 SSH Command Escaping for Remote Mininet Execution

**Challenge**: Executing commands inside Mininet host network namespaces requires chaining SSH, `sudo`, and `mnexec` with proper argument escaping. Special characters in commands (especially single quotes) break the SSH command string.

**Solution**: The `runMininetCmd()` function escapes single quotes in the command using `command.replace(/'/g, "'\\''")` before wrapping the command in a single-quoted SSH argument. Additional SSH options (`-o StrictHostKeyChecking=no -o LogLevel=ERROR -o ConnectTimeout=5`) suppress interactive prompts and set a connection timeout.

---

## 7. Limitations

1. **DevStack Dependency**: The integration is tested against DevStack, not production OpenStack. DevStack uses default configurations that may differ significantly from production deployments.

2. **Single-Project Scope**: All API calls authenticate as a single project (`admin`). Multi-tenant isolation is not implemented.

3. **No Persistent Token Storage**: Tokens are cached in-memory only. Server restart requires re-authentication.

4. **Service Discovery Locality Assumption**: If Keystone is on localhost, all service URLs are rewritten to localhost. This breaks in multi-node deployments where services run on different hosts.

5. **OVN Health Check Requires Sudo**: The `ovn-nbctl show` command requires sudo privileges on the backend server host, which may not be available in containerized deployments.

6. **No WebSocket Push for OpenStack Events**: The OpenStack integration is polling-based (frontend refreshes). Nova/Neutron event notifications (via message queue) are not consumed.

7. **SSH Key Hardcoded Path**: The Mininet SSH key path defaults to `~/.ssh/id_main`, which is specific to the development environment. Different deployments must set `MININET_SSH_KEY` in `.env`.

8. **No TLS/HTTPS for OpenStack APIs**: All OpenStack API communication uses plain HTTP. TLS toggle endpoints exist in commented-out code but are not active.

9. **Limited Error Propagation**: OpenStack API errors are wrapped in generic error messages. Neutron quota violations, flavor constraints, and image compatibility issues are not surfaced clearly.

10. **No Live ODL–OpenStack Data Plane Correlation**: While the server connects to both ODL and OpenStack, there is no mechanism to correlate ODL flow data with OpenStack Neutron ports in real-time.

11. **ODL Certificate Validation Disabled**: The `rejectUnauthorized: false` setting accepts any TLS certificate from ODL, including potentially malicious ones. In production, proper certificate management should be configured.

12. **Email Alerts Require Gmail**: The alert email functionality depends on Gmail SMTP with app passwords. Alternative mail providers are not supported without code changes.

13. **Single Database File**: Both `server.js` and `server-onos.js` use the same `users.db` SQLite file. Concurrent write access from both processes is protected by SQLite's built-in locking, but high-write-throughput scenarios may encounter contention.
