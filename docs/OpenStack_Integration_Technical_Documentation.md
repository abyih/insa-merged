# OpenStack Integration — Technical Documentation

## Integration with OpenDaylight (ODL) and ONOS Controllers as Telemetry Observers

> **Project**: INSA SDN Dashboard  
> **Subsystem**: Cloud Infrastructure & Controller Telemetry Integration

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)  
2. [The Integration Dilemma: Why Full SDN Control Failed](#2-the-integration-dilemma-why-full-sdn-control-failed)  
3. [Environment Setup](#3-environment-setup)  
4. [The Observer-Only Architecture & Implementation](#4-the-observer-only-architecture--implementation)  
5. [OpenStack Cloud Infrastructure Services (`server.js`)](#5-openstack-cloud-infrastructure-services-serverjs)  
6. [Dual-Controller Switching & OVS Management](#6-dual-controller-switching--ovs-management)  
7. [Backend API Reference](#7-backend-api-reference)  
8. [Challenges and Solutions](#8-challenges-and-solutions)  
9. [Limitations](#9-limitations)

---

## 1\. Overview & Architecture

This technical documentation covers the integration of **OpenStack (DevStack)** cloud infrastructure with two modern SDN controllers: **OpenDaylight (ODL Karaf 0.23.1 Vanadium)** and **ONOS (2.7.0)**.

In cloud networking, OpenStack uses **Neutron with the ML2/OVN mechanism driver** as its native, authoritative SDN control plane. Rather than replacing or competing with OpenStack's native networking, OpenDaylight and ONOS operate as **pure passive telemetry and topology observers** through the Open vSwitch Database Management Protocol (**OVSDB**) and **OpenFlow 1.3**. The controllers **do not install forwarding flows or enforce rules** on the cloud data plane; all routing, switching, and security filtering are executed by OpenStack OVN.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                         │
│                  Cloud.jsx  |  OpenStack Dashboard                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ :5173 Proxy
┌───────────────────────────────────▼────────────────────────────────────┐
│                    DevStack / ODL Backend Server                       │
│                             (server.js :5000)                          │
│  ────────────────────────────────────────────────────────────────────  │
│  • Dynamic Keystone v3 Auth & Automatic Service URL Discovery          │
│  • Nova (Compute), Neutron (Networking), Glance (Image) API Proxy      │
│  • OVN Logical Infrastructure Health Monitoring (ovn-nbctl)            │
│  • VM-to-SDN Port Correlation Engine (Reconciles Nova/Neutron & OVS)   │
│  • Controller OVSDB & OpenFlow Telemetry Polling                       │
└───────────┬───────────────────────────────────────────────┬────────────┘
            │ HTTP / REST                                   │ HTTP (port 8181)
┌───────────▼──────────────────────────┐      ┌─────────────▼────────────┐
│     OpenStack Cloud (DevStack)       │      │  Active SDN Controller   │
│                                      │      │   (Pure Observer Mode)   │
│  • Keystone (Identity API v3)        │      │                          │
│  • Nova (Compute API v2.1)           │      │  • OpenDaylight          │
│  • Neutron (Networking API v2.0)     │      │    (Karaf 0.23.1)        │
│  • Glance (Image API v2)             │      │    - RESTCONF Northbound │
│  • OVN Northbound DB & Chassis       │      │    - Inventory Telemetry │
│                                      │      │    - Port & Byte Stats   │
│  ┌────────────────────────────────┐  │      │                          │
│  │  Integration Bridge (br-int)   │  │      │  • OR ONOS (2.7.0)       │
│  │  - OVN OpenFlow Pipeline       │  │      │    - REST API Northbound │
│  │    (100% of Cloud Forwarding)  │  │      │    - Device & Port Stats │
│  └────────────────┬───────────────┘  │      └─────────────▲────────────┘
└───────────────────┼──────────────────┼────────────────────┘
                    │                  │
                    │ OVSDB (port 6640)│ OpenFlow 1.3 (port 6653)
                    │ (Read Inventory) │ (Read Stats / Telemetry)
                    └──────────────────┴────────────────────┘
```

### Core Architecture Responsibilities

| Subsystem Component | Service / File | Port | Role |
| :---- | :---- | :---- | :---- |
| **Cloud Middleware Gateway** | `server.js` | 5000 | Authenticates with Keystone v3, discovers service catalogs, proxies Nova/Neutron/Glance, performs OVN health checks, and correlates VM instances with OVS switch ports |
| **OpenStack Native SDN** | DevStack / OVN | — | Authoritative cloud data plane: handles tenant routing, DHCP, metadata, security groups, and packet encapsulation (Geneve) across OpenFlow tables |
| **OpenDaylight Controller** | Docker (`odl:latest`) | 8181, 6653, 6640 | Passive telemetry observer: tracks `br-int` topology, discovers VM tap connectors, and monitors live port traffic statistics |
| **ONOS Controller** | Docker (`onos:2.7.0`) | 8181, 6653, 6640 | Alternative passive telemetry observer: tracks device port counters, flow tables, and OpenFlow topology |
| **Frontend Dashboard** | Vite + React | 5173 | Visualizes VM instances, OVN chassis health, SDN topology graphs, and live flow counters |

---

## 2\. The Integration Dilemma: Why Full SDN Control Failed

Understanding why this architecture uses an **Observer Pattern** rather than an **Authoritative Controller Pattern** requires examining the evolution of open-source SDN and OpenStack.

### 1. The Historical Vision: Full Controller In-Path Virtualization
In earlier SDN research and early OpenStack releases (Liberty through Queens), the intended architecture was for OpenDaylight or ONOS to act as the authoritative ML2 mechanism driver:
- **OpenDaylight NetVirt**: OpenStack used `networking-odl` to translate Neutron API calls into ODL NetVirt (`odl-netvirt-openstack`) RESTCONF commands. NetVirt took over `br-int`, programmed all flow tables, managed VXLAN tunnels, and implemented distributed virtual routing (DVR).
- **ONOS SONA**: ONOS provided the `openstacknetworking` application, which consumed OpenStack networking events and managed OpenFlow pipelines on virtual switches.

### 2. The Upstream Breaking Point
During development, attempting to reproduce this full-control integration exposed fatal upstream blockers:
1. **NetVirt Deprecation and Removal in ODL**: The OpenDaylight community abandoned the NetVirt project. In modern ODL releases (including **ODL Karaf 0.23.1 Vanadium**), `odl-netvirt-openstack` is no longer packaged, maintained, or downloadable from Nexus repositories.
2. **ONOS OpenStack Networking Abandonment**: The `org.onosproject.openstacknetworking` suite in ONOS fell out of maintenance and proved incompatible with modern OpenStack releases that expect OVN Geneve encapsulation and modern OpenFlow 1.3+ capabilities.
3. **The Rise of OVN as the Standard**: OpenStack adopted **OVN (Open Virtual Network)** as its default, production-grade ML2 mechanism driver. OVN compiles high-level logical abstractions directly into low-level OpenFlow rules on `br-int`, actively occupying tables 0 through 99.

### 3. The Pivot to the Pure Observer Architecture
Attempting to force an external SDN controller to write forwarding flows into OVN's managed tables caused critical failures: dropped DHCP offers, broken Geneve tunnels, and corrupted metadata services.

**The Architectural Solution**: Rather than fighting OVN for data plane ownership, the system decouples **forwarding authority** from **observability**:
- **OpenStack OVN retains 100% control** over packet forwarding, routing, and tenant security.
- **ODL and ONOS connect as observers** via OVSDB (`ptcp:6640` / `tcp:6640`) and OpenFlow (`tcp:6653`).
- **Telemetry and Topology Visibility**: The external controllers observe `br-int` ports, monitor VM tap interfaces, and record flow statistics without injecting rules or interfering with cloud operations.

---

## 3\. Environment Setup

### Prerequisites

| Software | Version | Purpose |
| :---- | :---- | :---- |
| **Operating System** | Linux (Ubuntu 24.04 LTS) | Host development and execution operating system |
| **Docker Engine** | ≥ 24.x | Container runtime for ODL and ONOS controllers |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Backend middleware and frontend runtime |
| **npm** | ≥ 10.x (tested with 11.19.0) | Package and dependency management |
| **DevStack** | Stable branch | Single-node OpenStack deployment (Keystone, Nova, Neutron ML2/OVN, Glance) |
| **OpenDaylight** | Karaf 0.23.1 (Vanadium) | SDN controller for flow and port telemetry observation |
| **ONOS** | 2.7.0 | SDN controller for device and port telemetry observation |
| **Open vSwitch** | ≥ 2.17 (packaged with DevStack) | Cloud virtual switch (`br-int`) |

---

### Step 1 — Clone and Install Dependencies

```sh
git clone <repository-url> insa-merged
cd insa-merged
npm install
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

After installation completes, DevStack provides:
- **Keystone v3**: `http://<vm-ip>/identity/v3`
- **Nova v2.1**: `http://<vm-ip>/compute/v2.1`
- **Neutron v2.0 (OVN Driver)**: `http://<vm-ip>/networking/v2.0`
- **Glance v2**: `http://<vm-ip>/image/v2`

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
- `6653`: OpenFlow 1.3 southbound port (for switch telemetry connection)
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

# Run ONOS with REST (8181), Karaf SSH CLI (8101), OpenFlow (6653), and OVSDB (6640) exposed
docker run -d --name onos \
  -p 8181:8181 \
  -p 8101:8101 \
  -p 6653:6653 \
  -p 6640:6640 \
  onosproject/onos:2.7.0
```

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
ONOS starts with minimal features enabled. Activate the OpenFlow provider, reactive forwarding, proxy ARP, and the OVSDB provider:

| Application | Identifier | Purpose |
| :---- | :---- | :---- |
| **OpenFlow Provider** | `org.onosproject.openflow` | Handles OpenFlow 1.3 switch connections on port 6653 |
| **Reactive Forwarding** | `org.onosproject.fwd` | Provides default packet handling and initial topology observation |
| **Proxy ARP** | `org.onosproject.proxyarp` | Intercepts and answers ARP/NDP requests, enabling inter-host resolution |
| **OVSDB Provider** | `org.onosproject.ovsdb-base` | Handles OVSDB protocol communication on port 6640 |

**Option A — Via REST API (Recommended)**:
```bash
# 1. OpenFlow southbound provider
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.openflow/active

# 2. Reactive Forwarding
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.fwd/active

# 3. Proxy ARP / NDP
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.proxyarp/active

# 4. OVSDB Base (for OVS manager connection on port 6640)
curl -u onos:rocks -X POST http://localhost:8181/onos/v1/applications/org.onosproject.ovsdb-base/active
```

**Option B — Via ONOS CLI (Alternative)**:
```bash
ssh -p 8101 -o StrictHostKeyChecking=no onos@localhost \
  "app activate org.onosproject.openflow; app activate org.onosproject.fwd; app activate org.onosproject.proxyarp; app activate org.onosproject.ovsdb-base"
```

#### 4. Daily Management (Start / Stop)
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
> # To switch to ODL:
> docker stop onos 2>/dev/null || true
> docker start odl
>
> # To switch to ONOS:
> docker stop odl 2>/dev/null || true
> docker start onos
> ```
> Whenever switching controllers, re-point `br-int` to the active controller (see [Section 6: Dual-Controller Switching & OVS Management](#6-dual-controller-switching--ovs-management)).

---

### Step 5 — Configure .env

Create or update `.env` in the project root:

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
```

> **Note**: `NOVA_URL`, `NEUTRON_URL`, and `GLANCE_URL` are intentionally **omitted**. They are automatically learned from the Keystone service catalog upon authentication.

---

### Step 6 — Start Backend Services

```sh
# Start the OpenStack / ODL integration backend (port 5000)
npm run server

# In a second terminal, start the Vite React frontend (port 5173)
npm run dev
```

---

## 4\. The Observer-Only Architecture & Implementation

### 1. Attaching `br-int` to the SDN Controller
On the DevStack host (or VM), the integration bridge (`br-int`) is connected to the active controller as an observer using OVSDB and OpenFlow:

```bash
# 1. Clear any stale controller connections
sudo ovs-vsctl del-controller br-int

# 2. Enforce OpenFlow 1.3
sudo ovs-vsctl set bridge br-int protocols=OpenFlow13

# 3. Configure OVSDB Manager (port 6640)
# Listens locally on ptcp:6640 and establishes active connection to controller
sudo ovs-vsctl set-manager ptcp:6640:127.0.0.1 tcp:192.168.122.1:6640

# 4. Point OpenFlow Controller (port 6653)
sudo ovs-vsctl set-controller br-int tcp:192.168.122.1:6653
```

Verify that the bridge is connected:
```bash
sudo tail -n 10 /var/log/openvswitch/ovs-vswitchd.log | grep 6653
# Expected output: "Connected to tcp:192.168.122.1:6653"
```

---

### 2. Automatic `br-int` Discovery in Controller Inventory
When `br-int` connects, it registers as a node in the controller's inventory. The `findBrIntNodeId()` function in [`odlSync.js`](file:///home/abyih/projects/work/insa/insa-merged/odlSync.js) automatically identifies the bridge:

```javascript
async function findBrIntNodeId() {
  if (cachedBrIntNodeId) return cachedBrIntNodeId;
  const res = await odlFetch("/rests/data/opendaylight-inventory:nodes?content=nonconfig");
  const data = await res.json();
  const nodes = data["opendaylight-inventory:nodes"]?.node || [];

  // br-int is an Open vSwitch node with manufacturer "Nicira, Inc." and no synthetic description
  const match = nodes.find((n) => {
    const desc = n["flow-node-inventory:description"];
    return (
      n["flow-node-inventory:manufacturer"] === "Nicira, Inc." &&
      (!desc || desc === "None")
    );
  });
  
  if (!match) throw new Error("Could not find br-int in ODL inventory — is OVS connected?");
  cachedBrIntNodeId = match.id;
  return cachedBrIntNodeId;
}
```

---

### 3. VM-to-SDN Port Mapping Engine (`/api/openstack/vm-topology-map`)
Because OpenStack instances connect to `br-int` via dynamically generated Linux TAP interfaces, the controller cannot tell which VM owns which virtual port without cross-referencing OpenStack APIs.

`server.js` resolves this mapping deterministically:

$$\text{TAP Port Name} = \text{"tap"} + \text{Neutron Port ID}[0..10]$$

```javascript
// Step 1: Query Nova servers and Neutron ports
const [servers, ports] = await Promise.all([
  osJson(`${NOVA_URL}/servers/detail`),
  osJson(`${NEUTRON_URL}/ports`),
]);

// Step 2: Query ODL br-int node-connectors
const brIntNodeId = await odlSync.findBrIntNodeId();
const odlRes = await fetch(`${ODL_BASE}/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(brIntNodeId)}?content=nonconfig`);
const odlConnectors = (await odlRes.json())["opendaylight-inventory:node"]?.[0]?.["node-connector"] || [];

// Step 3: Correlate VM TAP interfaces to ODL node-connectors
const vmMap = servers.servers.map((vm) => {
  const port = ports.ports.find((p) => p.device_id === vm.id);
  const tapName = port ? `tap${port.id.substring(0, 11)}` : null;
  const connector = odlConnectors.find((c) => c["flow-node-inventory:name"] === tapName);

  return {
    vmId: vm.id,
    vmName: vm.name,
    status: vm.status,
    portId: port?.id,
    tapInterface: tapName,
    odlNodeConnectorId: connector?.id || null,
    odlVisible: !!connector,
  };
});
```

This mapping engine links each virtual machine's compute status to its live virtual switch port, enabling real-time telemetry observation.

---

### 4. Passive Telemetry & Port Monitoring

Instead of injecting rules into `br-int`, the integration operates as a pure consumer of controller telemetry:
1. **OVSDB Telemetry (`port 6640`)**: Queries the controller's OVSDB operational datastore to retrieve real-time bridge status, active port attachments, interface drop statistics, and bridge configuration changes.
2. **OpenFlow Telemetry (`port 6653`)**: Retrieves OpenFlow port counters (bytes received, bytes transmitted, packet errors, and drops) through the controller's northbound REST API (`/rests/data/opendaylight-inventory:nodes/node=.../node-connector=...` on ODL, or `/onos/v1/devices/.../ports` on ONOS).
3. **Data Plane Protection**: The controller never issues OpenFlow `add-flow`, `del-flows`, or `modify-flows` commands that could collide with OVN's packet pipeline. OVN maintains complete, unimpeded sovereignty over tenant traffic.

---

## 5\. OpenStack Cloud Infrastructure Services (`server.js`)

### Dynamic Keystone v3 Service Discovery
Rather than requiring static URLs in `.env` for every OpenStack service, `server.js` dynamically queries Keystone's service catalog upon initial authentication:

```
POST $KEYSTONE_URL/auth/tokens
  Headers: Content-Type: application/json
  Body: { auth: { identity: { methods: ["password"], ... } } }

Response:
  Header: X-Subject-Token (Auth Token Cached with Expiration)
  Body: token.catalog[]
    ├── type: "compute"  ──► Nova URL (e.g., http://<ip>/compute/v2.1)
    ├── type: "network"  ──► Neutron URL (e.g., http://<ip>/networking/v2.0)
    └── type: "image"    ──► Glance URL (e.g., http://<ip>/image/v2)
```

#### Discovery Algorithm:
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
- **Security Group Management**: Lists and creates security groups and rules.
- **OVN Infrastructure Health (`GET /api/openstack/ovn-health`)**: Executes `sudo -n ovn-nbctl show` directly on the host to monitor logical routers, logical switches, OVN chassis bindings, and database connectivity.

---

## 6\. Dual-Controller Switching & OVS Management

Because both OpenDaylight and ONOS require exclusive ownership of ports **8181** (REST API) and **6653** (OpenFlow), only one controller runs at any given time.

### Switching Workflow

```
   [Active: ODL]                                                [Active: ONOS]
         │                                                            │
         ├───► docker stop odl                                        ├───► docker stop onos
         ├───► docker start onos                                      ├───► docker start odl
         ├───► sudo ovs-vsctl set-controller br-int tcp:<ip>:6653     ├───► sudo ovs-vsctl set-controller br-int tcp:<ip>:6653
         └───► Verify in ovs-vswitchd.log                             └───► Verify in ovs-vswitchd.log
```

#### To Switch to OpenDaylight:
```bash
# 1. Swap Docker containers
docker stop onos 2>/dev/null || true
docker start odl

# 2. Re-point br-int controller and manager on DevStack
sudo ovs-vsctl del-controller br-int
sudo ovs-vsctl set bridge br-int protocols=OpenFlow13
sudo ovs-vsctl set-manager ptcp:6640:127.0.0.1 tcp:192.168.122.1:6640
sudo ovs-vsctl set-controller br-int tcp:192.168.122.1:6653

# 3. Verify connection
sudo tail -n 5 /var/log/openvswitch/ovs-vswitchd.log | grep 6653
```

#### To Switch to ONOS:
```bash
# 1. Swap Docker containers
docker stop odl 2>/dev/null || true
docker start onos

# 2. Re-point br-int controller and manager on DevStack
sudo ovs-vsctl del-controller br-int
sudo ovs-vsctl set bridge br-int protocols=OpenFlow13
sudo ovs-vsctl set-manager ptcp:6640:127.0.0.1 tcp:192.168.122.1:6640
sudo ovs-vsctl set-controller br-int tcp:192.168.122.1:6653

# 3. Verify connection
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

---

## 7\. Backend API Reference

All endpoints are hosted by `server.js` (port 5000):

| Endpoint | Method | Description |
| :---- | :---- | :---- |
| `/api/openstack/summary` | `GET` | Aggregated cloud status (VM counts, network counts, quotas, controller state) |
| `/api/openstack/servers` | `GET` | Detailed Nova instance list with IP, flavor, and status mapping |
| `/api/openstack/servers` | `POST` | Launches a new Nova VM instance |
| `/api/openstack/servers/:id` | `DELETE` | Terminates and removes a Nova VM instance |
| `/api/openstack/servers/:id/console` | `POST` | Generates a live noVNC console URL for instance access |
| `/api/openstack/networks` | `GET` | Lists Neutron virtual networks and subnet associations |
| `/api/openstack/security-groups` | `GET` | Lists security groups and active ingress/egress rules |
| `/api/openstack/security-groups` | `POST` | Creates a new security group |
| `/api/openstack/ovn-health` | `GET` | Returns OVN Northbound database and chassis health report (`ovn-nbctl show`) |
| `/api/openstack/vm-topology-map` | `GET` | Correlates Nova VMs to ODL/ONOS `node-connector` bridge ports |
| `/api/openstack/telemetry` | `GET` | Fetches live port packet and byte counters from the active controller |

---

## 8\. Challenges and Solutions

### 8.1 Upstream Obsolescence of ODL NetVirt and ONOS OpenStack Networking
- **Challenge**: Historically, SDN architectures relied on OpenDaylight NetVirt (`odl-netvirt-openstack`) or ONOS SONA (`openstacknetworking`) to act as the authoritative Neutron ML2 driver. However, NetVirt was completely removed in modern ODL releases (Karaf 0.23+ Vanadium), and ONOS OpenStack networking became abandoned and incompatible with modern OVN Geneve encapsulation.
- **Solution**: The integration was redesigned around the **Observer Pattern**. OpenStack native Neutron ML2/OVN handles all authoritative forwarding, routing, and tenant isolation, while ODL and ONOS connect strictly as out-of-band telemetry observers via OVSDB (`port 6640`) and OpenFlow (`port 6653`).

### 8.2 Spurious Host Discovery on OpenStack Topology (Phantom Machines)
- **Challenge**: When the SDN controller's host discovery module (`org.onosproject.hostprovider` or ODL L2 host tracker) observed `br-int`, it automatically registered a "Host" object for every MAC address transmitting packets. Because `br-int` connects router gateway interfaces, DHCP namespace agents, internal OVN patch ports (`patch-br-int-to-ln-*`), and broadcast packets from external bridges, the controller discovered dozens of non-existent "ghost" hosts that were not actual cloud VMs. This severely cluttered the topology visualization with machines that did not belong to the cloud infrastructure.
- **Solution**: Implemented a **cross-source data reconciliation engine** in `server.js` (`/api/openstack/vm-topology-map`) and `TopologyService.jsx`. Instead of naively rendering the raw SDN host list:
  1. The server queries Nova (`/servers/detail`) to obtain the authoritative list of real virtual machine UUIDs and names.
  2. It queries Neutron (`/ports`) and filters strictly for ports owned by compute instances (`device_owner = "compute:nova"`), discarding DHCP, router, and patch interfaces.
  3. It derives the exact OVS interface name (`tap` + first 11 characters of the Neutron port ID).
  4. It compares the computed TAP names and MAC addresses against the controller's active `node-connector` inventory on `br-int`.
  5. The frontend suppresses all non-compute entities, rendering only genuine cloud VMs attached to their verified switch ports with exact IP, MAC, and compute power status.

### 8.3 Incompatibility of Flow Rule Injection with OVN
- **Challenge**: In early prototypes, an attempt was made to push "shadow flows" (such as Table 250 rules) from ODL down to `br-int` to count security group packets. However, writing custom flows into a switch actively managed by OVN introduced operational risks: table collisions, race conditions during OVN recomputations, and architectural contradictions with the observer paradigm.
- **Solution**: Abandoned rule injection in favor of **pure passive observation**. The SDN controller does not install flow rules or modify OVS tables. Instead, it observes bridge topology, interface attachments, and port counters natively exposed by OpenFlow and OVSDB, ensuring 100% data plane safety.

### 8.4 Dynamic Keystone Service Discovery vs. Static URL Fragility
- **Challenge**: OpenStack service URLs vary across deployments (single-node DevStack, multi-node setups, or bridged VMs). Hardcoding endpoints like `NOVA_URL` or `NEUTRON_URL` broke portability and required constant `.env` edits.
- **Solution**: Implemented dynamic Keystone service catalog parsing on initial login. The server retrieves the service catalog from the Keystone token response, dynamically discovers public endpoints for compute, network, and image services, and normalizes API version paths.

### 8.5 OpenStack Nova noVNC Console API Version Fragmentation
- **Challenge**: Different OpenStack microversions expect varying action payload keys (`os-getVNCConsole` vs `remote-consoles`), causing VNC console generation to fail with HTTP 400/404 errors.
- **Solution**: Implemented an adaptive fallback handler in `server.js` that attempts the standard microversion `os-getVNCConsole` payload with type `novnc`, and falls back to Nova v2.6+ `remote-consoles` if rejected.

### 8.6 Dual-Controller Port Collisions & Mutual Exclusion Orchestration
- **Challenge**: ODL and ONOS both require exclusive access to port 8181 (RESTCONF/REST API) and port 6653 (OpenFlow southbound). Running both simultaneously resulted in port binding failures.
- **Solution**: Enforced a mutual exclusion operational model where only one controller runs at any given time. Added the frontend `detectController()` probe and standardized Docker swap commands (`docker stop onos && docker start odl`) along with automated OVS bridge controller re-pointing scripts.

### 8.7 Process Stability Under Virtualized Cloud Latency
- **Challenge**: Network latency or transient timeouts when querying virtualized DevStack services caused unhandled promise rejections that crashed Node.js processes.
- **Solution**: Installed global `process.on("unhandledRejection")` and `process.on("uncaughtException")` handlers. Added deterministic 5-second request timeouts (`AbortSignal.timeout(5000)`) on all external fetch pipelines, returning structured error payloads rather than allowing sockets to hang.

---

## 9\. Limitations

1. **Observer-Only Data Plane**: ODL and ONOS cannot dynamically steer, drop, or reroute production cloud VM traffic. All authoritative forwarding decisions remain strictly within OpenStack's Neutron ML2/OVN pipeline.
2. **No Controller-Enforced ACLs**: Security groups and network access controls are enforced natively by Linux kernel connection tracking (`conntrack`) and OVN flows, not by SDN controller flow rules.
3. **Controller Mutual Exclusion**: ODL and ONOS cannot run concurrently on the same host due to port conflicts on 8181 and 6653. Switching between them requires stopping one container and restarting the other.
4. **DevStack Single-Node Scope**: Tested against single-node DevStack deployments. Multi-node cloud deployments with distributed compute nodes require multi-chassis OVSDB manager attachments.
5. **Host Sudo Requirement for OVN Inspection**: Health verification (`ovn-nbctl show`) requires passwordless sudo privileges on the host running the backend server.
6. **In-Memory Keystone Token Lifecycle**: Keystone tokens are cached in volatile Node.js memory. Restarting the backend server forces re-authentication on the next incoming request.
7. **Single-Project Administrative Boundary**: All Keystone API interactions authenticate using a single administrative project scope (`admin`). Multi-tenant role-based access control (RBAC) is not implemented.
