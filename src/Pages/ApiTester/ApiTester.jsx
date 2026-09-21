// ─────────────────────────────────────────────────────────────────────────────
// ApiTester.jsx — "SDN Controller Tools": controller diagnostics, quick
// operations, and a scoped custom API request panel.
//
// Everything here goes through controllerManager (never a specific adapter
// directly) so Quick Operations work unmodified against ODL or ONOS. Custom
// requests go through apiController.proxyRequest, which forwards to
// server.js's /api/tools/proxy — the browser never sees ODL/ONOS credentials,
// and the old raw axios + hardcoded Basic auth this page used to ship is gone.
//
// Nothing here paints "Available"/"Connected"/"Verified" without a real
// underlying API call succeeding — where a controller genuinely doesn't
// support something yet (ONOS flow correlation, ONOS queue/meter checks),
// the UI says so plainly instead of guessing.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wrench, Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Copy, Trash2, Send, Network, Server, Laptop, GitBranch, BarChart3,
  ShieldCheck, Gauge, Clock, Zap, Radio, Terminal, Fuel,
} from "lucide-react";
import * as controllerManager from "../../api/controllerManager";
import { getQueueState, getMeter, proxyRequest, getTlsStatus } from "../../api/apiController";
import { useSlices } from "../../pipeline/SliceContext";

const HISTORY_LIMIT = 20;
const METHODS = ["GET", "POST", "PUT", "DELETE"];

// Relative to server.js's ODL_BASE_URL ("http://127.0.0.1:8181/rests/data") —
// verified live against the running stack before being hardcoded here.
const ODL_SUGGESTIONS = [
  { label: "Topology", path: "/network-topology:network-topology" },
  { label: "Inventory (all switches)", path: "/opendaylight-inventory:nodes" },
  { label: "Switch Detail (flows + meters) — switch 1", path: "/opendaylight-inventory:nodes/node=openflow:1" },
];

// Relative to server.js's ONOS_BASE_URL ("http://<host>:8183/onos/v1") —
// also verified live. No meter-equivalent chip: ONOS has no meter concept.
const ONOS_SUGGESTIONS = [
  { label: "Topology Summary", path: "/topology" },
  { label: "Devices", path: "/devices" },
  { label: "Hosts", path: "/hosts" },
  { label: "Links", path: "/links" },
  { label: "Flows", path: "/flows" },
];

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// Defensive redaction of anything that lands in history/response state — the
// proxy and every controllerManager function already never return
// credentials, but this guards against an operator pasting a secret into a
// custom request body that then gets echoed back.
const SECRET_KEY_RE = /auth|token|password|secret/i;
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY_RE.test(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

// True when a result is an honest "not supported by this adapter" stub
// (single-call shape {supported:false, ...}) or an all-unsupported fan-out
// (the GET FLOWS quick op's {perSwitch:[...]} wrapper on ONOS).
function isUnsupported(data) {
  if (!data) return false;
  if (data.supported === false) return true;
  if (Array.isArray(data.perSwitch) && data.perSwitch.length > 0) {
    return data.perSwitch.every((s) => s.supported === false);
  }
  return false;
}

const SectionCard = ({ title, icon, action, children }) => (
  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 mb-8">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em] flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </div>
);

const Pill = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
      ok
        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
        : "bg-red-50 text-red-600 border border-red-100"
    }`}
  >
    {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {label}
  </span>
);

const StatusDot = ({ state }) => (
  <span
    className={`w-2 h-2 rounded-full ${
      state === "checking" ? "bg-slate-400 animate-pulse" : state === "connected" ? "bg-emerald-400" : "bg-red-500"
    }`}
  />
);

const HEALTH_ROW_STYLES = {
  idle: { icon: <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />, text: "Not Checked", cls: "text-slate-400" },
  checking: { icon: <RefreshCw size={14} className="animate-spin text-slate-400" />, text: "Checking…", cls: "text-slate-400" },
  ok: { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: "Available", cls: "text-emerald-600" },
  error: { icon: <XCircle size={14} className="text-red-500" />, text: "Error", cls: "text-red-600" },
  unsupported: { icon: <AlertTriangle size={14} className="text-amber-500" />, text: "Not Supported", cls: "text-amber-600" },
};

const HealthRow = ({ label, check }) => {
  const cfg = HEALTH_ROW_STYLES[check.state] || HEALTH_ROW_STYLES.idle;
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-bold text-slate-700 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {check.detail && (
          <span className="text-[11px] text-slate-400 truncate max-w-[16rem]" title={check.detail}>
            {check.detail}
          </span>
        )}
        {cfg.icon}
        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${cfg.cls}`}>{cfg.text}</span>
      </div>
    </div>
  );
};

const QuickOpButton = ({ label, icon, loading, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-700 rounded-2xl py-6 px-4 transition-all shadow-sm text-slate-700"
  >
    <span className={loading ? "animate-spin" : ""}>{icon}</span>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const HistoryRow = ({ entry, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all ${
      active ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-[10px] font-black uppercase text-slate-400 w-12 shrink-0">{entry.method}</span>
      <span className="text-xs font-mono text-slate-600 truncate">{entry.endpoint}</span>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className={`text-[10px] font-black uppercase ${entry.ok ? "text-emerald-600" : "text-red-500"}`}>{entry.status ?? "ERR"}</span>
      <span className="text-[10px] text-slate-400 font-mono">{entry.timeMs}ms</span>
    </div>
  </button>
);

const EMPTY_HEALTH = {
  apiConnection: { state: "idle" },
  topology: { state: "idle" },
  devices: { state: "idle" },
  hosts: { state: "idle" },
  flows: { state: "idle" },
  tls: { state: "idle" },
};

const ApiTester = () => {
  const { slices } = useSlices();

  const [controller, setController] = useState(() => controllerManager.getActiveController());
  const [controllerStatus, setControllerStatus] = useState(null); // null = checking
  const [testingConnection, setTestingConnection] = useState(false);

  const [health, setHealth] = useState(EMPTY_HEALTH);
  const [healthRunning, setHealthRunning] = useState(false);

  const [quickOpLoading, setQuickOpLoading] = useState({});
  const [flowScope, setFlowScope] = useState(""); // "" = all switches
  const [history, setHistory] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const [customForm, setCustomForm] = useState({ method: "GET", path: "", body: "" });
  const [customSending, setCustomSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [deviceOptions, setDeviceOptions] = useState([]);

  const [verifySliceId, setVerifySliceId] = useState("");
  const [verifySliceResult, setVerifySliceResult] = useState(null);
  const [verifyingSlice, setVerifyingSlice] = useState(false);

  const [checkQueueForm, setCheckQueueForm] = useState({ nodeId: "", port: "" });
  const [checkingQueue, setCheckingQueue] = useState(false);
  const [checkQueueResult, setCheckQueueResult] = useState(null);

  const [checkMeterForm, setCheckMeterForm] = useState({ nodeId: "", meterId: "" });
  const [checkingMeter, setCheckingMeter] = useState(false);
  const [checkMeterResult, setCheckMeterResult] = useState(null);

  const controllerLabel = controllerManager.CONTROLLERS[controller]?.label || controller;
  const suggestions = controller === "odl" ? ODL_SUGGESTIONS : ONOS_SUGGESTIONS;
  const selectedSlice = useMemo(() => slices.find((s) => String(s.id) === verifySliceId) || null, [slices, verifySliceId]);
  const selectedEntry = history.find((h) => h.id === selectedEntryId) || null;

  // Header's own controller toggle (and any future one) dispatches this on
  // change; Header itself never listens for it, so this page reads it
  // directly rather than relying on Header to relay anything.
  useEffect(() => {
    const sync = () => setController(controllerManager.getActiveController());
    window.addEventListener("sdn:controller-changed", sync);
    return () => window.removeEventListener("sdn:controller-changed", sync);
  }, []);

  const runConnectionTest = useCallback(async () => {
    setTestingConnection(true);
    const result = await controllerManager.getControllerStatus();
    setControllerStatus(result);
    setTestingConnection(false);
    return result;
  }, []);

  // A health/connection result from the previous controller must never
  // linger after a switch — reset and re-derive everything for real.
  useEffect(() => {
    setControllerStatus(null);
    setHealth(EMPTY_HEALTH);
    setVerifySliceResult(null);
    setCheckQueueResult(null);
    setCheckMeterResult(null);
    // Unlike Check Queue/Meter's nodeId (translated to the right dpid format
    // regardless of which controller is active — see toHexDpid/toOdlNodeId),
    // flowScope is handed straight to controllerManager.getFlows(), which
    // dispatches to whichever adapter is now active and expects ITS id
    // format. A stale id from the other controller wouldn't error — ODL's
    // adapter would just silently return an empty flow list for a node id
    // it can't find, which reads as a false "this switch has no flows"
    // instead of the truth ("that id doesn't apply here anymore").
    setFlowScope("");
    runConnectionTest();
    controllerManager
      .getDevices()
      .then(setDeviceOptions)
      .catch(() => setDeviceOptions([]));
  }, [controller, runConnectionTest]);

  const selectController = (key) => {
    controllerManager.setActiveController(key);
    setController(key);
  };

  const pushHistory = (entry) => {
    setHistory((h) => [entry, ...h].slice(0, HISTORY_LIMIT));
    setSelectedEntryId(entry.id);
  };

  const makeEntry = ({ method, endpoint, status, ok, timeMs, data }) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    endpoint,
    controller,
    status,
    ok,
    timeMs,
    timestamp: Date.now(),
    data: redact(data),
  });

  // ── Quick Operations ──────────────────────────────────────────────────
  const runQuickOp = async (key, endpointLabel, fn) => {
    setQuickOpLoading((s) => ({ ...s, [key]: true }));
    const start = performance.now();
    try {
      const data = await fn();
      const timeMs = Math.round(performance.now() - start);
      const ok = !isUnsupported(data);
      pushHistory(makeEntry({ method: "GET", endpoint: endpointLabel, status: ok ? 200 : "N/A", ok, timeMs, data }));
    } catch (err) {
      const timeMs = Math.round(performance.now() - start);
      pushHistory(
        makeEntry({
          method: "GET",
          endpoint: endpointLabel,
          status: err.response?.status || 0,
          ok: false,
          timeMs,
          data: { error: err.message },
        })
      );
    } finally {
      setQuickOpLoading((s) => ({ ...s, [key]: false }));
    }
  };

  const runHealthCheck = async () => {
    setHealthRunning(true);
    setHealth({ ...EMPTY_HEALTH, apiConnection: { state: "checking" } });

    const status = await controllerManager.getControllerStatus();
    setControllerStatus(status);
    setHealth((h) => ({
      ...h,
      apiConnection: status.connected
        ? { state: "ok", detail: `${status.deviceCount} devices, ${status.hostCount} hosts` }
        : { state: "error", detail: status.error || "Unreachable" },
    }));

    if (!status.connected) {
      setHealth((h) => ({
        ...h,
        topology: { state: "error", detail: "Skipped — connection failed" },
        devices: { state: "error", detail: "Skipped — connection failed" },
        hosts: { state: "error", detail: "Skipped — connection failed" },
        flows: { state: "error", detail: "Skipped — connection failed" },
      }));
      setHealthRunning(false);
      return;
    }

    setHealth((h) => ({ ...h, topology: { state: "checking" } }));
    try {
      await controllerManager.getTopology();
      setHealth((h) => ({ ...h, topology: { state: "ok" } }));
    } catch (err) {
      setHealth((h) => ({ ...h, topology: { state: "error", detail: err.message } }));
    }

    let deviceIds = [];
    setHealth((h) => ({ ...h, devices: { state: "checking" } }));
    try {
      const devices = await controllerManager.getDevices();
      deviceIds = devices.map((d) => d.id);
      setHealth((h) => ({ ...h, devices: { state: "ok", detail: `${devices.length} found` } }));
    } catch (err) {
      setHealth((h) => ({ ...h, devices: { state: "error", detail: err.message } }));
    }

    setHealth((h) => ({ ...h, hosts: { state: "checking" } }));
    try {
      const hosts = await controllerManager.getHosts();
      setHealth((h) => ({ ...h, hosts: { state: "ok", detail: `${hosts.length} found` } }));
    } catch (err) {
      setHealth((h) => ({ ...h, hosts: { state: "error", detail: err.message } }));
    }

    setHealth((h) => ({ ...h, flows: { state: "checking" } }));
    if (deviceIds.length === 0) {
      setHealth((h) => ({ ...h, flows: { state: "error", detail: "No device to test against" } }));
    } else {
      try {
        const result = await controllerManager.getFlows(deviceIds[0]);
        setHealth((h) => ({
          ...h,
          flows:
            result.supported === false
              ? { state: "unsupported", detail: result.reason }
              : { state: "ok", detail: `${(result.flows || []).length} flows on ${deviceIds[0].split(":").pop()}` },
        }));
      } catch (err) {
        setHealth((h) => ({ ...h, flows: { state: "error", detail: err.message } }));
      }
    }

    // ODL's northbound RESTCONF specifically — independent of which
    // controller is active above, since this is about ODL's own listener.
    setHealth((h) => ({ ...h, tls: { state: "checking" } }));
    try {
      const t = await getTlsStatus();
      if (!t.tls) {
        setHealth((h) => ({ ...h, tls: { state: "error", detail: t.error || t.detail || "Not TLS" } }));
      } else if (!t.authorized) {
        setHealth((h) => ({ ...h, tls: { state: "error", detail: `Untrusted cert (${t.certSubject || "unknown"})` } }));
      } else {
        setHealth((h) => ({
          ...h,
          tls: { state: "ok", detail: `${t.protocol} · ${t.cipher} · CN=${t.certSubject}` },
        }));
      }
    } catch (err) {
      setHealth((h) => ({ ...h, tls: { state: "error", detail: err.message } }));
    }

    setHealthRunning(false);
  };

  const quickOps = [
    { key: "topology", label: "Get Topology", icon: <Network size={22} />, run: () => runQuickOp("topology", "Topology", () => controllerManager.getTopology()) },
    { key: "devices", label: "Get Devices", icon: <Server size={22} />, run: () => runQuickOp("devices", "Devices", () => controllerManager.getDevices()) },
    { key: "hosts", label: "Get Hosts", icon: <Laptop size={22} />, run: () => runQuickOp("hosts", "Hosts", () => controllerManager.getHosts()) },
    {
      key: "flows",
      label: flowScope ? `Get Flows (${flowScope.split(":").pop()})` : "Get Flows (all)",
      icon: <GitBranch size={22} />,
      run: () =>
        flowScope
          ? runQuickOp("flows", `Flows (${flowScope})`, () => controllerManager.getFlows(flowScope))
          : runQuickOp("flows", "Flows (all switches)", async () => {
              const devices = await controllerManager.getDevices();
              const perSwitch = await Promise.all(
                devices.map(async (d) => ({ deviceId: d.id, ...(await controllerManager.getFlows(d.id)) }))
              );
              return { perSwitch };
            }),
    },
    { key: "statistics", label: "Get Statistics", icon: <BarChart3 size={22} />, run: () => runQuickOp("statistics", "Statistics", () => controllerManager.getStatistics()) },
    { key: "health", label: "Controller Health", icon: <Activity size={22} />, run: runHealthCheck },
  ];

  // ── Verify Slice ───────────────────────────────────────────────────────
  const runVerifySlice = async () => {
    if (!selectedSlice) return;
    setVerifyingSlice(true);
    setVerifySliceResult(null);
    const start = performance.now();
    try {
      if (selectedSlice.latency !== "Low" || !selectedSlice.latencyPolicy) {
        setVerifySliceResult({ status: "no-policy" });
        return;
      }
      // Slices are only ever created via ODL, so a target's targetSwitch is
      // always ODL-format (openflow:N) regardless of which controller is
      // active in this page's toggle right now — the queue/meter it points
      // at is real OVS/ODL state either way, so this check isn't gated to
      // "ODL selected" like the Custom API Request panel is.
      const perTarget = await Promise.all(
        selectedSlice.targets.map(async (target) => {
          const live = await getQueueState(target.targetSwitch, target.port);
          const issues = [];
          if (live.status !== "ACTIVE") {
            issues.push("Queue not configured on switch");
          } else if (String(live.sliceId) !== String(selectedSlice.id)) {
            issues.push("Queue belongs to a different slice");
          } else if (live.dscp !== selectedSlice.latencyPolicy.dscp || live.queue !== selectedSlice.latencyPolicy.queue) {
            issues.push("DSCP/queue differs from expected");
          }

          let meter = null;
          if (target.meterId) {
            meter = await getMeter(target.targetSwitch, target.meterId);
            if (meter.status !== "ACTIVE") {
              issues.push("Meter not installed on switch");
            } else if (selectedSlice.qosBandwidth && Number(meter.rateKbps) !== Number(selectedSlice.qosBandwidth)) {
              issues.push(`Meter rate ${meter.rateKbps}Kbps ≠ expected ${selectedSlice.qosBandwidth}Kbps`);
            }
          }

          const verdict = issues.length === 0 ? "verified" : "mismatch";
          const reason = issues.length === 0 ? "Confirmed on switch" : issues.join(" · ");
          return { target, live, meter, verdict, reason };
        })
      );
      setVerifySliceResult({ status: "checked", perTarget });
      const timeMs = Math.round(performance.now() - start);
      const allVerified = perTarget.every((p) => p.verdict === "verified");
      pushHistory(
        makeEntry({
          method: "GET",
          endpoint: `Verify Slice: ${selectedSlice.name}`,
          status: allVerified ? 200 : "MISMATCH",
          ok: allVerified,
          timeMs,
          data: { perTarget },
        })
      );
    } catch (err) {
      setVerifySliceResult({ status: "error", reason: err.message });
    } finally {
      setVerifyingSlice(false);
    }
  };

  // ── Check Queue State ────────────────────────────────────────────────
  const runCheckQueue = async () => {
    if (!checkQueueForm.nodeId || !checkQueueForm.port) return;
    setCheckingQueue(true);
    const start = performance.now();
    try {
      const data = await getQueueState(checkQueueForm.nodeId, checkQueueForm.port);
      const timeMs = Math.round(performance.now() - start);
      setCheckQueueResult(data);
      pushHistory(
        makeEntry({
          method: "GET",
          endpoint: `Queue State: ${checkQueueForm.nodeId}:${checkQueueForm.port}`,
          status: data.status === "ERROR" ? 502 : 200,
          ok: data.status !== "ERROR",
          timeMs,
          data,
        })
      );
    } finally {
      setCheckingQueue(false);
    }
  };

  // ── Check Meter State ────────────────────────────────────────────────
  const runCheckMeter = async () => {
    if (!checkMeterForm.nodeId || !checkMeterForm.meterId) return;
    setCheckingMeter(true);
    const start = performance.now();
    try {
      const data = await getMeter(checkMeterForm.nodeId, checkMeterForm.meterId);
      const timeMs = Math.round(performance.now() - start);
      setCheckMeterResult(data);
      pushHistory(
        makeEntry({
          method: "GET",
          endpoint: `Meter State: ${checkMeterForm.nodeId}:${checkMeterForm.meterId}`,
          status: data.status === "ERROR" ? 502 : 200,
          ok: data.status !== "ERROR",
          timeMs,
          data,
        })
      );
    } finally {
      setCheckingMeter(false);
    }
  };

  // ── Custom API Request ───────────────────────────────────────────────
  const sendCustomRequest = async () => {
    if (!customForm.path || !customForm.path.startsWith("/") || customForm.path.includes("://")) {
      pushHistory(
        makeEntry({
          method: customForm.method,
          endpoint: customForm.path,
          status: 0,
          ok: false,
          timeMs: 0,
          data: { error: 'Path must be a controller-relative path starting with "/"' },
        })
      );
      return;
    }
    if (customForm.method === "DELETE" && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);

    let body;
    if (customForm.body) {
      try {
        body = JSON.parse(customForm.body);
      } catch {
        pushHistory(
          makeEntry({ method: customForm.method, endpoint: customForm.path, status: 0, ok: false, timeMs: 0, data: { error: "Request body is not valid JSON" } })
        );
        return;
      }
    }

    setCustomSending(true);
    try {
      const result = await proxyRequest({ controller, method: customForm.method, path: customForm.path, body });
      pushHistory(
        makeEntry({
          method: customForm.method,
          endpoint: customForm.path,
          status: result.status,
          ok: result.ok,
          timeMs: result.timeMs,
          data: result.data ?? { error: result.error },
        })
      );
    } catch (err) {
      pushHistory(makeEntry({ method: customForm.method, endpoint: customForm.path, status: 0, ok: false, timeMs: 0, data: { error: err.message } }));
    } finally {
      setCustomSending(false);
    }
  };

  const handleCopy = () => {
    if (!selectedEntry) return;
    navigator.clipboard.writeText(prettyJson(selectedEntry.data));
  };

  return (
    <div className="p-6 sm:p-8 bg-slate-50 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase text-slate-900 flex items-center gap-3">
          <Wrench className="text-blue-600" size={32} /> SDN Controller Tools
        </h1>
        <p className="text-slate-500 font-medium mt-2 max-w-xl">
          Controller diagnostics, network operations, and API testing.
        </p>
      </div>

      {/* CONTROLLER */}
      <SectionCard title="Controller" icon={<Radio size={16} className="text-blue-500" />}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
            {Object.values(controllerManager.CONTROLLERS).map((c) => (
              <button
                key={c.key}
                onClick={() => selectController(c.key)}
                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  controller === c.key
                    ? c.key === "odl"
                      ? "bg-yellow-400 text-slate-900 shadow"
                      : "bg-blue-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <StatusDot state={testingConnection || controllerStatus === null ? "checking" : controllerStatus.connected ? "connected" : "offline"} />
            <span className="text-[10px] font-black uppercase text-slate-500">
              {testingConnection || controllerStatus === null ? "Checking" : controllerStatus.connected ? "Connected" : "Offline"}
            </span>
            {controllerStatus?.error && (
              <span className="text-[10px] text-red-500 max-w-[14rem] truncate" title={controllerStatus.error}>
                {controllerStatus.error}
              </span>
            )}
          </div>

          <button
            onClick={runConnectionTest}
            disabled={testingConnection}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase px-6 py-3 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={testingConnection ? "animate-spin" : ""} /> Test Connection
          </button>
        </div>
        {controllerStatus?.connected && (
          <p className="text-[11px] text-slate-400 mt-4">
            {controllerStatus.deviceCount} devices · {controllerStatus.hostCount} hosts discovered
          </p>
        )}
      </SectionCard>

      {/* CONTROLLER HEALTH */}
      <SectionCard
        title="Controller Health"
        icon={<Activity size={16} className="text-blue-500" />}
        action={
          <button
            onClick={runHealthCheck}
            disabled={healthRunning}
            className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 transition-all"
          >
            <RefreshCw size={13} className={healthRunning ? "animate-spin" : ""} /> Run Health Check
          </button>
        }
      >
        <HealthRow label="API Connection" check={health.apiConnection} />
        <HealthRow label="Topology API" check={health.topology} />
        <HealthRow label="Device Discovery" check={health.devices} />
        <HealthRow label="Host Discovery" check={health.hosts} />
        <HealthRow label="Flow API" check={health.flows} />
        <HealthRow label="ODL RESTCONF TLS" check={health.tls} />
      </SectionCard>

      {/* QUICK OPERATIONS */}
      <SectionCard
        title="Quick Operations"
        icon={<Zap size={16} className="text-blue-500" />}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Flows Scope</span>
            <select
              value={flowScope}
              onChange={(e) => setFlowScope(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none focus:border-blue-500"
            >
              <option value="">All Switches</option>
              {deviceOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {quickOps.map((op) => (
            <QuickOpButton
              key={op.key}
              label={op.label}
              icon={op.icon}
              loading={!!quickOpLoading[op.key] || (op.key === "health" && healthRunning)}
              onClick={op.run}
            />
          ))}
        </div>
      </SectionCard>

      {/* SLICE & QOS DIAGNOSTICS */}
      <SectionCard title="Slice & QoS Diagnostics" icon={<ShieldCheck size={16} className="text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Verify Slice */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Verify Slice</label>
            <div className="flex gap-2">
              <select
                value={verifySliceId}
                onChange={(e) => {
                  setVerifySliceId(e.target.value);
                  setVerifySliceResult(null);
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 min-w-0"
              >
                <option value="">Select slice…</option>
                {slices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={runVerifySlice}
                disabled={!selectedSlice || verifyingSlice}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase px-5 py-2.5 rounded-xl text-[11px] flex items-center gap-2 shadow-md shadow-blue-100 shrink-0"
              >
                <RefreshCw size={13} className={verifyingSlice ? "animate-spin" : ""} /> Verify
              </button>
            </div>

            {verifySliceResult?.status === "no-policy" && (
              <p className="text-sm text-slate-400 italic mt-4">This slice has no latency policy to verify.</p>
            )}
            {verifySliceResult?.status === "error" && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs mt-4">
                <XCircle size={16} className="flex-shrink-0" /> {verifySliceResult.reason}
              </div>
            )}
            {verifySliceResult?.status === "checked" && (
              <div className="space-y-3 mt-4">
                {verifySliceResult.perTarget.map(({ target, live, meter, verdict, reason }) => (
                  <div
                    key={`${target.targetSwitch}-${target.port}`}
                    className={`rounded-2xl border p-4 ${verdict === "verified" ? "border-emerald-100 bg-emerald-50/40" : "border-red-100 bg-red-50/40"}`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <p className="font-black text-slate-800 text-xs">
                        {target.targetSwitch.split(":").pop()} · port {target.port}
                      </p>
                      <Pill ok={verdict === "verified"} label={verdict === "verified" ? "Verified" : "Mismatch"} />
                    </div>
                    <p className="text-[11px] text-slate-500">{reason}</p>
                    {live.status === "ACTIVE" && (
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        DSCP {live.dscp} · Queue {live.queue} · Slice {live.sliceId}
                      </p>
                    )}
                    {target.meterId ? (
                      meter?.status === "ACTIVE" ? (
                        <p className="text-[10px] font-mono text-slate-400 mt-1">
                          Meter {meter.meterId} · {meter.rateKbps}Kbps · {meter.byteInCount} bytes matched
                        </p>
                      ) : (
                        <p className="text-[10px] text-red-500 mt-1">Meter {target.meterId}: {meter?.status === "NOT_CONFIGURED" ? "not installed on switch" : meter?.error || "check failed"}</p>
                      )
                    ) : (
                      <p className="text-[10px] italic text-slate-400 mt-1">No meter on this target (not a QoS slice)</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check Queue State */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Check Queue State</label>
            <div className="flex gap-2 mb-2">
              <select
                value={checkQueueForm.nodeId}
                onChange={(e) => setCheckQueueForm((f) => ({ ...f, nodeId: e.target.value }))}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 min-w-0"
              >
                <option value="">Switch…</option>
                {deviceOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}
                  </option>
                ))}
              </select>
              <input
                value={checkQueueForm.port}
                onChange={(e) => setCheckQueueForm((f) => ({ ...f, port: e.target.value }))}
                placeholder="Port"
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={runCheckQueue}
              disabled={!checkQueueForm.nodeId || !checkQueueForm.port || checkingQueue}
              className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2"
            >
              <Gauge size={14} className={checkingQueue ? "animate-spin" : ""} /> Check Queue
            </button>
            {checkQueueResult && (
              <div
                className={`rounded-2xl border p-4 mt-4 text-xs ${
                  checkQueueResult.status === "ACTIVE"
                    ? "border-emerald-100 bg-emerald-50/40"
                    : checkQueueResult.status === "NOT_CONFIGURED"
                    ? "border-slate-100 bg-slate-50"
                    : "border-red-100 bg-red-50/40"
                }`}
              >
                <p className="font-black uppercase text-[10px] mb-1">{checkQueueResult.status.replace("_", " ")}</p>
                {checkQueueResult.status === "ACTIVE" && (
                  <p className="font-mono text-[11px] text-slate-500">
                    DSCP {checkQueueResult.dscp} · Queue {checkQueueResult.queue} · Slice {checkQueueResult.sliceName || checkQueueResult.sliceId}
                  </p>
                )}
                {checkQueueResult.status === "ERROR" && <p className="text-red-600">{checkQueueResult.error}</p>}
              </div>
            )}
          </div>

          {/* Check Meter State */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Check Meter State</label>
            <div className="flex gap-2 mb-2">
              <select
                value={checkMeterForm.nodeId}
                onChange={(e) => setCheckMeterForm((f) => ({ ...f, nodeId: e.target.value }))}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500 min-w-0"
              >
                <option value="">Switch…</option>
                {deviceOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}
                  </option>
                ))}
              </select>
              <input
                value={checkMeterForm.meterId}
                onChange={(e) => setCheckMeterForm((f) => ({ ...f, meterId: e.target.value }))}
                placeholder="Meter ID"
                className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={runCheckMeter}
              disabled={!checkMeterForm.nodeId || !checkMeterForm.meterId || checkingMeter}
              className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2"
            >
              <Fuel size={14} className={checkingMeter ? "animate-spin" : ""} /> Check Meter
            </button>
            {checkMeterResult && (
              <div
                className={`rounded-2xl border p-4 mt-4 text-xs ${
                  checkMeterResult.status === "ACTIVE"
                    ? "border-emerald-100 bg-emerald-50/40"
                    : checkMeterResult.status === "NOT_CONFIGURED"
                    ? "border-slate-100 bg-slate-50"
                    : "border-red-100 bg-red-50/40"
                }`}
              >
                <p className="font-black uppercase text-[10px] mb-1">{checkMeterResult.status.replace("_", " ")}</p>
                {checkMeterResult.status === "ACTIVE" && (
                  <p className="font-mono text-[11px] text-slate-500">
                    Rate {checkMeterResult.rateKbps}Kbps · Burst {checkMeterResult.burstSize} · {checkMeterResult.byteInCount} bytes / {checkMeterResult.packetInCount} pkts matched
                  </p>
                )}
                {checkMeterResult.status === "ERROR" && <p className="text-red-600">{checkMeterResult.error}</p>}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* CUSTOM API REQUEST */}
      <SectionCard title="Custom API Request" icon={<Send size={16} className="text-blue-500" />}>
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setCustomForm((f) => ({ ...f, path: s.path }));
                setConfirmDelete(false);
              }}
              className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={customForm.method}
            onChange={(e) => {
              setCustomForm((f) => ({ ...f, method: e.target.value }));
              setConfirmDelete(false);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-black uppercase outline-none focus:border-blue-500"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={customForm.path}
            onChange={(e) => {
              setCustomForm((f) => ({ ...f, path: e.target.value }));
              setConfirmDelete(false);
            }}
            placeholder={`/relative/path (forwarded to ${controllerLabel})`}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-500 min-w-0"
          />
          <button
            onClick={sendCustomRequest}
            disabled={!customForm.path || customSending}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 ${
              confirmDelete ? "bg-red-600 hover:bg-red-500 text-white shadow-red-200" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-200"
            }`}
          >
            <Send size={14} className={customSending ? "animate-spin" : ""} /> {confirmDelete ? "Confirm Delete" : "Send"}
          </button>
        </div>

        {(customForm.method === "POST" || customForm.method === "PUT") && (
          <textarea
            value={customForm.body}
            onChange={(e) => setCustomForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="JSON body (optional)"
            rows={4}
            className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-500"
          />
        )}

        {confirmDelete && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-xs mt-3">
            <AlertTriangle size={16} className="flex-shrink-0" /> This will send a real DELETE to {controllerLabel}. Click Send again to confirm, or change the method/path to cancel.
          </div>
        )}
      </SectionCard>

      {/* RESPONSE */}
      <SectionCard
        title="Response"
        icon={<Terminal size={16} className="text-blue-500" />}
        action={
          selectedEntry && (
            <div className="flex gap-2">
              <button onClick={handleCopy} className="text-[11px] font-black uppercase px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5">
                <Copy size={13} /> Copy
              </button>
              <button onClick={() => setSelectedEntryId(null)} className="text-[11px] font-black uppercase px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5">
                <Trash2 size={13} /> Clear
              </button>
            </div>
          )
        }
      >
        {!selectedEntry ? (
          <p className="text-sm text-slate-400 italic">Run a Quick Operation or send a Custom Request to see a response here.</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-slate-900 text-white">{selectedEntry.method}</span>
              <span className="text-xs font-mono text-slate-500 truncate">{selectedEntry.endpoint}</span>
              <span className={`text-[10px] font-black uppercase ${selectedEntry.ok ? "text-emerald-600" : "text-red-500"}`}>{selectedEntry.status}</span>
              <span className="text-[10px] text-slate-400 font-mono">{selectedEntry.timeMs}ms</span>
              <span className="text-[10px] text-slate-400 uppercase">{controllerManager.CONTROLLERS[selectedEntry.controller]?.label}</span>
            </div>
            <pre className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
              {prettyJson(selectedEntry.data)}
            </pre>
          </div>
        )}
      </SectionCard>

      {/* RECENT REQUESTS */}
      <SectionCard title="Recent Requests" icon={<Clock size={16} className="text-blue-500" />}>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No requests yet.</p>
        ) : (
          <div className="space-y-1">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} active={entry.id === selectedEntryId} onClick={() => setSelectedEntryId(entry.id)} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ApiTester;
