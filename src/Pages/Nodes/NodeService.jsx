// // // // import axios from "axios";
// // // // import ENV from "./env";

// // // // const BASE_URL = ENV.getBaseURL("MD_SAL");

// // // // const NodeInventoryService = {
// // // // 	getAllNodes: async () => {
// // // // 		try {
// // // // 			const response = await fetch(
// // // // 				"http://localhost:8181/restconf/operational/opendaylight-inventory:nodes",
// // // // 				{
// // // // 					headers: {
// // // // 						Authorization: "Basic " + btoa("admin:admin"), // Replace with correct credentials if necessary
// // // // 					},
// // // // 				}
// // // // 			);
// // // // 			if (!response.ok) {
// // // // 				throw new Error(`HTTP error! status: ${response.status}`);
// // // // 			}
// // // // 			const data = await response.json();
// // // // 			console.log("Raw API Response:", data);
// // // // 			return data;
// // // // 		} catch (error) {
// // // // 			console.error("Error fetching nodes:", error);
// // // // 		}
// // // // 	},

// // // // 	getNode: async (nodeId) => {
// // // // 		try {
// // // // 			// const response = await axios.get(`http:127.0.0.1:8181/restconf/operational/opendaylight-inventory:nodes/node/${nodeId}`);
// // // // 			const response = await axios.get(
// // // // 				`${BASE_URL}/restconf/operational/opendaylight-inventory:nodes/node/${nodeId}`,
// // // // 				{
// // // // 					headers: {
// // // // 						Authorization: "Basic " + btoa("admin:admin"), // Replace with correct credentials if necessary
// // // // 					},
// // // // 				}
// // // // 			);
// // // // 			console.log(response.data.node[0]);
// // // // 			// console.log(response.data.nodes.node[0]);
// // // // 			return response.data.node[0];
// // // // 		} catch (error) {
// // // // 			console.error(
// // // // 				"Error fetching node:",
// // // // 				error.response || error.message
// // // // 			);
// // // // 			throw error;
// // // // 		}
// // // // 	},
// // // // };

// // // // export default NodeInventoryService;

// // // import axios from "axios";
// // // import ENV from "./env";

// // // const BASE_URL = ENV.getBaseURL("MD_SAL");
// // // const getActiveController = () => localStorage.getItem("active_sdn_controller") || "odl";

// // // const NodeInventoryService = {
// // // 	getAllNodes: async () => {
// // // 		const controller = getActiveController();

// // // 		if (controller === "onos") {
// // // 			try {
// // // 				const response = await fetch("/api/onos/v1/devices", {
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("onos:rocks"),
// // // 					},
// // // 				});
// // // 				if (!response.ok) throw new Error();
// // // 				const data = await response.json();
// // // 				// Convert to a minimal ODL nodes wrapper format so we don't break downstream imports
// // // 				return {
// // // 					controller: "onos",
// // // 					devices: data.devices || [],
// // // 				};
// // // 			} catch (err) {
// // // 				console.error("Error fetching ONOS devices:", err);
// // // 				return { controller: "onos", devices: [] };
// // // 			}
// // // 		}

// // // 		try {
// // // 			const response = await fetch(
// // // 				"http://localhost:8181/restconf/operational/opendaylight-inventory:nodes",
// // // 				{
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("admin:admin"),
// // // 					},
// // // 				}
// // // 			);
// // // 			if (!response.ok) {
// // // 				throw new Error(`HTTP error! status: ${response.status}`);
// // // 			}
// // // 			const data = await response.json();
// // // 			return data;
// // // 		} catch (error) {
// // // 			console.error("Error fetching ODL nodes:", error);
// // // 		}
// // // 	},

// // // 	getNode: async (nodeId) => {
// // // 		const controller = getActiveController();

// // // 		if (controller === "onos") {
// // // 			try {
// // // 				const response = await axios.get(`/api/onos/v1/devices/${encodeURIComponent(nodeId)}`, {
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("onos:rocks"),
// // // 					},
// // // 				});
// // // 				return response.data;
// // // 			} catch (err) {
// // // 				console.error("Error fetching ONOS node details:", err);
// // // 				throw err;
// // // 			}
// // // 		}

// // // 		try {
// // // 			const response = await axios.get(
// // // 				`${BASE_URL}/restconf/operational/opendaylight-inventory:nodes/node/${nodeId}`,
// // // 				{
// // // 					headers: {
// // // 						Authorization: "Basic " + btoa("admin:admin"),
// // // 					},
// // // 				}
// // // 			);
// // // 			return response.data.node[0];
// // // 		} catch (error) {
// // // 			console.error("Error fetching ODL node details:", error.response || error.message);
// // // 			throw error;
// // // 		}
// // // 	},
// // // };

// // // export default NodeInventoryService;






















// // import axios from "axios";
// // import ENV from "./env";

// // const BASE_URL = ENV.getBaseURL("MD_SAL");
// // const getActiveController = () => localStorage.getItem("active_sdn_controller") || "odl";

// // const NodeInventoryService = {
// // 	getAllNodes: async () => {
// // 		const controller = getActiveController();

// // 		if (controller === "floodlight") {
// // 			try {
// // 				const [switchesRes, devicesRes] = await Promise.all([
// // 					fetch("/api/floodlight/wm/core/controller/switches/json"),
// // 					fetch("/api/floodlight/wm/device/"),
// // 				]);
// // 				if (!switchesRes.ok || !devicesRes.ok) throw new Error();
				
// // 				const switchesData = await switchesRes.json();
// // 				const devicesData = await devicesRes.json();

// // 				return {
// // 					controller: "floodlight",
// // 					switches: switchesData || [],
// // 					devices: devicesData.devices || [],
// // 				};
// // 			} catch (err) {
// // 				console.error("Error fetching Floodlight devices:", err);
// // 				return { controller: "floodlight", switches: [], devices: [] };
// // 			}
// // 		}

// // 		if (controller === "onos") {
// // 			try {
// // 				const response = await fetch("/api/onos/v1/devices", {
// // 					headers: {
// // 						Authorization: "Basic " + btoa("onos:rocks"),
// // 					},
// // 				});
// // 				if (!response.ok) throw new Error();
// // 				const data = await response.json();
// // 				return {
// // 					controller: "onos",
// // 					devices: data.devices || [],
// // 				};
// // 			} catch (err) {
// // 				console.error("Error fetching ONOS devices:", err);
// // 				return { controller: "onos", devices: [] };
// // 			}
// // 		}

// // 		try {
// // 			const response = await fetch(
// // 				"http://localhost:8181/restconf/operational/opendaylight-inventory:nodes",
// // 				{
// // 					headers: {
// // 						Authorization: "Basic " + btoa("admin:admin"),
// // 					},
// // 				}
// // 			);
// // 			if (!response.ok) {
// // 				throw new Error(`HTTP error! status: ${response.status}`);
// // 			}
// // 			const data = await response.json();
// // 			return data;
// // 		} catch (error) {
// // 			console.error("Error fetching ODL nodes:", error);
// // 		}
// // 	},

// // 	getNode: async (nodeId) => {
// // 		const controller = getActiveController();

// // 		if (controller === "floodlight") {
// // 			try {
// // 				const [descRes, portsRes, flowsRes] = await Promise.all([
// // 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/desc/json`),
// // 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/port/json`),
// // 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/flow/json`),
// // 				]);

// // 				const descData = descRes.ok ? await descRes.json() : {};
// // 				const portsData = portsRes.ok ? await portsRes.json() : {};
// // 				const flowsData = flowsRes.ok ? await flowsRes.json() : {};

// // 				return {
// // 					controller: "floodlight",
// // 					id: nodeId,
// // 					desc: descData[nodeId] || descData || {},
// // 					ports: portsData[nodeId] || portsData.port || [],
// // 					flows: flowsData[nodeId]?.flows || flowsData.flows || [], // Safely resolves double-nesting
// // 				};
// // 			} catch (err) {
// // 				console.error("Error fetching Floodlight node details:", err);
// // 				throw err;
// // 			}
// // 		}

// // 		if (controller === "onos") {
// // 			try {
// // 				const response = await axios.get(`/api/onos/v1/devices/${encodeURIComponent(nodeId)}`, {
// // 					headers: {
// // 						Authorization: "Basic " + btoa("onos:rocks"),
// // 					},
// // 				});
// // 				return response.data;
// // 			} catch (err) {
// // 				console.error("Error fetching ONOS node details:", err);
// // 				throw err;
// // 			}
// // 		}

// // 		try {
// // 			const response = await axios.get(
// // 				`${BASE_URL}/restconf/operational/opendaylight-inventory:nodes/node/${nodeId}`,
// // 				{
// // 					headers: {
// // 						Authorization: "Basic " + btoa("admin:admin"),
// // 					},
// // 				}
// // 			);
// // 			return response.data.node[0];
// // 		} catch (error) {
// // 			console.error("Error fetching ODL node details:", error.response || error.message);
// // 			throw error;
// // 		}
// // 	},
// // };

// // export default NodeInventoryService;





// import axios from "axios";
// import ENV from "./env";

// const BASE_URL = ENV.getBaseURL("MD_SAL");
// const getActiveController = () => localStorage.getItem("active_sdn_controller") || "floodlight";

// const NodeInventoryService = {
// 	getAllNodes: async () => {
// 		const controller = getActiveController();

// 		if (controller === "floodlight") {
// 			try {
// 				const [switchesRes, devicesRes] = await Promise.all([
// 					fetch("/api/floodlight/wm/core/controller/switches/json"),
// 					fetch("/api/floodlight/wm/device/"),
// 				]);
// 				if (!switchesRes.ok || !devicesRes.ok) throw new Error("Floodlight API error");
				
// 				const switchesData = await switchesRes.json();
// 				const devicesData = await devicesRes.json();

// 				return {
// 					controller: "floodlight",
// 					switches: switchesData || [],
// 					// FIX: Floodlight returns devices as a direct array, not wrapped in a .devices object
// 					devices: Array.isArray(devicesData) ? devicesData : (devicesData.devices || []),
// 				};
// 			} catch (err) {
// 				console.error("Error fetching Floodlight devices:", err);
// 				return { controller: "floodlight", switches: [], devices: [] };
// 			}
// 		}

// 		// --- ODL PATHWAY ---
// 		try {
// 			const response = await fetch(
// 				"http://localhost:8181/restconf/operational/opendaylight-inventory:nodes",
// 				{
// 					headers: { Authorization: "Basic " + btoa("admin:admin") },
// 				}
// 			);
// 			const data = await response.json();
// 			return data;
// 		} catch (error) {
// 			console.error("Error fetching ODL nodes:", error);
// 		}
// 	},

// 	getNode: async (nodeId) => {
// 		const controller = getActiveController();

// 		if (controller === "floodlight") {
// 			try {
// 				const [descRes, portsRes, flowsRes] = await Promise.all([
// 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/desc/json`),
// 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/port/json`),
// 					fetch(`/api/floodlight/wm/core/switch/${nodeId}/flow/json`),
// 				]);

// 				const descData = await descRes.json();
// 				const portsData = await portsRes.json();
// 				const flowsData = await flowsRes.json();

// 				return {
// 					controller: "floodlight",
// 					id: nodeId,
// 					desc: descData[nodeId] || descData || {},
// 					ports: portsData[nodeId] || portsData.port || [],
// 					// FIX: Floodlight v1.2 wraps flows inside a switch-id keyed object
// 					flows: flowsData[nodeId]?.flows || flowsData.flows || [],
// 				};
// 			} catch (err) {
// 				console.error("Error fetching node details:", err);
// 				throw err;
// 			}
// 		}
//         // ... rest of ODL logic ...
// 	},
// };

// export default NodeInventoryService;














import axios from "axios";
import ENV from "./env";

const BASE_URL = ENV.getBaseURL("MD_SAL");
const getActiveController = () => localStorage.getItem("active_sdn_controller") || "odl";

const NodeInventoryService = {
	getAllNodes: async () => {
		const controller = getActiveController();

		if (controller === "floodlight") {
			try {
				const [switchesRes, devicesRes] = await Promise.all([
					fetch("/api/floodlight/wm/core/controller/switches/json"),
					fetch("/api/floodlight/wm/device/"),
				]);
				if (!switchesRes.ok || !devicesRes.ok) throw new Error();
				
				const switchesData = await switchesRes.json();
				const devicesData = await devicesRes.json();

				return {
					controller: "floodlight",
					switches: switchesData || [],
					devices: devicesData.devices || [],
				};
			} catch (err) {
				console.error("Error fetching Floodlight devices:", err);
				return { controller: "floodlight", switches: [], devices: [] };
			}
		}

		if (controller === "onos") {
			try {
				const response = await fetch("/api/onos/v1/devices", {
					headers: {
						Authorization: "Basic " + btoa("onos:rocks"),
					},
				});
				if (!response.ok) throw new Error();
				const data = await response.json();
				return {
					controller: "onos",
					devices: data.devices || [],
				};
			} catch (err) {
				console.error("Error fetching ONOS devices:", err);
				return { controller: "onos", devices: [] };
			}
		}

		try {
			const response = await fetch(
				"http://localhost:8181/restconf/operational/opendaylight-inventory:nodes",
				{
					headers: {
						Authorization: "Basic " + btoa("admin:admin"),
					},
				}
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Error fetching ODL nodes:", error);
		}
	},

	getNode: async (nodeId) => {
		const controller = getActiveController();

		if (controller === "floodlight") {
			try {
				const [descRes, portsRes, flowsRes] = await Promise.all([
					fetch(`/api/floodlight/wm/core/switch/${nodeId}/desc/json`),
					fetch(`/api/floodlight/wm/core/switch/${nodeId}/port/json`),
					fetch(`/api/floodlight/wm/core/switch/${nodeId}/flow/json`),
				]);

				const descData = descRes.ok ? await descRes.json() : {};
				const portsData = portsRes.ok ? await portsRes.json() : {};
				const flowsData = flowsRes.ok ? await flowsRes.json() : {};

				return {
					controller: "floodlight",
					id: nodeId,
					desc: descData.desc || descData || {}, // Extracts inner desc object
					ports: portsData.port_reply?.[0]?.port || portsData.port || [], // Extracts nested port array
					flows: flowsData[nodeId]?.flows || flowsData.flows || [],
				};
			} catch (err) {
				console.error("Error fetching Floodlight node details:", err);
				throw err;
			}
		}

		if (controller === "onos") {
			try {
				const response = await axios.get(`/api/onos/v1/devices/${encodeURIComponent(nodeId)}`, {
					headers: {
						Authorization: "Basic " + btoa("onos:rocks"),
					},
				});
				return response.data;
			} catch (err) {
				console.error("Error fetching ONOS node details:", err);
				throw err;
			}
		}

		try {
			const response = await axios.get(
				`${BASE_URL}/restconf/operational/opendaylight-inventory:nodes/node/${nodeId}`,
				{
					headers: {
						Authorization: "Basic " + btoa("admin:admin"),
					},
				}
			);
			return response.data.node[0];
		} catch (error) {
			console.error("Error fetching ODL node details:", error.response || error.message);
			throw error;
		}
	},
};

export default NodeInventoryService;