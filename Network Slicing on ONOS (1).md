# Network Slicing on ONOS \- Technical Documentation

## Host-Based Slicing with Multi-Switch Routing, QoS, and Intent-Based Layer

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)  
2. [Environment Setup](#2-environment-setup)  
3. [Slice Provisioning Pipeline](#3-slice-provisioning-pipeline)  
4. [Slice Deletion Pipeline](#4-slice-deletion-pipeline)  
5. [QoS and DSCP-based Prioritization](#5-qos-and-dscp-based-prioritization)  
6. [Intent-Based Networking (IBN) Layer](#6-intent-based-networking-ibn-layer)  
7. [Verification & Live Testing](#7-verification--live-testing)  
8. [Implementation Details](#8-implementation-details)  
9. [Challenges and Solutions](#9-challenges-and-solutions)  
10. [Limitations](#10-limitations)

## 1\. Overview & Architecture

Network slicing creates **isolated virtual network partitions** over a shared physical infrastructure. Each slice is defined by:

- A set of assigned hosts  
- A guaranteed bandwidth allocation (enforced via ONOS meters)  
- End-to-end OpenFlow forwarding rules (computed paths across multi-switch topologies)  
- Cross-slice isolation (drop boundary rules at priority 39000\)  
- Optional QoS prioritization (DSCP 46 \+ Queue 0 for URLLC)

# 2\. Environment Setup

### Prerequisites

| Software | Version | Purpose |
| :---- | :---- | :---- |
| **Operating System** | Linux (Ubuntu 26.04 LTS) | Host operating system |
| **ONOS** | 2.7.0+ | SDN Controller |
| **Mininet** | 2.3.x | Network emulation |
| **Node.js** | ≥ 20.x (tested with v26.7.0) | Backend server |
| **npm** | ≥ 10.x (tested with 11.19.0) | Dependency management |
| **Python** | ≥ 3.12 | Intent service (sentence-transformers) |
| **uv** | Latest | Python package manager |
| **iperf** | v2 | Bandwidth testing (comes with mininet) |
| **tc** (iproute2) | Latest | Traffic control inspection |

## Step 1 — Clone and Install Dependencies

```sh
git clone <repository-url> insa-merged
cd insa-merged
npm install

# For the intent service
cd anomaly
uv sync
cd ..
```

## Step 2 — Start ONOS

```sh
# Docker (recommended)
docker run -d --name onos -p 8181:8181 -p 6653:6653 onosproject/onos:2.7.0

# Activate OpenFlow and forwarding apps
# (via ONOS CLI: ssh -p 8101 onos@localhost, password: rocks)
app activate org.onosproject.openflow
app activate org.onosproject.fwd
```

## Step 3 — Start Mininet with Multi-Switch Topology

```sh
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

```sh
# On Mininet VM
sudo bash setup_mininet_qos.sh --auto
```

This configures (scripts/setup\_mininet\_qos.sh):

- **Queue 0** (High Priority / URLLC): 60 Mbps guaranteed, Priority 1  
- **Queue 1** (Standard / Best Effort): 15 Mbps guaranteed, Priority 2  
- **Total Link Ceiling**: 80 Mbps

The script supports three modes:

| Mode | Command | Behavior |
| :---- | :---- | :---- |
| **Auto** | \--auto | Discovers all OVS bridges via ovs-vsctl list-br, lists all ports via ovs-vsctl list-ports, and configures HTB queues on every detected port |
| **Manual** | \<port1\> \<port2\> ... | Configures HTB queues on the specified ports only |
| **Clear** | \--clear \<port1\> ... | Removes QoS and queue configurations from specified ports |

## Step 5 — Configure .env

```
ONOS_URL=http://localhost:8181
ONOS_USERNAME=onos
ONOS_PASSWORD=rocks
MININET_HOST=192.168.122.88
MININET_USER=mininet
MININET_SSH_KEY=/home/<user>/.ssh/id_main
```

## Step 6 — Start Backend Services

```sh
# Terminal 1: ONOS backend server
npm run server:onos

# Terminal 2: Intent service (optional, for IBN)
npm run intent:service

# Terminal 3: Frontend
npm run dev
```

### Available npm Scripts

| Script | Command | Services Started |
| :---- | :---- | :---- |
| npm run server:onos | node \--watch server-onos.js | ONOS backend only (port 5001\) |
| npm run intent:service | cd anomaly && uv run python intent\_service.py | Neural intent service only (port 5005\) |
| npm run all:onos | concurrently | Vite frontend \+ ONOS server |
| npm run all:onos:intent | concurrently | Vite frontend \+ ONOS server \+ Intent service |
| npm run services | concurrently | All backend services (DevStack, ONOS, RF, IF, Intent) |
| npm run all:services | concurrently | All services \+ Vite frontend |

## 3\. Slice Provisioning Pipeline

The complete slice creation flow is implemented in src/api/slicingService.js:

### Step 1 — Admission Control

Before creating a slice, the system verifies that the requested bandwidth fits within the remaining physical capacity pool. It sums all existing slice bandwidths and compares against the total network capacity (default: 100,000 KB/s). If the new slice would exceed available capacity, the request is rejected with an admission control error.

### Step 2 — VLAN ID Assignment

Each slice receives a unique VLAN ID, auto-incrementing from 100\. The allocator checks all currently used VLAN IDs and assigns the next unused candidate.

### Step 3 — Meter Creation

For each host in the slice, an ONOS meter is created on the host's **ingress switch**. The meter is configured with:

| Parameter | Value |
| :---- | :---- |
| **Unit** | KB\_PER\_SEC |
| **Band type** | DROP (drops excess traffic) |
| **Rate** | The slice's configured bandwidth |
| **Burst size** | bandwidth × 0.2 (20% of configured bandwidth) |

The meter enforces the slice's bandwidth cap by dropping any traffic that exceeds the configured rate.

### Step 4 — Cross-Slice Isolation

A **Priority 39000 Drop Rule** is installed per host on its ingress switch. This rule matches traffic by source MAC address (ETH\_SRC) and ingress port (IN\_PORT), with an empty treatment (no output action \= DROP). The effect is **default-deny**: any traffic from a sliced host that does NOT match a higher-priority slice forwarding rule (Priority 40000\) is silently dropped.

This prevents hosts in different slices from communicating, even if ONOS reactive forwarding (org.onosproject.fwd) would otherwise install permissive flow rules.

### Step 5 — Multi-Switch Path Computation

The system uses a **BFS (Breadth-First Search) shortest-path** algorithm to find the forwarding path between any two hosts' switches. An adjacency graph is built from the ONOS link data, where each edge records the source and destination port numbers connecting each switch pair. The BFS produces an ordered list of hops, where each hop specifies the deviceId, inPort, and outPort for that switch.

**Same-switch optimization**: If both hosts are on the same switch, a single hop is returned directly without graph traversal.

**Example**: For a topology h1→s2→s1→s3→h4, the path computation returns:

| Hop | Device | In Port | Out Port | Description |
| :---- | :---- | :---- | :---- | :---- |
| 1 | of:0002 (s2) | 2 | 1 | h1's host port → trunk to s1 |
| 2 | of:0001 (s1) | 1 | 2 | trunk from s2 → trunk to s3 |
| 3 | of:0003 (s3) | 1 | 2 | trunk from s1 → h4's host port |

### Step 6 — Unicast Forwarding Flows

For every pair of hosts (A, B) in the slice, **end-to-end forwarding flows** are installed at every hop along the computed path. Each flow is installed at **Priority 40000** and matches on IN\_PORT, ETH\_SRC, and ETH\_DST (the MAC addresses of the source and destination hosts).

The flow treatment includes:

- **Meter instruction** (ingress hop only): Associates the host's bandwidth meter to enforce rate limiting at the entry point  
- **Queue instruction** (URLLC slices only): Directs traffic to Queue 0 (high-priority queue) on every hop  
- **Output instruction**: Forwards traffic to the appropriate output port for the next hop or destination host

Flows are installed **bidirectionally** — for each pair (A→B), a corresponding (B→A) set of flows is also installed along the reverse path.

### Step 7 — ARP Broadcast Routing

ARP broadcasts are routed **only within the slice** using explicit flow rules rather than relying on switch flooding. For each host in the slice, a Priority 40000 flow is installed on every switch along the broadcast path, matching on IN\_PORT, ETH\_TYPE=0x0806 (ARP), and ETH\_SRC. The treatment consolidates all output ports serving same-slice hosts into multiple OUTPUT instructions, confining ARP resolution within the slice boundary.

## 4\. Slice Deletion Pipeline

Slice deletion is a multi-phase cleanup process implemented in deleteSlice() and removeSliceNetworkArtifacts():

### Phase 1 — Tracked Flow Rule Deletion

All flow rules that were explicitly tracked during slice creation (stored in the slice's flows\[\] array) are deleted from their respective ONOS devices via the ONOS REST API.

### Phase 2 — Per-Host Drop Rules and Meters

For each host in the slice:

1. The Priority 39000 drop boundary rule is deleted (tracked via host.dropFlowId)  
2. The bandwidth meter is deleted (tracked via host.meterId)

### Phase 3 — Deep Network Cleanup

After removing tracked artifacts, a **deep cleanup** sweep queries all switches in the network and examines every flow rule. Any remaining flow rules matching the slice's host MACs at Priority 41000, 40000, or 39000 are deleted. This catches flow rules that were not tracked during creation (e.g., flows installed by ONOS reactive forwarding org.onosproject.fwd).

The sweep checks both ETH\_SRC and ETH\_DST criteria against the set of the slice's host MAC addresses to ensure complete removal.

### Phase 4 — Persistence Cleanup

1. Send a DELETE request to the backend SQLite endpoint: DELETE /api/onos/slices/\<sliceId\>  
2. Send a DELETE request to the backend SQLite endpoint: DELETE /api/onos/slices/\<sliceId\>

Errors during deletion are collected and returned as warnings but do not abort the operation. Partial cleanup is preferred over leaving orphaned network resources.

# 5\. QoS and DSCP-based Prioritization

### OVS HTB Queue Configuration (scripts/setup\_mininet\_qos.sh)

The QoS setup script configures HTB (Hierarchical Token Bucket) queues on OVS ports using ovs-vsctl. Each port receives:

| Queue | Purpose | Min Rate | Max Rate | Priority |
| :---- | :---- | :---- | :---- | :---- |
| **Queue 0** | High Priority (URLLC) | 60 Mbps | 80 Mbps (total ceiling) | 1 (highest) |
| **Queue 1** | Standard (Best Effort) | 15 Mbps | 80 Mbps (total ceiling) | 2 |

The script automatically clears any existing QoS on a port before applying new configuration, preventing duplicate QoS records.

### DSCP 46 Priority Flows (URLLC Slices)

For URLLC (low-latency) type slices, an additional **Priority 41000** flow is installed at every hop for each host pair. These flows match on:

- ETH\_TYPE=0x0800 (IPv4)  
- IP\_DSCP=46 (Expedited Forwarding)  
- IN\_PORT, ETH\_SRC, and ETH\_DST (specific host pair)

The treatment directs matched traffic to **Queue 0** (the high-priority queue) and forwards to the appropriate output port. This ensures that DSCP 46-marked traffic receives priority scheduling at every switch in the path.

### Flow Priority Hierarchy

| Priority | Purpose | Scope |
| :---- | :---- | :---- |
| **41000** | DSCP 46 → Queue 0 (URLLC only) | Per hop, per host pair |
| **40000** | Unicast forwarding \+ ARP | Per hop, per host pair |
| **39000** | Cross-slice drop boundary | Per host, ingress switch |
| **Default** | ONOS reactive forwarding | All unmatched traffic |

# 6\. Intent-Based Networking (IBN) Layer

### Local Neural Intent Service (anomaly/intent\_service.py)

The system includes an **offline, privacy-preserving** NLP engine for natural language → slice configuration:

| Property | Value |
| :---- | :---- |
| Model | all-MiniLM-L6-v2 (Sentence Transformers) |
| Port | 5005 |
| Latency | \< 12ms on CPU |
| Cloud dependency | **None** — runs 100% locally |

#### Model Loading

The model is loaded at startup with a **local-first strategy**: the system first attempts to load from the local HuggingFace cache (\~/.cache/huggingface/) using local\_files\_only=True. If no cached model is found, it falls back to downloading from HuggingFace (\~80 MB). In air-gapped environments, the model must be pre-cached before deployment.

#### Semantic Profile Matching

The engine embeds the user's natural language intent and compares it against pre-defined **3GPP slice profiles** using cosine similarity. Profile text embeddings are precomputed at startup for instant matching.

The available profiles are:

| Profile | Default Bandwidth | DSCP | Use Cases |
| :---- | :---- | :---- | :---- |
| **eMBB** (Enhanced Mobile Broadband) | 35,000 KB/s | AF31 | High bandwidth streaming, video, downloads |
| **URLLC** (Ultra-Reliable Low-Latency) | 15,000 KB/s | EF (46) | Mission-critical, real-time control |
| **mMTC** (Massive Machine Type) | 1,000 KB/s | AF11 | IoT sensors, telemetry, low-throughput devices |
| **Best-Effort** (Standard) | 5,000 KB/s | Default (CS0) | General browsing, standard traffic |

**Example**: An input prompt of "a slice for live 4K video streaming" is embedded and compared against all profile embeddings. The eMBB profile achieves the highest cosine similarity and is selected, auto-configuring the slice with 35 MB/s bandwidth.

#### Bandwidth Extraction

The engine parses bandwidth specifications from natural language using regex pattern matching:

| Input Pattern | Parsed Value |
| :---- | :---- |
| "50 Gbps", "50 gb/s" | 50,000,000 KB/s |
| "100 Mbps", "100 mb/s" | 100,000 KB/s |
| "5000 Kbps", "5000 kb/s" | 5,000 KB/s |
| (no match) | Profile default (e.g., 35,000 for eMBB) |

#### Host Extraction Logic

Target hosts are extracted from the prompt using a multi-strategy approach:

1. **Explicit IPs**: Regex extracts any IP addresses mentioned in the prompt (e.g., 10.0.0.1)  
2. **"All hosts" keywords**: If the prompt contains "all host", "all devices", "entire network", or "every host", all discovered ONOS hosts are selected  
3. **Default**: If no IPs are found and no "all" keyword is present, the first 2 available hosts from the ONOS topology are selected as defaults

#### Burst Size Calculation

The burst size is calculated as 20% of the configured bandwidth: burst\_size \= round(bandwidth × 0.2).

#### Physical Admission Control

The intent compiler performs admission control before returning a configuration:

| Status | Condition |
| :---- | :---- |
| APPROVED | Requested bandwidth ≤ remaining capacity |
| REJECTED\_CAPACITY | Requested bandwidth \> remaining capacity |
| REJECTED\_NO\_HOSTS | No target hosts available and no ONOS hosts discovered |

#### API Endpoints (Intent Service — Port 5005\)

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| GET | /health | Service health, model status, and available profiles |
| POST | /classify | Classify prompt into 3GPP category (returns type, confidence, per-profile scores) |
| POST | /compile | Compile natural language → full slice configuration JSON (with OpenFlow actions, reasoning, and admission status) |

The /classify endpoint performs semantic classification only, returning the matched slice type and cosine similarity scores. The /compile endpoint additionally resolves hosts, computes bandwidth, generates a slice name, and performs admission control.

#### Intent Proxy Endpoints (via server-onos.js)

The ONOS backend proxies intent requests to the local service:

| Frontend Path | Proxied To | Timeout |
| :---- | :---- | :---- |
| GET /api/onos/intent/health | http://127.0.0.1:5005/health | 3s |
| POST /api/onos/intent/compile | http://127.0.0.1:5005/compile | 8s |

# 7\. Verification & Live Testing

### Live Verification Endpoints (server-onos.js)

The system provides **real measurement** verification by executing commands inside Mininet host network namespaces:

| Endpoint | Test | What It Measures |
| :---- | :---- | :---- |
| POST /api/onos/verify/ping | Ping test | Latency (avg, min, max, jitter), packet loss |
| POST /api/onos/verify/iperf | Bandwidth test (iperf v2 UDP) | Achieved bandwidth, jitter, packet loss |
| GET /api/onos/verify/queues | OVS queue inspection | tc class stats, QoS/queue records |
| GET /api/onos/verify/dscp | DSCP flow verification | ONOS DSCP flows \+ OVS flow dumps |
| POST /api/onos/verify/compare | Multi-test comparison | Runs ping \+ iperf for multiple host pairs |

### Execution Method

Tests run inside Mininet host namespaces using mnexec. The findHostPid() function discovers the Mininet host's process ID by searching for processes with argument mininet:\<hostname\> via pgrep. The execInHost() function chains this with mnexec \-a \<pid\> to execute arbitrary commands inside the host's network namespace.

Example of the underlying mechanism:

```sh
# Find host PID
pgrep -f "mininet:h1"

# Execute ping inside h1's network namespace
sudo mnexec -a <pid> ping -c 10 -i 0.2 10.0.0.2
```

### Parsed Output

Test results are parsed into structured JSON:

**Ping results** include: avg, min, max, jitter (all in ms), packetLoss (ratio), count, and rtts (individual round-trip times). The parser handles two formats:

1. **Summary line**: Parses the standard rtt min/avg/max/mdev \= ... output  
2. **Per-line fallback**: If no summary line is found, individual time=X.XXX ms values are extracted and statistics are computed manually

**iperf results** include: bandwidth (in Mbits/sec), transfer (in MB), jitter (ms), lostPackets, totalPackets, and packetLoss (ratio). The parser searches output lines in reverse order to find the server report line first (which contains the most complete statistics).

---

# 8\. Implementation Details

### Topology-Aware Host Discovery

The getTopologyInfo() function uses a **3-layer aggregation** strategy:

1. **Live ONOS hosts** — Real-time discovered hosts from ONOS API, filtered to only those attached to active (available) switches  
2. **Saved slice hosts** — Previously assigned hosts from stored slices, with automatic MAC synchronization when ONOS discovers real hosts at the same location  
3. **Complementary leaf endpoints** — Auto-generated placeholder hosts for leaf switches that have no live hosts, enabling pre-provisioning of slices before all hosts are online

**Trunk Port Exclusion**: Inter-switch trunk ports are automatically identified from the ONOS link data and excluded from host assignment. A set of interSwitchPorts is built from all link source and destination {deviceId}:{port} pairs, and hosts connected to these ports are filtered out.

**Root Switch Detection**: The system identifies the root/core switch (s1) using a multi-strategy approach:

- Datapath description containing "s1", "core", or "spine"  
- Device ID ending in :0001 (hex)  
- Falls back to the first device in the list

### Dual-Controller Auto-Detection (src/api/api-controller.js)

The frontend detects which SDN controller (ONOS or ODL) is active at startup by attempting an ONOS API call (/devices). If the call succeeds and returns device data, the controller is identified as ONOS; otherwise, it falls back to ODL.

All API functions in api-controller.js (e.g., getDevices(), getHosts(), getLinks(), getMeters(), installOnosFlow(), deleteOnosFlow()) dispatch to either ONOS-specific or ODL-specific endpoints based on the detected controller. This allows the slicing service to operate transparently regardless of which controller is in use.

### Slice Data Persistence

Slices are stored in both:

- **SQLite** (backend, durable, via server-onos.js) — Serves as the single source of truth for slice persistence across restarts and reloads

**Fetch Strategy**: On initialization, fetchSlicesFromDb() queries the backend SQLite endpoint (GET /api/onos/slices) to retrieve all persisted slices.

**Save Strategy**: When slices are updated or created via saveSlices(), changes are persisted directly to the backend SQLite database.

**Normalization**: The normalizeSlice() function ensures consistent field names across frontend and backend representations, handling aliases like bandwidth/bandwidthKbps/bandwidth\_kbps and computing burst size as bandwidth × 0.2 if not explicitly set.

### Flow Rule Architecture per Slice

For a 2-host slice (h1 on s2, h3 on s3) in a tree topology (s2→s1→s3):

| \# | Device | Priority | Match | Action |
| :---- | :---- | :---- | :---- | :---- |
| 1 | s2 | 39000 | IN\_PORT=2, ETH\_SRC=h1 | DROP (isolation boundary) |
| 2 | s3 | 39000 | IN\_PORT=2, ETH\_SRC=h3 | DROP (isolation boundary) |
| 3 | s2 | 40000 | IN=2, SRC=h1, DST=h3 | METER \+ OUTPUT:1 (h1→s1) |
| 4 | s1 | 40000 | IN=1, SRC=h1, DST=h3 | OUTPUT:2 (s2→s3) |
| 5 | s3 | 40000 | IN=1, SRC=h1, DST=h3 | OUTPUT:2 (→h3) |
| 6 | s3 | 40000 | IN=2, SRC=h3, DST=h1 | METER \+ OUTPUT:1 (h3→s1) |
| 7 | s1 | 40000 | IN=2, SRC=h3, DST=h1 | OUTPUT:1 (s3→s2) |
| 8 | s2 | 40000 | IN=1, SRC=h3, DST=h1 | OUTPUT:2 (→h1) |
| 9 | s2 | 40000 | IN=2, ARP, SRC=h1 | OUTPUT:1 (ARP broadcast) |
| 10 | s1 | 40000 | IN=1, ARP, SRC=h1 | OUTPUT:2 (ARP relay) |
| 11 | s3 | 40000 | IN=1, ARP, SRC=h1 | OUTPUT:2 (ARP to h3) |

For **URLLC slices**, additional Priority 41000 flows add QUEUE:0 for DSCP 46 traffic.

### Network Capacity Defaults

The default total network capacity is **100,000 KB/s** (100 MB/s / 800 Mbps). The capacity pool is configurable via the UI and stored directly in SQLite (onos\_slice\_config.total\_capacity\_kbps).

## 9\. Challenges and Solutions

This section documents the key engineering challenges encountered during development and the solutions implemented to address them.

### 9.1 Multi-Switch Path Computation Across Arbitrary Topologies

**Challenge**: When two hosts in a slice are connected to different leaf switches, forwarding rules must be installed not only on the source and destination switches but also on every intermediate (spine/core) switch in the path. Computing this path requires knowledge of the full network topology and the ability to determine which physical port connects each switch pair.

**Solution**: A BFS (Breadth-First Search) shortest-path algorithm was implemented in findSwitchPath(). It constructs an adjacency graph from ONOS link data, where each edge records the source and destination ports. The BFS produces an ordered list of {deviceId, inPort, outPort} hops, enabling flow rule installation at each intermediate switch. Same-switch paths (both hosts on the same switch) are handled as a special case returning a single hop.

### 9.2 ARP Broadcast Isolation Within Slices

**Challenge**: Standard ARP broadcasts are forwarded to all ports on all switches, causing ARP requests to leak across slice boundaries. This breaks isolation because hosts in one slice can discover and attempt communication with hosts in other slices.

**Solution**: Explicit ARP forwarding flows at Priority 40000 with ETH\_TYPE=0x0806 matching were implemented. These flows route ARP broadcasts only to ports serving hosts within the same slice. On each switch along the ARP broadcast path, a flow rule consolidates all output ports for same-slice hosts into a single multi-action flow (multiple OUTPUT instructions). This confines ARP resolution to within the slice boundary.

### 9.3 Cross-Slice Traffic Leakage

**Challenge**: Without explicit isolation, hosts in different slices can communicate via ONOS reactive forwarding (org.onosproject.fwd), which installs flow rules for any traffic it observes. This reactive forwarding operates at a lower priority but still permits cross-slice communication.

**Solution**: Priority 39000 drop boundary rules are installed per host on their ingress switches, creating a **default-deny** perimeter. Any traffic from a sliced host that does not match a higher-priority slice forwarding rule (40000) is dropped. This effectively overrides ONOS reactive forwarding for sliced hosts while allowing unsliced hosts to communicate normally.

### 9.4 DSCP-Based Queue Scheduling with OVS

**Challenge**: Open vSwitch does not natively map DSCP values to hardware queues. DSCP is an IP-layer marking, while OVS queue selection occurs at the switch port level. There is no built-in mechanism to say "DSCP 46 traffic goes to Queue 0."

**Solution**: A two-component approach was implemented:

1. **ONOS flow rules** (Priority 41000\) match on IP\_DSCP=46 and include a QUEUE:0 instruction, directing matching traffic to the high-priority queue at each hop  
2. **OVS HTB configuration** (via setup\_mininet\_qos.sh) defines Queue 0 with 60 Mbps guaranteed bandwidth and Priority 1, and Queue 1 with 15 Mbps guaranteed and Priority 2

This combined approach ensures DSCP-marked traffic receives priority scheduling at every switch in the path.

### 9.5 Synthetic/Placeholder Hosts Lacking Real MAC Addresses

**Challenge**: The topology discovery system auto-generates placeholder hosts for leaf switches that have no live ONOS-discovered hosts. These placeholders use sequential MACs (00:00:00:00:00:01, 00:00:00:00:00:02, etc.) that are not real. When these hosts are assigned to slices, MAC-based isolation (ETH\_SRC matching) can be bypassed if any device spoofs one of these predictable MACs.

**Solution**: The system applies weaker IN\_PORT-only matching for isolation drop rules on placeholder hosts. Additionally, when ONOS later discovers a real host at the same physical location (same switch and port), the system automatically synchronizes the stored slice data to use the real MAC address, upgrading the isolation to full MAC-based enforcement.

### 9.6 Flow Rule Quadratic Growth with Slice Size

**Challenge**: For a slice with n hosts, the number of unicast forwarding flows grows as O(n²) because every pair of hosts requires bidirectional flows on every hop in their path. Additionally, each host requires ARP broadcast flows on every switch in the topology. A slice with 10 hosts generates hundreds of flow rules.

**Solution**: This is acknowledged as a design tradeoff in the current implementation, which is optimized for small slices (2–10 hosts) typical in SDN lab environments. The flow rule installation is batched and tracked in the slice.flows\[\] array for efficient cleanup. For larger deployments, a VLAN-based or group-table-based approach would be needed to reduce flow count.

### 9.7 Pure SQLite Architecture for Slice Persistence

**Challenge**: Previously, relying on browser localStorage caused state synchronization issues between client sessions, multiple tabs, and backend state, leading to inconsistent slice metadata.

**Solution**: Decoupled client-side persistence in favor of a pure SQLite backend model. The SQLite database serves as the single source of truth, handling all reads, writes, and slice metadata consistency directly via the REST API.

## 10\. Limitations

1. **No VLAN Tag Enforcement**: VLAN IDs are assigned and tracked, but ONOS flow rules use MAC-based matching (ETH\_SRC/ETH\_DST) rather than VLAN tag push/pop. VLAN isolation is logical only (tracked in metadata), not enforced in the data plane.

2. **Static Path Computation**: The BFS shortest path is computed once at slice creation time. If the topology changes (link failure, switch addition), the slice forwarding rules are NOT automatically recalculated.

3. **MAC-Dependent Isolation**: Cross-slice isolation relies on ETH\_SRC MAC matching. Synthetic/placeholder hosts (MAC 00:00:00:00:00:0X) use weaker isolation (IN\_PORT only), which can be bypassed if a host spoofs its MAC.

4. **QoS Requires Manual Setup**: The OVS HTB queue configuration (setup\_mininet\_qos.sh) must be run manually on the Mininet VM before URLLC slices can enforce queue-based prioritization. If the script is not run, QUEUE:0 instructions in flows silently fall back to default queuing.

5. **Single Queue Tier**: The system only supports 2 queues (Queue 0 for URLLC, Queue 1 for standard). 5G-compliant slicing requires more granular QoS classes (e.g., per-slice dedicated queues).

6. **Admission Control is Soft**: The bandwidth capacity pool check is based on configured slice bandwidths, not actual measured throughput. A slice with 50 MB/s allocated but only using 5 MB/s still counts as 50 MB/s used.

7. **No Slice Lifecycle Management**: Slices persist indefinitely. There is no TTL, automatic decommissioning, or scaling mechanism.

8. **Mininet-Only Verification**: The live ping/iperf/queue verification endpoints require a Mininet topology running via SSH. They cannot test real hardware switches.

9. **ARP Broadcast Scope**: ARP broadcasts are routed to all hosts in the same slice, which is correct for isolation but creates O(n²) flow rules for n hosts in a slice. Large slices (\> 10 hosts) generate a very large number of flows.

10. **OVS Queue Persistence**: OVS QoS/queue configurations are volatile. They are lost on OVS restart and must be re-applied.

11. **Intent Classification Accuracy**: The semantic matching relies on cosine similarity of sentence embeddings, which can misclassify ambiguous prompts. For example, "high bandwidth low latency slice" may match eMBB or URLLC depending on word emphasis, with no mechanism for disambiguation.

12. **No Slice Update Atomicity**: Slice updates (host addition/removal, bandwidth changes) require teardown and re-provisioning of network artifacts. During the transition, brief connectivity disruption may occur.

&nbsp;