# OpenStack Integration — Technical Documentation

## Integration with OpenDaylight (ODL) and ONOS Controllers

> **Project**: INSA SDN Dashboard  
> **Subsystem**: Cloud Infrastructure & Dual-Controller Integration

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)  
2. [Environment Setup](#2-environment-setup)  
3. [OpenStack Cloud Infrastructure Integration](#3-openstack-cloud-infrastructure-integration)  
4. [OpenStack Network Slicing & QoS Enforcement Pipeline](#4-openstack-network-slicing--qos-enforcement-pipeline)  
5. [OpenDaylight (ODL) SDN Integration](#5-opendaylight-odl-sdn-integration)  
6. [ONOS Controller & Remote Mininet Integration](#6-onos-controller--remote-mininet-integration)  
7. [Dual-Controller Architecture & Dynamic Switching](#7-dual-controller-architecture--dynamic-switching)  
8. [Backend API Reference](#8-backend-api-reference)  
9. [Challenges and Solutions](#9-challenges-and-solutions)  
10. [Limitations](#10-limitations)

---

## 1\. Overview & Architecture

The OpenStack subsystem provides cloud infrastructure management, network slicing, and SDN telemetry across two independent SDN controllers: **OpenDaylight (ODL Karaf 0.23.1 Vanadium)** and **ONOS (2.7.0)**. 

Because OpenStack's native networking (Neutron with OVN) operates alongside external SDN controllers, the architecture uses two dedicated Node.js backend middleware servers that bridge cloud resources, OpenFlow datapaths, and network emulation:

| Backend | File | Port | Core Responsibilities |
| :---- | :---- | :---- | :---- |
| **DevStack / ODL Backend** | `server.js` | 5000 | Keystone v3 dynamic discovery, Nova/Neutron/Glance API proxying, OVN infrastructure health, OpenStack network slicing (Security Groups + direct OVS QoS), ODL RESTCONF telemetry & Table 250 shadow flows |
| **ONOS Middleware Backend** | `server-onos.js` | 5001 | ONOS REST API proxying, remote Mininet SSH command execution, ONOS slice lifecycle & meter management, live in-namespace network verification (ping, iperf, queues), intent service proxy |

Both backends share a unified SQLite database (`users.db`) for user access and slice configuration persistence.

### Architectural Request Flow

The frontend never communicates directly with raw OpenStack service endpoints, ODL, or ONOS. All requests are routed through dedicated backend proxy pipelines or the Vite dev server proxy:

```
Frontend (React + Vite, port 5173)
    │
    ├── /api/openstack/*  ──► server.js (port 5000)      ──► Keystone / Nova / Neutron / Glance (DevStack)
    ├── /api/slices/*     ──► server.js (port 5000)      ──► SQLite (users.db) + br-int (ovsDirect) + ODL (Table 250)
    ├── /api/rests/*      ──► Vite Proxy (port 5173)     ──► ODL RESTCONF (port 8181)
    │
    ├── /api/onos/slices  ──► server-onos.js (port 5001) ──► SQLite (users.db)
    ├── /api/onos/verify  ──► server-onos.js (port 5001) ──► Mininet VM (SSH port 22 -> mnexec)
    └── /api/onos/*       ──► server-onos.js / Vite      ──► ONOS REST API (port 8181)
```

### Process Stability

Both middleware servers implement global rejection and exception handlers to ensure transient network outages (e.g., DevStack VM sleep, temporary controller reboot, or SSH timeout) do not crash the Node.js process:

```javascript
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
});
```

---

## 2\. Environment Setup

### Prerequisites

| Software | Version | Purpose |
| :---- | :---- | :---- |
| **Operating System** | Linux (Ubuntu 24.04 LTS) | Host development and execution environment |
| **Docker** | ≥ 24.x | Container runtime for ODL and ONOS SDN controllers |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Backend middleware and frontend runtime |
| **npm** | ≥ 10.x (tested with 11.19.0) | Package and dependency management |
| **DevStack** | Stable branch | Single-node OpenStack deployment (Keystone, Nova, Neutron ML2/OVN, Glance) |
| **OpenDaylight** | Karaf 0.23.1 (Vanadium) | SDN controller for flow telemetry and Table 250 shadow synchronization |
| **ONOS** | 2.7.0 | SDN controller for network slicing and OpenFlow routing |
| **Mininet VM** | Official pre-packaged VM (Ubuntu) | Network emulation with pre-compiled OVS kernel datapath |
| **Python** | ≥ 3.12 | Intent service (sentence-transformers) and anomaly detectors |
| **uv** | Latest | Fast Python virtual environment and package manager |

---

### Step 1 — Clone and Install Dependencies

```sh
git clone <repository-url> insa-merged
cd insa-merged
npm install

# Set up Python intent and anomaly dependencies
cd anomaly
uv sync
cd ..
```

---

### Step 2 — DevStack Installation (on Dedicated VM or Host)

DevStack is deployed on a dedicated KVM/QEMU virtual machine managed via `libvirt`, attached to the host's virtual bridge (`virbr0`, default subnet `192.168.122.0/24`).

```bash
# 1. Create dedicated stack user
sudo useradd -s /bin/bash -d /opt/stack -m stack
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo -u stack -i

# 2. Clone DevStack repository
git clone https://opendev.org/openstack/devstack
cd devstack

# 3. Create local.conf configuration
cat > local.conf <<EOF
[[local|localrc]]
ADMIN_PASSWORD=secret
DATABASE_PASSWORD=$ADMIN_PASSWORD
RABBIT_PASSWORD=$ADMIN_PASSWORD
SERVICE_PASSWORD=$ADMIN_PASSWORD
HOST_IP=<vm-ip-on-virbr0>
EOF

# 4. Execute stack script
./stack.sh
```

Upon successful deployment, DevStack provides:
- **Keystone**: Identity API v3 (`http://<vm-ip>/identity/v3`)
- **Nova**: Compute API v2.1 (`http://<vm-ip>/compute/v2.1`)
- **Neutron**: Networking API v2.0 with ML2/OVN mechanism driver (`http://<vm-ip>/networking/v2.0`)
- **Glance**: Image API v2 (`http://<vm-ip>/image/v2`)

---

### Step 3 — OpenDaylight (ODL) Controller Setup

OpenDaylight uses **ODL Karaf 0.23.1 (Vanadium)**. Because official pre-built Docker Hub images are no longer published for modern ODL releases, ODL is built as a local Docker image based on Eclipse Temurin Java 21 (`eclipse-temurin:21-jre-jammy`).

The Dockerfile and entrypoint script are provided in the repository under `docker/odl/`:

#### 1. Build the ODL Docker Image
```bash
# Build the ODL Vanadium Docker image from repository files
docker build -t odl:latest -f docker/odl/Dockerfile docker/odl
```

<details>
<summary><b>View Dockerfile and entrypoint script specifications</b></summary>

**`docker/odl/Dockerfile`**:
```dockerfile
FROM eclipse-temurin:21-jre-jammy

ARG ODL_VERSION=0.23.1
ARG ODL_DOWNLOAD_URL=https://nexus.opendaylight.org/content/repositories/opendaylight.release/org/opendaylight/integration/karaf/${ODL_VERSION}/karaf-${ODL_VERSION}.tar.gz
ENV ODL_HOME=/opt/opendaylight \
    KARAF_HOME=/opt/opendaylight \
    JAVA_OPTS="-Djava.awt.headless=true -Djava.security.egd=file:/dev/./urandom"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tar \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --home-dir /opt/opendaylight --shell /bin/bash odl \
    && mkdir -p /opt/opendaylight \
    && curl -fsSL "$ODL_DOWNLOAD_URL" | tar -xz --strip-components=1 -C /opt/opendaylight \
    && chown -R odl:odl /opt/opendaylight

WORKDIR /opt/opendaylight

EXPOSE 8101 8181 6653 6640

COPY entrypoint.sh /opt/opendaylight/entrypoint.sh
RUN chmod +x /opt/opendaylight/entrypoint.sh
ENTRYPOINT ["/opt/opendaylight/entrypoint.sh"]
```

**`docker/odl/entrypoint.sh`**:
```bash
#!/bin/bash
set -e

/opt/opendaylight/bin/karaf server &
KARAF_PID=$!

# Wait for Karaf client console to accept commands
until /opt/opendaylight/bin/client -u karaf -p karaf "feature:list" > /dev/null 2>&1; do
  sleep 3
done

# Install required features for RESTCONF, OpenFlow 1.3, and OVSDB
/opt/opendaylight/bin/client -u karaf -p karaf "feature:install odl-restconf-all odl-restconf odl-restconf-openapi odl-ovsdb-southbound-impl odl-openflowplugin-flow-services odl-openflowplugin-southbound odl-l2switch-switch odl-ovsdb-all"

wait $KARAF_PID
```
</details>

#### 2. Create and Run the ODL Container (Initial Setup)
```bash
docker run -d --name odl \
  -p 8101:8101 \
  -p 8181:8181 \
  -p 6653:6653 \
  -p 6640:6640 \
  odl:latest
```

**Port Mapping Breakdown**:
- `8181`: RESTCONF API & OpenAPI UI (used by `server.js` and frontend proxy)
- `8101`: Karaf SSH management console (`karaf` / `karaf`)
- `6653`: OpenFlow 1.3 southbound port (for switch connections)
- `6640`: OVSDB southbound port (for OVS bridge management)

#### 3. Verify ODL Initialization & Health
The entrypoint script automatically installs all required features (`odl-restconf-all`, `odl-openflowplugin-southbound`, `odl-ovsdb-all`, etc.) on first boot. Initial bundle startup takes approximately 30–60 seconds.

```bash
# Verify RESTCONF endpoint responds (default credentials: admin / admin)
curl -s -u admin:admin http://localhost:8181/rests/data/opendaylight-inventory:nodes | head -c 200

# (Optional) Verify installed features via Karaf client:
docker exec -it odl /opt/opendaylight/bin/client -u karaf -p karaf "feature:list -i"
```

#### 4. Daily Management (Start / Stop)
```bash
# Stop ODL
docker stop odl

# Start ODL
docker start odl
```

---

### Step 4 — ONOS Controller Setup

ONOS is deployed using the official **ONOS 2.7.0** Docker image (`onosproject/onos:2.7.0`).

#### 1. Download and Run the ONOS Container (Initial Setup)
```bash
# Pull official ONOS image
docker pull onosproject/onos:2.7.0

# Run ONOS with REST (8181), Karaf SSH CLI (8101), and OpenFlow (6653) ports exposed
docker run -d --name onos \
  -p 8181:8181 \
  -p 8101:8101 \
  -p 6653:6653 \
  -p 6640:6640 \
  onosproject/onos:2.7.0
```

**Port Mapping Breakdown**:
- `8181`: ONOS REST API & Web GUI (default credentials: `onos` / `rocks`)
- `8101`: ONOS Apache Karaf SSH CLI (`ssh -p 8101 onos@localhost`)
- `6653`: OpenFlow 1.3 southbound port (for Mininet switches)
- `6640`: OVSDB management port

#### 2. Wait for ONOS to Boot
ONOS requires ~15–30 seconds to initialize its core OSGi bundles:
```bash
until curl -s -u onos:rocks http://localhost:8181/onos/v1/applications > /dev/null; do
  echo "Waiting for ONOS to initialize..."
  sleep 3
done
echo "ONOS is up and ready."
```

#### 3. Activate Required Applications
ONOS starts with minimal features enabled. You must activate the OpenFlow provider, reactive forwarding, and proxy ARP (along with the OVSDB provider if managing bridges via port 6640):

| Application | Identifier | Purpose |
| :---- | :---- | :---- |
| **OpenFlow Provider** | `org.onosproject.openflow` | Handles OpenFlow 1.3 switch connections and flow programming on port 6653 |
| **Reactive Forwarding** | `org.onosproject.fwd` | Provides default hop-by-hop packet forwarding and initial topology learning |
| **Proxy ARP** | `org.onosproject.proxyarp` | Intercepts and answers ARP/NDP requests, enabling inter-host resolution |
| **OVSDB Provider** | `org.onosproject.ovsdb-base` | Handles OVSDB protocol communication for bridge and port management on port 6640 |

**Option A — Via REST API (Recommended)**:
```bash
# 1. OpenFlow southbound provider
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.openflow/active

# 2. Reactive Forwarding (initial discovery)
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.fwd/active

# 3. Proxy ARP / NDP (host address resolution)
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.proxyarp/active

# 4. OVSDB Base (for OVS manager connection on port 6640)
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.ovsdb-base/active
```

**Option B — Via ONOS CLI (Alternative)**:
```bash
ssh -p 8101 -o StrictHostKeyChecking=no onos@localhost \
  "app activate org.onosproject.openflow; app activate org.onosproject.fwd; app activate org.onosproject.proxyarp; app activate org.onosproject.ovsdb-base"
```

#### 4. Verify ONOS Health
```bash
# Verify active applications
curl -s -u onos:rocks http://localhost:8181/onos/v1/applications | grep -E "org.onosproject.(openflow|fwd|proxyarp|ovsdb-base)"

# Verify connected devices (switches will appear once Mininet connects)
curl -s -u onos:rocks http://localhost:8181/onos/v1/devices
```

#### 5. Daily Management (Start / Stop)
```bash
# Stop ONOS
docker stop onos

# Start ONOS
docker start onos
```

---

> [!IMPORTANT]
> ### Controller Mutual Exclusion Rule
> Both OpenDaylight and ONOS bind host ports **8181** (REST API) and **6653** (OpenFlow). They **cannot run simultaneously** on the same machine.
>
> Always stop one controller before starting the other:
> ```bash
> # To work with ODL:
> docker stop onos 2>/dev/null || true
> docker start odl
>
> # To work with ONOS:
> docker stop odl 2>/dev/null || true
> docker start onos
> ```
> Whenever you switch controllers, also re-point the OVS bridge on the Mininet VM (see [Section 7: Dual-Controller Architecture](#7-dual-controller-architecture--dynamic-switching)).

---

### Step 5 — Mininet Setup via Official Pre-packaged VM

Mininet is deployed using the **official recommended virtual machine image** provided by the Mininet project ([mininet.org/download](http://mininet.org/download/)).

#### Why the Official VM:
- **Pre-configured environment**: Includes Mininet 2.3+, Open vSwitch (OVS), `mnexec`, `tc` (Linux Traffic Control), and testing utilities (`iperf`, `tcpdump`, `arping`) pre-installed.
- **Kernel-level OVS datapath**: Includes the pre-compiled `openvswitch.ko` kernel module, ensuring reliable DSCP/TOS classification and HTB queue handling without kernel header mismatches.
- **Namespace & daemon isolation**: Isolates the emulated network namespaces and Open vSwitch daemons from the host OS, preventing networking collisions with DevStack.

#### VM Deployment & Passwordless SSH:
The official VM image is deployed via `libvirt` on `virbr0` (`192.168.122.0/24`). Default credentials are `mininet` / `mininet` (with passwordless `sudo`).

The ONOS backend server (`server-onos.js`) executes remote network commands using SSH:

```bash
# Generate SSH key (if not present)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_main -N ""

# Copy public key to Mininet VM
ssh-copy-id -i ~/.ssh/id_main mininet@192.168.122.88

# Verify non-interactive execution
ssh -i ~/.ssh/id_main mininet@192.168.122.88 "mn --version"
```

#### Connecting Mininet to the Active Controller:
```bash
# Connect to the active controller (IP is host's address from VM perspective)
sudo mn --controller=remote,ip=192.168.122.1,port=6653 --topo=tree,depth=2,fanout=2 --switch=ovsk,protocols=OpenFlow13
```

---

### Step 6 — Configure .env

Create or update the `.env` file in the project root:

```env
# ==============================================================================
# OpenStack (DevStack) Configuration
# ==============================================================================
KEYSTONE_URL=http://192.168.122.156/identity/v3
OS_USERNAME=admin
OS_PASSWORD=secret
OS_PROJECT_NAME=admin
OS_USER_DOMAIN_NAME=default
OS_PROJECT_DOMAIN_NAME=default
PORT=5000

# ==============================================================================
# OpenDaylight (ODL) Configuration
# ==============================================================================
ODL_URL=http://localhost:8181

# ==============================================================================
# ONOS Configuration
# ==============================================================================
ONOS_URL=http://localhost:8181
ONOS_USERNAME=onos
ONOS_PASSWORD=rocks
ONOS_SERVER_PORT=5001

# ==============================================================================
# Mininet Remote Execution Configuration
# ==============================================================================
MININET_HOST=192.168.122.88
MININET_USER=mininet
MININET_SSH_KEY=~/.ssh/id_main

# ==============================================================================
# Intent Service
# ==============================================================================
INTENT_SERVICE_URL=http://127.0.0.1:5005
```

> **Note**: `NOVA_URL`, `NEUTRON_URL`, and `GLANCE_URL` are intentionally **omitted**. They are automatically learned from the Keystone service catalog upon authentication.

---

### Step 7 — Start Backend Services

All services can be launched concurrently using the multi-service orchestrator script or npm:

```sh
# Option A: Start all services + Vite frontend together (Recommended)
./start_services.sh --with-frontend

# Option B: Start all backend services via npm
npm run all:services

# Option C: Start components individually
npm run server        # Terminal 1: DevStack/ODL backend (port 5000)
npm run server:onos   # Terminal 2: ONOS backend (port 5001)
npm run dev           # Terminal 3: Vite React frontend (port 5173)
```

### Available npm Scripts

| Script | Command | Purpose |
| :---- | :---- | :---- |
| `npm run server` | `node --watch server.js` | DevStack & ODL integration server (port 5000) |
| `npm run server:onos` | `node --watch server-onos.js` | ONOS & Mininet integration server (port 5001) |
| `npm run server:all` | `concurrently "..."` | Runs both `server.js` and `server-onos.js` |
| `npm run services` | `concurrently "..."` | Launches DevStack, ONOS, RF Anomaly, IF Anomaly, and Intent services |
| `npm run all:services` | `concurrently "..."` | Launches all 5 backend services plus the Vite frontend |
| `npm run dev` | `vite` | Starts frontend development server on port 5173 |

---

## 3\. OpenStack Cloud Infrastructure Integration

### Dynamic Keystone Service Discovery

Rather than relying on brittle, static URL configurations in `.env`, `server.js` dynamically queries Keystone's service catalog upon authentication to discover current API endpoints:

```
POST $KEYSTONE_URL/auth/tokens
  Headers: Content-Type: application/json
  Body: { auth: { identity: { methods: ["password"], ... } } }
  
Response:
  Header: X-Subject-Token (cached token)
  Body: token.catalog[]
    ├── type: "compute"  ──► Nova URL (e.g., http://<ip>/compute/v2.1)
    ├── type: "network"  ──► Neutron URL (e.g., http://<ip>/networking/v2.0)
    └── type: "image"    ──► Glance URL (e.g., http://<ip>/image/v2)
```

#### Discovery Algorithm (`server.js`):
1. Authenticates against Keystone Identity v3 using configured credentials.
2. Extracts the `X-Subject-Token` authentication token from response headers.
3. Iterates over `token.catalog` entries matching `compute`, `network`, and `image` service types.
4. Selects the `public` interface endpoint URL.
5. If Keystone is accessed via `localhost`, rewrites remote hostnames in the catalog to `localhost` to maintain connectivity in port-forwarded setups.
6. Ensures necessary version suffixes (`/v2.0` for Neutron, `/v2` for Glance) are normalized.

### Token Caching and Automatic Renewal
Keystone tokens are stored in an in-memory cache with an expiration timestamp:
```javascript
let tokenCache = { token: null, expiresAt: 0 };
```
Tokens are reused until `expiresAt <= Date.now() + 30000` (a 30-second safety window), eliminating redundant authentication overhead on every API call.

### Compute (Nova) Integration
- **Server Details**: Fetches instances via `GET $NOVA_URL/servers/detail`, extracting hypervisor host, flavor IDs, status, power state, and attached networks.
- **Flavor & Keypair Resolution**: Maps flavor IDs to human-readable RAM/vCPU specs and verifies SSH key availability.
- **VNC Console Access**: Dynamically generates noVNC web URLs via `POST $NOVA_URL/servers/{id}/action` with payload `{"os-getVNCConsole": {"type": "novnc"}}`, supporting remote desktop interaction directly within the dashboard.

### Networking (Neutron & OVN) Integration
- **Virtual Topologies**: Retrieves networks, subnets, routers, ports, and floating IPs.
- **Port Matching**: Associates Neutron ports (`device_owner = "compute:nova"`) with VM UUIDs (`device_id`).
- **OVN Infrastructure Health (`GET /api/openstack/ovn-health`)**: Executes `sudo -n ovn-nbctl show` directly on the host to monitor logical routers, logical switches, OVN chassis bindings, and database connectivity.

### Unified Cloud Dashboard Summary (`GET /api/openstack/summary`)
The `/api/openstack/summary` endpoint provides a consolidated status payload for the UI dashboard:
- Total and active instance counts.
- Aggregated network, subnet, and floating IP allocation statistics.
- Hypervisor CPU and memory allocation ratios.
- Controller health and connectivity states.

---

## 4\. OpenStack Network Slicing & QoS Enforcement Pipeline

Network slicing on OpenStack partitions shared cloud resources into isolated virtual slices (`openstack_slices` table in `users.db`), each defined by a name, assigned VMs, an isolation level (`STANDARD` or `STRICT`), and guaranteed bandwidth limits.

```
                      Slice Provisioning Pipeline (OpenStack)
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
[Isolation Layer]                                                [Bandwidth & QoS Layer]
        │                                                                 │
  STANDARD Isolation:                                            Rate Ceiling (Max Bandwidth):
    • Create Neutron Security Group                                • Direct ovs-ofctl add-meter on br-int
    • Intra-slice self-referencing ALLOW rule                      • Priority 600 flow in Table 250
    • Attach SG to slice VM ports                                         │
        │                                                        Rate Floor (Min Bandwidth):
  STRICT Isolation:                                                • Direct ovs-vsctl HTB Queue on VM port
    • Neutron SG isolation (above)                                 • Guaranteed min-rate scheduling
    • PLUS: Table 250 Priority 700 explicit DROP                          │
      flows on br-int for all other slice IPs                    Telemetry & Observability:
                                                                   • Table 250 shadow flow pushed to ODL
```

### 1. Isolation Enforcement

#### STANDARD Isolation:
1. Creates a dedicated Neutron security group: `sg-slice-<sliceId>`.
2. Adds a self-referencing ingress rule:
   ```json
   {
     "security_group_rule": {
       "security_group_id": "<sg-id>",
       "direction": "ingress",
       "ethertype": "IPv4",
       "remote_group_id": "<sg-id>"
     }
   }
   ```
3. Attaches this security group to every Neutron port owned by the slice VMs. Because OpenStack security groups enforce an implicit default-deny policy, VMs within the slice communicate freely with each other while all outside traffic is blocked.

#### STRICT Isolation (Defense-in-Depth):
In addition to the Neutron security group, the server installs explicit OpenFlow drop flows directly into Open vSwitch integration bridge (`br-int`) via `ovsDirect.js`:
```bash
sudo ovs-ofctl -O OpenFlow13 add-flow br-int \
  "table=250,priority=700,ip,nw_src=<other_slice_vm_ip>,actions=drop"
```
This guarantees hardware/switch-level drops for foreign slice packets, bypassing higher-layer network namespaces.

---

### 2. Direct OVS QoS Enforcement (`ovsDirect.js`)

In standard DevStack environments, Neutron QoS minimum bandwidth rules cannot be applied because Nova Placement lacks compute bandwidth inventory reports. Furthermore, ODL's RESTCONF meter creation API exhibits a deserializer bug in modern OpenFlow builds.

To achieve genuine bandwidth rate floors and ceilings, the system enforces QoS directly on Open vSwitch (`br-int`) using `ovsDirect.js`:

#### A. Rate Ceiling Enforcement (Meters via `ovs-ofctl`):
```javascript
// ovsDirect.enforceBandwidthDirect(vmIp, meterId, rateKbps)
// 1. Adds OpenFlow meter with drop band
`ovs-ofctl -O OpenFlow13 add-meter br-int "meter=${meterId},kbps,burst,band=type=drop,rate=${rateKbps},burst_size=${burst}"`

// 2. Adds Table 250 classification flow matching VM IP
`ovs-ofctl -O OpenFlow13 add-flow br-int "table=250,priority=600,ip,nw_src=${vmIp},actions=meter:${meterId},CONTROLLER:60"`
```

#### B. Rate Floor Enforcement (HTB Queues via `ovs-vsctl`):
```javascript
// ovsDirect.configurePortQueue(portName, minRateBps, maxRateBps)
// Configures real Linux HTB qdisc and queues on the VM's TAP interface
`ovs-vsctl set port ${portName} qos=@newqos -- \
  --id=@newqos create qos type=linux-htb other_config:max-rate=${maxRateBps} queues:0=@q0 -- \
  --id=@q0 create queue other_config:min-rate=${minRateBps} other_config:max-rate=${maxRateBps}`
```

---

### 3. Automated Drift Detection & 30-Second Reconciliation Loop

Open vSwitch kernel datapath configurations and HTB queues are volatile. If an administrator runs `mn -c` or the OVS daemon restarts, queues and meters are lost.

`server.js` executes a background **reconciliation loop every 30 seconds**:
1. Queries the SQLite database for all active OpenStack slices.
2. Checks whether each slice's OVS meter and HTB queue are still present via `ovsDirect.isQueueConfigured()`.
3. If drift is detected, automatically re-executes `ovsDirect.enforceBandwidthDirect()` and `ovsDirect.configurePortQueue()` without requiring manual administrator intervention.

---

## 5\. OpenDaylight (ODL) SDN Integration

OpenDaylight (ODL Karaf 0.23.1 Vanadium) provides SDN telemetry, flow counters, and network visibility.

### RESTCONF Telemetry Pipeline (`odlSync.js`)
All communication with ODL uses the standard RESTCONF HTTP API on port **8181** with Basic Authentication (`admin:admin`):

```javascript
const ODL_BASE = process.env.ODL_URL || "http://localhost:8181";
const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");
const SHADOW_TABLE = 250;
```

### Automatic `br-int` Node Discovery
The integration automatically locates OpenStack's `br-int` switch inside ODL's inventory datastore (`GET /rests/data/opendaylight-inventory:nodes?content=nonconfig`):
- Filters nodes by manufacturer `Nicira, Inc.`
- Verifies the node has no datapath description (Mininet switches always declare descriptions like `s1` or `s2`, whereas native OVS `br-int` leaves this null or `None`).

### Table 250 Shadow Flow Architecture
OpenStack's OVN ML2 driver exclusively owns OpenFlow tables `0` through `99` on `br-int`. Any modification to those tables risks disrupting cloud packet forwarding.

The system isolates all ODL flow rules into **Table 250**:
- **Security Rule Shadow Flows (Priority 500)**: Installed when OpenStack security rules or slices are provisioned. Action is `CONTROLLER:60` (send-to-controller). These flows match traffic passing through the bridge and increment telemetry byte/packet counters in ODL without altering real forwarding paths.
- **Slice Metering Shadow Flows (Priority 600)**: Links slice VM IP matching to ODL observability counters.

### VM-to-ODL Topology Mapping (`/api/openstack/vm-topology-map`)
This endpoint bridges compute and SDN layers:
1. Queries Nova servers and Neutron ports.
2. Calculates the Linux TAP interface name corresponding to each VM port:
   $$\text{Interface Name} = \text{"tap"} + \text{port.id}[0..10]$$
3. Queries ODL RESTCONF for `br-int`'s active `node-connector` inventory.
4. Matches TAP interface names against ODL connectors, allowing the UI to display live switch-port mappings for every cloud VM.

---

## 6\. ONOS Controller & Remote Mininet Integration

The ONOS subsystem (`server-onos.js`, port 5001) manages emulated multi-switch topologies, end-to-end network slicing, and verification testing.

### ONOS REST API Client
All calls to ONOS use HTTP Basic Auth (`onos:rocks`) with a strict 5-second timeout via `AbortSignal.timeout(5000)`:

```javascript
const onosFetch = async (apiPath, options = {}) => {
  const headers = {
    Authorization: "Basic " + Buffer.from("onos:rocks").toString("base64"),
    Accept: "application/json",
  };
  return fetch(`${ONOS_URL}${apiPath}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(5000),
  });
};
```

### Remote Mininet SSH Execution Engine (`runMininetCmd`)
Because Mininet runs inside an isolated VM, commands must execute within specific host network namespaces. `server-onos.js` executes remote commands by chaining SSH, `pgrep`, and `mnexec`:

```javascript
// Step 1: Find host PID on Mininet VM
// Step 2: Execute command inside host namespace
const fullCmd = `ssh -i ${MININET_SSH_KEY} -o StrictHostKeyChecking=no ${MININET_USER}@${MININET_HOST} "sudo mnexec -a \\$(pgrep -f 'mininet:${host}$') ${escapedCmd}"`;
```

### Live In-Namespace Verification Endpoints

| Endpoint | Method | Action |
| :---- | :---- | :---- |
| `/api/onos/verify/ping` | `POST` | Executes `ping -c 3 -W 2 <target_ip>` inside source host namespace; parses RTT min/avg/max and packet loss % |
| `/api/onos/verify/iperf` | `POST` | Spawns background `iperf -s` on target host, runs `iperf -c <target_ip> -t 3 -y C` on source host, extracts throughput in Mbps |
| `/api/onos/verify/queues` | `GET` | Runs `tc -s qdisc show` and `tc -s class show` across all bridge ports to report live packet/drop counts |
| `/api/onos/flows/check` | `GET` | Dumps OpenFlow flows across all switches to verify priority rules (39000 drop, 40000 unicast, 41000 URLLC) |

---

## 7\. Dual-Controller Architecture & Dynamic Switching

### Controller Switching Procedure

OpenDaylight and ONOS both bind ports **8181** (REST API) and **6653** (OpenFlow). They **cannot run simultaneously**. To switch between them:

#### 1. Stop Current Controller & Start Target:
```bash
# Switch from ONOS to ODL:
docker stop onos
docker start odl

# Switch from ODL to ONOS:
docker stop odl
docker start onos
```

#### 2. Re-point Open vSwitch Controller Connection:
On the Mininet VM (or host bridge):
```bash
sudo ovs-vsctl del-controller br-int
sudo ovs-vsctl set bridge br-int protocols=OpenFlow13
sudo ovs-vsctl set-manager ptcp:6640:127.0.0.1 tcp:192.168.122.1:6640
sudo ovs-vsctl set-controller br-int tcp:192.168.122.1:6653
```

#### 3. Verify Connection:
```bash
sudo tail -n 5 /var/log/openvswitch/ovs-vswitchd.log | grep 6653
```

### Frontend Auto-Detection (`src/api/api-controller.js`)
The React frontend dynamically detects which controller is currently responsive:

```javascript
async function detectController() {
  try {
    const res = await onosApi.get("/devices");
    if (res.data?.devices) return "onos";
  } catch {
    // ONOS offline, fallback to ODL
  }
  return "odl";
}
```
All UI service calls (`getDevices()`, `getHosts()`, `getLinks()`, `getMeters()`) transparently dispatch to the active controller backend without requiring page reloads or configuration changes.

### Vite Proxy Configuration Matrix (`vite.config.js`)

| URL Prefix | Destination Target | Handled By |
| :---- | :---- | :---- |
| `/api/openstack` | `http://localhost:5000` | DevStack Server (`server.js`) |
| `/api/slices` | `http://localhost:5000` | DevStack / OpenStack Slicing (`server.js`) |
| `/api/rests` | `http://localhost:8181` | OpenDaylight RESTCONF Direct Proxy |
| `/api/onos/verify` | `http://localhost:5001` | ONOS Middleware Server (`server-onos.js`) |
| `/api/onos/slices` | `http://localhost:5001` | ONOS Slicing SQLite (`server-onos.js`) |
| `/api/onos` | `http://localhost:8181` | ONOS REST API Proxy |

---

## 8\. Backend API Reference

### DevStack / ODL Middleware Server (`server.js` — Port 5000)

| Endpoint | Method | Description |
| :---- | :---- | :---- |
| `/api/openstack/summary` | `GET` | Aggregated cloud status (VM counts, network counts, quotas, controller state) |
| `/api/openstack/servers` | `GET` | Detailed Nova instance list with IP, flavor, and status mapping |
| `/api/openstack/servers` | `POST` | Launches a new Nova VM instance |
| `/api/openstack/servers/:id` | `DELETE` | Terminates and removes a Nova VM instance |
| `/api/openstack/servers/:id/console` | `POST` | Generates a live noVNC console URL for instance access |
| `/api/openstack/networks` | `GET` | Lists Neutron virtual networks and subnet associations |
| `/api/openstack/security-groups` | `GET` | Lists security groups and active ingress/egress rules |
| `/api/openstack/security-groups` | `POST` | Creates a new security group and syncs Table 250 shadow flow to ODL |
| `/api/openstack/ovn-health` | `GET` | Returns OVN Northbound database and chassis health report |
| `/api/openstack/vm-topology-map` | `GET` | Correlates Nova VMs to ODL `node-connector` bridge ports |
| `/api/slices` | `GET` | Lists all OpenStack network slices from SQLite |
| `/api/slices` | `POST` | Provisions a new OpenStack slice (Security Group + direct OVS QoS) |
| `/api/slices/:id` | `DELETE` | Tears down OpenStack slice, removes SG, and deletes OVS queues/meters |

### ONOS Middleware Server (`server-onos.js` — Port 5001)

| Endpoint | Method | Description |
| :---- | :---- | :---- |
| `/api/onos/summary` | `GET` | Aggregates ONOS devices, hosts, links, flows, and cluster health |
| `/api/onos/verify/ping` | `POST` | Executes in-namespace ping test between two Mininet hosts |
| `/api/onos/verify/iperf` | `POST` | Executes in-namespace iperf throughput benchmark |
| `/api/onos/verify/queues` | `GET` | Inspects live HTB queue statistics on Mininet switches |
| `/api/onos/slices` | `GET` | Authoritative fetch of all ONOS network slices from SQLite |
| `/api/onos/slices` | `POST` | Atomically creates or updates ONOS slice in SQLite |
| `/api/onos/slices/:id` | `DELETE` | Removes ONOS slice from SQLite and initiates switch cleanup |
| `/api/onos/intent/parse` | `POST` | Proxies natural-language slicing prompts to neural intent service (port 5005) |

---

## 9\. Challenges and Solutions

### 9.1 Dynamic Keystone Service Discovery vs. Static Configuration
- **Challenge**: OpenStack service URLs vary across deployments (single-node DevStack, multi-node setups, or bridged VMs). Hardcoding endpoints like `NOVA_URL` or `NEUTRON_URL` broke portability and required constant `.env` edits.
- **Solution**: Implemented dynamic Keystone service catalog parsing on initial login. The server retrieves the service catalog from the Keystone token response, dynamically discovers public endpoints for compute, network, and image services, and normalizes API version paths.

### 9.2 ODL RESTCONF Meter Deserializer Defect & Direct OVS Enforcement
- **Challenge**: Attempting to provision OpenFlow meters via ODL's RESTCONF API caused internal Java deserialization exceptions in this ODL Karaf release. Concurrently, standard DevStack lacks Neutron QoS driver support and Nova Placement bandwidth inventory.
- **Solution**: Built `ovsDirect.js` to bypass the buggy RESTCONF meter path. It communicates directly with Open vSwitch via `ovs-ofctl` (creating meters with drop bands in Table 250) and `ovs-vsctl` (configuring Linux HTB queues on VM TAP interfaces). ODL is retained for shadow flow tagging and inventory discovery.

### 9.3 OVN Pipeline Coexistence via Table 250 Isolation
- **Challenge**: OpenStack's Neutron ML2/OVN mechanism driver manages OpenFlow tables `0` through `99` on `br-int`. Injecting custom slicing or telemetry flows into low-numbered tables caused packet loops, dropped DHCP offers, and severed VM metadata connections.
- **Solution**: Confined all custom SDN rules, shadow flows, and direct metering exclusively to **Table 250**. Because OVN pipelines exit before Table 250, custom rules operate safely without interfering with default cloud forwarding.

### 9.4 OpenStack Nova noVNC Console API Incompatibilities
- **Challenge**: Different OpenStack microversions expect varying action payload keys (`os-getVNCConsole` vs `remote-consoles`), causing VNC console generation to fail with HTTP 400/404 errors.
- **Solution**: Implemented an adaptive fallback handler in `server.js` that attempts the standard microversion `os-getVNCConsole` payload with type `novnc`, and falls back to Nova v2.6+ `remote-consoles` if rejected.

### 9.5 Dual-Controller Port Collisions & Mutual Exclusion Orchestration
- **Challenge**: ODL and ONOS both require exclusive access to port 8181 (RESTCONF/REST API) and port 6653 (OpenFlow southbound). Running both simultaneously resulted in port binding failures.
- **Solution**: Enforced a mutual exclusion operational model where only one controller runs at any given time. Added the frontend `detectController()` probe and standardized Docker swap commands (`docker stop onos && docker start odl`) along with automated OVS bridge controller re-pointing scripts.

### 9.6 Ephemeral OVS QoS Configuration & Automated 30-Second Reconciliation
- **Challenge**: Linux HTB queues and OVS meters configured directly on virtual switches do not survive bridge re-creations (e.g., executing `mn -c` or restarting the OVS daemon). Slices appeared configured in the database while data plane rate limiting was silently lost.
- **Solution**: Implemented a 30-second background reconciliation loop in `server.js`. The loop inspects active slices against live OVS state using `ovsDirect.isQueueConfigured()` and automatically re-applies missing meters and queues.

### 9.7 Remote Mininet Namespace Execution and SSH Escaping
- **Challenge**: Running verification diagnostics on emulated hosts requires executing commands through SSH inside network namespaces (`mnexec`). Complex arguments containing nested quotes (such as `iperf -y C` or `awk` formatting) caused SSH argument parsing syntax errors.
- **Solution**: Constructed `runMininetCmd()` with rigorous single-quote escaping:
  ```javascript
  command.replace(/'/g, "'\\''")
  ```
  The escaped command is wrapped in a dedicated `mnexec -a $(pgrep -f 'mininet:<host>')` subshell with strict host-key verification disabled.

### 9.8 Process Stability and Graceful Degradation Under Cloud Outages
- **Challenge**: Network drops between the host and virtual machines (DevStack VM or Mininet VM) triggered unhandled promise rejections that crashed Node.js processes.
- **Solution**: Installed global `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers. Added deterministic 5-second request timeouts (`AbortSignal.timeout(5000)`) on all external fetch pipelines, returning structured error payloads rather than allowing sockets to hang.

---

## 10\. Limitations

1. **DevStack Single-Node Scope**: The integration is developed and tested against single-node DevStack. Production multi-node OpenStack deployments with distributed OVS compute nodes require multi-chassis manager configurations.
2. **Single-Project Administrative Boundary**: All Keystone API interactions authenticate using a single administrative project scope (`admin`). Multi-tenant role-based access control (RBAC) is not implemented.
3. **In-Memory Keystone Token Lifecycle**: Keystone tokens are cached in volatile Node.js memory. Restarting the backend server forces re-authentication on the next incoming request.
4. **Localhost Rewriting Assumption**: When Keystone is accessed on localhost, the discovery algorithm rewrites all service URLs to localhost. This assumption breaks if individual OpenStack services reside on separate physical IP addresses.
5. **Host Sudo Requirement for OVN and OVS**: Health verification (`ovn-nbctl show`) and direct QoS enforcement (`ovs-ofctl`, `ovs-vsctl`) require passwordless sudo privileges on the backend server host.
6. **Controller Mutual Exclusion**: ODL and ONOS cannot operate concurrently on the same host due to port conflicts (8181 and 6653). Switching requires stopping one container and restarting the other.
7. **Volatile Mininet OVS Queues**: While OpenStack slices on the host bridge are automatically restored by the 30-second reconciliation loop, ONOS slice queues configured on the remote Mininet VM are not auto-reconciled after a `mn -c` wipe.
8. **Table 250 ODL Observability Boundary**: ODL shadow flows in Table 250 serve as observability and telemetry markers only. Because OVN handles active packet forwarding in Tables 0–99, Table 250 flows do not alter real production cloud forwarding decisions.
9. **Single SQLite Database File**: Both backend servers share `users.db`. While SQLite's WAL mode handles moderate concurrency, high write volumes across simultaneous slicing and authentication operations may encounter lock contention.
10. **Mininet Testing Constraint**: The live in-namespace verification endpoints (ping, iperf, queue telemetry) depend on Mininet network namespaces via SSH and cannot directly probe physical hardware switch datapaths.
