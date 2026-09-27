import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useSdn } from "../pipeline/SdnContext";

const BACKEND_URL = "http://localhost:5000";

export default function LinkGuard() {
  const { activeController } = useSdn();

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
  }, [activeController]);

  const handleShieldToggle = async () => {
    try {
      setToggling(true);
      const nextState = !shieldEnabled;
      const res = await axios.post(`${BACKEND_URL}/api/security/shield-toggle`, { enabled: nextState });
      setShieldEnabled(res.data.shieldEnabled);
      if (!res.data.shieldEnabled) {
        setPorts([]);
        setLatency([]);
        setAlerts([]);
      }
    } catch (err) {
      console.error("Failed to toggle security shield:", err);
      setSystemMessage({
        type: "error",
        text: "Failed to communicate with active security controller."
      });
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
      setSystemMessage({
        type: "success",
        text: res.data.message || "State maps successfully cleared."
      });
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm animate-pulse" style={{ color: "var(--theme-text-muted)" }}>Initializing Intelligent Security Stack...</p>
      </div>
    );
  }

  const activeMitigations = getLatestActiveMitigations(alerts);

  return (
    <div className="space-y-6" style={{ color: "var(--theme-fg)" }}>
      
      {/* HEADER: Dynamic Subtitle Based on activeController */}
      <div 
        className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl gap-4 shadow-sm"
        style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              LINK-GUARD 
              <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                v2.1 Intelligence
              </span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--theme-text-muted)" }}>
              {activeController === "onos" 
                ? "OSGi Bundle Protection & Symmetric Path Quarantine (ONOS Platform)" 
                : "MD-SAL Datastore Telemetry & Automated Self-Healing (ODL Platform)"}
            </p>
          </div>
        </div>
        <div 
          className="flex items-center gap-3 px-4 py-2 rounded-xl"
          style={{ backgroundColor: "var(--theme-bg)", border: "1px solid var(--theme-card-border)" }}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
          <span className="text-xs font-bold tracking-wide uppercase" style={{ color: "var(--theme-fg)" }}>
            {connected ? `Controller Sync Active (${activeController.toUpperCase()})` : "Sync Offline"}
          </span>
        </div>
      </div>

      {systemMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
          systemMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          <span>{systemMessage.text}</span>
          <button onClick={() => setSystemMessage(null)} className="font-bold hover:opacity-75 cursor-pointer">✕</button>
        </div>
      )}

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between"
          style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
        >
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
              <span className="text-lg">🛡️</span>
              <h2 className="text-md font-bold">Topology Protection (BLV/PLPC)</h2>
            </div>
            <div 
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ backgroundColor: "var(--theme-bg)", border: "1px solid var(--theme-card-border)" }}
            >
              <div>
                <p className="text-sm font-bold">
                  Security Shield Status:{" "}
                  <span className={shieldEnabled ? "text-green-500" : "text-red-500"}>
                    {shieldEnabled ? "ARMED" : "OFF"}
                  </span>
                </p>
                <p className="text-[11px] mt-1 max-w-[250px]" style={{ color: "var(--theme-text-muted)" }}>
                  {shieldEnabled
                    ? "Active verification: HMAC signing, Flooding detection, and Port Auto-Recovery."
                    : "Protection disabled. Network is vulnerable to topology poisoning."}
                </p>
              </div>
              <button
                onClick={handleShieldToggle}
                disabled={toggling}
                className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                  shieldEnabled ? "bg-green-500" : "bg-gray-400 dark:bg-zinc-700"
                } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform shadow ${shieldEnabled ? "translate-x-7" : ""}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-blue-500 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 italic">
            <span>✨ Feature Active: HMAC Key Signature Verification on all LLDP Ingress.</span>
          </div>
        </div>

        <div 
          className="p-5 rounded-2xl shadow-sm flex flex-col justify-between"
          style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
        >
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
              <span className="text-lg">⚙️</span>
              <h2 className="text-md font-bold">System Control</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--theme-text-muted)" }}>
              Clears local dashboard history and anomaly caches inside the active controller memory.
            </p>
          </div>
          <button
            onClick={handleClearState}
            className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            style={{ 
              backgroundColor: "var(--theme-bg)", 
              color: "var(--theme-fg)", 
              border: "1px solid var(--theme-card-border)" 
            }}
          >
            {activeController === "onos" ? "🔄 Reset Security State Maps" : "🔄 Clear Local Dashboard Cache"}
          </button>
        </div>
      </div>

      {/* TELEMETRY */}
      <div className="relative">
        {!shieldEnabled && (
          <div 
            className="absolute inset-0 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl shadow-inner"
            style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
          >
            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-md text-center space-y-4"
              style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
            >
              <span className="text-5xl block animate-bounce">🔒</span>
              <h3 className="text-lg font-bold">Shield Offline</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--theme-text-muted)" }}>
                Telemetry stream is paused. Activate the shield to see <strong>Real-time Latency Baselines</strong> and <strong>Port Health</strong>.
              </p>
            </div>
          </div>
        )}

        <div className={`space-y-6 ${!shieldEnabled ? "pointer-events-none select-none filter opacity-30" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PANEL: Active Alarms */}
            <div 
              className="p-5 rounded-2xl shadow-sm"
              style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
            >
              <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
                <span className="text-lg">🚨</span>
                <h2 className="text-md font-bold font-mono">Active Threats ({alerts.length})</h2>
              </div>
              {alerts.length === 0 ? (
                <div 
                  className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed"
                  style={{ borderColor: "var(--theme-card-border)", color: "var(--theme-text-muted)" }}
                >
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
                        className={`flex items-start gap-3 border rounded-xl p-3 text-xs ${
                          isManualRollback ? 'bg-blue-500/10 border-blue-500/30' : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <span className={`px-2 py-0.5 font-black uppercase rounded text-[9px] ${
                          isManualRollback ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                          alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                        }`}>{isManualRollback ? "RESTORED" : alert.severity}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between font-bold">
                            <span style={{ color: "var(--theme-fg)" }}>{alert.attackType}</span>
                            <span className="font-mono text-[10px]" style={{ color: "var(--theme-text-muted)" }}>{alert.detectedAt}</span>
                          </div>
                          <p className="leading-tight" style={{ color: "var(--theme-text-muted)" }}>{alert.details}</p>
                          <p className="text-[10px] font-mono" style={{ color: "var(--theme-text-muted)" }}>Source: {alert.source}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL: Mitigation Control Center */}
            <div 
              className="p-5 rounded-2xl shadow-sm"
              style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
            >
              <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
                <span className="text-lg">🛠️</span>
                <h2 className="text-md font-bold">Mitigation Control Center</h2>
              </div>
              {activeMitigations.length === 0 ? (
                <p className="text-xs py-10 text-center font-mono" style={{ color: "var(--theme-text-muted)" }}>Waiting for detection triggers...</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {activeMitigations.map((alert) => {
                    const isResolved = alert.attackType === "MANUAL_ROLLBACK";
                    const isHardBlock = alert.severity === "CRITICAL";

                    return (
                      <div 
                        key={`mit-${alert.id}`} 
                        className="rounded-xl p-3 text-xs flex justify-between items-center transition-all"
                        style={{ backgroundColor: "var(--theme-bg)", border: "1px solid var(--theme-card-border)" }}
                      >
                        <div>
                          <p className="font-bold">{alert.mitigation?.action || "Quarantine Block"}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--theme-text-muted)" }}>
                            Reason: {alert.mitigation?.reason || "N/A"} — Target: {alert.source}
                          </p>
                        </div>
                        {isResolved ? (
                          <span className="text-[10px] font-mono bg-green-500/10 text-green-500 border border-green-500/30 px-2.5 py-1 rounded-lg font-bold">
                            Active Restored
                          </span>
                        ) : (isHardBlock && activeController === "onos") ? (
                          <button
                            onClick={() => handleUnlockPort(alert.source)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                          >
                            {actionLoading === alert.source ? "Processing..." : "Unlock Port"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono bg-orange-500/10 text-orange-500 border border-orange-500/30 px-2.5 py-1 rounded-lg font-bold">
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
            <div 
              className="p-5 rounded-2xl shadow-sm"
              style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
            >
              <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
                <span className="text-lg">🔌</span>
                <h2 className="text-md font-bold">Dynamic Port Classification Matrix</h2>
              </div>
              {ports.length === 0 ? (
                <p className="text-xs py-10 text-center" style={{ color: "var(--theme-text-muted)" }}>Awaiting topology discovery...</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-2">
                  {ports.map((port, idx) => {
                    const isRecovering = port.status?.includes("Recovered") || port.status?.includes("recovering") || port.status === "Blocked/Testing" || port.status === "Monitoring";
                    const isBlocked = port.status === "Blocked" || port.status === "UNTRUSTED";
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between border rounded-xl p-3 text-xs transition-all ${
                          isRecovering ? "bg-yellow-500/10 border-yellow-500/30 animate-pulse" : ""
                        }`}
                        style={{ backgroundColor: isRecovering ? undefined : "var(--theme-bg)", borderColor: isRecovering ? undefined : "var(--theme-card-border)" }}
                      >
                        <div>
                          <p className="font-bold">{port.switchId}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--theme-text-muted)" }}>Port {port.portNo} • {port.lastUpdated}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                            port.classification === "TRUSTED" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                            port.classification === "UNTRUSTED" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                            "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          }`}>{port.classification}</span>
                          
                          {isRecovering ? (
                            <span className="flex items-center gap-1 font-mono font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px]">
                               <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                               AUTO-RECOVERING
                            </span>
                          ) : (
                            <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[10px] ${
                                isBlocked ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
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
            <div 
              className="p-5 rounded-2xl shadow-sm"
              style={{ backgroundColor: "var(--theme-card)", border: "1px solid var(--theme-card-border)" }}
            >
              <div className="flex items-center gap-2 pb-3 mb-4" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
                <span className="text-lg">📊</span>
                <h2 className="text-md font-bold font-mono">RTT Performance Baselines (EMA)</h2>
              </div>
              {latency.length === 0 ? (
                <p className="text-xs py-10 text-center italic" style={{ color: "var(--theme-text-muted)" }}>Calibrating link-specific baselines...</p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                  {latency.map((link, idx) => (
                    <div 
                      key={idx} 
                      className="rounded-xl p-3 text-xs space-y-3 shadow-sm transition-colors"
                      style={{ backgroundColor: "var(--theme-bg)", border: "1px solid var(--theme-card-border)" }}
                    >
                      <div className="flex justify-between items-center pb-2" style={{ borderBottom: "1px solid var(--theme-card-border)" }}>
                         <p className="font-mono font-bold truncate max-w-[200px]" style={{ color: "var(--theme-text-muted)" }}>{link.link}</p>
                         <span className={`font-black text-[9px] px-2 py-0.5 rounded-full ${link.status === "Anomalous" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                            {link.status}
                         </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <span className="text-[9px] block uppercase font-bold" style={{ color: "var(--theme-text-muted)" }}>Current</span>
                          <span className={`text-xs font-black ${link.status === "Anomalous" ? "text-red-500" : ""}`}>{link.currentRtt?.toFixed(2) || "0.0"} ms</span>
                        </div>
                        <div className="text-center" style={{ borderLeft: "1px solid var(--theme-card-border)", borderRight: "1px solid var(--theme-card-border)" }}>
                          <span className="text-[9px] block uppercase font-bold" style={{ color: "var(--theme-text-muted)" }}>Baseline</span>
                          <span className="text-xs font-black text-blue-500">{link.baselineRtt?.toFixed(2) || "0.0"} ms</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] block uppercase font-bold" style={{ color: "var(--theme-text-muted)" }}>Limit</span>
                          <span className="text-xs font-black" style={{ color: "var(--theme-text-muted)" }}>{link.threshold?.toFixed(2) || "5.0"} ms</span>
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
      
      <div className="mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3" style={{ borderTop: "1px solid var(--theme-card-border)" }}>
          <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "var(--theme-text-muted)" }}>
            LINK-GUARD Security Stack • MD-SAL Operational Datastore Connected
          </p>
          <div className="flex gap-4">
             <span className="text-[10px]" style={{ color: "var(--theme-text-muted)" }}>OpenFlow 1.3</span>
             <span className="text-[10px]" style={{ color: "var(--theme-text-muted)" }}>YANG Model v24.08</span>
          </div>
      </div>
    </div>
  );
}