# Technical Report: Subsystem Issues & Solutions

This document details all technical issues, root causes, and corresponding code-level fixes implemented across the **Network Slicing**, **Path Trace**, and **Topology / Infrastructure** subsystems in the PNTC SDN platform.

---

## 1. 🛡️ Network Slicing Subsystem

### 1.1 Ingress vs. Egress OVS QoS Queuing Bug
* **The Issue:** QoS priority queues were originally provisioned only on the host-facing *ingress* port of a switch. In Open vSwitch (OVS), `linux-htb` traffic queues only operate on **egress (TX)** traffic. Because outbound host traffic exits through switch uplink/peer ports to reach the network, the queue had **zero effect** on real congested traffic.
* **Root Cause:** Misunderstanding OVS HTB queue directionality (applying TX queues to RX interfaces).
* **The Solution & Code Fix:**
  Created `listPeerPorts(bridge, excludeIface)` in `server.js` to discover all uplink ports on the bridge and provisioned the queue across all egress paths:
  ```javascript
  // server.js
  const listPeerPorts = async (bridge, excludeIface) => {
    const { stdout } = await pExecFile("sudo", ["ovs-vsctl", "list-ports", bridge]);
    return stdout.trim().split("\n").filter(p => p && p !== excludeIface);
  };
  ```
  When `PUT /api/qos/:switchId/:port` is executed, it now provisions the primary port **and every peer uplink port** on that switch.
* **Verification:** Confirmed via `ovs-ofctl queue-stats` and verified under a 700 Mbps flood congestion test, reducing packet loss from 25% down to 10% for DSCP 46 marked traffic.

---

### 1.2 Missing Bandwidth Rate Ceilings (`max-rate`)
* **The Issue:** The queue configuration previously only passed `other-config:min-rate`. Without a `max-rate` ceiling, rate limiting was unenforced when bandwidth was unconstrained.
* **Root Cause:** Incomplete OVS QoS table record schema.
* **The Solution & Code Fix:**
  Updated `provisionQueueOnInterface()` in `server.js` to set both a guaranteed floor and an enforceable ceiling:
  ```bash
  sudo ovs-vsctl set queue <queue-uuid> \
    other-config:min-rate=<minRateInBits> \
    other-config:max-rate=<maxRateInBits>
  ```
  `maxRate` is dynamically set to $2\times$ `minRate` (or clamped to the global 100 Mbps admission control limit).

---

### 1.3 Intent Parser "Phantom Host" Regex Bug
* **The Issue:** The natural language intent parser was generating non-existent host entities (e.g. parsing *"traffic **wit​h** 20000 Kbps"* into a phantom `"host 20000"`).
* **Root Cause:** The regex pattern `h(?:ost)?\s*(\d+)` was missing word boundary constraints, causing the letter `"h"` at the end of words like *"with"* or *"health"* to match as a host prefix.
* **The Solution & Code Fix:**
  Refactored regex matching in `src/utils/intentParser.js` to enforce strict word boundaries:
  ```javascript
  // src/utils/intentParser.js
  const hostRegex = /\b(?:host|h)\s*(\d+)\b/gi;
  ```
* **Verification:** Confirmed that words containing `"h"` no longer trigger false positive host matches.

---

### 1.4 "Cosmetic Active" UI State vs. Physical Ground Truth
* **The Issue:** Slices displayed an "Active" green badge simply because local browser state recorded them, even if the underlying OpenFlow rule or OVS queue failed to install.
* **Root Cause:** Lack of controller read-back verification.
* **The Solution & Code Fix:**
  Built the `runVerifyEnforcement()` engine inside `NetworkSlicing.jsx`:
  * Asynchronously calls `getFlows(switchId)` via RESTCONF to verify the OpenFlow Table 0 classification rule physically exists.
  * Asynchronously calls `getQueueState(switchId, port)` to verify OVS hardware queues when latency is set to `Low`.
  * Displays `NOT FULLY VERIFIED` if any physical rule is missing from the switch.

---

### 1.5 Closed-Loop Anomaly Mitigation Host Resolution
* **The Issue:** Anomaly detector alerts flagged suspicious switches, but could not automatically determine which specific host attached to that switch caused the attack.
* **Root Cause:** Missing reverse-lookup mapping between switches and host attachments in the topology graph.
* **The Solution & Code Fix:**
  Implemented `resolveSwitchHosts(switchId)` in `src/utils/graph.js` and wired it to `AnomalyDetector.jsx`:
  * Maps alerting switch ID $\to$ connected host MAC/IP.
  * Installs a **host-scoped** OpenFlow `DROP` rule (matching specific `in_port` and source MAC) instead of blacking out the entire switch.

---

## 2. 🗺️ Path Trace Subsystem

### 2.1 Host-Only Endpoint Limitation
* **The Issue:** Path Trace was restricted to `Host → Host` pairs; tracing paths from a host to an intermediate core switch or between switches was impossible.
* **Root Cause:** Hardcoded assumption that all source/destination IDs have the `host:` prefix.
* **The Solution & Code Fix:**
  Generalized endpoint resolution in `src/utils/graph.js` and `PathTrace.jsx`:
  ```javascript
  // src/utils/graph.js
  export function resolveEndpoint(id, nodesById) {
    if ((id || "").startsWith("host:")) {
      const attach = resolveHostAttachment(nodesById[id]);
      return { type: "host", switchId: attach?.switchId, port: attach?.port };
    }
    // Handles raw switch identifiers like "openflow:1"
    return { type: "switch", switchId: id, port: null };
  }
  ```
* **Verification:** Verified live path traces across mixed endpoint pairs (`h1 → openflow:4`, `openflow:1 → openflow:7`).

---

### 2.2 Intermediate Hop Port Ingress/Egress Disambiguation
* **The Issue:** In multi-hop paths, determining which physical port on a switch faced the previous hop (Input Port) versus the next hop (Output Port) was ambiguous.
* **Root Cause:** Discrepancy between ODL symmetric ISL link schemas (`source-tp` / `dest-tp`) and asymmetric host attachment schemas.
* **The Solution & Code Fix:**
  Created `buildPortLookup(rawLinks)` and `computeHopPorts(path, nodesById, portLookup)` in `PathTrace.jsx`:
  ```javascript
  function buildPortLookup(rawLinks = []) {
    const portOf = {};
    rawLinks.forEach((l) => {
      const srcNode = l.source?.["source-node"];
      const srcTp = l.source?.["source-tp"];
      const dstNode = l.destination?.["dest-node"];
      const dstTp = l.destination?.["dest-tp"];
      if (srcTp) (portOf[srcNode] ??= {})[dstNode] = srcTp.split(":").pop();
      if (dstTp) (portOf[dstNode] ??= {})[srcNode] = dstTp.split(":").pop();
    });
    return portOf;
  }
  ```
  Maps termination point numbers directly to previous and next hop nodes in the computed BFS path.

---

## 3. 🌐 Topology & Infrastructure Subsystem

### 3.1 Stale `localStorage` Controller Key Bug
* **The Issue:** `Flows.jsx` and topology services were intermittently querying the wrong controller because they read an obsolete `localStorage` key (`active_sdn_controller`).
* **Root Cause:** Unused legacy toggle component left orphaned state keys in browser storage.
* **The Solution & Code Fix:**
  Unified all controller access through the live `getActiveController()` exported from `src/api/controllerManager.js`.

---

### 3.2 OpenDaylight Passive Host Discovery on Cold Boot
* **The Issue:** OpenDaylight does not populate host nodes in its topology tree until it sees active packet traffic from those hosts. On cold boot, the topology canvas displayed 8 switches but **0 hosts**.
* **Root Cause:** OpenFlow reactive discovery mechanism in ODL L2Switch / OpenFlowPlugin.
* **The Solution & Fix:**
  Added an automated `pingall` execution sequence to `RUNBOOK.md` immediately following Mininet startup:
  ```bash
  sudo screen -S mn_slicing -X stuff "pingall\n"
  ```
  Generates immediate ARP/ICMP broadcasts that force ODL to learn all host attachment points.

---

### 3.3 Northbound RESTCONF Self-Signed TLS Rejection
* **The Issue:** OpenDaylight’s Jetty connector serves RESTCONF over HTTPS on port 8443 using a self-signed certificate (`etc/odl-tls-keystore.jks`). Node.js rejected the connection by default (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
* **Root Cause:** Node's default root certificate store does not trust local self-signed certificates.
* **The Solution & Code Fix:**
  * Exported the certificate into `odl-tls-cert.pem`.
  * Added the certificate trust argument to `package.json`:
    ```json
    "server": "NODE_EXTRA_CA_CERTS=./odl-tls-cert.pem node server.js"
    ```
  * Built the `/api/tls-status` endpoint using `node:https` to inspect and confirm negotiated TLSv1.3 protocol and cipher parameters.

---

## 4. 📊 Master Summary Matrix

| # | Subsystem | Issue / Bug Encountered | Root Cause | Solution / Fix Implemented |
|---|---|---|---|---|
| **1** | **Slicing** | QoS had no effect under load | HTB queues only work on egress; was placed on ingress port | Added `listPeerPorts()` to provision all uplink/peer ports |
| **2** | **Slicing** | Rate limiting unenforced | Missing `max-rate` ceiling parameter | Added `max-rate` ($2\times$ min-rate) to OVS queue config |
| **3** | **Slicing** | Phantom host `"host 20000"` created | Regex matched letter `"h"` inside words like `"with"` | Added strict `\b` word boundary regex guards |
| **4** | **Slicing** | Cosmetic "Active" green badge | UI trusted local browser state | Built `runVerifyEnforcement()` for live ODL/OVS read-back |
| **5** | **Slicing** | Security alerts only flagged switches | No switch-to-host reverse mapping | Built `resolveSwitchHosts()` for host-scoped drop rules |
| **6** | **Path Trace** | Could not trace paths to switches | Hardcoded `Host → Host` assumption | Built generalized `resolveEndpoint()` for mixed pairs |
| **7** | **Path Trace** | Switch hop port ambiguity | ISL vs host attachment schema discrepancy | Built `buildPortLookup()` + `computeHopPorts()` |
| **8** | **Topology** | Stale controller data displayed | Read deprecated `localStorage` key | Unified access via `controllerManager.getActiveController()` |
| **9** | **Topology** | 0 hosts rendered on cold boot | ODL requires packet observation to discover hosts | Added automated `pingall` warm-up to startup runbook |
| **10** | **Backend / TLS** | RESTCONF TLS connection rejected | Node rejected ODL self-signed certificate | Bound `NODE_EXTRA_CA_CERTS=./odl-tls-cert.pem` to start script |
