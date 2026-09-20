import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  GitBranch,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Clock,
  Activity,
  FileCode,
  X
} from "lucide-react";
import {
  getInventoryNodes,
  getNodeTables,
  getFlows,
  getConfigFlows,
  deleteFlow,
  putFlow,
} from "../api/flowService";

function MessageBanner({ message, clearMessage }) {
  if (!message) return null;

  let errorList = [];
  let isOdlError = false;
  let rawJson = null;

  if (typeof message === "string" && (message.trim().startsWith("{") || message.trim().startsWith("["))) {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.errors?.error) {
        errorList = Array.isArray(parsed.errors.error) ? parsed.errors.error : [parsed.errors.error];
        isOdlError = true;
      } else {
        rawJson = parsed;
      }
    } catch {
      // Treat as plain string
    }
  } else if (typeof message === "object") {
    if (message?.errors?.error) {
      errorList = Array.isArray(message.errors.error) ? message.errors.error : [message.errors.error];
      isOdlError = true;
    } else {
      rawJson = message;
    }
  }

  const isSuccess =
    !isOdlError &&
    !rawJson &&
    !String(message).toLowerCase().includes("fail") &&
    !String(message).toLowerCase().includes("error") &&
    !String(message).toLowerCase().includes("unable");

  const bg = isSuccess ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300" : "bg-red-950/40 border-red-800/60 text-red-300";

  return (
    <div className={`p-4 rounded-xl border flex flex-col gap-2 shadow-lg backdrop-blur-md ${bg}`}>
      <div className="flex justify-between items-center">
        <span className="font-semibold text-xs uppercase tracking-wider flex items-center gap-2">
          {isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {isSuccess ? "Operation Successful" : "Configuration Alert"}
        </span>
        {clearMessage && (
          <button
            type="button"
            onClick={clearMessage}
            className="text-zinc-400 hover:text-zinc-100 text-sm p-1 rounded hover:bg-white/10 transition"
          >
            ✕
          </button>
        )}
      </div>

      {isOdlError ? (
        <div className="flex flex-col gap-2 mt-1">
          {errorList.map((err, idx) => (
            <div key={idx} className="bg-black/30 rounded-lg p-3 border-l-4 border-red-500 text-xs">
              {err["error-type"] && (
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  Type: {err["error-type"]} · Tag: {err["error-tag"]}
                </div>
              )}
              <div className="font-medium text-zinc-100">
                {err["error-message"] || "An unexpected error occurred in SDN controller."}
              </div>
              {err["error-info"] && (
                <div className="text-[11px] font-mono text-zinc-400 mt-1">
                  {err["error-info"]}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : rawJson ? (
        <pre className="p-3 bg-black/40 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
          {JSON.stringify(rawJson, null, 2)}
        </pre>
      ) : (
        <div className="text-xs font-medium">{message}</div>
      )}
    </div>
  );
}

const emptyForm = {
  flowId: "",
  priority: 1000,
  etherType: "2048",
  actionType: "output",
  outputNodeConnector: "1",
  idleTimeout: "",
  hardTimeout: "",
};

function extractFlowArray(rawFlows) {
  if (!rawFlows) return [];
  if (Array.isArray(rawFlows)) return rawFlows;
  if (rawFlows["flow-node-inventory:table"] && Array.isArray(rawFlows["flow-node-inventory:table"])) {
    const table = rawFlows["flow-node-inventory:table"][0];
    if (table && Array.isArray(table.flow)) return table.flow;
  }
  if (rawFlows.flow && Array.isArray(rawFlows.flow)) return rawFlows.flow;
  if (rawFlows.flows && Array.isArray(rawFlows.flows)) return rawFlows.flows;
  return [];
}

function summarizeMatch(match) {
  if (!match) return "Any (wildcard)";
  if (typeof match === "string") return match;
  if (Array.isArray(match)) return match.map((item) => JSON.stringify(item)).join(", ");

  const parts = [];
  if (match["ethernet-match"]?.["ethernet-type"]?.type) {
    const et = match["ethernet-match"]["ethernet-type"].type;
    const name = et === 2048 ? "IPv4 (2048)" : et === 2054 ? "ARP (2054)" : et === 34525 ? "IPv6 (34525)" : et;
    parts.push(`EthType: ${name}`);
  }
  if (match["ipv4-source"]) parts.push(`SrcIP: ${match["ipv4-source"]}`);
  if (match["ipv4-destination"]) parts.push(`DstIP: ${match["ipv4-destination"]}`);
  if (match["in-port"]) parts.push(`InPort: ${match["in-port"]}`);

  if (parts.length > 0) return parts.join(" · ");
  return Object.entries(match)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
    .join("; ");
}

function summarizeInstructions(instructions) {
  if (!instructions) return "Drop / Default";
  if (typeof instructions === "string") return instructions;

  const instructionList = Array.isArray(instructions.instruction)
    ? instructions.instruction
    : Array.isArray(instructions)
    ? instructions
    : [];

  const actions = [];
  instructionList.forEach((inst) => {
    const applyActions = inst["apply-actions"]?.action || [];
    applyActions.forEach((act) => {
      if (act["output-action"]) {
        actions.push(`Output -> Port ${act["output-action"]["output-node-connector"]}`);
      } else if (act["drop-action"]) {
        actions.push("Drop Packet");
      } else if (act["controller-action"]) {
        actions.push("Forward to Controller");
      }
    });
  });

  if (actions.length > 0) return actions.join(", ");
  return instructionList
    .slice(0, 2)
    .map((item) => (item?.["apply-actions"] ? "Apply Actions" : JSON.stringify(item)))
    .join(", ");
}

export default function Flows() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("0");

  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Modal State for Creating / Editing Flow Rules
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // 1. Load Inventory Nodes
  useEffect(() => {
    let mounted = true;
    const loadNodes = async () => {
      try {
        const inventoryNodes = await getInventoryNodes();
        if (!mounted) return;
        setNodes(inventoryNodes || []);
        const firstNode = inventoryNodes?.[0]?.id || inventoryNodes?.[0]?.["id"] || "";
        if (firstNode) setSelectedNode(firstNode);
      } catch (error) {
        if (mounted) setMessage(error.message || "Unable to load switch nodes.");
      }
    };
    loadNodes();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load Tables for Selected Node
  useEffect(() => {
    if (!selectedNode) return;
    let mounted = true;
    const loadTables = async () => {
      try {
        const tableList = await getNodeTables(selectedNode);
        if (!mounted) return;
        const normalized = (tableList || [])
          .map((table) => ({
            id: String(table.id ?? table["id"] ?? table["flow-node-inventory:table-id"] ?? "0"),
            data: table,
          }))
          .sort((a, b) => Number(a.id) - Number(b.id));

        setTables(normalized.length ? normalized : [{ id: "0" }]);
        if (normalized.length) {
          setSelectedTable((current) =>
            normalized.some((t) => t.id === current) ? current : normalized[0].id
          );
        } else {
          setSelectedTable("0");
        }
      } catch (error) {
        if (mounted) setMessage(error.message || "Unable to load flow tables.");
      }
    };
    loadTables();
    return () => {
      mounted = false;
    };
  }, [selectedNode]);

  // 3. Load Flows with Live Telemetry & Config definitions
  const loadFlows = useCallback(async () => {
    if (!selectedNode || selectedTable === "" || selectedTable === undefined) {
      setFlows([]);
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const [rawConfig, rawOperational] = await Promise.all([
        getConfigFlows(selectedNode, selectedTable).catch(() => []),
        getFlows(selectedNode, selectedTable).catch(() => []),
      ]);

      const configArray = extractFlowArray(rawConfig);
      const opArray = extractFlowArray(rawOperational);

      // Operational statistics map
      const opStatsMap = new Map();
      opArray.forEach((flow) => {
        const id = String(flow.id || flow["flow-id"] || "");
        if (id) {
          const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
          const dur = stats.duration || {};
          opStatsMap.set(id, {
            packets: stats["packet-count"] ?? stats.packetCount ?? flow.packets ?? 0,
            bytes: stats["byte-count"] ?? stats.byteCount ?? flow.bytes ?? 0,
            duration: dur.second !== undefined ? `${dur.second}s` : flow.life ? `${flow.life}s` : null,
          });
        }
      });

      // Use config flows if available, or fall back to operational flows
      const primaryArray = configArray.length > 0 ? configArray : opArray;

      const parsedFlows = primaryArray.map((flow, index) => {
        const id = String(flow.id || flow["flow-id"] || `flow-${index + 1}`);
        const opStat = opStatsMap.get(id);

        const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
        const dur = stats.duration || {};
        const packets = opStat?.packets ?? stats["packet-count"] ?? stats.packetCount ?? flow.packets ?? 0;
        const bytes = opStat?.bytes ?? stats["byte-count"] ?? stats.byteCount ?? flow.bytes ?? 0;
        const duration = opStat?.duration ?? (dur.second !== undefined ? `${dur.second}s` : flow.life ? `${flow.life}s` : "-");

        return {
          id,
          priority: flow.priority ?? flow["priority"] ?? 0,
          match: summarizeMatch(flow.match),
          instructions: summarizeInstructions(flow.instructions),
          idleTimeout: flow["idle-timeout"] ?? flow.idleTimeout ?? "-",
          hardTimeout: flow["hard-timeout"] ?? flow.hardTimeout ?? "-",
          packets,
          bytes,
          duration,
          raw: flow,
        };
      });

      setFlows(parsedFlows);
    } catch (error) {
      setMessage(error.message || "Failed to load flow rules for this switch.");
    } finally {
      setLoading(false);
    }
  }, [selectedNode, selectedTable]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  // Modal Handlers
  const openCreateModal = () => {
    setEditingFlow(null);
    setFormData({ ...emptyForm, flowId: `flow-${Date.now().toString().slice(-4)}` });
    setIsModalOpen(true);
  };

  const openEditModal = (flow) => {
    setEditingFlow(flow);
    const ethMatch = flow.raw?.match?.["ethernet-match"]?.["ethernet-type"]?.type;
    const instructionList = flow.raw?.instructions?.instruction || [];
    const firstInstruction = instructionList[0] || {};
    const firstAction = firstInstruction?.["apply-actions"]?.action?.[0] || {};
    const actionType = firstAction["drop-action"]
      ? "drop"
      : firstAction["output-action"]
      ? "output"
      : "output";
    const outputNodeConnector = firstAction["output-action"]?.["output-node-connector"] || "1";

    setFormData({
      flowId: flow.id,
      priority: flow.priority ?? 1000,
      etherType: ethMatch !== undefined ? String(ethMatch) : "2048",
      actionType,
      outputNodeConnector,
      idleTimeout: flow.idleTimeout === "-" ? "" : flow.idleTimeout,
      hardTimeout: flow.hardTimeout === "-" ? "" : flow.hardTimeout,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFlow(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (flow) => {
    if (!window.confirm(`Delete flow rule '${flow.id}' from switch ${selectedNode}?`)) return;
    try {
      setMessage(`Deleting flow rule ${flow.id}…`);
      await deleteFlow(selectedNode, selectedTable, flow.id);
      setFlows((current) => current.filter((c) => c.id !== flow.id));
      setMessage(`✓ Deleted flow rule '${flow.id}' successfully.`);
      loadFlows();
    } catch (error) {
      setMessage(error.message || `Failed to delete flow ${flow.id}.`);
    }
  };

  // Build RESTCONF Payload
  const buildOdlPayload = useCallback(() => {
    const normalizedTableId = Number(selectedTable || 0);
    return {
      "flow-node-inventory:flow": [
        {
          id: String(formData.flowId || ""),
          priority: Number(formData.priority || 0),
          table_id: normalizedTableId,
          match: {
            "ethernet-match": {
              "ethernet-type": {
                type: Number(formData.etherType || 2048),
              },
            },
          },
          instructions: {
            instruction: [
              {
                order: 0,
                "apply-actions": {
                  action: [
                    {
                      order: 0,
                      ...(formData.actionType === "output"
                        ? {
                            "output-action": {
                              "output-node-connector": String(formData.outputNodeConnector || "1"),
                            },
                          }
                        : { "drop-action": {} }),
                    },
                  ],
                },
              },
            ],
          },
          ...(formData.idleTimeout ? { "idle-timeout": Number(formData.idleTimeout) } : {}),
          ...(formData.hardTimeout ? { "hard-timeout": Number(formData.hardTimeout) } : {}),
        },
      ],
    };
  }, [formData, selectedTable]);

  const handleSubmit = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (!formData.flowId) {
      alert("Please provide a Flow ID.");
      return;
    }

    try {
      const flowBody = buildOdlPayload();
      setMessage("Submitting flow rule configuration to SDN controller…");
      await putFlow(selectedNode, selectedTable || "0", formData.flowId, flowBody);
      closeModal();
      setMessage(
        editingFlow
          ? `✓ Updated flow rule '${formData.flowId}' successfully.`
          : `✓ Created and installed flow rule '${formData.flowId}' successfully.`
      );
      loadFlows();
    } catch (error) {
      setMessage(error.message || "Failed to save flow rule.");
    }
  };

  const jsonPreview = useMemo(() => {
    try {
      return JSON.stringify(buildOdlPayload(), null, 2);
    } catch {
      return "Unable to format JSON";
    }
  }, [buildOdlPayload]);

  const selectedNodeLabel = useMemo(() => {
    const node = nodes.find((candidate) => candidate.id === selectedNode || candidate["id"] === selectedNode);
    return node?.id || node?.["id"] || selectedNode;
  }, [nodes, selectedNode]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header & Create Action ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
                Flow Rules Manager
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect active forwarding rules, monitor live traffic counters, and create or modify flow configurations.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition duration-150 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create Config Flow</span>
        </button>
      </div>

      {/* ── Switch & Table Selector Bar ────────────────────────────────────────── */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Target Switch / Node
            </span>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-indigo-500 min-w-[280px]"
            >
              {nodes.map((n) => {
                const id = n.id || n["id"];
                const label = n.type ? `${id} (${n.type})` : id;
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Flow Table ID
            </span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-indigo-500 min-w-[130px]"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-zinc-300">
              Switch: <span className="font-mono text-indigo-400">{selectedNodeLabel}</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Active Table: <span className="font-mono text-zinc-300">{selectedTable}</span>
            </div>
          </div>
          <button
            onClick={loadFlows}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Refresh Flows from Controller"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Status / Message Banner ────────────────────────────────────────── */}
      <MessageBanner message={message} clearMessage={() => setMessage("")} />

      {/* ── UNIFIED FLOWS TABLE (EDITABLE + TELEMETRY) ──────────────────────── */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3 bg-zinc-950/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">
                Active Flow Rules
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Full CRUD & Live Counters
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Flow rules configured on switch <strong className="text-zinc-200">{selectedNodeLabel}</strong> (Table {selectedTable}). Click <strong>Edit</strong> or <strong>Delete</strong> to modify network forwarding behavior.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Total Flow Rules: <strong className="text-zinc-100">{flows.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-zinc-500 text-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Retrieving flow entries and traffic counters…</span>
          </div>
        ) : flows.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <FileCode className="w-10 h-10 text-zinc-600" />
            <div className="text-sm font-semibold text-zinc-300">
              No Flow Rules Found
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              There are no flow entries in Table {selectedTable} for switch <span className="font-mono text-zinc-400">{selectedNode}</span>. Click below to add a new flow rule.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Flow Rule</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="px-5 py-3.5">Flow ID</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Match Criteria</th>
                  <th className="px-5 py-3.5">Action / Instructions</th>
                  <th className="px-5 py-3.5">Live Traffic</th>
                  <th className="px-5 py-3.5">Timeouts</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                {flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {flow.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 font-mono text-indigo-300 font-bold">
                        {flow.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300">
                      {flow.match}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40 text-zinc-200">
                        {flow.instructions}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      <div className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        {Number(flow.packets).toLocaleString()} pkts
                      </div>
                      <div className="text-zinc-400 text-[10px] mt-0.5">
                        {Number(flow.bytes).toLocaleString()} B
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                      <div>Idle: {flow.idleTimeout}s</div>
                      <div className="mt-0.5">Hard: {flow.hardTimeout}s</div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(flow)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition text-xs font-semibold cursor-pointer"
                          title="Edit Flow Rule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(flow)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 transition text-xs font-semibold cursor-pointer"
                          title="Delete Flow Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-base text-zinc-100">
                  {editingFlow ? `Modify Flow Rule (${formData.flowId})` : "Create & Install Flow Rule"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Flow ID
                  <input
                    required
                    disabled={!!editingFlow}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    value={formData.flowId}
                    onChange={(e) => setFormData((cur) => ({ ...cur, flowId: e.target.value }))}
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Priority (0 - 65535)
                  <input
                    type="number"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={formData.priority}
                    onChange={(e) => setFormData((cur) => ({ ...cur, priority: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Ethernet Match
                  <select
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={formData.etherType}
                    onChange={(e) => setFormData((cur) => ({ ...cur, etherType: e.target.value }))}
                  >
                    <option value="2048">IPv4 Traffic (2048)</option>
                    <option value="2054">ARP Requests (2054)</option>
                    <option value="34525">IPv6 Traffic (34525)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Action Block
                  <select
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={formData.actionType}
                    onChange={(e) => setFormData((cur) => ({ ...cur, actionType: e.target.value }))}
                  >
                    <option value="output">Output to Port</option>
                    <option value="drop">Drop Action</option>
                  </select>
                </label>
              </div>

              {formData.actionType === "output" && (
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Destination Port Connector
                  <input
                    type="text"
                    placeholder="e.g. 1, 2, NORMAL, CONTROLLER"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
                    value={formData.outputNodeConnector}
                    onChange={(e) => setFormData((cur) => ({ ...cur, outputNodeConnector: e.target.value }))}
                  />
                </label>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Idle Timeout (Seconds)
                  <input
                    type="number"
                    placeholder="0 (Unlimited)"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={formData.idleTimeout}
                    onChange={(e) => setFormData((cur) => ({ ...cur, idleTimeout: e.target.value }))}
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-300">
                  Hard Timeout (Seconds)
                  <input
                    type="number"
                    placeholder="0 (Unlimited)"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                    value={formData.hardTimeout}
                    onChange={(e) => setFormData((cur) => ({ ...cur, hardTimeout: e.target.value }))}
                  />
                </label>
              </div>

              {/* JSON Preview */}
              <div className="space-y-1 pt-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  RESTCONF JSON Payload Preview
                </span>
                <pre className="p-3 bg-black/60 border border-zinc-800/80 rounded-xl text-[10px] font-mono text-zinc-300 max-h-36 overflow-y-auto">
                  {jsonPreview}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {editingFlow ? "Update Flow Rule" : "Save & Install Flow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
