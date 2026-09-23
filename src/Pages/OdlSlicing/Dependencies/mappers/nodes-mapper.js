// // // // import { toMbps, formatDuration } from "../utils/helper";

// // // // // export const mapNodes = (rawData) => {
// // // // // 	const nodes = rawData?.["network-topology"]?.topology?.[0]?.node || [];

// // // // // 	return nodes.map((node) => ({
// // // // // 		id: node["node-id"],
// // // // // 		type: node["host-tracker-service:addresses"] ? "host" : "switch",
// // // // // 		addresses: node["host-tracker-service:addresses"] || [],
// // // // // 		terminationPoints: node["termination-point"] || [],
// // // // // 	}));
// // // // // };

// // // // export const mapNodeConnectors = (connectors = []) => {
// // // // 	console.log(connectors);
// // // // 	return connectors.map((conn) => {
// // // // 		const stats =
// // // // 			conn[
// // // // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // // 			] || {};
// // // // 		const state = conn["flow-node-inventory:state"] || {};

// // // // 		return {
// // // // 			id: conn.id,
// // // // 			name: conn["flow-node-inventory:name"],
// // // // 			portNumber: conn["flow-node-inventory:port-number"],
// // // // 			mac: conn["flow-node-inventory:hardware-address"],
// // // // 			currentSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:current-speed"] || 0
// // // // 			),
// // // // 			maxSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:maximum-speed"] || 0
// // // // 			),
// // // // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // // // 			state: {
// // // // 				linkDown: state["link-down"],
// // // // 				blocked: state["blocked"],
// // // // 				live: state["live"],
// // // // 			},
// // // // 			stpStatus:
// // // // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // // // 			packetStats: {
// // // // 				tx: stats.packets?.transmitted ?? 0,
// // // // 				rx: stats.packets?.received ?? 0,
// // // // 				txBytes: stats.bytes?.transmitted ?? 0,
// // // // 				rxBytes: stats.bytes?.received ?? 0,
// // // // 			},
// // // // 			uptime: formatDuration(stats.duration),
// // // // 		};
// // // // 	});
// // // // };

// // // // export const mapNodes = (rawData) => {
// // // // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // // // 	return nodes.map((node) => {
// // // // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // // // 		// Determine overall node status (based on its connectors)
// // // // 		let status = "unknown";
// // // // 		const allDown = connectors.every((c) => c.state.linkDown);
// // // // 		const anyLive = connectors.some(
// // // // 			(c) => c.state.live && !c.state.blocked
// // // // 		);
// // // // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // // // 		if (allDown) status = "down";
// // // // 		else if (anyLive) status = "up";
// // // // 		else if (anyBlocked) status = "blocked";
 
// // // // 		const id = node.id;
// // // // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // // // 		return {
// // // // 			id: node.id,
// // // // 			type,
// // // // 			connectors,
// // // // 			status,
// // // // 		};
// // // // 	});
// // // // };

// // // // import { toMbps, formatDuration } from "../utils/helper";

// // // // // export const mapNodes = (rawData) => {
// // // // // 	const nodes = rawData?.["network-topology"]?.topology?.[0]?.node || [];

// // // // // 	return nodes.map((node) => ({
// // // // // 		id: node["node-id"],
// // // // // 		type: node["host-tracker-service:addresses"] ? "host" : "switch",
// // // // // 		addresses: node["host-tracker-service:addresses"] || [],
// // // // // 		terminationPoints: node["termination-point"] || [],
// // // // // 	}));
// // // // // };

// // // // export const mapNodeConnectors = (connectors = []) => {
// // // // 	console.log(connectors);
// // // // 	return connectors.map((conn) => {
// // // // 		const stats =
// // // // 			conn[
// // // // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // // 			] || {};
// // // // 		const state = conn["flow-node-inventory:state"] || {};

// // // // 		return {
// // // // 			id: conn.id,
// // // // 			name: conn["flow-node-inventory:name"],
// // // // 			portNumber: conn["flow-node-inventory:port-number"],
// // // // 			mac: conn["flow-node-inventory:hardware-address"],
// // // // 			currentSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:current-speed"] || 0
// // // // 			),
// // // // 			maxSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:maximum-speed"] || 0
// // // // 			),
// // // // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // // // 			state: {
// // // // 				linkDown: state["link-down"],
// // // // 				blocked: state["blocked"],
// // // // 				live: state["live"],
// // // // 			},
// // // // 			stpStatus:
// // // // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // // // 			packetStats: {
// // // // 				tx: stats.packets?.transmitted ?? 0,
// // // // 				rx: stats.packets?.received ?? 0,
// // // // 				txBytes: stats.bytes?.transmitted ?? 0,
// // // // 				rxBytes: stats.bytes?.received ?? 0,
// // // // 			},
// // // // 			uptime: formatDuration(stats.duration),
// // // // 		};
// // // // 	});
// // // // };

// // // // export const mapNodes = (rawData) => {
// // // // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // // // 	return nodes.map((node) => {
// // // // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // // // 		// Determine overall node status (based on its connectors)
// // // // 		let status = "unknown";
// // // // 		const allDown = connectors.every((c) => c.state.linkDown);
// // // // 		const anyLive = connectors.some(
// // // // 			(c) => c.state.live && !c.state.blocked
// // // // 		);
// // // // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // // // 		if (allDown) status = "down";
// // // // 		else if (anyLive) status = "up";
// // // // 		else if (anyBlocked) status = "blocked";
 
// // // // 		const id = node.id;
// // // // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // // // 		return {
// // // // 			id: node.id,
// // // // 			type,
// // // // 			connectors,
// // // // 			status,
// // // // 		};
// // // // 	});
// // // // };


// // // import { toMbps, formatDuration } from "../utils/helper";

// // // export const mapNodeConnectors = (connectors = []) => {
// // // 	return connectors.map((conn) => {
// // // 		const stats =
// // // 			conn[
// // // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // 			] || {};
// // // 		const state = conn["flow-node-inventory:state"] || {};

// // // 		return {
// // // 			id: conn.id,
// // // 			name: conn["flow-node-inventory:name"],
// // // 			portNumber: conn["flow-node-inventory:port-number"],
// // // 			mac: conn["flow-node-inventory:hardware-address"],
// // // 			currentSpeedMbps: toMbps(
// // // 				conn["flow-node-inventory:current-speed"] || 0
// // // 			),
// // // 			maxSpeedMbps: toMbps(
// // // 				conn["flow-node-inventory:maximum-speed"] || 0
// // // 			),
// // // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // // 			state: {
// // // 				linkDown: state["link-down"],
// // // 				blocked: state["blocked"],
// // // 				live: state["live"],
// // // 			},
// // // 			stpStatus:
// // // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // // 			packetStats: {
// // // 				tx: stats.packets?.transmitted ?? 0,
// // // 				rx: stats.packets?.received ?? 0,
// // // 				txBytes: stats.bytes?.transmitted ?? 0,
// // // 				rxBytes: stats.bytes?.received ?? 0,
// // // 			},
// // // 			uptime: formatDuration(stats.duration),
// // // 		};
// // // 	});
// // // };

// // // const mapOdlNodes = (rawData) => {
// // // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // // 	return nodes.map((node) => {
// // // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // // 		let status = "unknown";
// // // 		const allDown = connectors.every((c) => c.state.linkDown);
// // // 		const anyLive = connectors.some(
// // // 			(c) => c.state.live && !c.state.blocked
// // // 		);
// // // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // // 		if (allDown) status = "down";
// // // 		else if (anyLive) status = "up";
// // // 		else if (anyBlocked) status = "blocked";
 
// // // 		const id = node.id;
// // // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // // 		return {
// // // 			id: node.id,
// // // 			type,
// // // 			connectors,
// // // 			status,
// // // 		};
// // // 	});
// // // };

// // // /**
// // //  * ADAPTER: Maps raw ONOS ports array into standard DTO connector layout
// // //  */
// // // const mapOnosPortsToConnectors = (deviceId, ports = []) => {
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
// // // 		stpStatus: "unknown",
// // // 		packetStats: {
// // // 			tx: 0,
// // // 			rx: 0,
// // // 			txBytes: 0,
// // // 			rxBytes: 0,
// // // 		},
// // // 		uptime: "N/A",
// // // 	}));
// // // };

// // // /**
// // //  * Switchboard Mapper (Adapter Pattern)
// // //  */
// // // const mapOnosNodes = (rawData) => {
// // // 	const devices = rawData?.devices || [];
// // // 	const hosts = rawData?.hosts || [];

// // // 	const mappedSwitches = devices.map((dev) => {
// // // 		// Map the newly fetched dev.ports array using our ONOS port mapper
// // // 		const connectors = mapOnosPortsToConnectors(dev.id, dev.ports || []);

// // // 		return {
// // // 			id: dev.id,
// // // 			type: "Switch",
// // // 			connectors,
// // // 			status: dev.available ? "up" : "down",
// // // 		};
// // // 	});

// // // 	const mappedHosts = hosts.map((host) => ({
// // // 		id: `host:${host.mac}`,
// // // 		type: "Host",
// // // 		connectors: [],
// // // 		status: "up",
// // // 	}));

// // // 	return [...mappedSwitches, ...mappedHosts];
// // // };

// // // export const mapNodes = (rawData) => {
// // // 	if (rawData && rawData.controller === "onos") {
// // // 		return mapOnosNodes(rawData);
// // // 	}
// // // 	return mapOdlNodes(rawData);
// // // };

// // // // import { toMbps, formatDuration } from "../utils/helper";

// // // // // export const mapNodes = (rawData) => {
// // // // // 	const nodes = rawData?.["network-topology"]?.topology?.[0]?.node || [];

// // // // // 	return nodes.map((node) => ({
// // // // // 		id: node["node-id"],
// // // // // 		type: node["host-tracker-service:addresses"] ? "host" : "switch",
// // // // // 		addresses: node["host-tracker-service:addresses"] || [],
// // // // // 		terminationPoints: node["termination-point"] || [],
// // // // // 	}));
// // // // // };

// // // // export const mapNodeConnectors = (connectors = []) => {
// // // // 	console.log(connectors);
// // // // 	return connectors.map((conn) => {
// // // // 		const stats =
// // // // 			conn[
// // // // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // // 			] || {};
// // // // 		const state = conn["flow-node-inventory:state"] || {};

// // // // 		return {
// // // // 			id: conn.id,
// // // // 			name: conn["flow-node-inventory:name"],
// // // // 			portNumber: conn["flow-node-inventory:port-number"],
// // // // 			mac: conn["flow-node-inventory:hardware-address"],
// // // // 			currentSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:current-speed"] || 0
// // // // 			),
// // // // 			maxSpeedMbps: toMbps(
// // // // 				conn["flow-node-inventory:maximum-speed"] || 0
// // // // 			),
// // // // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // // // 			state: {
// // // // 				linkDown: state["link-down"],
// // // // 				blocked: state["blocked"],
// // // // 				live: state["live"],
// // // // 			},
// // // // 			stpStatus:
// // // // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // // // 			packetStats: {
// // // // 				tx: stats.packets?.transmitted ?? 0,
// // // // 				rx: stats.packets?.received ?? 0,
// // // // 				txBytes: stats.bytes?.transmitted ?? 0,
// // // // 				rxBytes: stats.bytes?.received ?? 0,
// // // // 			},
// // // // 			uptime: formatDuration(stats.duration),
// // // // 		};
// // // // 	});
// // // // };

// // // // export const mapNodes = (rawData) => {
// // // // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // // // 	return nodes.map((node) => {
// // // // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // // // 		// Determine overall node status (based on its connectors)
// // // // 		let status = "unknown";
// // // // 		const allDown = connectors.every((c) => c.state.linkDown);
// // // // 		const anyLive = connectors.some(
// // // // 			(c) => c.state.live && !c.state.blocked
// // // // 		);
// // // // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // // // 		if (allDown) status = "down";
// // // // 		else if (anyLive) status = "up";
// // // // 		else if (anyBlocked) status = "blocked";
 
// // // // 		const id = node.id;
// // // // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // // // 		return {
// // // // 			id: node.id,
// // // // 			type,
// // // // 			connectors,
// // // // 			status,
// // // // 		};
// // // // 	});
// // // // };


// // // import { toMbps, formatDuration } from "../utils/helper";

// // // export const mapNodeConnectors = (connectors = []) => {
// // // 	return connectors.map((conn) => {
// // // 		const stats =
// // // 			conn[
// // // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // // 			] || {};
// // // 		const state = conn["flow-node-inventory:state"] || {};

// // // 		return {
// // // 			id: conn.id,
// // // 			name: conn["flow-node-inventory:name"],
// // // 			portNumber: conn["flow-node-inventory:port-number"],
// // // 			mac: conn["flow-node-inventory:hardware-address"],
// // // 			currentSpeedMbps: toMbps(
// // // 				conn["flow-node-inventory:current-speed"] || 0
// // // 			),
// // // 			maxSpeedMbps: toMbps(
// // // 				conn["flow-node-inventory:maximum-speed"] || 0
// // // 			),
// // // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // // 			state: {
// // // 				linkDown: state["link-down"],
// // // 				blocked: state["blocked"],
// // // 				live: state["live"],
// // // 			},
// // // 			stpStatus:
// // // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // // 			packetStats: {
// // // 				tx: stats.packets?.transmitted ?? 0,
// // // 				rx: stats.packets?.received ?? 0,
// // // 				txBytes: stats.bytes?.transmitted ?? 0,
// // // 				rxBytes: stats.bytes?.received ?? 0,
// // // 			},
// // // 			uptime: formatDuration(stats.duration),
// // // 		};
// // // 	});
// // // };

// // // const mapOdlNodes = (rawData) => {
// // // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // // 	return nodes.map((node) => {
// // // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // // 		let status = "unknown";
// // // 		const allDown = connectors.every((c) => c.state.linkDown);
// // // 		const anyLive = connectors.some(
// // // 			(c) => c.state.live && !c.state.blocked
// // // 		);
// // // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // // 		if (allDown) status = "down";
// // // 		else if (anyLive) status = "up";
// // // 		else if (anyBlocked) status = "blocked";
 
// // // 		const id = node.id;
// // // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // // 		return {
// // // 			id: node.id,
// // // 			type,
// // // 			connectors,
// // // 			status,
// // // 		};
// // // 	});
// // // };

// // // /**
// // //  * ADAPTER: Maps raw ONOS ports array into standard DTO connector layout
// // //  */
// // // const mapOnosPortsToConnectors = (deviceId, ports = []) => {
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
// // // 		stpStatus: "unknown",
// // // 		packetStats: {
// // // 			tx: 0,
// // // 			rx: 0,
// // // 			txBytes: 0,
// // // 			rxBytes: 0,
// // // 		},
// // // 		uptime: "N/A",
// // // 	}));
// // // };

// // // /**
// // //  * Switchboard Mapper (Adapter Pattern)
// // //  */
// // // const mapOnosNodes = (rawData) => {
// // // 	const devices = rawData?.devices || [];
// // // 	const hosts = rawData?.hosts || [];

// // // 	const mappedSwitches = devices.map((dev) => {
// // // 		// Map the newly fetched dev.ports array using our ONOS port mapper
// // // 		const connectors = mapOnosPortsToConnectors(dev.id, dev.ports || []);

// // // 		return {
// // // 			id: dev.id,
// // // 			type: "Switch",
// // // 			connectors,
// // // 			status: dev.available ? "up" : "down",
// // // 		};
// // // 	});

// // // 	const mappedHosts = hosts.map((host) => ({
// // // 		id: `host:${host.mac}`,
// // // 		type: "Host",
// // // 		connectors: [],
// // // 		status: "up",
// // // 	}));

// // // 	return [...mappedSwitches, ...mappedHosts];
// // // };

// // // export const mapNodes = (rawData) => {
// // // 	if (rawData && rawData.controller === "onos") {
// // // 		return mapOnosNodes(rawData);
// // // 	}
// // // 	return mapOdlNodes(rawData);
// // // };

// // // /**
// // //  * ADAPTER: Maps raw Floodlight switch and host lists to standard DTO structure
// // //  */
// // // const mapFloodlightNodes = (rawData) => {
// // // 	const switches = rawData?.switches || [];
// // // 	const devices = rawData?.devices || [];

// // // 	const mappedSwitches = switches.map((sw) => ({
// // // 		id: sw.switchDPID,
// // // 		type: "Switch",
// // // 		connectors: [], // Individual connectors are populated on Detail view
// // // 		status: "up",
// // // 	}));

// // // 	const mappedHosts = devices.map((dev) => {
// // // 		const mac = dev.mac?.[0] || "N/A";
// // // 		return {
// // // 			id: `host:${mac}`,
// // // 			type: "Host",
// // // 			connectors: [],
// // // 			status: "up",
// // // 		};
// // // 	});

// // // 	return [...mappedSwitches, ...mappedHosts];
// // // };

// // // // Update your main switchboard export to include Floodlight:
// // // export const mapNodes = (rawData) => {
// // // 	if (rawData && rawData.controller === "onos") {
// // // 		return mapOnosNodes(rawData);
// // // 	}
// // // 	if (rawData && rawData.controller === "floodlight") {
// // // 		return mapFloodlightNodes(rawData);
// // // 	}
// // // 	return mapOdlNodes(rawData);
// // // };

























































// // import { toMbps, formatDuration } from "../utils/helper";

// // export const mapNodeConnectors = (connectors = []) => {
// // 	return connectors.map((conn) => {
// // 		const stats =
// // 			conn[
// // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // 			] || {};
// // 		const state = conn["flow-node-inventory:state"] || {};

// // 		return {
// // 			id: conn.id,
// // 			name: conn["flow-node-inventory:name"],
// // 			portNumber: conn["flow-node-inventory:port-number"],
// // 			mac: conn["flow-node-inventory:hardware-address"],
// // 			currentSpeedMbps: toMbps(
// // 				conn["flow-node-inventory:current-speed"] || 0
// // 			),
// // 			maxSpeedMbps: toMbps(
// // 				conn["flow-node-inventory:maximum-speed"] || 0
// // 			),
// // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // 			state: {
// // 				linkDown: state["link-down"],
// // 				blocked: state["blocked"],
// // 				live: state["live"],
// // 			},
// // 			stpStatus:
// // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // 			packetStats: {
// // 				tx: stats.packets?.transmitted ?? 0,
// // 				rx: stats.packets?.received ?? 0,
// // 				txBytes: stats.bytes?.transmitted ?? 0,
// // 				rxBytes: stats.bytes?.received ?? 0,
// // 			},
// // 			uptime: formatDuration(stats.duration),
// // 		};
// // 	});
// // };

// // const mapOdlNodes = (rawData) => {
// // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // 	return nodes.map((node) => {
// // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // 		let status = "unknown";
// // 		const allDown = connectors.every((c) => c.state.linkDown);
// // 		const anyLive = connectors.some(
// // 			(c) => c.state.live && !c.state.blocked
// // 		);
// // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // 		if (allDown) status = "down";
// // 		else if (anyLive) status = "up";
// // 		else if (anyBlocked) status = "blocked";
 
// // 		const id = node.id;
// // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // 		return {
// // 			id: node.id,
// // 			type,
// // 			connectors,
// // 			status,
// // 		};
// // 	});
// // };

// // const mapOnosPortsToConnectors = (deviceId, ports = []) => {
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
// // 		stpStatus: "unknown",
// // 		packetStats: {
// // 			tx: 0,
// // 			rx: 0,
// // 			txBytes: 0,
// // 			rxBytes: 0,
// // 		},
// // 		uptime: "N/A",
// // 	}));
// // };

// // const mapOnosNodes = (rawData) => {
// // 	const devices = rawData?.devices || [];
// // 	const hosts = rawData?.hosts || [];

// // 	const mappedSwitches = devices.map((dev) => {
// // 		const connectors = mapOnosPortsToConnectors(dev.id, dev.ports || []);

// // 		return {
// // 			id: dev.id,
// // 			type: "Switch",
// // 			connectors,
// // 			status: dev.available ? "up" : "down",
// // 		};
// // 	});

// // 	const mappedHosts = hosts.map((host) => ({
// // 		id: `host:${host.mac}`,
// // 		type: "Host",
// // 		connectors: [],
// // 		status: "up",
// // 	}));

// // 	return [...mappedSwitches, ...mappedHosts];
// // };

// // const mapFloodlightNodes = (rawData) => {
// // 	const switches = rawData?.switches || [];
// // 	const devices = rawData?.devices || [];

// // 	const mappedSwitches = switches.map((sw) => ({
// // 		id: sw.switchDPID,
// // 		type: "Switch",
// // 		connectors: [],
// // 		status: "up",
// // 	}));

// // 	const mappedHosts = devices.map((dev) => {
// // 		const mac = dev.mac?.[0] || "N/A";
// // 		return {
// // 			id: `host:${mac}`,
// // 			type: "Host",
// // 			connectors: [],
// // 			status: "up",
// // 		};
// // 	});

// // 	return [...mappedSwitches, ...mappedHosts];
// // };

// // export const mapNodes = (rawData) => {
// // 	if (rawData && rawData.controller === "onos") {
// // 		return mapOnosNodes(rawData);
// // 	}
// // 	if (rawData && rawData.controller === "floodlight") {
// // 		return mapFloodlightNodes(rawData);
// // 	}
// // 	return mapOdlNodes(rawData);
// // };





























// import { toMbps, formatDuration } from "../utils/helper";

// // (Keep your ODL and ONOS mappers here as they were)

// const mapFloodlightNodeDetails = (rawData) => {
// 	const desc = rawData.desc || {};
// 	const ports = rawData.ports || [];
// 	const flows = rawData.flows || [];

// 	const connectors = ports.map((p) => ({
// 		id: `${rawData.id}/${p.portNumber || p.port}`,
// 		name: p.portNumber || p.port,
// 		portNumber: p.portNumber || p.port,
// 		mac: p.hardwareAddress || "N/A",
// 		packetStats: {
// 			tx: p.transmitPackets ?? 0,
// 			rx: p.receivePackets ?? 0,
// 		},
// 		state: { live: true },
// 	}));

// 	// FIX: Ensure flows is always extracted correctly from the rawData
// 	const flowsList = Array.isArray(flows) ? flows : (flows.flows || []);

// 	const flowTables = [{
// 		id: 0,
// 		stats: { activeFlows: flowsList.length },
// 		flows: flowsList.map((f, idx) => ({
// 			id: f.cookie || `flow-${idx}`,
// 			priority: f.priority || 0,
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
// 			hardware: desc.hardware || "N/A",
// 			description: desc.datapath || "N/A",
// 		},
// 		connectors,
// 		flowTables,
// 	};
// };

// export const mapNodeDetails = (rawData) => {
// 	if (rawData && rawData.controller === "floodlight") {
// 		return mapFloodlightNodeDetails(rawData);
// 	}
//     // (Existing ODL logic)
// 	return mapOdlNodeDetails(rawData);
// };


























// // import { toMbps, formatDuration } from "../utils/helper";

// // // export const mapNodes = (rawData) => {
// // // 	const nodes = rawData?.["network-topology"]?.topology?.[0]?.node || [];

// // // 	return nodes.map((node) => ({
// // // 		id: node["node-id"],
// // // 		type: node["host-tracker-service:addresses"] ? "host" : "switch",
// // // 		addresses: node["host-tracker-service:addresses"] || [],
// // // 		terminationPoints: node["termination-point"] || [],
// // // 	}));
// // // };

// // export const mapNodeConnectors = (connectors = []) => {
// // 	console.log(connectors);
// // 	return connectors.map((conn) => {
// // 		const stats =
// // 			conn[
// // 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// // 			] || {};
// // 		const state = conn["flow-node-inventory:state"] || {};

// // 		return {
// // 			id: conn.id,
// // 			name: conn["flow-node-inventory:name"],
// // 			portNumber: conn["flow-node-inventory:port-number"],
// // 			mac: conn["flow-node-inventory:hardware-address"],
// // 			currentSpeedMbps: toMbps(
// // 				conn["flow-node-inventory:current-speed"] || 0
// // 			),
// // 			maxSpeedMbps: toMbps(
// // 				conn["flow-node-inventory:maximum-speed"] || 0
// // 			),
// // 			currentFeature: conn["flow-node-inventory:current-feature"],
// // 			state: {
// // 				linkDown: state["link-down"],
// // 				blocked: state["blocked"],
// // 				live: state["live"],
// // 			},
// // 			stpStatus:
// // 				conn["stp-status-aware-node-connector:status"] || "unknown",
// // 			packetStats: {
// // 				tx: stats.packets?.transmitted ?? 0,
// // 				rx: stats.packets?.received ?? 0,
// // 				txBytes: stats.bytes?.transmitted ?? 0,
// // 				rxBytes: stats.bytes?.received ?? 0,
// // 			},
// // 			uptime: formatDuration(stats.duration),
// // 		};
// // 	});
// // };

// // export const mapNodes = (rawData) => {
// // 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// // 	return nodes.map((node) => {
// // 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// // 		// Determine overall node status (based on its connectors)
// // 		let status = "unknown";
// // 		const allDown = connectors.every((c) => c.state.linkDown);
// // 		const anyLive = connectors.some(
// // 			(c) => c.state.live && !c.state.blocked
// // 		);
// // 		const anyBlocked = connectors.some((c) => c.state.blocked);

// // 		if (allDown) status = "down";
// // 		else if (anyLive) status = "up";
// // 		else if (anyBlocked) status = "blocked";
 
// // 		const id = node.id;
// // 		const type = id.startsWith("host:") ? "Host" : "Switch";
// // 		return {
// // 			id: node.id,
// // 			type,
// // 			connectors,
// // 			status,
// // 		};
// // 	});
// // };


// import { toMbps, formatDuration } from "../utils/helper";

// export const mapNodeConnectors = (connectors = []) => {
// 	return connectors.map((conn) => {
// 		const stats =
// 			conn[
// 				"opendaylight-port-statistics:flow-capable-node-connector-statistics"
// 			] || {};
// 		const state = conn["flow-node-inventory:state"] || {};

// 		return {
// 			id: conn.id,
// 			name: conn["flow-node-inventory:name"],
// 			portNumber: conn["flow-node-inventory:port-number"],
// 			mac: conn["flow-node-inventory:hardware-address"],
// 			currentSpeedMbps: toMbps(
// 				conn["flow-node-inventory:current-speed"] || 0
// 			),
// 			maxSpeedMbps: toMbps(
// 				conn["flow-node-inventory:maximum-speed"] || 0
// 			),
// 			currentFeature: conn["flow-node-inventory:current-feature"],
// 			state: {
// 				linkDown: state["link-down"],
// 				blocked: state["blocked"],
// 				live: state["live"],
// 			},
// 			stpStatus:
// 				conn["stp-status-aware-node-connector:status"] || "unknown",
// 			packetStats: {
// 				tx: stats.packets?.transmitted ?? 0,
// 				rx: stats.packets?.received ?? 0,
// 				txBytes: stats.bytes?.transmitted ?? 0,
// 				rxBytes: stats.bytes?.received ?? 0,
// 			},
// 			uptime: formatDuration(stats.duration),
// 		};
// 	});
// };

// const mapOdlNodes = (rawData) => {
// 	const nodes = rawData["opendaylight-inventory:nodes"]?.node || [];

// 	return nodes.map((node) => {
// 		const connectors = mapNodeConnectors(node["node-connector"] || []);

// 		let status = "unknown";
// 		const allDown = connectors.every((c) => c.state.linkDown);
// 		const anyLive = connectors.some(
// 			(c) => c.state.live && !c.state.blocked
// 		);
// 		const anyBlocked = connectors.some((c) => c.state.blocked);

// 		if (allDown) status = "down";
// 		else if (anyLive) status = "up";
// 		else if (anyBlocked) status = "blocked";
 
// 		const id = node.id;
// 		const type = id.startsWith("host:") ? "Host" : "Switch";
// 		return {
// 			id: node.id,
// 			type,
// 			connectors,
// 			status,
// 		};
// 	});
// };

// /**
//  * ADAPTER: Maps raw ONOS ports array into standard DTO connector layout
//  */
// const mapOnosPortsToConnectors = (deviceId, ports = []) => {
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
// 		stpStatus: "unknown",
// 		packetStats: {
// 			tx: 0,
// 			rx: 0,
// 			txBytes: 0,
// 			rxBytes: 0,
// 		},
// 		uptime: "N/A",
// 	}));
// };

// /**
//  * Switchboard Mapper (Adapter Pattern)
//  */
// const mapOnosNodes = (rawData) => {
// 	const devices = rawData?.devices || [];
// 	const hosts = rawData?.hosts || [];

// 	const mappedSwitches = devices.map((dev) => {
// 		// Map the newly fetched dev.ports array using our ONOS port mapper
// 		const connectors = mapOnosPortsToConnectors(dev.id, dev.ports || []);

// 		return {
// 			id: dev.id,
// 			type: "Switch",
// 			connectors,
// 			status: dev.available ? "up" : "down",
// 		};
// 	});

// 	const mappedHosts = hosts.map((host) => ({
// 		id: `host:${host.mac}`,
// 		type: "Host",
// 		connectors: [],
// 		status: "up",
// 	}));

// 	return [...mappedSwitches, ...mappedHosts];
// };

// export const mapNodes = (rawData) => {
// 	if (rawData && rawData.controller === "onos") {
// 		return mapOnosNodes(rawData);
// 	}
// 	return mapOdlNodes(rawData);
// };

// /**
//  * ADAPTER: Maps raw Floodlight switch and host lists to standard DTO structure
//  */
// const mapFloodlightNodes = (rawData) => {
// 	const switches = rawData?.switches || [];
// 	const devices = rawData?.devices || [];

// 	const mappedSwitches = switches.map((sw) => ({
// 		id: sw.switchDPID,
// 		type: "Switch",
// 		connectors: [], // Individual connectors are populated on Detail view
// 		status: "up",
// 	}));

// 	const mappedHosts = devices.map((dev) => {
// 		const mac = dev.mac?.[0] || "N/A";
// 		return {
// 			id: `host:${mac}`,
// 			type: "Host",
// 			connectors: [],
// 			status: "up",
// 		};
// 	});

// 	return [...mappedSwitches, ...mappedHosts];
// };

// // Update your main switchboard export to include Floodlight:
// export const mapNodes = (rawData) => {
// 	if (rawData && rawData.controller === "onos") {
// 		return mapOnosNodes(rawData);
// 	}
// 	if (rawData && rawData.controller === "floodlight") {
// 		return mapFloodlightNodes(rawData);
// 	}
// 	return mapOdlNodes(rawData);
// };














import { toMbps, formatDuration } from "../utils/helper";

/**
 * Utility to handle ODL 23 namespacing variations
 */
const getSafe = (obj, key) => {
    return obj?.[key] || 
           obj?.[`flow-node-inventory:${key}`] || 
           obj?.[`opendaylight-inventory:${key}`] || 
           obj?.[`opendaylight-port-statistics:${key}`];
};

/**
 * Maps raw port data to a clean UI object
 */
export const mapNodeConnectors = (connectors = []) => {
    return connectors.map((conn) => {
        const stats = conn["opendaylight-port-statistics:flow-capable-node-connector-statistics"] || 
                      conn["flow-capable-node-connector-statistics"] || {};
        
        const state = getSafe(conn, "state") || {};

        return {
            id: conn.id,
            name: getSafe(conn, "name") || conn.id,
            portNumber: getSafe(conn, "port-number"),
            mac: getSafe(conn, "hardware-address") || "N/A",
            currentSpeedMbps: toMbps(getSafe(conn, "current-speed") || 0),
            state: {
                linkDown: state["link-down"] === true || state["link-down"] === "true",
                blocked: state["blocked"] || false,
                live: state["live"] || true,
            },
            packetStats: {
                tx: stats.packets?.transmitted ?? 0,
                rx: stats.packets?.received ?? 0,
            },
            uptime: formatDuration(stats.duration || { second: 0 }),
        };
    });
};

/**
 * Maps raw ODL inventory nodes (Switches) to UI objects
 */
export const mapNodes = (rawData) => {
    if (!rawData) return [];
    
    // Handle different ODL wrapping levels
    const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || 
                  rawData?.node || 
                  rawData?.nodes?.node || [];

    return nodes.map((node) => {
        const rawConns = getSafe(node, "node-connector") || [];
        const connectors = mapNodeConnectors(rawConns);

        // Determine switch status based on port states
        let status = "UP";
        if (connectors.length > 0 && connectors.every((c) => c.state.linkDown)) {
            status = "DOWN";
        }
 
        const id = node.id || "";
        
        return {
            id,
            type: id.startsWith("host:") ? "Host" : "Switch",
            connectors,
            status,
            flowTables: getSafe(node, "table") || [],
            // Add metadata for the UI table
            portCount: connectors.length,
            manufacturer: getSafe(node, "manufacturer") || "Generic SDN"
        };
    });
};

/**
 * Generic export used by some components to identify device types
 */
export const extractDevices = (rawData) => {
    return mapNodes(rawData);
};