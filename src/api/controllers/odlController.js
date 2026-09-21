// ─────────────────────────────────────────────────────────────────────────────
// odlController.js — OpenDaylight adapter.
// Thin wrapper around the existing, already-working apiController.js calls —
// zero behavior change. getTopology() intentionally returns ODL's native
// RESTCONF shape unmodified, since that's what extractDeviceData() and
// NetworkSlicing.jsx's host/link parsing already expect; the ONOS adapter
// translates INTO this same shape instead, so those consumers stay untouched.
// ─────────────────────────────────────────────────────────────────────────────
import { getTopology as odlGetTopology, getNodes as odlGetNodes } from '../apiController';
import { mapNodeDetails } from '../../mappers/node-details-mapper';

function extractNodes(raw) {
    return raw?.["network-topology:network-topology"]?.topology?.[0]?.node
        || raw?.topology?.[0]?.node
        || [];
}

export async function getTopology() {
    return odlGetTopology();
}

export async function getDevices() {
    const nodes = extractNodes(await odlGetTopology());
    return nodes
        .filter((n) => !n["node-id"]?.startsWith("host:"))
        .map((n) => ({ id: n["node-id"], type: "switch", raw: n }));
}

export async function getHosts() {
    const nodes = extractNodes(await odlGetTopology());
    return nodes
        .filter((n) => n["node-id"]?.startsWith("host:"))
        .map((n) => ({
            id: n["node-id"],
            mac: n["host-tracker-service:addresses"]?.[0]?.mac,
            ip: n["host-tracker-service:addresses"]?.[0]?.ip,
            attachedTo: n["host-tracker-service:attachment-points"]?.[0]?.["tp-id"] || null,
            raw: n,
        }));
}

// Real per-switch flow table, reusing the same node-details-mapper Flows.jsx
// uses — not a new parsing path. Used by Path Trace to correlate a computed
// path with the actual flows currently installed on each hop's switch.
export async function getFlows(nodeId) {
    const raw = await odlGetNodes();
    const nodes = raw?.["opendaylight-inventory:nodes"]?.node || raw?.node || [];
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { supported: true, flows: [] };

    const mapped = mapNodeDetails({ "opendaylight-inventory:node": [node] });
    const flows = (mapped?.flowTables || []).flatMap((table) =>
        (table.flows || []).map((f) => ({
            id: f.id,
            tableId: table.id,
            priority: f.priority,
            match: f.match,
            instructions: f.instructions,
        }))
    );
    return { supported: true, flows };
}

// Aggregate flow-table stats across every switch — reuses the same
// mapper getFlows() does, just summed rather than per-node. There's no
// single "statistics" endpoint on either controller; this is genuinely
// derived from real per-switch data, not a fabricated summary.
export async function getStatistics() {
    const raw = await odlGetNodes();
    const nodes = raw?.["opendaylight-inventory:nodes"]?.node || raw?.node || [];
    const switches = nodes.filter((n) => !n.id?.startsWith("host:"));

    const perSwitch = switches.map((n) => {
        const mapped = mapNodeDetails({ "opendaylight-inventory:node": [n] });
        const totals = (mapped?.flowTables || []).reduce(
            (acc, t) => ({
                activeFlows: acc.activeFlows + (t.stats?.activeFlows || 0),
                packetsMatched: acc.packetsMatched + (t.stats?.packetsMatched || 0),
            }),
            { activeFlows: 0, packetsMatched: 0 }
        );
        return { id: n.id, ...totals };
    });

    const totals = perSwitch.reduce(
        (acc, s) => ({
            activeFlows: acc.activeFlows + s.activeFlows,
            packetsMatched: acc.packetsMatched + s.packetsMatched,
        }),
        { activeFlows: 0, packetsMatched: 0 }
    );

    return { supported: true, switchCount: switches.length, totals, perSwitch };
}

export async function getControllerStatus() {
    try {
        const raw = await odlGetTopology();
        const nodes = extractNodes(raw);
        return {
            connected: true,
            controller: "OpenDaylight",
            deviceCount: nodes.filter((n) => !n["node-id"]?.startsWith("host:")).length,
            hostCount: nodes.filter((n) => n["node-id"]?.startsWith("host:")).length,
        };
    } catch (error) {
        return { connected: false, controller: "OpenDaylight", error: error.message };
    }
}
