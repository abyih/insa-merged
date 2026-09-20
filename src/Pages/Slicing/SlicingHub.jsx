import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Layers,
  Network,
  Cpu,
  Cloud,
  CheckCircle2,
  Activity,
  ArrowRight,
  Radio,
  Sliders,
  Zap,
  Gauge,
  Shield,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import NetworkSlicing from "../NetworkSlicing";
import NetworkSlices from "../NetworkSlices";
import SlicingVerification from "../SlicingVerification";

export default function SlicingHub({ defaultTab = "overview" }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active tab from prop or URL
  const getCurrentTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/onos")) return "onos";
    if (path.includes("/openstack")) return "openstack";
    if (path.includes("/verification")) return "verification";
    return defaultTab || "overview";
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab);

  useEffect(() => {
    setActiveTab(getCurrentTab());
  }, [location.pathname, defaultTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "overview") navigate("/slicing");
    else if (tab === "onos") navigate("/slicing/onos");
    else if (tab === "openstack") navigate("/slicing/openstack");
    else if (tab === "verification") navigate("/slicing/verification");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Slicing Suite Header & Sub-Navigation */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-cyan-500/10 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-inner">
              <Layers className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Network Slicing Operations Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-950/80 text-purple-300 border border-purple-700/60">
                  Dual-Domain Slicing
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Unified provisioning, QoS isolation, and verification across ONOS Data-Plane switches and OpenStack Cloud VMs.
              </p>
            </div>
          </div>

          {/* Domain Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Data-Plane:</span>
              <span className="font-bold text-zinc-100 uppercase">ONOS (Meters)</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Cloud:</span>
              <span className="font-bold text-zinc-100 uppercase">OpenStack (OVS QoS)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Slicing Overview</span>
          </button>

          <button
            onClick={() => handleTabChange("onos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "onos"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>ONOS Data-Plane Slicing</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-cyan-300">
              Meters & AI
            </span>
          </button>

          <button
            onClick={() => handleTabChange("openstack")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "openstack"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>OpenStack Cloud Slices</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-purple-300">
              VM & OVS
            </span>
          </button>

          <button
            onClick={() => handleTabChange("verification")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "verification"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Verification & Live Tests</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-emerald-300">
              iperf & QoS
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Tri-Pillar Slicing Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: ONOS Slicing */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                    <Network className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-800/80">
                    DATA-PLANE SDN
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">ONOS Network Slicing</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Host-to-host multi-switch slicing enforced by OpenFlow meters, dynamic VLAN tagging, and AI Natural Language intent parsing.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Enforcement:</span>
                    <span className="text-cyan-400 font-mono">OpenFlow Meters + VLANs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Multi-Switch:</span>
                    <span className="text-zinc-200 font-mono">BFS Path Forwarding</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">AI Intent:</span>
                    <span className="text-emerald-400 font-medium">NLP Compiler Active</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("onos")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Open ONOS Slicing Canvas</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Pillar 2: OpenStack Slices */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-400 border border-purple-800/80">
                    CLOUD INFRASTRUCTURE
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">OpenStack Cloud Slices</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Virtual Machine partitioning across DevStack/OpenStack compute nodes, OVS Dual-Queue traffic shaping, and PPS rate limiting.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Domain:</span>
                    <span className="text-purple-400 font-mono">Nova VMs + Neutron</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">QoS Queues:</span>
                    <span className="text-zinc-200 font-mono">HTB Linux Queuing (tc)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Self-Healing:</span>
                    <span className="text-emerald-400 font-medium">Reconciliation Daemon</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("openstack")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Manage Cloud Slices</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Pillar 3: Slicing Verification */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                    SLA BENCHMARKING
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">Verification & QoS Tests</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Automated verification test suite executing real Mininet network namespace pings, iperf UDP bandwidth saturations, and DSCP audits.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Bandwidth Audit:</span>
                    <span className="text-emerald-400 font-mono">iperf UDP Jitter & Drops</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Latency Audit:</span>
                    <span className="text-zinc-200 font-mono">Sub-millisecond Ping RTT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">DSCP Verification:</span>
                    <span className="text-zinc-200 font-mono">DSCP 46 Fast-Lane Queue</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("verification")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Run Slicing Test Suite</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 5G Slicing Standard Templates Section */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Standard 5G Slice Profiles Supported
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Templates tailored for standard ITU-R 5G usage scenarios, applied across both OpenFlow meters and Linux HTB queues:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-cyan-500/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400">eMBB (Enhanced Mobile Broadband)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800">
                    500 Mbps Cap
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Optimized for massive data throughput, video streaming, and large payload transfers. Uses Queue 1 with flexible PPS quotas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">URLLC (Ultra-Reliable Low-Latency)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                    Queue 0 (DSCP 46)
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Dedicated high-priority fast lane for autonomous systems and mission-critical telemetry. Bypasses standard queues with zero buffer bloat.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-purple-500/40 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-400">mMTC (Massive Machine Communications)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800">
                    High PPS / Low BW
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Designed for IoT sensor networks with thousands of small packets per second, protected by strict PPS rate limiting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "onos" && (
        <div>
          <NetworkSlicing />
        </div>
      )}

      {activeTab === "openstack" && (
        <div>
          <NetworkSlices />
        </div>
      )}

      {activeTab === "verification" && (
        <div>
          <SlicingVerification />
        </div>
      )}
    </div>
  );
}
