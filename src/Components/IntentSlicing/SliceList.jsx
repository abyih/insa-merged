import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  AlertCircle,
  Inbox,
  Sparkles,
} from "lucide-react";
import SliceCard from "./SliceCard";

export default function SliceList({
  slices = [],
  loading = false,
  error = null,
  onRefresh,
  onCreateNew,
  onEditSlice,
  onDeleteSlice,
  onTogglePause,
  onSelectSlice,
  selectedSliceId = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST"); // 'NEWEST' | 'BANDWIDTH_DESC' | 'NAME'

  // Filter and sort slices
  const filteredSlices = useMemo(() => {
    let list = [...(slices || [])];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const nameMatch = (s.name || "").toLowerCase().includes(q);
        const descMatch = (s.description || "").toLowerCase().includes(q);
        const hostMatch = (s.hosts || []).some(
          (h) =>
            (h.mac || "").toLowerCase().includes(q) ||
            (h.ipAddresses || []).some((ip) => ip.toLowerCase().includes(q))
        );
        return nameMatch || descMatch || hostMatch;
      });
    }

    // Type filter
    if (filterType !== "ALL") {
      list = list.filter((s) => {
        const t = (s.type || s.template || s.sliceType || "").toLowerCase();
        return t === filterType.toLowerCase();
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "BANDWIDTH_DESC") {
        const bwA = Number(a.bandwidth || a.bandwidthKbps || 0);
        const bwB = Number(b.bandwidth || b.bandwidthKbps || 0);
        return bwB - bwA;
      }
      if (sortBy === "NAME") {
        return (a.name || "").localeCompare(b.name || "");
      }
      // Default: NEWEST
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [slices, searchQuery, filterType, sortBy]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search slices by name, IP, or host MAC…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 3GPP Type Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["ALL", "eMBB", "URLLC", "mMTC"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  filterType === t
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="NEWEST">Newest First</option>
            <option value="BANDWIDTH_DESC">Highest Bandwidth</option>
            <option value="NAME">Name (A–Z)</option>
          </select>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Slices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          )}

          {/* Create Slice Button */}
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              New Slice
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === "string" ? error : error.message || "Failed to load network slices."}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && slices.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSlices.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-200 mb-1">
            {searchQuery || filterType !== "ALL" ? "No Matching Slices" : "No Active Network Slices"}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            {searchQuery || filterType !== "ALL"
              ? "Try adjusting your search query or slice type filter."
              : "Deploy an isolated network slice using the AI Natural Language Intent panel or by configuring manual OpenFlow parameters."}
          </p>
          {onCreateNew && !searchQuery && filterType === "ALL" && (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Create First Slice
            </button>
          )}
        </div>
      )}

      {/* Slices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredSlices.map((slice) => (
            <SliceCard
              key={slice.id}
              slice={slice}
              onEdit={onEditSlice}
              onDelete={onDeleteSlice}
              onTogglePause={onTogglePause}
              onSelect={onSelectSlice}
              isSelected={selectedSliceId === slice.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
