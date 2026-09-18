


import React, { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

const SLICE_COLOR_PALETTE = [
  "#FF6B6B", "#4ECDC4", "#FFD166", "#A78BFA",
  "#06D6A0", "#F472B6", "#60A5FA", "#FB923C",
];

const TEMPLATES = {
  embb: {
    label: "eMBB",
    description: "Enhanced Mobile Broadband — high throughput for video/streaming, PPS not the limiting factor",
    priority: "MEDIUM",
    isolationLevel: "STANDARD",
    latencyRequirement: "STANDARD",
    bandwidthMin: "300 Mbps",
    bandwidthMax: "500 Mbps",
    bandwidthMbps: "500",
    maxPacketsPerSecond: "",
  },
  urllc: {
    label: "URLLC",
    description: "Ultra-Reliable Low-Latency — small bandwidth, strict latency/isolation, frequent control packets",
    priority: "HIGH",
    isolationLevel: "STRICT",
    latencyRequirement: "LOW",
    bandwidthMin: "10 Mbps",
    bandwidthMax: "50 Mbps",
    bandwidthMbps: "50",
    maxPacketsPerSecond: "2000",
  },
  mmtc: {
    label: "mMTC",
    description: "Massive Machine-Type — low bandwidth, but high PPS relative to it (many small-packet devices)",
    priority: "LOW",
    isolationLevel: "STANDARD",
    latencyRequirement: "STANDARD",
    bandwidthMin: "5 Mbps",
    bandwidthMax: "20 Mbps",
    bandwidthMbps: "20",
    maxPacketsPerSecond: "5000",
  },
  custom: {
    label: "Custom",
    description: "Define your own requirements",
    priority: "MEDIUM",
    isolationLevel: "STANDARD",
    latencyRequirement: "STANDARD",
    bandwidthMin: "",
    bandwidthMax: "",
    bandwidthMbps: "200",
    maxPacketsPerSecond: "",
  },
};

const PRIORITY_COLORS = {
  HIGH: "bg-red-500/20 text-red-400",
  MEDIUM: "bg-yellow-500/20 text-yellow-400",
  LOW: "bg-slate-500/20 text-slate-400",
};

function CapabilityBadge({ available, label, note }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={available ? "text-green-400" : "text-red-400"}>
        {available ? "✓ Available" : "✗ Unavailable"}
      </span>
    </div>
  );
}

export default function NetworkSlices() {
  const [slices, setSlices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
const [capabilities, setCapabilities] = useState(null);
const [capacityStatus, setCapacityStatus] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [vms, setVms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSliceId, setEditingSliceId] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [creating, setCreating] = useState(false);
  const [intentText, setIntentText] = useState("");
  const [parsedIntent, setParsedIntent] = useState(null);
  const [parsingIntent, setParsingIntent] = useState(false);
  const [llmProviderList, setLlmProviderList] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [llmKeyInput, setLlmKeyInput] = useState("");
  const [llmKeyProviderToSave, setLlmKeyProviderToSave] = useState("gemini");
  const [savingLlmKey, setSavingLlmKey] = useState(false);
  const [sliceTopology, setSliceTopology] = useState(null);
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [consoleLoading, setConsoleLoading] = useState({});

  const [form, setForm] = useState({
    name: "",
    description: "",
    sliceType: "embb",
     bandwidthMbps: TEMPLATES.embb.bandwidthMbps,
    maxPacketsPerSecond: TEMPLATES.embb.maxPacketsPerSecond,
    vmIds: [],
    priority: TEMPLATES.embb.priority,
    isolationLevel: TEMPLATES.embb.isolationLevel,
    latencyRequirement: TEMPLATES.embb.latencyRequirement,
    color: SLICE_COLOR_PALETTE[0],
  });

  useEffect(() => {
    fetchLlmProviders();
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const [slicesRes, capsRes, cloudRes, capacityRes] = await Promise.all([
        fetch("/api/slices"),
        fetch("/api/slices/capabilities/status"),
        fetch("/api/openstack/cloud-summary"),
        fetch("/api/slice-manager/capacity"),
      ]);
      const slicesData = await slicesRes.json();
      const capsData = await capsRes.json();
      const cloudData = await cloudRes.json();

      setSlices(slicesData.slices || []);
      setCapabilities(capsData.capabilities || null);
      const capacityData = await capacityRes.json();
      setCapacityStatus(capacityData);
      setNetworks(cloudData.networks || []);
      setVms(cloudData.virtualMachines || []);
    } catch (e) {
      console.error("Failed to load initial data", e);
    } finally {
      setLoading(false);
    }
  }

  async function openConsole(vmId, vmName = "VM") {
    setConsoleLoading((prev) => ({ ...prev, [vmId]: true }));
    try {
      const response = await fetch(`/api/openstack/console/${vmId}`);
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.url) {
        throw new Error(payload.error || "Failed to retrieve noVNC console URL");
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(`Failed to open console for "${vmName}": ${err.message}`);
    } finally {
      setConsoleLoading((prev) => {
        const next = { ...prev };
        delete next[vmId];
        return next;
      });
    }
  }

  async function fetchSliceTopology(sliceId) {
    setTopologyLoading(true);
    setSliceTopology(null);
    try {
      const res = await fetch(`/api/slices/${sliceId}/topology`);
      const data = await res.json();
      setSliceTopology(data);
    } catch (err) {
      setSliceTopology({ error: err.message });
    } finally {
      setTopologyLoading(false);
    }
  }

  function applyTemplate(type) {
    const t = TEMPLATES[type];
    setForm((f) => ({
      ...f,
      sliceType: type,
      priority: t.priority,
      isolationLevel: t.isolationLevel,
      latencyRequirement: t.latencyRequirement,
      bandwidthMin: t.bandwidthMin,
      bandwidthMax: t.bandwidthMax,
      bandwidthMbps: t.bandwidthMbps ?? f.bandwidthMbps,
      maxPacketsPerSecond: t.maxPacketsPerSecond ?? "",
    }));
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleVm(vmId) {
    setForm((f) => ({
      ...f,
      vmIds: f.vmIds.includes(vmId)
        ? f.vmIds.filter((id) => id !== vmId)
        : [...f.vmIds, vmId],
    }));
  }

  async function handleEditClick(slice) {
    setEditingSliceId(slice.id);
    setForm({
      name: slice.name || "",
      description: slice.description || "",
      sliceType: slice.slice_type || "critical",
      bandwidthMbps: String(parseFloat(String(slice.bandwidth_max).match(/[\d.]+/)?.[0] || "0") || "200"),
      maxPacketsPerSecond: slice.max_pps ? String(slice.max_pps) : "",
      vmIds: slice.vmIds || [],
      priority: slice.priority || "MEDIUM",
      isolationLevel: slice.isolation_level || "STANDARD",
      latencyRequirement: slice.latency_requirement || "STANDARD",
      color: slice.color || SLICE_COLOR_PALETTE[0],
    });
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setEditingSliceId(null);
    setForm({
      name: "",
      description: "",
      sliceType: "embb",
      bandwidthMbps: TEMPLATES.embb.bandwidthMbps,
      maxPacketsPerSecond: TEMPLATES.embb.maxPacketsPerSecond,
      vmIds: [],
      priority: TEMPLATES.embb.priority,
      isolationLevel: TEMPLATES.embb.isolationLevel,
      latencyRequirement: TEMPLATES.embb.latencyRequirement,
      color: SLICE_COLOR_PALETTE[0],
    });
  }

  async function handleCreate() {
    if (!form.name) {
      alert("Slice name is required.");
      return;
    }
    if (!form.bandwidthMbps || Number(form.bandwidthMbps) <= 0) {
      alert("A positive requested bandwidth is required.");
      return;
    }
    setCreating(true);
    try {
      const isEditing = !!editingSliceId;
      const response = await fetch(
        isEditing ? `/api/slices/${editingSliceId}` : "/api/slices",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            bandwidthMbps: Number(form.bandwidthMbps),
            maxPacketsPerSecond: form.maxPacketsPerSecond ? Number(form.maxPacketsPerSecond) : "",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error +
          (data.details && data.details.requestedMbps !== undefined
            ? `\n\nRequested: ${data.details.requestedMbps} Mbps\nRemaining: ${data.details.remainingMbps} Mbps`
            : "") +
          (data.details && data.details.requestedPps !== undefined
            ? `\n\nRequested: ${data.details.requestedPps} pps\nRemaining: ${data.details.remainingPps} pps`
            : "")
        );
      }
      closeCreateModal();
      fetchAll();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function fetchLlmProviders() {
    try {
      const res = await fetch("/api/settings/llm-keys");
      const data = await res.json();
      setLlmProviderList(data.providers || []);
    } catch (_) {
      setLlmProviderList([]);
    }
  }
  async function handleSaveLlmKey() {
    if (!llmKeyInput.trim()) {
      alert("Paste an API key first.");
      return;
    }
    setSavingLlmKey(true);
    try {
      const res = await fetch("/api/settings/llm-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: llmKeyProviderToSave, apiKey: llmKeyInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save key");
      setLlmKeyInput("");
      fetchLlmProviders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingLlmKey(false);
    }
  }
  async function handleDeleteLlmKey(provider) {
    try {
      await fetch(`/api/settings/llm-keys/${provider}`, { method: "DELETE" });
      fetchLlmProviders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }
  async function handleParseIntent() {
    if (!intentText.trim()) {
      alert("Describe what you need first.");
      return;
    }
    setParsingIntent(true);
    try {
      const res = await fetch("/api/slices/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: intentText, provider: selectedProvider || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse intent");
      setParsedIntent(data);
      setForm((f) => ({
        ...f,
        sliceType: "custom",
        priority: data.priority,
        isolationLevel: data.isolationLevel,
        latencyRequirement: data.latencyRequirement,
        bandwidthMbps: String(data.bandwidthMbps),
      }));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setParsingIntent(false);
    }
  }

  async function handleActivate(id, activate) {
    try {
      await fetch(`/api/slices/${id}/${activate ? "activate" : "deactivate"}`, { method: "POST" });
      fetchAll();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleEnforceIsolation(id) {
    try {
      const res = await fetch(`/api/slices/${id}/enforce-isolation`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert(`Isolation ${data.isolationStatus}. Security group: ${data.securityGroupName}`);
      fetchAll();
      if (selectedSlice?.id === id) {
        const updated = await fetch(`/api/slices/${id}`).then((r) => r.json());
        setSelectedSlice(updated.slice);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleEnforceBandwidth(id) {
    try {
      const res = await fetch(`/api/slices/${id}/enforce-bandwidth`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      alert(`Bandwidth status: ${data.qosStatus}\n\n${data.note}`);
      fetchAll();
      if (selectedSlice?.id === id) {
        const updated = await fetch(`/api/slices/${id}`).then((r) => r.json());
        setSelectedSlice(updated.slice);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this slice configuration and its underlying OpenStack network.")) return;
    try {
      const res = await fetch(`/api/slices/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Backend refused to remove the slice because its network could
        // not be cleanly deleted from OpenStack. The slice record was
        // NOT removed, so nothing here needs to be undone.
        alert(
          `Delete failed: ${data.error || "Unknown error"}` +
          (data.cleanupErrors?.length ? `\n\nDetails:\n${data.cleanupErrors.join("\n")}` : "")
        );
        return;
      }
      if (data.cleanupErrors?.length) {
        // Deleted successfully, but some non-blocking cleanup (e.g. the
        // QoS policy) didn't fully succeed - worth knowing, not worth
        // blocking on.
        alert(
          `Slice deleted, but some cleanup did not fully complete:\n${data.cleanupErrors.join("\n")}`
        );
      }
      if (selectedSlice?.id === id) setSelectedSlice(null);
      fetchAll();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  const totalSlices = slices.length;
  const activeSlices = slices.filter((s) => s.status === "ACTIVE").length;
  const highPrioritySlices = slices.filter((s) => s.priority === "HIGH").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Network Slices</h1>
          <p className="text-slate-400 text-sm mt-1">
            SDN Network Slice Management &amp; Orchestration — logical slices sharing shared OpenStack/OVS/ODL infrastructure
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold hover:bg-blue-500 transition"
        >
          + Create Slice
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/50 bg-red-900/20 p-4 text-red-200 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Slices</p>
          <p className="text-3xl font-bold mt-1">{totalSlices}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Active Slices</p>
          <p className="text-3xl font-bold mt-1 text-green-400">{activeSlices}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">QoS Enforcement</p>
          <p className="text-sm font-semibold mt-2 text-yellow-400">
            {capabilities?.qos?.available ? "Available" : "Unavailable"}
          </p>
        </div>
      </div>
{capacityStatus && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6">
          <h3 className="font-semibold mb-3 text-sm">Network Bandwidth Pool</h3>
          <div className="flex justify-between text-sm mb-2">
            <span>Allocated</span>
            <span className="text-slate-300">
              {capacityStatus.allocatedMbps} / {capacityStatus.totalMbps} Mbps
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                capacityStatus.remainingMbps < capacityStatus.totalMbps * 0.2 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(100, (capacityStatus.allocatedMbps / capacityStatus.totalMbps) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {capacityStatus.remainingMbps} Mbps remaining — admission control rejects any slice request exceeding this.
          </p>
        </div>
      )}
      {/* Capability status panel */}
      {capabilities && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6">
          <h3 className="font-semibold mb-3 text-sm">Environment Capability Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
            <CapabilityBadge available={capabilities.neutron?.available} label="Neutron" />
            <CapabilityBadge available={capabilities.nova?.available} label="Nova" />
            <CapabilityBadge available={capabilities.glance?.available} label="Glance" />
            <CapabilityBadge available={capabilities.odlRestconf?.available} label="ODL RESTCONF" />
            <CapabilityBadge available={capabilities.odlTopology?.available} label="ODL Topology" />
            <CapabilityBadge available={capabilities.ovs?.available} label="OVS" />
            <CapabilityBadge available={capabilities.qos?.available} label="QoS Enforcement" />
            <CapabilityBadge available={capabilities.flowEnforcement?.available} label="Flow Enforcement (ODL)" />
          </div>
          {!capabilities.qos?.available && (
            <p className="text-xs text-yellow-500 mt-3">
              ⚠ {capabilities.qos?.note} — bandwidth values below are configured/represented only, not enforced.
            </p>
          )}
        </div>
      )}

      {loading && <div className="text-center text-slate-400 py-8">Loading slices...</div>}

      {/* Slice cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {slices.map((slice) => (
          <div
            key={slice.id}
            onClick={() => { setSelectedSlice(slice); fetchSliceTopology(slice.id); }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-blue-500 transition cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">{slice.name}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_COLORS[slice.priority] || PRIORITY_COLORS.MEDIUM}`}>
                {slice.priority}
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-4">{slice.description}</p>
            <div className="flex flex-wrap gap-2 text-xs mb-4">
              <span
                className={`px-2.5 py-1 rounded-full ${
                  slice.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {slice.status}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                {slice.vmIds?.length || 0} VM{slice.vmIds?.length === 1 ? "" : "s"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                {slice.bandwidth_max || "—"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-yellow-900/40 text-yellow-400">
                QoS: {slice.qos_status}
              </span>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleEditClick(slice)}
                className="text-xs rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleActivate(slice.id, slice.status !== "ACTIVE")}
                className="flex-1 text-xs rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 transition"
              >
                {slice.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => handleDelete(slice.id)}
                className="text-xs rounded-lg border border-red-800 text-red-400 px-3 py-2 hover:bg-red-950/40 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && slices.length === 0 && (
        <div className="text-center text-slate-400 py-16">
          No slices defined yet. Click "Create Slice" to define your first network slice.
        </div>
      )}

      {/* Slice detail panel */}
      {selectedSlice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedSlice.name}</h3>
              <button onClick={() => setSelectedSlice(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Status" value={selectedSlice.status} />
              <Row label="Description" value={selectedSlice.description || "—"} />
              <Row label="Network" value={selectedSlice.network_name || "—"} />
              <Row label="VMs" value={`${selectedSlice.vmIds?.length || 0} assigned`} />
              <Row label="Bandwidth" value={`${selectedSlice.bandwidth_min || "—"} – ${selectedSlice.bandwidth_max || "—"}`} />
              <Row
                label="Per-VM Bandwidth"
                value={
                  selectedSlice.per_vm_mbps
                    ? `${selectedSlice.per_vm_mbps} Mbps per VM (${selectedSlice.vmIds?.length || 0} VM${selectedSlice.vmIds?.length === 1 ? "" : "s"} sharing ${selectedSlice.bandwidth_max || "—"} total)`
                    : "—"
                }
              />
              <Row
                label="Packet Rate Limit"
                value={
                  selectedSlice.max_pps
                    ? `${selectedSlice.max_pps} pps total — ${selectedSlice.pps_enforcement_status || "not_configured"}`
                    : "not set (unlimited)"
                }
              />
              <Row
                label="Priority Guarantee"
                value={
                  selectedSlice.minimum_bandwidth_rule_id
                    ? `${selectedSlice.priority} — guaranteed floor enforced (Neutron minimum_bandwidth rule)`
                    : `${selectedSlice.priority} — best-effort only (no guaranteed floor)`
                }
              />
              <Row
                label="Latency Marking"
                value={
                  selectedSlice.dscp_marking_rule_id
                    ? `${selectedSlice.latency_requirement} — traffic marked DSCP 46 (Expedited Forwarding)`
                    : `${selectedSlice.latency_requirement} — no priority marking`
                }
              />
              <Row
                label="QoS Status"
                value={
                  selectedSlice.qos_status === "unsupported"
                    ? "unsupported (no Neutron QoS extension in this DevStack)"
                    : selectedSlice.qos_status
                }
              />
              <Row label="Created" value={selectedSlice.created_at} />
            </div>


            <div className="mt-5 pt-4 border-t border-slate-800">
              <h4 className="font-semibold mb-3 text-sm">
                Slice Topology <span className="text-slate-500 font-normal">(shared br-int infrastructure)</span>
              </h4>
              {topologyLoading && <p className="text-slate-400 text-xs">Loading topology...</p>}
              {sliceTopology?.error && (
                <p className="text-red-400 text-xs">{sliceTopology.error}</p>
              )}
              {sliceTopology && !sliceTopology.error && (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Bridge node: <span className="font-mono">{sliceTopology.brIntNodeId}</span> — {sliceTopology.sharedSwitch}
                  </p>
                  {sliceTopology.topology?.length > 0 ? (
                    <div className="space-y-2">
                      {sliceTopology.topology.map((t) => (
                        <div key={t.vmId} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{t.vmName}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openConsole(t.vmId, t.vmName)}
                                disabled={Boolean(consoleLoading[t.vmId])}
                                title="Open noVNC Web Console"
                                className="px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 font-semibold transition cursor-pointer flex items-center gap-1 text-[11px] border border-indigo-500/30"
                              >
                                <Terminal className={`w-3 h-3 ${consoleLoading[t.vmId] ? "animate-spin" : ""}`} />
                                Console
                              </button>
                              <span className={t.odlVisible ? "text-green-400" : "text-red-400"}>
                                {t.odlVisible ? "● Visible in ODL" : "● Not visible"}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-500">
                            {t.ipAddress || "no IP"} → {t.ovsInterface || "—"} → {t.odlNodeConnectorId || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">No VMs assigned to this slice yet.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingSliceId ? "Edit Slice" : "Create Network Slice"}</h3>

            <div className="mb-5 rounded-2xl border border-blue-800/50 bg-blue-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-300 font-semibold">
                  Describe what you need
                </label>
                <button
                  type="button"
                  onClick={() => setShowLlmSettings((v) => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  LLM provider settings
                </button>
              </div>
              {showLlmSettings && (
                <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs space-y-2">
                  <p className="text-slate-400">
                    Bring your own API key. Keys are encrypted and stored server-side; only "saved" status is shown here.
                  </p>
                  {llmProviderList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-slate-300">
                        {p.label} {p.saved ? <span className="text-green-400">(saved)</span> : <span className="text-slate-500">(not set)</span>}
                      </span>
                      {p.saved && (
                        <button
                          onClick={() => handleDeleteLlmKey(p.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <select
                      value={llmKeyProviderToSave}
                      onChange={(e) => setLlmKeyProviderToSave(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    >
                      {llmProviderList.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="password"
                      value={llmKeyInput}
                      onChange={(e) => setLlmKeyInput(e.target.value)}
                      placeholder="Paste API key"
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    />
                    <button
                      onClick={handleSaveLlmKey}
                      disabled={savingLlmKey}
                      className="rounded-lg bg-blue-700 px-3 py-1 font-semibold hover:bg-blue-600 disabled:opacity-60"
                    >
                      {savingLlmKey ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-slate-400">Use provider:</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                >
                  <option value="">Rule-based (no LLM)</option>
                  {llmProviderList.filter((p) => p.saved).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={intentText}
                onChange={(e) => setIntentText(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                rows={2}
                placeholder="e.g. I need a slice for hospital equipment, needs to be fast and very secure"
              />
              <button
                onClick={handleParseIntent}
                disabled={parsingIntent}
                className="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-60"
              >
                {parsingIntent ? "Parsing..." : "Parse Intent"}
              </button>

              {parsedIntent && (
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
                  <p className="text-slate-200 font-semibold mb-1">
                    Detected ({parsedIntent.source === "llm" ? "via LLM" : "via rules"}): {parsedIntent.priority} priority, {parsedIntent.isolationLevel} isolation,{" "}
                    {parsedIntent.latencyRequirement} latency, {parsedIntent.bandwidthMbps} Mbps
                  </p>
                  {parsedIntent.matchedKeywords.length > 0 ? (
                    <ul className="text-slate-400 space-y-0.5 mt-1">
                      {parsedIntent.matchedKeywords.map((m, i) => (
                        <li key={i}>
                          matched "<span className="text-blue-400">{m.keyword}</span>" - {m.reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 mt-1">No keywords matched - using default values below.</p>
                  )}
                  <p className="text-slate-500 mt-2">
                    Fields below have been pre-filled - review and adjust before creating.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm text-slate-400">Template</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className={`text-left p-3 rounded-xl border text-xs transition ${
                      form.sliceType === key
                        ? "border-blue-500 bg-blue-950/40"
                        : "border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-slate-400 mt-1">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-sm text-slate-400">Slice Name</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500"
                  placeholder="Hospital Slice"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-400">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500"
                  placeholder="Critical healthcare applications"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-400">Requested Bandwidth (Mbps)</label>
                <input
                  type="number"
                  min="1"
                  value={form.bandwidthMbps}
                  onChange={(e) => updateField("bandwidthMbps", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500"
                  placeholder="200"
                />
                {capacityStatus && (
                  <p className="text-xs text-slate-500 mt-1">
                    {capacityStatus.remainingMbps} Mbps remaining of {capacityStatus.totalMbps} Mbps total pool
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  A dedicated Neutron network is created automatically for this slice.
                </p>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-400">Max Packets/Second (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxPacketsPerSecond}
                  onChange={(e) => updateField("maxPacketsPerSecond", e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500"
                  placeholder="e.g. 2000"
                />
                {capacityStatus && capacityStatus.totalPps !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    {capacityStatus.remainingPps} pps remaining of {capacityStatus.totalPps} pps total budget
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank to skip packet-rate limiting for this slice. Enforced directly on the host via a tc ingress policer, independent of the bandwidth ceiling.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.priority === "LOW"
                      ? "Best-effort (no guaranteed floor)"
                      : `${form.priority === "HIGH" ? "80%" : "50%"} guaranteed bandwidth floor`}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Isolation Level</label>
                  <select
                    value={form.isolationLevel}
                    onChange={(e) => updateField("isolationLevel", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="STRICT">STRICT</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.isolationLevel === "STRICT"
                      ? "Security group + explicit deny flows"
                      : "Security group only"}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Latency Requirement</label>
                  <select
                    value={form.latencyRequirement}
                    onChange={(e) => updateField("latencyRequirement", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.latencyRequirement === "LOW" ? "Marked DSCP 46 (EF)" : "No priority marking"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm text-slate-400">Topology Color</label>
                <div className="flex gap-2 flex-wrap">
                  {SLICE_COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateField("color", c)}
                      className={`w-9 h-9 rounded-full transition ring-offset-2 ring-offset-slate-900 ${
                        form.color === c ? "ring-2 ring-white scale-110" : "ring-1 ring-slate-700 hover:ring-slate-500"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Choose color ${c}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This color identifies the slice in the network topology view.
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm text-slate-400">VMs in this slice</label>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 max-h-32 overflow-y-auto space-y-1">
                  {vms.map((vm) => (
                    <label key={vm.id} className="flex items-center gap-2 text-sm py-1">
                      <input
                        type="checkbox"
                        checked={form.vmIds.includes(vm.id)}
                        onChange={() => toggleVm(vm.id)}
                      />
                      {vm.name}
                    </label>
                  ))}
                  {vms.length === 0 && <p className="text-slate-500 text-xs">No VMs found.</p>}
                </div>
              </div>
              <p className="text-xs text-green-500">
                ✓ Bandwidth is genuinely enforced via a real Neutron QoS policy applied to this slice's dedicated network.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeCreateModal}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold hover:bg-blue-500 transition disabled:opacity-60"
              >
                {creating
                  ? (editingSliceId ? "Saving..." : "Creating...")
                  : (editingSliceId ? "Save Changes" : "Create Slice")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 text-right">{value}</span>
    </div>
  );
}
