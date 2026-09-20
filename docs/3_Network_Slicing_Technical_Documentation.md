# Network Slicing on ONOS — Technical Documentation
## Host-Based Slicing with Multi-Switch Routing, QoS, and Intent-Based Networking

> **Project**: INSA SDN Dashboard
> **Subsystem**: Network Slicing Engine

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Environment Setup](#2-environment-setup)
3. [Slice Provisioning Pipeline](#3-slice-provisioning-pipeline)
4. [QoS and DSCP-based Prioritization](#4-qos-and-dscp-based-prioritization)
5. [Intent-Based Networking (IBN) Layer](#5-intent-based-networking-ibn-layer)
6. [Verification & Live Testing](#6-verification--live-testing)
7. [Implementation Details](#7-implementation-details)
8. [Limitations](#8-limitations)

---

## 1. Overview & Architecture

Network slicing creates **isolated virtual network partitions** over a shared physical infrastructure. Each slice is defined by:
- A set of assigned hosts
- A guaranteed bandwidth allocation (enforced via ONOS meters)
- End-to-end OpenFlow forwarding rules (computed paths across multi-switch topologies)
- Cross-slice isolation (drop boundary rules at priority 39000)
- Optional QoS prioritization (DSCP 46 + Queue 0 for URLLC)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Slice Templates                              │
│  eMBB (50 MB/s)  |  URLLC (60 MB/s)  |  mMTC (2 MB/s)  |  Best-Effort│
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        Slice Provisioning                               │
│  1. VLAN ID Assignment                                                  │
│  2. Admission Control (capacity check)                                  │
│  3. Meter Creation (bandwidth enforcement per host per switch)           │
│  4. Multi-Switch Path Computation (BFS shortest path)                   │
│  5. Unicast Forwarding Flows (Priority 40000)                           │
│  6. ARP Broadcast Routing (Priority 40000, ETH_TYPE=0x0806)            │
│  7. Cross-Slice Drop Boundary (Priority 39000)                          │
│  8. DSCP 46 → Queue 0 Priority Flows (Priority 41000, URLLC only)      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                         ONOS Controller                                 │
│    Flow Rules  |  Meters  |  Queue 0 (60 Mbps)  |  Queue 1 (15 Mbps)  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                    Mininet + Open vSwitch                                │
│  s1 (core)  ←→  s2 (leaf)  ←→  s3 (leaf)                              │
│                 h1  h2           h3  h4                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Environment Setup

### Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| **ONOS** | 2.7.0+ | SDN Controller |
| **Mininet** | 2.3.x | Network emulation |
| **Open vSwitch** | 2.17+ | Virtual switch with HTB QoS |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Backend server |
| **npm** | ≥ 10.x (tested with 11.19.0) | Dependency management |
| **Python** | ≥ 3.12 | Intent service (sentence-transformers) |
| **uv** | Latest | Python package manager |
| **iperf** | v2 | Bandwidth testing |
| **tc** (iproute2) | Latest | Traffic control inspection |

### Step 1 — Clone and Install Dependencies

```bash
git clone <repository-url> insa-merged
cd insa-merged
npm install

# For the intent service
cd anomaly
uv sync
cd ..
```

### Step 2 — Start ONOS

```bash
# Docker (recommended)
docker run -d --name onos -p 8181:8181 -p 6653:6653 onosproject/onos:2.7.0

# Activate OpenFlow and forwarding apps
# (via ONOS CLI: ssh -p 8101 onos@localhost, password: rocks)
app activate org.onosproject.openflow
app activate org.onosproject.fwd
```

### Step 3 — Start Mininet with Multi-Switch Topology

```bash
# Example: 3-switch tree topology with 4 hosts
sudo mn --controller=remote,ip=<onos-ip>,port=6653 \
        --topo=tree,2,2 \
        --switch=ovsk,protocols=OpenFlow13

# Or a custom topology:
sudo mn --controller=remote,ip=<onos-ip>,port=6653 \
        --topo=linear,3 \
        --switch=ovsk,protocols=OpenFlow13 \
        --mac
```

### Step 4 — Configure OVS HTB Queues

Copy the QoS setup script to the Mininet VM and run it:

```bash
# On Mininet VM
sudo bash setup_mininet_qos.sh --auto
```

This configures (`scripts/setup_mininet_qos.sh`):
- **Queue 0** (High Priority / URLLC): 60 Mbps guaranteed, Priority 1
- **Queue 1** (Standard / Best Effort): 15 Mbps guaranteed, Priority 2
- **Total Link Ceiling**: 80 Mbps

### Step 5 — Configure `.env`

```bash
ONOS_URL=http://localhost:8181
ONOS_USERNAME=onos
ONOS_PASSWORD=rocks
MININET_HOST=192.168.122.88
MININET_USER=mininet
MININET_SSH_KEY=/home/<user>/.ssh/id_main
```

### Step 6 — Start Backend Services

```bash
# Terminal 1: ONOS backend server
npm run server:onos

# Terminal 2: Intent service (optional, for IBN)
npm run intent:service

# Terminal 3: Frontend
npm run dev
```

---

## 3. Slice Provisioning Pipeline

The complete slice creation flow is implemented in `src/api/slicingService.js`:

### Step 1 — Admission Control

Before creating a slice, the system verifies that the requested bandwidth fits within the remaining physical capacity pool:

```javascript
const currentAllocated = existingSlices.reduce((sum, s) => sum + s.bandwidth, 0);
const totalCapacity = getNetworkCapacity();  // Default: 100,000 KB/s

if (currentAllocated + requestedBandwidth > totalCapacity) {
    throw new Error("Admission Control Rejected: ...");
}
```

### Step 2 — VLAN ID Assignment

Each slice gets a unique VLAN ID starting from 100, auto-incrementing:

```javascript
function getNextVlanId() {
    const usedVlans = new Set(slices.map(s => s.vlanId));
    let candidate = parseInt(localStorage.getItem(VLAN_COUNTER_KEY) || "100");
    while (usedVlans.has(candidate)) candidate++;
    return candidate;
}
```

### Step 3 — Meter Creation

For each host in the slice, a meter is created on the host's ingress switch:

```javascript
const meterBody = {
    deviceId,
    unit: "KB_PER_SEC",
    bands: [{ type: "DROP", rate: bandwidth, burstSize }],
};
const meterRes = await createMeter(deviceId, meterBody);
```

The meter enforces the slice's bandwidth by dropping excess traffic.

### Step 4 — Cross-Slice Isolation

A **Priority 39000 Drop Rule** is installed per host on its ingress switch. This ensures any traffic from this host that does NOT match a slice forwarding rule (Priority 40000) is dropped:

```javascript
const dropFlow = {
    priority: 39000,
    deviceId,
    treatment: { instructions: [] },  // No instructions = DROP
    selector: {
        criteria: [
            { type: "IN_PORT", port: Number(port) },
            { type: "ETH_SRC", mac: hostMac },
        ],
    },
};
```

This creates a **default-deny** boundary: hosts can ONLY communicate with other hosts in the same slice.

### Step 5 — Multi-Switch Path Computation

Uses **BFS shortest path** to find the path between any two host switches:

```javascript
function findSwitchPath(srcDev, dstDev, links, srcHostPort, dstHostPort) {
    // Same switch → single hop
    if (srcDev === dstDev) return [{ deviceId: srcDev, inPort, outPort }];
    
    // Build adjacency graph from ONOS links
    // BFS to find shortest path
    // Returns array of hops: [{ deviceId, inPort, outPort }]
}
```

For a topology `h1→s2→s1→s3→h4`, this returns:
```
[
  { deviceId: "of:0002", inPort: 2, outPort: 1 },  // s2: h1's port → trunk to s1
  { deviceId: "of:0001", inPort: 1, outPort: 2 },  // s1: trunk from s2 → trunk to s3
  { deviceId: "of:0003", inPort: 1, outPort: 2 },  // s3: trunk from s1 → h4's port
]
```

### Step 6 — Unicast Forwarding Flows

For every pair of hosts (A, B) in the slice, **end-to-end forwarding flows** are installed along every hop:

```javascript
const unicastFlow = {
    priority: 40000,
    deviceId: hop.deviceId,
    treatment: {
        instructions: [
            // Meter on ingress only
            ...(isIngress && meterId ? [{ type: "METER", meterId }] : []),
            // Queue assignment for URLLC
            ...(isLowLatency ? [{ type: "QUEUE", queueId: 1 }] : []),
            { type: "OUTPUT", port: hop.outPort },
        ],
    },
    selector: {
        criteria: [
            { type: "IN_PORT", port: hop.inPort },
            { type: "ETH_SRC", mac: hostA.mac },
            { type: "ETH_DST", mac: hostB.mac },
        ],
    },
};
```

### Step 7 — ARP Broadcast Routing

ARP broadcasts are routed **only within the slice** using consolidated multi-port output flows:

```javascript
const arpFlow = {
    priority: 40000,
    treatment: {
        instructions: outputPorts.map(p => ({ type: "OUTPUT", port: p })),
    },
    selector: {
        criteria: [
            { type: "IN_PORT", port: inPort },
            { type: "ETH_TYPE", ethType: 2054 },  // ARP
            { type: "ETH_SRC", mac: hostMac },
        ],
    },
};
```

---

## 4. QoS and DSCP-based Prioritization

### OVS HTB Queue Configuration (`scripts/setup_mininet_qos.sh`)

```bash
ovs-vsctl set port "$PORT" qos=@newqos -- \
    --id=@newqos create qos type=linux-htb \
        other-config:max-rate="${TOTAL_RATE}" \
        queues:0=@q0 queues:1=@q1 -- \
    --id=@q0 create queue \
        other-config:min-rate="${Q0_MIN_RATE}" \   # 60 Mbps
        other-config:max-rate="${TOTAL_RATE}" \     # 80 Mbps
        other-config:priority=1 -- \
    --id=@q1 create queue \
        other-config:min-rate="${Q1_MIN_RATE}" \    # 15 Mbps
        other-config:max-rate="${TOTAL_RATE}" \     # 80 Mbps
        other-config:priority=2
```

### DSCP 46 Priority Flows (URLLC Slices)

For URLLC (`low-latency`) type slices, an additional **Priority 41000** flow is installed at every hop that matches DSCP 46 traffic and directs it to Queue 0:

```javascript
const dscp46Flow = {
    priority: 41000,
    treatment: {
        instructions: [
            { type: "QUEUE", queueId: 0 },      // High-priority queue
            { type: "OUTPUT", port: hop.outPort },
        ],
    },
    selector: {
        criteria: [
            { type: "ETH_TYPE", ethType: 2048 },  // IPv4
            { type: "IP_DSCP", ipDscp: 46 },      // Expedited Forwarding
            { type: "IN_PORT", port: hop.inPort },
            { type: "ETH_SRC", mac: hostA.mac },
            { type: "ETH_DST", mac: hostB.mac },
        ],
    },
};
```

### Flow Priority Hierarchy

| Priority | Purpose | Scope |
|----------|---------|-------|
| **41000** | DSCP 46 → Queue 0 (URLLC only) | Per hop, per host pair |
| **40000** | Unicast forwarding + ARP | Per hop, per host pair |
| **39000** | Cross-slice drop boundary | Per host, ingress switch |
| **Default** | ONOS reactive forwarding | All unmatched traffic |

---

## 5. Intent-Based Networking (IBN) Layer

### Local Neural Intent Service (`anomaly/intent_service.py`)

The system includes an **offline, privacy-preserving** NLP engine for natural language → slice configuration:

| Property | Value |
|----------|-------|
| Model | `all-MiniLM-L6-v2` (Sentence Transformers) |
| Port | 5005 |
| Latency | < 12ms on CPU |
| Cloud dependency | **None** — runs 100% locally |

#### Semantic Profile Matching

The engine embeds the user's natural language intent and compares it against pre-defined 3GPP slice profiles using cosine similarity:

```python
PROFILES = {
    "embb": {
        "text": "Enhanced Mobile Broadband eMBB high bandwidth ... streaming ...",
        "default_bandwidth": 35000,  # KB/s
        "dscp": "AF31",
    },
    "urllc": {
        "text": "Ultra-Reliable Low Latency URLLC mission critical ...",
        "default_bandwidth": 15000,
        "dscp": "EF (46)",
    },
    "mmtc": {
        "text": "Massive Machine Type mMTC IoT sensors ...",
        "default_bandwidth": 1000,
        "dscp": "AF11",
    },
    "best-effort": {
        "text": "Standard best-effort general browsing ...",
        "default_bandwidth": 5000,
        "dscp": "Default (CS0)",
    },
}
```

**Example**: User types "I need a slice for live 4K video streaming" → cosine similarity match → **eMBB** profile selected → auto-configured with 35 MB/s bandwidth.

#### API Endpoints (Intent Service — Port 5005)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health and model status |
| `POST` | `/compile` | Compile natural language → slice config |

---

## 6. Verification & Live Testing

### Live Verification Endpoints (`server-onos.js`)

The system provides **real measurement** verification by executing commands inside Mininet host network namespaces:

| Endpoint | Test | What It Measures |
|----------|------|-----------------|
| `POST /api/onos/verify/ping` | Ping test | Latency (avg, min, max, jitter), packet loss |
| `POST /api/onos/verify/iperf` | Bandwidth test (iperf v2 UDP) | Achieved bandwidth, jitter, packet loss |
| `GET /api/onos/verify/queues` | OVS queue inspection | tc class stats, QoS/queue records |
| `GET /api/onos/verify/dscp` | DSCP flow verification | ONOS DSCP flows + OVS flow dumps |
| `POST /api/onos/verify/compare` | Multi-test comparison | Runs ping + iperf for multiple host pairs |

### Execution Method

Tests run inside Mininet host namespaces using `mnexec`:

```bash
# Find host PID
pgrep -f "mininet:h1"

# Execute ping inside h1's network namespace
sudo mnexec -a <pid> ping -c 10 -i 0.2 10.0.0.2
```

### Parsed Output

Ping results are parsed into structured JSON:
```json
{
    "avg": 0.342,
    "min": 0.089,
    "max": 1.234,
    "jitter": 0.156,
    "packetLoss": 0.0,
    "count": 10,
    "rtts": [0.089, 0.156, ...]
}
```

iperf results are parsed similarly:
```json
{
    "bandwidth": 48.5,
    "bandwidthUnit": "Mbits/sec",
    "transfer": 18.2,
    "jitter": 0.034,
    "lostPackets": 2,
    "totalPackets": 13020,
    "packetLoss": 0.015
}
```

---

## 7. Implementation Details

### Slice Templates (`src/api/slicingService.js`)

| Template | Bandwidth | Burst | Color | Type | Special |
|----------|-----------|-------|-------|------|---------|
| **eMBB** | 50,000 KB/s | 10,000 | Purple | `broadband` | — |
| **URLLC** | 60,000 KB/s | 10,000 | Red | `low-latency` | DSCP 46, Queue 0 |
| **mMTC** | 2,000 KB/s | 500 | Green | `iot` | — |
| **Best Effort** | 1,000 KB/s | 200 | Gray | `standard` | — |

### Topology-Aware Host Discovery

The `getTopologyInfo()` function uses a **3-layer aggregation** strategy:

1. **Live ONOS hosts** — Real-time discovered hosts from ONOS API
2. **Saved slice hosts** — Previously assigned hosts from stored slices
3. **Complementary leaf endpoints** — Auto-generated placeholder hosts for leaf switches

Inter-switch trunk ports are automatically excluded to prevent hosts from being assigned to switch-to-switch links.

### Slice Data Persistence

Slices are stored in both:
- **localStorage** (frontend, immediate)
- **SQLite** (backend, durable, via `server-onos.js`)

On load, `fetchSlicesFromDb()` first tries the backend SQLite, then falls back to localStorage.

### SQLite Schema

```sql
CREATE TABLE onos_slices (
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
);

CREATE TABLE onos_slice_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_capacity_kbps INTEGER DEFAULT 100000,
    vlan_counter INTEGER DEFAULT 100,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Flow Rule Architecture per Slice

For a 2-host slice (h1 on s2, h3 on s3) in a tree topology (s2→s1→s3):

| # | Device | Priority | Match | Action |
|---|--------|----------|-------|--------|
| 1 | s2 | 39000 | IN_PORT=2, ETH_SRC=h1 | DROP (isolation boundary) |
| 2 | s3 | 39000 | IN_PORT=2, ETH_SRC=h3 | DROP (isolation boundary) |
| 3 | s2 | 40000 | IN=2, SRC=h1, DST=h3 | METER + OUTPUT:1 (h1→s1) |
| 4 | s1 | 40000 | IN=1, SRC=h1, DST=h3 | OUTPUT:2 (s2→s3) |
| 5 | s3 | 40000 | IN=1, SRC=h1, DST=h3 | OUTPUT:2 (→h3) |
| 6 | s3 | 40000 | IN=2, SRC=h3, DST=h1 | METER + OUTPUT:1 (h3→s1) |
| 7 | s1 | 40000 | IN=2, SRC=h3, DST=h1 | OUTPUT:1 (s3→s2) |
| 8 | s2 | 40000 | IN=1, SRC=h3, DST=h1 | OUTPUT:2 (→h1) |
| 9 | s2 | 40000 | IN=2, ARP, SRC=h1 | OUTPUT:1 (ARP broadcast) |
| 10 | s1 | 40000 | IN=1, ARP, SRC=h1 | OUTPUT:2 (ARP relay) |
| 11 | s3 | 40000 | IN=1, ARP, SRC=h1 | OUTPUT:2 (ARP to h3) |

For **URLLC slices**, additional Priority 41000 flows add `QUEUE:0` for DSCP 46 traffic.

### Network Capacity Defaults

```javascript
DEFAULT_TOTAL_CAPACITY_KBPS = 100000;  // 100 MB/s (800 Mbps)
```

The capacity pool is configurable via the UI and stored in both localStorage and SQLite.

### Slice YAML Configuration (`slices.yaml`)

```yaml
default_max_rate: 1000000000   # 1 Gbps port ceiling

slices:
  - name: low-latency
    queue_id: 0
    priority: high
    min_rate: 400000000        # guaranteed 400 Mbps
    match:
      type: vlan
      vlan_id: 10

  - name: research
    queue_id: 1
    priority: medium
    min_rate: 300000000
    match:
      type: vlan
      vlan_id: 20

  - name: guest
    queue_id: 2
    priority: low
    min_rate: 200000000
    match:
      type: vlan
      vlan_id: 30
```

---

## 8. Limitations

1. **No VLAN Tag Enforcement**: VLAN IDs are assigned and tracked, but ONOS flow rules use MAC-based matching (ETH_SRC/ETH_DST) rather than VLAN tag push/pop. VLAN isolation is logical only (tracked in metadata), not enforced in the data plane.

2. **Static Path Computation**: The BFS shortest path is computed once at slice creation time. If the topology changes (link failure, switch addition), the slice forwarding rules are NOT automatically recalculated.

3. **No Path Failover**: If a link along a slice's forwarding path goes down, traffic is dropped. There is no fast-reroute or backup path mechanism.

4. **MAC-Dependent Isolation**: Cross-slice isolation relies on `ETH_SRC` MAC matching. Synthetic/placeholder hosts (MAC `00:00:00:00:00:0X`) use weaker isolation (IN_PORT only), which can be bypassed if a host spoofs its MAC.

5. **QoS Requires Manual Setup**: The OVS HTB queue configuration (`setup_mininet_qos.sh`) must be run manually on the Mininet VM before URLLC slices can enforce queue-based prioritization. If the script is not run, `QUEUE:0` instructions in flows silently fall back to default queuing.

6. **Single Queue Tier**: The system only supports 2 queues (Queue 0 for URLLC, Queue 1 for standard). 5G-compliant slicing requires more granular QoS classes (e.g., per-slice dedicated queues).

7. **Admission Control is Soft**: The bandwidth capacity pool check is based on configured slice bandwidths, not actual measured throughput. A slice with 50 MB/s allocated but only using 5 MB/s still counts as 50 MB/s used.

8. **No Slice Lifecycle Management**: Slices persist indefinitely. There is no TTL, automatic decommissioning, or scaling mechanism.

9. **Mininet-Only Verification**: The live ping/iperf/queue verification endpoints require a Mininet topology running via SSH. They cannot test real hardware switches.

10. **ARP Broadcast Scope**: ARP broadcasts are routed to all hosts in the same slice, which is correct for isolation but creates O(n²) flow rules for n hosts in a slice. Large slices (> 10 hosts) generate a very large number of flows.

11. **Intent Service Model Download**: The `all-MiniLM-L6-v2` model (~80 MB) is downloaded from HuggingFace on first run. In air-gapped environments, it must be pre-cached. The `local_files_only=True` parameter is tried first but falls back to downloading.

12. **No Inter-Slice Communication Policy**: There is no mechanism to define controlled communication between slices. All cross-slice traffic is unconditionally dropped by the Priority 39000 boundary rules.

13. **OVS Queue Persistence**: OVS QoS/queue configurations are volatile. They are lost on OVS restart and must be re-applied.
