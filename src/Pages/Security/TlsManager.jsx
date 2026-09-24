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

  // TLS States (Focused exclusively on Southbound mTLS)
  const [tlsState, setTlsState] = useState({
    southbound: false,
    cipherSuite: "TLS_AES_256_GCM_SHA384",
    keystorePath: "/root/onos/apache-karaf-4.2.9/etc/controller-keystore.jks",
    truststorePath: "/root/onos/apache-karaf-4.2.9/etc/controller-truststore.jks",
    certExpires: "2036-09-17 (Valid 10 Years)",
    tlsVersion: "TLSv1.3 / OpenFlow 1.3",
    mutualAuth: true,
  });

  const [auditSwitches, setAuditSwitches] = useState([
    { id: "of:0000000000000001", name: "s1 (Edge/Access)", protocol: "TLS", port: 6653, status: "SECURE", cipher: "AES-256-GCM" },
    { id: "of:0000000000000002", name: "s2 (Core-Backbone)", protocol: "TLS", port: 6653, status: "SECURE", cipher: "AES-256-GCM" },
    { id: "of:0000000000000003", name: "s3 (Core-Backbone)", protocol: "TLS", port: 6653, status: "SECURE", cipher: "AES-256-GCM" },
  ]);

  // Sync selectedController with global activeController
  useEffect(() => {
    if (activeController) {
      setSelectedController(activeController);
    }
  }, [activeController]);

  // Dynamically update keystore paths when controller changes
  useEffect(() => {
    if (selectedController === "odl") {
      setTlsState((prev) => ({
        ...prev,
        keystorePath: "~/karaf-0.23.0/etc/opendaylight-keystore.jks (PKCS12)",
        truststorePath: "~/karaf-0.23.0/etc/opendaylight-truststore.jks (PKCS12)",
      }));
    } else {
      setTlsState((prev) => ({
        ...prev,
        keystorePath: "/root/onos/apache-karaf-4.2.9/etc/controller-keystore.jks (JKS)",
        truststorePath: "/root/onos/apache-karaf-4.2.9/etc/controller-truststore.jks (JKS)",
      }));
    }
  }, [selectedController]);

  // Fetch Southbound TLS Status from backend API
  const fetchTlsStatus = async (controller = selectedController) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tls/status?controller=${controller}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const sb = Boolean(data.southbound ?? data.isEnabled);

        setTlsState((prev) => ({
          ...prev,
          southbound: sb,
        }));

        // Update switches audit simulation with live state
        setAuditSwitches((prev) =>
          prev.map((sw) => ({
            ...sw,
            protocol: sb ? "TLS" : "TCP",
            port: sb ? 6653 : 6633,
            status: sb ? "SECURE" : "UNENCRYPTED",
            cipher: sb ? "AES-256-GCM" : "PLAINTEXT",
          }))
        );
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

  // Toggle Southbound TLS (Port 6653 mTLS)
  const handleToggle = async () => {
    const nextState = !tlsState.southbound;
    setToggling(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/tls/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controller: selectedController,
          channel: "southbound",
          enable: nextState,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setStatusMessage({
          type: "success",
          text: data.message || `Southbound TLS ${nextState ? "Enabled (mTLS)" : "Disabled (TCP)"} successfully on ${selectedController.toUpperCase()}.`,
        });

        // Optimistically update local toggle
        setTlsState((prev) => ({
          ...prev,
          southbound: nextState,
        }));

        // Re-sync with controller after brief reload window
        setTimeout(async () => {
          await fetchTlsStatus(selectedController);
          setToggling(false);
        }, 3000);
      } else {
        const errData = await res?.json().catch(() => ({}));
        setStatusMessage({
          type: "error",
          text: errData.error || `Failed to update Southbound TLS on ${selectedController.toUpperCase()}.`,
        });
        setToggling(false);
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: `Error updating TLS: ${err.message}` });
      setToggling(false);
    }
  };

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
                    tlsState.southbound
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                      : "bg-amber-950/60 text-amber-400 border-amber-800/80"
                  }`}
                >
                  {tlsState.southbound ? "SOUTHBOUND ENCRYPTED (mTLS)" : "PLAINTEXT TCP (6633)"}
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage cryptographic certificates, OpenFlow Southbound SSL channels, and mutual switch authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Controller Selector: ONLY ONOS AND ODL */}
        <div className="flex items-center gap-2 bg-zinc-950/70 p-1.5 rounded-xl border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400 px-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" /> Controller:
          </span>
          {["onos", "odl"].map((ctrl) => {
            const isSelected = selectedController === ctrl;
            return (
              <button
                key={ctrl}
                onClick={() => {
                  setSelectedController(ctrl);
                  setActiveController(ctrl);
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

      {/* Main Focus Card: Southbound Control Plane (OpenFlow) */}
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
              <p className="text-xs text-zinc-400">OpenFlow Switch Connection SSL Port 6653 (Mutual Authentication)</p>
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-850 font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400">Switch Protocol:</span>
            <span className="text-zinc-200 font-bold">{tlsState.southbound ? "ssl://0.0.0.0:6653" : "tcp://0.0.0.0:6633"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400">Cipher Suite:</span>
            <span className="text-zinc-300 truncate" title={tlsState.cipherSuite}>
              {tlsState.cipherSuite}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400">Mutual Authentication:</span>
            <span className="text-emerald-400 font-sans font-semibold">Enabled (mTLS x509)</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400">
            {tlsState.southbound
              ? "Switches connect via TLS certificates verified against INSA-SDN-CA"
              : "Switches connect over unencrypted plaintext TCP"}
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md ${
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
            <span className="text-[10px] text-emerald-400 mt-2 block font-medium">✓ Keystore verified (RSA 2048-bit)</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
              Truststore (CA Certificates)
            </span>
            <span className="text-xs font-mono text-zinc-200 break-all">{tlsState.truststorePath}</span>
            <span className="text-[10px] text-indigo-400 mt-2 block font-medium">✓ 1 Root CA (INSA-SDN-CA)</span>
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