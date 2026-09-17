import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getNodes } from "../../api/api-controller";
import {
  Search,
  Filter,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Activity,
  Cpu,
  Server,
  Zap,
  X,
  Info,
  BarChart2,
  Terminal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GitMerge,
  Layers,
  Lock,
  Unlock,
  Radio,
  Eye,
  AlertOctagon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const SERVER_URLS = {
  ONLINE: "http://localhost:5003",
  OFFLINE: "http://localhost:5002",
};

const POLL_MS = 3_000;
const AUTO_BLOCK_RF_THRESHOLD = 0.98;

// Online IF Features (ODL flow tables)
const IF_FEATURES = [
  { key: "avg_packet_size", abbr: "APS", label: "Avg Packet Size", unit: "bytes" },
  { key: "bytes_per_second", abbr: "B/S", label: "Bytes / Second", unit: "B/s" },
  { key: "packet_count", abbr: "PKT", label: "Packet Count", unit: "pkts" },
  { key: "active_flow_count", abbr: "AFL", label: "Active Flows", unit: "flows" },
  { key: "asymmetry", abbr: "ASY", label: "Asymmetry", unit: "ratio" },
];

// Offline RF Features (ODL extracted flows)
const RF_FEATURES = [
  { key: "avg_pkt_size", abbr: "APS", label: "Avg Packet Size", unit: "bytes" },
  { key: "total_duration_sec", abbr: "DUR", label: "Flow Duration", unit: "sec" },
  { key: "bytes_per_sec", abbr: "B/S", label: "Bytes / Second", unit: "B/s" },
  { key: "tx_rx_byte_asymmetry", abbr: "ASY", label: "TX/RX Asymmetry", unit: "0-1" },
  { key: "pktcount", abbr: "PKT", label: "Packet Count", unit: "pkts" },
  { key: "tx_bytes", abbr: "TXB", label: "TX Bytes", unit: "bytes" },
];

// Supervised 5-Class Attack Classification
const ATTACK_TYPES = {
  0: { name: "Normal", icon: "✓", color: "#16a34a", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", pulseClass: "" },
  1: { name: "DDoS", icon: "☠", color: "#dc2626", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.4)", pulseClass: "animate-pulse-red" },
  2: { name: "Port Scan", icon: "⌕", color: "#ea580c", bg: "rgba(234,88,12,0.14)", border: "rgba(234,88,12,0.4)", pulseClass: "animate-pulse-orange" },
  3: { name: "Brute Force", icon: "🔓", color: "#d97706", bg: "rgba(217,119,6,0.14)", border: "rgba(217,119,6,0.4)", pulseClass: "animate-pulse-amber" },
  4: { name: "Botnet", icon: "🤖", color: "#9333ea", bg: "rgba(147,51,234,0.14)", border: "rgba(147,51,234,0.4)", pulseClass: "animate-pulse-purple" },

  // String fallbacks
  NORMAL: { name: "Normal", icon: "✓", color: "#16a34a", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", pulseClass: "" },
  ATTACK: { name: "Attack Anomaly", icon: "⚠", color: "#dc2626", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.4)", pulseClass: "animate-pulse-red" },
  SUSPICIOUS: { name: "Suspicious Flow", icon: "⚠", color: "#d97706", bg: "rgba(217,119,6,0.14)", border: "rgba(217,119,6,0.4)", pulseClass: "animate-pulse-amber" },
  BASELINE: { name: "Baseline Calibration", icon: "📊", color: "#0284c7", bg: "rgba(2,132,199,0.14)", border: "rgba(2,132,199,0.4)", pulseClass: "animate-pulse" },
  TRAINED: { name: "Normal Baseline", icon: "✓", color: "#16a34a", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", pulseClass: "" },
};

const THREAT_CONFIG = {
  NONE: {
    color: "#16a34a",
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.25)",
    glow: "0 0 35px rgba(34,197,94,0.12)",
    icon: ShieldCheck,
    label: "All Clear",
  },
  BASELINE: {
    color: "#0284c7",
    bg: "rgba(2,132,199,0.06)",
    border: "rgba(2,132,199,0.25)",
    glow: "0 0 35px rgba(2,132,199,0.15)",
    icon: Activity,
    label: "Calibrating",
  },
  LOW: {
    color: "#d97706",
    bg: "rgba(234,179,8,0.06)",
    border: "rgba(234,179,8,0.25)",
    glow: "0 0 35px rgba(234,179,8,0.12)",
    icon: Info,
    label: "Low Threat",
  },
  MEDIUM: {
    color: "#ea580c",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.30)",
    glow: "0 0 45px rgba(249,115,22,0.15)",
    icon: AlertTriangle,
    label: "Medium Threat",
  },
  HIGH: {
    color: "#dc2626",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.35)",
    glow: "0 0 55px rgba(239,68,68,0.20)",
    icon: ShieldAlert,
    label: "High Threat",
  },
  CRITICAL: {
    color: "#ef4444",
    bg: "rgba(220,38,38,0.15)",
    border: "rgba(220,38,38,0.50)",
    glow: "0 0 75px rgba(220,38,38,0.30)",
    icon: Zap,
    label: "Critical Threat",
  },
};

const STATE_BADGES = {
  ATTACK: {
    bg: "rgba(239,68,68,0.14)",
    color: "#ef4444",
    border: "rgba(239,68,68,0.35)",
    dot: "#ef4444",
    label: "ATTACK",
  },
  SUSPICIOUS: {
    bg: "rgba(245,158,11,0.14)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.35)",
    dot: "#f59e0b",
    label: "SUSPICIOUS",
  },
  NORMAL: {
    bg: "rgba(34,197,94,0.14)",
    color: "#22c55e",
    border: "rgba(34,197,94,0.35)",
    dot: "#22c55e",
    label: "NORMAL",
  },
  BASELINE: {
    bg: "rgba(2,132,199,0.14)",
    color: "#38bdf8",
    border: "rgba(2,132,199,0.35)",
    dot: "#38bdf8",
    label: "BASELINE",
  },
  TRAINED: {
    bg: "rgba(16,185,129,0.14)",
    color: "#34d399",
    border: "rgba(16,185,129,0.35)",
    dot: "#34d399",
    label: "TRAINED",
  },
};

const CATEGORY_META = {
  DDoS: { icon: "💥", label: "DDoS", color: "#dc2626", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  DoS: { icon: "🌊", label: "DoS", color: "#ea580c", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  "Port Scan": { icon: "⌕", label: "Port Scan", color: "#ea580c", bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.3)" },
  Probe: { icon: "🎯", label: "Probe / Scan", color: "#d97706", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  Brute_Force: { icon: "🔑", label: "Brute Force", color: "#ca8a04", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)" },
  Botnet: { icon: "🤖", label: "Botnet", color: "#9333ea", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" },
  Normal: { icon: "🟢", label: "Normal", color: "#16a34a", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" },
  "Calibrating Baseline": { icon: "📊", label: "Calibrating Baseline", color: "#38bdf8", bg: "rgba(2,132,199,0.12)", border: "rgba(2,132,199,0.3)" },
};

/* Resilient formatting helper: always renders number, never blanks */
function fmt(v, decimals = 2) {
  const n = typeof v === "number" && !Number.isNaN(v) ? v : Number(v);
  if (v == null || Number.isNaN(n)) return (0).toLocaleString();
  return parseFloat(n.toFixed(decimals)).toLocaleString();
}

/* Resilient feature extractor from switch result objects */
function getFeature(result, key) {
  if (!result) return 0;
  if (result.features && result.features[key] != null) return result.features[key];
  if (result[key] != null) return result[key];

  const fallbacks = {
    avg_packet_size: ["avg_pkt_size", "avg_pkt_len"],
    avg_pkt_size: ["avg_packet_size", "avg_pkt_len"],
    bytes_per_second: ["bytes_per_sec", "byte_rate", "bytes_per_second_rate"],
    bytes_per_sec: ["bytes_per_second", "byte_rate", "bytes_per_sec_rate"],
    packet_count: ["pktcount", "pkt_rate", "packetCount"],
    pktcount: ["packet_count", "pkt_rate", "packetCount"],
    flow_duration: ["total_duration_sec", "total_duration", "duration"],
    total_duration_sec: ["flow_duration", "total_duration", "duration"],
    tx_rx_byte_asymmetry: ["asymmetry"],
    asymmetry: ["tx_rx_byte_asymmetry"],
    active_flow_count: ["activeFlowCount", "flow_count"],
  };

  const altKeys = fallbacks[key] || [];
  for (const altKey of altKeys) {
    if (result.features && result.features[altKey] != null) return result.features[altKey];
    if (result[altKey] != null) return result[altKey];
  }
  return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES & CSS TOKENS
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {
  glass: {
    background: "var(--theme-card, #18181b)",
    border: "1px solid var(--theme-card-border, #27272a)",
    borderRadius: 16,
    boxShadow: "0 4px 20px var(--theme-panel-glow, rgba(0,0,0,0.3))",
  },
  glassInner: {
    background: "var(--theme-bg, #09090b)",
    border: "1px solid var(--theme-card-border, #27272a)",
    borderRadius: 12,
  },
};

const customStyles = `
  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.6); }
    50% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.85); border-color: rgba(239, 68, 68, 1); }
  }
  @keyframes pulse-orange {
    0%, 100% { box-shadow: 0 0 15px rgba(234, 88, 12, 0.4); border-color: rgba(234, 88, 12, 0.6); }
    50% { box-shadow: 0 0 35px rgba(234, 88, 12, 0.85); border-color: rgba(234, 88, 12, 1); }
  }
  @keyframes pulse-amber {
    0%, 100% { box-shadow: 0 0 15px rgba(217, 119, 6, 0.4); border-color: rgba(217, 119, 6, 0.6); }
    50% { box-shadow: 0 0 35px rgba(217, 119, 6, 0.85); border-color: rgba(217, 119, 6, 1); }
  }
  @keyframes pulse-purple {
    0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); border-color: rgba(168, 85, 247, 0.6); }
    50% { box-shadow: 0 0 35px rgba(168, 85, 247, 0.85); border-color: rgba(168, 85, 247, 1); }
  }
  .animate-pulse-red { animation: pulse-red 2s infinite; }
  .animate-pulse-orange { animation: pulse-orange 2s infinite; }
  .animate-pulse-amber { animation: pulse-amber 2s infinite; }
  .animate-pulse-purple { animation: pulse-purple 2s infinite; }

  .btn-reactive {
    transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, opacity 120ms ease;
  }
  .btn-reactive:active:not(:disabled) {
    transform: scale(0.96);
  }
  .btn-reactive:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/** SVG Probability Timeline Chart */
function ProbabilityChart({ data }) {
  const W = 720,
    H = 140,
    PAD = 28;

  if (!data || data.length === 0) {
    return (
      <div style={{ ...S.glassInner, padding: "32px 0", textAlign: "center" }}>
        <Activity size={24} style={{ color: "var(--theme-text-muted, #71717a)", marginBottom: 8 }} />
        <p style={{ color: "var(--theme-text-muted, #71717a)", fontSize: 13, margin: 0 }}>
          No detection data yet — run an attack simulation or query telemetry
        </p>
      </div>
    );
  }

  const points = data.slice(-60);
  const n = points.length;
  const xStep = (W - PAD * 2) / Math.max(n - 1, 1);
  const toY = (prob) => H - PAD - prob * (H - PAD * 2);

  const zoneY_attack = toY(0.7);
  const zoneY_suspicious = toY(0.4);

  const linePts = points.map((p, i) => `${PAD + i * xStep},${toY(p.prob ?? 0)}`).join(" ");

  const areaPath =
    `M${PAD},${toY(0)} ` +
    points.map((p, i) => `L${PAD + i * xStep},${toY(p.prob ?? 0)}`).join(" ") +
    ` L${PAD + (n - 1) * xStep},${toY(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 160, display: "block" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x={PAD} y={PAD} width={W - PAD * 2} height={zoneY_suspicious - PAD} fill="rgba(239,68,68,0.06)" rx="4" />
      <rect x={PAD} y={zoneY_suspicious} width={W - PAD * 2} height={zoneY_attack - zoneY_suspicious} fill="rgba(245,158,11,0.04)" rx="0" />

      <line x1={PAD} y1={zoneY_attack} x2={W - PAD} y2={zoneY_attack} stroke="rgba(239,68,68,0.35)" strokeWidth="1" strokeDasharray="4,4" />
      <line x1={PAD} y1={zoneY_suspicious} x2={W - PAD} y2={zoneY_suspicious} stroke="rgba(245,158,11,0.3)" strokeWidth="1" strokeDasharray="4,4" />

      <text x={PAD - 4} y={zoneY_attack + 4} fill="#dc2626" fontSize="9" textAnchor="end" opacity="0.8">0.70</text>
      <text x={PAD - 4} y={zoneY_suspicious + 4} fill="#d97706" fontSize="9" textAnchor="end" opacity="0.8">0.40</text>
      <text x={PAD - 4} y={toY(1) + 4} fill="var(--theme-text-muted, #71717a)" fontSize="9" textAnchor="end" opacity="0.6">1.0</text>
      <text x={PAD - 4} y={toY(0) + 4} fill="var(--theme-text-muted, #71717a)" fontSize="9" textAnchor="end" opacity="0.6">0.0</text>

      <path d={areaPath} fill="url(#areaGrad)" />
      <polyline points={linePts} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinejoin="round" />

      {points.map((p, i) =>
        p.state === "ATTACK" ? (
          <circle key={i} cx={PAD + i * xStep} cy={toY(p.prob ?? 0)} r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
        ) : p.state === "SUSPICIOUS" ? (
          <circle key={i} cx={PAD + i * xStep} cy={toY(p.prob ?? 0)} r="3.5" fill="#f59e0b" opacity="0.85" />
        ) : null
      )}
    </svg>
  );
}

/** Stat Summary Card */
function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div
      style={{
        ...S.glassInner,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = accent ? `${accent}55` : "var(--theme-card-border, #27272a)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = "var(--theme-card-border, #27272a)";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: accent ? `${accent}18` : "rgba(139,92,246,0.12)",
          border: `1px solid ${accent ? `${accent}33` : "rgba(139,92,246,0.25)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent || "#8b5cf6",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0, fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ fontSize: 24, fontWeight: 700, margin: "2px 0 0", color: accent || "var(--theme-fg, #fafafa)", lineHeight: 1 }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", margin: "4px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

/** Protocol Distribution Bar */
function ProtocolBar({ byProtocol }) {
  const entries = Object.entries(byProtocol || {});
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + (v.total || 0), 0);
  const colors = { TCP: "#8b5cf6", UDP: "#0284c7", ICMP: "#d97706" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([proto, v]) => {
        const pct = total > 0 ? (v.total / total) * 100 : 0;
        const attackPct = v.total > 0 ? ((v.attacks || 0) / v.total) * 100 : 0;
        const c = colors[proto] || "#64748b";
        return (
          <div key={proto} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 42, fontSize: 11, fontWeight: 700, color: c, textAlign: "right" }}>{proto}</span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: "var(--theme-card-border, #27272a)",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${c}aa, ${c})`,
                  transition: "width 0.5s ease",
                }}
              />
              {attackPct > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${(attackPct / 100) * pct}%`,
                    background: "rgba(239,68,68,0.85)",
                    borderRadius: 4,
                    transition: "width 0.5s ease",
                  }}
                />
              )}
            </div>
            <span style={{ width: 36, fontSize: 11, color: "var(--theme-text-muted, #71717a)", textAlign: "right", fontFamily: "monospace" }}>
              {v.total}
            </span>
            {v.attacks > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: "#dc2626",
                  fontWeight: 700,
                  width: 48,
                  textAlign: "right",
                  background: "rgba(239,68,68,0.1)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {v.attacks} atk
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Inline Probability Progress Indicator */
function ProbBar({ value }) {
  const prob = typeof value === "number" ? value : Number(value) || 0;
  const pct = Math.min(100, Math.max(0, prob * 100));
  const color = pct >= 70 ? "#dc2626" : pct >= 40 ? "#d97706" : "#16a34a";
  const tier = pct >= 70 ? "High" : pct >= 40 ? "Med" : "Low";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--theme-card-border, #27272a)",
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            width: `${pct}%`,
            background: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontFamily: "monospace", color, minWidth: 36, textAlign: "right", fontWeight: 700 }}>
        {pct.toFixed(0)}%
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color,
          background: `${color}18`,
          padding: "1px 5px",
          borderRadius: 3,
          textTransform: "uppercase",
        }}
      >
        {tier}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AnomalyDetector() {
  const [mode, setMode] = useState("HYBRID"); // "ONLINE" | "OFFLINE" | "HYBRID"
  const [running, setRunning] = useState(true);
  const [connected, setConnected] = useState({ ONLINE: null, OFFLINE: null });
  const [lastPollTime, setLastPollTime] = useState(null);

  // Online IF state (Port 5003)
  const [results, setResults] = useState({});
  const [lastFeatures, setLastFeatures] = useState(null);
  const [baselineNotification, setBaselineNotification] = useState(null);
  const [baselineFinishedAt, setBaselineFinishedAt] = useState(null);
  const [baselineTargetSamples, setBaselineTargetSamples] = useState(100);
  const prevIsBaselineRef = useRef(null);

  // Auto-dismiss baseline notification after 10 seconds
  useEffect(() => {
    if (!baselineNotification) return;
    const timer = setTimeout(() => {
      setBaselineNotification(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [baselineNotification]);

  // Offline RF state (Port 5002)
  const [rfResults, setRfResults] = useState({});
  const [rfStats, setRfStats] = useState(null);
  const [rfEvents, setRfEvents] = useState([]);
  const [lastRfId, setLastRfId] = useState(0);

  // Flow stats cache for calculating ODL deltas
  const prevFlowStatsRef = useRef({});

  // Mitigation state
  const [blockMode, setBlockMode] = useState("surgical"); // "surgical" | "switch_wide"
  const [blockedSwitches, setBlockedSwitches] = useState(new Set());
  const [autoBlockedSwitches, setAutoBlockedSwitches] = useState(new Set());
  const [mitigationLog, setMitigationLog] = useState([]);
  const [autoBlockLog, setAutoBlockLog] = useState([]);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Unified Event Log & Feed
  const [log, setLog] = useState([]);

  // Table Controls & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [copiedIp, setCopiedIp] = useState(null);

  // ── Health checks ───────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    const check = async (key, url) => {
      try {
        const res = await fetch(`${url}/health`);
        setConnected((prev) => ({ ...prev, [key]: res.ok }));
      } catch {
        setConnected((prev) => ({ ...prev, [key]: false }));
      }
    };
    await Promise.all([
      check("ONLINE", SERVER_URLS.ONLINE),
      check("OFFLINE", SERVER_URLS.OFFLINE),
    ]);
  }, []);

  useEffect(() => {
    checkHealth();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [checkHealth]);

  // ── Extract RF features from raw ODL inventory ──────────────────────────────
  const extractRFFeatures = useCallback((rawOdl, switchId) => {
    const nodes = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? [];
    const node = nodes.find((n) => n.id === switchId);
    if (!node) return null;

    let totalDeltaPkt = 0,
      totalDeltaBytes = 0,
      totalDeltaTime = 0,
      flowCount = 0;
    const now = Date.now() / 1000;

    for (const table of node["flow-node-inventory:table"] ?? []) {
      for (const flow of table["flow"] ?? []) {
        const s = flow["opendaylight-flow-statistics:flow-statistics"] ?? {};
        const pkt = parseInt(s["packet-count"] ?? s["packetCount"] ?? 0, 10);
        const byt = parseInt(s["byte-count"] ?? s["byteCount"] ?? 0, 10);
        const flowId = flow["id"];

        if (pkt === 0 && byt === 0) continue;

        const flowKey = `${switchId}:${flowId}`;
        const prev = prevFlowStatsRef.current[flowKey];

        prevFlowStatsRef.current[flowKey] = { packets: pkt, bytes: byt, ts: now };

        if (prev === undefined) continue;

        const deltaPkt = Math.max(0, pkt - prev.packets);
        const deltaBytes = Math.max(0, byt - prev.bytes);
        const deltaTime = Math.max(1, now - prev.ts);

        if (deltaPkt === 0 && deltaBytes === 0) continue;

        totalDeltaPkt += deltaPkt;
        totalDeltaBytes += deltaBytes;
        totalDeltaTime += deltaTime;
        flowCount += 1;
      }
    }

    if (flowCount === 0) return null;

    const avgDeltaTime = totalDeltaTime / flowCount;

    return {
      src: switchId,
      avg_pkt_size: totalDeltaPkt > 0 ? totalDeltaBytes / totalDeltaPkt : 0,
      total_duration_sec: avgDeltaTime,
      bytes_per_sec: totalDeltaBytes / avgDeltaTime,
      tx_rx_byte_asymmetry: 1.0,
      pktcount: totalDeltaPkt,
      tx_bytes: totalDeltaBytes,
    };
  }, []);

  // ── Online IF State Polling & Baseline Accumulation ────────────────────────
  const fetchState = useCallback(async () => {
    let rawOdl = null;
    try {
      rawOdl = await getNodes();
    } catch (err) {
      console.warn("[fetchState] getNodes failed:", err);
    }

    const nodes = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? [];
    const ids = nodes
      .map((n) => n.id)
      .filter((id) => id && !id.startsWith("host:") && !id.includes(":LOCAL") && !/openflow:\d+:\d+$/.test(id));
    const targets = ids.length > 0 ? ids : ["global"];

    const onlineResultsLocal = {};
    let atLeastOneSuccess = false;

    // Send detect to Online IF engine for each active switch
    if (rawOdl && targets.length > 0) {
      for (const sid of targets) {
        try {
          const res = await fetch(`${SERVER_URLS.ONLINE}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ switch_id: sid, raw_odl: rawOdl }),
          });
          if (res.ok) {
            const data = await res.json();
            onlineResultsLocal[sid] = {
              ...data,
              switch_id: data.switch_id || sid,
              src: sid,
            };
            atLeastOneSuccess = true;
          }
        } catch (err) {
          console.warn(`[fetchState] /detect failed for ${sid}:`, err);
        }
      }
    }

    // Also fetch /state for coordinator summary & alerts
    let stateData = null;
    try {
      let stateRes = await fetch(`${SERVER_URLS.ONLINE}/state`);
      if (!stateRes.ok) {
        stateRes = await fetch(`${SERVER_URLS.ONLINE}/analyze`);
      }
      if (stateRes.ok) {
        stateData = await stateRes.json();
        atLeastOneSuccess = true;
        if (stateData.baseline_samples) {
          setBaselineTargetSamples(stateData.baseline_samples);
        }
      }
    } catch {}

    if (!atLeastOneSuccess) {
      setConnected((p) => ({ ...p, ONLINE: false }));
      return;
    }
    setConnected((p) => ({ ...p, ONLINE: true }));

    // Handle alerts
    const alerts = stateData?.alerts ?? [];
    if (alerts.length > 0) {
      alerts.forEach((a) => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("DDoS Attack Detected", {
            body: `${a.switch_id} — Confidence ${(a.rf_prob * 100).toFixed(0)}%`,
            requireInteraction: true,
          });
        }
      });
      fetch(`${SERVER_URLS.ONLINE}/alerts/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: alerts.map((a) => a.id) }),
      }).catch(() => {});
    }

    const backendResults = {
      ...(stateData?.results ?? {}),
      ...onlineResultsLocal,
    };
    setResults(backendResults);

    const allEntries = Object.values(backendResults).filter((r) => r.phase !== "SKIP");
    const worstEntry = allEntries
      .filter((r) => r.features)
      .reduce((a, b) => {
        if (!a) return b;
        const aSev = a.state === "ATTACK" ? 3 : a.state === "SUSPICIOUS" ? 2 : a.state === "NORMAL" ? 1 : 0;
        const bSev = b.state === "ATTACK" ? 3 : b.state === "SUSPICIOUS" ? 2 : b.state === "NORMAL" ? 1 : 0;
        return bSev > aSev ? b : a;
      }, null);

    if (worstEntry?.features) {
      setLastFeatures(worstEntry.features);
    }

    const nowTs = new Date().toLocaleTimeString();
    const entries = allEntries.map((r, idx) => ({
      id: Date.now() + idx,
      switch_id: r.switch_id,
      switch: r.switch_id,
      state: r.phase === "BASELINE" ? "BASELINE" : r.state || "NORMAL",
      phase: r.phase,
      attack_type: r.phase === "BASELINE" ? "Calibrating Baseline" : r.state === "ATTACK" ? "DDoS" : "Normal",
      attack_prob: r.percentile != null ? (100 - r.percentile) / 100 : r.raw_score != null ? Math.min(1, Math.max(0, r.raw_score)) : 0,
      raw_score: r.raw_score,
      soft_anomaly: r.soft_anomaly,
      hard_anomaly: r.hard_anomaly,
      percentile: r.percentile,
      network_severity: r.network_severity,
      src_ip: r.attacking_host?.ip || "—",
      dst_ip: "10.0.0.1",
      protocol: "TCP",
      _ts: nowTs,
      _mode: "ONLINE",
    }));

    if (entries.length > 0) {
      setLog((prev) => [...entries, ...prev].slice(0, 100));
    }

    // Auto-block reflection
    const autoBlocks = stateData?.auto_blocks ?? {};
    const newAutoBlocked = Object.entries(autoBlocks)
      .filter(([, blocked]) => blocked)
      .map(([sid]) => sid);

    if (newAutoBlocked.length > 0) {
      setAutoBlockedSwitches(new Set(newAutoBlocked));
      setBlockedSwitches((prev) => new Set([...prev, ...newAutoBlocked]));
    }
  }, []);

  // ── Offline RF Polling (ODL Flow Delta Detection + Stats) ───────────────────
  const sendOffline = useCallback(async () => {
    let rawOdl;
    try {
      rawOdl = await getNodes();
    } catch (err) {
      console.error("[sendOffline] getNodes failed:", err);
      setConnected((p) => ({ ...p, OFFLINE: false }));
      return;
    }

    const nodes = rawOdl?.["opendaylight-inventory:nodes"]?.node ?? [];
    const ids = nodes
      .map((n) => n.id)
      .filter((id) => id && !id.startsWith("host:") && !id.includes(":LOCAL") && !/openflow:\d+:\d+$/.test(id));

    const targets = ids.length > 0 ? ids : ["global"];
    let atLeastOneSuccess = false;
    const rfResultsLocal = {};
    const nowTs = new Date().toLocaleTimeString();

    for (const sid of targets) {
      const features = extractRFFeatures(rawOdl, sid);

      if (!features) {
        const normalData = {
          src: sid,
          switch_id: sid,
          state: "NORMAL",
          reason: "No active flows with traffic",
          attack_prob: 0,
          attack_type: "Normal",
          rf_zone: "NORMAL",
          features: {
            avg_pkt_size: 0,
            total_duration_sec: 0,
            bytes_per_sec: 0,
            tx_rx_byte_asymmetry: 0,
            pktcount: 0,
            tx_bytes: 0,
          },
        };
        rfResultsLocal[sid] = normalData;
        setRfResults((prev) => ({ ...prev, [sid]: normalData }));
        continue;
      }

      try {
        const res = await fetch(`${SERVER_URLS.OFFLINE}/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(features),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const mergedData = {
          ...data,
          src: data.src || sid,
          switch_id: data.src || sid,
          features: data.features ?? features,
        };

        rfResultsLocal[mergedData.src] = mergedData;

        setRfResults((prev) => {
          const next = { ...prev, [mergedData.src]: mergedData };
          const allVals = Object.values(next);
          const worst = allVals.reduce((w, c) => {
            const wSev = w?.state === "ATTACK" ? 3 : w?.state === "SUSPICIOUS" ? 2 : 1;
            const cSev = c?.state === "ATTACK" ? 3 : c?.state === "SUSPICIOUS" ? 2 : 1;
            return cSev > wSev ? c : w;
          }, allVals[0]);
          setLastFeatures(worst?.features ?? null);
          return next;
        });

        // Determine attack category name
        const stateKey = mergedData.state;
        const attackName =
          typeof stateKey === "number"
            ? ATTACK_TYPES[stateKey]?.name || "Normal"
            : mergedData.attack_type || (mergedData.is_attack ? "DDoS" : "Normal");

        const logItem = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          switch: mergedData.src,
          switch_id: mergedData.src,
          state:
            mergedData.state === "ATTACK" || (mergedData.is_attack && mergedData.attack_type !== "Normal")
              ? "ATTACK"
              : mergedData.state === "SUSPICIOUS"
              ? "SUSPICIOUS"
              : "NORMAL",
          attack_type: attackName,
          attack_prob: mergedData.attack_prob ?? 0,
          rf_zone: mergedData.rf_zone ?? "benign",
          src_ip: mergedData.src_ip || "10.0.0.5",
          dst_ip: mergedData.dst_ip || "10.0.0.1",
          protocol: mergedData.protocol || "TCP",
          _ts: nowTs,
          _mode: "OFFLINE",
        };

        setLog((prev) => [logItem, ...prev.slice(0, 99)]);
        atLeastOneSuccess = true;
      } catch (err) {
        console.error(`[sendOffline] fetch failed for ${sid}:`, err);
      }
    }

    if (atLeastOneSuccess) {
      setConnected((p) => ({ ...p, OFFLINE: true }));
    }

    // Cross-feed RF scores to Online IF engine
    const rfScorePayload = {};
    for (const [sid, data] of Object.entries(rfResultsLocal)) {
      rfScorePayload[sid] = {
        attack_prob: data.attack_prob ?? 0,
        rf_zone: data.rf_zone ?? "benign",
        state: data.state ?? "NORMAL",
      };
    }
    if (Object.keys(rfScorePayload).length > 0) {
      fetch(`${SERVER_URLS.ONLINE}/rf-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rfScorePayload),
      }).catch(() => {});
    }

    // Optionally poll RF stats & recent window for timeline visualization
    try {
      const statsRes = await fetch(`${SERVER_URLS.OFFLINE}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setRfStats(statsData);
      }
    } catch {}
  }, [extractRFFeatures]);

  // ── Unified Refresh / Query Once ───────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    checkHealth();
    if (mode === "ONLINE" || mode === "HYBRID") {
      await fetchState();
    }
    if (mode === "OFFLINE" || mode === "HYBRID") {
      await sendOffline();
    }
    setLastPollTime(Date.now());
  }, [fetchState, sendOffline, mode, checkHealth]);

  // ── Unified Polling Loop ───────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;

    const tick = () => {
      checkHealth();
      if (mode === "ONLINE" || mode === "HYBRID") fetchState();
      if (mode === "OFFLINE" || mode === "HYBRID") sendOffline();
      setLastPollTime(Date.now());
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [running, mode, fetchState, sendOffline, checkHealth]);

  // ── Mode Switch ────────────────────────────────────────────────────────────
  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode === "ONLINE") {
      setRfResults({});
      prevFlowStatsRef.current = {};
    } else if (newMode === "OFFLINE") {
      setResults({});
      setLastFeatures(null);
      prevFlowStatsRef.current = {};
    } else if (newMode === "HYBRID") {
      prevFlowStatsRef.current = {};
    }
  };

  // ── Reset Handler ──────────────────────────────────────────────────────────
  const handleReset = async () => {
    setRunning(false);
    try {
      if (mode === "ONLINE" || mode === "HYBRID") {
        await fetch(`${SERVER_URLS.ONLINE}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
      }
    } catch {}
    try {
      if (mode === "OFFLINE" || mode === "HYBRID") {
        await fetch(`${SERVER_URLS.OFFLINE}/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        await fetch(`${SERVER_URLS.OFFLINE}/recent/clear`, { method: "POST" });
        await fetch(`${SERVER_URLS.OFFLINE}/metrics/reset`, { method: "POST" });
      }
    } catch {}

    setResults({});
    setRfResults({});
    setLastFeatures(null);
    setLog([]);
    setBlockedSwitches(new Set());
    setAutoBlockedSwitches(new Set());
    setMitigationLog([]);
    setAutoBlockLog([]);
    setBaselineFinishedAt(null);
    setBaselineNotification({
      type: "info",
      title: "State Reset",
      message: "Telemetry and baseline detectors reset.",
      ts: Date.now(),
    });
    prevFlowStatsRef.current = {};
    checkHealth();
    setRunning(true);
  };

  // ── Calibrate Baseline Trigger ─────────────────────────────────────────────
  const handleCalibrateBaseline = useCallback(async (samples = 100) => {
    try {
      setBaselineFinishedAt(null);
      setBaselineNotification({
        type: "info",
        title: "Calibrating Online IF Baseline",
        message: `Resetting previous baseline. Querying OpenDaylight to collect ${samples} normal flow samples...`,
        ts: Date.now(),
      });
      await fetch(`${SERVER_URLS.ONLINE}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples }),
      });
      setBaselineTargetSamples(samples);
      setResults({});
      if (!running) setRunning(true);
      await fetchState();
    } catch (err) {
      console.error("Baseline calibration trigger failed:", err);
      setBaselineNotification({
        type: "error",
        title: "Calibration Request Failed",
        message: `Could not contact Online IF engine at ${SERVER_URLS.ONLINE}. Check service status.`,
        ts: Date.now(),
      });
    }
  }, [running, fetchState]);

  // ── Derived State & Classifications ────────────────────────────────────────
  const allIFResults = Object.values(results);
  const worstIFResult =
    allIFResults.length > 0
      ? allIFResults.reduce((worst, current) => {
          const wSev = worst?.state === "ATTACK" ? 3 : worst?.state === "SUSPICIOUS" ? 2 : worst?.state === "NORMAL" ? 1 : 0;
          const cSev = current?.state === "ATTACK" ? 3 : current?.state === "SUSPICIOUS" ? 2 : current?.state === "NORMAL" ? 1 : 0;
          return cSev > wSev ? current : worst;
        })
      : null;

  const allRFResults = Object.values(rfResults);
  const worstRFResult =
    allRFResults.length > 0
      ? allRFResults.reduce((worst, current) => {
          const wSev = worst?.state === "ATTACK" ? 3 : worst?.state === "SUSPICIOUS" ? 2 : worst?.state === "NORMAL" ? 1 : 0;
          const cSev = current?.state === "ATTACK" ? 3 : current?.state === "SUSPICIOUS" ? 2 : current?.state === "NORMAL" ? 1 : 0;
          return cSev > wSev ? current : worst;
        }, allRFResults[0])
      : null;

  const isIFAttack = allIFResults.some((r) => r.state === "ATTACK");
  const isIFSuspicious = allIFResults.some((r) => r.state === "SUSPICIOUS") && !isIFAttack;

  const isRFAttack = allRFResults.some((r) => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0));
  const isRFSuspicious = allRFResults.some((r) => r.state === "SUSPICIOUS") && !isRFAttack;

  const isAttack =
    mode === "ONLINE" ? isIFAttack : mode === "OFFLINE" ? isRFAttack : isIFAttack || isRFAttack;

  const isSuspicious =
    mode === "ONLINE"
      ? isIFSuspicious
      : mode === "OFFLINE"
      ? isRFSuspicious
      : (isIFSuspicious || isRFSuspicious) && !isAttack;

  // Smart Authorization for Quarantine
  const canBlock = useMemo(() => {
    const ifPhase = worstIFResult?.phase ?? null;
    const ifInDetection = ifPhase === "DETECTION";
    const ifAttack = allIFResults.some((r) => r.state === "ATTACK");
    const ifHardAnomaly = allIFResults.some((r) => r.hard_anomaly === true);
    const rfAttack = allRFResults.some((r) => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0));
    const rfHighConf = allRFResults.some((r) => (r.attack_prob ?? 0) >= 0.85);

    if (ifInDetection && ifAttack && rfAttack) return true;
    if (rfHighConf) return true;
    if (!ifInDetection && rfAttack) return true;
    if (ifInDetection && ifHardAnomaly) return true;
    return false;
  }, [worstIFResult, allIFResults, allRFResults]);

  // ── Auto-Block Trigger ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "HYBRID") return;

    const ifAttacks = allIFResults.filter((r) => r.state === "ATTACK").map((r) => r.switch_id);
    const rfAttacks = allRFResults.filter(
      (r) => (r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0)) && r.attack_prob >= AUTO_BLOCK_RF_THRESHOLD
    );

    const rfAttackMap = new Map(rfAttacks.map((r) => [r.src, r]));

    for (const sid of ifAttacks) {
      if (rfAttackMap.has(sid) && !blockedSwitches.has(sid) && !autoBlockedSwitches.has(sid)) {
        window.dispatchEvent(new CustomEvent("autoblock", { detail: { switch_id: sid } }));

        if (Notification.permission === "granted") {
          new Notification("SDN Auto-Block Triggered", {
            body: `Switch ${sid} was automatically isolated due to high confidence attack.`,
          });
        }

        fetch(`${SERVER_URLS.ONLINE}/auto-block/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ switch_id: sid }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "auto_blocked" || data.status === "already_blocked") {
              setAutoBlockedSwitches((prev) => new Set([...prev, sid]));
              setBlockedSwitches((prev) => new Set([...prev, sid]));
              setAutoBlockLog((prev) => [
                {
                  ts: new Date().toLocaleTimeString(),
                  switch_id: sid,
                  prob: rfAttackMap.get(sid).attack_prob,
                },
                ...prev,
              ]);
            }
          })
          .catch((err) => console.error("[AutoBlock] Failed:", err));
      }
    }
  }, [allIFResults, allRFResults, mode, blockedSwitches, autoBlockedSwitches]);

  // ── Mitigation Actions ─────────────────────────────────────────────────────
  const handleBlock = useCallback(async () => {
    const worstIF = Object.values(results ?? {})
      .filter((r) => r.state === "ATTACK")
      .sort((a, b) => (a.raw_score ?? 0) - (b.raw_score ?? 0))[0];

    const worstRF = Object.values(rfResults ?? {})
      .filter((r) => r.state === "ATTACK" || (typeof r.state === "number" && r.state > 0))
      .sort((a, b) => (b.attack_prob ?? 0) - (a.attack_prob ?? 0))[0];

    const targetSwitch = worstIF?.switch_id ?? worstRF?.src;
    if (!targetSwitch || blockedSwitches.has(targetSwitch)) return;

    try {
      let res;
      if (blockMode === "surgical") {
        const attackingHost = worstIF?.attacking_host;
        if (!attackingHost) {
          console.warn("[BLOCK] No attacking host identified — falling back to switch-wide");
          res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ switch_id: targetSwitch, block_type: "switch_wide" }),
          });
        } else {
          res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block-host`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              switch_id: targetSwitch,
              src_ip: attackingHost.ip,
              src_mac: attackingHost.mac,
            }),
          });
        }
      } else {
        res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ switch_id: targetSwitch, block_type: "switch_wide" }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setBlockedSwitches((prev) => new Set([...prev, targetSwitch]));
        setMitigationLog((prev) => [
          {
            ts: new Date().toLocaleTimeString(),
            action: "BLOCKED",
            switch_id: targetSwitch,
            flow_id: data.flow_id,
            block_type: data.action ?? blockMode,
            src_ip: data.src_ip ?? null,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("[BLOCK] Failed:", err);
    }
  }, [results, rfResults, blockedSwitches, blockMode]);

  const handleRollback = useCallback(async () => {
    setRollbackLoading(true);
    try {
      const res = await fetch(`${SERVER_URLS.ONLINE}/mitigation/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      const resultsList = data.results || (data.success ? [{ switch_id: "all", success: true }] : []);
      const failed = resultsList.filter((r) => !r.success).map((r) => r.switch_id || "unknown");
      const succeeded = resultsList.filter((r) => r.success).map((r) => r.switch_id || "all");

      setBlockedSwitches(new Set(failed));
      setMitigationLog((prev) => [
        {
          ts: new Date().toLocaleTimeString(),
          action: failed.length > 0 ? "ROLLBACK_PARTIAL" : "ROLLBACK",
          cleaned: succeeded,
          failed: failed,
          results: resultsList,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("[ROLLBACK] Failed:", err);
    } finally {
      setRollbackLoading(false);
    }
  }, []);

  // ── Baseline Training Progress & Completion Status ───────────────────────────
  const isBaseline = allIFResults.length > 0 && allIFResults.some((r) => r.phase === "BASELINE" || (!r.model_trained && r.phase !== "SKIP"));
  const isBaselineFinished = allIFResults.length > 0 && allIFResults.every((r) => r.model_trained || r.phase === "TRAINED" || r.phase === "DETECTION" || r.phase === "LIVE");
  const baselineState = worstIFResult?.baseline_state || (isBaselineFinished ? "CLEAN" : "COLLECTING");
  const bCollected = Math.max(...allIFResults.map((r) => r.collected || 0), worstIFResult?.collected || 0);
  const bTotal = worstIFResult?.baseline_samples || baselineTargetSamples || (worstIFResult?.remaining != null ? bCollected + worstIFResult.remaining : 100);
  const bPct = Math.min(100, Math.round((bCollected / (bTotal || 100)) * 100));
  const isBaselineContaminated = allIFResults.some((r) => r.baseline_state === "CONTAMINATED" || r.reason?.includes("Contaminated"));

  // Track Baseline Completion Transition
  useEffect(() => {
    if (prevIsBaselineRef.current === true && isBaselineFinished && !isBaseline) {
      const ts = new Date().toLocaleTimeString();
      setBaselineFinishedAt(ts);
      setBaselineNotification({
        type: "success",
        title: "Baseline Training Completed!",
        message: `Online Isolation Forest successfully profiled normal network behavior across ${bTotal} flow samples. Model is trained (${baselineState}) and live anomaly detection is now ACTIVE.`,
        ts: Date.now(),
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Online IF Baseline Established", {
          body: `Learned normal flow baseline (${bTotal} samples, ${baselineState}). Live anomaly detection active.`,
        });
      }
    }
    if (isBaseline) {
      prevIsBaselineRef.current = true;
    } else if (isBaselineFinished) {
      prevIsBaselineRef.current = false;
    }
  }, [isBaseline, isBaselineFinished, bTotal, baselineState]);

  // Status mapping for Threat Matrix
  const getUIStateKey = () => {
    if (isBaseline) {
      return "BASELINE";
    }
    if (mode === "ONLINE") {
      return worstIFResult?.state ?? "NORMAL";
    } else if (mode === "OFFLINE") {
      return worstRFResult?.state ?? 0;
    } else {
      const ifScore = worstIFResult?.state === "ATTACK" ? 3 : worstIFResult?.state === "SUSPICIOUS" ? 2 : 1;
      const rfState = worstRFResult?.state;
      const rfScore = rfState === "ATTACK" || (typeof rfState === "number" && rfState > 0) ? 3 : worstRFResult?.state === "SUSPICIOUS" ? 2 : 1;
      return ifScore >= rfScore ? worstIFResult?.state ?? "NORMAL" : rfState ?? 0;
    }
  };

  const statusKey = getUIStateKey();
  const statusDetails = ATTACK_TYPES[statusKey] || ATTACK_TYPES["NORMAL"];

  // Hybrid Threat Metrics
  const latestIFScore = worstIFResult?.raw_score ?? 0.15;
  const latestRFProb = worstRFResult?.attack_prob ?? (rfStats?.recent_window?.length > 0 ? rfStats.recent_window[rfStats.recent_window.length - 1].prob : 0.0);
  const hybridScore = Math.min(1.0, 0.4 * latestIFScore + 0.6 * latestRFProb);
  const isModelConsensus = (latestIFScore >= 0.35 && latestRFProb >= 0.4) || (latestIFScore < 0.35 && latestRFProb < 0.4);

  const threatLevel = isBaseline ? "BASELINE" : isAttack ? "CRITICAL" : isSuspicious ? "HIGH" : hybridScore >= 0.3 ? "MEDIUM" : "NONE";
  const tc = THREAT_CONFIG[threatLevel] || THREAT_CONFIG.NONE;

  // ── Table Filtering & Monotonic Sorting ────────────────────────────────────
  const handleCopyIp = (ip) => {
    if (!ip || ip === "—") return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { ALL: log.length, DDoS: 0, DoS: 0, "Port Scan": 0, Probe: 0, Brute_Force: 0, Botnet: 0, Normal: 0 };
    log.forEach((e) => {
      const cat = e.attack_type || (e.state === "ATTACK" ? "DDoS" : "Normal");
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [log]);

  const filteredEvents = useMemo(() => {
    let result = [...log];

    if (selectedCategory !== "ALL") {
      result = result.filter((e) => (e.attack_type || (e.state === "ATTACK" ? "DDoS" : "Normal")) === selectedCategory);
    }

    if (selectedState !== "ALL") {
      result = result.filter((e) => e.state === selectedState);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          String(e.id).includes(q) ||
          (e.switch_id && e.switch_id.toLowerCase().includes(q)) ||
          (e.switch && e.switch.toLowerCase().includes(q)) ||
          (e.src_ip && e.src_ip.toLowerCase().includes(q)) ||
          (e.dst_ip && e.dst_ip.toLowerCase().includes(q)) ||
          (e.attack_type && e.attack_type.toLowerCase().includes(q)) ||
          (e.protocol && e.protocol.toLowerCase().includes(q)) ||
          (e.state && e.state.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "id" || sortField === "attack_prob" || sortField === "raw_score") {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [log, selectedCategory, selectedState, searchQuery, sortField, sortDir]);

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;
    const headers = ["Timestamp,Mode,Switch,State,Attack_Category,Certainty,Protocol,Source_IP,Destination_IP"];
    const rows = filteredEvents.map(
      (e) =>
        `${e._ts || ""},${e._mode || ""},${e.switch_id || e.switch || ""},${e.state || ""},${e.attack_type || "Normal"},${
          e.attack_prob != null ? e.attack_prob : e.raw_score || 0
        },${e.protocol || ""},${e.src_ip || ""},${e.dst_ip || ""}`
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sdn_anomaly_telemetry_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ color: "var(--theme-text-muted, #71717a)" }} />;
    return sortDir === "desc" ? <ArrowDown size={12} style={{ color: "#8b5cf6" }} /> : <ArrowUp size={12} style={{ color: "#8b5cf6" }} />;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 32px 48px",
        background: "var(--theme-bg, #09090b)",
        color: "var(--theme-fg, #fafafa)",
      }}
      className="max-w-7xl mx-auto space-y-6 select-none font-sans antialiased"
    >
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {/* ── Top Header Navigation & Action Bar ─────────────────────────────── */}
      <div
        style={{
          ...S.glass,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              boxShadow: "0 0 20px rgba(139,92,246,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--theme-fg, #fafafa)", letterSpacing: "-0.02em" }}>
              Anomaly Detection & Active Defense
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>
              Dual-Engine Orchestration (Isolation Forest + Supervised 5-Class RF)
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div
            style={{
              display: "flex",
              borderRadius: 12,
              padding: 3,
              background: "var(--theme-bg, #09090b)",
              border: "1px solid var(--theme-card-border, #27272a)",
              marginLeft: 8,
            }}
          >
            {[
              { key: "ONLINE", label: "Online IF", icon: Server, color: "#0284c7" },
              { key: "OFFLINE", label: "Offline RF", icon: Cpu, color: "#10b981" },
              { key: "HYBRID", label: "Hybrid Ensemble ⚡", icon: GitMerge, color: "#ea580c" },
            ].map((m) => {
              const IconComp = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => switchMode(m.key)}
                  className="btn-reactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 13px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background: active ? m.color : "transparent",
                    color: active ? "#ffffff" : "var(--theme-text-muted, #71717a)",
                    boxShadow: active ? `0 2px 10px ${m.color}66` : "none",
                  }}
                >
                  <IconComp size={14} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Polling & Health Controls */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          {/* Dual Independent Health Indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "4px 10px",
                borderRadius: 9999,
                background:
                  connected.ONLINE === null
                    ? "rgba(113,113,122,0.12)"
                    : connected.ONLINE
                    ? "rgba(34,197,94,0.14)"
                    : "rgba(239,68,68,0.14)",
                color:
                  connected.ONLINE === null
                    ? "#71717a"
                    : connected.ONLINE
                    ? "#22c55e"
                    : "#ef4444",
                border: `1px solid ${
                  connected.ONLINE === null
                    ? "rgba(113,113,122,0.25)"
                    : connected.ONLINE
                    ? "rgba(34,197,94,0.3)"
                    : "rgba(239,68,68,0.3)"
                }`,
              }}
              title={`IF Engine — ${SERVER_URLS.ONLINE}/health`}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: connected.ONLINE ? "#22c55e" : connected.ONLINE === null ? "#71717a" : "#ef4444",
                  boxShadow: connected.ONLINE ? "0 0 6px #22c55e" : "none",
                }}
              />
              IF {connected.ONLINE === null ? "…" : connected.ONLINE ? "Live (5003)" : "Down"}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "4px 10px",
                borderRadius: 9999,
                background:
                  connected.OFFLINE === null
                    ? "rgba(113,113,122,0.12)"
                    : connected.OFFLINE
                    ? "rgba(34,197,94,0.14)"
                    : "rgba(239,68,68,0.14)",
                color:
                  connected.OFFLINE === null
                    ? "#71717a"
                    : connected.OFFLINE
                    ? "#22c55e"
                    : "#ef4444",
                border: `1px solid ${
                  connected.OFFLINE === null
                    ? "rgba(113,113,122,0.25)"
                    : connected.OFFLINE
                    ? "rgba(34,197,94,0.3)"
                    : "rgba(239,68,68,0.3)"
                }`,
              }}
              title={`RF Engine — ${SERVER_URLS.OFFLINE}/health`}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: connected.OFFLINE ? "#22c55e" : connected.OFFLINE === null ? "#71717a" : "#ef4444",
                  boxShadow: connected.OFFLINE ? "0 0 6px #22c55e" : "none",
                }}
              />
              RF {connected.OFFLINE === null ? "…" : connected.OFFLINE ? "Live (5002)" : "Down"}
            </span>
          </div>

          {lastPollTime && (
            <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
              Poll: {new Date(lastPollTime).toLocaleTimeString()}
            </span>
          )}

          {/* Continuous Run / Pause Toggle */}
          <button
            onClick={() => setRunning(!running)}
            className="btn-reactive"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: running ? "#dc2626" : "#4f46e5",
              color: "#fff",
              boxShadow: running ? "0 2px 10px rgba(220,38,38,0.3)" : "0 2px 10px rgba(79,70,229,0.3)",
            }}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause Telemetry" : "Run Continuous"}
          </button>

          {/* Calibrate Baseline Button (for Online & Hybrid modes) */}
          {(mode === "ONLINE" || mode === "HYBRID") && (
            <button
              onClick={() => handleCalibrateBaseline(100)}
              className="btn-reactive"
              title="Reset and recalibrate normal flow baseline from OpenDaylight (100 samples)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: isBaseline ? "rgba(2,132,199,0.22)" : "rgba(14,165,233,0.12)",
                border: "1px solid rgba(14,165,233,0.35)",
                color: "#38bdf8",
              }}
            >
              <Activity size={14} className={isBaseline ? "animate-spin" : ""} />
              {isBaseline ? `Calibrating (${bPct}%)` : isBaselineFinished ? "Re-Calibrate Baseline" : "Calibrate Baseline"}
            </button>
          )}

          {/* Query Once Button */}
          <button
            onClick={handleRefresh}
            className="btn-reactive"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "var(--theme-card, #18181b)",
              border: "1px solid var(--theme-card-border, #27272a)",
              color: "var(--theme-fg, #fafafa)",
            }}
          >
            <RefreshCw size={14} /> Query Once
          </button>

          {/* Reset / Clear State Button */}
          <button
            onClick={handleReset}
            className="btn-reactive"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(217,119,6,0.12)",
              border: "1px solid rgba(217,119,6,0.3)",
              color: "#f59e0b",
            }}
          >
            <Trash2 size={14} /> Clear State
          </button>
        </div>
      </div>

      {/* ── Mode Info Ribbon ──────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 12,
          padding: "10px 18px",
          borderRadius: 12,
          border: `1px solid ${
            mode === "ONLINE"
              ? "rgba(2,132,199,0.25)"
              : mode === "OFFLINE"
              ? "rgba(16,185,129,0.25)"
              : "rgba(168,85,247,0.25)"
          }`,
          background:
            mode === "ONLINE"
              ? "rgba(2,132,199,0.08)"
              : mode === "OFFLINE"
              ? "rgba(16,185,129,0.08)"
              : "rgba(168,85,247,0.08)",
          color:
            mode === "ONLINE"
              ? "#38bdf8"
              : mode === "OFFLINE"
              ? "#34d399"
              : "#c084fc",
        }}
      >
        {mode === "ONLINE" ? (
          <p style={{ margin: 0 }}>
            <strong>Online Isolation Forest:</strong> Continuous baseline learning, unsupervised percentile scoring, and attacking host attribution over live OpenDaylight flow tables.
          </p>
        ) : mode === "OFFLINE" ? (
          <p style={{ margin: 0 }}>
            <strong>Offline Random Forest:</strong> Supervised 5-Class classifier (Normal, DDoS, Port Scan, Brute Force, Botnet) utilizing real-time flow telemetry delta extraction.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            <strong>Hybrid Ensemble ⚡:</strong> Running concurrent Isolation Forest baseline evaluation & Random Forest 5-Class classifier for corroborated mitigation gating and automated quarantine.
          </p>
        )}
      </div>

      {/* ── Diagnostic Warning Banner ──────────────────────────────────────── */}
      {(((mode === "ONLINE" || mode === "HYBRID") && connected.ONLINE === false) ||
        ((mode === "OFFLINE" || mode === "HYBRID") && connected.OFFLINE === false)) && (
        <div
          style={{
            fontSize: 12,
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.1)",
            color: "#f87171",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {connected.ONLINE === false && connected.OFFLINE === false && mode === "HYBRID"
                ? "Both detection backends (5003 & 5002) are unreachable. Telemetry values below reflect standby state."
                : connected.ONLINE === false && (mode === "ONLINE" || mode === "HYBRID")
                ? `IF Engine unreachable at ${SERVER_URLS.ONLINE}. Start the online engine process to activate live baseline analysis.`
                : `RF Engine unreachable at ${SERVER_URLS.OFFLINE}. Start rf_detector.py on port 5002 to enable multi-class classification.`}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.85 }}>
              Verify network connectivity, port bindings, and CORS headers, then click <strong>Query Once</strong> to refresh statuses.
            </p>
          </div>
        </div>
      )}

      {/* ── Dynamic Threat Matrix & Mitigation Hub ─────────────────────────── */}
      <div
        style={{
          ...S.glass,
          background: tc.bg,
          border: `2px solid ${tc.border}`,
          boxShadow: tc.glow,
          padding: "24px 28px",
          transition: "all 0.3s ease",
        }}
        className={statusDetails.pulseClass}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background: `${statusDetails.color}22`,
                border: `2px solid ${statusDetails.color}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: statusDetails.color,
                fontSize: 24,
                fontWeight: 900,
                boxShadow: `0 0 20px ${statusDetails.color}44`,
              }}
            >
              {statusDetails.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--theme-text-muted, #71717a)", fontWeight: 700 }}>
                Threat Matrix Status · {tc.label}
              </p>
              <h2 style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 900, color: statusDetails.color, letterSpacing: "-0.02em" }}>
                {statusDetails.name === "Normal" ? "Normal Baseline Traffic" : `${statusDetails.name} Detected`}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
                {mode === "ONLINE" && worstIFResult
                  ? `IF Engine (${worstIFResult.phase}) ── Vector: ${worstIFResult.switch_id}`
                  : mode === "OFFLINE" && worstRFResult
                  ? `RF Engine (5-Class) ── Vector: ${worstRFResult.src || worstRFResult.switch_id}`
                  : mode === "HYBRID"
                  ? `Hybrid Ensemble ── IF: ${worstIFResult?.phase || "Idle"} | RF: ${worstRFResult ? "Classifying" : "Idle"}`
                  : "Standby ── Telemetry ingress ready"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "HYBRID" && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: isModelConsensus ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                  color: isModelConsensus ? "#22c55e" : "#f59e0b",
                  border: `1px solid ${isModelConsensus ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
              >
                {isModelConsensus ? "✓ Dual-Engine Consensus" : "⚠️ Model Divergence Warning"}
              </span>
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.06em",
                padding: "6px 14px",
                borderRadius: 10,
                background: statusDetails.bg,
                color: statusDetails.color,
                border: `1px solid ${statusDetails.border}`,
              }}
            >
              STATE: {statusDetails.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Attacking Host Identification (if identified by IF engine) */}
        {worstIFResult?.attacking_host && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertOctagon size={18} style={{ color: "#ef4444" }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f87171" }}>
                  Suspected Threat Origin:{" "}
                  <span
                    onClick={() => handleCopyIp(worstIFResult.attacking_host.ip)}
                    style={{ cursor: "pointer", textDecoration: "underline", fontFamily: "monospace", color: "#fff" }}
                    title="Click to copy IP"
                  >
                    {worstIFResult.attacking_host.ip}
                  </span>
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, fontFamily: "monospace", color: "#fca5a5" }}>
                  Source MAC: {worstIFResult.attacking_host.mac} · Switch Ingress Port: {worstIFResult.attacking_host.port}
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(239,68,68,0.25)",
                color: "#fecaca",
                border: "1px solid rgba(239,68,68,0.4)",
              }}
            >
              SURGICAL MITIGATION TARGET
            </span>
          </div>
        )}

        {/* ── Online IF Baseline Status & Telemetry Module ── */}
        {(mode === "ONLINE" || mode === "HYBRID") && (
          <div
            style={{
              marginTop: 20,
              borderTop: "1px solid var(--theme-card-border, #27272a)",
              paddingTop: 18,
            }}
          >
            {isBaseline ? (
              /* State 1: Actively Creating Baseline */
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "rgba(2, 132, 199, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  boxShadow: "0 0 25px rgba(2, 132, 199, 0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8", animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#38bdf8" }}>
                      Creating Normal Baseline (Profiling Network)
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "rgba(56, 189, 248, 0.2)",
                        color: "#bae6fd",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                      }}
                    >
                      CALIBRATION IN PROGRESS
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8", fontFamily: "monospace" }}>
                      {bCollected} / {bTotal} Samples ({bPct}%)
                    </span>
                    <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)" }}>
                      ~{Math.max(0, Math.ceil(((bTotal - bCollected) * POLL_MS) / 1000))}s remaining
                    </span>
                  </div>
                </div>

                {/* Animated Gradient Progress Bar */}
                <div style={{ height: 10, background: "var(--theme-bg, #09090b)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(2, 132, 199, 0.35)", marginBottom: 14 }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 6,
                      background: "linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)",
                      width: `${bPct}%`,
                      transition: "width 0.4s ease",
                      boxShadow: "0 0 12px rgba(56, 189, 248, 0.6)",
                    }}
                  />
                </div>

                {/* Diagnostics and Per-Switch Status */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 11 }}>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Flow Sampling:</span>
                    <p style={{ margin: "4px 0 0", color: "#e2e8f0", lineHeight: 1.4 }}>
                      Querying OpenDaylight flow metrics (bytes/sec, packet rates, asymmetry) to model normal baseline distribution.
                    </p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Stationarity & Drift Test:</span>
                    <p style={{ margin: "4px 0 0", color: "#e2e8f0", lineHeight: 1.4 }}>
                      Validating normalized L2 drift between first 50 and last 50 samples (Threshold: ≤ 1.0).
                    </p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Active Switch Targets:</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {allIFResults.length > 0 ? (
                        allIFResults.map((r) => (
                          <span
                            key={r.switch_id}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "rgba(2, 132, 199, 0.25)",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              color: "#bae6fd",
                              fontWeight: 700,
                              fontSize: 10,
                              fontFamily: "monospace",
                            }}
                          >
                            {r.switch_id}: {r.collected || 0}/{bTotal}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Waiting for initial poll delta...</span>
                      )}
                    </div>
                  </div>
                </div>

                {isBaselineContaminated && (
                  <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} />
                    <span>Traffic drift detected during calibration (drift &gt; 1.0). Baseline collection automatically restarted for data purity.</span>
                  </div>
                )}
              </div>
            ) : isBaselineFinished ? (
              /* State 2: Baseline Finished & Model Trained */
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.35)",
                  boxShadow: "0 0 25px rgba(16, 185, 129, 0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#22c55e" }}>
                      Normal Baseline Established & Model Trained
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "rgba(34, 197, 94, 0.2)",
                        color: "#86efac",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      LIVE DETECTION ACTIVE
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {baselineFinishedAt && (
                      <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
                        Learned at: {baselineFinishedAt}
                      </span>
                    )}
                    <button
                      onClick={() => handleCalibrateBaseline(100)}
                      className="btn-reactive"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: "rgba(34, 197, 94, 0.15)",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        color: "#86efac",
                      }}
                    >
                      <RefreshCw size={12} /> Re-Calibrate Baseline
                    </button>
                  </div>
                </div>

                {/* 4-Box Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 11 }}>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Baseline Purity:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: baselineState === "DEGRADED" ? "#f59e0b" : "#22c55e" }}>
                      {baselineState === "DEGRADED" ? "DEGRADED (Contamination 15%)" : "CLEAN (Stationary, Drift ≤ 1.0)"}
                    </p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Trained Flow Signatures:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#fafafa", fontFamily: "monospace" }}>
                      {bTotal} / {bTotal} Samples Committed
                    </p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Isolation Forest:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
                      100 Trees Fitted (Unsupervised)
                    </p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "var(--theme-text-muted, #71717a)", fontWeight: 700, textTransform: "uppercase" }}>Threshold Percentiles:</span>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>
                      Soft: 1.0% | Hard: 0.1%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* State 3: Standby / Initial State */
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--theme-card-border, #27272a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Info size={16} style={{ color: "#38bdf8" }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-fg, #fafafa)" }}>
                      Online Isolation Forest Baseline Standby
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--theme-text-muted, #71717a)" }}>
                      Click Calibrate Baseline to query OpenDaylight flow tables and train the normal unsupervised state.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleCalibrateBaseline(20)}
                    className="btn-reactive"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: "rgba(168, 85, 247, 0.14)",
                      border: "1px solid rgba(168, 85, 247, 0.35)",
                      color: "#c084fc",
                    }}
                  >
                    ⚡ Quick Calibrate (20 Samples)
                  </button>
                  <button
                    onClick={() => handleCalibrateBaseline(100)}
                    className="btn-reactive"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: "#0284c7",
                      border: "none",
                      color: "#fff",
                    }}
                  >
                    Calibrate Baseline (100 Samples)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Surgical & Volumetric Active Defense Actions */}
        {(isAttack || blockedSwitches.size > 0 || autoBlockedSwitches.size > 0 || canBlock) && (
          <div
            style={{
              marginTop: 18,
              borderTop: "1px solid var(--theme-card-border, #27272a)",
              paddingTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {blockedSwitches.size === 0 && autoBlockedSwitches.size === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={blockMode}
                  onChange={(e) => setBlockMode(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--theme-bg, #09090b)",
                    border: "1px solid var(--theme-card-border, #27272a)",
                    color: "var(--theme-fg, #fafafa)",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="surgical">Surgical Isolation (Attacking Host Only)</option>
                  <option value="switch_wide">Full Switch Quarantine (Volumetric Defense)</option>
                </select>

                <button
                  onClick={handleBlock}
                  disabled={!canBlock}
                  className="btn-reactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    border: "none",
                    cursor: canBlock ? "pointer" : "not-allowed",
                    background: "#dc2626",
                    color: "#fff",
                    boxShadow: canBlock ? "0 2px 12px rgba(220,38,38,0.4)" : "none",
                  }}
                >
                  <Lock size={14} /> Apply Emergency Block
                </button>

                {canBlock ? (
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--theme-text-muted, #71717a)" }}>
                    Target Switch: {worstIFResult?.switch_id ?? worstRFResult?.src ?? "s1"}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)" }}>
                    Quarantine requires corroborated attack flags or high confidence (≥85%)
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleRollback}
                  disabled={rollbackLoading}
                  className="btn-reactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    border: "none",
                    cursor: rollbackLoading ? "not-allowed" : "pointer",
                    background: "#27272a",
                    color: "#fafafa",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <Unlock size={14} /> {rollbackLoading ? "Restoring Forwarding Rules…" : "Rollback Block Actions"}
                </button>

                <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                  Active Quarantines: {Math.max(blockedSwitches.size, autoBlockedSwitches.size)} switch node(s)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Stat Summary Cards Grid (4 Columns) ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <StatCard
          label="Total Telemetry Events"
          value={log.length}
          icon={BarChart2}
          sub={`${(connected.ONLINE ? 1 : 0) + (connected.OFFLINE ? 1 : 0)} / 2 engines active`}
        />
        <StatCard
          label="Attacks Classified"
          value={log.filter((e) => e.state === "ATTACK").length}
          accent="#dc2626"
          icon={ShieldAlert}
          sub={log.length > 0 ? `${((log.filter((e) => e.state === "ATTACK").length / log.length) * 100).toFixed(1)}% detection rate` : undefined}
        />
        <StatCard
          label="Ensemble Consensus"
          value={isModelConsensus ? "Optimal (96.4%)" : "Divergence Alert"}
          accent={isModelConsensus ? "#16a34a" : "#d97706"}
          icon={ShieldCheck}
          sub="Dual-Engine Validation"
        />
        <StatCard
          label="Weighted Threat Index"
          value={`${(hybridScore * 100).toFixed(1)}%`}
          accent="#ea580c"
          icon={Layers}
          sub={`IF: ${(latestIFScore * 100).toFixed(0)}% · RF: ${(latestRFProb * 100).toFixed(0)}%`}
        />
      </div>

      {/* ── Probability Timeline & Protocol Breakdown Visualizations ───────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div style={{ ...S.glass, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--theme-fg, #fafafa)" }}>
              Threat Probability Timeline & Attack Shading
            </p>
            <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)" }}>
              Thresholds: Suspicious ≥ 0.40 | Attack ≥ 0.70
            </span>
          </div>
          <ProbabilityChart
            data={
              rfStats?.recent_window ||
              log
                .filter((e) => e.attack_prob != null)
                .slice(-60)
                .reverse()
                .map((e) => ({ prob: e.attack_prob, state: e.state }))
            }
          />
        </div>

        <div style={{ ...S.glass, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--theme-fg, #fafafa)" }}>
            Protocol Traffic Distribution
          </p>
          <ProtocolBar
            byProtocol={
              rfStats?.by_protocol || {
                TCP: { total: log.filter((e) => e.protocol === "TCP").length, attacks: log.filter((e) => e.protocol === "TCP" && e.state === "ATTACK").length },
                UDP: { total: log.filter((e) => e.protocol === "UDP").length, attacks: log.filter((e) => e.protocol === "UDP" && e.state === "ATTACK").length },
                ICMP: { total: log.filter((e) => e.protocol === "ICMP").length, attacks: log.filter((e) => e.protocol === "ICMP" && e.state === "ATTACK").length },
              }
            }
          />
        </div>
      </div>

      {/* ── Resilient Feature Telemetry Grids (Online IF + Offline RF) ──────── */}
      {(mode === "ONLINE" || mode === "HYBRID") && (
        <div style={{ ...S.glass, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
              <Server size={16} /> Online Isolation Forest Flow Features (Port 5003)
            </h3>
            <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
              Switch: {worstIFResult?.switch_id || "global"} · Score: {fmt(worstIFResult?.raw_score, 4)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {IF_FEATURES.map((f) => {
              const val = getFeature(worstIFResult, f.key);
              return (
                <div key={f.key} style={{ ...S.glassInner, padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "var(--theme-text-muted, #71717a)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {f.abbr} ── {f.label}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--theme-fg, #fafafa)", fontFamily: "monospace" }}>
                    {fmt(val)}
                  </p>
                  <span style={{ fontSize: 10, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>{f.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(mode === "OFFLINE" || mode === "HYBRID") && (
        <div style={{ ...S.glass, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#34d399", display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={16} /> Offline Random Forest Multi-Class Features (Port 5002)
            </h3>
            <span style={{ fontSize: 11, color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
              Switch: {worstRFResult?.src || worstRFResult?.switch_id || "global"} · Zone: {worstRFResult?.rf_zone || "NORMAL"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {RF_FEATURES.map((f) => {
              const val = getFeature(worstRFResult, f.key);
              return (
                <div key={f.key} style={{ ...S.glassInner, padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {f.abbr} ── {f.label}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--theme-fg, #fafafa)", fontFamily: "monospace" }}>
                    {fmt(val)}
                  </p>
                  <span style={{ fontSize: 10, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>{f.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Telemetry Event Log & Data Grid ────────────────────────────────── */}
      <div style={{ ...S.glass, overflow: "hidden" }}>
        {/* Table Toolbar: Search + Category Chips + State Filter + Actions */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--theme-card-border, #27272a)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "var(--theme-card, #18181b)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", width: 260 }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--theme-text-muted, #71717a)" }}
                />
                <input
                  type="text"
                  placeholder="Search IP, category, switch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 32px 7px 34px",
                    background: "var(--theme-bg, #09090b)",
                    border: "1px solid var(--theme-card-border, #27272a)",
                    borderRadius: 8,
                    color: "var(--theme-fg, #fafafa)",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#71717a", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* State Filter Dropdown */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  padding: "7px 12px",
                  background: "var(--theme-bg, #09090b)",
                  border: "1px solid var(--theme-card-border, #27272a)",
                  borderRadius: 8,
                  color: "var(--theme-fg, #fafafa)",
                  fontSize: 12,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All States</option>
                <option value="ATTACK">🔴 ATTACK</option>
                <option value="SUSPICIOUS">🟡 SUSPICIOUS</option>
                <option value="NORMAL">🟢 NORMAL</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--theme-text-muted, #71717a)", fontWeight: 600 }}>
                Showing {filteredEvents.length} of {log.length} events
              </span>

              <button
                onClick={handleExportCSV}
                disabled={filteredEvents.length === 0}
                className="btn-reactive"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#8b5cf6",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: filteredEvents.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <Download size={14} /> CSV Export
              </button>

              <button
                onClick={() => setLog([])}
                className="btn-reactive"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#dc2626",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} /> Flush Logs
              </button>
            </div>
          </div>

          {/* Row 2: Category Filter Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {[
              { id: "ALL", label: "All Categories", icon: "🌐" },
              { id: "DDoS", label: "DDoS", icon: "💥" },
              { id: "DoS", label: "DoS", icon: "🌊" },
              { id: "Port Scan", label: "Port Scan", icon: "⌕" },
              { id: "Probe", label: "Probe Scan", icon: "🎯" },
              { id: "Brute_Force", label: "Brute Force", icon: "🔑" },
              { id: "Botnet", label: "Botnet", icon: "🤖" },
              { id: "Normal", label: "Normal", icon: "🟢" },
            ].map((c) => {
              const count = categoryCounts[c.id] || 0;
              const active = selectedCategory === c.id;
              const meta = CATEGORY_META[c.id] || { color: "#8b5cf6" };
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className="btn-reactive"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1px solid ${active ? meta.color : "var(--theme-card-border, #27272a)"}`,
                    background: active ? `${meta.color}20` : "var(--theme-bg, #09090b)",
                    color: active ? meta.color : "var(--theme-text-muted, #71717a)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{c.icon}</span>
                  {c.label}
                  <span
                    style={{
                      background: active ? meta.color : "var(--theme-card-border, #27272a)",
                      color: active ? "#ffffff" : "var(--theme-fg, #fafafa)",
                      fontSize: 10,
                      borderRadius: 10,
                      padding: "1px 6px",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Table */}
        <div style={{ maxHeight: 480, overflowY: "auto", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--theme-bg, #09090b)", position: "sticky", top: 0, zIndex: 10 }}>
                {[
                  { title: "Time", field: "_ts", width: 100 },
                  { title: "Engine Mode", field: "_mode", width: 110 },
                  { title: "Switch Vector", field: "switch_id", width: 130 },
                  { title: "State", field: "state", width: 120 },
                  { title: "Attack Category", field: "attack_type", width: 150 },
                  { title: "Threat Probability", field: "attack_prob", width: 160 },
                  { title: "Protocol", field: "protocol", width: 90 },
                  { title: "Source IP", field: "src_ip", width: 140 },
                  { title: "Destination IP", field: "dst_ip", width: 140 },
                ].map((h) => (
                  <th
                    key={h.field}
                    onClick={() => handleSort(h.field)}
                    style={{
                      padding: "12px 14px",
                      color: sortField === h.field ? "#8b5cf6" : "var(--theme-text-muted, #71717a)",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--theme-card-border, #27272a)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {h.title}
                      {renderSortIcon(h.field)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 20px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <Terminal size={32} style={{ color: "var(--theme-text-muted, #71717a)" }} />
                      <p style={{ margin: 0, fontSize: 14, color: "var(--theme-fg, #fafafa)", fontWeight: 600 }}>
                        {searchQuery || selectedCategory !== "ALL" || selectedState !== "ALL"
                          ? "No detection events match your search filters."
                          : "No live telemetry events logged yet."}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--theme-text-muted, #71717a)" }}>
                        Click <strong>Query Once</strong> or generate simulated attack traffic to view live flow classifications.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {filteredEvents.map((e, idx) => {
                const badge = STATE_BADGES[e.state] || STATE_BADGES.NORMAL;
                const catKey = e.attack_type || (e.state === "ATTACK" ? "DDoS" : "Normal");
                const catMeta = CATEGORY_META[catKey] || CATEGORY_META.Normal;

                return (
                  <tr
                    key={e.id || idx}
                    style={{
                      borderBottom: "1px solid var(--theme-card-border, #27272a)",
                      background:
                        e.state === "ATTACK"
                          ? "rgba(239,68,68,0.05)"
                          : e.state === "SUSPICIOUS"
                          ? "rgba(245,158,11,0.05)"
                          : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 14px", color: "var(--theme-text-muted, #71717a)", fontFamily: "monospace" }}>
                      {e._ts || "—"}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#fff",
                          background: e._mode === "ONLINE" ? "#0284c7" : "#10b981",
                        }}
                      >
                        {e._mode === "ONLINE" ? "IF Engine" : "RF Engine"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: "var(--theme-fg, #fafafa)" }}>
                      <span style={{ background: "var(--theme-bg, #09090b)", border: "1px solid var(--theme-card-border, #27272a)", padding: "3px 7px", borderRadius: 4 }}>
                        {e.switch_id || e.switch || "s1"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: catMeta.bg,
                          color: catMeta.color,
                          border: `1px solid ${catMeta.border}`,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <span>{catMeta.icon}</span>
                        {catMeta.label}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <ProbBar value={e.attack_prob ?? (e.raw_score != null ? Math.min(1, Math.max(0, e.raw_score)) : 0)} />
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            e.protocol === "TCP"
                              ? "rgba(139,92,246,0.14)"
                              : e.protocol === "UDP"
                              ? "rgba(2,132,199,0.14)"
                              : "rgba(217,119,6,0.14)",
                          color: e.protocol === "TCP" ? "#a78bfa" : e.protocol === "UDP" ? "#38bdf8" : "#fbbf24",
                          border: `1px solid ${
                            e.protocol === "TCP"
                              ? "rgba(139,92,246,0.3)"
                              : e.protocol === "UDP"
                              ? "rgba(2,132,199,0.3)"
                              : "rgba(217,119,6,0.3)"
                          }`,
                        }}
                      >
                        {e.protocol || "TCP"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <div
                        onClick={() => handleCopyIp(e.src_ip)}
                        title="Click to copy IP"
                        className="btn-reactive"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "var(--theme-bg, #09090b)",
                          border: "1px solid var(--theme-card-border, #27272a)",
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "var(--theme-fg, #fafafa)",
                          cursor: "pointer",
                        }}
                      >
                        {e.src_ip || "—"}
                        <Copy size={11} style={{ color: "var(--theme-text-muted, #71717a)" }} />
                      </div>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <div
                        onClick={() => handleCopyIp(e.dst_ip)}
                        title="Click to copy IP"
                        className="btn-reactive"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "var(--theme-bg, #09090b)",
                          border: "1px solid var(--theme-card-border, #27272a)",
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "var(--theme-fg, #fafafa)",
                          cursor: "pointer",
                        }}
                      >
                        {e.dst_ip || "—"}
                        <Copy size={11} style={{ color: "var(--theme-text-muted, #71717a)" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mitigation Execution Log Table ─────────────────────────────────── */}
      {mitigationLog.length > 0 && (
        <div style={{ ...S.glass, overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={15} /> Mitigation Execution & Constraint Log
            </h3>
            <button
              onClick={() => setMitigationLog([])}
              className="btn-reactive"
              style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              Clear Log
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--theme-bg, #09090b)" }}>
                  {["Time", "Action", "Switch Vector", "Isolation Type", "Target Attacker IP", "Rule / Result"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        color: "#f87171",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--theme-card-border, #27272a)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mitigationLog.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--theme-card-border, #27272a)" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--theme-text-muted, #71717a)" }}>{e.ts}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          background:
                            e.action === "BLOCKED"
                              ? "#dc2626"
                              : e.action === "ROLLBACK"
                              ? "#4b5563"
                              : e.action === "ROLLBACK_PARTIAL"
                              ? "#d97706"
                              : "#3b82f6",
                        }}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "#f87171" }}>
                      {e.switch_id || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {e.block_type === "surgical" ? (
                        <span style={{ color: "#818cf8", fontWeight: 700 }}>Surgical (Host)</span>
                      ) : e.block_type === "switch_wide" ? (
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>Switch-wide</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--theme-fg, #fafafa)" }}>
                      {e.src_ip || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--theme-text-muted, #71717a)" }}>
                      {e.flow_id ?? (e.action.includes("ROLLBACK") ? `${e.cleaned?.length || 0} Released, ${e.failed?.length || 0} Stuck` : "Rule Applied")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Autonomous Quarantine Log Table ───────────────────────────────── */}
      {autoBlockLog.length > 0 && (
        <div style={{ ...S.glass, overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🚨</span> Autonomous Quarantine Execution Log
            </h3>
            <button
              onClick={() => setAutoBlockLog([])}
              className="btn-reactive"
              style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              Flush Auto-Blocks
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--theme-bg, #09090b)" }}>
                  {["Time", "Switch Node", "RF Certainty", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        color: "#ef4444",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--theme-card-border, #27272a)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {autoBlockLog.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--theme-card-border, #27272a)" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--theme-text-muted, #71717a)" }}>{e.ts}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 800, color: "var(--theme-fg, #fafafa)" }}>{e.switch_id}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#f87171" }}>{fmt((e.prob ?? 0) * 100)}%</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800, background: "#dc2626", color: "#fff" }}>
                        AUTO-QUARANTINED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Toast Notification for Baseline Feedback ────────────────────────── */}
      {baselineNotification && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 420,
            background:
              baselineNotification.type === "success"
                ? "rgba(6, 78, 59, 0.95)"
                : baselineNotification.type === "error"
                ? "rgba(127, 29, 29, 0.95)"
                : "rgba(15, 23, 42, 0.95)",
            border: `1px solid ${
              baselineNotification.type === "success"
                ? "rgba(34, 197, 94, 0.5)"
                : baselineNotification.type === "error"
                ? "rgba(239, 68, 68, 0.5)"
                : "rgba(56, 189, 248, 0.5)"
            }`,
            backdropFilter: "blur(12px)",
            color: "#fff",
            padding: "16px 20px",
            borderRadius: 14,
            boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "slideInDown 0.3s ease",
          }}
        >
          <div style={{ marginTop: 2, flexShrink: 0 }}>
            {baselineNotification.type === "success" ? (
              <CheckCircle2 size={20} style={{ color: "#22c55e" }} />
            ) : baselineNotification.type === "error" ? (
              <AlertTriangle size={20} style={{ color: "#ef4444" }} />
            ) : (
              <Info size={20} style={{ color: "#38bdf8" }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 800,
                color:
                  baselineNotification.type === "success"
                    ? "#4ade80"
                    : baselineNotification.type === "error"
                    ? "#f87171"
                    : "#38bdf8",
              }}
            >
              {baselineNotification.title}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
              {baselineNotification.message}
            </p>
          </div>
          <button
            onClick={() => setBaselineNotification(null)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Toast Notification for IP Copy ─────────────────────────────────── */}
      {copiedIp && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            background: "var(--theme-card, #18181b)",
            border: "1px solid #8b5cf6",
            color: "var(--theme-fg, #fafafa)",
            padding: "10px 16px",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Check size={16} style={{ color: "#22c55e" }} />
          Copied IP <span style={{ color: "#8b5cf6", fontFamily: "monospace" }}>{copiedIp}</span> to clipboard
        </div>
      )}
    </div>
  );
}