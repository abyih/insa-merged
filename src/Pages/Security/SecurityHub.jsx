import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Cpu,
  Activity,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Radio,
  Sliders,
  Layers,
  Sparkles,
} from "lucide-react";
import AnomalyDetector from "../AnomalyDetector/AnomalyDetector";
import LinkGuard from "../LinkGuard";
import TlsManager from "./TlsManager";
import { useSdn } from "../../pipeline/SdnContext";

export default function SecurityHub({ defaultTab = "overview" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeController, setActiveController } = useSdn();

  // Determine current active tab from prop, pathname, or state
  const getCurrentTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/anomaly")) return "anomaly";
    if (path.includes("/linkguard")) return "linkguard";
    if (path.includes("/tls")) return "tls";
    return defaultTab || "overview";
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab);

  useEffect(() => {
    setActiveTab(getCurrentTab());
  }, [location.pathname, defaultTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "overview") navigate("/security");
    else if (tab === "anomaly") navigate("/security/anomaly");
    else if (tab === "linkguard") navigate("/security/linkguard");
    else if (tab === "tls") navigate("/security/tls");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Security Suite Header & Sub-Navigation */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 via-cyan-500/15 to-emerald-500/10 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Security Operations Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  Unified Defense Suite
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Centralized management for Machine Learning Anomaly Detection, Real-time LinkGuard, and TLS Cryptographic Transport.
              </p>
            </div>
          </div>

          {/* Controller Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>SDN Controller:</span>
              <span className="font-bold text-zinc-100 uppercase">{activeController}</span>
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
            <span>Security Overview</span>
          </button>

          <button
            onClick={() => handleTabChange("anomaly")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "anomaly"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Anomaly Detector</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-zinc-300">
              AI / ML
            </span>
          </button>

          <button
            onClick={() => handleTabChange("linkguard")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "linkguard"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Link Guard</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-cyan-300">
              Active Shield
            </span>
          </button>

          <button
            onClick={() => handleTabChange("tls")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "tls"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/50"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>TLS Encryption</span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-950/60 text-[10px] font-mono text-emerald-300">
              mTLS
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Tri-Pillar Architecture Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Anomaly Detector */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                    DUAL ENGINE ACTIVE
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">Anomaly Detection</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Online Isolation Forest (unsupervised live flow baseline) paired with Random Forest supervised attack classification.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Engines:</span>
                    <span className="text-zinc-200 font-mono">Online IF + Offline RF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Defense Mode:</span>
                    <span className="text-emerald-400 font-medium">Active Quarantine</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Attack Taxonomy:</span>
                    <span className="text-zinc-200 font-mono">DDoS, Probe, PortScan</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("anomaly")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Launch Anomaly Console</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Pillar 2: Link Guard */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-800/80">
                    REAL-TIME TELEMETRY
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">Link Guard</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Automated threat shield monitoring link latency deviations, real-time port classifications, and dynamic drop flows.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Telemetry Stream:</span>
                    <span className="text-zinc-200 font-mono">Socket.io Live Polling</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Mitigation:</span>
                    <span className="text-cyan-400 font-medium">Automatic Port Isolation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Latency Engine:</span>
                    <span className="text-zinc-200 font-mono">Microsecond RTT Tracking</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("linkguard")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Launch Link Guard Console</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Pillar 3: TLS Manager */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700/80 transition-all duration-200 group">
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/60 text-indigo-400 border border-indigo-800/80">
                    CRYPTOGRAPHIC mTLS
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-4">TLS Encryption</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Transport Layer Security orchestrator enforcing OpenFlow Southbound SSL channels and Northbound HTTPS APIs.
                </p>

                <div className="mt-4 space-y-2 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-850">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Southbound SSL:</span>
                    <span className="text-emerald-400 font-mono">Port 6653 (mTLS)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Northbound HTTPS:</span>
                    <span className="text-zinc-200 font-mono">Port 8443 RESTCONF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cipher Protocol:</span>
                    <span className="text-zinc-200 font-mono">AES-256-GCM / TLSv1.3</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTabChange("tls")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Manage TLS Encryption</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Defense-in-Depth Security Matrix */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              SDN Defense-in-Depth Architecture
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              How the three security pillars complement each other to protect both data plane and control plane infrastructure:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-850">
                <div className="text-xs font-bold text-indigo-400 mb-1">Layer 1: Transport Confidentiality</div>
                <p className="text-xs text-zinc-300">
                  <strong>TLS</strong> guarantees that control messages between switches and controllers cannot be sniffed, modified, or hijacked by man-in-the-middle attackers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-850">
                <div className="text-xs font-bold text-red-400 mb-1">Layer 2: AI Traffic Anomaly Detection</div>
                <p className="text-xs text-zinc-300">
                  <strong>Isolation Forest & Random Forest</strong> continuously model legitimate telemetry vs. statistical outliers to detect volumetric and stealthy attacks in real time.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-850">
                <div className="text-xs font-bold text-cyan-400 mb-1">Layer 3: Active Response & Link Integrity</div>
                <p className="text-xs text-zinc-300">
                  <strong>Link Guard</strong> watches physical and virtual link latency spikes and immediately installs defensive OpenFlow drop flows to isolate rogue switch ports.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "anomaly" && (
        <div>
          <AnomalyDetector />
        </div>
      )}

      {activeTab === "linkguard" && (
        <div>
          <LinkGuard />
        </div>
      )}

      {activeTab === "tls" && (
        <div>
          <TlsManager />
        </div>
      )}
    </div>
  );
}
