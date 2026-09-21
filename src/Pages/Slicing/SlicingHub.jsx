import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Radio,
  Sliders,
  Gauge,
  Shield,
  Network,
  Cpu,
} from "lucide-react";
import IntentSlicing from "../IntentSlicing/IntentSlicing";
import NetworkSlicing from "../NetworkSlicing/NetworkSlicing";
import SlicingVerification from "../SlicingVerification";
import LinkGuard from "../LinkGuard";

export default function SlicingHub({ defaultTab = "intent" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active tab from prop or URL query/pathname
  const getCurrentTab = () => {
    const path = location.pathname.toLowerCase();
    const search = new URLSearchParams(location.search);
    const tabParam = search.get("tab");
    if (tabParam) return tabParam;
    if (path.includes("/odl") || path.includes("/enforcement")) return "odl";
    if (path.includes("/verification")) return "verification";
    if (path.includes("/link-guard")) return "link-guard";
    if (path.includes("/intent")) return "intent";
    return defaultTab || "intent";
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab);

  useEffect(() => {
    setActiveTab(getCurrentTab());
  }, [location.pathname, location.search, defaultTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "intent") navigate("/slicing?tab=intent");
    else if (tab === "odl") navigate("/slicing?tab=odl");
    else if (tab === "verification") navigate("/slicing?tab=verification");
    else if (tab === "link-guard") navigate("/slicing?tab=link-guard");
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Slicing Suite Top Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-cyan-500/10 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-inner">
              <Layers className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Network Slicing & QoS Operations Suite
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SDN Policy Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Unified natural language intent slicing, OpenDaylight flow enforcement verifier, and SLA performance benchmarking.
              </p>
            </div>
          </div>

          {/* Sub-system Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Engine:</span>
              <span className="font-bold text-slate-100 uppercase">Multi-Provider AI (Gemini/Groq/Offline)</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Data-Plane:</span>
              <span className="font-bold text-slate-100 uppercase">OpenFlow 1.3 Strict Isolation</span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => handleTabChange("intent")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "intent"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <span>AI Intent Slicing</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("odl")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "odl"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ODL Slice Enforcement Verifier</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("verification")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "verification"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>SLA Verification & Latency Benchmark</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("link-guard")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "link-guard"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>LinkGuard Autonomous Protection</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "intent" && <IntentSlicing />}
        {activeTab === "odl" && <NetworkSlicing />}
        {activeTab === "verification" && <SlicingVerification />}
        {activeTab === "link-guard" && <LinkGuard />}
      </div>
    </div>
  );
}
