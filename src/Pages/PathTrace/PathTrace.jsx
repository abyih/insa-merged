import React, { useEffect, useState, useCallback } from "react";
import NetworkTopologySvc from "../Topology/TopologyService";
import TopologySimple from "../Topology/TopologySimple";
import { getNodeTables } from "../../api/flowService";
import { tracePath } from "./pathTraceEngine";
import { Route, ArrowRight, Network, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

function StatusBadge({ status }) {
  const styles = {
    forwarded: "bg-emerald-950 text-emerald-400 border-emerald-800/80",
    flooding: "bg-amber-950 text-amber-400 border-amber-800/80",
    "sent-to-controller": "bg-indigo-950 text-indigo-400 border-indigo-800/80",
    dropped: "bg-red-950 text-red-400 border-red-800/80",
    "no-matching-flow": "bg-zinc-800 text-zinc-300 border-zinc-700",
    "loop-detected": "bg-red-950 text-red-400 border-red-800/80",
    "error-fetching-flows": "bg-red-950 text-red-400 border-red-800/80",
  };
  const labels = {
    forwarded: "Forwarded",
    flooding: "Flooding / Broadcast",
    "sent-to-controller": "Sent to Controller",
    dropped: "Dropped",
    "no-matching-flow": "Unknown / Flood",
    "loop-detected": "Loop Detected",
    "error-fetching-flows": "Flow Fetch Error",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || "bg-zinc-800 text-zinc-300 border-zinc-700"}`}>
      {labels[status] || status}
    </span>
  );
}

function PathTrace() {
  const [topologyData, setTopologyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [srcHost, setSrcHost] = useState("");
  const [dstHost, setDstHost] = useState("");
  const [tracing, setTracing] = useState(false);
  const [result, setResult] = useState(null);
  const [traceError, setTraceError] = useState("");

  const loadTopology = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await NetworkTopologySvc.getNode("flow:1");
      setTopologyData(data);
    } catch (err) {
      setError(err.message || "Failed to load topology");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTopology(); }, [loadTopology]);

  const hostOptions = (topologyData?.nodes || []).filter((n) => n.group === "host" || n.group === "vm");

  const handleTrace = async () => {
    if (!srcHost || !dstHost) return;
    setTracing(true);
    setTraceError("");
    setResult(null);
    try {
      const traceResult = await tracePath(topologyData, srcHost, dstHost, getNodeTables);
      setResult(traceResult);
    } catch (err) {
      setTraceError(err.message || "Failed to trace path.");
    } finally {
      setTracing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
            <Route className="w-6 h-6 text-indigo-400" />
            End-to-End Hop Path Trace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pick a source and destination endpoint to simulate hop-by-hop forwarding and inspect flow rule matches.
          </p>
        </div>
        <button
          onClick={loadTopology}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload Topology
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-sm">Resolving network topology & active switches…</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Controls Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Source Endpoint
                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  value={srcHost}
                  onChange={(e) => setSrcHost(e.target.value)}
                >
                  <option value="">Select source…</option>
                  {hostOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label || h.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Destination Endpoint
                <select
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  value={dstHost}
                  onChange={(e) => setDstHost(e.target.value)}
                >
                  <option value="">Select destination…</option>
                  {hostOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.label || h.id}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <button
                  onClick={handleTrace}
                  disabled={!srcHost || !dstHost || tracing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {tracing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Computing Trace…
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Trace Path
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {traceError && (
            <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{traceError}</span>
            </div>
          )}

          {/* Results Table */}
          {result && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Hop Sequence Breakdown ({result.hops?.length || 0} Hops)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Switch / Node</th>
                      <th className="px-6 py-3.5">In Port</th>
                      <th className="px-6 py-3.5">Out Port</th>
                      <th className="px-6 py-3.5">Matched Flow Rule</th>
                      <th className="px-6 py-3.5">Table</th>
                      <th className="px-6 py-3.5">Forwarding Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                    {result.hops.map((hop, i) => (
                      <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-zinc-100">{hop.switchId}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-zinc-400">{hop.inPort ?? "—"}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-indigo-400">{hop.outPort ?? "—"}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-zinc-300 max-w-xs break-all">{hop.flowId ?? "—"}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-zinc-400">{hop.tableId ?? "—"}</td>
                        <td className="px-6 py-3.5"><StatusBadge status={hop.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Topology Canvas with Active Trace Highlight */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              Path Visualizer Map
            </h3>
            <TopologySimple topologyData={topologyData} onReload={loadTopology} externalPath={result?.pathNodeIds} />
          </div>
        </>
      )}
    </div>
  );
}

export default PathTrace;
