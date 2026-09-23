// // // // // import { parseTimestamp } from "../utils/helper";

// // // // // export const extractDevices = (topologyData) => {
// // // // // 	const nodes = topologyData.topology[0].node;
// // // // // 	const readableNodes = [];

// // // // // 	for (const node of nodes) {
// // // // // 		const nodeId = node["node-id"];

// // // // // 		if (nodeId.startsWith("host:")) {
// // // // // 			const address = node["host-tracker-service:addresses"]?.[0];
// // // // // 			const attachment =
// // // // // 				node["host-tracker-service:attachment-points"]?.[0];

// // // // // 			readableNodes.push({
// // // // // 				type: "host",
// // // // // 				id: nodeId,
// // // // // 				macAddress: address?.mac || "N/A",
// // // // // 				ipAddress: address?.ip || "N/A",
// // // // // 				firstSeen: address?.["first-seen"]
// // // // // 					? parseTimestamp(address["first-seen"])
// // // // // 					: "N/A",
// // // // // 				lastSeen: address?.["last-seen"]
// // // // // 					? parseTimestamp(address["last-seen"])
// // // // // 					: "N/A",
// // // // // 				connectedTo:
// // // // // 					attachment?.["tp-id"]?.split(":")?.slice(0, 2)?.join(":") ||
// // // // // 					"N/A",
// // // // // 				port: attachment?.["tp-id"] || "N/A",
// // // // // 			});
// // // // // 		} else if (nodeId.startsWith("openflow:")) {
// // // // // 			const ports =
// // // // // 				node["termination-point"]?.map((tp) => tp["tp-id"]) || [];

// // // // // 			readableNodes.push({
// // // // // 				type: "switch",
// // // // // 				id: nodeId,
// // // // // 				ports,
// // // // // 			});
// // // // // 		}
// // // // // 	}

// // // // // 	return readableNodes;
// // // // // };
// // // // // // const TOPOLOGY_CONST = {
// // // // // // 	HT_SERVICE_ID: "host-tracker-service:id",
// // // // // // 	IP: "ip",
// // // // // // 	HT_SERVICE_ATTPOINTS: "host-tracker-service:attachment-points",
// // // // // // 	HT_SERVICE_TPID: "host-tracker-service:tp-id",
// // // // // // 	NODE_ID: "node-id",
// // // // // // 	SOURCE_NODE: "source-node",
// // // // // // 	DEST_NODE: "dest-node",
// // // // // // 	SOURCE_TP: "source-tp",
// // // // // // 	DEST_TP: "dest-tp",
// // // // // // 	ADDRESSES: "addresses",
// // // // // // 	HT_SERVICE_ADDS: "host-tracker-service:addresses",
// // // // // // 	HT_SERVICE_IP: "host-tracker-service:ip",
// // // // // // };
// // // // // const TOPOLOGY_CONST = {
// // // // // 	NODE_ID: "node-id",
// // // // // 	ADDRESSES: "host-tracker-service:addresses",
// // // // // 	HT_SERVICE_ADDS: "host-tracker-service:addresses",
// // // // // 	IP: "ip",
// // // // // 	MAC: "mac",
// // // // // 	FIRST_SEEN: "first-seen",
// // // // // 	LAST_SEEN: "last-seen",
// // // // // 	ATTACHMENT_POINTS: "host-tracker-service:attachment-points",
// // // // // 	SOURCE_NODE: "source-node",
// // // // // 	SOURCE_TP: "source-tp",
// // // // // 	DEST_NODE: "dest-node",
// // // // // 	DEST_TP: "dest-tp",
// // // // // };

// // // // // export const extractDeviceData = (topology) => {
// // // // // 	const nodes = [];
// // // // // 	const links = [];
// // // // // 	const linksMap = {};
// // // // // 	// Process Nodes
// // // // // 	if (Array.isArray(topology.node)) {
// // // // // 		topology.node.forEach((nodeData) => {
// // // // // 			let groupType = "";
// // // // // 			let nodeTitle = "";
// // // // // 			const nodeId = nodeData[TOPOLOGY_CONST.NODE_ID];

// // // // // 			if (nodeId && nodeId.includes("host")) {
// // // // // 				groupType = "host";
// // // // // 				nodeTitle += `ID: <b>${nodeId}</b><br>`;

// // // // // 				const addresses =
// // // // // 					nodeData[TOPOLOGY_CONST.ADDRESSES] ||
// // // // // 					nodeData[TOPOLOGY_CONST.HT_SERVICE_ADDS];

// // // // // 				if (Array.isArray(addresses)) {
// // // // // 					const addr = addresses[0]; // assuming one address per host
// // // // // 					if (addr) {
// // // // // 						const ip =
// // // // // 							addr[TOPOLOGY_CONST.IP] ||
// // // // // 							addr[TOPOLOGY_CONST.HT_SERVICE_IP];
// // // // // 						const mac = addr[TOPOLOGY_CONST.MAC] || "N/A";
// // // // // 						const firstSeen = addr[TOPOLOGY_CONST.FIRST_SEEN];
// // // // // 						const lastSeen = addr[TOPOLOGY_CONST.LAST_SEEN];
// // // // // 						nodeTitle += `IP: <b>${ip}</b><br>`;
// // // // // 						nodeTitle += `MAC: <b>${mac}</b><br>`;
// // // // // 						nodeTitle += `First Seen: <b>${new Date(
// // // // // 							firstSeen
// // // // // 						).toLocaleString()}</b><br>`;
// // // // // 						nodeTitle += `Last Seen: <b>${new Date(
// // // // // 							lastSeen
// // // // // 						).toLocaleString()}</b><br>`;
// // // // // 					}
// // // // // 				}

// // // // // 				const attachments =
// // // // // 					nodeData[TOPOLOGY_CONST.ATTACHMENT_POINTS] || [];
// // // // // 				if (attachments.length > 0) {
// // // // // 					nodeTitle += `Connected Ports:<br>`;
// // // // // 					attachments.forEach((ap, i) => {
// // // // // 						const port = ap["tp-id"];
// // // // // 						const active = ap["active"] ? "✅" : "❌";
// // // // // 						nodeTitle += `&nbsp;&nbsp;• ${port} ${active}<br>`;
// // // // // 					});
// // // // // 				}

// // // // // 				nodeTitle += "Type: Host";
// // // // // 			} else {
// // // // // 				groupType = "switch";
// // // // // 				nodeTitle += `Name: <b>${nodeId}</b><br>Type: Switch<br>Ports:<br>`;

// // // // // 				const tps = nodeData["termination-point"] || [];
// // // // // 				tps.forEach((tp) => {
// // // // // 					const tpId = tp["tp-id"];
// // // // // 					nodeTitle += `&nbsp;&nbsp;• ${tpId}<br>`;
// // // // // 				});
// // // // // 			}

// // // // // 			// Push node
// // // // // 			nodes.push({
// // // // // 				id: nodeId,
// // // // // 				label: nodeId,
// // // // // 				group: groupType,
// // // // // 				value: 20,
// // // // // 				title: nodeTitle,
// // // // // 			});
// // // // // 		});
// // // // // 	}

// // // // // 	// Process Links
// // // // // 	if (Array.isArray(topology.link)) {
// // // // // 		topology.link.forEach((linkData) => {
// // // // // 			const srcId = linkData.source[TOPOLOGY_CONST.SOURCE_NODE];
// // // // // 			const dstId = linkData.destination[TOPOLOGY_CONST.DEST_NODE];
// // // // // 			const srcPort = linkData.source[TOPOLOGY_CONST.SOURCE_TP];
// // // // // 			const dstPort = linkData.destination[TOPOLOGY_CONST.DEST_TP];

// // // // // 			if (
// // // // // 				!linksMap[`${srcId}:${dstId}`] &&
// // // // // 				!linksMap[`${dstId}:${srcId}`]
// // // // // 			) {
// // // // // 				links.push({
// // // // // 					from: srcId,
// // // // // 					to: dstId,
// // // // // 					title: `Source Port: <b>${srcPort}</b><br>Dest Port: <b>${dstPort}</b>`,
// // // // // 				});
// // // // // 				linksMap[`${srcId}:${dstId}`] = true;
// // // // // 			}
// // // // // 		});
// // // // // 	}

// // // // // 	return { nodes, links };
// // // // // };

// // // // import { parseTimestamp } from "../utils/helper";

// // // // export const extractDevices = (topologyData) => {
// // // // 	const nodes = topologyData.topology[0].node;
// // // // 	const readableNodes = [];

// // // // 	for (const node of nodes) {
// // // // 		const nodeId = node["node-id"];

// // // // 		if (nodeId.startsWith("host:")) {
// // // // 			const address = node["host-tracker-service:addresses"]?.[0];
// // // // 			const attachment =
// // // // 				node["host-tracker-service:attachment-points"]?.[0];

// // // // 			readableNodes.push({
// // // // 				type: "host",
// // // // 				id: nodeId,
// // // // 				macAddress: address?.mac || "N/A",
// // // // 				ipAddress: address?.ip || "N/A",
// // // // 				firstSeen: address?.["first-seen"]
// // // // 					? parseTimestamp(address["first-seen"])
// // // // 					: "N/A",
// // // // 				lastSeen: address?.["last-seen"]
// // // // 					? parseTimestamp(address["last-seen"])
// // // // 					: "N/A",
// // // // 				connectedTo:
// // // // 					attachment?.["tp-id"]?.split(":")?.slice(0, 2)?.join(":") ||
// // // // 					"N/A",
// // // // 				port: attachment?.["tp-id"] || "N/A",
// // // // 			});
// // // // 		} else if (nodeId.startsWith("openflow:")) {
// // // // 			const ports =
// // // // 				node["termination-point"]?.map((tp) => tp["tp-id"]) || [];

// // // // 			readableNodes.push({
// // // // 				type: "switch",
// // // // 				id: nodeId,
// // // // 				ports,
// // // // 			});
// // // // 		}
// // // // 	}

// // // // 	return readableNodes;
// // // // };

// // // // const TOPOLOGY_CONST = {
// // // // 	NODE_ID: "node-id",
// // // // 	ADDRESSES: "host-tracker-service:addresses",
// // // // 	HT_SERVICE_ADDS: "host-tracker-service:addresses",
// // // // 	IP: "ip",
// // // // 	MAC: "mac",
// // // // 	FIRST_SEEN: "first-seen",
// // // // 	LAST_SEEN: "last-seen",
// // // // 	ATTACHMENT_POINTS: "host-tracker-service:attachment-points",
// // // // 	SOURCE_NODE: "source-node",
// // // // 	SOURCE_TP: "source-tp",
// // // // 	DEST_NODE: "dest-node",
// // // // 	DEST_TP: "dest-tp",
// // // // };

// // // // export const extractDeviceData = (topology) => {
// // // // 	const nodes = [];
// // // // 	const links = [];
// // // // 	const linksMap = {};
// // // // 	if (Array.isArray(topology.node)) {
// // // // 		topology.node.forEach((nodeData) => {
// // // // 			let groupType = "";
// // // // 			let nodeTitle = "";
// // // // 			const nodeId = nodeData[TOPOLOGY_CONST.NODE_ID];

// // // // 			if (nodeId && nodeId.includes("host")) {
// // // // 				groupType = "host";
// // // // 				nodeTitle += `ID: <b>${nodeId}</b><br>`;

// // // // 				const addresses =
// // // // 					nodeData[TOPOLOGY_CONST.ADDRESSES] ||
// // // // 					nodeData[TOPOLOGY_CONST.HT_SERVICE_ADDS];

// // // // 				if (Array.isArray(addresses)) {
// // // // 					const addr = addresses[0];
// // // // 					if (addr) {
// // // // 						const ip =
// // // // 							addr[TOPOLOGY_CONST.IP] ||
// // // // 							addr[TOPOLOGY_CONST.HT_SERVICE_IP];
// // // // 						const mac = addr[TOPOLOGY_CONST.MAC] || "N/A";
// // // // 						const firstSeen = addr[TOPOLOGY_CONST.FIRST_SEEN];
// // // // 						const lastSeen = addr[TOPOLOGY_CONST.LAST_SEEN];
// // // // 						nodeTitle += `IP: <b>${ip}</b><br>`;
// // // // 						nodeTitle += `MAC: <b>${mac}</b><br>`;
// // // // 						nodeTitle += `First Seen: <b>${new Date(
// // // // 							firstSeen
// // // // 						).toLocaleString()}</b><br>`;
// // // // 						nodeTitle += `Last Seen: <b>${new Date(
// // // // 							lastSeen
// // // // 						).toLocaleString()}</b><br>`;
// // // // 					}
// // // // 				}

// // // // 				const attachments =
// // // // 					nodeData[TOPOLOGY_CONST.ATTACHMENT_POINTS] || [];
// // // // 				if (attachments.length > 0) {
// // // // 					nodeTitle += `Connected Ports:<br>`;
// // // // 					attachments.forEach((ap, i) => {
// // // // 						const port = ap["tp-id"];
// // // // 						const active = ap["active"] ? "✅" : "❌";
// // // // 						nodeTitle += `&nbsp;&nbsp;• ${port} ${active}<br>`;
// // // // 					});
// // // // 				}

// // // // 				nodeTitle += "Type: Host";
// // // // 			} else {
// // // // 				groupType = "switch";
// // // // 				nodeTitle += `Name: <b>${nodeId}</b><br>Type: Switch<br>Ports:<br>`;

// // // // 				const tps = nodeData["termination-point"] || [];
// // // // 				tps.forEach((tp) => {
// // // // 					const tpId = tp["tp-id"];
// // // // 					nodeTitle += `&nbsp;&nbsp;• ${tpId}<br>`;
// // // // 				});
// // // // 			}

// // // // 			nodes.push({
// // // // 				id: nodeId,
// // // // 				label: nodeId,
// // // // 				group: groupType,
// // // // 				value: 20,
// // // // 				title: nodeTitle,
// // // // 			});
// // // // 		});
// // // // 	}

// // // // 	if (Array.isArray(topology.link)) {
// // // // 		topology.link.forEach((linkData) => {
// // // // 			const srcId = linkData.source[TOPOLOGY_CONST.SOURCE_NODE];
// // // // 			const dstId = linkData.destination[TOPOLOGY_CONST.DEST_NODE];
// // // // 			const srcPort = linkData.source[TOPOLOGY_CONST.SOURCE_TP];
// // // // 			const dstPort = linkData.destination[TOPOLOGY_CONST.DEST_TP];

// // // // 			if (
// // // // 				!linksMap[`${srcId}:${dstId}`] &&
// // // // 				!linksMap[`${dstId}:${srcId}`]
// // // // 			) {
// // // // 				links.push({
// // // // 					from: srcId,
// // // // 					to: dstId,
// // // // 					title: `Source Port: <b>${srcPort}</b><br>Dest Port: <b>${dstPort}</b>`,
// // // // 				});
// // // // 				linksMap[`${srcId}:${dstId}`] = true;
// // // // 			}
// // // // 		});
// // // // 	}

// // // // 	return { nodes, links };
// // // // };

// // // // /**
// // // //  * Maps raw ONOS topology arrays to standard DTO format
// // // //  */
// // // // export const mapOnosTopology = (onosRaw) => {
// // // // 	const devices = onosRaw.devices || [];
// // // // 	const links = onosRaw.links || [];
// // // // 	const hosts = onosRaw.hosts || [];

// // // // 	const nodes = [];
// // // // 	const mappedLinks = [];

// // // // 	// Map Switches
// // // // 	devices.forEach((dev) => {
// // // // 		nodes.push({
// // // // 			id: dev.id,
// // // // 			label: dev.id,
// // // // 			group: "switch",
// // // // 			value: 20,
// // // // 			title: `Name: <b>${dev.id}</b><br>Type: Switch<br>Manufacturer: ${dev.mfr || "N/A"}<br>Hardware: ${dev.hw || "N/A"}`,
// // // // 		});
// // // // 	});

// // // // 	// Map Hosts
// // // // 	hosts.forEach((host) => {
// // // // 		const hostId = `host:${host.mac}`;
// // // // 		const ips = host.ipAddresses || [];
// // // // 		nodes.push({
// // // // 			id: hostId,
// // // // 			label: hostId,
// // // // 			group: "host",
// // // // 			value: 20,
// // // // 			title: `ID: <b>${hostId}</b><br>IP: <b>${ips[0] || "N/A"}</b><br>MAC: <b>${host.mac}</b>`,
// // // // 		});

// // // // 		// Map host links to switches
// // // // 		if (host.locations && host.locations.length > 0) {
// // // // 			const loc = host.locations[0];
// // // // 			mappedLinks.push({
// // // // 				from: hostId,
// // // // 				to: loc.elementId,
// // // // 				title: `Port: <b>${loc.port}</b>`,
// // // // 			});
// // // // 		}
// // // // 	});

// // // // 	// Map Inter-switch Links
// // // // 	links.forEach((link) => {
// // // // 		mappedLinks.push({
// // // // 			from: link.src.device,
// // // // 			to: link.dst.device,
// // // // 			title: `Source Port: <b>${link.src.port}</b><br>Dest Port: <b>${link.dst.port}</b>`,
// // // // 		});
// // // // 	});

// // // // 	return { nodes, links: mappedLinks, dots: [] };
// // // // };

// // // // /**
// // // //  * RESTORED: Port dots mapping logic for ODL topology interface links
// // // //  */
// // // // export const generatePortDots = (topologyLinks, inventoryNodes) => {
// // // // 	const portDots = [];
// // // // 	const connectorMap = {};

// // // // 	inventoryNodes.forEach((node) => {
// // // // 		const connectors = node["node-connector"] || [];
// // // // 		connectors.forEach((conn) => {
// // // // 			const connectorId = conn["id"];
// // // // 			const mac = conn["flow-node-inventory:hardware-address"];
// // // // 			const portName = conn["flow-node-inventory:name"];
// // // // 			if (mac && !connectorId.includes("LOCAL")) {
// // // // 				connectorMap[connectorId] = {
// // // // 					mac,
// // // // 					port: portName.split("-")[1] || connectorId.split(":").pop(),
// // // // 					nodeId: node.id,
// // // // 				};
// // // // 			}
// // // // 		});
// // // // 	});

// // // // 	topologyLinks.forEach((link, index) => {
// // // // 		const srcConnectorId = link.srcPort || link.from;
// // // // 		const dstConnectorId = link.dstPort || link.to;

// // // // 		if (connectorMap[srcConnectorId]) {
// // // // 			portDots.push({
// // // // 				id: `dot-${index}-src`,
// // // // 				source: link.from,
// // // // 				target: link.to,
// // // // 				mac: connectorMap[srcConnectorId].mac,
// // // // 				port: connectorMap[srcConnectorId].port,
// // // // 			});
// // // // 		}

// // // // 		if (connectorMap[dstConnectorId]) {
// // // // 			portDots.push({
// // // // 				id: `dot-${index}-dst`,
// // // // 				source: link.to,
// // // // 				target: link.from,
// // // // 				mac: connectorMap[dstConnectorId].mac,
// // // // 				port: connectorMap[dstConnectorId].port,
// // // // 			});
// // // // 		}
// // // // 	});

// // // // 	return portDots;
// // // // };


// // // import { parseTimestamp } from "../utils/helper";

// // // export const extractDevices = (topologyData) => {
// // // 	const nodes = topologyData.topology[0].node;
// // // 	const readableNodes = [];

// // // 	for (const node of nodes) {
// // // 		const nodeId = node["node-id"];

// // // 		if (nodeId.startsWith("host:")) {
// // // 			const address = node["host-tracker-service:addresses"]?.[0];
// // // 			const attachment =
// // // 				node["host-tracker-service:attachment-points"]?.[0];

// // // 			readableNodes.push({
// // // 				type: "host",
// // // 				id: nodeId,
// // // 				macAddress: address?.mac || "N/A",
// // // 				ipAddress: address?.ip || "N/A",
// // // 				firstSeen: address?.["first-seen"]
// // // 					? parseTimestamp(address["first-seen"])
// // // 					: "N/A",
// // // 				lastSeen: address?.["last-seen"]
// // // 					? parseTimestamp(address["last-seen"])
// // // 					: "N/A",
// // // 				connectedTo:
// // // 					attachment?.["tp-id"]?.split(":")?.slice(0, 2)?.join(":") ||
// // // 					"N/A",
// // // 				port: attachment?.["tp-id"] || "N/A",
// // // 			});
// // // 		} else if (nodeId.startsWith("openflow:")) {
// // // 			const ports =
// // // 				node["termination-point"]?.map((tp) => tp["tp-id"]) || [];

// // // 			readableNodes.push({
// // // 				type: "switch",
// // // 				id: nodeId,
// // // 				ports,
// // // 			});
// // // 		}
// // // 	}

// // // 	return readableNodes;
// // // };

// // // const TOPOLOGY_CONST = {
// // // 	NODE_ID: "node-id",
// // // 	ADDRESSES: "host-tracker-service:addresses",
// // // 	HT_SERVICE_ADDS: "host-tracker-service:addresses",
// // // 	IP: "ip",
// // // 	MAC: "mac",
// // // 	FIRST_SEEN: "first-seen",
// // // 	LAST_SEEN: "last-seen",
// // // 	ATTACHMENT_POINTS: "host-tracker-service:attachment-points",
// // // 	SOURCE_NODE: "source-node",
// // // 	SOURCE_TP: "source-tp",
// // // 	DEST_NODE: "dest-node",
// // // 	DEST_TP: "dest-tp",
// // // };

// // // export const extractDeviceData = (topology) => {
// // // 	const nodes = [];
// // // 	const links = [];
// // // 	const linksMap = {};
// // // 	if (Array.isArray(topology.node)) {
// // // 		topology.node.forEach((nodeData) => {
// // // 			let groupType = "";
// // // 			let nodeTitle = "";
// // // 			const nodeId = nodeData[TOPOLOGY_CONST.NODE_ID];

// // // 			if (nodeId && nodeId.includes("host")) {
// // // 				groupType = "host";
// // // 				nodeTitle += `ID: <b>${nodeId}</b><br>`;

// // // 				const addresses =
// // // 					nodeData[TOPOLOGY_CONST.ADDRESSES] ||
// // // 					nodeData[TOPOLOGY_CONST.HT_SERVICE_ADDS];

// // // 				if (Array.isArray(addresses)) {
// // // 					const addr = addresses[0];
// // // 					if (addr) {
// // // 						const ip =
// // // 							addr[TOPOLOGY_CONST.IP] ||
// // // 							addr[TOPOLOGY_CONST.HT_SERVICE_IP];
// // // 						const mac = addr[TOPOLOGY_CONST.MAC] || "N/A";
// // // 						const firstSeen = addr[TOPOLOGY_CONST.FIRST_SEEN];
// // // 						const lastSeen = addr[TOPOLOGY_CONST.LAST_SEEN];
// // // 						nodeTitle += `IP: <b>${ip}</b><br>`;
// // // 						nodeTitle += `MAC: <b>${mac}</b><br>`;
// // // 						nodeTitle += `First Seen: <b>${new Date(
// // // 							firstSeen
// // // 						).toLocaleString()}</b><br>`;
// // // 						nodeTitle += `Last Seen: <b>${new Date(
// // // 							lastSeen
// // // 						).toLocaleString()}</b><br>`;
// // // 					}
// // // 				}

// // // 				const attachments =
// // // 					nodeData[TOPOLOGY_CONST.ATTACHMENT_POINTS] || [];
// // // 				if (attachments.length > 0) {
// // // 					nodeTitle += `Connected Ports:<br>`;
// // // 					attachments.forEach((ap, i) => {
// // // 						const port = ap["tp-id"];
// // // 						const active = ap["active"] ? "✅" : "❌";
// // // 						nodeTitle += `&nbsp;&nbsp;• ${port} ${active}<br>`;
// // // 					});
// // // 				}

// // // 				nodeTitle += "Type: Host";
// // // 			} else {
// // // 				groupType = "switch";
// // // 				nodeTitle += `Name: <b>${nodeId}</b><br>Type: Switch<br>Ports:<br>`;

// // // 				const tps = nodeData["termination-point"] || [];
// // // 				tps.forEach((tp) => {
// // // 					const tpId = tp["tp-id"];
// // // 					nodeTitle += `&nbsp;&nbsp;• ${tpId}<br>`;
// // // 				});
// // // 			}

// // // 			nodes.push({
// // // 				id: nodeId,
// // // 				label: nodeId,
// // // 				group: groupType,
// // // 				value: 20,
// // // 				title: nodeTitle,
// // // 			});
// // // 		});
// // // 	}

// // // 	if (Array.isArray(topology.link)) {
// // // 		topology.link.forEach((linkData) => {
// // // 			const srcId = linkData.source[TOPOLOGY_CONST.SOURCE_NODE];
// // // 			const dstId = linkData.destination[TOPOLOGY_CONST.DEST_NODE];
// // // 			const srcPort = linkData.source[TOPOLOGY_CONST.SOURCE_TP];
// // // 			const dstPort = linkData.destination[TOPOLOGY_CONST.DEST_TP];

// // // 			if (
// // // 				!linksMap[`${srcId}:${dstId}`] &&
// // // 				!linksMap[`${dstId}:${srcId}`]
// // // 			) {
// // // 				links.push({
// // // 					from: srcId,
// // // 					to: dstId,
// // // 					title: `Source Port: <b>${srcPort}</b><br>Dest Port: <b>${dstPort}</b>`,
// // // 				});
// // // 				linksMap[`${srcId}:${dstId}`] = true;
// // // 			}
// // // 		});
// // // 	}

// // // 	return { nodes, links };
// // // };

// // // /**
// // //  * Maps raw ONOS topology arrays to standard DTO format
// // //  */
// // // export const mapOnosTopology = (onosRaw) => {
// // // 	const devices = onosRaw.devices || [];
// // // 	const links = onosRaw.links || [];
// // // 	const hosts = onosRaw.hosts || [];

// // // 	const nodes = [];
// // // 	const mappedLinks = [];

// // // 	// Map Switches
// // // 	devices.forEach((dev) => {
// // // 		nodes.push({
// // // 			id: dev.id,
// // // 			label: dev.id,
// // // 			group: "switch",
// // // 			value: 20,
// // // 			title: `Name: <b>${dev.id}</b><br>Type: Switch<br>Manufacturer: ${dev.mfr || "N/A"}<br>Hardware: ${dev.hw || "N/A"}`,
// // // 		});
// // // 	});

// // // 	// Map Hosts
// // // 	hosts.forEach((host) => {
// // // 		const hostId = `host:${host.mac}`;
// // // 		const ips = host.ipAddresses || [];
// // // 		nodes.push({
// // // 			id: hostId,
// // // 			label: hostId,
// // // 			group: "host",
// // // 			value: 20,
// // // 			title: `ID: <b>${hostId}</b><br>IP: <b>${ips[0] || "N/A"}</b><br>MAC: <b>${host.mac}</b>`,
// // // 		});

// // // 		// Map host links to switches
// // // 		if (host.locations && host.locations.length > 0) {
// // // 			const loc = host.locations[0];
// // // 			mappedLinks.push({
// // // 				from: hostId,
// // // 				to: loc.elementId,
// // // 				title: `Port: <b>${loc.port}</b>`,
// // // 			});
// // // 		}
// // // 	});

// // // 	// Map Inter-switch Links
// // // 	links.forEach((link) => {
// // // 		mappedLinks.push({
// // // 			from: link.src.device,
// // // 			to: link.dst.device,
// // // 			title: `Source Port: <b>${link.src.port}</b><br>Dest Port: <b>${link.dst.port}</b>`,
// // // 		});
// // // 	});

// // // 	return { nodes, links: mappedLinks, dots: [] };
// // // };

// // // /**
// // //  * RESTORED: Port dots mapping logic for ODL topology interface links
// // //  */
// // // export const generatePortDots = (topologyLinks, inventoryNodes) => {
// // // 	const portDots = [];
// // // 	const connectorMap = {};

// // // 	inventoryNodes.forEach((node) => {
// // // 		const connectors = node["node-connector"] || [];
// // // 		connectors.forEach((conn) => {
// // // 			const connectorId = conn["id"];
// // // 			const mac = conn["flow-node-inventory:hardware-address"];
// // // 			const portName = conn["flow-node-inventory:name"];
// // // 			if (mac && !connectorId.includes("LOCAL")) {
// // // 				connectorMap[connectorId] = {
// // // 					mac,
// // // 					port: portName.split("-")[1] || connectorId.split(":").pop(),
// // // 					nodeId: node.id,
// // // 				};
// // // 			}
// // // 		});
// // // 	});

// // // 	topologyLinks.forEach((link, index) => {
// // // 		const srcConnectorId = link.srcPort || link.from;
// // // 		const dstConnectorId = link.dstPort || link.to;

// // // 		if (connectorMap[srcConnectorId]) {
// // // 			portDots.push({
// // // 				id: `dot-${index}-src`,
// // // 				source: link.from,
// // // 				target: link.to,
// // // 				mac: connectorMap[srcConnectorId].mac,
// // // 				port: connectorMap[srcConnectorId].port,
// // // 			});
// // // 		}

// // // 		if (connectorMap[dstConnectorId]) {
// // // 			portDots.push({
// // // 				id: `dot-${index}-dst`,
// // // 				source: link.to,
// // // 				target: link.from,
// // // 				mac: connectorMap[dstConnectorId].mac,
// // // 				port: connectorMap[dstConnectorId].port,
// // // 			});
// // // 		}
// // // 	});

// // // 	return portDots;
// // // };


// // // /**
// // //  * ADAPTER: Maps raw Floodlight topology arrays to standard DTO format
// // //  */
// // // export const mapFloodlightTopology = (floodlightRaw) => {
// // // 	const switches = floodlightRaw.switches || [];
// // // 	const links = floodlightRaw.links || [];
// // // 	const devices = floodlightRaw.devices || [];

// // // 	const nodes = [];
// // // 	const mappedLinks = [];

// // // 	// 1. Map Switches
// // // 	switches.forEach((sw) => {
// // // 		nodes.push({
// // // 			id: sw.switchDPID,
// // // 			label: sw.switchDPID,
// // // 			group: "switch",
// // // 			value: 20,
// // // 			title: `Name: <b>${sw.switchDPID}</b><br>Type: Switch<br>IP/Port: ${sw.inetAddress || "N/A"}<br>Connected Since: ${new Date(sw.connectedSince).toLocaleString()}`,
// // // 		});
// // // 	});

// // // 	// 2. Map Hosts (Devices)
// // // 	devices.forEach((dev) => {
// // // 		const mac = dev.mac?.[0] || "N/A";
// // // 		const ip = dev.ipv4?.[0] || "N/A";
// // // 		const hostId = `host:${mac}`;

// // // 		nodes.push({
// // // 			id: hostId,
// // // 			label: hostId,
// // // 			group: "host",
// // // 			value: 20,
// // // 			title: `ID: <b>${hostId}</b><br>IP: <b>${ip}</b><br>MAC: <b>${mac}</b>`,
// // // 		});

// // // 		// Map host links to switches
// // // 		if (dev.attachmentPoint && dev.attachmentPoint.length > 0) {
// // // 			dev.attachmentPoint.forEach((ap) => {
// // // 				mappedLinks.push({
// // // 					from: hostId,
// // // 					to: ap.switch,
// // // 					title: `Port: <b>${ap.port}</b>`,
// // // 				});
// // // 			});
// // // 		}
// // // 	});

// // // 	// 3. Map Inter-switch Links
// // // 	links.forEach((link) => {
// // // 		mappedLinks.push({
// // // 			from: link["src-switch"],
// // // 			to: link["dst-switch"],
// // // 			title: `Source Port: <b>${link["src-port"]}</b><br>Dest Port: <b>${link["dst-port"]}</b>`,
// // // 		});
// // // 	});

// // // 	return { nodes, links: mappedLinks, dots: [] };
// // // };




























// // // // import { toMbps, formatDuration } from "../utils/helper";

// // // // const mapOdlNodeDetails = (rawData) => {
// // // // 	const node = rawData["opendaylight-inventory:node"]?.[0];
// // // // 	if (!node) return null;

// // // // 	const mapConnectors = (connectors = []) =>
// // // // 		connectors.map((c) => {
// // // // 			const stats =
// // // // 				c[
// // // // 					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // // 				] || {};
// // // // 			const state = c["flow-node-inventory:state"] || {};

// // // // 			return {
// // // // 				id: c.id,
// // // // 				name: c["flow-node-inventory:name"],
// // // // 				portNumber: c["flow-node-inventory:port-number"],
// // // // 				mac: c["flow-node-inventory:hardware-address"],
// // // // 				currentSpeedMbps: toMbps(
// // // // 					c["flow-node-inventory:current-speed"] || 0
// // // // 				),
// // // // 				maxSpeedMbps: toMbps(
// // // // 					c["flow-node-inventory:maximum-speed"] || 0
// // // // 				),
// // // // 				currentFeature: c["flow-node-inventory:current-feature"],
// // // // 				supportedFeatures: c["flow-node-inventory:supported"],
// // // // 				peerFeatures: c["flow-node-inventory:peer-features"],
// // // // 				advertisedFeatures:
// // // // 					c["flow-node-inventory:advertised-features"],
// // // // 				configuration: c["flow-node-inventory:configuration"],
// // // // 				stpStatus: c["stp-status-aware-node-connector:status"] || null,
// // // // 				state: {
// // // // 					linkDown: state["link-down"],
// // // // 					blocked: state["blocked"],
// // // // 					live: state["live"],
// // // // 				},
// // // // 				packetStats: {
// // // // 					tx: stats.packets?.transmitted ?? 0,
// // // // 					rx: stats.packets?.received ?? 0,
// // // // 					txBytes: stats.bytes?.transmitted ?? 0,
// // // // 					rxBytes: stats.bytes?.received ?? 0,
// // // // 				},
// // // // 				errors: {
// // // // 					receiveErrors: stats["receive-errors"] ?? 0,
// // // // 					transmitErrors: stats["transmit-errors"] ?? 0,
// // // // 					crcErrors: stats["receive-crc-error"] ?? 0,
// // // // 					drops: {
// // // // 						receive: stats["receive-drops"] ?? 0,
// // // // 						transmit: stats["transmit-drops"] ?? 0,
// // // // 					},
// // // // 					collisions: stats["collision-count"] ?? 0,
// // // // 					frameErrors: stats["receive-frame-error"] ?? 0,
// // // // 					overrun: stats["receive-over-run-error"] ?? 0,
// // // // 				},
// // // // 				uptime: formatDuration(stats.duration),
// // // // 			};
// // // // 		});

// // // // 	const mapFlowTables = (tables = []) =>
// // // // 		tables.map((table) => {
// // // // 			const stats =
// // // // 				table[
// // // // 					"opendaylight-flow-table-statistics:flow-table-statistics"
// // // // 				] || {};
// // // // 			const flows = table.flow || [];

// // // // 			return {
// // // // 				id: table.id,
// // // // 				stats: {
// // // // 					activeFlows: stats["active-flows"],
// // // // 					packetsMatched: stats["packets-matched"],
// // // // 					packetsLookedUp: stats["packets-looked-up"],
// // // // 				},
// // // // 				flows: flows.map((flow) => ({
// // // // 					id: flow.id,
// // // // 					priority: flow.priority,
// // // // 					cookie: flow.cookie,
// // // // 					match: flow.match,
// // // // 					instructions: flow.instructions || null,
// // // // 					stats: {
// // // // 						packets:
// // // // 							flow[
// // // // 								"opendaylight-flow-statistics:flow-statistics"
// // // // 							]?.["packet-count"] ?? 0,
// // // // 						bytes:
// // // // 							flow[
// // // // 								"opendaylight-flow-statistics:flow-statistics"
// // // // 							]?.["byte-count"] ?? 0,
// // // // 						duration: formatDuration(
// // // // 							flow["opendaylight-flow-statistics:flow-statistics"]
// // // // 								?.duration
// // // // 						),
// // // // 					},
// // // // 				})),
// // // // 			};
// // // // 		});

// // // // 	return {
// // // // 		id: node.id,
// // // // 		metadata: {
// // // // 			ip: node["flow-node-inventory:ip-address"],
// // // // 			hardware: node["flow-node-inventory:hardware"],
// // // // 			description: node["flow-node-inventory:description"],
// // // // 			manufacturer: node["flow-node-inventory:manufacturer"],
// // // // 			serial: node["flow-node-inventory:serial-number"],
// // // // 			software: node["flow-node-inventory:software"],
// // // // 		},
// // // // 		connectors: mapConnectors(node["node-connector"]),
// // // // 		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
// // // // 		groupFeatures: {
// // // // 			capabilities:
// // // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // // 					"group-capabilities-supported"
// // // // 				] || [],
// // // // 			types:
// // // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // // 					"group-types-supported"
// // // // 				] || [],
// // // // 			maxGroups:
// // // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // // 					"max-groups"
// // // // 				] || [],
// // // // 			actions:
// // // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // // 					"actions"
// // // // 				] || [],
// // // // 		},
// // // // 		snapshot: {
// // // // 			start: node["flow-node-inventory:snapshot-gathering-status-start"]
// // // // 				?.begin,
// // // // 			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
// // // // 			succeeded:
// // // // 				node["flow-node-inventory:snapshot-gathering-status-end"]
// // // // 					?.succeeded,
// // // // 		},
// // // // 		features: node["flow-node-inventory:switch-features"] || {},
// // // // 	};
// // // // };

// // // // /**
// // // //  * ADAPTER: Maps raw ONOS switch details and ports to standard DTO structure
// // // //  */
// // // // const mapOnosConnectors = (deviceId, ports = []) => {
// // // // 	return ports.map((p) => ({
// // // // 		id: `${deviceId}/${p.port}`,
// // // // 		name: p.port,
// // // // 		portNumber: p.port,
// // // // 		mac: "N/A",
// // // // 		currentSpeedMbps: p.portSpeed || 0,
// // // // 		maxSpeedMbps: p.portSpeed || 0,
// // // // 		currentFeature: "N/A",
// // // // 		state: {
// // // // 			linkDown: !p.isEnabled,
// // // // 			blocked: false,
// // // // 			live: p.isEnabled,
// // // // 		},
// // // // 		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
// // // // 		errors: {
// // // // 			receiveErrors: 0,
// // // // 			transmitErrors: 0,
// // // // 			crcErrors: 0,
// // // // 			drops: { receive: 0, transmit: 0 },
// // // // 		},
// // // // 		uptime: "N/A",
// // // // 	}));
// // // // };

// // // // const mapOnosNodeDetails = (rawData) => {
// // // // 	const device = rawData?.device || {};
// // // // 	const deviceId = rawData?.id || device.id || "N/A";

// // // // 	return {
// // // // 		id: deviceId,
// // // // 		metadata: {
// // // // 			ip: "N/A",
// // // // 			hardware: device.hw || "N/A",
// // // // 			description: device.sw || "N/A",
// // // // 			manufacturer: device.mfr || "N/A",
// // // // 			serial: device.serial || "N/A",
// // // // 			software: device.sw || "N/A",
// // // // 		},
// // // // 		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
// // // // 		flowTables: [], // ONOS does not use fixed tables in the same view schema
// // // // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // // // 		snapshot: { start: null, end: null, succeeded: false },
// // // // 		features: {},
// // // // 	};
// // // // };

// // // // /**
// // // //  * Switchboard Mapper (Adapter Pattern)
// // // //  */
// // // // export const mapNodeDetails = (rawData) => {
// // // // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // // // 		return mapOnosNodeDetails(rawData);
// // // // 	}
// // // // 	return mapOdlNodeDetails(rawData);
// // // // };


// // // // /**
// // // //  * ADAPTER: Maps Floodlight detailed switch stats to standard DTO structure
// // // //  */
// // // // const mapFloodlightNodeDetails = (rawData) => {
// // // // 	const desc = rawData.desc || {};
// // // // 	const ports = rawData.ports || [];
// // // // 	const flows = rawData.flows || [];

// // // // 	const connectors = ports.map((p) => ({
// // // // 		id: `${rawData.id}/${p.portNumber || p.port}`,
// // // // 		name: p.portNumber || p.port,
// // // // 		portNumber: p.portNumber || p.port,
// // // // 		mac: p.hardwareAddress || "N/A",
// // // // 		currentSpeedMbps: 0, 
// // // // 		maxSpeedMbps: 0,
// // // // 		currentFeature: "N/A",
// // // // 		state: {
// // // // 			linkDown: false,
// // // // 			blocked: false,
// // // // 			live: true,
// // // // 		},
// // // // 		packetStats: {
// // // // 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// // // // 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// // // // 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// // // // 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// // // // 		},
// // // // 		errors: {
// // // // 			receiveErrors: p.receiveErrors ?? 0,
// // // // 			transmitErrors: p.transmitErrors ?? 0,
// // // // 			crcErrors: 0,
// // // // 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// // // // 		},
// // // // 		uptime: "N/A",
// // // // 	}));

// // // // 	const flowTables = [{
// // // // 		id: 0,
// // // // 		stats: { activeFlows: flows.length, packetsMatched: 0, packetsLookedUp: 0 },
// // // // 		flows: flows.map((f, idx) => ({
// // // // 			id: f.cookie || `flow-${idx}`,
// // // // 			priority: f.priority || 0,
// // // // 			cookie: f.cookie || "0",
// // // // 			match: f.match || {},
// // // // 			instructions: f.actions || null,
// // // // 			stats: {
// // // // 				packets: f.packetCount ?? 0,
// // // // 				bytes: f.byteCount ?? 0,
// // // // 				duration: `${f.durationSeconds ?? 0}s`,
// // // // 			},
// // // // 		})),
// // // // 	}];

// // // // 	return {
// // // // 		id: rawData.id,
// // // // 		metadata: {
// // // // 			ip: "N/A",
// // // // 			hardware: desc.hardware || "N/A",
// // // // 			description: desc.datapath || "N/A",
// // // // 			manufacturer: desc.manufacturer || "N/A",
// // // // 			serial: desc.serial || "N/A",
// // // // 			software: desc.software || "N/A",
// // // // 		},
// // // // 		connectors,
// // // // 		flowTables,
// // // // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // // // 		snapshot: { start: null, end: null, succeeded: false },
// // // // 		features: {},
// // // // 	};
// // // // };

// // // // // Update your main switchboard export to include Floodlight:
// // // // export const mapNodeDetails = (rawData) => {
// // // // 	if (rawData && rawData.controller === "floodlight") {
// // // // 		return mapFloodlightNodeDetails(rawData);
// // // // 	}
// // // // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // // // 		return mapOnosNodeDetails(rawData);
// // // // 	}
// // // // 	return mapOdlNodeDetails(rawData);
// // // // };

// // // import { toMbps, formatDuration } from "../utils/helper";

// // // const mapOdlNodeDetails = (rawData) => {
// // // 	const node = rawData["opendaylight-inventory:node"]?.[0];
// // // 	if (!node) return null;

// // // 	const mapConnectors = (connectors = []) =>
// // // 		connectors.map((c) => {
// // // 			const stats =
// // // 				c[
// // // 					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // 				] || {};
// // // 			const state = c["flow-node-inventory:state"] || {};

// // // 			return {
// // // 				id: c.id,
// // // 				name: c["flow-node-inventory:name"],
// // // 				portNumber: c["flow-node-inventory:port-number"],
// // // 				mac: c["flow-node-inventory:hardware-address"],
// // // 				currentSpeedMbps: toMbps(
// // // 					c["flow-node-inventory:current-speed"] || 0
// // // 				),
// // // 				maxSpeedMbps: toMbps(
// // // 					c["flow-node-inventory:maximum-speed"] || 0
// // // 				),
// // // 				currentFeature: c["flow-node-inventory:current-feature"],
// // // 				supportedFeatures: c["flow-node-inventory:supported"],
// // // 				peerFeatures: c["flow-node-inventory:peer-features"],
// // // 				advertisedFeatures:
// // // 					c["flow-node-inventory:advertised-features"],
// // // 				configuration: c["flow-node-inventory:configuration"],
// // // 				stpStatus: c["stp-status-aware-node-connector:status"] || null,
// // // 				state: {
// // // 					linkDown: state["link-down"],
// // // 					blocked: state["blocked"],
// // // 					live: state["live"],
// // // 				},
// // // 				packetStats: {
// // // 					tx: stats.packets?.transmitted ?? 0,
// // // 					rx: stats.packets?.received ?? 0,
// // // 					txBytes: stats.bytes?.transmitted ?? 0,
// // // 					rxBytes: stats.bytes?.received ?? 0,
// // // 				},
// // // 				errors: {
// // // 					receiveErrors: stats["receive-errors"] ?? 0,
// // // 					transmitErrors: stats["transmit-errors"] ?? 0,
// // // 					crcErrors: stats["receive-crc-error"] ?? 0,
// // // 					drops: {
// // // 						receive: stats["receive-drops"] ?? 0,
// // // 						transmit: stats["transmit-drops"] ?? 0,
// // // 					},
// // // 					collisions: stats["collision-count"] ?? 0,
// // // 					frameErrors: stats["receive-frame-error"] ?? 0,
// // // 					overrun: stats["receive-over-run-error"] ?? 0,
// // // 				},
// // // 				uptime: formatDuration(stats.duration),
// // // 			};
// // // 		});

// // // 	const mapFlowTables = (tables = []) =>
// // // 		tables.map((table) => {
// // // 			const stats =
// // // 				table[
// // // 					"opendaylight-flow-table-statistics:flow-table-statistics"
// // // 				] || {};
// // // 			const flows = table.flow || [];

// // // 			return {
// // // 				id: table.id,
// // // 				stats: {
// // // 					activeFlows: stats["active-flows"],
// // // 					packetsMatched: stats["packets-matched"],
// // // 					packetsLookedUp: stats["packets-looked-up"],
// // // 				},
// // // 				flows: flows.map((flow) => ({
// // // 					id: flow.id,
// // // 					priority: flow.priority,
// // // 					cookie: flow.cookie,
// // // 					match: flow.match,
// // // 					instructions: flow.instructions || null,
// // // 					stats: {
// // // 						packets:
// // // 							flow[
// // // 								"opendaylight-flow-statistics:flow-statistics"
// // // 							]?.["packet-count"] ?? 0,
// // // 						bytes:
// // // 							flow[
// // // 								"opendaylight-flow-statistics:flow-statistics"
// // // 							]?.["byte-count"] ?? 0,
// // // 						duration: formatDuration(
// // // 							flow["opendaylight-flow-statistics:flow-statistics"]
// // // 								?.duration
// // // 						),
// // // 					},
// // // 				})),
// // // 			};
// // // 		});

// // // 	return {
// // // 		id: node.id,
// // // 		metadata: {
// // // 			ip: node["flow-node-inventory:ip-address"],
// // // 			hardware: node["flow-node-inventory:hardware"],
// // // 			description: node["flow-node-inventory:description"],
// // // 			manufacturer: node["flow-node-inventory:manufacturer"],
// // // 			serial: node["flow-node-inventory:serial-number"],
// // // 			software: node["flow-node-inventory:software"],
// // // 		},
// // // 		connectors: mapConnectors(node["node-connector"]),
// // // 		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
// // // 		groupFeatures: {
// // // 			capabilities:
// // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // 					"group-capabilities-supported"
// // // 				] || [],
// // // 			types:
// // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // 					"group-types-supported"
// // // 				] || [],
// // // 			maxGroups:
// // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // 					"max-groups"
// // // 				] || [],
// // // 			actions:
// // // 				node["opendaylight-group-statistics:group-features"]?.[
// // // 					"actions"
// // // 				] || [],
// // // 		},
// // // 		snapshot: {
// // // 			start: node["flow-node-inventory:snapshot-gathering-status-start"]
// // // 				?.begin,
// // // 			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
// // // 			succeeded:
// // // 				node["flow-node-inventory:snapshot-gathering-status-end"]
// // // 					?.succeeded,
// // // 		},
// // // 		features: node["flow-node-inventory:switch-features"] || {},
// // // 	};
// // // };

// // // const mapOnosConnectors = (deviceId, ports = []) => {
// // // 	return ports.map((p) => ({
// // // 		id: `${deviceId}/${p.port}`,
// // // 		name: p.port,
// // // 		portNumber: p.port,
// // // 		mac: "N/A",
// // // 		currentSpeedMbps: p.portSpeed || 0,
// // // 		maxSpeedMbps: p.portSpeed || 0,
// // // 		currentFeature: "N/A",
// // // 		state: {
// // // 			linkDown: !p.isEnabled,
// // // 			blocked: false,
// // // 			live: p.isEnabled,
// // // 		},
// // // 		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
// // // 		errors: {
// // // 			receiveErrors: 0,
// // // 			transmitErrors: 0,
// // // 			crcErrors: 0,
// // // 			drops: { receive: 0, transmit: 0 },
// // // 		},
// // // 		uptime: "N/A",
// // // 	}));
// // // };

// // // const mapOnosNodeDetails = (rawData) => {
// // // 	const device = rawData?.device || {};
// // // 	const deviceId = rawData?.id || device.id || "N/A";

// // // 	return {
// // // 		id: deviceId,
// // // 		metadata: {
// // // 			ip: "N/A",
// // // 			hardware: device.hw || "N/A",
// // // 			description: device.sw || "N/A",
// // // 			manufacturer: device.mfr || "N/A",
// // // 			serial: device.serial || "N/A",
// // // 			software: device.sw || "N/A",
// // // 		},
// // // 		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
// // // 		flowTables: [],
// // // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // // 		snapshot: { start: null, end: null, succeeded: false },
// // // 		features: {},
// // // 	};
// // // };

// // // const mapFloodlightNodeDetails = (rawData) => {
// // // 	const desc = rawData.desc || {};
// // // 	const ports = rawData.ports || [];
// // // 	const flows = rawData.flows || [];

// // // 	const connectors = ports.map((p) => ({
// // // 		id: `${rawData.id}/${p.portNumber || p.port}`,
// // // 		name: p.portNumber || p.port,
// // // 		portNumber: p.portNumber || p.port,
// // // 		mac: p.hardwareAddress || "N/A",
// // // 		currentSpeedMbps: 0, 
// // // 		maxSpeedMbps: 0,
// // // 		currentFeature: "N/A",
// // // 		state: {
// // // 			linkDown: false,
// // // 			blocked: false,
// // // 			live: true,
// // // 		},
// // // 		packetStats: {
// // // 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// // // 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// // // 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// // // 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// // // 		},
// // // 		errors: {
// // // 			receiveErrors: p.receiveErrors ?? 0,
// // // 			transmitErrors: p.transmitErrors ?? 0,
// // // 			crcErrors: 0,
// // // 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// // // 		},
// // // 		uptime: "N/A",
// // // 	}));

// // // 	const flowTables = [{
// // // 		id: 0,
// // // 		stats: { activeFlows: flows.length, packetsMatched: 0, packetsLookedUp: 0 },
// // // 		flows: flows.map((f, idx) => ({
// // // 			id: f.cookie || `flow-${idx}`,
// // // 			priority: f.priority || 0,
// // // 			cookie: f.cookie || "0",
// // // 			match: f.match || {},
// // // 			instructions: f.actions || null,
// // // 			stats: {
// // // 				packets: f.packetCount ?? 0,
// // // 				bytes: f.byteCount ?? 0,
// // // 				duration: `${f.durationSeconds ?? 0}s`,
// // // 			},
// // // 		})),
// // // 	}];

// // // 	return {
// // // 		id: rawData.id,
// // // 		metadata: {
// // // 			ip: "N/A",
// // // 			hardware: desc.hardware || "N/A",
// // // 			description: desc.datapath || "N/A",
// // // 			manufacturer: desc.manufacturer || "N/A",
// // // 			serial: desc.serial || "N/A",
// // // 			software: desc.software || "N/A",
// // // 		},
// // // 		connectors,
// // // 		flowTables,
// // // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // // 		snapshot: { start: null, end: null, succeeded: false },
// // // 		features: {},
// // // 	};
// // // };

// // // export const mapNodeDetails = (rawData) => {
// // // 	if (rawData && rawData.controller === "floodlight") {
// // // 		return mapFloodlightNodeDetails(rawData);
// // // 	}
// // // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // // 		return mapOnosNodeDetails(rawData);
// // // 	}
// // // 	return mapOdlNodeDetails(rawData);
// // // };
// // import { toMbps, formatDuration } from "../utils/helper";

// // const mapOdlNodeDetails = (rawData) => {
// // 	const node = rawData?.["opendaylight-inventory:node"]?.[0];
// // 	if (!node) return null;

// // 	const mapConnectors = (connectors = []) =>
// // 		connectors.map((c) => {
// // 			const stats =
// // 				c[
// // 					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // 				] || {};
// // 			const state = c["flow-node-inventory:state"] || {};

// // 			return {
// // 				id: c.id,
// // 				name: c["flow-node-inventory:name"],
// // 				portNumber: c["flow-node-inventory:port-number"],
// // 				mac: c["flow-node-inventory:hardware-address"],
// // 				currentSpeedMbps: toMbps(
// // 					c["flow-node-inventory:current-speed"] || 0
// // 				),
// // 				maxSpeedMbps: toMbps(
// // 					c["flow-node-inventory:maximum-speed"] || 0
// // 				),
// // 				currentFeature: c["flow-node-inventory:current-feature"],
// // 				supportedFeatures: c["flow-node-inventory:supported"],
// // 				peerFeatures: c["flow-node-inventory:peer-features"],
// // 				advertisedFeatures:
// // 					c["flow-node-inventory:advertised-features"],
// // 				configuration: c["flow-node-inventory:configuration"],
// // 				stpStatus: c["stp-status-aware-node-connector:status"] || null,
// // 				state: {
// // 					linkDown: state["link-down"],
// // 					blocked: state["blocked"],
// // 					live: state["live"],
// // 				},
// // 				packetStats: {
// // 					tx: stats.packets?.transmitted ?? 0,
// // 					rx: stats.packets?.received ?? 0,
// // 					txBytes: stats.bytes?.transmitted ?? 0,
// // 					rxBytes: stats.bytes?.received ?? 0,
// // 				},
// // 				errors: {
// // 					receiveErrors: stats["receive-errors"] ?? 0,
// // 					transmitErrors: stats["transmit-errors"] ?? 0,
// // 					crcErrors: stats["receive-crc-error"] ?? 0,
// // 					drops: {
// // 						receive: stats["receive-drops"] ?? 0,
// // 						transmit: stats["transmit-drops"] ?? 0,
// // 					},
// // 					collisions: stats["collision-count"] ?? 0,
// // 					frameErrors: stats["receive-frame-error"] ?? 0,
// // 					overrun: stats["receive-over-run-error"] ?? 0,
// // 				},
// // 				uptime: formatDuration(stats.duration),
// // 			};
// // 		});

// // 	const mapFlowTables = (tables = []) =>
// // 		tables.map((table) => {
// // 			const stats =
// // 				table[
// // 					"opendaylight-flow-table-statistics:flow-table-statistics"
// // 				] || {};
// // 			const flows = table.flow || [];

// // 			return {
// // 				id: table.id,
// // 				stats: {
// // 					activeFlows: stats["active-flows"],
// // 					packetsMatched: stats["packets-matched"],
// // 					packetsLookedUp: stats["packets-looked-up"],
// // 				},
// // 				flows: flows.map((flow) => ({
// // 					id: flow.id,
// // 					priority: flow.priority,
// // 					cookie: flow.cookie,
// // 					match: flow.match,
// // 					instructions: flow.instructions || null,
// // 					stats: {
// // 						packets:
// // 							flow[
// // 								"opendaylight-flow-statistics:flow-statistics"
// // 							]?.["packet-count"] ?? 0,
// // 						bytes:
// // 							flow[
// // 								"opendaylight-flow-statistics:flow-statistics"
// // 							]?.["byte-count"] ?? 0,
// // 						duration: formatDuration(
// // 							flow["opendaylight-flow-statistics:flow-statistics"]
// // 								?.duration
// // 						),
// // 					},
// // 				})),
// // 			};
// // 		});

// // 	return {
// // 		id: node.id,
// // 		metadata: {
// // 			ip: node["flow-node-inventory:ip-address"],
// // 			hardware: node["flow-node-inventory:hardware"],
// // 			description: node["flow-node-inventory:description"],
// // 			manufacturer: node["flow-node-inventory:manufacturer"],
// // 			serial: node["flow-node-inventory:serial-number"],
// // 			software: node["flow-node-inventory:software"],
// // 		},
// // 		connectors: mapConnectors(node["node-connector"]),
// // 		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
// // 		groupFeatures: {
// // 			capabilities:
// // 				node["opendaylight-group-statistics:group-features"]?.[
// // 					"group-capabilities-supported"
// // 				] || [],
// // 			types:
// // 				node["opendaylight-group-statistics:group-features"]?.[
// // 					"group-types-supported"
// // 				] || [],
// // 			maxGroups:
// // 				node["opendaylight-group-statistics:group-features"]?.[
// // 					"max-groups"
// // 				] || [],
// // 			actions:
// // 				node["opendaylight-group-statistics:group-features"]?.[
// // 					"actions"
// // 				] || [],
// // 		},
// // 		snapshot: {
// // 			start: node["flow-node-inventory:snapshot-gathering-status-start"]
// // 				?.begin,
// // 			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
// // 			succeeded:
// // 				node["flow-node-inventory:snapshot-gathering-status-end"]
// // 					?.succeeded,
// // 		},
// // 		features: node["flow-node-inventory:switch-features"] || {},
// // 	};
// // };

// // const mapOnosConnectors = (deviceId, ports = []) => {
// // 	return ports.map((p) => ({
// // 		id: `${deviceId}/${p.port}`,
// // 		name: p.port,
// // 		portNumber: p.port,
// // 		mac: "N/A",
// // 		currentSpeedMbps: p.portSpeed || 0,
// // 		maxSpeedMbps: p.portSpeed || 0,
// // 		currentFeature: "N/A",
// // 		state: {
// // 			linkDown: !p.isEnabled,
// // 			blocked: false,
// // 			live: p.isEnabled,
// // 		},
// // 		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
// // 		errors: {
// // 			receiveErrors: 0,
// // 			transmitErrors: 0,
// // 			crcErrors: 0,
// // 			drops: { receive: 0, transmit: 0 },
// // 		},
// // 		uptime: "N/A",
// // 	}));
// // };

// // const mapOnosNodeDetails = (rawData) => {
// // 	const device = rawData?.device || {};
// // 	const deviceId = rawData?.id || device.id || "N/A";

// // 	return {
// // 		id: deviceId,
// // 		metadata: {
// // 			ip: "N/A",
// // 			hardware: device.hw || "N/A",
// // 			description: device.sw || "N/A",
// // 			manufacturer: device.mfr || "N/A",
// // 			serial: device.serial || "N/A",
// // 			software: device.sw || "N/A",
// // 		},
// // 		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
// // 		flowTables: [],
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // const mapFloodlightNodeDetails = (rawData) => {
// // 	const desc = rawData.desc || {};
// // 	const ports = rawData.ports || [];
// // 	const flows = rawData.flows || [];

// // 	const connectors = ports.map((p) => ({
// // 		id: `${rawData.id}/${p.port_number}`,
// // 		name: p.port_number,
// // 		portNumber: p.port_number,
// // 		mac: "N/A", // Not exposed in Floodlight port statistics endpoint
// // 		currentSpeedMbps: 0, 
// // 		maxSpeedMbps: 0,
// // 		currentFeature: "N/A",
// // 		state: {
// // 			linkDown: false,
// // 			blocked: false,
// // 			live: true,
// // 		},
// // 		packetStats: {
// // 			tx: Number(p.transmit_packets ?? 0),
// // 			rx: Number(p.receive_packets ?? 0),
// // 			txBytes: Number(p.transmit_bytes ?? 0),
// // 			rxBytes: Number(p.receive_bytes ?? 0),
// // 		},
// // 		errors: {
// // 			receiveErrors: Number(p.receive_errors ?? 0),
// // 			transmitErrors: Number(p.transmit_errors ?? 0),
// // 			crcErrors: Number(p.receive_CRC_errors ?? 0),
// // 			drops: { 
// // 				receive: Number(p.receive_dropped ?? 0), 
// // 				transmit: Number(p.transmit_dropped ?? 0) 
// // 			},
// // 		},
// // 		uptime: "N/A",
// // 	}));

// // 	const flowsList = Array.isArray(flows) ? flows : (flows && Array.isArray(flows.flows) ? flows.flows : []);

// // 	const flowTables = [{
// // 		id: 0,
// // 		stats: { activeFlows: flowsList.length, packetsMatched: 0, packetsLookedUp: 0 },
// // 		flows: flowsList.map((f, idx) => ({
// // 			id: f.cookie || `flow-${idx}`,
// // 			priority: f.priority || 0,
// // 			cookie: f.cookie || "0",
// // 			match: f.match || {},
// // 			instructions: f.actions || null,
// // 			stats: {
// // 				packets: f.packet_count ?? 0,
// // 				bytes: f.byte_count ?? 0,
// // 				duration: `${f.duration_sec ?? 0}s`,
// // 			},
// // 		})),
// // 	}];

// // 	return {
// // 		id: rawData.id,
// // 		metadata: {
// // 			ip: "N/A",
// // 			hardware: desc.hardware_description || "N/A",
// // 			description: desc.datapath_description || "N/A",
// // 			manufacturer: desc.manufacturer_description || "N/A",
// // 			serial: desc.serial_number || "N/A",
// // 			software: desc.software_description || "N/A",
// // 		},
// // 		connectors,
// // 		flowTables,
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // export const mapNodeDetails = (rawData) => {
// // 	if (!rawData) return null;

// // 	if (rawData.controller === "floodlight") {
// // 		return mapFloodlightNodeDetails(rawData);
// // 	}
// // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // 		return mapOnosNodeDetails(rawData);
// // 	}
// // 	return mapOdlNodeDetails(rawData);
// // };



















// export const extractDeviceData = (rawData) => {
//     if (!rawData) return { nodes: [], links: [] };

//     // Handle ODL 23 wrapping
//     const wrapper = rawData?.["network-topology:network-topology"] || rawData;
//     const topologies = Array.isArray(wrapper.topology) ? wrapper.topology : [wrapper];

//     const nodes = [];
//     const links = [];
//     const linksMap = {};

//     topologies.forEach((topo) => {
//         const rawNodes = topo.node || topo.nodes || [];
//         const rawLinks = topo.link || topo.links || [];

//         rawNodes.forEach((nodeData) => {
//             const nodeId = nodeData["node-id"] || nodeData.id;
//             if (!nodeId || nodes.find(n => n.id === nodeId)) return;

//             // Host Detection logic
//             const isHost = nodeId.startsWith("host:") || 
//                           nodeData["host-tracker-service:addresses"] || 
//                           nodeData["host-tracker-service:attachment-points"];
            
//             nodes.push({
//                 id: nodeId,
//                 label: isHost ? nodeId.split(":").pop() : nodeId,
//                 group: isHost ? "host" : "switch",
//                 title: `<b>${isHost ? 'HOST' : 'SWITCH'}</b><br>ID: ${nodeId}`
//             });

//             // Discovery hidden links for hosts
//             const attachments = nodeData["host-tracker-service:attachment-points"] || [];
//             attachments.forEach(ap => {
//                 const targetSwitch = ap["tp-id"]?.split(":").slice(0, 2).join(":");
//                 if (targetSwitch && !linksMap[`${nodeId}:${targetSwitch}`]) {
//                     links.push({ from: nodeId, to: targetSwitch, dashes: true, color: "#10b981" });
//                     linksMap[`${nodeId}:${targetSwitch}`] = true;
//                 }
//             });
//         });

//         rawLinks.forEach((linkData) => {
//             const src = linkData.source?.["source-node"] || linkData.source?.nodeId;
//             const dst = linkData.destination?.["dest-node"] || linkData.destination?.nodeId;
//             if (src && dst && !linksMap[`${src}:${dst}`] && !linksMap[`${dst}:${src}`]) {
//                 links.push({ from: src, to: dst, color: "#94a3b8" });
//                 linksMap[`${src}:${dst}`] = true;
//             }
//         });
//     });

//     return { nodes, links };
// };

// // Generic exports
// export const extractDevices = (d) => [];
// export const mapOnosTopology = (o) => ({ nodes: [], links: [], dots: [] });
// export const mapFloodlightTopology = (f) => ({ nodes: [], links: [], dots: [] });
// export const generatePortDots = (l, n) => [];









// export const extractDeviceData = (rawData) => {
//     if (!rawData) return { nodes: [], links: [] };

//     // standard ODL 23 wrapping
//     const wrapper = rawData?.["network-topology:network-topology"] || rawData;
//     const topologies = Array.isArray(wrapper.topology) ? wrapper.topology : 
//                        (wrapper["network-topology:topology"] || [wrapper]);

//     const nodes = [];
//     const links = [];
//     const linksMap = {};
//     const infrastructurePorts = new Set(); // To track Switch-to-Switch ports

//     // STEP 1: Identify all Switch-to-Switch links to know which ports are "Occupied"
//     topologies.forEach((topo) => {
//         const rawLinks = topo.link || [];
//         rawLinks.forEach((linkData) => {
//             const src = linkData.source?.["source-node"] || linkData.source?.nodeId;
//             const dst = linkData.destination?.["dest-node"] || linkData.destination?.nodeId;
//             const srcTp = linkData.source?.["source-tp"] || linkData.source?.tpId;
//             const dstTp = linkData.destination?.["dest-tp"] || linkData.destination?.tpId;

//             if (src && dst) {
//                 // Register these ports as "Switch Infrastructure"
//                 if (srcTp) infrastructurePorts.add(srcTp);
//                 if (dstTp) infrastructurePorts.add(dstTp);

//                 // Add the link if not already added
//                 if (!linksMap[`${src}:${dst}`] && !linksMap[`${dst}:${src}`]) {
//                     links.push({ from: src, to: dst, color: "#94a3b8", width: 2 });
//                     linksMap[`${src}:${dst}`] = true;
//                 }
//             }
//         });
//     });

//     // STEP 2: Process Nodes and Discover "Hidden" Hosts on Edge Ports
//     topologies.forEach((topo) => {
//         const rawNodes = topo.node || [];
//         rawNodes.forEach((nodeData) => {
//             const nodeId = nodeData["node-id"] || nodeData.id;
//             if (!nodeId || nodes.find(n => n.id === nodeId)) return;

//             // Is this an explicit host from ODL?
//             const isExplicitHost = nodeId.startsWith("host:");
            
//             nodes.push({
//                 id: nodeId,
//                 label: isExplicitHost ? nodeId.split(":").pop() : nodeId,
//                 group: isExplicitHost ? "host" : "switch",
//                 title: `<b>${isExplicitHost ? 'HOST' : 'SWITCH'}</b><br>ID: ${nodeId}`
//             });

//             // If it's a switch, scan its ports for "Dead Ends" (Hosts)
//             if (!isExplicitHost) {
//                 const tps = nodeData["termination-point"] || [];
//                 tps.forEach(tp => {
//                     const tpId = tp["tp-id"] || "";
                    
//                     // Logic: If port is NOT connected to another switch AND is NOT the LOCAL CPU port
//                     if (tpId && !tpId.endsWith("LOCAL") && !infrastructurePorts.has(tpId)) {
                        
//                         const virtualHostId = `host:${tpId}`;
                        
//                         // Only add if this "Edge Port" isn't already represented
//                         if (!nodes.find(n => n.id === virtualHostId)) {
//                             nodes.push({
//                                 id: virtualHostId,
//                                 label: `H-${tpId.split(':').pop()}`,
//                                 group: "host",
//                                 title: `<b>HOST (Edge Port Discovery)</b><br>Connected to: ${tpId}`
//                             });

//                             // Link the discovered host to the switch
//                             links.push({ 
//                                 from: virtualHostId, 
//                                 to: nodeId, 
//                                 dashes: true, 
//                                 color: "#10b981", 
//                                 width: 1 
//                             });
//                         }
//                     }
//                 });
//             }
//         });
//     });

//     return { nodes, links };
// };

// // Generic exports
// export const extractDevices = (d) => extractDeviceData(d).nodes;
// export const mapOnosTopology = (o) => ({ nodes: [], links: [] });
// export const mapFloodlightTopology = (f) => ({ nodes: [], links: [] });
// export const generatePortDots = (l, n) => [];









export const extractDeviceData = (topology) => {
    const nodes = [];
    const links = [];
    const linksMap = {};

    const rawNodes = topology?.node || [];
    const rawLinks = topology?.link || [];

    rawNodes.forEach((nodeData) => {
        const nodeId = nodeData["node-id"];
        if (!nodeId) return;

        const isHost = nodeId.startsWith("host:") || nodeData["host-tracker-service:addresses"];
        
        nodes.push({
            id: nodeId,
            label: isHost ? nodeId.split(":").pop() : nodeId,
            group: isHost ? "host" : "switch",
            value: 20,
            title: `ID: <b>${nodeId}</b><br>Type: ${isHost ? 'Host' : 'Switch'}`
        });

        // FRIEND'S FIX: Create links from attachments
        const attachments = nodeData["host-tracker-service:attachment-points"] || [];
        attachments.forEach(ap => {
            const tpId = ap["tp-id"] || "";
            const targetSwitch = tpId.split(":").slice(0, 2).join(":"); // openflow:X
            
            if (targetSwitch && !linksMap[`${nodeId}:${targetSwitch}`]) {
                links.push({ 
                    from: nodeId, to: targetSwitch, 
                    dashes: true, color: "#10b981", width: 2,
                    title: `Host Attachment: ${tpId}`
                });
                linksMap[`${nodeId}:${targetSwitch}`] = true;
            }
        });
    });

    // Standard Switch links
    rawLinks.forEach((linkData) => {
        const src = linkData.source?.["source-node"];
        const dst = linkData.destination?.["dest-node"];
        if (src && dst && !linksMap[`${src}:${dst}`] && !linksMap[`${dst}:${src}`]) {
            links.push({ from: src, to: dst, color: "#94a3b8", width: 3 });
            linksMap[`${src}:${dst}`] = true;
        }
    });

    return { nodes, links };
};

export const generatePortDots = (links, inventory) => [];