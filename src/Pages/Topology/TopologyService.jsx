// // // import axios from "axios";
// // // import {
// // // 	extractDeviceData,
// // // 	extractDevices,
// // // 	generatePortDots,
// // // } from "./TopologyUtils";

// // // const ENV = {
// // // 	getBaseURL: (serviceName) => {
// // // 		const baseUrls = {
// // // 			MD_SAL: "http://localhost:8181",
// // // 		};
// // // 		return baseUrls[serviceName] || "";
// // // 	},
// // // };

// // // const TOPOLOGY_CONST = {
// // // 	HT_SERVICE_ID: "host-tracker-service:id",
// // // 	IP: "ip",
// // // 	HT_SERVICE_ATTPOINTS: "host-tracker-service:attachment-points",
// // // 	HT_SERVICE_TPID: "host-tracker-service:tp-id",
// // // 	NODE_ID: "node-id",
// // // 	SOURCE_NODE: "source-node",
// // // 	DEST_NODE: "dest-node",
// // // 	SOURCE_TP: "source-tp",
// // // 	DEST_TP: "dest-tp",
// // // 	ADDRESSES: "addresses",
// // // 	HT_SERVICE_ADDS: "host-tracker-service:addresses",
// // // 	HT_SERVICE_IP: "host-tracker-service:ip",
// // // };

// // // const NetworkTopologySvc = {
// // // 	base() {
// // // 		return `${ENV.getBaseURL(
// // // 			"MD_SAL"
// // // 		)}/rests/data/network-topology:network-topology`;
// // // 	},

// // // 	async getNode(node) {
// // // 		try {
// // // 			const [topology, inventory] = await Promise.all([
// // // 				this.fetchTopology(node),
// // // 				this.fetchInventory(),
// // // 			]);
// // // 				if (!topology) {
// // // 			throw new Error("Topology is undefined — check API response or node ID");
// // // 		}
// // // 			const { nodes, links } = extractDeviceData(topology);
// // // 			const dots = generatePortDots(links, inventory);
// // // 			console.log("Processed Nodes:", nodes);
// // // 			console.log("Processed Links:", links);
// // // 			console.log("Processed Inventories:", inventory);
// // // 			console.log("Processed Dots:", dots);

// // // 			return { nodes, links, dots };
// // // 		} catch (error) {
// // // 			console.error("Error in getNode:", error);
// // // 			throw error;
// // // 		}
// // // 	},
// // // 	async fetchTopology(node) {
// // // 		try {
// // // 			const response = await fetch(

		
// // // 				`/api/rests/data/network-topology:network-topology/topology=${node}`,
 
// // // 				{
// // // 					method: "GET",
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("admin:admin"), // Replace with actual credentials
// // // 						Accept: "application/json",
// // // 					},
// // // 				}
// // // 			);
// // // 			console.log('response is' ,response)
// // // 			const data = await response.json();
// // // 			return data["network-topology:topology"][0];
// // // 		} catch (err) {
// // // 			console.error(err.message);
// // // 		}
// // // 	},
// // // 	async fetchInventory() {
// // // 		try {
// // // 			const response = await fetch(
// // // 				"/api/rests/data/opendaylight-inventory:nodes",
// // // 				{
// // // 					method: "GET",
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("admin:admin"),
// // // 						Accept: "application/json",
// // // 					},
// // // 				}
// // // 			);

// // // 			const invData = await response.json();
// // // 			console.log(invData);
// // // 			return invData["opendaylight-inventory:nodes"]["node"];
// // // 		} catch (err) {
// // // 			console.error("Failed to fetch inventory:", err);
// // // 			return [];
// // // 		}
// // // 	},
// // // };

// // // export default NetworkTopologySvc;

// // import axios from "axios";
// // import {
// //   extractDeviceData,
// //   mapOnosTopology, // Import our newly created ONOS adapter
// //   generatePortDots,
// // } from "../../mappers/topology-mapper";

// // const ENV = {
// //   getBaseURL: (serviceName) => {
// //     const baseUrls = {
// //       MD_SAL: "http://localhost:8181",
// //     };
// //     return baseUrls[serviceName] || "";
// //   },
// // };

// // const NetworkTopologySvc = {
// //   getHeaders(controller) {
// //     const auth = controller === "onos" ? "onos:rocks" : "admin:admin";
// //     return {
// //       Authorization: "Basic " + btoa(auth),
// //       Accept: "application/json",
// //     };
// //   },

// //   async getNode() {
// //     const controller = localStorage.getItem("active_sdn_controller") || "odl";

// //     if (controller === "onos") {
// //       try {
// //         const [devicesRes, linksRes, hostsRes] = await Promise.all([
// //           fetch("/api/onos/v1/devices", { headers: this.getHeaders("onos") }),
// //           fetch("/api/onos/v1/links", { headers: this.getHeaders("onos") }),
// //           fetch("/api/onos/v1/hosts", { headers: this.getHeaders("onos") }),
// //         ]);

// //         const devicesData = await devicesRes.json();
// //         const linksData = await linksRes.json();
// //         const hostsData = await hostsRes.json();

// //         const rawOnos = {
// //           devices: devicesData.devices || [],
// //           links: linksData.links || [],
// //           hosts: hostsData.hosts || [],
// //         };

// //         // Execute the ONOS adapter DTO mapping
// //         return mapOnosTopology(rawOnos);
// //       } catch (error) {
// //         console.error("ONOS Topology Sync failed:", error);
// //         throw error;
// //       }
// //     }

// //     // Default ODL code pathway (remains completely untouched for your friends!)
// //     try {
// //       const [topologyRaw, inventory] = await Promise.all([
// //         this.fetchTopology(),
// //         this.fetchInventory(),
// //       ]);

// //       if (!topologyRaw) {
// //         throw new Error("No topology data received from controller");
// //       }

// //       const root = topologyRaw["network-topology:network-topology"] || topologyRaw;
// //       const topologyArray = root.topology || [];
// //       const targetTopology = topologyArray[0];

// //       if (!targetTopology) {
// //         throw new Error("No active topology found. Is Mininet running?");
// //       }

// //       const { nodes, links } = extractDeviceData(targetTopology);
// //       const dots = generatePortDots(links, inventory);

// //       return { nodes, links, dots, raw: targetTopology };
// //     } catch (error) {
// //       console.error("ODL Topology Sync failed:", error);
// //       throw error;
// //     }
// //   },

// //   async fetchTopology() {
// //     try {
// //       const response = await fetch(
// //         "/api/rests/data/network-topology:network-topology", 
// //         {
// //           method: "GET",
// //           headers: this.getHeaders("odl"),
// //         }
// //       );

// //       if (!response.ok) {
// //         const errorText = await response.text();
// //         throw new Error(`ODL Topology API Error (${response.status}): ${errorText}`);
// //       }

// //       return await response.json();
// //     } catch (err) {
// //       console.error("Fetch Topology failed:", err.message);
// //       throw err;
// //     }
// //   },

// //   async fetchInventory() {
// //     try {
// //       const response = await fetch(
// //         "/api/rests/data/opendaylight-inventory:nodes",
// //         {
// //           method: "GET",
// //           headers: this.getHeaders("odl"),
// //         }
// //       );

// //       if (!response.ok) return [];

// //       const invData = await response.json();
// //       return invData["opendaylight-inventory:nodes"]?.node || [];
// //     } catch (err) {
// //       console.error("Failed to fetch inventory:", err);
// //       return [];
// //     }
// //   },
// // };

// // export default NetworkTopologySvc;


// import axios from "axios";
// import {
//   extractDeviceData,
//   mapOnosTopology, 
//   mapFloodlightTopology,
//   generatePortDots,
// } from "../../mappers/topology-mapper";

// const ENV = {
//   getBaseURL: (serviceName) => {
//     const baseUrls = {
//       MD_SAL: "http://localhost:8181",
//     };
//     return baseUrls[serviceName] || "";
//   },
// };

// const NetworkTopologySvc = {
//   getHeaders(controller) {
//     const auth = controller === "onos" ? "onos:rocks" : "admin:admin";
//     return {
//       Authorization: "Basic " + btoa(auth),
//       Accept: "application/json",
//     };
//   },

//   async getNode() {
//     const controller = localStorage.getItem("active_sdn_controller") || "odl";

//     if (controller === "floodlight") {
//       try {
//         const [switchesRes, linksRes, devicesRes] = await Promise.all([
//           fetch("/api/floodlight/wm/core/controller/switches/json"),
//           fetch("/api/floodlight/wm/topology/links/json"),
//           fetch("/api/floodlight/wm/device/"),
//         ]);

//         const switchesData = await switchesRes.json();
//         const linksData = await linksRes.json();
//         const devicesData = await devicesRes.json();

//         const rawFloodlight = {
//           switches: switchesData || [],
//           links: linksData || [],
//           devices: devicesData.devices || [],
//         };

//         return mapFloodlightTopology(rawFloodlight);
//       } catch (error) {
//         console.error("Floodlight Topology Sync failed:", error);
//         throw error;
//       }
//     }


//     if (controller === "onos") {
//       try {
//         const [devicesRes, linksRes, hostsRes] = await Promise.all([
//           fetch("/api/onos/v1/devices", { headers: this.getHeaders("onos") }),
//           fetch("/api/onos/v1/links", { headers: this.getHeaders("onos") }),
//           fetch("/api/onos/v1/hosts", { headers: this.getHeaders("onos") }),
//         ]);

//         const devicesData = await devicesRes.json();
//         const linksData = await linksRes.json();
//         const hostsData = await hostsRes.json();

//         const rawOnos = {
//           devices: devicesData.devices || [],
//           links: linksData.links || [],
//           hosts: hostsData.hosts || [],
//         };

//         // Execute the ONOS adapter DTO mapping
//         return mapOnosTopology(rawOnos);
//       } catch (error) {
//         console.error("ONOS Topology Sync failed:", error);
//         throw error;
//       }
//     }

//     // Default ODL code pathway (remains completely untouched for your friends!)
//     try {
//       const [topologyRaw, inventory] = await Promise.all([
//         this.fetchTopology(),
//         this.fetchInventory(),
//       ]);

//       if (!topologyRaw) {
//         throw new Error("No topology data received from controller");
//       }

//       const root = topologyRaw["network-topology:network-topology"] || topologyRaw;
//       const topologyArray = root.topology || [];
//       const targetTopology = topologyArray[0];

//       if (!targetTopology) {
//         throw new Error("No active topology found. Is Mininet running?");
//       }

//       const { nodes, links } = extractDeviceData(targetTopology);
//       const dots = generatePortDots(links, inventory);

//       return { nodes, links, dots, raw: targetTopology };
//     } catch (error) {
//       console.error("ODL Topology Sync failed:", error);
//       throw error;
//     }
//   },

//   async fetchTopology() {
//     try {
//       const response = await fetch(
//         "/api/rests/data/network-topology:network-topology", 
//         {
//           method: "GET",
//           headers: this.getHeaders("odl"),
//         }
//       );

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`ODL Topology API Error (${response.status}): ${errorText}`);
//       }

//       return await response.json();
//     } catch (err) {
//       console.error("Fetch Topology failed:", err.message);
//       throw err;
//     }
//   },

//   async fetchInventory() {
//     try {
//       const response = await fetch(
//         "/api/rests/data/opendaylight-inventory:nodes",
//         {
//           method: "GET",
//           headers: this.getHeaders("odl"),
//         }
//       );

//       if (!response.ok) return [];

//       const invData = await response.json();
//       return invData["opendaylight-inventory:nodes"]?.node || [];
//     } catch (err) {
//       console.error("Failed to fetch inventory:", err);
//       return [];
//     }
//   },
// };

// export default NetworkTopologySvc;



























import { odlApi } from "../../api/apiController";
import * as controllerManager from "../../api/controllerManager";
import {
  extractDeviceData,
  generatePortDots,
} from "../../mappers/topology-mapper";

const NetworkTopologySvc = {
  getHeaders() {
    return {
      Authorization: "Basic " + btoa("admin:admin"),
      Accept: "application/json",
    };
  },

  async getNode() {
    // ONOS path: fetch via the adapter (already translated into ODL's raw
    // topology shape) and reuse the exact same extractDeviceData() below —
    // this UI code doesn't need to know which controller produced the data.
    if (controllerManager.getActiveController() !== "odl") {
      const raw = await controllerManager.getTopology();
      const unified = raw.topology?.[0] || { node: [], link: [] };
      const { nodes, links } = extractDeviceData(unified);
      const dots = generatePortDots(links, []);
      return { nodes, links, dots, raw: unified };
    }

    try {
      // 1. Fetch the root topology and inventory simultaneously
      const [topologyRaw, inventory] = await Promise.all([
        this.fetchTopology(),
        this.fetchInventory(),
      ]);

      if (!topologyRaw) throw new Error("No data from ODL");

      // 2. ODL 23 returns an array of topologies. We merge them.
      const topologies = topologyRaw["network-topology:network-topology"]?.topology || [];
      
      let mergedNodes = [];
      let mergedLinks = [];

      topologies.forEach(topo => {
        if (topo.node) mergedNodes = [...mergedNodes, ...topo.node];
        if (topo.link) mergedLinks = [...mergedLinks, ...topo.link];
      });

      const unifiedTopology = { node: mergedNodes, link: mergedLinks };

      // 3. Map the data using our upgraded utility
      const { nodes, links } = extractDeviceData(unifiedTopology);
      const dots = generatePortDots(links, inventory);

      return { nodes, links, dots, raw: unifiedTopology };
    } catch (error) {
      console.error("ODL Topology Sync failed:", error);
      throw error;
    }
  },

  async fetchTopology() {
    const response = await fetch("/api/rests/data/network-topology:network-topology", {
      headers: this.getHeaders(),
    });
    return await response.json();
  },

  async fetchInventory() {
    const response = await fetch("/api/rests/data/opendaylight-inventory:nodes", {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data["opendaylight-inventory:nodes"]?.node || [];
  },
};

export default NetworkTopologySvc;