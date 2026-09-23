// // // import { toMbps, formatDuration } from "../utils/helper";

// // // export const mapNodeDetails = (rawData) => {
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

// // import { toMbps, formatDuration } from "../utils/helper";

// // const mapOdlNodeDetails = (rawData) => {
// // 	const node = rawData["opendaylight-inventory:node"]?.[0];
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

// // /**
// //  * ADAPTER: Maps raw ONOS switch details and ports to standard DTO structure
// //  */
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
// // 		flowTables: [], // ONOS does not use fixed tables in the same view schema
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // /**
// //  * Switchboard Mapper (Adapter Pattern)
// //  */
// // export const mapNodeDetails = (rawData) => {
// // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // 		return mapOnosNodeDetails(rawData);
// // 	}
// // 	return mapOdlNodeDetails(rawData);
// // };

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

// // // /**
// // //  * ADAPTER: Maps raw ONOS switch details and ports to standard DTO structure
// // //  */
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
// // // 		flowTables: [], // ONOS does not use fixed tables in the same view schema
// // // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // // 		snapshot: { start: null, end: null, succeeded: false },
// // // 		features: {},
// // // 	};
// // // };

// // // /**
// // //  * Switchboard Mapper (Adapter Pattern)
// // //  */
// // // export const mapNodeDetails = (rawData) => {
// // // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // // 		return mapOnosNodeDetails(rawData);
// // // 	}
// // // 	return mapOdlNodeDetails(rawData);
// // // };


// // // /**
// // //  * ADAPTER: Maps Floodlight detailed switch stats to standard DTO structure
// // //  */
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

// // // // Update your main switchboard export to include Floodlight:
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
// // 	const node = rawData["opendaylight-inventory:node"]?.[0];
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
// // 		id: `${rawData.id}/${p.portNumber || p.port}`,
// // 		name: p.portNumber || p.port,
// // 		portNumber: p.portNumber || p.port,
// // 		mac: p.hardwareAddress || "N/A",
// // 		currentSpeedMbps: 0, 
// // 		maxSpeedMbps: 0,
// // 		currentFeature: "N/A",
// // 		state: {
// // 			linkDown: false,
// // 			blocked: false,
// // 			live: true,
// // 		},
// // 		packetStats: {
// // 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// // 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// // 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// // 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// // 		},
// // 		errors: {
// // 			receiveErrors: p.receiveErrors ?? 0,
// // 			transmitErrors: p.transmitErrors ?? 0,
// // 			crcErrors: 0,
// // 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// // 		},
// // 		uptime: "N/A",
// // 	}));

// // 	const flowTables = [{
// // 		id: 0,
// // 		stats: { activeFlows: flows.length, packetsMatched: 0, packetsLookedUp: 0 },
// // 		flows: flows.map((f, idx) => ({
// // 			id: f.cookie || `flow-${idx}`,
// // 			priority: f.priority || 0,
// // 			cookie: f.cookie || "0",
// // 			match: f.match || {},
// // 			instructions: f.actions || null,
// // 			stats: {
// // 				packets: f.packetCount ?? 0,
// // 				bytes: f.byteCount ?? 0,
// // 				duration: `${f.durationSeconds ?? 0}s`,
// // 			},
// // 		})),
// // 	}];

// // 	return {
// // 		id: rawData.id,
// // 		metadata: {
// // 			ip: "N/A",
// // 			hardware: desc.hardware || "N/A",
// // 			description: desc.datapath || "N/A",
// // 			manufacturer: desc.manufacturer || "N/A",
// // 			serial: desc.serial || "N/A",
// // 			software: desc.software || "N/A",
// // 		},
// // 		connectors,
// // 		flowTables,
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // export const mapNodeDetails = (rawData) => {
// // 	if (rawData && rawData.controller === "floodlight") {
// // 		return mapFloodlightNodeDetails(rawData);
// // 	}
// // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // 		return mapOnosNodeDetails(rawData);
// // 	}
// // 	return mapOdlNodeDetails(rawData);
// // };

// import { toMbps, formatDuration } from "../utils/helper";

// const mapOdlNodeDetails = (rawData) => {
// 	const node = rawData["opendaylight-inventory:node"]?.[0];
// 	if (!node) return null;

// 	const mapConnectors = (connectors = []) =>
// 		connectors.map((c) => {
// 			const stats =
// 				c[
// 					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// 				] || {};
// 			const state = c["flow-node-inventory:state"] || {};

// 			return {
// 				id: c.id,
// 				name: c["flow-node-inventory:name"],
// 				portNumber: c["flow-node-inventory:port-number"],
// 				mac: c["flow-node-inventory:hardware-address"],
// 				currentSpeedMbps: toMbps(
// 					c["flow-node-inventory:current-speed"] || 0
// 				),
// 				maxSpeedMbps: toMbps(
// 					c["flow-node-inventory:maximum-speed"] || 0
// 				),
// 				currentFeature: c["flow-node-inventory:current-feature"],
// 				supportedFeatures: c["flow-node-inventory:supported"],
// 				peerFeatures: c["flow-node-inventory:peer-features"],
// 				advertisedFeatures:
// 					c["flow-node-inventory:advertised-features"],
// 				configuration: c["flow-node-inventory:configuration"],
// 				stpStatus: c["stp-status-aware-node-connector:status"] || null,
// 				state: {
// 					linkDown: state["link-down"],
// 					blocked: state["blocked"],
// 					live: state["live"],
// 				},
// 				packetStats: {
// 					tx: stats.packets?.transmitted ?? 0,
// 					rx: stats.packets?.received ?? 0,
// 					txBytes: stats.bytes?.transmitted ?? 0,
// 					rxBytes: stats.bytes?.received ?? 0,
// 				},
// 				errors: {
// 					receiveErrors: stats["receive-errors"] ?? 0,
// 					transmitErrors: stats["transmit-errors"] ?? 0,
// 					crcErrors: stats["receive-crc-error"] ?? 0,
// 					drops: {
// 						receive: stats["receive-drops"] ?? 0,
// 						transmit: stats["transmit-drops"] ?? 0,
// 					},
// 					collisions: stats["collision-count"] ?? 0,
// 					frameErrors: stats["receive-frame-error"] ?? 0,
// 					overrun: stats["receive-over-run-error"] ?? 0,
// 				},
// 				uptime: formatDuration(stats.duration),
// 			};
// 		});

// 	const mapFlowTables = (tables = []) =>
// 		tables.map((table) => {
// 			const stats =
// 				table[
// 					"opendaylight-flow-table-statistics:flow-table-statistics"
// 				] || {};
// 			const flows = table.flow || [];

// 			return {
// 				id: table.id,
// 				stats: {
// 					activeFlows: stats["active-flows"],
// 					packetsMatched: stats["packets-matched"],
// 					packetsLookedUp: stats["packets-looked-up"],
// 				},
// 				flows: flows.map((flow) => ({
// 					id: flow.id,
// 					priority: flow.priority,
// 					cookie: flow.cookie,
// 					match: flow.match,
// 					instructions: flow.instructions || null,
// 					stats: {
// 						packets:
// 							flow[
// 								"opendaylight-flow-statistics:flow-statistics"
// 							]?.["packet-count"] ?? 0,
// 						bytes:
// 							flow[
// 								"opendaylight-flow-statistics:flow-statistics"
// 							]?.["byte-count"] ?? 0,
// 						duration: formatDuration(
// 							flow["opendaylight-flow-statistics:flow-statistics"]
// 								?.duration
// 						),
// 					},
// 				})),
// 			};
// 		});

// 	return {
// 		id: node.id,
// 		metadata: {
// 			ip: node["flow-node-inventory:ip-address"],
// 			hardware: node["flow-node-inventory:hardware"],
// 			description: node["flow-node-inventory:description"],
// 			manufacturer: node["flow-node-inventory:manufacturer"],
// 			serial: node["flow-node-inventory:serial-number"],
// 			software: node["flow-node-inventory:software"],
// 		},
// 		connectors: mapConnectors(node["node-connector"]),
// 		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
// 		groupFeatures: {
// 			capabilities:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"group-capabilities-supported"
// 				] || [],
// 			types:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"group-types-supported"
// 				] || [],
// 			maxGroups:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"max-groups"
// 				] || [],
// 			actions:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"actions"
// 				] || [],
// 		},
// 		snapshot: {
// 			start: node["flow-node-inventory:snapshot-gathering-status-start"]
// 				?.begin,
// 			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
// 			succeeded:
// 				node["flow-node-inventory:snapshot-gathering-status-end"]
// 					?.succeeded,
// 		},
// 		features: node["flow-node-inventory:switch-features"] || {},
// 	};
// };

// const mapOnosConnectors = (deviceId, ports = []) => {
// 	return ports.map((p) => ({
// 		id: `${deviceId}/${p.port}`,
// 		name: p.port,
// 		portNumber: p.port,
// 		mac: "N/A",
// 		currentSpeedMbps: p.portSpeed || 0,
// 		maxSpeedMbps: p.portSpeed || 0,
// 		currentFeature: "N/A",
// 		state: {
// 			linkDown: !p.isEnabled,
// 			blocked: false,
// 			live: p.isEnabled,
// 		},
// 		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
// 		errors: {
// 			receiveErrors: 0,
// 			transmitErrors: 0,
// 			crcErrors: 0,
// 			drops: { receive: 0, transmit: 0 },
// 		},
// 		uptime: "N/A",
// 	}));
// };

// const mapOnosNodeDetails = (rawData) => {
// 	const device = rawData?.device || {};
// 	const deviceId = rawData?.id || device.id || "N/A";

// 	return {
// 		id: deviceId,
// 		metadata: {
// 			ip: "N/A",
// 			hardware: device.hw || "N/A",
// 			description: device.sw || "N/A",
// 			manufacturer: device.mfr || "N/A",
// 			serial: device.serial || "N/A",
// 			software: device.sw || "N/A",
// 		},
// 		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
// 		flowTables: [],
// 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// 		snapshot: { start: null, end: null, succeeded: false },
// 		features: {},
// 	};
// };

// const mapFloodlightNodeDetails = (rawData) => {
// 	const desc = rawData.desc || {};
// 	const ports = rawData.ports || [];
// 	const flows = rawData.flows || [];

// 	const connectors = ports.map((p) => ({
// 		id: `${rawData.id}/${p.portNumber || p.port}`,
// 		name: p.portNumber || p.port,
// 		portNumber: p.portNumber || p.port,
// 		mac: p.hardwareAddress || "N/A",
// 		currentSpeedMbps: 0, 
// 		maxSpeedMbps: 0,
// 		currentFeature: "N/A",
// 		state: {
// 			linkDown: false,
// 			blocked: false,
// 			live: true,
// 		},
// 		packetStats: {
// 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// 		},
// 		errors: {
// 			receiveErrors: p.receiveErrors ?? 0,
// 			transmitErrors: p.transmitErrors ?? 0,
// 			crcErrors: 0,
// 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// 		},
// 		uptime: "N/A",
// 	}));

// 	// Defensive check: Ensure flows is always parsed safely as an array
// 	const flowsList = Array.isArray(flows) ? flows : (flows && Array.isArray(flows.flows) ? flows.flows : []);

// 	const flowTables = [{
// 		id: 0,
// 		stats: { activeFlows: flowsList.length, packetsMatched: 0, packetsLookedUp: 0 },
// 		flows: flowsList.map((f, idx) => ({
// 			id: f.cookie || `flow-${idx}`,
// 			priority: f.priority || 0,
// 			cookie: f.cookie || "0",
// 			match: f.match || {},
// 			instructions: f.actions || null,
// 			stats: {
// 				packets: f.packetCount ?? 0,
// 				bytes: f.byteCount ?? 0,
// 				duration: `${f.durationSeconds ?? 0}s`,
// 			},
// 		})),
// 	}];

// 	return {
// 		id: rawData.id,
// 		metadata: {
// 			ip: "N/A",
// 			hardware: desc.hardware || "N/A",
// 			description: desc.datapath || "N/A",
// 			manufacturer: desc.manufacturer || "N/A",
// 			serial: desc.serial || "N/A",
// 			software: desc.software || "N/A",
// 		},
// 		connectors,
// 		flowTables,
// 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// 		snapshot: { start: null, end: null, succeeded: false },
// 		features: {},
// 	};
// };

// export const mapNodeDetails = (rawData) => {
// 	if (rawData && rawData.controller === "floodlight") {
// 		return mapFloodlightNodeDetails(rawData);
// 	}
// 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// 		return mapOnosNodeDetails(rawData);
// 	}
// 	return mapOdlNodeDetails(rawData);
// };
















// // import { toMbps, formatDuration } from "../utils/helper";

// // const mapOdlNodeDetails = (rawData) => {
// // 	const node = rawData["opendaylight-inventory:node"]?.[0];
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

// // /**
// //  * ADAPTER: Maps raw ONOS switch details and ports to standard DTO structure
// //  */
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
// // 		flowTables: [], // ONOS does not use fixed tables in the same view schema
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // /**
// //  * Switchboard Mapper (Adapter Pattern)
// //  */
// // export const mapNodeDetails = (rawData) => {
// // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // 		return mapOnosNodeDetails(rawData);
// // 	}
// // 	return mapOdlNodeDetails(rawData);
// // };


// // /**
// //  * ADAPTER: Maps Floodlight detailed switch stats to standard DTO structure
// //  */
// // const mapFloodlightNodeDetails = (rawData) => {
// // 	const desc = rawData.desc || {};
// // 	const ports = rawData.ports || [];
// // 	const flows = rawData.flows || [];

// // 	const connectors = ports.map((p) => ({
// // 		id: `${rawData.id}/${p.portNumber || p.port}`,
// // 		name: p.portNumber || p.port,
// // 		portNumber: p.portNumber || p.port,
// // 		mac: p.hardwareAddress || "N/A",
// // 		currentSpeedMbps: 0, 
// // 		maxSpeedMbps: 0,
// // 		currentFeature: "N/A",
// // 		state: {
// // 			linkDown: false,
// // 			blocked: false,
// // 			live: true,
// // 		},
// // 		packetStats: {
// // 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// // 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// // 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// // 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// // 		},
// // 		errors: {
// // 			receiveErrors: p.receiveErrors ?? 0,
// // 			transmitErrors: p.transmitErrors ?? 0,
// // 			crcErrors: 0,
// // 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// // 		},
// // 		uptime: "N/A",
// // 	}));

// // 	const flowTables = [{
// // 		id: 0,
// // 		stats: { activeFlows: flows.length, packetsMatched: 0, packetsLookedUp: 0 },
// // 		flows: flows.map((f, idx) => ({
// // 			id: f.cookie || `flow-${idx}`,
// // 			priority: f.priority || 0,
// // 			cookie: f.cookie || "0",
// // 			match: f.match || {},
// // 			instructions: f.actions || null,
// // 			stats: {
// // 				packets: f.packetCount ?? 0,
// // 				bytes: f.byteCount ?? 0,
// // 				duration: `${f.durationSeconds ?? 0}s`,
// // 			},
// // 		})),
// // 	}];

// // 	return {
// // 		id: rawData.id,
// // 		metadata: {
// // 			ip: "N/A",
// // 			hardware: desc.hardware || "N/A",
// // 			description: desc.datapath || "N/A",
// // 			manufacturer: desc.manufacturer || "N/A",
// // 			serial: desc.serial || "N/A",
// // 			software: desc.software || "N/A",
// // 		},
// // 		connectors,
// // 		flowTables,
// // 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// // 		snapshot: { start: null, end: null, succeeded: false },
// // 		features: {},
// // 	};
// // };

// // // Update your main switchboard export to include Floodlight:
// // export const mapNodeDetails = (rawData) => {
// // 	if (rawData && rawData.controller === "floodlight") {
// // 		return mapFloodlightNodeDetails(rawData);
// // 	}
// // 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// // 		return mapOnosNodeDetails(rawData);
// // 	}
// // 	return mapOdlNodeDetails(rawData);
// // };

// import { toMbps, formatDuration } from "../utils/helper";

// const mapOdlNodeDetails = (rawData) => {
// 	const node = rawData["opendaylight-inventory:node"]?.[0];
// 	if (!node) return null;

// 	const mapConnectors = (connectors = []) =>
// 		connectors.map((c) => {
// 			const stats =
// 				c[
// 					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// 				] || {};
// 			const state = c["flow-node-inventory:state"] || {};

// 			return {
// 				id: c.id,
// 				name: c["flow-node-inventory:name"],
// 				portNumber: c["flow-node-inventory:port-number"],
// 				mac: c["flow-node-inventory:hardware-address"],
// 				currentSpeedMbps: toMbps(
// 					c["flow-node-inventory:current-speed"] || 0
// 				),
// 				maxSpeedMbps: toMbps(
// 					c["flow-node-inventory:maximum-speed"] || 0
// 				),
// 				currentFeature: c["flow-node-inventory:current-feature"],
// 				supportedFeatures: c["flow-node-inventory:supported"],
// 				peerFeatures: c["flow-node-inventory:peer-features"],
// 				advertisedFeatures:
// 					c["flow-node-inventory:advertised-features"],
// 				configuration: c["flow-node-inventory:configuration"],
// 				stpStatus: c["stp-status-aware-node-connector:status"] || null,
// 				state: {
// 					linkDown: state["link-down"],
// 					blocked: state["blocked"],
// 					live: state["live"],
// 				},
// 				packetStats: {
// 					tx: stats.packets?.transmitted ?? 0,
// 					rx: stats.packets?.received ?? 0,
// 					txBytes: stats.bytes?.transmitted ?? 0,
// 					rxBytes: stats.bytes?.received ?? 0,
// 				},
// 				errors: {
// 					receiveErrors: stats["receive-errors"] ?? 0,
// 					transmitErrors: stats["transmit-errors"] ?? 0,
// 					crcErrors: stats["receive-crc-error"] ?? 0,
// 					drops: {
// 						receive: stats["receive-drops"] ?? 0,
// 						transmit: stats["transmit-drops"] ?? 0,
// 					},
// 					collisions: stats["collision-count"] ?? 0,
// 					frameErrors: stats["receive-frame-error"] ?? 0,
// 					overrun: stats["receive-over-run-error"] ?? 0,
// 				},
// 				uptime: formatDuration(stats.duration),
// 			};
// 		});

// 	const mapFlowTables = (tables = []) =>
// 		tables.map((table) => {
// 			const stats =
// 				table[
// 					"opendaylight-flow-table-statistics:flow-table-statistics"
// 				] || {};
// 			const flows = table.flow || [];

// 			return {
// 				id: table.id,
// 				stats: {
// 					activeFlows: stats["active-flows"],
// 					packetsMatched: stats["packets-matched"],
// 					packetsLookedUp: stats["packets-looked-up"],
// 				},
// 				flows: flows.map((flow) => ({
// 					id: flow.id,
// 					priority: flow.priority,
// 					cookie: flow.cookie,
// 					match: flow.match,
// 					instructions: flow.instructions || null,
// 					stats: {
// 						packets:
// 							flow[
// 								"opendaylight-flow-statistics:flow-statistics"
// 							]?.["packet-count"] ?? 0,
// 						bytes:
// 							flow[
// 								"opendaylight-flow-statistics:flow-statistics"
// 							]?.["byte-count"] ?? 0,
// 						duration: formatDuration(
// 							flow["opendaylight-flow-statistics:flow-statistics"]
// 								?.duration
// 						),
// 					},
// 				})),
// 			};
// 		});

// 	return {
// 		id: node.id,
// 		metadata: {
// 			ip: node["flow-node-inventory:ip-address"],
// 			hardware: node["flow-node-inventory:hardware"],
// 			description: node["flow-node-inventory:description"],
// 			manufacturer: node["flow-node-inventory:manufacturer"],
// 			serial: node["flow-node-inventory:serial-number"],
// 			software: node["flow-node-inventory:software"],
// 		},
// 		connectors: mapConnectors(node["node-connector"]),
// 		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
// 		groupFeatures: {
// 			capabilities:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"group-capabilities-supported"
// 				] || [],
// 			types:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"group-types-supported"
// 				] || [],
// 			maxGroups:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"max-groups"
// 				] || [],
// 			actions:
// 				node["opendaylight-group-statistics:group-features"]?.[
// 					"actions"
// 				] || [],
// 		},
// 		snapshot: {
// 			start: node["flow-node-inventory:snapshot-gathering-status-start"]
// 				?.begin,
// 			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
// 			succeeded:
// 				node["flow-node-inventory:snapshot-gathering-status-end"]
// 					?.succeeded,
// 		},
// 		features: node["flow-node-inventory:switch-features"] || {},
// 	};
// };

// const mapOnosConnectors = (deviceId, ports = []) => {
// 	return ports.map((p) => ({
// 		id: `${deviceId}/${p.port}`,
// 		name: p.port,
// 		portNumber: p.port,
// 		mac: "N/A",
// 		currentSpeedMbps: p.portSpeed || 0,
// 		maxSpeedMbps: p.portSpeed || 0,
// 		currentFeature: "N/A",
// 		state: {
// 			linkDown: !p.isEnabled,
// 			blocked: false,
// 			live: p.isEnabled,
// 		},
// 		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
// 		errors: {
// 			receiveErrors: 0,
// 			transmitErrors: 0,
// 			crcErrors: 0,
// 			drops: { receive: 0, transmit: 0 },
// 		},
// 		uptime: "N/A",
// 	}));
// };

// const mapOnosNodeDetails = (rawData) => {
// 	const device = rawData?.device || {};
// 	const deviceId = rawData?.id || device.id || "N/A";

// 	return {
// 		id: deviceId,
// 		metadata: {
// 			ip: "N/A",
// 			hardware: device.hw || "N/A",
// 			description: device.sw || "N/A",
// 			manufacturer: device.mfr || "N/A",
// 			serial: device.serial || "N/A",
// 			software: device.sw || "N/A",
// 		},
// 		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
// 		flowTables: [],
// 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// 		snapshot: { start: null, end: null, succeeded: false },
// 		features: {},
// 	};
// };

// const mapFloodlightNodeDetails = (rawData) => {
// 	const desc = rawData.desc || {};
// 	const ports = rawData.ports || [];
// 	const flows = rawData.flows || [];

// 	const connectors = ports.map((p) => ({
// 		id: `${rawData.id}/${p.portNumber || p.port}`,
// 		name: p.portNumber || p.port,
// 		portNumber: p.portNumber || p.port,
// 		mac: p.hardwareAddress || "N/A",
// 		currentSpeedMbps: 0, 
// 		maxSpeedMbps: 0,
// 		currentFeature: "N/A",
// 		state: {
// 			linkDown: false,
// 			blocked: false,
// 			live: true,
// 		},
// 		packetStats: {
// 			tx: p.transmitPackets ?? p.packetsTransmitted ?? 0,
// 			rx: p.receivePackets ?? p.packetsReceived ?? 0,
// 			txBytes: p.transmitBytes ?? p.bytesTransmitted ?? 0,
// 			rxBytes: p.receiveBytes ?? p.bytesReceived ?? 0,
// 		},
// 		errors: {
// 			receiveErrors: p.receiveErrors ?? 0,
// 			transmitErrors: p.transmitErrors ?? 0,
// 			crcErrors: 0,
// 			drops: { receive: p.receiveDrops ?? 0, transmit: p.transmitDrops ?? 0 },
// 		},
// 		uptime: "N/A",
// 	}));

// 	const flowTables = [{
// 		id: 0,
// 		stats: { activeFlows: flows.length, packetsMatched: 0, packetsLookedUp: 0 },
// 		flows: flows.map((f, idx) => ({
// 			id: f.cookie || `flow-${idx}`,
// 			priority: f.priority || 0,
// 			cookie: f.cookie || "0",
// 			match: f.match || {},
// 			instructions: f.actions || null,
// 			stats: {
// 				packets: f.packetCount ?? 0,
// 				bytes: f.byteCount ?? 0,
// 				duration: `${f.durationSeconds ?? 0}s`,
// 			},
// 		})),
// 	}];

// 	return {
// 		id: rawData.id,
// 		metadata: {
// 			ip: "N/A",
// 			hardware: desc.hardware || "N/A",
// 			description: desc.datapath || "N/A",
// 			manufacturer: desc.manufacturer || "N/A",
// 			serial: desc.serial || "N/A",
// 			software: desc.software || "N/A",
// 		},
// 		connectors,
// 		flowTables,
// 		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
// 		snapshot: { start: null, end: null, succeeded: false },
// 		features: {},
// 	};
// };

// export const mapNodeDetails = (rawData) => {
// 	if (rawData && rawData.controller === "floodlight") {
// 		return mapFloodlightNodeDetails(rawData);
// 	}
// 	if (rawData && (rawData.controller === "onos" || rawData.device)) {
// 		return mapOnosNodeDetails(rawData);
// 	}
// 	return mapOdlNodeDetails(rawData);
// };
import { toMbps, formatDuration } from "../utils/helper";

const mapOdlNodeDetails = (rawData) => {
	const node = rawData?.["opendaylight-inventory:node"]?.[0];
	if (!node) return null;

	const mapConnectors = (connectors = []) =>
		connectors.map((c) => {
			const stats =
				c[
					"opendaylight-port-statistics:flow-capable-node-connector-statistics"
				] || {};
			const state = c["flow-node-inventory:state"] || {};

			return {
				id: c.id,
				name: c["flow-node-inventory:name"],
				portNumber: c["flow-node-inventory:port-number"],
				mac: c["flow-node-inventory:hardware-address"],
				currentSpeedMbps: toMbps(
					c["flow-node-inventory:current-speed"] || 0
				),
				maxSpeedMbps: toMbps(
					c["flow-node-inventory:maximum-speed"] || 0
				),
				currentFeature: c["flow-node-inventory:current-feature"],
				supportedFeatures: c["flow-node-inventory:supported"],
				peerFeatures: c["flow-node-inventory:peer-features"],
				advertisedFeatures:
					c["flow-node-inventory:advertised-features"],
				configuration: c["flow-node-inventory:configuration"],
				stpStatus: c["stp-status-aware-node-connector:status"] || null,
				state: {
					linkDown: state["link-down"],
					blocked: state["blocked"],
					live: state["live"],
				},
				packetStats: {
					tx: stats.packets?.transmitted ?? 0,
					rx: stats.packets?.received ?? 0,
					txBytes: stats.bytes?.transmitted ?? 0,
					rxBytes: stats.bytes?.received ?? 0,
				},
				errors: {
					receiveErrors: stats["receive-errors"] ?? 0,
					transmitErrors: stats["transmit-errors"] ?? 0,
					crcErrors: stats["receive-crc-error"] ?? 0,
					drops: {
						receive: stats["receive-drops"] ?? 0,
						transmit: stats["transmit-drops"] ?? 0,
					},
					collisions: stats["collision-count"] ?? 0,
					frameErrors: stats["receive-frame-error"] ?? 0,
					overrun: stats["receive-over-run-error"] ?? 0,
				},
				uptime: formatDuration(stats.duration),
			};
		});

	const mapFlowTables = (tables = []) =>
		tables.map((table) => {
			const stats =
				table[
					"opendaylight-flow-table-statistics:flow-table-statistics"
				] || {};
			const flows = table.flow || [];

			return {
				id: table.id,
				stats: {
					activeFlows: stats["active-flows"],
					packetsMatched: stats["packets-matched"],
					packetsLookedUp: stats["packets-looked-up"],
				},
				flows: flows.map((flow) => ({
					id: flow.id,
					priority: flow.priority,
					cookie: flow.cookie,
					match: flow.match,
					instructions: flow.instructions || null,
					stats: {
						packets:
							flow[
								"opendaylight-flow-statistics:flow-statistics"
							]?.["packet-count"] ?? 0,
						bytes:
							flow[
								"opendaylight-flow-statistics:flow-statistics"
							]?.["byte-count"] ?? 0,
						duration: formatDuration(
							flow["opendaylight-flow-statistics:flow-statistics"]
								?.duration
						),
					},
				})),
			};
		});

	return {
		id: node.id,
		metadata: {
			ip: node["flow-node-inventory:ip-address"],
			hardware: node["flow-node-inventory:hardware"],
			description: node["flow-node-inventory:description"],
			manufacturer: node["flow-node-inventory:manufacturer"],
			serial: node["flow-node-inventory:serial-number"],
			software: node["flow-node-inventory:software"],
		},
		connectors: mapConnectors(node["node-connector"]),
		flowTables: mapFlowTables(node["flow-node-inventory:table"]),
		groupFeatures: {
			capabilities:
				node["opendaylight-group-statistics:group-features"]?.[
					"group-capabilities-supported"
				] || [],
			types:
				node["opendaylight-group-statistics:group-features"]?.[
					"group-types-supported"
				] || [],
			maxGroups:
				node["opendaylight-group-statistics:group-features"]?.[
					"max-groups"
				] || [],
			actions:
				node["opendaylight-group-statistics:group-features"]?.[
					"actions"
				] || [],
		},
		snapshot: {
			start: node["flow-node-inventory:snapshot-gathering-status-start"]
				?.begin,
			end: node["flow-node-inventory:snapshot-gathering-status-end"]?.end,
			succeeded:
				node["flow-node-inventory:snapshot-gathering-status-end"]
					?.succeeded,
		},
		features: node["flow-node-inventory:switch-features"] || {},
	};
};

const mapOnosConnectors = (deviceId, ports = []) => {
	return ports.map((p) => ({
		id: `${deviceId}/${p.port}`,
		name: p.port,
		portNumber: p.port,
		mac: "N/A",
		currentSpeedMbps: p.portSpeed || 0,
		maxSpeedMbps: p.portSpeed || 0,
		currentFeature: "N/A",
		state: {
			linkDown: !p.isEnabled,
			blocked: false,
			live: p.isEnabled,
		},
		packetStats: { tx: 0, rx: 0, txBytes: 0, rxBytes: 0 },
		errors: {
			receiveErrors: 0,
			transmitErrors: 0,
			crcErrors: 0,
			drops: { receive: 0, transmit: 0 },
		},
		uptime: "N/A",
	}));
};

const mapOnosNodeDetails = (rawData) => {
	const device = rawData?.device || {};
	const deviceId = rawData?.id || device.id || "N/A";

	return {
		id: deviceId,
		metadata: {
			ip: "N/A",
			hardware: device.hw || "N/A",
			description: device.sw || "N/A",
			manufacturer: device.mfr || "N/A",
			serial: device.serial || "N/A",
			software: device.sw || "N/A",
		},
		connectors: mapOnosConnectors(deviceId, rawData.ports || []),
		flowTables: [],
		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
		snapshot: { start: null, end: null, succeeded: false },
		features: {},
	};
};

const mapFloodlightNodeDetails = (rawData) => {
	const desc = rawData.desc || {};
	const ports = rawData.ports || [];
	const flows = rawData.flows || [];

	const connectors = ports.map((p) => ({
		id: `${rawData.id}/${p.port_number}`,
		name: p.port_number,
		portNumber: p.port_number,
		mac: "N/A", // Not exposed in Floodlight port statistics endpoint
		currentSpeedMbps: 0, 
		maxSpeedMbps: 0,
		currentFeature: "N/A",
		state: {
			linkDown: false,
			blocked: false,
			live: true,
		},
		packetStats: {
			tx: Number(p.transmit_packets ?? 0),
			rx: Number(p.receive_packets ?? 0),
			txBytes: Number(p.transmit_bytes ?? 0),
			rxBytes: Number(p.receive_bytes ?? 0),
		},
		errors: {
			receiveErrors: Number(p.receive_errors ?? 0),
			transmitErrors: Number(p.transmit_errors ?? 0),
			crcErrors: Number(p.receive_CRC_errors ?? 0),
			drops: { 
				receive: Number(p.receive_dropped ?? 0), 
				transmit: Number(p.transmit_dropped ?? 0) 
			},
		},
		uptime: "N/A",
	}));

	const flowsList = Array.isArray(flows) ? flows : (flows && Array.isArray(flows.flows) ? flows.flows : []);

	const flowTables = [{
		id: 0,
		stats: { activeFlows: flowsList.length, packetsMatched: 0, packetsLookedUp: 0 },
		flows: flowsList.map((f, idx) => ({
			id: f.cookie || `flow-${idx}`,
			priority: f.priority || 0,
			cookie: f.cookie || "0",
			match: f.match || {},
			instructions: f.actions || null,
			stats: {
				packets: f.packet_count ?? 0,
				bytes: f.byte_count ?? 0,
				duration: `${f.duration_sec ?? 0}s`,
			},
		})),
	}];

	return {
		id: rawData.id,
		metadata: {
			ip: "N/A",
			hardware: desc.hardware_description || "N/A",
			description: desc.datapath_description || "N/A",
			manufacturer: desc.manufacturer_description || "N/A",
			serial: desc.serial_number || "N/A",
			software: desc.software_description || "N/A",
		},
		connectors,
		flowTables,
		groupFeatures: { capabilities: [], types: [], maxGroups: [], actions: [] },
		snapshot: { start: null, end: null, succeeded: false },
		features: {},
	};
};

export const mapNodeDetails = (rawData) => {
	if (!rawData) return null;

	if (rawData.controller === "floodlight") {
		return mapFloodlightNodeDetails(rawData);
	}
	if (rawData && (rawData.controller === "onos" || rawData.device)) {
		return mapOnosNodeDetails(rawData);
	}
	return mapOdlNodeDetails(rawData);
};