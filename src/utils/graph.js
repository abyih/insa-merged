// ─────────────────────────────────────────────────────────────────────────────
// graph.js — shortest-path helpers over the topology-mapper link shape
// ({ from, to }, undirected), used to highlight which physical nodes/links
// a logical slice actually traverses.
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdjacency(links = []) {
  const adj = {};
  links.forEach(({ from, to }) => {
    if (!from || !to) return;
    (adj[from] ??= new Set()).add(to);
    (adj[to] ??= new Set()).add(from);
  });
  return adj;
}

export function shortestPath(adj, start, end) {
  if (start === end) return [start];
  if (!adj[start] || !adj[end]) return null;

  const visited = new Set([start]);
  const queue = [[start]];

  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];
    for (const neighbor of adj[node] || []) {
      if (neighbor === end) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

const edgeKey = (a, b) => [a, b].sort().join("|");

// Given a slice (as produced by NetworkSlicing.jsx) and the topology's
// { from, to } link list, returns the set of node IDs and edge keys that
// make up the slice's logical footprint on the physical network.
// Resolves a raw host node (unified topology shape — same for ODL and the
// translated ONOS shape) to the switch:port it's actually attached to right
// now, from host-tracker attachment-points — never guessed from naming.
export function resolveHostAttachment(hostNode) {
  const tpId = hostNode?.["host-tracker-service:attachment-points"]?.[0]?.["tp-id"];
  if (!tpId) return null;
  const parts = tpId.split(":");
  return { switchId: `${parts[0]}:${parts[1]}`, port: parts[2] };
}

// Reverse of resolveHostAttachment: given a switch id, finds every host in
// the discovered topology currently attached to it. Used by the Anomaly
// Detector to turn a switch-level detection into a host identity — real
// topology data, never guessed from naming or assumed 1:1.
export function resolveSwitchHosts(switchId, nodesById = {}) {
  const hosts = [];
  for (const node of Object.values(nodesById)) {
    const nodeId = node?.["node-id"];
    if (!nodeId || !nodeId.startsWith("host:")) continue;
    const attach = resolveHostAttachment(node);
    if (attach && attach.switchId === switchId) {
      hosts.push({ hostId: nodeId, port: attach.port });
    }
  }
  return hosts;
}

export function computeSliceFootprint(slice, links = []) {
  const adj = buildAdjacency(links);
  const nodeIds = new Set();
  const edgeKeys = new Set();

  const addPath = (path) => {
    if (!path) return;
    path.forEach((n) => nodeIds.add(n));
    for (let i = 0; i < path.length - 1; i++) {
      edgeKeys.add(edgeKey(path[i], path[i + 1]));
    }
  };

  const endpoints = (slice.targets || [])
    .map((t) => t.hostId || t.targetSwitch)
    .filter(Boolean);

  endpoints.forEach((id) => nodeIds.add(id));

  if (slice.type === "link" && endpoints.length === 2) {
    addPath(shortestPath(adj, endpoints[0], endpoints[1]));
  } else {
    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        addPath(shortestPath(adj, endpoints[i], endpoints[j]));
      }
    }
  }

  return { nodeIds, edgeKeys, hasEdgeKey: (a, b) => edgeKeys.has(edgeKey(a, b)) };
}
