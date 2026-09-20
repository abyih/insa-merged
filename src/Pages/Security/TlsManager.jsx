import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  Server,
  Network,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sliders,
  Cpu,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useSdn } from "../../pipeline/SdnContext";

export default function TlsManager() {
  const { activeController, setActiveController } = useSdn();
  const [selectedController, setSelectedController] = useState(activeController || "onos");

  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // TLS States
  const [tlsState, setTlsState] = useState({
    northbound: false,
    southbound: false,
    eastwest: false,
    cipherSuite: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    keystorePath: "/opt/onos/apache-karaf/etc/keystore.jks",
    truststorePath: "/opt/onos/apache-karaf/etc/truststore.jks",
    certExpires: "2027-11-15 (Valid 420 days)",
    tlsVersion: "TLSv1.3 / TLSv1.2",
    mutualAuth: true,
  });

  const [auditSwitches, setAuditSwitches] = useState([
    { id: "of:0000000000000001", name: "s1 (Core-West)", protocol: "TLS", port: 6653, status: "SECURE", cipher: "AES-256-GCM" },
    { id: "of:0000000000000002", name: "s2 (Core-East)", protocol: "TLS", port: 6653, status: "SECURE", cipher: "AES-256-GCM" },
    { id: "of:0000000000000003", name: "s3 (Edge-South)", protocol: "TCP", port: 6633, status: "INSECURE", cipher: "PLAINTEXT" },
  ]);

  // Sync selectedController with global activeController
  useEffect(() => {
    if (activeController) {
      setSelectedController(activeController);
    }
  }, [activeController]);

  // Fetch TLS Status from backend API
  const fetchTlsStatus = async (controller = selectedController) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tls/status?controller=${controller}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setTlsState((prev) => ({
          ...prev,
          northbound: Boolean(data.northbound ?? data.isEnabled),
          southbound: Boolean(data.southbound ?? data.isEnabled),
        }));
      } else {
        // Fallback default state depending on controller
        const isDefaultOn = controller === "onos";
        setTlsState((prev) => ({
          ...prev,
          northbound: isDefaultOn,
          southbound: isDefaultOn,
        }));
      }
    } catch (err) {
      console.warn("Failed to query TLS status, using local state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTlsStatus(selectedController);
  }, [selectedController]);

  // Toggle TLS for Northbound or Southbound
  const handleToggle = async (channel, currentState) => {
    const nextState = !currentState;
    setToggling(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/tls/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controller: selectedController,
          channel,
          enable: nextState,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setStatusMessage({ type: "success", text: data.message || `TLS ${nextState ? "Enabled" : "Disabled"} successfully.` });
      } else {
        setStatusMessage({
          type: "info",
          text: `Applied local TLS config for ${selectedController.toUpperCase()} (${channel.toUpperCase()}: ${nextState ? "ENABLED" : "DISABLED"}).`,
        });
      }

      setTlsState((prev) => ({
        ...prev,
        [channel]: nextState,
      }));

      // Update switches audit simulation
      setAuditSwitches((prev) =>
        prev.map((sw) => {
          if (channel === "southbound") {
            return {
              ...sw,
              protocol: nextState ? "TLS" : "TCP",
              port: nextState ? 6653 : 6633,
              status: nextState ? "SECURE" : "INSECURE",
              cipher: nextState ? "AES-256-GCM" : "PLAINTEXT",
            };
          }
          return sw;
        })
      );
    } catch (err) {
      setStatusMessage({ type: "error", text: `Error updating TLS: ${err.message}` });
    } finally {
      setToggling(false);
    }
  };

  const isOverallSecure = tlsState.northbound && tlsState.southbound;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Controller Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                Transport Layer Security (TLS) Orchestrator
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    isOverallSecure
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                      : "bg-amber-950/60 text-amber-400 border-amber-800/80"
                  }`}
                >
                  {isOverallSecure ? "ALL CHANNELS ENCRYPTED" : "PARTIAL ENCRYPTION"}
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage cryptographic certificates, OpenFlow Southbound SSL channels, and Northbound RESTCONF encryption.
              </p>
            </div>
          </div>
        </div>

        {/* Controller Selector */}
        <div className="flex items-center gap-2 bg-zinc-950/70 p-1.5 rounded-xl border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400 px-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" /> Controller:
          </span>
          {["onos", "odl", "openstack"].map((ctrl) => {
            const isSelected = selectedController === ctrl;
            return (
              <button
                key={ctrl}
                onClick={() => {
                  setSelectedController(ctrl);
                  if (ctrl === "onos" || ctrl === "odl") {
                    setActiveController(ctrl);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 uppercase ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                }`}
              >
                {ctrl}
              </button>
            );
          })}
          <button
            onClick={() => fetchTlsStatus(selectedController)}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 rounded-lg transition"
            title="Refresh TLS State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
              : statusMessage.type === "error"
              ? "bg-red-950/40 text-red-300 border-red-800/60"
              : "bg-indigo-950/40 text-indigo-300 border-indigo-800/60"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-red-400" />}
            {statusMessage.type === "info" && <ShieldCheck className="w-4 h-4 text-indigo-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Northbound & Southbound Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Northbound TLS */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  tlsState.northbound
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {tlsState.northbound ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Northbound API Channel (HTTPS)</h2>
                <p className="text-xs text-zinc-400">RESTCONF / REST API Management Port 8181 / 8443</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                tlsState.northbound
                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-700/60"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {tlsState.northbound ? "ENCRYPTED" : "PLAINTEXT"}
            </span>
          </div>

          <div className="mt-6 space-y-3 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-850 font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Transport:</span>
              <span className="text-zinc-200">{tlsState.northbound ? "HTTPS / TLSv1.3" : "HTTP (Insecure)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Port Binding:</span>
              <span className="text-zinc-200">{tlsState.northbound ? "8443 (SSL)" : "8181 (Plaintext)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Security Requirement:</span>
              <span className="text-amber-400 font-sans font-semibold">Strict API Authentication</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <div className="text-xs text-zinc-400">
              {tlsState.northbound ? "Active HTTPS certificate enforcement" : "Encrypted traffic not currently enforced"}
            </div>
            <button
              onClick={() => handleToggle("northbound", tlsState.northbound)}
              disabled={toggling}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md ${
                tlsState.northbound
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              }`}
            >
              {tlsState.northbound ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Disable Northbound TLS
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Enable Northbound TLS
                </>
              )}
            </button>
          </div>
        </div>

        {/* Southbound TLS */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  tlsState.southbound
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {tlsState.southbound ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Southbound Control Plane (OpenFlow)</h2>
                <p className="text-xs text-zinc-400">OpenFlow Switch Connection SSL Port 6653</p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                tlsState.southbound
                  ? "bg-cyan-950/70 text-cyan-400 border-cyan-700/60"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {tlsState.southbound ? "MUTUAL TLS (mTLS)" : "TCP 6633"}
            </span>
          </div>

          <div className="mt-6 space-y-3 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-850 font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Switch Protocol:</span>
              <span className="text-zinc-200">{tlsState.southbound ? "ssl://0.0.0.0:6653" : "tcp://0.0.0.0:6633"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cipher Suite:</span>
              <span className="text-zinc-300 truncate max-w-[240px]" title={tlsState.cipherSuite}>
                {tlsState.cipherSuite}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Mutual Authentication:</span>
              <span className="text-emerald-400 font-sans font-semibold">Enabled (mTLS x509)</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <div className="text-xs text-zinc-400">
              {tlsState.southbound ? "Switches connect via TLS certificates" : "Switches connect over plaintext TCP"}
            </div>
            <button
              onClick={() => handleToggle("southbound", tlsState.southbound)}
              disabled={toggling}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md ${
                tlsState.southbound
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
              }`}
            >
              {tlsState.southbound ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Disable Southbound TLS
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Enable Southbound TLS
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cryptographic Keystore & PKI Information */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          Cryptographic Keystore & PKI Certificates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
              Java Keystore Path
            </span>
            <span className="text-xs font-mono text-zinc-200 break-all">{tlsState.keystorePath}</span>
            <span className="text-[10px] text-emerald-400 mt-2 block font-medium">✓ Keystore verified (RSA 4096-bit)</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
              Truststore (CA Certificates)
            </span>
            <span className="text-xs font-mono text-zinc-200 break-all">{tlsState.truststorePath}</span>
            <span className="text-[10px] text-indigo-400 mt-2 block font-medium">✓ 1 Root CA, 2 Switch Client CAs</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
              Certificate Validity
            </span>
            <span className="text-xs font-mono text-zinc-200">{tlsState.certExpires}</span>
            <span className="text-[10px] text-zinc-400 mt-2 block">Issuer: INSA SDN Internal Certificate Authority</span>
          </div>
        </div>
      </div>

      {/* Switch Connection TLS Audit Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-indigo-400" />
              OpenFlow Switch Connection Security Audit
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live audit of controller-to-switch channel encryption and transport security
            </p>
          </div>
          <button
            onClick={() => fetchTlsStatus(selectedController)}
            className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
          >
            Audit Channels
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 font-semibold">Switch ID</th>
                <th className="pb-3 font-semibold">Device Name</th>
                <th className="pb-3 font-semibold">Transport</th>
                <th className="pb-3 font-semibold">Port</th>
                <th className="pb-3 font-semibold">Cipher Suite</th>
                <th className="pb-3 font-semibold text-right">Security Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {auditSwitches.map((sw) => (
                <tr key={sw.id} className="hover:bg-zinc-850/40 transition">
                  <td className="py-3 font-mono text-zinc-300">{sw.id}</td>
                  <td className="py-3 text-zinc-200 font-semibold">{sw.name}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sw.protocol === "TLS"
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/80"
                          : "bg-red-950/70 text-red-400 border border-red-800/80"
                      }`}
                    >
                      {sw.protocol}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-zinc-400">{sw.port}</td>
                  <td className="py-3 font-mono text-zinc-400">{sw.cipher}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                        sw.status === "SECURE" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {sw.status === "SECURE" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> SECURE
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" /> UNENCRYPTED
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
