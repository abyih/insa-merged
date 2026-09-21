import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Wrench,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ApiTester = () => {
  const [activeTab, setActiveTab] = useState("sandbox");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  // TLS State
  const [selectedController, setSelectedController] = useState("odl");
  const [isTlsEnabled, setIsTlsEnabled] = useState(false);
  const [tlsLoading, setTlsLoading] = useState(false);
  const [tlsMessage, setTlsMessage] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const authHeader = `Basic ${btoa("admin:admin")}`;

  useEffect(() => {
    if (activeTab === "tls") {
      fetchTlsStatus(selectedController);
    }
  }, [activeTab, selectedController]);

  const fetchTlsStatus = async (controller) => {
    setTlsLoading(true);
    setTlsMessage(null);
    try {
      const res = await axios.get(`/api/tls/status?controller=${controller}`);
      setIsTlsEnabled(res.data.isEnabled);
    } catch (err) {
      console.error("Error reading TLS state:", err);
      setTlsMessage({
        type: "error",
        text: "Could not read configuration state. Verify target controller paths in local .env configuration.",
      });
    } finally {
      setTlsLoading(false);
    }
  };

  // ONOS runs as a background job (it may restart the container, taking minutes).
  // Poll until the backend reports done/error.
  const waitForTlsJob = async (controller) => {
    const deadline = Date.now() + 6 * 60 * 1000;
    while (Date.now() < deadline) {
      await sleep(3000);
      try {
        const { data } = await axios.get(`/api/tls/job?controller=${controller}`);
        if (data.state === "done") return { ok: true, message: data.message };
        if (data.state === "error") return { ok: false, message: data.message };
      } catch (e) {
        // backend briefly busy - keep polling
      }
    }
    return { ok: false, message: "Timed out waiting for the controller to apply the change." };
  };

  const handleTlsToggle = async () => {
    setTlsLoading(true);
    setTlsMessage(null);
    const targetState = !isTlsEnabled;

    try {
      const res = await axios.post("/api/tls/toggle", {
        controller: selectedController,
        enable: targetState,
      });

      let ok = !!res.data.success;
      let errorText = null;

      if (res.data.pending) {
        setTlsMessage({
          type: "info",
          text: "Applying TLS configuration. ONOS may restart, which can take up to ~3 minutes...",
        });
        const result = await waitForTlsJob(selectedController);
        ok = result.ok;
        errorText = result.message;
      }

      if (ok) {
        setIsTlsEnabled(targetState);
        setShowWarning(true);
        setTlsMessage({
          type: "success",
          text: `TLS configuration successfully updated to ${
            targetState ? "ENABLED (mTLS)" : "DISABLED (Plaintext TCP)"
          }.`,
        });
      } else {
        setTlsMessage({
          type: "error",
          text: `Failed to apply configuration. ${errorText || ""}`,
        });
      }
    } catch (err) {
      console.error("Error updating TLS state:", err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message;
      setTlsMessage({
        type: "error",
        text: `Failed to write configurations. System Error: ${errorMsg}`,
      });
    } finally {
      setTlsLoading(false);
    }
  };

  const handleRequest = () => {
    let parsedBody = null;
    if (body) {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        setError(`Invalid request body JSON: ${e.message}`);
        setResponse(null);
        return;
      }
    }

    const config = {
      method,
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      data: parsedBody,
    };

    axios(config)
      .then((res) => {
        setResponse(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error response:", err.response?.data?.errors || err.message);
        setError(err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message);
        setResponse(null);
      });
  };

  const bannerClass = (type) =>
    type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : type === "info"
      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
      : "bg-red-500/10 border-red-500/20 text-red-400";

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-zinc-100">
      {/* Navigation Header Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => setActiveTab("sandbox")}
          className={`pb-3.5 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "sandbox"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>API Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab("tls")}
          className={`pb-3.5 px-2 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "tls"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>SDN TLS Orchestration</span>
        </button>
      </div>

      {/* TAB 1: API Sandbox */}
      {activeTab === "sandbox" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-400" />
              API Request Tester
            </h2>
            <p className="text-xs text-zinc-400">
              Perform direct REST/RESTCONF calls to active controller datastores with default admin
              authentication.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  HTTP Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 transition"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Request URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter API Endpoint (e.g., /api/rests/data/... or /onos/v1/...)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition"
                  />
                  <button
                    onClick={handleRequest}
                    className="bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition duration-150 shadow-md active:scale-[0.98]"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {(method === "POST" || method === "PUT") && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Request Body (JSON)
                </label>
                <textarea
                  placeholder='Enter JSON Body (e.g., { "input": { ... } })'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="6"
                  className="w-full p-4 bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-xs rounded-lg placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition"
                />
              </div>
            )}
          </div>

          {(response || error) && (
            <div className="space-y-4">
              {response && (
                <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6 space-y-3 shadow-xl">
                  <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" />
                    Response Data
                  </h3>
                  <pre className="whitespace-pre-wrap break-words text-xs font-mono text-zinc-200 bg-zinc-950 border border-zinc-800 p-4 rounded-xl max-h-[450px] overflow-y-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}

              {error && (
                <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 space-y-3 shadow-xl">
                  <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    Error Diagnostics
                  </h3>
                  <pre className="whitespace-pre-wrap break-words text-xs font-mono text-red-400 bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                    {error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SDN TLS Orchestration */}
      {activeTab === "tls" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-50 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Security Engine Management
            </h2>
            <p className="text-xs text-zinc-400">
              Dynamically orchestrate mutual TLS cryptographic handshakes across Southbound (OpenFlow
              port 6653) and Cluster control channels.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Target Controller Environment
              </label>
              <div className="relative">
                <select
                  value={selectedController}
                  onChange={(e) => setSelectedController(e.target.value)}
                  disabled={tlsLoading}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition appearance-none cursor-pointer"
                >
                  <option value="odl">OpenDaylight (Native Host — PKCS12 Keystores)</option>
                  <option value="onos">ONOS (Docker Container — JKS Keystores)</option>
                </select>
                <Layers className="w-4 h-4 text-zinc-500 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-950/70 flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-bold text-zinc-200 block text-sm flex items-center gap-2">
                  Control Plane Encryption (Port 6653)
                  {isTlsEnabled ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                      Strict mTLS
                    </span>
                  ) : (
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                      Plaintext TCP
                    </span>
                  )}
                </span>
                <span className="text-xs text-zinc-400 block">
                  Enforces RSA-2048 certificate validation and symmetric cipher negotiation on socket
                  endpoints.
                </span>
              </div>

              <div className="flex items-center gap-3">
                {tlsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                ) : (
                  <button
                    onClick={handleTlsToggle}
                    disabled={tlsLoading}
                    className={`w-14 h-7 rounded-full transition-colors relative focus:outline-none ${
                      isTlsEnabled ? "bg-indigo-500" : "bg-zinc-800 border border-zinc-700"
                    } ${tlsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform shadow ${
                        isTlsEnabled ? "translate-x-7" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {tlsMessage && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold border flex items-start gap-2.5 ${bannerClass(
                  tlsMessage.type
                )}`}
              >
                {tlsMessage.type === "success" ? (
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                ) : tlsMessage.type === "info" ? (
                  <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="whitespace-pre-wrap break-words">{tlsMessage.text}</span>
              </div>
            )}

            {showWarning && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-5 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    Configuration Update Registered
                  </h4>
                  <button
                    onClick={() => setShowWarning(false)}
                    className="text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md border border-amber-500/30 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/80">
                  {selectedController === "odl" ? (
                    <span>
                      The configuration changes have been hot-reloaded dynamically into OpenDaylight
                      via its RESTCONF datastore. Restart your <strong>Mininet</strong> topology with
                      matching protocol flags (`protocol=ssl` or `protocol=tcp`) to negotiate the
                      socket context.
                    </span>
                  ) : (
                    <span>
                      ONOS confirmed it is now running with the new TLS mode. Re-launch your{" "}
                      <strong>Mininet</strong> topology with `protocol=ssl` (TLS on) or
                      `protocol=tcp` (TLS off) to verify the handshake.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiTester;
