// ─────────────────────────────────────────────────────────────────────────────
// intentParser.js — Rule-based NL → intent engine for OpenDaylight SDN
// ─────────────────────────────────────────────────────────────────────────────

export const TRAFFIC_TYPES = {
  ALL: 'All Traffic (Drop completely)',
  HTTP: 'HTTP (TCP 80)',
  HTTPS: 'HTTPS (TCP 443)',
  SSH: 'SSH (TCP 22)',
  DNS: 'DNS (UDP 53)',
  ICMP: 'ICMP (Ping)',
};

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
export const LATENCY_LEVELS = ['Low', 'Medium', 'High'];

const NAV_ROUTES = [
  { keys: ['topology', 'network map', 'map', 'infrastructure'], path: '/topology', label: 'Topology' },
  { keys: ['dashboard', 'command centre', 'command center', 'home', 'overview'], path: '/dashboard', label: 'Dashboard' },
  { keys: ['node', 'device', 'switch inventory'], path: '/nodes', label: 'Devices' },
  { keys: ['flow', 'flow table'], path: '/flows', label: 'Flows' },
  { keys: ['stat', 'metric', 'bandwidth history'], path: '/stats', label: 'Stats' },
  { keys: ['anomaly', 'threat', 'security'], path: '/anomaly', label: 'Anomaly' },
  { keys: ['cloud'], path: '/cloud', label: 'Cloud' },
  { keys: ['tool', 'api tester', 'yang'], path: '/api-tester', label: 'Tools' },
];

const SLICING_TRIGGERS = ['isolate', 'quarantine', 'slice', 'throttle', 'sever', 'cut', 'limit', 'restrict', 'block', 'drop', 'stop', 'firewall'];

const lc = (s) => (s || '').toLowerCase();

function parseBandwidthKbps(text) {
  const m = lc(text).match(/(\d+(?:\.\d+)?)\s*(gbps|gb|g|mbps|mb|m|kbps|kb|k)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (unit.startsWith('g')) return Math.round(n * 1_000_000);
  if (unit.startsWith('m')) return Math.round(n * 1_000);
  return Math.round(n);
}

function parseTrafficType(text) {
  const t = lc(text);
  if (/\bhttps\b|ssl|tls|443|secure/.test(t)) return TRAFFIC_TYPES.HTTPS;
  if (/\bhttp\b|web|tcp\s*80|\b80\b/.test(t)) return TRAFFIC_TYPES.HTTP;
  if (/\bssh\b|\b22\b/.test(t)) return TRAFFIC_TYPES.SSH;
  if (/\bdns\b|\b53\b/.test(t)) return TRAFFIC_TYPES.DNS;
  if (/\bicmp\b|ping/.test(t)) return TRAFFIC_TYPES.ICMP;
  return TRAFFIC_TYPES.ALL;
}

function parsePriority(text) {
  const t = lc(text);
  if (/critical|emergency|hospital|life|urgent/.test(t)) return 'Critical';
  if (/\bhigh\b|important|priorit/.test(t)) return 'High';
  if (/\blow\b|guest|background|bulk/.test(t)) return 'Low';
  return 'Medium';
}

function parseLatency(text) {
  const t = lc(text);
  if (/low latency|real-?time|realtime|latency\s*sensitive|voip|voice|video|hospital|critical/.test(t)) return 'Low';
  if (/high latency|tolerant|batch/.test(t)) return 'High';
  return 'Medium';
}

function parseHostHints(text) {
  const hints = new Set();
  // \b around the whole alternation — without it, "h" alone matched the "h"
  // inside ordinary words (e.g. "...traffic wit́h 20000 Kbps" was silently
  // parsed as "host 20000", polluting hostHints with a phantom host that
  // just happened to never resolve against real topology).
  const re = /\b(?:host|laptop|node|h)\s*[:#-]?\s*(\d+)\b/g;
  let m;
  while ((m = re.exec(lc(text))) !== null) hints.add(parseInt(m[1], 10));
  return [...hints];
}

function suggestName(text, priority) {
  const t = lc(text);
  if (/hospital/.test(t)) return 'Hospital-Traffic';
  if (/guest/.test(t)) return 'Guest-Network';
  if (/quarantine/.test(t)) return 'Quarantine-Zone';
  if (priority === 'Critical') return 'Critical-Slice';
  return `AI-Intent-${Math.floor(Math.random() * 1000)}`;
}

// Re-runs the exact same patterns the individual parse* functions above use,
// this time capturing the literal matched substring rather than a boolean —
// so "matched keywords" in the UI is always what the parser itself actually
// keyed on, never a separately-invented list that could drift from reality.
function collectMatchedKeywords(t) {
  const found = [];
  const add = (re) => {
    const m = t.match(re);
    if (m && m[0] && !found.includes(m[0])) found.push(m[0]);
  };
  SLICING_TRIGGERS.forEach((k) => { if (t.includes(k) && !found.includes(k)) found.push(k); });
  add(/critical|emergency|hospital|life|urgent/);
  add(/\bhigh\b|important|priorit\w*/);
  add(/\blow\b|guest|background|bulk/);
  add(/low latency|real-?time|realtime|latency\s*sensitive|voip|voice|video/);
  add(/high latency|tolerant|batch/);
  add(/\bhttps\b|ssl|tls|443|secure/);
  add(/\bhttp\b|web|tcp\s*80|\b80\b/);
  add(/\bssh\b|\b22\b/);
  add(/\bdns\b|\b53\b/);
  add(/\bicmp\b|ping/);
  add(/(\d+(?:\.\d+)?)\s*(gbps|gb|g|mbps|mb|m|kbps|kb|k)\b/);
  add(/\blink\b|sever|between\s+switch|core link/);
  const hostMatches = t.match(/\b(?:host|laptop|node|h)\s*[:#-]?\s*\d+\b/g);
  if (hostMatches) hostMatches.forEach((h) => { if (!found.includes(h)) found.push(h); });
  return found;
}

export const parseIntent = (text) => {
  const raw = (text || '').trim();
  const t = lc(raw);
  if (!t) return { type: 'UNKNOWN', summary: 'Empty command' };

  let hostHints = parseHostHints(t);
  const bandwidth = parseBandwidthKbps(t);
  const hasTrigger = SLICING_TRIGGERS.some((k) => t.includes(k));
  const hasParams = hostHints.length > 0 || bandwidth != null;

  if (hasTrigger || hasParams) {
    const priority = parsePriority(t);
    const isolationMode = /\blink\b|sever|between\s+switch|core link/.test(t) ? 'link' : 'host';
    const trafficType = parseTrafficType(t);

    if (hostHints.length === 0) {
      if (/hospital|critical/.test(t)) hostHints = [1, 2, 3, 4];
      else if (/guest/.test(t)) hostHints = [5, 6, 7, 8];
    }

    const parts = [];
    if (hostHints.length) parts.push(`host ${hostHints.join(', ')}`);
    if (trafficType !== TRAFFIC_TYPES.ALL) parts.push(trafficType.split(' (')[0]);
    if (bandwidth != null) parts.push(`${bandwidth} Kbps`);
    parts.push(`${priority} priority`);

    return {
      type: 'SLICE',
      payload: {
        name: suggestName(t, priority),
        isolationMode,
        selectedHosts: [],       
        selectedLink: '',
        trafficType,
        bandwidth: bandwidth != null ? String(bandwidth) : '',
        priority,
        latency: parseLatency(t),
      },
      hostHints,
      summary: `Slice → ${parts.join(' · ')}`,
      matchedKeywords: collectMatchedKeywords(t),
    };
  }

  for (const entry of NAV_ROUTES) {
    if (entry.keys.some((k) => t.includes(k))) {
      return { type: 'NAVIGATE', path: entry.path, summary: `Go to ${entry.label}` };
    }
  }

  return { type: 'UNKNOWN', summary: `Couldn't interpret "${raw}"` };
};

export const resolveHosts = (hints, discoveredHosts = []) => {
  if (!hints?.length || !discoveredHosts.length) return [];
  const sorted = [...discoveredHosts].sort((a, b) =>
    (a['node-id'] || '').localeCompare(b['node-id'] || '')
  );
  const matched = new Set();
  for (const hint of hints) {
    const byOrdinal = sorted[hint - 1];               
    if (byOrdinal) matched.add(byOrdinal['node-id']);
    
    for (const h of sorted) {
      const label = (h['node-id'] || '').split(':').pop() || '';
      if (label === String(hint) || label.replace(/^0+/, '') === String(hint)) {
        matched.add(h['node-id']);
      }
    }
  }
  return [...matched];
};

export const INTENT_PRESETS = {
  hospital: 'Isolate host 1 for HTTP critical hospital traffic with 20000 Kbps',
  guest: 'Throttle guest network to 5 mbps low priority HTTPS traffic',
};