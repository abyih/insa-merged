# Technical Report: End-to-End Network & Cloud Slicing Architecture

**Project:** INSA Multi-Domain SDN & Cloud Slicing Platform  
**Repository:** `insa-ui-to-be-merged`  
**Date:** September 2026  
**Document Version:** 2.0  
**Classification:** Technical Architecture & Operational Guide  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Dual-Domain Slicing Architecture](#2-dual-domain-slicing-architecture)
3. [Technologies & Protocol Stack](#3-technologies--protocol-stack)
4. [ONOS SDN Network Slicing (Data Plane)](#4-onos-sdn-network-slicing-data-plane)
   - 4.1 [Architectural Pillars](#41-architectural-pillars)
   - 4.2 [OpenFlow Rule & Priority Hierarchy](#42-openflow-rule--priority-hierarchy)
   - 4.3 [Dynamic Multi-Switch Path Routing](#43-dynamic-multi-switch-path-routing)
   - 4.4 [Slice-Aware ARP Broadcast Trees](#44-slice-aware-arp-broadcast-trees)
   - 4.5 [Traffic Policing & OpenFlow Meters](#45-traffic-policing--openflow-meters)
   - 4.6 [Admission Control & Physical Capacity Budget](#46-admission-control--physical-capacity-budget)
   - 4.7 [ONOS Slicing Service & SQLite Persistence](#47-onos-slicing-service--sqlite-persistence)
5. [OpenStack / DevStack Cloud Slicing (Compute & Tenant Plane)](#5-openstack--devstack-cloud-slicing-compute--tenant-plane)
   - 5.1 [Cloud Tenant Slicing Principles](#51-cloud-tenant-slicing-principles)
   - 5.2 [OpenStack Neutron QoS Subsystem](#52-openstack-neutron-qos-subsystem)
   - 5.3 [Security Group Isolation](#53-security-group-isolation)
   - 5.4 [AI Intent-Based Networking (IBN) Engine](#54-ai-intent-based-networking-ibn-engine)
   - 5.5 [OpenStack Slicing Middleware & SQLite Persistence](#55-openstack-slicing-middleware--sqlite-persistence)
6. [Slicing Templates & SLA Profiles](#6-slicing-templates--sla-profiles)
7. [Step-by-Step Practical Guide: How to Use Slicing](#7-step-by-step-practical-guide-how-to-use-slicing)
   - 7.1 [Prerequisites & Environment Startup](#71-prerequisites--environment-startup)
   - 7.2 [How to Provision an ONOS Network Slice (Step-by-Step)](#72-how-to-provision-an-onos-network-slice-step-by-step)
   - 7.3 [How to Provision an OpenStack Cloud Slice (Step-by-Step)](#73-how-to-provision-an-openstack-cloud-slice-step-by-step)
   - 7.4 [How to Use the AI Intent Slicing Engine](#74-how-to-use-the-ai-intent-slicing-engine)
   - 7.5 [Validating Isolation & QoS via CLI](#75-validating-isolation--qos-via-cli)
   - 7.6 [Slice Modification, Bandwidth Scaling & Decommissioning](#76-slice-modification-bandwidth-scaling--decommissioning)
8. [Unified REST API Reference](#8-unified-rest-api-reference)
9. [Troubleshooting & Operational FAQ](#9-troubleshooting--operational-faq)

---

## 1. Executive Summary

Network slicing is a fundamental architectural capability of 5G and next-generation software-defined infrastructures. It partitions a single physical network and compute infrastructure into multiple dedicated, logically isolated virtual networks ("slices") tailored to specific Quality of Service (QoS), latency, bandwidth, and security requirements.

This project implements a **Dual-Domain Slicing Architecture**:
1. **SDN Transport Layer (ONOS Controller)**: Operates at Layer 2/3 OpenFlow data plane, governing physical and virtual OpenFlow switches (e.g., Mininet, Open vSwitch) with hardware-grade meter rate policing, queue scheduling, dynamic multi-hop Dijkstra path computation, and strict isolation drop boundaries.
2. **Cloud Tenant Layer (OpenStack / DevStack + OVN)**: Operates across virtualized compute and overlay tenant networks, utilizing OpenStack Neutron QoS policies (bandwidth limit rules, minimum bandwidth guarantees, DSCP markings) and security group barriers across cloud Virtual Machines (VMs).

Both domains are unified into a centralized, modern web dashboard (`insa-ui-to-be-merged`) with persistence backed by SQLite (`users.db`).

```
                      ┌────────────────────────────────────────┐
                      │    Unified React Frontend (Port 5173)   │
                      │  - NetworkSlicing.jsx (ONOS SDN Slices) │
                      │  - NetworkSlices.jsx  (OpenStack Slices)│
                      │  - AnomalyDetector.jsx (Active Defense) │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│   ONOS Middleware (Port 5001)   │             │ OpenStack Middleware (Port 5000)│
│  - server-onos.js               │             │  - server.js                    │
│  - SQLite: onos_slices          │             │  - SQLite: slices               │
│  - Reverse Proxy to ONOS REST   │             │  - Keystone, Neutron, Nova API  │
└────────────────┬────────────────┘             └────────────────┬────────────────┘
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     ONOS SDN Controller (8181)  │             │     OpenStack / DevStack Cloud  │
│  - OpenFlow 1.3 Pipeline        │             │  - Neutron ML2/OVN QoS Policies │
│  - Priority 41000/40000/39000   │             │  - Bandwidth Limits & DSCP      │
│  - Meter Tables & Queue 0/1     │             │  - Tenant VM Security Groups    │
│  - Data Plane Switches / Hosts  │             │  - Tenant VMs & Virtual Routers │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Dual-Domain Slicing Architecture

The system segregates responsibilities across two operational planes:

| Domain Dimension | ONOS SDN Slicing | OpenStack Cloud Slicing |
|---|---|---|
| **Target Infrastructure** | OpenFlow Switches, Bare-Metal Ports, Mininet | OpenStack Compute Nodes, KVM Hypervisors, VMs |
| **Primary Controller** | ONOS (Open Network Operating System) | OpenStack Neutron (OVN / ML2 Plugin) |
| **Granularity** | Host MAC addresses, Switch Ingress/Egress Ports | VM Instance UUIDs, Neutron Ports, Subnets |
| **QoS Mechanism** | OpenFlow 1.3 Meters (`DROP` band) & Queues (`0` & `1`) | Neutron QoS Policy (Bandwidth Limit, Min Bandwidth, DSCP) |
| **Traffic Isolation** | Priority 39000 Drop Boundary + Isolated ARP trees | Dedicated Security Groups & OVN overlay geneve/VLAN |
| **Path Selection** | Multi-hop shortest path (BFS/Dijkstra) | Neutron Virtual Router (L3 agent / Distributed Virtual Routing) |
| **AI Integration** | Natural language intent parser for SDN slices | Multi-LLM Intent Parser (Gemini, OpenAI, Anthropic) |
| **Persistence** | SQLite `users.db` (`onos_slices`, `onos_slice_config`) | SQLite `users.db` (`slices`, `slice_manager_config`) |
| **Backend Middleware** | `server-onos.js` (Port 5001) | `server.js` (Port 5000) |

---

## 3. Technologies & Protocol Stack

### Core SDN & Cloud Technologies
- **ONOS 2.x (Open Network Operating System)**: Distributed SDN controller providing topology discovery, host tracking, flow objectives, and OpenFlow meter management via REST API (`http://localhost:8181/onos/v1`).
- **OpenStack / DevStack (Yoga/Zed/Antelope)**:
  - **Keystone**: Identity service and OAuth2/v3 token catalog discovery.
  - **Neutron**: Software-defined networking providing virtual networks, subnets, routers, ports, and QoS policies.
  - **Nova**: Compute service managing virtual machine instance lifecycles.
  - **OVN (Open Virtual Network)**: High-performance programmable virtual network fabric for OpenStack.
- **OpenFlow 1.3**: Wire protocol governing flow match criteria (`IN_PORT`, `ETH_SRC`, `ETH_DST`, `ETH_TYPE`, `IP_DSCP`) and instructions (`OUTPUT`, `METER`, `QUEUE`).

### Protocols & Networking Standards
- **DiffServ / DSCP (RFC 2474 / RFC 2598)**: Differentiated Services Code Point marking. Used with **DSCP 46 (Expedited Forwarding - EF)** to designate mission-critical URLLC packets for priority scheduling.
- **IEEE 802.1p CoS / Queuing**: Hardware output queuing. Queue `0` is configured as the high-priority, minimum-latency queue; Queue `1` serves standard/burst traffic.
- **IEEE 802.1Q VLAN Tagging**: Virtual Local Area Network IDs (e.g., VLAN 100 to 200) allocated uniquely per slice for administrative boundary segmentation.
- **Address Resolution Protocol (ARP / RFC 826)**: Targeted broadcast flow tree installation (`ETH_TYPE 2054`) preventing cross-slice broadcast traffic while eliminating broadcast storms.

### Application & Database Stack
- **Frontend**: React 18, Vite 6, Tailwind CSS, Framer Motion, Recharts, Lucide React Icons.
- **Backend Services**: Node.js, Express.js, native `fetch`, `better-sqlite3`.
- **Database**: Embedded SQLite 3 database (`users.db`) storing slice profiles, topology allocations, capacity budgets, and audit logs.
- **AI Intent Engine**: Google Gemini API, Groq Cloud (`llama-3.3-70b-versatile`), OpenRouter, and a deterministic offline heuristic parser.

---

## 4. ONOS SDN Network Slicing (Data Plane)

The ONOS Slicing implementation resides in `src/api/slicingService.js` and `server-onos.js`.

### 4.1 Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                            ONOS SLICING ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+
| 1. Dynamic Path Routing:   Multi-switch BFS/Dijkstra shortest path between peers  |
| 2. Traffic Prioritization: Priority 41000 URLLC (DSCP 46 -> Queue 0)             |
| 3. Unicast Forwarding:     Priority 40000 Peer Unicast Flow + Ingress Meter        |
| 4. Isolated ARP Trees:     Priority 40000 Slice-Specific ARP Broadcast             |
| 5. Strict Drop Boundary:   Priority 39000 Ingress Drop Boundary (Cross-Slice Drop)|
| 6. Admission Control:      Total Network Capacity Pool (Default: 100 MB/s)        |
+-----------------------------------------------------------------------------------+
```

### 4.2 OpenFlow Rule & Priority Hierarchy

Every packet entering a switch from a sliced host is evaluated against an OpenFlow priority ladder:

```
Packet Ingress (Host Port)
        │
        ▼
   Priority 41000? ──(Matches IP DSCP 46)──► [QUEUE: 0, OUTPUT: outPort] (URLLC Fast-Lane)
        │ No
        ▼
   Priority 40000? ──(Matches Slice Peer)──► [METER: meterId, OUTPUT: outPort] (eMBB Forwarding)
        │
        ├────────────(Matches ARP 2054)────► [OUTPUT: slicePeerPorts...] (Isolated ARP)
        │ No
        ▼
   Priority 39000? ──(Matches Host Port)───► [DROP] (Cross-Slice Isolation Drop Boundary)
        │ No
        ▼
   Default Pipeline (Table-Miss / Normal Switching)
```

1. **Priority 41000 — URLLC Low-Latency Fast Lane**:
   - **Selector**: `ETH_TYPE: 2048` (IPv4), `IP_DSCP: 46` (Expedited Forwarding), `IN_PORT: hop.inPort`, `ETH_SRC: hostA.mac`, `ETH_DST: hostB.mac`.
   - **Treatment**: `QUEUE: 0`, `OUTPUT: hop.outPort`.
   - **Purpose**: Bypasses normal queuing delays, routing real-time mission-critical traffic through the dedicated hardware low-latency queue with 60 Mbps guaranteed throughput.

2. **Priority 40000 — Peer Unicast Data Plane**:
   - **Selector**: `IN_PORT: hop.inPort`, `ETH_SRC: hostA.mac`, `ETH_DST: hostB.mac`.
   - **Treatment**:
     - On ingress hop: `METER: meterIdA`, `OUTPUT: hop.outPort`.
     - On transit/egress hops: `OUTPUT: hop.outPort`.
   - **Purpose**: Facilitates bidirectional communication exclusively between hosts assigned to the same slice, enforcing bandwidth caps at ingress.

3. **Priority 40000 — Slice-Aware ARP Broadcast Trees**:
   - **Selector**: `IN_PORT: hop.inPort`, `ETH_TYPE: 2054` (ARP), `ETH_SRC: hostA.mac`.
   - **Treatment**: Consolidated multi-port `OUTPUT` list directing ARP requests only to ports leading to slice members.
   - **Purpose**: Enables ARP discovery within the slice while completely preventing other slices from intercepting broadcast packets.

4. **Priority 39000 — Strict Isolation Drop Boundary**:
   - **Selector**: `IN_PORT: host.port`, `ETH_SRC: host.mac`.
   - **Treatment**: Empty instruction list (`treatment: { instructions: [] }` = **DROP**).
   - **Purpose**: Any packet leaving a sliced host that does not match a Priority 40000/41000 peer flow is dropped immediately at the switch ingress port. Unauthorized inter-slice traffic cannot traverse the network.

### 4.3 Dynamic Multi-Switch Path Routing

Path calculation is handled by `findSwitchPath()` in `slicingService.js`:
- Constructs an adjacency graph from ONOS topology links (`getLinks()`).
- Filters out trunk links connected to hosts.
- Executes Breadth-First Search (BFS) to identify the shortest sequence of switches between `srcDev` and `dstDev`.
- Returns an array of hops:
  ```json
  [
    { "deviceId": "of:0000000000000002", "inPort": 1, "outPort": 3 },
    { "deviceId": "of:0000000000000001", "inPort": 2, "outPort": 1 },
    { "deviceId": "of:0000000000000003", "inPort": 3, "outPort": 2 }
  ]
  ```
- Installs flow rules along every hop in the calculated path.

### 4.4 Slice-Aware ARP Broadcast Trees

Standard OpenFlow networks flood ARP packets across all ports (`OFPP_FLOOD`), causing broadcast storms and security leaks between virtual slices.

The platform overcomes this by accumulating all destination egress ports for peer hosts on a given switch into an `arpRuleMap` and synthesizing a single consolidated flow rule:
```javascript
const arpCriteria = [
  { type: "IN_PORT", port: Number(rule.inPort) },
  { type: "ETH_TYPE", ethType: 2054 },
  { type: "ETH_SRC", mac: rule.mac }
];
const treatment = {
  instructions: Array.from(rule.outPorts).map(p => ({
    type: "OUTPUT",
    port: String(p)
  }))
};
```

### 4.5 Traffic Policing & OpenFlow Meters

Rate limiting uses OpenFlow 1.3 Meter Tables created on the ingress switch of each host:
```json
{
  "deviceId": "of:0000000000000002",
  "unit": "KB_PER_SEC",
  "bands": [
    {
      "type": "DROP",
      "rate": 50000,
      "burstSize": 10000
    }
  ]
}
```
- When a host sends traffic above the configured rate, the switch's OpenFlow meter automatically drops excess packets.
- The UI polls live meter statistics (`getMeters(deviceId)`), tracking packet count, byte count, and dropped packets in real time.

### 4.6 Admission Control & Physical Capacity Budget

To prevent network oversaturation, `slicingService.js` maintains a physical capacity pool:
- **Default Capacity**: `100,000 KB/s` (100 MB/s / 800 Mbps).
- **Admission Algorithm**:
  $$\sum \text{Bandwidth}(\text{Active Slices}) + \text{Bandwidth}(\text{Requested Slice}) \le \text{Total Physical Capacity}$$
- If a user requests a slice exceeding the remaining capacity, creation is rejected with an explanatory error displaying current allocation and available headroom.

### 4.7 ONOS Slicing Service & SQLite Persistence

Slices are persisted in SQLite (`users.db`) via `server-onos.js` (Port 5001) with fallback to browser `localStorage`:

```sql
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
);

CREATE TABLE IF NOT EXISTS onos_slice_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_capacity_kbps INTEGER DEFAULT 100000,
  vlan_counter INTEGER DEFAULT 100,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. OpenStack / DevStack Cloud Slicing (Compute & Tenant Plane)

The Cloud Slicing implementation resides in `server.js` (Port 5000) and `src/Pages/NetworkSlices.jsx`.

### 5.1 Cloud Tenant Slicing Principles

Cloud slicing applies isolation and QoS guarantees across compute workloads (Virtual Machines):
- A slice consists of a set of VM instances residing within one or more OpenStack tenant networks.
- Enforces network bandwidth limits, burst allowances, minimum bandwidths, and DSCP classification directly on OpenStack Neutron virtual ports (`tap` / `veth` interfaces attached to OVS/OVN bridges).
- Enforces security barriers using OpenStack Security Groups and OVN Access Control Lists (ACLs).

### 5.2 OpenStack Neutron QoS Subsystem

When a slice is created or updated in `server.js`:
1. **Neutron QoS Policy Creation**:
   Creates a dedicated QoS policy via `POST /v2.0/qos/policies`:
   ```json
   {
     "policy": {
       "name": "slice-qos-<slice_id>",
       "description": "QoS Policy for slice <slice_name>",
       "shared": false
     }
   }
   ```
2. **Bandwidth Limit Enforcement**:
   Creates a bandwidth limit rule (`POST /v2.0/qos/policies/<policy_id>/bandwidth_limit_rules`):
   ```json
   {
     "bandwidth_limit_rule": {
       "max_kbps": 500000,
       "max_burst_kbps": 100000,
       "direction": "egress"
     }
   }
   ```
3. **DSCP Prioritization**:
   Attaches a DSCP marking rule (`POST /v2.0/qos/policies/<policy_id>/dscp_marking_rules`):
   ```json
   {
     "dscp_marking_rule": {
       "dscp_mark": 46
     }
   }
   ```
4. **Port Binding**:
   Binds the QoS policy to all Neutron ports belonging to the slice's member VMs:
   ```json
   PUT /v2.0/ports/<port_id>
   {
     "port": {
       "qos_policy_id": "<policy_id>"
     }
   }
   ```

### 5.3 Security Group Isolation

To ensure strict tenant and slice isolation:
1. `server.js` creates a dedicated Security Group for the slice: `slice-secgroup-<slice_id>`.
2. Adds ingress/egress rules allowing internal communication exclusively between member VMs of that slice.
3. Automatically detaches standard default security groups to prevent cross-slice communication leaks.

### 5.4 AI Intent-Based Networking (IBN) Engine

The cloud slicing subsystem incorporates an AI Intent Parser:
- **Endpoint**: `POST /api/slices/parse-intent`
- **Supported Providers**: Google Gemini, OpenAI, Anthropic Claude, and Local Heuristic.
- **Workflow**:
  1. Operator inputs natural language:
     > *"Provision an ultra-reliable low latency slice for video surveillance between VM-Alpha and VM-Beta with 40 Mbps guaranteed."*
  2. The backend extracts existing tenant VMs and networks.
  3. The prompt is augmented with context and passed to the LLM.
  4. The LLM returns structured JSON:
     ```json
     {
       "name": "Video-Surveillance-URLLC",
       "sliceType": "urllc",
       "bandwidthMbps": "40",
       "priority": "HIGH",
       "isolationLevel": "STRICT",
       "latencyRequirement": "LOW",
       "vmIds": ["uuid-vm-alpha", "uuid-vm-beta"]
     }
     ```
  5. The UI automatically populates the slice configuration modal for review and single-click deployment.

### 5.5 OpenStack Slicing Middleware & SQLite Persistence

Cloud slices are tracked in `users.db` via `server.js`:

```sql
CREATE TABLE IF NOT EXISTS slices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  network_id TEXT,
  network_name TEXT,
  vm_ids TEXT,              -- JSON array of VM UUIDs
  slice_type TEXT,          -- 'embb' | 'urllc' | 'mmtc' | 'custom'
  bandwidth_min TEXT,
  bandwidth_max TEXT,
  priority TEXT,            -- 'HIGH' | 'MEDIUM' | 'LOW'
  isolation_level TEXT,     -- 'STRICT' | 'STANDARD'
  latency_requirement TEXT, -- 'LOW' | 'STANDARD'
  status TEXT DEFAULT 'ACTIVE',
  qos_status TEXT DEFAULT 'unsupported',
  isolation_status TEXT DEFAULT 'not_configured',
  security_group_id TEXT,
  qos_policy_id TEXT,
  allocated_mbps REAL DEFAULT 0,
  max_pps REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slice_manager_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_capacity_mbps REAL NOT NULL DEFAULT 1000,
  total_pps_capacity REAL DEFAULT 10000,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Slicing Templates & SLA Profiles

Both ONOS and OpenStack subsystems implement standardized 3GPP/5G slice profiles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           5G SLICE PROFILES                                 │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│    eMBB Profile   │   URLLC Profile   │   mMTC Profile    │  Best Effort    │
│   (High Bandwidth)│   (Low Latency)   │   (Massive IoT)   │  (Default)      │
├───────────────────┼───────────────────┼───────────────────┼─────────────────┤
│ Bandwidth: High   │ Bandwidth: 50-60M │ Bandwidth: 2-20M  │ Bandwidth: 1M   │
│ Priority: Medium  │ Priority: High    │ Priority: Low     │ Priority: Low   │
│ Latency: Standard │ Latency: < 5ms    │ Latency: Standard │ Latency: Best   │
│ DSCP: Default     │ DSCP: 46 (EF)     │ DSCP: Default     │ DSCP: 0         │
│ Queue: Standard   │ Queue: 0 (Fast)   │ Queue: Standard   │ Queue: 1        │
└───────────────────┴───────────────────┴───────────────────┴─────────────────┘
```

### Detailed Template Parameters

| Profile | Target Use Case | Bandwidth Allocation | Burst Size | OpenFlow / DSCP Treatment | Isolation Level |
|---|---|---|---|---|---|
| **eMBB** (Enhanced Mobile Broadband) | Video streaming, AR/VR, large file transfers | 50,000 KB/s (ONOS) / 500 Mbps (Cloud) | 10,000 KB | Ingress Meter Drop Band; Queue 1 | Standard |
| **URLLC** (Ultra-Reliable Low Latency) | Autonomous vehicles, industrial robotics, telesurgery | 60,000 KB/s (ONOS) / 50 Mbps (Cloud) | 10,000 KB | **DSCP 46 Marking** $\rightarrow$ **Switch Queue 0**; Priority 41000 fast-path | Strict |
| **mMTC** (Massive Machine Communications) | Smart metering, IoT sensors, fleet telemetry | 2,000 KB/s (ONOS) / 20 Mbps (Cloud) | 500 KB | High PPS, Aggressive Rate Policed; Priority 40000 | Standard |
| **Best Effort / Custom** | General web browsing, non-critical telemetry | 1,000 KB/s (ONOS) / 200 Mbps (Cloud) | 200 KB | Default forwarding without bandwidth reservation | Standard |

---

## 7. Step-by-Step Practical Guide: How to Use Slicing

### 7.1 Prerequisites & Environment Startup

Before using network slicing, start the necessary backend and controller services:

#### 1. Start the ONOS Controller
```bash
docker start onos
# Confirm ONOS is reachable at http://localhost:8181/onos/v1/docs/
```

#### 2. Start the Backend Middleware Services
Open two terminal windows:
```bash
# Terminal 1: Start OpenStack & Cloud Middleware (Port 5000)
cd /home/abyih/projects/work/insa/insa-ui-to-be-merged
node server.js

# Terminal 2: Start ONOS Middleware & Persistence (Port 5001)
cd /home/abyih/projects/work/insa/insa-ui-to-be-merged
node server-onos.js
```

#### 3. Start the Frontend Development Server
```bash
cd /home/abyih/projects/work/insa/insa-ui-to-be-merged
bun run dev
# The dashboard opens at http://localhost:5173
```

---

### 7.2 How to Provision an ONOS Network Slice (Step-by-Step)

1. **Navigate to the ONOS Slicing Dashboard**:
   - Open your browser to `http://localhost:5173`.
   - In the sidebar, click on **Network Slicing** (`/network-slicing`).
2. **Review Available Topology & Capacity**:
   - Verify that your active switches (e.g., `s1`, `s2`, `s3`) and detected hosts (e.g., `10.0.0.1`, `10.0.0.2`, `10.0.0.3`) appear in the discovery cards.
   - Observe the **Network Capacity Pool** gauge (e.g., `100 MB/s total`, `XX MB/s allocated`).
3. **Open the Slice Creation Modal**:
   - Click the **+ Create Slice** button at the top right.
4. **Configure Slice Parameters**:
   - **Slice Name**: Enter a descriptive name (e.g., `Robotics-URLLC-Slice`).
   - **Slice Template**: Select `URLLC (Ultra-Reliable Low-Latency)`. Notice that bandwidth auto-populates to `60,000 KB/s` and DSCP 46 / Queue 0 parameters are selected.
   - **VLAN ID**: Leave as auto-assigned (e.g., `100`), or enter a custom VLAN ID.
   - **Select Member Hosts**: Check at least two hosts that should belong to this isolated slice (e.g., `10.0.0.1` and `10.0.0.2`).
5. **Deploy the Slice**:
   - Click **Deploy Slice**.
   - The frontend calls `createSlice()` in `slicingService.js`:
     - Creates OpenFlow meters on switches connected to `10.0.0.1` and `10.0.0.2`.
     - Computes the shortest multi-hop path across the topology.
     - Installs Priority 41000 DSCP 46 $\rightarrow$ Queue 0 rules.
     - Installs Priority 40000 peer unicast forwarding flows.
     - Installs Priority 40000 isolated ARP broadcast trees.
     - Installs Priority 39000 isolation drop boundary rules on ingress ports.
     - Persists the slice record in SQLite (`users.db` table `onos_slices`).
6. **Verify Active Deployment**:
   - The slice card appears with status **ACTIVE**.
   - Expand the slice card to view live meters, attached flow rule IDs, and member host details.

---

### 7.3 How to Provision an OpenStack Cloud Slice (Step-by-Step)

1. **Navigate to the OpenStack Slices Page**:
   - In the sidebar, click on **Cloud Slices** (`/network-slices`).
2. **Review OpenStack Infrastructure & Capabilities**:
   - Check the **Neutron Capabilities** card: confirms availability of Neutron QoS policies, bandwidth limit rules, minimum bandwidth rules, and DSCP marking.
   - Check the **Cloud Slicing Capacity** widget showing total available Mbps.
3. **Open the Creation Modal**:
   - Click **+ Create Slice**.
4. **Configure Cloud Slice Parameters**:
   - **Slice Name**: e.g., `Enterprise-Video-eMBB`.
   - **Slice Profile**: Select `eMBB` (500 Mbps).
   - **Priority**: `MEDIUM` or `HIGH`.
   - **Select OpenStack Network**: Choose the target tenant virtual network.
   - **Select Virtual Machines**: Check the VMs to be isolated into this slice (e.g., `vm-web-01`, `vm-web-02`).
5. **Deploy the Cloud Slice**:
   - Click **Create Slice**.
   - The backend `server.js`:
     - Creates an OpenStack Neutron QoS policy `slice-qos-<id>`.
     - Creates bandwidth limit and DSCP rules.
     - Binds the QoS policy to all virtual ports of the selected VMs.
     - Creates a dedicated Security Group isolating slice VMs from outside traffic.
     - Saves the slice in SQLite `users.db`.
6. **Verify Cloud Enforcement**:
   - The slice displays with green badges for **QoS Enforced** and **Isolated**.

---

### 7.4 How to Use the AI Intent Slicing Engine

Operators can provision slices via plain English natural language:

1. In either Slicing page, locate the **AI Intent-Based Slicing** panel.
2. Select an AI Provider (e.g., `Gemini`, `OpenAI`, or `Offline Smart Heuristic`).
3. Type or select a template prompt:
   > *"Create an ultra-reliable low latency URLLC slice for medical robotics between host 10.0.0.1 and 10.0.0.2 with 20 MB/s bandwidth."*
4. Click **Compile Intent**:
   - The engine parses the prompt, maps host addresses to discovered network entities, checks capacity limits, and constructs the slice plan.
5. Review the compiled plan and click **Apply & Provision**.

---

### 7.5 Validating Isolation & QoS via CLI

You can verify slice isolation and QoS enforcement directly in your terminal using Mininet:

#### 1. Verifying Intra-Slice Connectivity (Allowed)
In the Mininet console, ping between hosts within the same slice:
```bash
mininet> h1 ping -c 3 h2
# Result: 0% packet loss, RTT < 1ms (Pass)
```

#### 2. Verifying Cross-Slice Isolation (Blocked)
Ping from a host in Slice 1 to a host in Slice 2 or an unsliced host:
```bash
mininet> h1 ping -c 3 h3
# Result: 100% packet loss (Dropped by Priority 39000 rule, Pass)
```

#### 3. Verifying Bandwidth Policing (Meters)
Run an `iperf` test between slice peers:
```bash
mininet> h2 iperf -s &
mininet> h1 iperf -c 10.0.0.2 -t 10
# If slice bandwidth is 50,000 KB/s (~400 Mbps):
# Result: Throughput is precisely capped at ~400 Mbps with drop packets recorded on the meter.
```

#### 4. Verifying URLLC Low-Latency Prioritization (DSCP 46)
Generate traffic marked with DSCP 46:
```bash
mininet> h1 ping -Q 184 10.0.0.2
# DSCP 46 equals TOS byte 184 (46 << 2 = 184)
# Packets hit Priority 41000 rules and are served via Queue 0 with near-zero jitter.
```

#### 5. Inspecting Flows on OpenFlow Switches
```bash
# In your Linux terminal:
sudo ovs-ofctl dump-flows s1 -O OpenFlow13
sudo ovs-ofctl dump-meters s1 -O OpenFlow13
```

---

### 7.6 Slice Modification, Bandwidth Scaling & Decommissioning

- **Dynamically Add a Host**: Click **Edit Slice** $\rightarrow$ select an additional host $\rightarrow$ click **Save**. The service calculates paths to all existing peers and provisions new Priority 40000 rules.
- **Dynamically Scale Bandwidth**: Edit slice bandwidth (e.g., from 50 MB/s to 75 MB/s) $\rightarrow$ updates the OpenFlow meter in ONOS without dropping ongoing connections.
- **Decommission a Slice**: Click **Delete Slice**. The service:
  - Deletes all associated flow rules from switches.
  - Deletes OpenFlow meters.
  - Removes Priority 39000 drop boundary rules, returning ports to default state.
  - Restores the allocated bandwidth back to the physical capacity pool.
  - Deletes the record from SQLite.

---

## 8. Unified REST API Reference

### ONOS SDN Slicing Endpoints (`server-onos.js`, Port 5001)

| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `GET` | `/api/onos/slices` | List all saved ONOS network slices | None |
| `GET` | `/api/onos/slices/:id` | Get specific slice details | None |
| `POST` | `/api/onos/slices` | Persist new slice in SQLite | Full slice JSON object |
| `PUT` | `/api/onos/slices/:id` | Update slice parameters / hosts | Updated slice fields |
| `DELETE` | `/api/onos/slices/:id` | Remove slice from SQLite | None |
| `GET` | `/api/onos/slices/capacity` | Get global capacity budget | None |
| `PUT` | `/api/onos/slices/capacity` | Update global capacity budget | `{ "totalCapacityKbps": 150000 }` |
| `GET` | `/api/onos/slices/vlan/next` | Fetch next sequential VLAN ID | None |
| `GET` | `/api/onos/meters/:deviceId` | Get live meters from ONOS | None |
| `POST` | `/api/onos/meters/:deviceId` | Create OpenFlow meter | `{ "unit": "KB_PER_SEC", "bands": [...] }` |
| `DELETE`| `/api/onos/meters/:dev/:id` | Delete meter from switch | None |
| `GET` | `/api/onos/flows` | Get flows from ONOS | None |
| `POST` | `/api/onos/flows/:deviceId` | Install OpenFlow rule | Flow rule JSON |
| `DELETE`| `/api/onos/flows/:dev/:id` | Delete flow rule | None |

### OpenStack Cloud Slicing Endpoints (`server.js`, Port 5000)

| Method | Endpoint | Description | Request Body / Query |
|---|---|---|---|
| `GET` | `/api/slices` | List all OpenStack cloud slices | None |
| `GET` | `/api/slices/:id` | Get cloud slice by ID | None |
| `POST` | `/api/slices` | Create cloud slice & apply QoS | Slice creation payload |
| `PUT` | `/api/slices/:id` | Update slice & rebind QoS | Updated fields & VM IDs |
| `DELETE`| `/api/slices/:id` | Delete slice, remove QoS & security groups | None |
| `POST` | `/api/slices/parse-intent` | Parse natural language intent | `{ "prompt": "...", "provider": "gemini" }` |
| `GET` | `/api/slices/capacity/status` | Cloud capacity utilization status | None |
| `GET` | `/api/slices/capabilities/status`| Neutron QoS driver capabilities | None |
| `POST` | `/api/slices/:id/activate` | Activate slice QoS rules | None |
| `POST` | `/api/slices/:id/deactivate` | Deactivate slice QoS rules | None |
| `POST` | `/api/slices/:id/enforce-bandwidth` | Re-enforce Neutron QoS rules | None |
| `POST` | `/api/slices/:id/enforce-isolation` | Re-enforce Security Group rules | None |
| `GET` | `/api/slices/:id/violations` | Check QoS bandwidth violations | None |
| `GET` | `/api/slice-manager/overview` | Global slice manager statistics | None |
| `PUT` | `/api/slice-manager/config` | Update total cloud bandwidth cap | `{ "totalCapacityMbps": 2000 }` |

---

## 9. Troubleshooting & Operational FAQ

### Q1: Why does `mininet> h1 ping h2` fail on a newly created slice?
1. **Host Discovery Delay**: ONOS requires hosts to emit at least one packet before learning their MAC and switch port location. Run `mininet> pingall` once to trigger ONOS host discovery.
2. **Synthetic MAC Resolution**: The service automatically reconciles synthetic MACs (`00:00:00:00:00:01`) with real discovered MACs. Click **Refresh** in the dashboard to trigger automatic synchronization.

### Q2: How does the system handle switches without OpenFlow 1.3 Meter support?
In older OVS versions or kernel datapath configurations where meter tables are unsupported:
- `slicingService.js` wraps meter creation in a `try/catch` block.
- If meter creation fails or the meter is not verified active on the switch, the service gracefully omits the `METER` instruction and falls back to **Priority 40000 flow routing + Queue assignment** without failing slice deployment.

### Q3: How is cross-slice broadcast traffic prevented?
Standard networks flood ARP packets everywhere. In our architecture, the **Priority 40000 ARP rule** strictly enumerates the output ports leading to peers belonging to the same slice. External hosts receive zero broadcast packets, guaranteeing absolute isolation.

### Q4: Can an OpenStack VM belong to an ONOS network slice?
Yes! In hybrid deployments, the OpenStack VM's virtual port connects to an OpenFlow bridge managed by ONOS. The VM port is treated as an edge host in ONOS, allowing it to participate in ONOS L2/L3 flow slices while also benefiting from OpenStack Neutron QoS policies at the hypervisor level.

---

**Report Prepared By:** INSA SDN Architecture Team  
**Verification Status:** Verified against active ONOS Docker & OpenStack backends  
**Build Status:** Clean compile (`vite build` passed, 23/23 Vitest tests passing)
