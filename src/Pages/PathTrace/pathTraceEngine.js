export function buildPortNeighborMap(links) {
  const portMap = {};
  const adjacency = {};
  links.forEach(({ from, to, srcPort, dstPort }) => {
    if (srcPort) portMap[srcPort] = { neighborId: to, neighborPort: String(dstPort).split(":").pop() };
    if (dstPort) portMap[dstPort] = { neighborId: from, neighborPort: String(srcPort).split(":").pop() };
    if (!adjacency[from]) adjacency[from] = [];
    if (!adjacency[to]) adjacency[to] = [];
    adjacency[from].push(to);
    adjacency[to].push(from);
  });
  return { portMap, adjacency };
}

export function bfsPath(adjacency, start, end) {
  if (start === end) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    for (const neighbor of adjacency[node] || []) {
      if (neighbor === end) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

export function findHostAttachment(links, hostId) {
  for (const link of links) {
    if (link.from === hostId) return { switchId: link.to, port: String(link.dstPort).split(":").pop() };
    if (link.to === hostId) return { switchId: link.from, port: String(link.srcPort).split(":").pop() };
  }
  return null;
}

function flowMatches(flow, { inPort, dstMac }) {
  const match = flow.match;
  if (!match) return true; // table-miss / catch-all
  if (match["in-port"] !== undefined && String(match["in-port"]) !== String(inPort)) return false;
  if (match["ethernet-match"]?.["ethernet-type"] !== undefined) return false; // ignore LLDP/control-plane flows
  if (match["ethernet-match"]?.["ethernet-destination"]?.address) {
    if (!dstMac || match["ethernet-match"]["ethernet-destination"].address.toLowerCase() !== dstMac.toLowerCase()) return false;
  }
  if (match["ipv4-destination"] && !dstMac) return false; // dstIp not wired up yet, be conservative
  const known = ["in-port", "ethernet-match", "ipv4-destination"];
  if (Object.keys(match).some((k) => !known.includes(k))) return false; // unknown/unsupported match field, don't claim it
  return true;
}

function extractActions(flow) {
  const list = flow.instructions?.instruction || [];
  for (const instr of list) {
    if (instr["apply-actions"]?.action) return { type: "apply-actions", actions: instr["apply-actions"].action, gotoTable: null };
    if (instr["go-to-table"]) return { type: "goto-table", actions: [], gotoTable: instr["go-to-table"]["table_id"] };
  }
  return { type: "none", actions: [], gotoTable: null };
}

function matchFlowInTables(tables, tableId, context) {
  const table = tables.find((t) => t.id === tableId);
  const flows = table?.flow || [];
  const sorted = [...flows].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const flow of sorted) if (flowMatches(flow, context)) return flow;
  return null;
}

export async function tracePath(topologyData, srcHostId, dstHostId, fetchTables) {
  const { links, nodes } = topologyData;
  const { portMap, adjacency } = buildPortNeighborMap(links);

  const srcAttach = findHostAttachment(links, srcHostId);
  const dstAttach = findHostAttachment(links, dstHostId);
  if (!srcAttach || !dstAttach) throw new Error("Could not resolve host attachment point(s) in topology.");

  const dstHostNode = nodes.find((n) => n.id === dstHostId);
  const dstMac = dstHostNode?.title?.match(/MAC: <b>([0-9a-f:]+)/i)?.[1] || null;

  const hops = [];
  const pathNodeIds = [srcHostId, srcAttach.switchId];
  let currentSwitch = srcAttach.switchId;
  let currentInPort = srcAttach.port;
  const visited = new Set();
  const MAX_HOPS = 20;

  while (hops.length < MAX_HOPS) {
    if (visited.has(currentSwitch)) {
      hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort: null, flowId: null, tableId: null, status: "loop-detected" });
      break;
    }
    visited.add(currentSwitch);

    let tables;
    try {
      tables = await fetchTables(currentSwitch);
    } catch {
      hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort: null, flowId: null, tableId: null, status: "error-fetching-flows" });
      break;
    }

    let tableId = 0, matched = null, safety = 0;
    while (safety++ < 20) {
      const flow = matchFlowInTables(tables, tableId, { inPort: currentInPort, dstMac });
      if (!flow) { matched = null; break; }
      const { type, actions, gotoTable } = extractActions(flow);
      if (type === "goto-table") { tableId = gotoTable; continue; }
      matched = { flow, actions, tableId };
      break;
    }

    if (!matched) {
      hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort: null, flowId: null, tableId, status: "no-matching-flow" });
      break;
    }

    const { flow, actions, tableId: matchedTableId } = matched;
    const outputActions = actions.filter((a) => a["output-action"]);
    const hasDrop = actions.some((a) => a["drop-action"]);

    if (outputActions.length === 0 || hasDrop) {
      hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort: null, flowId: flow.id, tableId: matchedTableId, status: "dropped" });
      break;
    }

    const controllerOnly = outputActions.every((a) => a["output-action"]["output-node-connector"] === "CONTROLLER");
    if (controllerOnly) {
      hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort: "CONTROLLER", flowId: flow.id, tableId: matchedTableId, status: "sent-to-controller" });
      break;
    }

    const realOutputs = outputActions.map((a) => a["output-action"]["output-node-connector"]).filter((p) => p !== "CONTROLLER");
    let outPort, status;

    if (realOutputs.length === 1) {
      outPort = realOutputs[0];
      status = "forwarded";
    } else {
      const targetForBfs = dstAttach.switchId === currentSwitch ? dstHostId : dstAttach.switchId;
      const bfs = bfsPath(adjacency, currentSwitch, targetForBfs);
      const nextHopId = bfs && bfs.length > 1 ? bfs[1] : null;
      const candidate = realOutputs.find((port) => portMap[`${currentSwitch}:${port}`]?.neighborId === nextHopId);
      outPort = candidate || realOutputs[0];
      status = "flooding";
    }

    hops.push({ switchId: currentSwitch, inPort: currentInPort, outPort, flowId: flow.id, tableId: matchedTableId, status });

    const nextHopInfo = portMap[`${currentSwitch}:${outPort}`];
    if (!nextHopInfo) break;
    if (nextHopInfo.neighborId === dstHostId) { pathNodeIds.push(dstHostId); break; }

    pathNodeIds.push(nextHopInfo.neighborId);
    currentSwitch = nextHopInfo.neighborId;
    currentInPort = nextHopInfo.neighborPort;
  }

  return { hops, pathNodeIds };
}
