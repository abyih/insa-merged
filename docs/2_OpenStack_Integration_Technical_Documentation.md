# OpenStack Integration — Technical Documentation
## Integration with OpenDaylight (ODL) and ONOS Controllers

> **Project**: INSA SDN Dashboard
> **Subsystem**: Cloud Infrastructure Integration

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Environment Setup](#2-environment-setup)
3. [ODL–OpenStack Integration](#3-odl-openstack-integration)
4. [ONOS–OpenStack/Mininet Integration](#4-onos-openstackmininet-integration)
5. [Implementation Details](#5-implementation-details)
6. [Limitations](#6-limitations)

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
```

---

## 2. Environment Setup

### OpenStack (DevStack) Setup

| Component | Version/Configuration |
|-----------|----------------------|
| **DevStack** | Latest stable branch |
| **Keystone** | v3 Identity API |
| **Neutron** | ML2/OVN driver |
| **Nova** | Compute API v2.1 |
| **Glance** | Image API v2 |

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

#### Environment Variables (`.env` for ODL integration):

```bash
KEYSTONE_URL=http://<devstack-ip>:5000/v3
NEUTRON_URL=http://<devstack-ip>:9696/v2.0
NOVA_URL=http://<devstack-ip>:8774/v2.1
GLANCE_URL=http://<devstack-ip>:9292/v2
OS_USERNAME=admin
OS_PASSWORD=secret
OS_PROJECT_NAME=admin
OS_USER_DOMAIN_NAME=default
OS_PROJECT_DOMAIN_NAME=default
```

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

ONOS environment (from `.env`):
```
ONOS_URL=http://localhost:8181
ONOS_USERNAME=onos
ONOS_PASSWORD=rocks
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

Environment variables for Mininet SSH:
```
MININET_HOST=192.168.122.88
MININET_USER=mininet
MININET_SSH_KEY=/home/<user>/.ssh/id_main
```

### Node.js Setup

```bash
# Install Node.js dependencies
npm install

# Key dependencies:
# express ^4.21.2 — Backend API server
# axios ^1.7.9 — HTTP client for OpenStack APIs
# cors ^2.8.5 — Cross-origin resource sharing
# better-sqlite3 ^13.0.3 — SQLite for slice persistence
# dotenv ^17.4.2 — Environment variable loading
```

---

## 3. ODL–OpenStack Integration

### Dynamic Service Discovery (`server.js`)

The server implements **automatic Keystone-based service discovery**. On first token request:

1. Authenticates with Keystone using password credentials
2. Parses the service catalog from the token response
3. **Dynamically learns** the URLs for Nova, Neutron, and Glance from the catalog endpoints
4. If Keystone is on localhost, rewrites remote service URLs to use localhost hostname

```javascript
const getToken = async () => {
    // POST to Keystone /auth/tokens with password credentials
    // Extract x-subject-token header
    // Parse service catalog from response body
    // Dynamically resolve Nova, Neutron, Glance URLs
    // Cache token until expiry (with 30s buffer)
};
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

## 4. ONOS–OpenStack/Mininet Integration

### ONOS REST API Proxy (`server-onos.js`)

All ONOS API calls are proxied through an authenticated helper:

```javascript
const onosFetch = async (apiPath, options = {}) => {
    const headers = {
        Authorization: "Basic " + Buffer.from("onos:rocks").toString("base64"),
        Accept: "application/json",
    };
    return fetch(`${ONOS_URL}${apiPath}`, { ...options, headers, signal: AbortSignal.timeout(5000) });
};
```

### ONOS Summary Endpoint (`server-onos.js`)

The `/api/onos/summary` endpoint aggregates:
- ONOS hosts → Discovered hosts with IP, MAC, VLAN, location
- ONOS devices → OpenFlow switches with availability status
- ONOS links → Inter-switch connections
- ONOS flows → Installed flow rules
- ONOS meters → Active bandwidth meters
- ONOS cluster → Controller cluster node info

### Mininet SSH Command Execution (`server-onos.js`)

Commands are executed inside the Mininet VM via SSH:

```javascript
async function runMininetCmd(command, timeout = 30000) {
    if (MININET_HOST !== "localhost") {
        const sshCmd = `ssh -i "${MININET_SSH_KEY}" -o StrictHostKeyChecking=no ${MININET_USER}@${MININET_HOST} '${command}'`;
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

### Vite Proxy Configuration (`vite.config.js`)

The frontend proxy routes requests to the correct backend:

| Frontend Path | Backend Target | Purpose |
|---------------|---------------|---------|
| `/api/rests/*` | ODL `:8181` | ODL RESTCONF (RFC 8040) |
| `/api/restconf/*` | ODL `:8181` | ODL Legacy RESTCONF |
| `/api/onos/v1/*` | ONOS `:8181` | Direct ONOS REST API |
| `/api/onos/slices/*` | `server-onos.js :5001` | Slice persistence |
| `/api/onos/verify/*` | `server-onos.js :5001` | Live verification tests |
| `/api/onos/qos/*` | `server-onos.js :5001` | QoS management |
| `/api/openstack/*` | `server.js :5000` | OpenStack proxy |

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
                                                            └── Cache token + expiry
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

### Bootstrap & Service Discovery Flow

```javascript
const bootstrap = async () => {
    // 1. Authenticate with Keystone
    await getToken();
    // 2. Service catalog is parsed, URLs are learned
    // 3. Start Socket.io polling for LinkGuard
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

## 6. Limitations

1. **DevStack Dependency**: The integration is tested against DevStack, not production OpenStack. DevStack uses default configurations that may differ significantly from production deployments.

2. **Single-Project Scope**: All API calls authenticate as a single project (`admin`). Multi-tenant isolation is not implemented.

3. **No Persistent Token Storage**: Tokens are cached in-memory only. Server restart requires re-authentication.

4. **Service Discovery Locality Assumption**: If Keystone is on localhost, all service URLs are rewritten to localhost. This breaks in multi-node deployments where services run on different hosts.

5. **OVN Health Check Requires Sudo**: The `ovn-nbctl show` command requires sudo privileges on the backend server host, which may not be available in containerized deployments.

6. **No WebSocket Push for OpenStack Events**: The OpenStack integration is polling-based (frontend refreshes). Nova/Neutron event notifications (via message queue) are not consumed.

7. **SSH Key Hardcoded Path**: The Mininet SSH key path defaults to `~/.ssh/id_main`, which is specific to the developer's setup.

8. **No TLS/HTTPS for OpenStack APIs**: All OpenStack API communication uses plain HTTP. The TLS toggle endpoints exist in commented-out code but are not active.

9. **Limited Error Propagation**: OpenStack API errors are wrapped in generic error messages. Neutron quota violations, flavor constraints, and image compatibility issues are not surfaced clearly.

10. **No Live ODL–OpenStack Data Plane Correlation**: While the server connects to both ODL and OpenStack, there is no mechanism to correlate ODL flow data with OpenStack Neutron ports in real-time.
