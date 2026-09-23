import React, { useEffect, useState } from "react";
import { Monitor, Network, Cpu, Layers, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function VmTopologyMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMapping();
  }, []);

  async function fetchMapping() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/openstack/vm-topology-map");
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to load topology mapping");
    } finally {
      setLoading(false);
    }
  }

  const ctrlName = data?.controllerName || (data?.controllerType === "onos" ? "ONOS" : "OpenDaylight");

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            VM ↔ Network Topology Map
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cross-correlates identity across OpenStack (Nova / Neutron), OVS TAP interfaces, and {ctrlName} (br-int).
          </p>
        </div>
        <button
          onClick={fetchMapping}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-16 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-sm">Querying OpenStack compute nodes and {ctrlName} bridge inventory…</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 shadow-sm">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Active {ctrlName} Bridge Node:</span>
            <span className="font-mono text-zinc-200 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              {data.brIntNodeId || "ovsdb:1/bridge/br-int"}
            </span>
          </div>

          <div className="grid gap-4">
            {(data.mapping || []).map((row) => {
              const isVisible = row.controllerVisible ?? row.odlVisible;
              const connectorId = row.controllerNodeConnectorId || row.odlNodeConnectorId;

              return (
                <div
                  key={row.vmId}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          row.vmStatus === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-indigo-400" />
                        {row.vmName}
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        {row.vmId}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isVisible
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800/80"
                          : "bg-red-950 text-red-400 border-red-800/80"
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Visible in {ctrlName}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          Not in {ctrlName}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Nova / IP Address</span>
                      <span className="text-zinc-200 font-semibold text-sm">{row.ipAddress || "—"}</span>
                      <span className="text-zinc-400 font-mono text-[11px]">{row.macAddress}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Neutron Port UUID</span>
                      <span className="text-zinc-300 font-mono break-all bg-zinc-950 p-1 rounded border border-zinc-800">
                        {row.neutronPortId || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">OVS Interface</span>
                      <span className="text-zinc-300 font-mono text-sm bg-zinc-950 px-2 py-1 rounded border border-zinc-800 w-fit">
                        {row.ovsInterface || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">{ctrlName} Node-Connector</span>
                      <span className="text-zinc-300 font-mono break-all bg-zinc-950 p-1 rounded border border-zinc-800">
                        {connectorId || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Visual Correlation Flow */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-medium">Nova Instance</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="px-2.5 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-medium">Neutron Port</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="px-2.5 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 font-medium">OVS Tap/Port</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                    <span
                      className={`px-2.5 py-1 rounded font-medium border ${
                        isVisible
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                          : "bg-red-950/60 text-red-300 border-red-800/60"
                      }`}
                    >
                      {ctrlName} Inventory ({isVisible ? "Linked" : "Unmapped"})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {data.mapping && data.mapping.length === 0 && (
            <div className="text-center text-zinc-500 py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
              No active OpenStack virtual machines found.
            </div>
          )}
        </>
      )}
    </div>
  );
}
