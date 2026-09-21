import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
// import { useSdn } from "Insa-dluxf/src/pipeline/SdnContext.jsx"; // <--- Binds directly to your existing SdnContext
import { useSdn } from "../pipeline/SdnContext";

const BACKEND_URL = "http://localhost:5000";

export default function LinkGuard() {
  const { activeController } = useSdn(); // <--- Reads active controller dynamically from global context
  
  const [ports, setPorts] = useState([]);
  const [latency, setLatency] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [shieldEnabled, setShieldEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [systemMessage, setSystemMessage] = useState(null);

  const fetchUpdatedTelemetry = async () => {
    try {
      const [pRes, lRes, aRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/security/ports`),
        axios.get(`${BACKEND_URL}/api/security/latency`),
        axios.get(`${BACKEND_URL}/api/security/anomalies`)
      ]);
      setPorts(pRes.data);
      setLatency(lRes.data);
      setAlerts(aRes.data);
    } catch (err) {
      console.warn("Failed to fetch dynamic telemetry streams: ", err.message);
    }
  };

  // Re-run data fetching whenever the global active controller changes
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const statusRes = await axios.get(`${BACKEND_URL}/api/security/shield-status`);
        setShieldEnabled(statusRes.data.shieldEnabled);

        if (statusRes.data.shieldEnabled) {
          await fetchUpdatedTelemetry();
        }
      } catch (err) {
        console.error("Failed to load initial LinkGuard state:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const socket = io(BACKEND_URL);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("telemetry_update", (data) => {
      setPorts(data.ports);
      setLatency(data.latency);
      setAlerts(data.anomalies);
    });

    socket.on("security_alert", (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    socket.on("security_state_changed", (eventPayload) => {
      console.log("Port status updated dynamically:", eventPayload);
      fetchUpdatedTelemetry();
    });

    return () => {
      socket.disconnect();
    };
  }, [activeController]); // <--- Hooked dependency triggers fresh reload on toggle

  const handleShieldToggle = async () => {
    try {
      setToggling(true);
      const nextState = !shieldEnabled;
      const res = await axios.post(`${BACKEND_URL}/api/security/shield-toggle`, {
        enabled: nextState
      });
      setShieldEnabled(res.data.shieldEnabled);
      if (!res.data.shieldEnabled) {
        setPorts([]);
        setLatency([]);
        setAlerts([]);
      }
    } catch (err) {
      console.error("Failed to toggle security shield:", err);
      setSystemMessage({ type: "error", text: "Failed to communicate with active security controller." });
    } finally {
      setToggling(false);
    }
  };

  const handleClearState = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/security/reset`);
      setPorts([]);
      setLatency([]);
      setAlerts([]);
      setSystemMessage({ type: "success", text: res.data.message || "State maps successfully cleared." });
    } catch (err) {
      console.error("Failed to wipe state registers:", err);
    }
  };

  const handleUnlockPort = async (sourceString) => {
    const parsedSource = sourceString.split("-port-");
    if (parsedSource.length !== 2) {
      setSystemMessage({ type: "error", text: "Could not parse interface indices from log source." });
      return;
    }

    const deviceId = parsedSource[0];
    const portNumber = parseInt(parsedSource[1], 10);
    const actionKey = `${deviceId}-${portNumber}`;

    try {
      setActionLoading(actionKey);
      setSystemMessage(null);

      const response = await axios.post(`${BACKEND_URL}/api/security/unlock`, {
        deviceId,
        portNumber
      });

      if (response.data && response.data.status === 'SUCCESS') {
        setSystemMessage({
          type: "success",
          text: `Administrative rollback initiated successfully for port ${portNumber} on device ${deviceId}.`
        });
        await fetchUpdatedTelemetry();
      } else {
        setSystemMessage({ type: "error", text: "Controller rejected manual unlock requests." });
      }
    } catch (err) {
      setSystemMessage({ type: "error", text: err.response?.data?.error || "Connection timed out." });
    } finally {
      setActionLoading(null);
    }
  };

  const getLatestActiveMitigations = (allAlerts) => {
    const latestBySource = {};
    allAlerts.forEach((alert) => {
      if (alert.source) {
        latestBySource[alert.source] = alert; 
      }
    });
    return Object.values(latestBySource);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-mono">Initializing Intelligent Security Stack...</p>
      </div>
    );
  }

  const activeMitigations = getLatestActiveMitigations(alerts);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-gray-800 bg-gray-50/30 min-h-screen">

      {/* HEADER: Dynamic Subtitle Based on activeController */}
      <div className="flex items-center justify-between bg-white shadow-sm border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              LINK-GUARD <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">v2.1 Intelligence</span>
            </h1>
            <p className="text-sm text-gray-500 tracking-tight">
              {activeController === "onos" 
                ? "OSGi Bundle Protection & Symmetric Path Quarantine (ONOS Platform)" 
                : "MD-SAL Datastore Telemetry & Automated Self-Healing (ODL Platform)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
          <span className="text-xs font-bold text-gray-600 tracking-wide uppercase">
            {connected ? `Controller Sync Active (${activeController.toUpperCase()})` : "Sync Offline"}
          </span>
        </div>
      </div>

      {systemMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          systemMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{systemMessage.text}</span>
          <button onClick={() => setSystemMessage(null)} className="font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            <span className="text-lg">🛡️</span>
            <h2 className="text-md font-bold text-gray-800">Topology Protection (BLV/PLPC)</h2>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <div>
              <p className="text-sm font-bold">
                Security Shield Status:{" "}
                <span className={shieldEnabled ? "text-green-600" : "text-red-500"}>
                  {shieldEnabled ? "ARMED" : "OFF"}
                </span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[250px]">
                {shieldEnabled
                  ? "Active verification: HMAC signing, Flooding detection, and Port Auto-Recovery."
                  : "Protection disabled. Network is vulnerable to topology poisoning."}
              </p>
            </div>
            <button
              onClick={handleShieldToggle}
              disabled={toggling}
              className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none ${
                shieldEnabled ? "bg-green-500" : "bg-gray-400"
              } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform shadow ${shieldEnabled ? "translate-x-7" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg p-3 italic">
            <span>✨ Feature Active: HMAC Key Signature Verification on all LLDP Ingress.</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            <span className="text-lg">⚙️</span>
            <h2 className="text-md font-bold text-gray-800">System Control</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Clears local dashboard history and anomaly caches inside the active controller memory.
          </p>
          <button
            onClick={handleClearState}
            className="w-full py-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {activeController === "onos" ? "🔄 Reset Security State Maps" : "🔄 Clear Local Dashboard Cache"}
          </button>
        </div>
      </div>

      {/* TELEMETRY */}
      <div className="relative">
        {!shieldEnabled && (
          <div className="absolute inset-0 bg-gray-100/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl border border-gray-200 shadow-inner">
            <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-2xl max-w-md text-center space-y-4">
              <span className="text-5xl block animate-bounce">🔒</span>
              <h3 className="text-lg font-bold text-gray-800">Shield Offline</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Telemetry stream is paused. Activate the shield to see <strong>Real-time Latency Baselines</strong> and <strong>Port Health</strong>.
              </p>
            </div>
          </div>
        )}

        <div className={`space-y-6 ${!shieldEnabled ? "pointer-events-none select-none filter opacity-30" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PANEL: Active Alarms */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <span className="text-lg">🚨</span>
                <h2 className="text-md font-bold text-gray-800 font-mono">Active Threats ({alerts.length})</h2>
              </div>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2 border-2 border-dashed border-gray-50 rounded-lg">
                  <span className="text-4xl">✅</span>
                  <p className="text-xs font-semibold uppercase tracking-wider">No active path anomalies.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-2">
                  {alerts.map((alert) => {
                    const isManualRollback = alert.attackType === "MANUAL_ROLLBACK";
                    return (
                      <div 
                        key={alert.id} 
                        className={`flex items-start gap-3 border rounded-lg p-3 text-xs ${
                          isManualRollback ? 'bg-blue-50/50 border-blue-100' : 'bg-red-50/70 border-red-100'
                        }`}
                      >
                        <span className={`px-2 py-0.5 font-black uppercase rounded text-[9px] ${
                          isManualRollback ? 'bg-blue-100 text-blue-700' :
                          alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
                        }`}>{isManualRollback ? "RESTORED" : alert.severity}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900">{alert.attackType}</span>
                            <span className="text-gray-400 font-mono text-[10px]">{alert.detectedAt}</span>
                          </div>
                          <p className="text-gray-600 leading-tight">{alert.details}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Source: {alert.source}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL: Mitigation Control Center */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <span className="text-lg">🛠️</span>
                <h2 className="text-md font-bold text-gray-800">Mitigation Control Center</h2>
              </div>
              {activeMitigations.length === 0 ? (
                <p className="text-xs text-gray-300 py-10 text-center font-mono">Waiting for detection triggers...</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {activeMitigations.map((alert) => {
                    const isResolved = alert.attackType === "MANUAL_ROLLBACK";
                    const isHardBlock = alert.severity === "CRITICAL";

                    return (
                      <div key={`mit-${alert.id}`} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs flex justify-between items-center group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-gray-800">{alert.mitigation?.action || "Quarantine Block"}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Reason: {alert.mitigation?.reason || "N/A"} — Target: {alert.source}</p>
                        </div>
                        {isResolved ? (
                          <span className="text-[10px] font-mono bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md font-bold">
                            Active Restored
                          </span>
                        ) : (isHardBlock && activeController === "onos") ? (
                          <button
                            onClick={() => handleUnlockPort(alert.source)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px] transition-all"
                          >
                            {actionLoading === alert.source ? "Processing..." : "Unlock Port"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-md font-bold">
                            Soft Quarantine (Auto)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PANEL: Port Classifications */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <span className="text-lg">🔌</span>
                <h2 className="text-md font-bold text-gray-800">Dynamic Port Classification Matrix</h2>
              </div>
              {ports.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center">Awaiting topology discovery...</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-2">
                  {ports.map((port, idx) => {
                    const isRecovering = port.status?.includes("Recovered") || port.status?.includes("recovering") || port.status === "Blocked/Testing" || port.status === "Monitoring";
                    const isBlocked = port.status === "Blocked" || port.status === "UNTRUSTED";
                    return (
                      <div key={idx} className={`flex items-center justify-between border rounded-lg p-3 text-xs transition-all ${
                        isRecovering ? "bg-yellow-50/50 border-yellow-200 animate-pulse" : "bg-gray-50/50 border-gray-100"
                      }`}>
                        <div>
                          <p className="font-bold text-gray-800">{port.switchId}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Port {port.portNo} • {port.lastUpdated}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            port.classification === "TRUSTED" ? "bg-green-100 text-green-700" :
                            port.classification === "UNTRUSTED" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>{port.classification}</span>
                          
                          {isRecovering ? (
                            <span className="flex items-center gap-1 font-mono font-black text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-[9px]">
                               <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                               AUTO-RECOVERING
                            </span>
                          ) : (
                            <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[10px] ${
                                isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"
                            }`}>{port.status}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL: Latency baselines */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <span className="text-lg">📊</span>
                <h2 className="text-md font-bold text-gray-800 font-mono">RTT Performance Baselines (EMA)</h2>
              </div>
              {latency.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center italic">Calibrating link-specific baselines...</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                  {latency.map((link, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 text-xs space-y-3 shadow-sm hover:border-blue-400 transition-colors">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                         <p className="font-mono font-bold text-gray-500 truncate max-w-[200px]">{link.link}</p>
                         <span className={`font-black text-[9px] px-2 py-0.5 rounded-full ${link.status === "Anomalous" || link.status === "Anomalous" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                            {link.status}
                         </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">Current</span>
                          <span className={`text-xs font-black ${link.status === "Anomalous" || link.status === "Anomalous" ? "text-red-500" : "text-gray-900"}`}>{link.currentRtt?.toFixed(2) || "0.0"} ms</span>
                        </div>
                        <div className="text-center border-x border-gray-100">
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">Baseline</span>
                          <span className="text-xs font-black text-blue-600">{link.baselineRtt?.toFixed(2) || "0.0"} ms</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] text-gray-400 block uppercase font-bold">Limit</span>
                          <span className="text-xs font-black text-gray-400">{link.threshold?.toFixed(2) || "5.0"} ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      
      <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
          <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
            LINK-GUARD Security Stack • MD-SAL Operational Datastore Connected
          </p>
          <div className="flex gap-4">
             <span className="text-[10px] text-gray-400">OpenFlow 1.3</span>
             <span className="text-[10px] text-gray-400">YANG Model v24.08</span>
          </div>
      </div>
    </div>
  );
}

