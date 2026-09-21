import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
  Activity,
  Sliders,
  Radio,
  Zap,
  Globe,
  Monitor,
  Shield,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  getSlices,
  createSlice,
  updateSlice,
  deleteSlice,
  getTopologyInfo,
  SLICE_TEMPLATES,
  getNetworkCapacity,
  setNetworkCapacity,
} from "../../api/slicingService";
import AiIntentPanel from "../../Components/IntentSlicing/AiIntentPanel";
import CapacityBar from "../../Components/IntentSlicing/CapacityBar";
import SliceList from "../../Components/IntentSlicing/SliceList";
import TopologyVisualizer from "../../Components/IntentSlicing/TopologyVisualizer";
import TrafficMonitor from "../../Components/IntentSlicing/TrafficMonitor";

export default function IntentSlicing() {
  const [slices, setSlices] = useState([]);
  const [topology, setTopology] = useState({ devices: [], links: [], hosts: [] });
  const [totalCapacity, setTotalCapacity] = useState(() => getNetworkCapacity());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSliceId, setSelectedSliceId] = useState(null);

  // Manual slice modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSlice, setEditingSlice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "embb",
    bandwidth: 50000,
    burstSize: 10000,
    color: "#6366f1",
    vlanId: "",
    selectedHostIps: [],
  });

  // Calculate remaining unallocated capacity
  const remainingCapacity = useMemo(() => {
    const allocated = slices.reduce(
      (sum, s) => sum + Number(s.bandwidth || s.bandwidthKbps || 0),
      0
    );
    return Math.max(0, totalCapacity - allocated);
  }, [slices, totalCapacity]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slicesData, topoData] = await Promise.all([
        getSlices().catch(() => []),
        getTopologyInfo().catch(() => ({ devices: [], links: [], hosts: [] })),
      ]);
      setSlices(slicesData || []);
      setTopology(topoData || { devices: [], links: [], hosts: [] });
      setTotalCapacity(getNetworkCapacity());
    } catch (err) {
      setError(err.message || "Failed to load network slicing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deploy slice from AI Intent Compiler result
  const handleDeployAiSlice = async (compiledIntent) => {
    setSubmitting(true);
    try {
      const targetIps = compiledIntent.targetHostIps || [];
      const matchedHosts = (topology.hosts || []).filter((h) => {
        const ips = h.ipAddresses || [];
        return targetIps.some((tip) => ips.includes(tip) || h.mac === tip);
      });

      const hostsToAssign =
        matchedHosts.length > 0 ? matchedHosts : compiledIntent.matchedHosts || [];

      await createSlice({
        name: compiledIntent.sliceName,
        description: compiledIntent.description,
        type: compiledIntent.sliceType,
        bandwidth: compiledIntent.bandwidth,
        burstSize: compiledIntent.burstSize,
        unit: compiledIntent.unit || "KB_PER_SEC",
        color: compiledIntent.color || "#6366f1",
        vlanId: compiledIntent.vlanId,
        selectedHosts: hostsToAssign,
      });

      await fetchData();
    } catch (err) {
      alert(`Slice deployment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-fill manual form from AI Intent
  const handlePrefillManualForm = (compiledIntent) => {
    const template = SLICE_TEMPLATES.find((t) => t.id === compiledIntent.sliceType);
    setEditingSlice(null);
    setFormData({
      name: compiledIntent.sliceName || "",
      description: compiledIntent.description || "",
      type: compiledIntent.sliceType || "embb",
      bandwidth: compiledIntent.bandwidth || 50000,
      burstSize: compiledIntent.burstSize || 10000,
      color: compiledIntent.color || template?.color || "#6366f1",
      vlanId: compiledIntent.vlanId ? String(compiledIntent.vlanId) : "",
      selectedHostIps: compiledIntent.targetHostIps || [],
    });
    setShowModal(true);
  };

  // Open manual create modal
  const handleOpenCreateModal = () => {
    setEditingSlice(null);
    setFormData({
      name: "",
      description: "",
      type: "embb",
      bandwidth: 50000,
      burstSize: 10000,
      color: "#6366f1",
      vlanId: "",
      selectedHostIps: [],
    });
    setFormError(null);
    setShowModal(true);
  };

  // Open manual edit modal
  const handleOpenEditModal = (slice) => {
    setEditingSlice(slice);
    const hostIps = (slice.hosts || []).map((h) => (h.ipAddresses || [])[0]).filter(Boolean);
    setFormData({
      name: slice.name || "",
      description: slice.description || "",
      type: slice.type || slice.template || "embb",
      bandwidth: Number(slice.bandwidth || slice.bandwidthKbps || 50000),
      burstSize: Number(slice.burstSize || slice.burstKbps || 10000),
      color: slice.color || "#6366f1",
      vlanId: slice.vlanId ? String(slice.vlanId) : "",
      selectedHostIps: hostIps,
    });
    setFormError(null);
    setShowModal(true);
  };

  // Save manual slice (Create / Update)
  const handleSaveManualSlice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (!formData.name.trim()) throw new Error("Slice name is required.");
      if (formData.bandwidth <= 0) throw new Error("Bandwidth must be greater than 0.");
      if (formData.selectedHostIps.length === 0)
        throw new Error("Select at least one host for this slice.");

      // Resolve full host objects from topology
      const assignedHosts = (topology.hosts || []).filter((h) => {
        const ips = h.ipAddresses || [];
        return formData.selectedHostIps.some((ip) => ips.includes(ip) || h.mac === ip);
      });

      if (editingSlice) {
        await updateSlice(editingSlice.id, {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          bandwidth: Number(formData.bandwidth),
          burstSize: Number(formData.burstSize),
          color: formData.color,
          vlanId: formData.vlanId ? Number(formData.vlanId) : undefined,
          selectedHosts: assignedHosts,
        });
      } else {
        await createSlice({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          bandwidth: Number(formData.bandwidth),
          burstSize: Number(formData.burstSize),
          color: formData.color,
          vlanId: formData.vlanId ? Number(formData.vlanId) : undefined,
          selectedHosts: assignedHosts,
        });
      }

      setShowModal(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Slice
  const handleDeleteSlice = async (sliceId) => {
    try {
      await deleteSlice(sliceId);
      await fetchData();
    } catch (err) {
      alert(`Failed to delete slice: ${err.message}`);
    }
  };

  // Toggle Pause Slice
  const handleTogglePause = (sliceId) => {
    setSlices((prev) =>
      prev.map((s) => (s.id === sliceId ? { ...s, paused: !s.paused } : s))
    );
  };

  // Capacity adjustment callback
  const handleUpdateCapacity = (newKbps) => {
    setNetworkCapacity(newKbps);
    setTotalCapacity(newKbps);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Intent-Based Network Slicing
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  3GPP 5G Slicing Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Declare natural language SLA intents or configure strict OpenFlow isolation boundaries with dynamic QoS policing, BFS multi-switch forwarding (Priority 40000), and drop isolation boundaries (Priority 39000).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition"
            >
              <Plus className="w-4 h-4" />
              Manual Slice
            </button>
          </div>
        </div>
      </div>

      {/* Capacity Bar */}
      <CapacityBar
        totalCapacity={totalCapacity}
        slices={slices}
        onUpdateCapacity={handleUpdateCapacity}
      />

      {/* Main Grid: AI Intent Panel & Telemetry Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-4">
          <AiIntentPanel
            onosHosts={topology.hosts}
            existingSlices={slices}
            totalCapacity={totalCapacity}
            remainingCapacity={remainingCapacity}
            onDeploySlice={handleDeployAiSlice}
            onPrefillManualForm={handlePrefillManualForm}
            loading={submitting}
          />
        </div>

        <div className="lg:col-span-6 space-y-4">
          <TrafficMonitor
            slices={slices}
            devices={topology.devices}
            isLive={true}
          />
        </div>
      </div>

      {/* Topology Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            End-to-End Slice Topology & Path Visualizer
          </h3>
          <span className="text-xs text-slate-400">
            {topology.devices.length} Switches · {topology.hosts.length} Discovered Hosts
          </span>
        </div>
        <TopologyVisualizer
          slices={slices}
          devices={topology.devices}
          links={topology.links}
          hosts={topology.hosts}
          onRefresh={fetchData}
          loading={loading}
        />
      </div>

      {/* Active Slice Inventory */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Active Slice Inventory ({slices.length})
          </h3>
        </div>
        <SliceList
          slices={slices}
          loading={loading}
          error={error}
          onRefresh={fetchData}
          onCreateNew={handleOpenCreateModal}
          onEditSlice={handleOpenEditModal}
          onDeleteSlice={handleDeleteSlice}
          onTogglePause={handleTogglePause}
          onSelectSlice={(s) => setSelectedSliceId(s.id)}
          selectedSliceId={selectedSliceId}
        />
      </div>

      {/* Manual Slice Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {editingSlice ? "Edit Network Slice" : "Create New Network Slice"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure OpenFlow isolation and rate policing
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveManualSlice} className="mt-4 space-y-4 text-xs">
                {/* 3GPP Template Presets */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    3GPP 5G Slice Profile Template
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SLICE_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            type: tmpl.id,
                            bandwidth: tmpl.bandwidth,
                            burstSize: tmpl.burstSize,
                            color: tmpl.color,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          formData.type === tmpl.id
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-bold block text-xs" style={{ color: tmpl.color }}>
                          {tmpl.name.split(" ")[0]}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {(tmpl.bandwidth / 1000).toFixed(0)} MB/s
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slice Name */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Slice Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Autonomous-Vehicles-Slice"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Ultra-reliable low latency telemetry"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Bandwidth & Burst Allowance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Bandwidth (KB/s)
                    </label>
                    <input
                      type="number"
                      min="100"
                      required
                      value={formData.bandwidth}
                      onChange={(e) => {
                        const bw = Number(e.target.value);
                        setFormData({
                          ...formData,
                          bandwidth: bw,
                          burstSize: Math.round(bw * 0.2),
                        });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      = {(formData.bandwidth / 1000).toFixed(1)} MB/s
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Burst Buffer (KB)
                    </label>
                    <input
                      type="number"
                      min="10"
                      value={formData.burstSize}
                      onChange={(e) =>
                        setFormData({ ...formData, burstSize: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Assigned Host Selection */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    Assign Endpoints / Hosts
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {(topology.hosts || []).map((h, i) => {
                      const ip = (h.ipAddresses || [])[0] || h.ip || `host-${i + 1}`;
                      const isChecked = formData.selectedHostIps.includes(ip) || formData.selectedHostIps.includes(h.mac);
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  selectedHostIps: [...prev.selectedHostIps, ip],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  selectedHostIps: prev.selectedHostIps.filter((x) => x !== ip && x !== h.mac),
                                }));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-0"
                          />
                          <div>
                            <span className="font-bold block">{ip}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              {h.mac || "N/A"}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/25"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Provisioning Rules…
                      </>
                    ) : editingSlice ? (
                      "Update Slice"
                    ) : (
                      "Provision Slice"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
