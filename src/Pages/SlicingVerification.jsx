import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, AlertTriangle, Activity, Zap, ShieldCheck,
  Layers, Radio, RefreshCw, Play, X, Sliders, Clock,
  Gauge, HelpCircle, Wifi, WifiOff, Server, BarChart3,
  ArrowRight, ChevronDown, ChevronUp, Terminal, FileSearch,
} from "lucide-react";
import { getSlices } from "../api/slicingService";

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */
const S = {
  glass: {
    background: "var(--theme-card, rgba(24, 24, 27, 0.85))",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-card-border, rgba(39, 39, 42, 0.9))",
    borderRadius: 16, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
  },
  glassInner: {
    background: "var(--theme-bg, rgba(9, 9, 11, 0.75))",
    border: "1px solid var(--theme-card-border, rgba(39, 39, 42, 0.8))",
    borderRadius: 12,
  },
  thCell: {
    padding: "10px 14px", fontWeight: 800, textTransform: "uppercase",
    color: "var(--theme-text-muted, #71717a)", fontSize: 10, letterSpacing: "0.04em",
  },
  tdCell: { padding: "10px 14px", fontSize: 12 },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 12,
    fontFamily: "monospace", width: 60, outline: "none",
  },
};

const SLICE_META = {
  urllc: { label: "URLLC (Low Latency)", color: "#ef4444", icon: Zap, badge: "Low Latency" },
  embb: { label: "eMBB (High BW)", color: "#0284c7", icon: Activity, badge: "High Throughput" },
  mmtc: { label: "mMTC (IoT)", color: "#8b5cf6", icon: Radio, badge: "Massive IoT" },
  unsliced: { label: "Un-sliced", color: "#71717a", icon: HelpCircle, badge: "Best Effort" },
};

/* Default test pairs for tree,depth=2,fanout=3 (h1-h9)
   s1(root)→s2,s3,s4  s2→h1,h2,h3  s3→h4,h5,h6  s4→h7,h8,h9 */
const DEFAULT_TESTS = [
  { label: "URLLC (Low Latency)", sliceType: "urllc", srcHost: "h1", dstHost: "h2", dstIp: "10.0.0.2" },
  { label: "eMBB (High Bandwidth)", sliceType: "embb", srcHost: "h4", dstHost: "h5", dstIp: "10.0.0.5" },
  { label: "mMTC (Massive IoT)", sliceType: "mmtc", srcHost: "h7", dstHost: "h8", dstIp: "10.0.0.8" },
  { label: "Un-sliced (No QoS)", sliceType: "unsliced", srcHost: "h3", dstHost: "h6", dstIp: "10.0.0.6" },
];

/* Reference comparison — expected SLA targets (for the reference table) */
const REFERENCE_ROWS = [
  { label: "SDN Queue", urllc: "Queue 0 (Strict Priority 1)", embb: "Queue 1 (Fair Queuing)", mmtc: "Standard Queue", unsliced: "Shared Default FIFO" },
  { label: "Flow Priority", urllc: "41,000 (Fast-Path)", embb: "40,000 (Unicast)", mmtc: "40,000 (Aggregated)", unsliced: "0 - 1,000 (Fallback)" },
  { label: "DSCP Marking", urllc: "DSCP 46 (EF)", embb: "DSCP 0 (Default)", mmtc: "DSCP 10/12 (AF)", unsliced: "None" },
  { label: "Rate Control", urllc: "Guaranteed 60 MB/s", embb: "Meter (Token Bucket)", mmtc: "PPS Metering", unsliced: "Unregulated" },
  { label: "Expected Latency", urllc: "< 3 ms", embb: "25 - 65 ms", mmtc: "15 - 45 ms", unsliced: "80 - 250+ ms" },
  { label: "Expected Jitter", urllc: "< 0.4 ms", embb: "8 - 18 ms", mmtc: "5 - 12 ms", unsliced: "35 - 90 ms" },
  { label: "Isolation", urllc: "Strict (Priority 39000)", embb: "Meter Isolated", mmtc: "Standard Tenant", unsliced: "None / Dropped" },
  { label: "Use Case", urllc: "Telesurgery, Robotics", embb: "4K Streaming, AR/VR", mmtc: "Smart Meters, Sensors", unsliced: "Web, Background" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SlicingVerification() {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [flows, setFlows] = useState([]);
  const [meters, setMeters] = useState([]);
  const [localSlices, setLocalSlices] = useState([]);

  // Test configuration
  const [testPairs, setTestPairs] = useState([...DEFAULT_TESTS]);
  const [includeIperf, setIncludeIperf] = useState(false);
  const [showTestConfig, setShowTestConfig] = useState(false);

  // Comparison results
  const [comparisonResults, setComparisonResults] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Individual ping test
  const [pingSrc, setPingSrc] = useState("h1");
  const [pingDstIp, setPingDstIp] = useState("10.0.0.2");
  const [pingCount, setPingCount] = useState(10);
  const [pingResult, setPingResult] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);

  // Queue & DSCP audit
  const [queueStats, setQueueStats] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [dscpData, setDscpData] = useState(null);
  const [dscpLoading, setDscpLoading] = useState(false);

  const [auditMessage, setAuditMessage] = useState(null);

  /* ── Fetch ONOS summary ────────────────────────────────────────────────── */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onos/summary").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setSummaryData(data);
        setFlows(data?.flows || []);
        setMeters(data?.meters || []);
      }
      try {
        const stored = await getSlices();
        setLocalSlices(stored || []);
      } catch {
        setLocalSlices([]);
      }
    } catch (err) {
      console.warn("Summary fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  /* Auto-update test pairs from stored slices */
  useEffect(() => {
    if (localSlices.length === 0) return;
    const ipToHost = (ip) => ip ? `h${parseInt(ip.split(".")[3] || "0")}` : null;
    const slicedIps = new Set();
    const newTests = [];
    const usedSliceIds = new Set();

    const matchesType = (s, types) => {
      const tList = Array.isArray(types) ? types : [types];
      return (
        tList.includes(s.type) ||
        tList.includes(s.template) ||
        tList.includes(s.slice_type) ||
        tList.some((t) => new RegExp(t, "i").test(s.name || ""))
      );
    };

    const addStandardSlice = (types, defaultLabel, defaultType) => {
      const slice = localSlices.find((s) => !usedSliceIds.has(s.id) && matchesType(s, types));
      if (slice) {
        usedSliceIds.add(slice.id);
        const hosts = slice.hosts || [];
        if (hosts.length >= 2) {
          const ip1 = hosts[0]?.ip || hosts[0]?.ipAddresses?.[0];
          const ip2 = hosts[1]?.ip || hosts[1]?.ipAddresses?.[0];
          if (ip1 && ip2) {
            newTests.push({
              label: slice.name || defaultLabel,
              sliceType: defaultType,
              srcHost: ipToHost(ip1),
              dstHost: ipToHost(ip2),
              dstIp: ip2,
            });
            hosts.forEach((h) => slicedIps.add(h.ip || h.ipAddresses?.[0]));
            return;
          }
        }
      }
      const def = DEFAULT_TESTS.find((t) => t.sliceType === defaultType);
      if (def) newTests.push({ ...def });
    };

    addStandardSlice(["low-latency", "urllc"], "URLLC (Low Latency)", "urllc");
    addStandardSlice(["broadband", "embb", "high-bandwidth"], "eMBB (High Bandwidth)", "embb");
    addStandardSlice(["iot", "mmtc"], "mMTC (Massive IoT)", "mmtc");

    // Add any remaining configured slices
    localSlices.forEach((slice) => {
      if (usedSliceIds.has(slice.id)) return;
      usedSliceIds.add(slice.id);
      const hosts = slice.hosts || [];
      if (hosts.length >= 2) {
        const ip1 = hosts[0]?.ip || hosts[0]?.ipAddresses?.[0];
        const ip2 = hosts[1]?.ip || hosts[1]?.ipAddresses?.[0];
        if (ip1 && ip2) {
          let sType = "standard";
          if (matchesType(slice, ["low-latency", "urllc"])) sType = "urllc";
          else if (matchesType(slice, ["broadband", "embb"])) sType = "embb";
          else if (matchesType(slice, ["iot", "mmtc"])) sType = "mmtc";

          newTests.push({
            label: slice.name || `Slice (${ipToHost(ip1)} ↔ ${ipToHost(ip2)})`,
            sliceType: sType,
            srcHost: ipToHost(ip1),
            dstHost: ipToHost(ip2),
            dstIp: ip2,
          });
          hosts.forEach((h) => slicedIps.add(h.ip || h.ipAddresses?.[0]));
        }
      }
    });

    // Unsliced: hosts not in any slice
    const allIps = (summaryData?.hosts || []).map((h) => h.ip).filter(Boolean);
    const unslicedIps = allIps.filter((ip) => !slicedIps.has(ip));
    if (unslicedIps.length >= 2) {
      newTests.push({
        label: "Un-sliced (No QoS)",
        sliceType: "unsliced",
        srcHost: ipToHost(unslicedIps[0]),
        dstHost: ipToHost(unslicedIps[1]),
        dstIp: unslicedIps[1],
      });
    } else {
      newTests.push({ ...DEFAULT_TESTS[3] });
    }

    setTestPairs(newTests);
  }, [localSlices, summaryData]);

  /* ── Flow hierarchy audit ──────────────────────────────────────────────── */
  const flowAudit = useMemo(() => {
    const all = Array.isArray(flows) ? flows : [];
    const p41k = all.filter((f) => Number(f.priority) >= 41000);
    const p40k = all.filter((f) => { const p = Number(f.priority); return p >= 40000 && p < 41000; });
    const p39k = all.filter((f) => { const p = Number(f.priority); return p >= 39000 && p < 40000; });
    let score = 0;
    if (p41k.length > 0) score += 25;
    if (p40k.length > 0) score += 25;
    if (p39k.length > 0) score += 20;
    if (meters.length > 0) score += 15;
    if (summaryData?.qosPolicy?.enabled) score += 15;
    return { p41k, p40k, p39k, score };
  }, [flows, meters, summaryData]);

  /* ── API Calls ─────────────────────────────────────────────────────────── */
  const runComparison = async () => {
    setComparisonLoading(true);
    setComparisonResults(null);
    setAuditMessage(null);
    try {
      const body = { tests: testPairs.map((t) => ({ ...t, includeBandwidth: includeIperf })) };
      const res = await fetch("/api/onos/verify/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setComparisonResults(data);
      } else {
        setAuditMessage({ type: "error", text: data.error || "Comparison failed" });
      }
    } catch (err) {
      setAuditMessage({ type: "error", text: `Comparison error: ${err.message}` });
    } finally {
      setComparisonLoading(false);
    }
  };

  const runPingTest = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/onos/verify/ping", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srcHost: pingSrc, dstIp: pingDstIp, count: pingCount }),
      });
      const data = await res.json();
      setPingResult(data);
    } catch (err) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  const checkQueues = async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/onos/verify/queues");
      const data = await res.json();
      setQueueStats(data);
    } catch (err) {
      setQueueStats({ success: false, error: err.message });
    } finally {
      setQueueLoading(false);
    }
  };

  const [qosSetupLoading, setQosSetupLoading] = useState(false);
  const setupQosQueues = async () => {
    setQosSetupLoading(true);
    setAuditMessage(null);
    try {
      const res = await fetch("/api/onos/qos/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setAuditMessage({ type: "success", text: "OVS HTB queues (60M / 15M) configured successfully on all switch ports!" });
        await checkQueues();
      } else {
        setAuditMessage({ type: "error", text: `QoS setup failed: ${data.error}` });
      }
    } catch (err) {
      setAuditMessage({ type: "error", text: `QoS setup error: ${err.message}` });
    } finally {
      setQosSetupLoading(false);
    }
  };

  const verifyDscp = async () => {
    setDscpLoading(true);
    try {
      const res = await fetch("/api/onos/verify/dscp");
      const data = await res.json();
      setDscpData(data);
    } catch (err) {
      setDscpData({ success: false, error: err.message });
    } finally {
      setDscpLoading(false);
    }
  };

  const isConnected = summaryData?.success;
  const hostCount = summaryData?.hosts?.length || 0;
  const switchCount = summaryData?.devices?.length || 0;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "28px 36px", minHeight: "100vh", color: "var(--theme-fg, #fafafa)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 9999, background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              Live Verification
            </span>
            <span style={{ fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: isConnected ? "#4ade80" : "#f87171" }}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? "ONOS Connected" : "ONOS Offline"}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
            Real-Time Slicing Verification
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--theme-text-muted, #71717a)", maxWidth: 720 }}>
            Run actual <code style={{ color: "#38bdf8" }}>ping</code> and <code style={{ color: "#38bdf8" }}>iperf</code> tests between Mininet hosts to measure real latency, bandwidth, jitter, and packet loss across URLLC, eMBB, mMTC, and un-sliced traffic.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={fetchSummary} disabled={loading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "var(--theme-card, #18181b)", border: "1px solid var(--theme-card-border, #27272a)", color: "var(--theme-fg, #fafafa)" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link to="/network-slicing" className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.35)", color: "#818cf8" }}>
            <Layers size={14} /> Manage Slices <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Audit Banner */}
      {auditMessage && (
        <div style={{ marginBottom: 24, padding: "12px 18px", borderRadius: 12, background: auditMessage.type === "success" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)", border: `1px solid ${auditMessage.type === "success" ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`, color: auditMessage.type === "success" ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{auditMessage.text}</span>
          <button onClick={() => setAuditMessage(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {/* ── Status Cards ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Switches", value: switchCount, icon: Server, color: "#38bdf8" },
          { label: "Hosts", value: hostCount, icon: Activity, color: "#8b5cf6" },
          { label: "Flow Rules", value: flows.length, icon: Layers, color: "#6366f1" },
          { label: "Meters", value: meters.length, icon: Gauge, color: "#f59e0b" },
          { label: "P41K URLLC", value: flowAudit.p41k.length, icon: Zap, color: "#ef4444" },
          { label: "P39K Drop", value: flowAudit.p39k.length, icon: ShieldCheck, color: "#22c55e" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{ ...S.glassInner, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${card.color}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${card.color}30`, flexShrink: 0 }}>
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, fontFamily: "monospace" }}>{card.value}</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase" }}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         SECTION 1: LIVE 4-WAY COMPARISON
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{ ...S.glass, padding: "26px 30px", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              <BarChart3 size={20} style={{ color: "#38bdf8" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Live 4-Way Slice Comparison</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>
                Runs real <code style={{ color: "#38bdf8" }}>ping</code> tests between Mininet hosts in each slice to measure actual performance differences.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--theme-text-muted, #a1a1aa)", cursor: "pointer" }}>
              <input type="checkbox" checked={includeIperf} onChange={(e) => setIncludeIperf(e.target.checked)} style={{ accentColor: "#6366f1" }} />
              Include bandwidth test (+20s)
            </label>
            <button onClick={() => setShowTestConfig(!showTestConfig)} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--theme-text-muted, #a1a1aa)" }}>
              <Sliders size={12} /> Configure {showTestConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button onClick={runComparison} disabled={comparisonLoading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", background: comparisonLoading ? "rgba(56, 189, 248, 0.1)" : "rgba(56, 189, 248, 0.2)", border: "1px solid rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}>
              <Play size={14} /> {comparisonLoading ? "Testing..." : "Run 4-Way Comparison"}
            </button>
          </div>
        </div>

        {/* Test Configuration (collapsible) */}
        {showTestConfig && (
          <div style={{ ...S.glassInner, padding: "14px 18px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase" }}>
              Test Pairs — Edit host assignments below. Auto-populated from stored slices.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ ...S.thCell, textAlign: "left" }}>Slice Type</th>
                  <th style={S.thCell}>Src Host</th>
                  <th style={S.thCell}>Dst Host</th>
                  <th style={S.thCell}>Dst IP</th>
                </tr>
              </thead>
              <tbody>
                {testPairs.map((t, i) => {
                  const meta = SLICE_META[t.sliceType] || SLICE_META.unsliced;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ ...S.tdCell, color: meta.color, fontWeight: 700 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                          {t.label}
                        </div>
                      </td>
                      <td style={{ ...S.tdCell, textAlign: "center" }}>
                        <input value={t.srcHost} onChange={(e) => { const p = [...testPairs]; p[i] = { ...p[i], srcHost: e.target.value }; setTestPairs(p); }} style={S.input} />
                      </td>
                      <td style={{ ...S.tdCell, textAlign: "center" }}>
                        <input value={t.dstHost} onChange={(e) => { const p = [...testPairs]; p[i] = { ...p[i], dstHost: e.target.value }; setTestPairs(p); }} style={S.input} />
                      </td>
                      <td style={{ ...S.tdCell, textAlign: "center" }}>
                        <input value={t.dstIp} onChange={(e) => { const p = [...testPairs]; p[i] = { ...p[i], dstIp: e.target.value }; setTestPairs(p); }} style={{ ...S.input, width: 100 }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading state */}
        {comparisonLoading && (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "rgba(56, 189, 248, 0.1)", border: "2px solid rgba(56, 189, 248, 0.3)", marginBottom: 16, animation: "pulse 2s infinite" }}>
              <Activity size={24} style={{ color: "#38bdf8" }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#38bdf8" }}>Running Live Measurements…</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>
              Executing <code style={{ color: "#38bdf8" }}>ping</code>{includeIperf ? " and iperf" : ""} tests between Mininet hosts ({testPairs.length} pairs, ~{includeIperf ? testPairs.length * 7 : testPairs.length * 2}s)
            </p>
          </div>
        )}

        {/* Results */}
        {comparisonResults && !comparisonLoading && (
          <div>
            {/* LIVE badge + timestamp */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 800, background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)", animation: "pulse 3s infinite" }}>
                ● LIVE MEASUREMENT
              </span>
              <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
                <Clock size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {new Date(comparisonResults.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Results Table */}
            <div style={{ overflowX: "auto", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--theme-card-border, #27272a)" }}>
                    <th style={S.thCell}>Slice Type</th>
                    <th style={S.thCell}>Host Pair</th>
                    <th style={S.thCell}>Avg Latency</th>
                    <th style={S.thCell}>Min / Max</th>
                    <th style={S.thCell}>Jitter</th>
                    <th style={S.thCell}>Packet Loss</th>
                    {comparisonResults.results.some((r) => r.iperf) && <th style={S.thCell}>Bandwidth</th>}
                    {comparisonResults.results.some((r) => r.iperf) && <th style={S.thCell}>UDP Jitter</th>}
                    <th style={S.thCell}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.results.map((r, i) => {
                    const meta = SLICE_META[r.sliceType] || SLICE_META.unsliced;
                    const hasError = r.error || r.ping?.error;
                    const latency = r.ping?.avg;
                    const latencyColor = hasError ? "#ef4444" : latency < 5 ? "#22c55e" : latency < 20 ? "#fbbf24" : latency < 50 ? "#f59e0b" : "#ef4444";
                    const lossColor = hasError || (r.ping?.packetLoss || 0) > 5 ? "#ef4444" : (r.ping?.packetLoss || 0) > 0 ? "#f59e0b" : "#22c55e";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--theme-card-border, #27272a)", background: i % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                        <td style={{ ...S.tdCell, color: meta.color, fontWeight: 700 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                            {r.label}
                          </div>
                        </td>
                        <td style={{ ...S.tdCell, fontFamily: "monospace", color: "#e2e8f0" }}>
                          {r.srcHost} ↔ {r.dstHost}
                        </td>
                        <td style={{ ...S.tdCell, fontFamily: "monospace", fontWeight: 800, color: latencyColor, fontSize: 14 }}>
                          {hasError ? "FAIL" : `${latency?.toFixed(2)} ms`}
                        </td>
                        <td style={{ ...S.tdCell, fontFamily: "monospace", fontSize: 11, color: "var(--theme-text-muted, #a1a1aa)" }}>
                          {hasError ? "—" : `${r.ping?.min?.toFixed(2)} / ${r.ping?.max?.toFixed(2)}`}
                        </td>
                        <td style={{ ...S.tdCell, fontFamily: "monospace", fontWeight: 700 }}>
                          {hasError ? "—" : `${r.ping?.jitter?.toFixed(2)} ms`}
                        </td>
                        <td style={{ ...S.tdCell, fontFamily: "monospace", fontWeight: 700, color: lossColor }}>
                          {hasError ? "100%" : `${r.ping?.packetLoss ?? "?"}%`}
                        </td>
                        {comparisonResults.results.some((x) => x.iperf) && (
                          <td style={{ ...S.tdCell, fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>
                            {r.iperf?.bandwidth != null ? `${r.iperf.bandwidth} ${r.iperf.bandwidthUnit}` : r.iperf?.error ? "ERR" : "—"}
                          </td>
                        )}
                        {comparisonResults.results.some((x) => x.iperf) && (
                          <td style={{ ...S.tdCell, fontFamily: "monospace", fontSize: 11 }}>
                            {r.iperf?.jitter != null ? `${r.iperf.jitter} ms` : "—"}
                          </td>
                        )}
                        <td style={S.tdCell}>
                          {hasError ? <X size={16} color="#ef4444" /> :
                           (r.ping?.packetLoss || 0) > 5 ? <AlertTriangle size={16} color="#f59e0b" /> :
                           <CheckCircle2 size={16} color="#22c55e" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Latency Comparison Bars */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "var(--theme-text-muted, #a1a1aa)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Latency Comparison (Lower is Better)
              </h4>
              {(() => {
                const validResults = comparisonResults.results.filter((r) => r.ping?.avg != null);
                const maxLatency = Math.max(...validResults.map((r) => r.ping.avg), 1);
                return validResults.map((r, i) => {
                  const meta = SLICE_META[r.sliceType] || SLICE_META.unsliced;
                  const pct = (r.ping.avg / maxLatency) * 100;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 90, fontSize: 11, fontWeight: 700, color: meta.color, textAlign: "right", flexShrink: 0 }}>
                        {r.label.split("(")[0].trim()}
                      </div>
                      <div style={{ flex: 1, height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                        <div style={{
                          width: `${Math.max(pct, 3)}%`, height: "100%",
                          background: `linear-gradient(90deg, ${meta.color}60, ${meta.color}30)`,
                          borderRadius: 6, transition: "width 0.8s ease",
                          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", fontFamily: "monospace", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                            {r.ping.avg.toFixed(2)} ms
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Key Insights */}
            {(() => {
              const urllc = comparisonResults.results.find((r) => r.sliceType === "urllc");
              const unsliced = comparisonResults.results.find((r) => r.sliceType === "unsliced");
              const insights = [];
              if (urllc?.ping?.avg != null && unsliced?.ping?.avg != null && urllc.ping.avg < unsliced.ping.avg) {
                insights.push({ icon: "✅", text: `URLLC hosts achieve ${(unsliced.ping.avg / urllc.ping.avg).toFixed(1)}x lower latency than un-sliced hosts`, color: "#4ade80" });
              }
              if (urllc?.ping?.jitter != null && urllc.ping.jitter < 1) {
                insights.push({ icon: "✅", text: `URLLC jitter is ${urllc.ping.jitter.toFixed(2)} ms — suitable for mission-critical applications`, color: "#4ade80" });
              }
              if (unsliced?.ping?.packetLoss > 0) {
                insights.push({ icon: "⚠️", text: `Un-sliced traffic shows ${unsliced.ping.packetLoss}% packet loss — no QoS guarantees`, color: "#fbbf24" });
              }
              comparisonResults.results.forEach((r) => {
                if (r.ping?.packetLoss === 100) {
                  insights.push({ icon: "🔒", text: `${r.label}: 100% packet loss — cross-slice isolation or host unreachable`, color: "#f87171" });
                }
              });
              if (insights.length === 0) {
                insights.push({ icon: "ℹ️", text: "All hosts reachable. Create slices with different QoS to see differentiated performance.", color: "#38bdf8" });
              }
              return (
                <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#4ade80", textTransform: "uppercase" }}>Key Findings</h4>
                  <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", fontSize: 12, lineHeight: 1.9 }}>
                    {insights.map((ins, i) => (
                      <li key={i} style={{ color: ins.color }}>{ins.icon} {ins.text}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}

        {/* Empty state */}
        {!comparisonResults && !comparisonLoading && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--theme-text-muted, #71717a)" }}>
            <BarChart3 size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Click "Run 4-Way Comparison" to measure real latency across all slice types.</p>
            <p style={{ margin: "4px 0 0", fontSize: 11 }}>Requires Mininet running with ONOS as the controller.</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         SECTION 2: INDIVIDUAL PING TEST
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        {/* Ping Test */}
        <div style={{ ...S.glass, padding: "22px 26px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Terminal size={18} style={{ color: "#22c55e" }} /> Individual Ping Test
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>From:</label>
            <input value={pingSrc} onChange={(e) => setPingSrc(e.target.value)} style={S.input} placeholder="h1" />
            <label style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>To IP:</label>
            <input value={pingDstIp} onChange={(e) => setPingDstIp(e.target.value)} style={{ ...S.input, width: 110 }} placeholder="10.0.0.2" />
            <label style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>Count:</label>
            <input type="number" value={pingCount} onChange={(e) => setPingCount(parseInt(e.target.value) || 5)} style={{ ...S.input, width: 50 }} />
            <button onClick={runPingTest} disabled={pingLoading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#22c55e" }}>
              <Play size={12} /> {pingLoading ? "Pinging..." : "Run Ping"}
            </button>
          </div>

          {pingResult && (
            <div style={{ ...S.glassInner, padding: "14px 16px" }}>
              {pingResult.success ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                    {[
                      { label: "Avg RTT", value: `${pingResult.avg?.toFixed(2)} ms`, color: "#22c55e" },
                      { label: "Min / Max", value: `${pingResult.min?.toFixed(2)} / ${pingResult.max?.toFixed(2)}`, color: "#38bdf8" },
                      { label: "Jitter", value: `${pingResult.jitter?.toFixed(2)} ms`, color: "#f59e0b" },
                      { label: "Loss", value: `${pingResult.packetLoss}%`, color: pingResult.packetLoss > 0 ? "#ef4444" : "#22c55e" },
                    ].map((m) => (
                      <div key={m.label} style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase" }}>{m.label}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: m.color }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <details>
                    <summary style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", cursor: "pointer" }}>Raw output</summary>
                    <pre style={{ margin: "8px 0 0", fontSize: 10, color: "#a1a1aa", whiteSpace: "pre-wrap", maxHeight: 150, overflow: "auto", background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 6 }}>{pingResult.raw}</pre>
                  </details>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {pingResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Flow Hierarchy Audit */}
        <div style={{ ...S.glass, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} style={{ color: "#22c55e" }} /> Flow Rule Hierarchy
            </h3>
            <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 800, fontFamily: "monospace", background: flowAudit.score >= 80 ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 158, 11, 0.12)", border: `1px solid ${flowAudit.score >= 80 ? "rgba(34, 197, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, color: flowAudit.score >= 80 ? "#4ade80" : "#fbbf24" }}>
              {flowAudit.score}%
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "P41000 URLLC Fast-Path", count: flowAudit.p41k.length, color: "#ef4444", desc: "DSCP 46 → Queue 0" },
              { label: "P40000 Unicast Forwarding", count: flowAudit.p40k.length, color: "#34d399", desc: "Standard slice routing" },
              { label: "P39000 Isolation Drop", count: flowAudit.p39k.length, color: "#facc15", desc: "Cross-slice boundary" },
              { label: "Rate Meters", count: meters.length, color: "#a78bfa", desc: "Bandwidth policing" },
            ].map((item) => (
              <div key={item.label} style={{ ...S.glassInner, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.label}</span>
                  <span style={{ fontSize: 10, color: "var(--theme-text-muted, #71717a)", marginLeft: 8 }}>{item.desc}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>{item.count}</span>
                  {item.count > 0 ? <CheckCircle2 size={14} color="#22c55e" /> : <AlertTriangle size={14} color="#f59e0b" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         SECTION 3: OVS QUEUE & DSCP AUDIT
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        {/* Queue Stats */}
        <div style={{ ...S.glass, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <Gauge size={18} style={{ color: "#f59e0b" }} /> OVS Queue Statistics
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={setupQosQueues} disabled={qosSetupLoading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8" }}>
                <Zap size={12} /> {qosSetupLoading ? "Configuring..." : "Setup Queues"}
              </button>
              <button onClick={checkQueues} disabled={queueLoading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24" }}>
                <Play size={12} /> {queueLoading ? "Checking..." : "Check Queues"}
              </button>
            </div>
          </div>

          {queueStats ? (
            <div style={{ ...S.glassInner, padding: "14px 16px" }}>
              {queueStats.success ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {queueStats.configured ? <CheckCircle2 size={14} color="#22c55e" /> : <AlertTriangle size={14} color="#f59e0b" />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: queueStats.configured ? "#4ade80" : "#fbbf24" }}>
                      {queueStats.configured ? "HTB Queues Configured" : "No QoS Records Found"}
                    </span>
                  </div>
                  {queueStats.switches && Object.entries(queueStats.switches).map(([sw, data]) => (
                    <details key={sw} style={{ marginBottom: 6 }}>
                      <summary style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", cursor: "pointer" }}>Switch: {sw} ({Object.keys(data.ports || {}).length} ports)</summary>
                      {Object.entries(data.ports || {}).map(([port, info]) => (
                        <div key={port} style={{ marginLeft: 16, marginTop: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{port}:</span>
                          <pre style={{ margin: "2px 0 6px", fontSize: 10, color: "#a1a1aa", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, maxHeight: 80, overflow: "auto" }}>{info.tcStats}</pre>
                        </div>
                      ))}
                    </details>
                  ))}
                  {queueStats.qosRecords && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", cursor: "pointer" }}>OVSDB QoS Records</summary>
                      <pre style={{ margin: "4px 0 0", fontSize: 10, color: "#a1a1aa", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 4, maxHeight: 120, overflow: "auto" }}>{queueStats.qosRecords || "None"}</pre>
                    </details>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {queueStats.error}</p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--theme-text-muted, #71717a)", textAlign: "center", padding: 20 }}>
              Click "Check Queues" to inspect OVS HTB queue configuration and traffic counters.
            </p>
          )}
        </div>

        {/* DSCP Verification */}
        <div style={{ ...S.glass, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <FileSearch size={18} style={{ color: "#8b5cf6" }} /> DSCP 46 Verification
            </h3>
            <button onClick={verifyDscp} disabled={dscpLoading} className="btn-reactive" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#a78bfa" }}>
              <Play size={12} /> {dscpLoading ? "Checking..." : "Verify DSCP"}
            </button>
          </div>

          {dscpData ? (
            <div style={{ ...S.glassInner, padding: "14px 16px" }}>
              {dscpData.success ? (
                <div>
                  {/* ONOS DSCP Flows */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div style={{ textAlign: "center", flex: 1, padding: "10px 8px", borderRadius: 8, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#ef4444", fontFamily: "monospace" }}>{dscpData.onos?.dscpFlowCount || 0}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase" }}>DSCP 46 Flows</p>
                    </div>
                    <div style={{ textAlign: "center", flex: 1, padding: "10px 8px", borderRadius: 8, background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#38bdf8", fontFamily: "monospace" }}>{dscpData.onos?.queueFlowCount || 0}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase" }}>Queue 0 Actions</p>
                    </div>
                  </div>

                  {/* DSCP flow summary */}
                  {(dscpData.onos?.dscpFlowCount || 0) > 0 ? (
                    <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                      <span style={{ fontSize: 11, color: "#4ade80" }}>✅ DSCP 46 (Expedited Forwarding) rules are installed in ONOS.</span>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                      <span style={{ fontSize: 11, color: "#fbbf24" }}>⚠️ No DSCP 46 flows found. Create a URLLC slice to install EF marking rules.</span>
                    </div>
                  )}

                  {/* OVS dump details */}
                  {dscpData.ovs && Object.entries(dscpData.ovs).map(([br, info]) => (
                    <details key={br} style={{ marginTop: 6 }}>
                      <summary style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", cursor: "pointer" }}>
                        {br}: {info.totalFlows} flows, {info.dscpFlows?.length || 0} DSCP, {info.queueFlows?.length || 0} Queue
                      </summary>
                      {info.dscpFlows?.length > 0 && (
                        <pre style={{ margin: "4px 0", fontSize: 9, color: "#fca5a5", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, maxHeight: 80, overflow: "auto" }}>
                          {info.dscpFlows.join("\n")}
                        </pre>
                      )}
                      {info.queueFlows?.length > 0 && (
                        <pre style={{ margin: "4px 0", fontSize: 9, color: "#93c5fd", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, maxHeight: 80, overflow: "auto" }}>
                          {info.queueFlows.join("\n")}
                        </pre>
                      )}
                    </details>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>Error: {dscpData.error}</p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--theme-text-muted, #71717a)", textAlign: "center", padding: 20 }}>
              Click "Verify DSCP" to check for DSCP 46 flow rules and Queue 0 actions.
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         SECTION 4: REFERENCE — EXPECTED SLA TARGETS
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{ ...S.glass, padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Gauge size={18} style={{ color: "#8b5cf6" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Architecture Reference — Expected SLA Targets</h3>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.25)", color: "#a78bfa" }}>REFERENCE</span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>
          This table shows the <strong>expected</strong> SLA specifications for each slice type. Compare these against the <strong>measured values</strong> from the live comparison above to verify your implementation.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--theme-card-border, #27272a)" }}>
                <th style={S.thCell}>Dimension</th>
                <th style={{ ...S.thCell, color: "#f87171" }}>URLLC</th>
                <th style={{ ...S.thCell, color: "#38bdf8" }}>eMBB</th>
                <th style={{ ...S.thCell, color: "#a78bfa" }}>mMTC</th>
                <th style={{ ...S.thCell, color: "#94a3b8" }}>Un-sliced</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_ROWS.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--theme-card-border, #27272a)", background: idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                  <td style={{ ...S.tdCell, fontWeight: 700 }}>{row.label}</td>
                  <td style={{ ...S.tdCell, color: "#fca5a5", fontFamily: "monospace", fontSize: 11 }}>{row.urllc}</td>
                  <td style={{ ...S.tdCell, color: "#bae6fd", fontFamily: "monospace", fontSize: 11 }}>{row.embb}</td>
                  <td style={{ ...S.tdCell, color: "#ddd6fe", fontFamily: "monospace", fontSize: 11 }}>{row.mmtc}</td>
                  <td style={{ ...S.tdCell, color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>{row.unsliced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
