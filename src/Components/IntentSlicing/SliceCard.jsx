import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Activity,
  Trash2,
  Edit2,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Monitor,
  Shield,
  Zap,
  Radio,
  Gauge,
  Info,
} from "lucide-react";
import { formatRate } from "./CapacityBar";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const TYPE_CONFIG = {
  embb: {
    label: "eMBB",
    title: "Enhanced Mobile Broadband",
    color: "#6366f1",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
  },
  urllc: {
    label: "URLLC",
    title: "Ultra-Reliable Low Latency",
    color: "#ef4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
  },
  mmtc: {
    label: "mMTC",
    title: "Massive Machine-Type Comms",
    color: "#22c55e",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  "best-effort": {
    label: "Best Effort",
    title: "Standard Best Effort",
    color: "#a1a1aa",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    text: "text-zinc-400",
  },
};

export default function SliceCard({
  slice,
  onEdit,
  onDelete,
  onTogglePause,
  onSelect,
  isSelected = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!slice) return null;

  const sliceTypeKey = (slice.type || slice.template || slice.sliceType || "best-effort").toLowerCase();
  const typeInfo = TYPE_CONFIG[sliceTypeKey] || TYPE_CONFIG["best-effort"];
  const sliceColor = slice.color || typeInfo.color;

  const bandwidthKbps = Number(slice.bandwidth ?? slice.bandwidthKbps ?? slice.qosBandwidth ?? 0);
  const burstSizeKb = Number(slice.burstSize ?? slice.burstKbps ?? Math.round(bandwidthKbps * 0.2));
  const hosts = slice.hosts || [];
  const flows = slice.flows || [];
  const isPaused = Boolean(slice.paused);

  // Aggregate meter stats across all slice hosts
  const totalPackets = hosts.reduce((sum, h) => sum + (h.meterStats?.packets || 0), 0);
  const totalBytes = hosts.reduce((sum, h) => sum + (h.meterStats?.bytes || 0), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect && onSelect(slice)}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-slate-900/80 backdrop-blur-sm ${
        isSelected
          ? "border-indigo-500 shadow-lg shadow-indigo-500/10"
          : "border-slate-800 hover:border-slate-700/80 shadow-md"
      }`}
    >
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: sliceColor }} />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner"
              style={{ backgroundColor: `${sliceColor}25`, border: `1px solid ${sliceColor}50` }}
            >
              <Layers className="w-5 h-5" style={{ color: sliceColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-100 text-base leading-tight">
                  {slice.name || "Unnamed Slice"}
                </h4>
                {slice.vlanId && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                    VLAN {slice.vlanId}
                  </span>
                )}
                {isPaused && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {slice.description || typeInfo.title}
              </p>
            </div>
          </div>

          {/* 3GPP Type Badge */}
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${typeInfo.bg} ${typeInfo.border} ${typeInfo.text}`}
          >
            {typeInfo.label}
          </span>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Bandwidth</span>
            <span className="text-xs font-bold text-slate-100">{formatRate(bandwidthKbps)}</span>
          </div>
          <div className="border-x border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Burst Buffer</span>
            <span className="text-xs font-bold text-slate-300">{formatRate(burstSizeKb)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Hosts</span>
            <span className="text-xs font-bold text-indigo-400">{hosts.length} Endpoints</span>
          </div>
        </div>

        {/* Meter Stats Strip */}
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 mb-3">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transmitted: <strong className="text-slate-200">{formatBytes(totalBytes)}</strong></span>
          </div>
          <div>
            <span>Packets: <strong className="text-slate-200">{totalPackets.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Collapsible Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 pt-2 border-t border-slate-800/80 text-xs overflow-hidden"
            >
              {/* Host List */}
              <div>
                <h5 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                  Isolated Endpoints ({hosts.length})
                </h5>
                <div className="space-y-1">
                  {hosts.length === 0 ? (
                    <span className="text-slate-500 italic">No specific hosts bound</span>
                  ) : (
                    hosts.map((h, i) => {
                      const ip = (h.ipAddresses || [])[0] || h.ip || "No IP";
                      const dev = h.deviceId ? h.deviceId.split(":").pop() : "s1";
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-800/60 font-mono text-[11px] text-slate-300"
                        >
                          <span className="text-slate-100 font-semibold">{ip}</span>
                          <span className="text-slate-500 text-[10px]">{h.mac || "N/A"}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-indigo-300 text-[10px]">
                            {dev}:{h.port || "1"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* OpenFlow Flow Count */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Installed OpenFlow Flow Rules
                </span>
                <span className="font-bold text-slate-200">{flows.length} Rules (Priority 40000/39000)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> View Endpoints & Flows
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onTogglePause && (
              <button
                type="button"
                onClick={() => onTogglePause(slice.id)}
                className={`p-1.5 rounded-lg border transition ${
                  isPaused
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:text-amber-400"
                }`}
                title={isPaused ? "Resume Slice" : "Pause Slice"}
              >
                {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(slice)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-indigo-400 transition"
                title="Edit Slice"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(slice.id);
                        setShowDeleteConfirm(false);
                      }}
                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-1.5 py-1 rounded bg-slate-800 text-slate-400 text-[11px] hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 transition"
                    title="Delete Slice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

