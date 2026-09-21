import React, { useState } from "react";
import { motion } from "framer-motion";
import { Database, AlertTriangle, CheckCircle2, Sliders, RefreshCw } from "lucide-react";

export function formatRate(kbps) {
  const rate = Number(kbps);
  if (!kbps || isNaN(rate) || rate <= 0) return "0 KB/s";
  if (rate >= 1000000) return parseFloat((rate / 1000000).toFixed(1)) + " GB/s";
  if (rate >= 1000) return parseFloat((rate / 1000).toFixed(1)) + " MB/s";
  return parseFloat(rate.toFixed(1)) + " KB/s";
}

export default function CapacityBar({
  totalCapacity = 100000,
  slices = [],
  onUpdateCapacity,
  compact = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(Math.round(totalCapacity / 1000)));

  // Calculate allocated capacity safely
  const safeTotal = Number(totalCapacity) > 0 ? Number(totalCapacity) : 100000;
  const allocatedKbps = (slices || []).reduce((sum, s) => {
    const bw = s?.bandwidth ?? s?.bandwidthKbps ?? s?.qosBandwidth ?? 0;
    return sum + (Number(bw) || 0);
  }, 0);

  const remainingKbps = Math.max(0, safeTotal - allocatedKbps);
  const percentUsed = Math.min(100, Math.round((allocatedKbps / safeTotal) * 100));

  const handleSave = (e) => {
    e.preventDefault();
    const parsedMb = parseFloat(editValue);
    if (!isNaN(parsedMb) && parsedMb > 0) {
      const newKbps = Math.round(parsedMb * 1000);
      if (onUpdateCapacity) onUpdateCapacity(newKbps);
      setIsEditing(false);
    }
  };

  const isNearLimit = percentUsed >= 80 && percentUsed < 100;
  const isFull = percentUsed >= 100;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        compact
          ? "p-4 bg-slate-900/60 border-slate-800/80"
          : "p-6 bg-slate-900/80 border-slate-800 shadow-xl backdrop-blur-md"
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isFull
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isNearLimit
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                Physical Network Capacity Pool
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isFull
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : isNearLimit
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {percentUsed}% ALLOCATED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-switch shared bandwidth resource pool with dynamic SLA admission control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onUpdateCapacity && (
            <div>
              {isEditing ? (
                <form onSubmit={handleSave} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 px-2 py-1 text-xs rounded-lg bg-slate-800 border border-indigo-500 text-slate-100 focus:outline-none"
                    placeholder="MB/s"
                    autoFocus
                  />
                  <span className="text-xs text-slate-400">MB/s</span>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(String(Math.round(safeTotal / 1000)));
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-indigo-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Adjust Pool
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 p-0.5 mb-3">
        <div className="flex h-full w-full rounded-full overflow-hidden">
          {/* Individual Slices */}
          {slices.map((slice, idx) => {
            const bw = Number(slice?.bandwidth ?? slice?.bandwidthKbps ?? slice?.qosBandwidth ?? 0);
            if (bw <= 0) return null;
            const widthPct = (bw / safeTotal) * 100;
            const sliceColor = slice.color || "#6366f1";
            return (
              <motion.div
                key={slice.id || idx}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full relative group cursor-pointer"
                style={{ backgroundColor: sliceColor }}
                title={`${slice.name || "Slice"}: ${formatRate(bw)} (${widthPct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-800/60 text-center text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Allocated Bandwidth</span>
          <span className="text-slate-100 font-bold text-sm tracking-wide">
            {formatRate(allocatedKbps)}
          </span>
        </div>
        <div className="border-x border-slate-800/60">
          <span className="text-slate-400 block text-[11px]">Available Remaining</span>
          <span
            className={`font-bold text-sm tracking-wide ${
              remainingKbps > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatRate(remainingKbps)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Total Pool Capacity</span>
          <span className="text-indigo-400 font-bold text-sm tracking-wide">
            {formatRate(safeTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
