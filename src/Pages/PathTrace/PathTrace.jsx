// ─────────────────────────────────────────────────────────────────────────────
// PathTrace.jsx — "how does traffic from this host reach that host?"
//
// Everything here goes through controllerManager, never a specific adapter,
// so it works unmodified against ODL or ONOS (topology + path computation).
// The one place that isn't controller-symmetric is flow correlation (§8 of
// the spec this was built from): ODL's flow tables are real and verified;
// ONOS's aren't wired up yet (see onosController.getFlows) and the UI says
// so honestly instead of guessing.
//
// The computed path is always "derived from current topology" — slices in
// this app don't store a dedicated physical path (host-isolation is a set of
// per-port policies, not a stored route), so a slice selection here overlays
// flow-correlation onto the same topology-derived path rather than claiming
// the slice owns a separate one.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { DataSet } from "vis-data";
import { Network } from "vis-network";
import {
  Route, Server, Laptop, ArrowDown, RefreshCw, Search,
  CheckCircle2, XCircle, AlertTriangle, Waypoints, Map,
} from "lucide-react";
import * as controllerManager from "../../api/controllerManager";
import { extractDeviceData } from "../../mappers/topology-mapper";
import { buildAdjacency, shortestPath, resolveHostAttachment } from "../../utils/graph";
import { useSlices } from "../../pipeline/SliceContext";

const isHostId = (id) => (id || "").startsWith("host:");

// Port lookup for intermediate switch hops, built from the raw topology's
// link list (source-tp/dest-tp carry the port as their last segment — true
// for both ODL's native shape and ONOS's translated one, see
// onosController.getTopology). Host-facing ports go through
// resolveHostAttachment instead, since a host isn't represented as a
// symmetric link entry the same way two switches are.
function buildPortLookup(rawLinks = []) {
  const portOf = {};
  rawLinks.forEach((l) => {
    const srcNode = l.source?.["source-node"];
    const srcTp = l.source?.["source-tp"];
    const dstNode = l.destination?.["dest-node"];
    const dstTp = l.destination?.["dest-tp"];
    if (!srcNode || !dstNode) return;
    if (srcTp) (portOf[srcNode] ??= {})[dstNode] = srcTp.split(":").pop();
    if (dstTp) (portOf[dstNode] ??= {})[srcNode] = dstTp.split(":").pop();
  });
  return portOf;
}

// For each switch in the path, the port facing the previous hop (input) and
// the port facing the next hop (output) — N/A when it can't be determined
// rather than guessed.
function computeHopPorts(path, nodesById, portLookup) {
  return path
    .filter((id) => !isHostId(id))
    .map((switchId) => {
      const idx = path.indexOf(switchId);
      const prev = path[idx - 1];
      const next = path[idx + 1];
      const portTowards = (neighbor) => {
        if (!neighbor) return null;
        if (isHostId(neighbor)) {
          const attach = resolveHostAttachment(nodesById[neighbor]);
          return attach && attach.switchId === switchId ? attach.port : null;
        }
        return portLookup[switchId]?.[neighbor] ?? null;
      };
      return { switchId, inputPort: portTowards(prev), outputPort: portTowards(next) };
    });
}

function unwrapTopology(raw) {
  return raw?.["network-topology:network-topology"]?.topology?.[0]
    || raw?.topology?.[0]
    || { node: [], link: [] };
}

function shortLabel(id) {
  return (id || "").split(":").pop();
}

// Hosts are identified by MAC in the raw topology (e.g. host:00:...:01) —
// shortLabel() alone renders that as a bare "01", which sits confusingly
// next to a switch labeled "1". Prefer the host's IP wherever we have one.
function pathLabel(id, hostOptions) {
  if (isHostId(id)) {
    const h = hostOptions.find((h) => h.id === id);
    return h?.ip || shortLabel(id);
  }
  return shortLabel(id);
}

function summarizeMatch(match) {
  if (!match) return "Match not available";
  const parts = [];
  const inPort = match["flow-node-inventory:in-port"] || match["in-port"];
  if (inPort) parts.push(`in-port ${inPort}`);
  if (match["ip-match"]?.["ip-protocol"] != null) {
    const proto = { 1: "ICMP", 6: "TCP", 17: "UDP" }[match["ip-match"]["ip-protocol"]] || `proto ${match["ip-match"]["ip-protocol"]}`;
    parts.push(proto);
  }
  if (match["tcp-destination-port"]) parts.push(`dst port ${match["tcp-destination-port"]}`);
  if (match["udp-destination-port"]) parts.push(`dst port ${match["udp-destination-port"]}`);
  if (match["ip-match"]?.["ip-dscp"] != null) parts.push(`DSCP ${match["ip-match"]["ip-dscp"]}`);
  return parts.length ? parts.join(" · ") : "All traffic";
}

function summarizeAction(instructions) {
  const list = instructions?.instruction || [];
  const applyActions = list.find((i) => i["apply-actions"])?.["apply-actions"]?.action || [];
  const hasMeter = list.some((i) => i.meter);
  if (applyActions.some((a) => a["drop-action"])) return hasMeter ? "DROP (metered)" : "DROP";
  const output = applyActions.find((a) => a["output-action"]);
  const queued = applyActions.some((a) => a["set-queue-action"]);
  if (output) {
    const dest = output["output-action"]["output-node-connector"];
    return `${queued ? "Queued → " : ""}Output → ${dest}${hasMeter ? " (metered)" : ""}`;
  }
  return "Action not available";
}

const StatusPill = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${ok ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
    {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{label}
  </span>
);

const HopCard = ({ kind, highlighted, label, sub }) => (
  <div className={`flex items-center gap-4 w-full max-w-sm rounded-2xl border-2 px-5 py-4 transition-all ${highlighted ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white border-slate-200 text-slate-700"}`}>
    <div className={`p-2.5 rounded-xl ${highlighted ? "bg-white/15" : "bg-slate-50"}`}>
      {kind === "host" ? <Laptop size={18} /> : <Server size={18} />}
    </div>
    <div className="min-w-0">
      <p className={`text-[9px] font-black uppercase tracking-widest ${highlighted ? "text-blue-100" : "text-slate-400"}`}>{kind === "host" ? "Host" : "Switch"}</p>
      <p className="font-bold text-sm truncate">{label}</p>
      {sub && <p className={`text-[10px] font-mono truncate ${highlighted ? "text-blue-100" : "text-slate-400"}`}>{sub}</p>}
    </div>
  </div>
);

const PathTrace = () => {
  const { slices } = useSlices();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nodesById, setNodesById] = useState({});
  const [links, setLinks] = useState([]);
  const [graphNodes, setGraphNodes] = useState([]);
  const [portLookup, setPortLookup] = useState({});
  const [hostOptions, setHostOptions] = useState([]);
  const [switchOptions, setSwitchOptions] = useState([]);
  const graphContainerRef = useRef(null);
  const graphNetworkRef = useRef(null);

  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [sliceId, setSliceId] = useState("");

  const [tracing, setTracing] = useState(false);
  const [result, setResult] = useState(null);

  const controller = controllerManager.getActiveController();
  const controllerLabel = controllerManager.CONTROLLERS[controller]?.label || controller;

  const refreshDiscovery = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await controllerManager.getTopology();
      const inner = unwrapTopology(raw);
      const byId = {};
      (inner.node || []).forEach((n) => { byId[n["node-id"]] = n; });
      setNodesById(byId);
      setPortLookup(buildPortLookup(inner.link || []));

      const { nodes: extractedNodes, links: extractedLinks } = extractDeviceData(inner);
      setLinks(extractedLinks);
      setGraphNodes(extractedNodes);

      const hosts = (inner.node || [])
        .filter((n) => isHostId(n["node-id"]))
        .map((n) => ({
          id: n["node-id"],
          ip: n["host-tracker-service:addresses"]?.[0]?.ip || null,
          mac: n["host-tracker-service:addresses"]?.[0]?.mac || shortLabel(n["node-id"]),
        }))
        .sort((a, b) => (a.ip || a.mac).localeCompare(b.ip || b.mac));
      setHostOptions(hosts);

      const switches = (inner.node || [])
        .filter((n) => !isHostId(n["node-id"]))
        .map((n) => ({ id: n["node-id"], label: shortLabel(n["node-id"]) }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      setSwitchOptions(switches);
    } catch (err) {
      setError(err.message || "Failed to load topology");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshDiscovery(); }, [controller]);

  // Arriving from a slice's "Trace Path" button (NetworkSlicing.jsx) —
  // pre-fill once discovery has actually finished, so the IDs match real
  // <option> values instead of racing the initial load.
  useEffect(() => {
    if (loading || !location.state) return;
    const { sliceId: incomingSliceId, sourceId: incomingSource, destId: incomingDest } = location.state;
    if (incomingSliceId != null) setSliceId(String(incomingSliceId));
    if (incomingSource) setSourceId(incomingSource);
    if (incomingDest) setDestId(incomingDest);
    window.history.replaceState({}, document.title);
  }, [loading, location.state]);

  const selectedSlice = useMemo(
    () => slices.find((s) => String(s.id) === sliceId) || null,
    [slices, sliceId]
  );

  const handleTrace = async () => {
    setResult(null);
    if (!sourceId || !destId) return setResult({ found: false, reason: "Select both a source and destination." });
    if (sourceId === destId) return setResult({ found: false, reason: "Source and destination must be different nodes." });

    setTracing(true);
    try {
      const adj = buildAdjacency(links);
      const path = shortestPath(adj, sourceId, destId);

      if (!path) {
        setResult({ found: false, reason: "No path exists between these nodes in the current topology." });
        return;
      }

      const hopSwitches = path.filter((id) => !isHostId(id));
      // Only meaningful for host endpoints — a switch endpoint isn't
      // "attached" to anything, it's a node in the graph itself.
      const srcAttach = isHostId(sourceId) ? resolveHostAttachment(nodesById[sourceId]) : null;
      const dstAttach = isHostId(destId) ? resolveHostAttachment(nodesById[destId]) : null;
      const hopPorts = computeHopPorts(path, nodesById, portLookup);
      const portsBySwitch = Object.fromEntries(hopPorts.map((p) => [p.switchId, p]));

      let flowCorrelation = { status: "no-slice" };
      if (selectedSlice) {
        if (controller !== "odl") {
          flowCorrelation = { status: "unavailable", reason: "Flow correlation isn't implemented for ONOS yet — the physical path above is still accurate." };
        } else {
          const perSwitch = await Promise.all(
            hopSwitches.map(async (switchId) => {
              const { flows } = await controllerManager.getFlows(switchId);
              const match = (flows || []).find((f) => f.id === selectedSlice.name);
              return { switchId, matched: !!match, flow: match || null, ports: portsBySwitch[switchId] || null };
            })
          );
          flowCorrelation = { status: "checked", perSwitch };
        }
      }

      setResult({
        found: true,
        path,
        hopSwitches,
        hopPorts,
        hops: path.length - 1,
        srcAttach,
        dstAttach,
        flowCorrelation,
      });
    } catch (err) {
      setResult({ found: false, reason: err.message || "Trace failed." });
    } finally {
      setTracing(false);
    }
  };

  // Full physical map, styled so the traced route stands out — same
  // dim-everything-else-and-highlight-the-members approach TopologySimple.jsx
  // uses for slice views, so this reads as "the same map" rather than a
  // separate, differently-styled visualization.
  useEffect(() => {
    if (!graphContainerRef.current || graphNodes.length === 0) return;

    const pathSet = result?.found ? new Set(result.path) : null;
    const isPathEdge = (from, to) => {
      if (!pathSet || !result?.found) return false;
      const idx = result.path.indexOf(from);
      if (idx === -1) return false;
      return result.path[idx + 1] === to || result.path[idx - 1] === to;
    };

    const styledNodes = graphNodes.map((n) => {
      const onPath = pathSet?.has(n.id);
      return onPath
        ? { ...n, opacity: 1, borderWidth: 4, color: { border: "#2563eb" } }
        : { ...n, opacity: pathSet ? 0.18 : 1, borderWidth: 1 };
    });
    const styledEdges = links.map((l, i) => {
      const onPath = isPathEdge(l.from, l.to);
      return onPath
        ? { ...l, id: `pt-e${i}`, color: { color: "#2563eb", opacity: 1 }, width: 5, arrows: { to: { enabled: true, scaleFactor: 0.6 } } }
        : { ...l, id: `pt-e${i}`, color: { color: "#cbd5e1", opacity: pathSet ? 0.12 : 1 }, width: pathSet ? 1 : 2 };
    });

    const network = new Network(
      graphContainerRef.current,
      { nodes: new DataSet(styledNodes), edges: new DataSet(styledEdges) },
      {
        width: "100%", height: "420px",
        nodes: { size: 30, shadow: true, font: { color: "#334155", size: 11, face: "Inter" } },
        edges: { length: 200, smooth: { type: "continuous" } },
        groups: {
          switch: { shape: "image", image: "/assets/images/Device_switch_3062_unknown_64.png" },
          host: { shape: "image", image: "/assets/images/Device_pc_3045_default_64.png" },
        },
        physics: { enabled: true, barnesHut: { gravitationalConstant: -8000 } },
        interaction: { hover: true },
      }
    );
    graphNetworkRef.current = network;
    return () => network.destroy();
  }, [graphNodes, links, result]);

  const hostLabel = (id) => {
    const h = hostOptions.find((h) => h.id === id);
    if (!h) return shortLabel(id);
    return h.ip ? `${h.ip} (${h.mac})` : h.mac;
  };

  // Generic node label/type for the summary panel — works for either a host
  // (source/destination now aren't host-only) or a switch endpoint.
  const nodeLabel = (id) => (isHostId(id) ? hostLabel(id) : shortLabel(id));
  const nodeType = (id) => (isHostId(id) ? "Host" : "Switch");

  const NodeSelect = ({ value, onChange, label }) => (
    <div>
      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">{label}</label>
      <select value={value} onChange={onChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500">
        <option value="">Select node…</option>
        <optgroup label="Hosts">
          {hostOptions.map((h) => <option key={h.id} value={h.id}>{h.ip ? `${h.ip} (${h.mac})` : h.mac}</option>)}
        </optgroup>
        <optgroup label="Switches">
          {switchOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </optgroup>
      </select>
    </div>
  );

  return (
    <div className="p-6 sm:p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900 flex items-center gap-3">
            <Route className="text-blue-600" size={32} /> Path Trace
          </h1>
          <p className="text-slate-500 font-medium mt-2 max-w-xl">
            How does traffic from one host actually reach another — and, if a slice is selected, is that slice's policy really programmed along the way.
          </p>
        </div>
        <button onClick={refreshDiscovery} className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Discovery
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-5 py-3 rounded-2xl text-sm font-bold">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* CONTROLS */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <NodeSelect value={sourceId} onChange={(e) => setSourceId(e.target.value)} label="Source (Host or Switch)" />
          <NodeSelect value={destId} onChange={(e) => setDestId(e.target.value)} label="Destination (Host or Switch)" />
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Slice (optional)</label>
            <select value={sliceId} onChange={(e) => setSliceId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500">
              <option value="">All Slices</option>
              {slices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Controller</label>
            <div className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between">
              {controllerLabel}
              <span className="text-[9px] font-black uppercase text-slate-400">Active</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleTrace}
          disabled={loading || tracing}
          className="mt-6 w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-3"
        >
          <Search size={18} className={tracing ? "animate-spin" : ""} /> Trace Path
        </button>
      </div>

      {/* RESULT: NOT FOUND */}
      {result && !result.found && (
        <div className="bg-white rounded-[2rem] border border-red-100 shadow-sm p-8 flex items-center gap-4">
          <XCircle className="text-red-500 flex-shrink-0" size={28} />
          <div>
            <p className="font-black uppercase text-red-600 text-sm">No Path Found</p>
            <p className="text-slate-500 text-sm mt-1">{result.reason}</p>
          </div>
        </div>
      )}

      {/* RESULT: FOUND */}
      {result?.found && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SUMMARY PANEL */}
          <div className="lg:col-span-4">
            <div className="bg-[#1e293b] rounded-[2rem] p-8 text-white shadow-xl sticky top-24">
              <h2 className="font-black uppercase text-[11px] tracking-[0.2em] mb-6 flex items-center gap-2 text-blue-400">
                <Waypoints size={16} /> Path Trace Summary
              </h2>
              <dl className="space-y-4 text-sm">
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Source</dt><dd className="font-mono">{nodeLabel(sourceId)} <span className="text-slate-500">— {nodeType(sourceId)}</span></dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Destination</dt><dd className="font-mono">{nodeLabel(destId)} <span className="text-slate-500">— {nodeType(destId)}</span></dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Slice</dt><dd>{selectedSlice ? selectedSlice.name : "None selected"}</dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Controller</dt><dd>{controllerLabel}</dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Path Source</dt><dd className="text-blue-300">Topology-derived</dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Hops</dt><dd>{result.hops}</dd></div>
                <div>
                  <dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Path</dt>
                  <dd className="font-mono text-blue-200 text-xs leading-relaxed break-words">{result.path.map((id) => pathLabel(id, hostOptions)).join(" → ")}</dd>
                </div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Status</dt><dd><StatusPill ok label="PATH FOUND" /></dd></div>
                <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Switches</dt><dd className="font-mono text-xs">{result.hopSwitches.length ? result.hopSwitches.map(shortLabel).join(", ") : "None (same switch)"}</dd></div>
                {isHostId(sourceId) && (
                  <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Source Attachment</dt><dd className="font-mono text-xs">{result.srcAttach ? `${shortLabel(result.srcAttach.switchId)} · port ${result.srcAttach.port}` : "Not available"}</dd></div>
                )}
                {isHostId(destId) && (
                  <div><dt className="text-[9px] font-black uppercase text-slate-500 mb-1">Destination Attachment</dt><dd className="font-mono text-xs">{result.dstAttach ? `${shortLabel(result.dstAttach.switchId)} · port ${result.dstAttach.port}` : "Not available"}</dd></div>
                )}
              </dl>

              {selectedSlice && (
                <p className="mt-6 pt-5 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
                  Path derived from current topology/flow information — this slice does not store a dedicated physical path; the highlighted route is the shared physical path, checked below for this slice's actual flow presence.
                </p>
              )}
            </div>
          </div>

          {/* VISUALIZATION + FLOW CORRELATION */}
          <div className="lg:col-span-8 space-y-8">
            {/* GRAPHICAL PATH TRACE — the traced route highlighted on the real network map */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em] mb-2 flex items-center gap-2">
                <Map size={14} className="text-blue-500" /> Network Map — Route Highlighted
              </h2>
              <p className="text-xs text-slate-400 font-medium mb-4">
                Full physical topology; the highlighted blue route is this trace, everything else dimmed for context.
              </p>
              <div ref={graphContainerRef} className="bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner" style={{ height: "420px" }} />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em]">
                  {selectedSlice ? `${selectedSlice.name} — Path Overlay` : "Physical Path"}
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mb-6">
                Physical: {result.path.map((id) => pathLabel(id, hostOptions)).join(" ─ ")}
              </p>
              <div className="flex flex-col items-center gap-0">
                {result.path.map((id, i) => {
                  const ports = result.hopPorts.find((p) => p.switchId === id);
                  const portsSub = ports
                    ? `IN: ${ports.inputPort ?? "N/A"} · OUT: ${ports.outputPort ?? "N/A"}`
                    : null;
                  return (
                    <React.Fragment key={id}>
                      <HopCard
                        kind={isHostId(id) ? "host" : "switch"}
                        highlighted
                        label={pathLabel(id, hostOptions)}
                        sub={isHostId(id) ? shortLabel(id) : portsSub}
                      />
                      {i < result.path.length - 1 && (
                        <div className="py-1"><ArrowDown className="text-blue-300" size={20} /></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-6 text-center max-w-md mx-auto">
                Every hop shown here sits on the same shared physical network as every other slice — the highlight marks this trace's route, it isn't a separate dedicated network.
              </p>
            </div>

            {/* FLOW CORRELATION */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em] mb-6">Flow Correlation</h2>

              {result.flowCorrelation.status === "no-slice" && (
                <p className="text-sm text-slate-400 italic">Select a slice above to check whether its flows are actually installed along this path.</p>
              )}
              {result.flowCorrelation.status === "unavailable" && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 px-5 py-4 rounded-2xl text-sm">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <div>
                    <p className="font-black uppercase text-xs">Flow correlation unavailable</p>
                    <p className="text-xs mt-1 opacity-80">{result.flowCorrelation.reason}</p>
                  </div>
                </div>
              )}
              {result.flowCorrelation.status === "checked" && (
                <div className="space-y-3">
                  {result.flowCorrelation.perSwitch.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Source and destination share a switch — no intermediate hops to check.</p>
                  )}
                  {result.flowCorrelation.perSwitch.map(({ switchId, matched, flow, ports }) => (
                    <div key={switchId} className={`rounded-2xl border p-5 ${matched ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-black text-slate-800 text-sm">{shortLabel(switchId)}</p>
                        <StatusPill ok={matched} label={matched ? "Flow Programmed" : "No Slice Flow (Transit Hop)"} />
                      </div>
                      <p className="text-xs font-mono text-slate-500 mb-2">
                        Input Port: {ports?.inputPort ?? "N/A"} · Output Port: {ports?.outputPort ?? "N/A"}
                      </p>
                      {matched ? (
                        <div className="text-xs font-mono text-slate-600 space-y-1">
                          <p><span className="text-slate-400">Match:</span> {summarizeMatch(flow.match)}</p>
                          <p><span className="text-slate-400">Action:</span> {summarizeAction(flow.instructions)}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No flow named "{selectedSlice.name}" exists on this switch — traffic here isn't governed by a slice-specific rule.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathTrace;
