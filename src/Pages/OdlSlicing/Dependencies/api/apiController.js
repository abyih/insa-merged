// import axios from "axios";

// const ODL_CONFIG = {
//   baseURL: "/api/rests/data/", 
//   username: "admin",
//   password: "admin",
// };

// const odlApi = axios.create({
//   baseURL: ODL_CONFIG.baseURL,
//   timeout: 5000,
//   headers: { 
//     "Content-Type": "application/json", 
//     "Accept": "application/json"
//   },
//   auth: { username: ODL_CONFIG.username, password: ODL_CONFIG.password },
// });

// // ==== DATA FETCHING ====

// export async function getNodes() {
//   try {
//     const res = await odlApi.get("opendaylight-inventory:nodes?content=nonconfig");
//     return res.data;
//   } catch (err) { return null; }
// }

// export async function getTopology() {
//   try {
//     const res = await odlApi.get("network-topology:network-topology?content=nonconfig");
//     return res.data;
//   } catch (err) { return null; }
// }

// export async function getNodeConnectors(nodeId) {
//   try {
//     const res = await odlApi.get(`opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`);
//     return res.data;
//   } catch (err) { return null; }
// }

// // ==== FLOW & SLICING MANAGEMENT ====

// export async function getAllFlows(nodeId) {
//   try {
//     const res = await odlApi.get(`opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`);
//     const nodeData = res?.data?.["node"]?.[0] || res?.data?.["opendaylight-inventory:node"]?.[0];
//     return nodeData?.["flow-node-inventory:table"] || [];
//   } catch (err) { return []; }
// }

// export async function installFlow(nodeId, tableId, flowId, flowData) {
//   try {
//     return await odlApi.put(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow-node-inventory:flow=${flowId}`,
//       flowData
//     );
//   } catch (err) { 
//     console.error("ODL Install Error:", err);
//     throw err; 
//   }
// }

// export async function updateFlow(nodeId, tableId, flowId, data) {
//   const flowBody = {
//     "flow-node-inventory:flow": [{
//         id: String(flowId),
//         priority: Number(data.priority),
//         "table_id": Number(tableId),
//     }]
//   };
//   return installFlow(nodeId, tableId, flowId, flowBody);
// }

// export async function deleteFlow(nodeId, tableId, flowId) {
//   try {
//     return await odlApi.delete(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow-node-inventory:flow=${flowId}`
//     );
//   } catch (err) { return null; }
// }

// // ==== QOS METER MANAGEMENT ====

// export async function installMeter(nodeId, meterId, rateKbps) {
//   const meterData = {
//     "flow-node-inventory:meter": [
//       {
//         "meter-id": meterId,
//         "meter-band-headers": {
//           "meter-band-header": [
//             {
//               "band-id": 0,
//               "drop-burst-size": 0,
//               "drop-rate": Number(rateKbps),
//               "meter-band-types": {
//                 "flags": "ofpmbt-drop"
//               }
//             }
//           ]
//         },
//         "meter-name": `QoS-Meter-${meterId}`,
//         "flags": "meter-kbps"
//       }
//     ]
//   };
//   try {
//     return await odlApi.put(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:meter=${meterId}`,
//       meterData
//     );
//   } catch (err) {
//     console.error("ODL Meter Install Error:", err);
//     throw err;
//   }
// }

// export async function deleteMeter(nodeId, meterId) {
//   try {
//     return await odlApi.delete(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:meter=${meterId}`
//     );
//   } catch (err) { return null; }
// }


// // ==== THE SDN "BRAIN" (L4 FIREWALL, QOS & PRIORITY) ====

// export async function provisionSlice(nodeId, sliceId, inPort, action = "DROP", trafficType = "All Traffic", qosParams = null) {
//   const match = { "flow-node-inventory:in-port": String(inPort) };

//   // 1. L4 FIREWALL: Build the Protocol Matches
//   const tType = trafficType.toUpperCase();
//   if (tType.includes("HTTP (TCP 80)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; // IPv4 = 0x0800 = 2048
//       match["ip-match"] = { "ip-protocol": 6 }; // TCP
//       match["tcp-destination-port"] = 80;
//   } else if (tType.includes("HTTPS (TCP 443)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 6 };
//       match["tcp-destination-port"] = 443;
//   } else if (tType.includes("SSH (TCP 22)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 6 };
//       match["tcp-destination-port"] = 22;
//   } else if (tType.includes("DNS")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 17 }; // UDP
//       match["udp-destination-port"] = 53;
//   } else if (tType.includes("ICMP")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 1 }; // ICMP
//   }

//   // 2. INSTRUCTIONS: Meters (QoS) & Actions
//   const instructions = { "instruction": [] };
//   let order = 0;

//   // If a bandwidth limit was requested, attach the Meter
//   if (qosParams && qosParams.meterId) {
//       instructions.instruction.push({
//           "order": order++,
//           "meter": { "meter-id": qosParams.meterId }
//       });
//   }

//   // Apply the Action (DROP or NORMAL forwarding)
//   const targetAction = action === "ALLOW" ? "NORMAL" : action;
  
//   if (targetAction === "DROP") {
//       instructions.instruction.push({
//           "order": order++,
//           "apply-actions": { "action": [] }
//       });
//   } else {
//       instructions.instruction.push({
//           "order": order++,
//           "apply-actions": {
//               "action": [{
//                   "order": 0,
//                   "output-action": { "output-node-connector": targetAction, "max-length": 65535 }
//               }]
//           }
//       });
//   }

//   const flowData = {
//     "flow-node-inventory:flow": [{
//         "id": String(sliceId),
//         "table_id": 0,
//         "priority": qosParams?.priority ?? 950,
//         "match": match,
//         "instructions": instructions,
//         "flow-name": `Slice-Policy-${sliceId}`
//     }]
//   };
  
//   return installFlow(nodeId, 0, sliceId, flowData);
// }

// // ==== DASHBOARD STATS ====

// export async function getConnectionStats() {
//   const [inventoryData, topologyData] = await Promise.all([getNodes(), getTopology()]);
//   const invNodes = inventoryData?.["opendaylight-inventory:nodes"]?.node || inventoryData?.node || [];
//   let switchCount = 0; let flowCount = 0;

//   invNodes.forEach(node => {
//     if (node.id && !node.id.startsWith("host:")) {
//       switchCount++;
//       const tables = node["flow-node-inventory:table"] || node["table"] || [];
//       tables.forEach(t => {
//           const flows = t.flow || t["flow-node-inventory:flow"] || [];
//           flowCount += flows.length;
//       });
//     }
//   });

//   const topologies = topologyData?.["network-topology:network-topology"]?.topology || topologyData?.topology || [];
//   const discoveredHosts = new Set();
//   topologies.forEach(t => {
//       const nodes = t.node || [];
//       nodes.forEach(n => {
//           const id = n["node-id"] || n.id || "";
//           if (id.startsWith("host:")) discoveredHosts.add(id);
//       });
//   });

//   return [
//     { name: "Switches", value: switchCount, color: "#6366f1" },
//     { name: "Active Flows", value: flowCount, color: "#f59e0b" },
//     { name: "Connected Hosts", value: discoveredHosts.size, color: "#10b981" }
//   ];
// }

// export { odlApi };












































// import axios from 'axios';

// const SERVER_URL = 'http://localhost:5050';

// export const odlApi = axios.create({
//     baseURL: SERVER_URL,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

// // ==== TOPOLOGY & INVENTORY DISCOVERY ====

// export async function getTopology() {
//     const response = await odlApi.get('/topology');
//     return response.data;
// }

// export async function getNodes() {
//     const response = await odlApi.get('/inventory');
//     return response.data;
// }

// export async function getConnectionStats() {
//     const response = await odlApi.get('/stats');
    
//     // Extract the 'node' array from the ODL JSON object so .map() works!
//     if (response.data && response.data["opendaylight-inventory:nodes"]) {
//         return response.data["opendaylight-inventory:nodes"].node || [];
//     }
    
//     return response.data || [];
// }

// export async function getNodeConnectors(nodeId) {
//     const response = await odlApi.get(`/inventory/${encodeURIComponent(nodeId)}`);
//     return response.data;
// }

// // ==== THE SDN "BRAIN" (L4 FIREWALL, QOS & PRIORITY) ====

// export async function provisionSlice(nodeId, sliceId, inPort, action = "DROP", trafficType = "All Traffic", qosParams = null) {
//   const match = {};
  
//   // If inPort is "ANY", we don't send a port match to ODL.
//   // This allows the Anomaly Detector to drop all traffic across the entire switch!
//   if (inPort && inPort !== "ANY") {
//       match["flow-node-inventory:in-port"] = String(inPort);
//   }

//   // 1. L4 FIREWALL: Build the Protocol Matches
//   if (trafficType.includes("HTTP ")) {
//     match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
//     match["ip-match"] = { "ip-protocol": 6 };                        
//     match["tcp-destination-port"] = 80;                              
//   } else if (trafficType.includes("HTTPS")) {
//     match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
//     match["ip-match"] = { "ip-protocol": 6 };                        
//     match["tcp-destination-port"] = 443;                             
//   } else if (trafficType.includes("SSH")) {
//     match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
//     match["ip-match"] = { "ip-protocol": 6 };                        
//     match["tcp-destination-port"] = 22;                              
//   } else if (trafficType.includes("DNS")) {
//     match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
//     match["ip-match"] = { "ip-protocol": 17 };                       
//     match["udp-destination-port"] = 53;                              
//   } else if (trafficType.includes("ICMP")) {
//     match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
//     match["ip-match"] = { "ip-protocol": 1 };                        
//   } else {
//     // "All Traffic" -> Matches everything
//   }

//   // 2. QOS (Meter) OR DROP (Action)
//   const instructions = { instruction: [] };

//   if (action === "DROP") {
//     instructions.instruction.push({
//       order: 0,
//       "apply-actions": {
//         action: [{ order: 0, "drop-action": {} }]
//       }
//     });
//   } else {
//     instructions.instruction.push({
//       order: 0,
//       "apply-actions": {
//         action: [{ order: 0, "output-action": { "output-node-connector": "NORMAL" } }]
//       }
//     });
//   }

//   // Inject QoS Meter if requested
//   if (qosParams && qosParams.meterId) {
//     instructions.instruction.push({
//       order: 1,
//       "meter-case": { "meter-id": qosParams.meterId }
//     });
//   }

//   // 3. ENFORCE PRIORITY
//   const priority = qosParams?.priority || 500;

//   const flowPayload = {
//     flow: [{
//       id: String(sliceId),
//       "flow-name": String(sliceId),
//       table_id: 0,
//       priority: priority,
//       match: match,
//       instructions: instructions
//     }]
//   };

//   try {
//     const response = await odlApi.put(
//       `/flow/${encodeURIComponent(nodeId)}/0/${encodeURIComponent(sliceId)}`,
//       flowPayload
//     );
//     return response.data;
//   } catch (error) {
//     console.error(`ProvisionSlice Error [Node: ${nodeId}, Slice: ${sliceId}]:`, error);
//     throw error;
//   }
// }

// export async function deleteFlow(nodeId, tableId, flowId) {
//     try {
//         const response = await odlApi.delete(
//             `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`
//         );
//         return response.data;
//     } catch (error) {
//         console.error(`DeleteFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
//         throw error;
//     }
// }

// export async function installMeter(nodeId, meterId, bandRate, burstSize = 1000) {
//     const meterPayload = {
//       meter: [{
//         "meter-id": meterId,
//         "meter-name": `qos_meter_${meterId}`,
//         "flags": "meter-kbps",
//         "meter-band-headers": {
//           "meter-band-header": [{
//             "band-id": 0,
//             "drop-rate": bandRate,
//             "drop-burst-size": burstSize,
//             "meter-band-types": { "flags": "ofpmbt-drop" }
//           }]
//         }
//       }]
//     };
  
//     try {
//       const response = await odlApi.put(
//         `/meter/${encodeURIComponent(nodeId)}/${encodeURIComponent(meterId)}`,
//         meterPayload
//       );
//       return response.data;
//     } catch (error) {
//       console.error(`InstallMeter Error [Node: ${nodeId}, Meter: ${meterId}]:`, error);
//       throw error;
//     }
// }

// export async function deleteMeter(nodeId, meterId) {
//     try {
//         const response = await odlApi.delete(
//             `/meter/${encodeURIComponent(nodeId)}/${encodeURIComponent(meterId)}`
//         );
//         return response.data;
//     } catch (error) {
//         console.error(`DeleteMeter Error [Node: ${nodeId}, Meter: ${meterId}]:`, error);
//         throw error;
//     }
// }

// export async function installFlow(nodeId, tableId, flowId, flowBody) {
//     try {
//         const response = await odlApi.put(
//             `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`,
//             flowBody
//         );
//         return response.data;
//     } catch (error) {
//         console.error(`InstallFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
//         throw error;
//     }
// }

// export async function updateFlow(nodeId, tableId, flowId, flowBody) {
//     try {
//         const response = await odlApi.put(
//             `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`,
//             flowBody
//         );
//         return response.data;
//     } catch (error) {
//         console.error(`UpdateFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
//         throw error;
//     }
// }

// // ==== OPENSTACK BACKEND DISCOVERY ====

// export async function getOpenStackInstances() {
//     const res = await odlApi.get('/openstack/instances');
//     return res.data;
// }

// export async function getOpenStackNetworks() {
//     const res = await odlApi.get('/openstack/networks');
//     return res.data;
// }




























// import axios from "axios";

// const ODL_CONFIG = {
//   baseURL: "/api/rests/data/", 
//   username: "admin",
//   password: "admin",
// };

// const odlApi = axios.create({
//   baseURL: ODL_CONFIG.baseURL,
//   timeout: 5000,
//   headers: { 
//     "Content-Type": "application/json", 
//     "Accept": "application/json"
//   },
//   auth: { username: ODL_CONFIG.username, password: ODL_CONFIG.password },
// });

// // ==== DATA FETCHING ====

// export async function getNodes() {
//   try {
//     const res = await odlApi.get("opendaylight-inventory:nodes?content=nonconfig");
//     return res.data;
//   } catch (err) { return null; }
// }

// export async function getTopology() {
//   try {
//     const res = await odlApi.get("network-topology:network-topology?content=nonconfig");
//     return res.data;
//   } catch (err) { return null; }
// }

// export async function getNodeConnectors(nodeId) {
//   try {
//     const res = await odlApi.get(`opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`);
//     return res.data;
//   } catch (err) { return null; }
// }

// // ==== FLOW & SLICING MANAGEMENT ====

// export async function getAllFlows(nodeId) {
//   try {
//     const res = await odlApi.get(`opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`);
//     const nodeData = res?.data?.["node"]?.[0] || res?.data?.["opendaylight-inventory:node"]?.[0];
//     return nodeData?.["flow-node-inventory:table"] || [];
//   } catch (err) { return []; }
// }

// export async function installFlow(nodeId, tableId, flowId, flowData) {
//   try {
//     return await odlApi.put(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow-node-inventory:flow=${flowId}`,
//       flowData
//     );
//   } catch (err) { 
//     console.error("ODL Install Error:", err);
//     throw err; 
//   }
// }

// export async function updateFlow(nodeId, tableId, flowId, data) {
//   const flowBody = {
//     "flow-node-inventory:flow": [{
//         id: String(flowId),
//         priority: Number(data.priority),
//         "table_id": Number(tableId),
//     }]
//   };
//   return installFlow(nodeId, tableId, flowId, flowBody);
// }

// export async function deleteFlow(nodeId, tableId, flowId) {
//   try {
//     return await odlApi.delete(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow-node-inventory:flow=${flowId}`
//     );
//   } catch (err) { return null; }
// }

// // ==== QOS METER MANAGEMENT ====

// export async function installMeter(nodeId, meterId, rateKbps) {
//   const meterData = {
//     "flow-node-inventory:meter": [
//       {
//         "meter-id": meterId,
//         "meter-band-headers": {
//           "meter-band-header": [
//             {
//               "band-id": 0,
//               "drop-burst-size": 0,
//               "drop-rate": Number(rateKbps),
//               "meter-band-types": {
//                 "flags": "ofpmbt-drop"
//               }
//             }
//           ]
//         },
//         "meter-name": `QoS-Meter-${meterId}`,
//         "flags": "meter-kbps"
//       }
//     ]
//   };
//   try {
//     return await odlApi.put(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:meter=${meterId}`,
//       meterData
//     );
//   } catch (err) {
//     console.error("ODL Meter Install Error:", err);
//     throw err;
//   }
// }

// export async function deleteMeter(nodeId, meterId) {
//   try {
//     return await odlApi.delete(
//       `opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:meter=${meterId}`
//     );
//   } catch (err) { return null; }
// }


// // ==== THE SDN "BRAIN" (L4 FIREWALL, QOS & PRIORITY) ====

// export async function provisionSlice(nodeId, sliceId, inPort, action = "DROP", trafficType = "All Traffic", qosParams = null) {
//   const match = { "flow-node-inventory:in-port": String(inPort) };

//   // 1. L4 FIREWALL: Build the Protocol Matches
//   const tType = trafficType.toUpperCase();
//   if (tType.includes("HTTP (TCP 80)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; // IPv4 = 0x0800 = 2048
//       match["ip-match"] = { "ip-protocol": 6 }; // TCP
//       match["tcp-destination-port"] = 80;
//   } else if (tType.includes("HTTPS (TCP 443)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 6 };
//       match["tcp-destination-port"] = 443;
//   } else if (tType.includes("SSH (TCP 22)")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 6 };
//       match["tcp-destination-port"] = 22;
//   } else if (tType.includes("DNS")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 17 }; // UDP
//       match["udp-destination-port"] = 53;
//   } else if (tType.includes("ICMP")) {
//       match["ethernet-match"] = { "ethernet-type": { "type": 2048 } };
//       match["ip-match"] = { "ip-protocol": 1 }; // ICMP
//   }

//   // 2. INSTRUCTIONS: Meters (QoS) & Actions
//   const instructions = { "instruction": [] };
//   let order = 0;

//   // If a bandwidth limit was requested, attach the Meter
//   if (qosParams && qosParams.meterId) {
//       instructions.instruction.push({
//           "order": order++,
//           "meter": { "meter-id": qosParams.meterId }
//       });
//   }

//   // Apply the Action (DROP or NORMAL forwarding)
//   const targetAction = action === "ALLOW" ? "NORMAL" : action;
  
//   if (targetAction === "DROP") {
//       instructions.instruction.push({
//           "order": order++,
//           "apply-actions": { "action": [] }
//       });
//   } else {
//       instructions.instruction.push({
//           "order": order++,
//           "apply-actions": {
//               "action": [{
//                   "order": 0,
//                   "output-action": { "output-node-connector": targetAction, "max-length": 65535 }
//               }]
//           }
//       });
//   }

//   const flowData = {
//     "flow-node-inventory:flow": [{
//         "id": String(sliceId),
//         "table_id": 0,
//         "priority": qosParams?.priority ?? 950,
//         "match": match,
//         "instructions": instructions,
//         "flow-name": `Slice-Policy-${sliceId}`
//     }]
//   };
  
//   return installFlow(nodeId, 0, sliceId, flowData);
// }

// // ==== DASHBOARD STATS ====

// export async function getConnectionStats() {
//   const [inventoryData, topologyData] = await Promise.all([getNodes(), getTopology()]);
//   const invNodes = inventoryData?.["opendaylight-inventory:nodes"]?.node || inventoryData?.node || [];
//   let switchCount = 0; let flowCount = 0;

//   invNodes.forEach(node => {
//     if (node.id && !node.id.startsWith("host:")) {
//       switchCount++;
//       const tables = node["flow-node-inventory:table"] || node["table"] || [];
//       tables.forEach(t => {
//           const flows = t.flow || t["flow-node-inventory:flow"] || [];
//           flowCount += flows.length;
//       });
//     }
//   });

//   const topologies = topologyData?.["network-topology:network-topology"]?.topology || topologyData?.topology || [];
//   const discoveredHosts = new Set();
//   topologies.forEach(t => {
//       const nodes = t.node || [];
//       nodes.forEach(n => {
//           const id = n["node-id"] || n.id || "";
//           if (id.startsWith("host:")) discoveredHosts.add(id);
//       });
//   });

//   return [
//     { name: "Switches", value: switchCount, color: "#6366f1" },
//     { name: "Active Flows", value: flowCount, color: "#f59e0b" },
//     { name: "Connected Hosts", value: discoveredHosts.size, color: "#10b981" }
//   ];
// }

// export { odlApi };























import axios from 'axios';
import { DSCP_LOW_LATENCY, QUEUE_LOW_LATENCY } from '../utils/qosConstants';

const SERVER_URL = 'http://localhost:5050';

export const odlApi = axios.create({
    baseURL: SERVER_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ==== TOPOLOGY & INVENTORY DISCOVERY ====

// Live handshake introspection (server.js opens a fresh https.request to ODL
// and reports what the TLS socket actually negotiated) — not a config echo.
export async function getTlsStatus() {
    const response = await odlApi.get('/api/tls-status');
    return response.data;
}

export async function getTopology() {
    const response = await odlApi.get('/topology');
    return response.data;
}

export async function getNodes() {
    const response = await odlApi.get('/inventory');
    return response.data;
}

export async function getConnectionStats() {
    const response = await odlApi.get('/stats');
    
    // Extract the 'node' array from the ODL JSON object so .map() works!
    if (response.data && response.data["opendaylight-inventory:nodes"]) {
        return response.data["opendaylight-inventory:nodes"].node || [];
    }
    
    return response.data || [];
}

export async function getNodeConnectors(nodeId) {
    const response = await odlApi.get(`/inventory/${encodeURIComponent(nodeId)}`);
    return response.data;
}

// ==== THE SDN "BRAIN" (L4 FIREWALL, QOS & PRIORITY) ====

export async function provisionSlice(nodeId, sliceId, inPort, action = "DROP", trafficType = "All Traffic", qosParams = null) {
  const match = {};
  
  // If inPort is "ANY", we don't send a port match to ODL.
  // This allows the Anomaly Detector to drop all traffic across the entire switch!
  if (inPort && inPort !== "ANY") {
      match["flow-node-inventory:in-port"] = String(inPort);
  }

  // 1. L4 FIREWALL: Build the Protocol Matches
  if (trafficType.includes("HTTP ")) {
    match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
    match["ip-match"] = { "ip-protocol": 6 };                        
    match["tcp-destination-port"] = 80;                              
  } else if (trafficType.includes("HTTPS")) {
    match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
    match["ip-match"] = { "ip-protocol": 6 };                        
    match["tcp-destination-port"] = 443;                             
  } else if (trafficType.includes("SSH")) {
    match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
    match["ip-match"] = { "ip-protocol": 6 };                        
    match["tcp-destination-port"] = 22;                              
  } else if (trafficType.includes("DNS")) {
    match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
    match["ip-match"] = { "ip-protocol": 17 };                       
    match["udp-destination-port"] = 53;                              
  } else if (trafficType.includes("ICMP")) {
    match["ethernet-match"] = { "ethernet-type": { "type": 2048 } }; 
    match["ip-match"] = { "ip-protocol": 1 };                        
  } else {
    // "All Traffic" -> Matches everything
  }

  // 1b. LOW-LATENCY CLASSIFICATION: match DSCP 46 on top of whatever traffic-type
  // match was built above (ip-dscp is a sibling of ip-protocol under ip-match).
  if (qosParams && qosParams.dscp) {
    match["ethernet-match"] = match["ethernet-match"] || { "ethernet-type": { "type": 2048 } };
    match["ip-match"] = { ...(match["ip-match"] || {}), "ip-dscp": DSCP_LOW_LATENCY };
  }

  // 2. QOS (Meter) OR DROP (Action)
  const instructions = { instruction: [] };

  if (action === "DROP") {
    instructions.instruction.push({
      order: 0,
      "apply-actions": {
        action: [{ order: 0, "drop-action": {} }]
      }
    });
  } else {
    const actions = [];
    // set-queue must run before the output action so the packet leaves via that queue
    if (qosParams && qosParams.dscp) {
      actions.push({ order: 0, "set-queue-action": { "queue-id": QUEUE_LOW_LATENCY } });
    }
    actions.push({ order: actions.length, "output-action": { "output-node-connector": "NORMAL" } });
    instructions.instruction.push({
      order: 0,
      "apply-actions": { action: actions }
    });
  }

  // Inject QoS Meter if requested
  if (qosParams && qosParams.meterId) {
    instructions.instruction.push({
      order: 1,
      "meter": { "meter-id": qosParams.meterId }
    });
  }

  // 3. ENFORCE PRIORITY
  const priority = qosParams?.priority || 500;

  const flowPayload = {
    flow: [{
      id: String(sliceId),
      "flow-name": String(sliceId),
      table_id: 0,
      priority: priority,
      match: match,
      instructions: instructions
    }]
  };

  try {
    const response = await odlApi.put(
      `/flow/${encodeURIComponent(nodeId)}/0/${encodeURIComponent(sliceId)}`,
      flowPayload
    );
    return response.data;
  } catch (error) {
    console.error(`ProvisionSlice Error [Node: ${nodeId}, Slice: ${sliceId}]:`, error);
    throw error;
  }
}

// ODL's actual "this doesn't exist" response for a DELETE is NOT a plain 404 —
// confirmed live: it's a 409 with error-tag "data-missing" (getMeter's own
// comment already found this for reads; deleteFlow/deleteMeter never picked
// up the same fix, so a delete-of-something-that-was-never-applied — e.g. a
// classification flow that ODL accepted into config but never actually
// pushed to the switch — threw instead of no-op'ing, breaking Pause/Resume).
function isOdlAlreadyGone(error) {
    const status = error.response?.status;
    if (status === 404) return true;
    if (status === 409) {
        const tag = error.response?.data?.errors?.error?.[0]?.["error-tag"];
        if (tag === "data-missing") return true;
    }
    return false;
}

export async function deleteFlow(nodeId, tableId, flowId) {
    try {
        const response = await odlApi.delete(
            `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`
        );
        return response.data;
    } catch (error) {
        if (isOdlAlreadyGone(error)) {
            console.warn(`Flow ${flowId} was already missing in OpenDaylight.`);
            return { success: true };
        }
        console.error(`DeleteFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
        throw error;
    }
}

export async function installMeter(nodeId, meterId, bandRate, burstSize = 1000) {
    const meterPayload = {
      meter: [{
        "meter-id": meterId,
        "meter-name": `qos_meter_${meterId}`,
        "flags": "meter-kbps",
        "meter-band-headers": {
          "meter-band-header": [{
            "band-id": 0,
            "drop-rate": bandRate,
            "drop-burst-size": burstSize,
            "meter-band-types": { "flags": "ofpmbt-drop" }
          }]
        }
      }]
    };
  
    try {
      const response = await odlApi.put(
        `/meter/${encodeURIComponent(nodeId)}/${encodeURIComponent(meterId)}`,
        meterPayload
      );
      return response.data;
    } catch (error) {
      console.error(`InstallMeter Error [Node: ${nodeId}, Meter: ${meterId}]:`, error);
      throw error;
    }
}

export async function deleteMeter(nodeId, meterId) {
    try {
        const response = await odlApi.delete(
            `/meter/${encodeURIComponent(nodeId)}/${encodeURIComponent(meterId)}`
        );
        return response.data;
    } catch (error) {
        if (isOdlAlreadyGone(error)) {
            console.warn(`Meter ${meterId} was already missing in OpenDaylight.`);
            return { success: true };
        }
        console.error(`DeleteMeter Error [Node: ${nodeId}, Meter: ${meterId}]:`, error);
        throw error;
    }
}

// ==== LOW-LATENCY QoS (DSCP 46 + OVS HTB queue) ====
// Privileged OVS operations go through the server.js proxy — the browser can't
// run ovs-vsctl directly. The OpenFlow classification itself (DSCP match +
// set-queue action, in provisionSlice above) still goes straight to ODL.

export async function provisionLatencyQueue(nodeId, port, sliceId, sliceName, bandwidthKbps) {
    try {
        const response = await odlApi.put(
            `/api/qos/${encodeURIComponent(nodeId)}/${encodeURIComponent(port)}`,
            { sliceId, sliceName, bandwidthKbps: bandwidthKbps || undefined }
        );
        return response.data; // { status: 'ACTIVE', bridge, iface, dscp, queue, reused }
    } catch (error) {
        const data = error.response?.data;
        console.error(`ProvisionLatencyQueue Error [Node: ${nodeId}, Port: ${port}]:`, data?.error || error.message);
        return { status: 'ERROR', error: data?.error || error.message };
    }
}

export async function removeLatencyQueue(nodeId, port, sliceId) {
    try {
        const response = await odlApi.delete(
            `/api/qos/${encodeURIComponent(nodeId)}/${encodeURIComponent(port)}`,
            { params: { sliceId } }
        );
        return response.data; // { status: 'REMOVED' | 'ACTIVE' }
    } catch (error) {
        const data = error.response?.data;
        console.error(`RemoveLatencyQueue Error [Node: ${nodeId}, Port: ${port}]:`, data?.error || error.message);
        return { status: 'ERROR', error: data?.error || error.message };
    }
}

export async function getQueueState(nodeId, port) {
    try {
        const response = await odlApi.get(`/api/qos/${encodeURIComponent(nodeId)}/${encodeURIComponent(port)}`);
        return response.data; // { status: 'ACTIVE' | 'NOT_CONFIGURED', bridge, iface, sliceId, sliceName, dscp, queue }
    } catch (error) {
        const data = error.response?.data;
        return { status: 'ERROR', error: data?.error || error.message };
    }
}

// ==== TOOLS PAGE — SCOPED CONTROLLER PROXY ====
// Backs the Custom API Request panel. Never talks to a controller directly —
// server.js holds the real credentials and only ever forwards to the two
// known controller base URLs (see /api/tools/proxy for the actual scoping).

export async function proxyRequest({ controller, method, path, body }) {
    const response = await odlApi.post('/api/tools/proxy', { controller, method, path, body });
    return response.data; // { status, statusText, ok, timeMs, label, data } or { ...error }
}

// A meter is only ever readable through ODL's RESTCONF in this app, but the
// switch id handed in may be in ONOS's format (`of:<16-hex-dpid>`) when
// that's the controller active in the Tools page UI — same physical dpid,
// different string. Translate it to ODL's own `openflow:<decimal>` node key
// before building the RESTCONF path, rather than failing on a format ODL
// was never going to recognize.
function toOdlNodeId(nodeId) {
    if (nodeId.startsWith('openflow:')) return nodeId;
    if (nodeId.startsWith('of:')) {
        const dpidHex = nodeId.slice('of:'.length);
        return `openflow:${BigInt(`0x${dpidHex}`).toString(10)}`;
    }
    return nodeId;
}

// Real read-back of a meter's config AND live counters, straight from ODL's
// RESTCONF (via the same scoped proxy as the rest of the Tools page — no new
// server.js route needed). Meters are only ever installed/queried via ODL in
// this app (no ONOS meter adapter exists), but the read itself works
// regardless of which controller is active in the UI — see toOdlNodeId above.
//
// Confirmed live against the real stack before writing this: a nonexistent
// meter doesn't 404 here, it's a 409 with error-tag "data-missing" — an easy
// thing to get wrong by guessing, so this was verified with a real
// install/query/delete cycle against ODL before being hardcoded.
export async function getMeter(nodeId, meterId) {
    const path = `/opendaylight-inventory:nodes/node=${encodeURIComponent(toOdlNodeId(nodeId))}/flow-node-inventory:meter=${encodeURIComponent(meterId)}`;
    let result;
    try {
        result = await proxyRequest({ controller: 'odl', method: 'GET', path });
    } catch (error) {
        return { status: 'ERROR', meterId, error: error.message };
    }

    if (result.status === 409 && result.data?.errors?.error?.[0]?.['error-tag'] === 'data-missing') {
        return { status: 'NOT_CONFIGURED', meterId };
    }
    if (!result.ok) {
        return { status: 'ERROR', meterId, error: result.data?.errors?.error?.[0]?.['error-message'] || result.error || result.statusText };
    }

    const meter = result.data?.['flow-node-inventory:meter']?.[0];
    if (!meter) return { status: 'NOT_CONFIGURED', meterId };

    const band = meter['meter-band-headers']?.['meter-band-header']?.[0];
    const stats = meter['opendaylight-meter-statistics:meter-statistics'];
    const bandStat = stats?.['meter-band-stats']?.['band-stat']?.[0];

    return {
        status: 'ACTIVE',
        meterId: meter['meter-id'],
        rateKbps: band?.['drop-rate'] ?? null,
        burstSize: band?.['drop-burst-size'] ?? null,
        packetInCount: stats?.['packet-in-count'] ?? null,
        byteInCount: stats?.['byte-in-count'] ?? null,
        bandPacketCount: bandStat?.['packet-band-count'] ?? null,
        bandByteCount: bandStat?.['byte-band-count'] ?? null,
    };
}

export async function installFlow(nodeId, tableId, flowId, flowBody) {
    try {
        const response = await odlApi.put(
            `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`,
            flowBody
        );
        return response.data;
    } catch (error) {
        console.error(`InstallFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
        throw error;
    }
}

export async function updateFlow(nodeId, tableId, flowId, flowBody) {
    try {
        const response = await odlApi.put(
            `/flow/${encodeURIComponent(nodeId)}/${encodeURIComponent(tableId)}/${encodeURIComponent(flowId)}`,
            flowBody
        );
        return response.data;
    } catch (error) {
        console.error(`UpdateFlow Error [Node: ${nodeId}, Flow: ${flowId}]:`, error);
        throw error;
    }
}

// ==== OPENSTACK BACKEND DISCOVERY ====

export async function getOpenStackInstances() {
    const res = await odlApi.get('/openstack/instances');
    return res.data;
}

export async function getOpenStackNetworks() {
    const res = await odlApi.get('/openstack/networks');
    return res.data;
}