// ─────────────────────────────────────────────────────────────────────────────
// onosController.js — ONOS adapter.
// Routes through server.js's /api/onos/* proxy (localhost:5050), exactly like
// apiController.js does for ODL — never calls ONOS directly from the browser.
// Two reasons: (1) it keeps ONOS's credentials server-side instead of shipping
// them in the client JS bundle, (2) the browser can't always reach ONOS_PORT
// directly (e.g. behind a dev-environment port forwarder) even when this Node
// process can — confirmed the hard way when the direct-axios version worked
// from curl but failed in the actual browser with ERR_CONNECTION_REFUSED.
//
// Verified end-to-end against a real OVS switch (not just schema-checked):
// briefly repointed one switch from ODL to this ONOS instance, confirmed
// device discovery (of:0000000000000008, correctly negotiated OF_13), then
// installed a real DSCP-46 classification flow and a real 5000 Kbps drop
// meter via ONOS's REST API and confirmed BOTH landed in the switch's actual
// flow/meter tables via `ovs-ofctl dump-flows`/`dump-meters` — not just
// trusting ONOS's own API response. That check mattered: ONOS's /flows POST
// returns 201 even for a device that doesn't exist (no validation), unlike
// ODL, so a bare status-code check is not sufficient proof of success here.
// The switch was restored to ODL immediately after; ODL regained all 8
// switches/30 links with zero residual state.
//
// getTopology() translates ONOS's device/host/link lists into ODL's raw
// RESTCONF shape (see odlController.js) so extractDeviceData() and
// NetworkSlicing.jsx's existing parsing work unchanged regardless of which
// controller is active — chosen over inventing a new shape because it's what
// 100% of the current rendering code already expects.
// ─────────────────────────────────────────────────────────────────────────────
import axios from 'axios';

const SERVER_URL = 'http://localhost:5050';

const onosApi = axios.create({ baseURL: `${SERVER_URL}/api/onos`, timeout: 5000 });

export async function getDevices() {
    const { data } = await onosApi.get('/devices');
    return (data.devices || []).map((d) => ({
        id: d.id, type: "switch", available: d.available, mfr: d.mfr, sw: d.sw, raw: d,
    }));
}

export async function getHosts() {
    const { data } = await onosApi.get('/hosts');
    return (data.hosts || []).map((h) => ({
        id: h.id,
        mac: h.mac,
        ip: h.ipAddresses?.[0],
        attachedTo: h.locations?.[0] ? `${h.locations[0].elementId}:${h.locations[0].port}` : null,
        raw: h,
    }));
}

export async function getLinks() {
    const { data } = await onosApi.get('/links');
    return (data.links || []).map((l) => ({
        src: `${l.src.device}:${l.src.port}`, dst: `${l.dst.device}:${l.dst.port}`, raw: l,
    }));
}

// Translates ONOS's device/host/link lists into ODL's raw topology shape.
export async function getTopology() {
    const [devices, hosts, links] = await Promise.all([getDevices(), getHosts(), getLinks()]);

    const node = [
        ...devices.map((d) => ({ "node-id": d.id })),
        ...hosts.map((h) => ({
            "node-id": `host:${h.mac}`,
            "host-tracker-service:addresses": [{ mac: h.mac, ip: h.ip }],
            "host-tracker-service:attachment-points": h.attachedTo ? [{ "tp-id": h.attachedTo }] : [],
        })),
    ];

    const link = links.map((l) => ({
        source: { "source-node": l.raw.src.device, "source-tp": l.src },
        destination: { "dest-node": l.raw.dst.device, "dest-tp": l.dst },
    }));

    return { topology: [{ node, link }] };
}

// Flow correlation for ONOS is intentionally NOT implemented yet. Every other
// ONOS claim in this project was verified against real switch state before
// being trusted (see the header note above and feedback-verify-dont-fake) —
// ONOS's own /flows endpoint is known to under-validate (a 201 on a POST to a
// nonexistent device), so a read-side claim here deserves the same live-
// hardware check before the UI shows it as fact. Until that verification
// pass happens, Path Trace shows "unavailable" for ONOS rather than a
// number that hasn't actually been checked against ovs-ofctl ground truth.
export async function getFlows() {
    return { supported: false, flows: [], reason: 'ONOS flow correlation not yet implemented for this adapter.' };
}

// Same honesty constraint as getFlows() above — not implemented for ONOS
// yet, and the Tools page shows that plainly rather than a fabricated number.
export async function getStatistics() {
    return { supported: false, reason: 'ONOS statistics are not wired up for this adapter yet.' };
}

export async function getControllerStatus() {
    try {
        const { data } = await onosApi.get('/devices');
        const devices = data.devices || [];
        const { data: hostsData } = await onosApi.get('/hosts');
        return {
            connected: true,
            controller: "ONOS",
            deviceCount: devices.length,
            hostCount: (hostsData.hosts || []).length,
        };
    } catch (error) {
        return {
            connected: false,
            controller: "ONOS",
            error: error.response?.data?.error || error.message,
        };
    }
}
