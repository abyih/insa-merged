# Technical Documentation: Network Slicing, Path Trace & Topology Visualizer

This technical document details the architecture, data flows, algorithms, and UI mechanisms for the **Network Slicing**, **Path Trace**, and **Topology Visualizer** subsystems in the PNTC SDN Platform.

---

## 1. 🛡️ Network Slicing Subsystem (`src/Pages/NetworkSlicing/NetworkSlicing.jsx`)

The Network Slicing subsystem provides dynamic software-defined multi-tenant isolation, QoS bandwidth enforcement, and automated OpenFlow policy provisioning across OpenFlow 1.3 switches managed via OpenDaylight (ODL).

```
+-----------------------------------------------------------------------------------+
|                            Network Slicing Pipeline                               |
|                                                                                   |
|  [Operator Intent / Form]                                                         |
|         ↓                                                                         |
|  [Intent Parser (Keyword + SLA)]  →  [Admission Control (100 Mbps Capacity Pool)] |
|         ↓                                                                         |
|  [SDN Orchestration Layer]                                                        |
|    ├── OpenFlow 1.3 Flow Rules   → (Table 0: Allow / Drop Priorities)             |
|    └── OVS Egress QoS Queues     → (linux-htb: min-rate, max-rate, DSCP 46)       |
|         ↓                                                                         |
|  [Live Enforcement Verifier]     → Live read-back from ODL/OVS to verify rules   |
+-----------------------------------------------------------------------------------+
```

### 1.1 Intent-Based Slicing & Translation Transparency
* **Parser Engine (`src/utils/intentParser.js`):** Translates operator intent statements or predefined presets (e.g., *Hospital-Traffic*, *VoIP Network*, *Guest-Network*) into concrete network constraints: bandwidth, priority, latency, and host assignments.
* **Reasoning Transparency Card:** Renders the literal regex substrings matched during parsing next to the compiled policy. This provides complete auditability and academic transparency.

### 1.2 QoS Egress Bandwidth Queuing (`linux-htb`)
* **Uplink / Peer Port Provisioning:** Configures hardware-level traffic policing on switch peer/uplink ports using Linux Hierarchical Token Bucket (`linux-htb`) queues via `/api/qos/:switchId/:port`.
* **Rate Limits:** Configures distinct `min-rate` bandwidth guarantees and `max-rate` ceilings.
* **DSCP Tagging:** Tags high-priority and low-latency packets with **DSCP 46 (Expedited Forwarding)**.

### 1.3 Admission Control Pool
* **Global Capacity Pool (`NETWORK_CAP_KBPS = 100,000 Kbps` / 100 MB/s):** Validates committed slice bandwidth against available link budget prior to slice provisioning to prevent over-subscription.

### 1.4 Closed-Loop Anomaly Mitigation
* **Automated Quarantine:** Works in conjunction with the ML Anomaly Detector (`AnomalyDetector.jsx`). Upon intrusion detection, it identifies the host on the compromised switch and installs a host-scoped OpenFlow `DROP` rule into OpenDaylight, isolating the attacker without disturbing innocent traffic.

### 1.5 Ground-Truth Enforcement Verification
* **Live State Verification:** The **"View Enforcement"** panel reads the physical flow tables (`opendaylight-inventory:nodes`) and OVS queue stats directly from the controller to confirm that rules are active on hardware before flagging the slice as verified.

---

## 2. 🗺️ Path Trace Subsystem (`src/Pages/PathTrace/PathTrace.jsx`)

The Path Trace engine computes, verifies, and visually animates the hop-by-hop forwarding path of packets moving between any two network entities.

```
[Src Endpoint: Host or Switch]  ═════ (BFS Shortest Path Graph) ═════>  [Dst Endpoint: Host or Switch]
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
         [Hop Port Computation]                              [Flow Correlation]
   (Port Towards Ingress / Egress)                      (Live OpenFlow Matching Rules)
```

### 2.1 Generalized Endpoint Resolution
* Resolves arbitrary endpoint pairs: **Host $\to$ Host**, **Host $\to$ Switch**, or **Switch $\to$ Switch** (`openflow:N`).

### 2.2 Dynamic BFS Shortest-Path Graph (`src/utils/graph.js`)
* Constructs an adjacency list from discovered RESTCONF topology links (`buildAdjacency`) and computes the shortest path hop sequence using Breadth-First Search (`shortestPath`).

### 2.3 Hop Port Ingress/Egress Mapping
* Analyzes `source-tp` and `dest-tp` termination points across switch interconnects and host attachments (`resolveHostAttachment`) to determine:
  * **Input Port:** Ingress port facing the previous node.
  * **Output Port:** Egress port facing the next node.

### 2.4 Live Flow Correlation
* Queries OpenFlow Table 0 across all intermediate switches along the calculated path to verify matching classification and forwarding rules.

---

## 3. 🌐 Topology Visualizer & Slice Overlay Feature (`src/Pages/Topology/TopologySimple.jsx`)

The Topology Page renders the real-time physical and logical network graph using `vis-network`, with interactive slice filtering and device inspection.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [ 🗂️ ALL SLICES  ▼ ]               [ 🔄 REFRESH LINKS ]               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   🔵 ALL SLICES — LEGEND                                               │
│   ──────────────────────────────────────────────────                   │
│   • 🔵 Guest-Network      (Logical Slice ID: 1)                        │
│   • 🟣 voip network        (Logical Slice ID: 2)                        │
│   • 🟠 Guest-Network      (Logical Slice ID: 3)                        │
│   • 🟢 Hospital-Traffic   (Logical Slice ID: 4)                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Feature Breakdown

| Component / UI Element | Technical Function | Data Source & Mechanism |
| :--- | :--- | :--- |
| **`ALL SLICES` Dropdown Filter** | **Subgraph Isolation Filter** | Switches between displaying the full physical network (`All Slices`) or isolating the visual subgraph of an individual slice. In single-slice mode, non-member nodes and links are visually dimmed. |
| **`REFRESH LINKS` Button** | **Dynamic Topology Sync** | Triggers an immediate RESTCONF re-fetch (`getTopology()`) against OpenDaylight to rediscover active switches, inter-switch links (ISLs), and host attachments. |
| **`ALL SLICES — LEGEND` Panel** | **Slice Mapping & Palette Generation** | Iterates over active slices in `SliceContext` and assigns each a deterministic color (`sliceColor(index)`), providing visual correlation between slices and canvas nodes. |
| **Slice Click Action** | **Inspection & Mutation Modal** | Clicking any slice item in the legend displays its configured bandwidth (`qosBandwidth`), priority, latency class, and member hosts, with actions to **Edit Slice** or **Delete Slice** (triggering rule removal). |
| **Node Inspector Mode** | **Hardware Specifications Drawer** | Selecting any switch or host node on the graph canvas transitions the panel to the **Node Inspector**, showing Device ID, OpenFlow ports, IP, and MAC address. |

---

## 4. 📊 Data Architecture & Service Integration

```
OpenDaylight Controller (RESTCONF :8443)  ←→  Node.js Backend Proxy (:5050)
                                                    │
                                                    ▼
                                          [React Context Layer]
                                          ├── SdnContext / DataPipelineContext
                                          └── SliceContext (Active Slices & QoS)
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   ▼                                ▼                                ▼
         [Network Slicing Page]              [Path Trace Page]                [Topology Visualizer]
         - Provisioning & Queues            - Multi-hop traversal            - Graph canvas & Legend
         - Enforcement Check                - Port-by-port trace             - Subgraph slice filter
```
