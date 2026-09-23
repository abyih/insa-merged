// ─────────────────────────────────────────────────────────────────────────────
// sliceActions.js — programs/unprograms a slice's OpenFlow rules on ODL.
// Shared between NetworkSlicing.jsx (create/pause/decommission) and the
// Topology page (delete-from-map), so both stay in sync with the same
// flow/meter lifecycle instead of drifting.
// ─────────────────────────────────────────────────────────────────────────────
import { provisionSlice, deleteFlow, installMeter, deleteMeter, provisionLatencyQueue, removeLatencyQueue } from '../api/apiController';
import { DSCP_LOW_LATENCY, QUEUE_LOW_LATENCY, QOS_TYPE } from './qosConstants';

export const PRIORITY_NUM = { Low: 100, Medium: 500, High: 800, Critical: 1000 };

// Low-latency (DSCP 46 + HTB queue) only makes sense for slices whose traffic
// is actually forwarded — a DROP-everything slice has nothing to schedule.
const wantsLatencyPolicy = (slice) => slice.latency === 'Low' && !!slice.qosBandwidth;

export async function programSlice(slice) {
    const isQoS = !!slice.qosBandwidth;
    const action = isQoS ? "ALLOW" : "DROP";
    const prioNum = PRIORITY_NUM[slice.priority] ?? 500;
    const applyLatency = wantsLatencyPolicy(slice);

    let latencyPolicy = slice.latency === 'Low'
        ? { requested: 'LOW', dscp: DSCP_LOW_LATENCY, queue: QUEUE_LOW_LATENCY, qos: QOS_TYPE, status: applyLatency ? 'PENDING' : 'NOT_APPLIED', measuredMs: null }
        : null;

    for (const item of slice.targets) {
        if (isQoS && item.meterId) await installMeter(item.targetSwitch, item.meterId, slice.qosBandwidth);

        if (applyLatency) {
            const result = await provisionLatencyQueue(item.targetSwitch, item.port, String(slice.id), slice.name, slice.qosBandwidth);
            if (result.status !== 'ACTIVE') {
                latencyPolicy = { ...latencyPolicy, status: 'ERROR', error: result.error || 'OVS queue provisioning failed' };
            }
        }

        await provisionSlice(item.targetSwitch, slice.name, item.port, action, slice.traffic, {
            meterId: item.meterId || undefined,
            priority: prioNum,
            dscp: applyLatency,
        });
    }

    if (latencyPolicy?.status === 'PENDING') latencyPolicy = { ...latencyPolicy, status: 'ACTIVE' };
    return { latencyPolicy };
}

export async function unprogramSlice(slice) {
    for (const item of slice.targets) {
        await deleteFlow(item.targetSwitch, 0, slice.name);
        if (item.meterId) await deleteMeter(item.targetSwitch, item.meterId);
        if (slice.latency === 'Low') {
            await removeLatencyQueue(item.targetSwitch, item.port, String(slice.id));
        }
    }
}
