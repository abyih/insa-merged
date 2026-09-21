// ─────────────────────────────────────────────────────────────────────────────
// aiIntentService.js — Gemini-backed intent compilation.
//
// This is a second *source* for the exact same intent shape parseIntent()
// (intentParser.js) already produces — {type, payload, hostHints, summary}
// plus a `source`/`rationale` field for the UI's transparency panel. Nothing
// downstream (applyIntent, the form auto-fill, resolveHosts) needs to know
// or care which source produced it.
//
// Never calls Gemini directly — goes through server.js's /api/intent/compile,
// which holds the real API key server-side (see .env's GEMINI_API_KEY).
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';
import { TRAFFIC_TYPES, PRIORITY_LEVELS, LATENCY_LEVELS } from '../utils/intentParser';

const SERVER_URL = 'http://localhost:5050';

const TRAFFIC_MAP = {
    all: TRAFFIC_TYPES.ALL,
    http: TRAFFIC_TYPES.HTTP,
    https: TRAFFIC_TYPES.HTTPS,
    ssh: TRAFFIC_TYPES.SSH,
    dns: TRAFFIC_TYPES.DNS,
    icmp: TRAFFIC_TYPES.ICMP,
};

// Thrown (not returned) on any failure — callers should catch this and fall
// back to parseIntent(), never show a half-formed "AI" result.
export class AiIntentError extends Error {}

export async function compileIntentWithAI(text, grounding) {
    // Kept short on purpose: a slow/overloaded Gemini shouldn't leave the
    // operator staring at "Compiling…" for 15s before the guaranteed-working
    // offline parser kicks in — especially live, in front of an audience.
    // 10s (not less) because the real grounded-intent prompt — full
    // instructions + live topology/slice/capacity data, not a trivial "say
    // OK" — genuinely took ~6s on a healthy response in testing; less margin
    // would false-trigger the fallback on normal, working responses.
    let response;
    try {
        response = await axios.post(`${SERVER_URL}/api/intent/compile`, { prompt: text, grounding }, { timeout: 10000 });
    } catch (error) {
        throw new AiIntentError(error.response?.data?.error || error.message);
    }

    const r = response.data?.result;
    if (!r || typeof r !== 'object') throw new AiIntentError('Gemini returned an empty result');

    if (r.isSliceIntent === false) {
        return { type: 'UNKNOWN', source: 'gemini', summary: r.rationale || "Gemini didn't interpret this as a slice request" };
    }

    const priority = PRIORITY_LEVELS.includes(r.priority) ? r.priority : 'Medium';
    const latency = LATENCY_LEVELS.includes(r.latency) ? r.latency : 'Medium';
    const trafficType = TRAFFIC_MAP[String(r.trafficType || '').toLowerCase()] || TRAFFIC_TYPES.ALL;
    const hostHints = Array.isArray(r.hostHints) ? r.hostHints.map(Number).filter(Number.isFinite) : [];
    const bandwidth = r.bandwidthKbps != null && r.bandwidthKbps !== '' && Number(r.bandwidthKbps) > 0
        ? String(Math.round(Number(r.bandwidthKbps)))
        : '';

    const parts = [];
    if (hostHints.length) parts.push(`host ${hostHints.join(', ')}`);
    if (trafficType !== TRAFFIC_TYPES.ALL) parts.push(trafficType.split(' (')[0]);
    if (bandwidth) parts.push(`${bandwidth} Kbps`);
    parts.push(`${priority} priority`);

    return {
        type: 'SLICE',
        source: 'gemini',
        payload: {
            name: (r.name || '').trim() || `Gemini-Intent-${Math.floor(Math.random() * 1000)}`,
            isolationMode: r.isolationMode === 'link' ? 'link' : 'host',
            selectedHosts: [],
            selectedLink: '',
            trafficType,
            bandwidth,
            priority,
            latency,
        },
        hostHints,
        summary: `Slice → ${parts.join(' · ')}`,
        rationale: r.rationale || '',
    };
}

// Builds the grounding payload sent to Gemini — real, current network state
// only. `discoveredHosts` must be sorted the same way resolveHosts() sorts
// them (by node-id), so the ordinal numbers Gemini returns in hostHints
// line up with what resolveHosts() will later resolve them to.
export function buildGrounding({ discoveredHosts, slices, remainingCapacityKbps }) {
    const sortedHosts = [...(discoveredHosts || [])].sort((a, b) =>
        (a['node-id'] || '').localeCompare(b['node-id'] || '')
    );
    return {
        hosts: sortedHosts.map((h, i) => ({
            ordinal: i + 1,
            ip: h['host-tracker-service:addresses']?.[0]?.ip || null,
            mac: h['host-tracker-service:addresses']?.[0]?.mac || null,
        })),
        existingSlices: (slices || []).map((s) => ({
            name: s.name,
            priority: s.priority,
            bandwidthKbps: s.qosBandwidth || null,
            paused: !!s.paused,
        })),
        remainingCapacityKbps,
    };
}
