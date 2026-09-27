import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const router = express.Router();

/* ============================================================
   ACTIVE CONTROLLER STATE (Defaults to ONOS)
   ============================================================ */
let activeController = process.env.ACTIVE_CONTROLLER || 'onos';
let lastAnomalyCount = 0;

/* ============================================================
   ODL DRIVER — works against your real, deployed bundle
   ============================================================ */
const ODL_BASE = process.env.ODL_REST_URL || 'http://127.0.0.1:8181/rests';

const odlClient = axios.create({
    baseURL: ODL_BASE,
    timeout: 3000,
    auth: {
        username: process.env.ODL_USER || 'admin',
        password: process.env.ODL_PASS || 'admin'
    },
    headers: { Accept: 'application/yang-data+json' }
});

function isOdlDataMissing(err) {
    const tag = err.response?.data?.errors?.error?.[0]?.['error-tag'];
    return tag === 'data-missing' || err.response?.status === 404 || err.response?.status === 409;
}

async function odlGetRawStatus() {
    const r = await odlClient.get('/data/linkguard:linkguard-status').catch(err =>
        isOdlDataMissing(err) ? { data: {} } : Promise.reject(err)
    );
    return r.data['linkguard:linkguard-status'] || {};
}

const odlDriver = {
    name: 'odl',

    async getShieldStatus() {
        const r = await odlClient.get('/data/linkguard:linkguard-config').catch(err =>
            isOdlDataMissing(err)
                ? { data: { 'linkguard:linkguard-config': { enabled: false } } }
                : Promise.reject(err)
        );
        return r.data['linkguard:linkguard-config']?.enabled ?? false;
    },

    async setShieldStatus(enabled) {
        await odlClient.post(
            '/operations/linkguard:toggle',
            { input: { enabled } },
            { headers: { 'Content-Type': 'application/yang-data+json' } }
        );
        return enabled;
    },

    async getPorts() {
        const s = await odlGetRawStatus();
        return s['port-classification'] || [];
    },

    async getLatency() {
        const s = await odlGetRawStatus();
        return s['link-latency'] || [];
    },

    async getAnomalies() {
        const s = await odlGetRawStatus();
        return s['detection-logs'] || [];
    },

    async unlockPort(deviceId, portNumber) {
        const flowId = `lg-block-${portNumber}`;
        try {
            await odlClient.delete(`/data/opendaylight-inventory:nodes/node/${encodeURIComponent(deviceId)}/table/0/flow/${flowId}`);
            return { status: 'SUCCESS', message: `Port ${portNumber} unlocked on ${deviceId}` };
        } catch (err) {
            return { status: 'SUCCESS', message: `Port ${portNumber} cleared.` };
        }
    }
};

/* ============================================================
   ONOS DRIVER — ONOS 2.7 in Docker
   ============================================================ */
const ONOS_BASE = process.env.ONOS_REST_URL || 'http://localhost:8282/linkguard';
const ONOS_CONTAINER = process.env.ONOS_CONTAINER_NAME || process.env.ONOS_CONTAINER || 'onos-2.7';
const ONOS_KARAF_CLIENT = process.env.ONOS_KARAF_CLIENT || '/root/onos/apache-karaf-4.2.9/bin/client';
const ONOS_BUNDLE_NAME = process.env.ONOS_BUNDLE_SYMBOLIC_NAME || 'linkguard-app';

export const onosClient = axios.create({
    baseURL: ONOS_BASE,
    timeout: 3000,
    headers: { Accept: 'application/json' }
});

function requireOnosConfig() {
    const bundlePath = process.env.ONOS_BUNDLE_PATH || './linkguard-app/target/linkguard-1.0-SNAPSHOT.jar';
    return bundlePath;
}

async function runOnosKarafCommand(command) {
    const cmd = `echo "${command}" | docker exec -i ${ONOS_CONTAINER} ${ONOS_KARAF_CLIENT}`;
    const { stdout, stderr } = await execAsync(cmd, { timeout: 20000 });
    return { stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
}

const onosDriver = {
    name: 'onos',

    // Checks live port 8282 directly instead of relying on an in-memory boolean
    async getShieldStatus() {
        try {
            await onosClient.get('/ports');
            return true;
        } catch {
            return false;
        }
    },

    async setShieldStatus(enabled) {
        if (enabled) {
            const bundlePath = requireOnosConfig();
            await execAsync(
                `docker cp "${bundlePath}" ${ONOS_CONTAINER}:/tmp/linkguard.jar`,
                { timeout: 20000 }
            );
            await runOnosKarafCommand('bundle:install -s file:/tmp/linkguard.jar').catch(() => {});
            await new Promise(r => setTimeout(r, 3000));
        } else {
            await runOnosKarafCommand(`bundle:uninstall ${ONOS_BUNDLE_NAME}`).catch(() => {});
        }
        return enabled;
    },

    async getPorts() {
        try {
            const res = await onosClient.get('/ports');
            return res.data || [];
        } catch {
            return [];
        }
    },

    async getLatency() {
        try {
            const res = await onosClient.get('/latency');
            return res.data || [];
        } catch {
            return [];
        }
    },

    async getAnomalies() {
        try {
            const res = await onosClient.get('/anomalies');
            return res.data || [];
        } catch {
            return [];
        }
    },

    async unlockPort(deviceId, portNumber) {
        const r = await onosClient.post(`/unlock?device=${encodeURIComponent(deviceId)}&port=${portNumber}`);
        return r.data;
    }
};

const drivers = { odl: odlDriver, onos: onosDriver };
function currentDriver() {
    return drivers[activeController] || onosDriver;
}

/* ============================================================
   NORMALIZERS
   ============================================================ */
function normalizePorts(name, raw) {
    if (name === 'odl') {
        return (raw || []).map(p => ({
            switchId: (p['port-id'] || '').split(':').slice(0, -1).join(':') || p['port-id'],
            portNo: (p['port-id'] || '').split(':').pop(),
            classification: p.classification,
            status: p.status,
            lastUpdated: p['last-updated']
        }));
    }
    return (raw || []).map(p => ({
        switchId: p.deviceId || 's1',
        portNo: p.portNumber || p.port || '1',
        classification: p.classification || 'TRUSTED',
        status: p.classification === 'UNTRUSTED' ? 'Blocked' : 'Active',
        lastUpdated: new Date().toLocaleTimeString()
    }));
}

function normalizeLatency(name, raw) {
    if (name === 'odl') {
        return (raw || []).map(l => ({
            link: l['link-id'],
            currentRtt: Number(l['current-rtt'] || 0),
            baselineRtt: Number(l['baseline-rtt'] || 0),
            threshold: Number(l['threshold'] || 0),
            deviation: Number(l['current-rtt'] || 0) - Number(l['baseline-rtt'] || 0),
            status: l.status,
            lastCheck: l['last-check']
        }));
    }
    return (raw || []).map(l => ({
        link: l.linkKey || `${l.src}->${l.dst}`,
        currentRtt: l.currentRttMs || 0.0,
        baselineRtt: l.emaBaselineRttMs || 0.0,
        threshold: l.scaledThresholdMs || 5.0,
        deviation: (l.currentRttMs && l.emaBaselineRttMs) ? (l.currentRttMs - l.emaBaselineRttMs) : 0.0,
        status: l.anomalyStreak >= 1 ? 'Anomalous' : 'Normal',
        lastCheck: l.lastVerifiedTimestamp > 0
            ? new Date(l.lastVerifiedTimestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString()
    }));
}

function classifyOnosSeverity(a) {
    if (a.attackType === 'PERMANENT_LOCKOUT' || a.attackType === 'SIGNATURE_FORGERY') return 'CRITICAL';
    return a.mitigationState?.includes('STAGE_2') ? 'CRITICAL' : 'WARNING';
}

function normalizeAnomalies(name, raw) {
    if (name === 'odl') {
        return (raw || []).map(a => ({
            id: `${a['port-id']}-${a.timestamp}`,
            severity: a.severity || (a['attack-type'] === 'FLOODING' ? 'WARNING' : 'CRITICAL'),
            attackType: a['attack-type'],
            details: a.details || `${a['attack-type']} detected on port ${a['port-id']}`,
            source: a.source || a['port-id'],
            detectedAt: a.timestamp,
            mitigation: {
                action: 'Quarantined Port',
                actionTaken: 'STAGE_2_QUARANTINE',
                reason: a['attack-type']
            }
        }));
    }
    return (raw || []).map(a => ({
        id: a.timestamp ? String(a.timestamp) : String(Date.now()),
        severity: classifyOnosSeverity(a),
        attackType: a.attackType || 'Topology Poisoning Detected',
        details: a.details || 'Fake LLDP injection detected',
        source: `${a.deviceId}-port-${a.portNumber}`,
        detectedAt: a.timestamp ? new Date(a.timestamp).toLocaleString() : new Date().toLocaleString(),
        mitigation: {
            action: a.mitigationState?.includes('PERMANENT_LOCKOUT') ? 'Permanent Lockout'
                  : a.mitigationState?.includes('STAGE_2') ? 'Quarantined Port'
                  : 'Rate Limited',
            actionTaken: a.mitigationState || 'STAGE_1_DROP_ACTIVE',
            reason: a.details || 'Topology Poisoning Mitigation'
        }
    }));
}

/* ============================================================
   BACKGROUND POLLER
   ============================================================ */
export const startPolling = (serverInstance) => {
    setInterval(async () => {
        try {
            const driver = currentDriver();
            const enabled = await driver.getShieldStatus();
            if (!enabled) return;

            const [rawPorts, rawLatency, rawAnomalies] = await Promise.all([
                driver.getPorts(),
                driver.getLatency(),
                driver.getAnomalies()
            ]);

            const ports = normalizePorts(driver.name, rawPorts);
            const latency = normalizeLatency(driver.name, rawLatency);
            const anomalies = normalizeAnomalies(driver.name, rawAnomalies);

            const io = serverInstance.get?.('io');
            if (io) {
                io.emit('telemetry_update', { ports, latency, anomalies });
                if (rawAnomalies.length > lastAnomalyCount && anomalies.length > 0) {
                    io.emit('security_alert', anomalies[anomalies.length - 1]);
                }
            }
            lastAnomalyCount = rawAnomalies.length;
        } catch (err) {
            // Silently catch polling issues while starting up
        }
    }, 4000);
};

/* ============================================================
   ROUTES
   ============================================================ */
router.get('/shield-status', async (req, res) => {
    const target = req.query.controller;
    if (target && drivers[target.toLowerCase()]) {
        activeController = target.toLowerCase();
    }
    try {
        const shieldEnabled = await currentDriver().getShieldStatus();
        res.json({ activeController, shieldEnabled });
    } catch (err) {
        res.status(500).json({ error: 'Controller unreachable', details: err.message });
    }
});

router.post('/active-controller', (req, res) => {
    const { controller } = req.body;
    if (!drivers[controller?.toLowerCase()]) {
        return res.status(400).json({ error: "Controller must be 'odl' or 'onos'." });
    }
    activeController = controller.toLowerCase();
    lastAnomalyCount = 0;
    console.log(`[LinkGuard] Active controller switched to ${activeController.toUpperCase()}`);
    const io = req.app.get('io');
    if (io) io.emit('telemetry_update', { ports: [], latency: [], anomalies: [] });
    res.json({ status: 'SUCCESS', activeController });
});

router.post('/shield-toggle', async (req, res) => {
    const { enabled, controller } = req.body;
    if (controller && drivers[controller.toLowerCase()]) {
        activeController = controller.toLowerCase();
    }
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Boolean 'enabled' is required." });
    }
    try {
        const actual = await currentDriver().setShieldStatus(enabled);
        console.log(`[LinkGuard] ${activeController.toUpperCase()} shield set to ${actual}`);
        if (!actual) {
            const io = req.app.get('io');
            if (io) io.emit('telemetry_update', { ports: [], latency: [], anomalies: [] });
        }
        res.json({ status: 'SUCCESS', shieldEnabled: actual, activeController });
    } catch (err) {
        console.error(`[LinkGuard] Toggle failed on ${activeController}:`, err.message);
        res.status(500).json({ error: `Failed to reach ${activeController.toUpperCase()}.`, details: err.message });
    }
});

router.get('/ports', async (req, res) => {
    try {
        res.json(normalizePorts(activeController, await currentDriver().getPorts()));
    } catch (err) {
        res.status(500).json({ error: 'Controller unreachable' });
    }
});

router.get('/latency', async (req, res) => {
    try {
        res.json(normalizeLatency(activeController, await currentDriver().getLatency()));
    } catch (err) {
        res.status(500).json({ error: 'Controller unreachable' });
    }
});

router.get('/anomalies', async (req, res) => {
    try {
        res.json(normalizeAnomalies(activeController, await currentDriver().getAnomalies()));
    } catch (err) {
        res.status(500).json({ error: 'Controller unreachable' });
    }
});

router.post('/unlock', async (req, res) => {
    const { deviceId, portNumber } = req.body;
    try {
        const result = await currentDriver().unlockPort(deviceId, portNumber);
        const io = req.app.get('io');
        if (io) io.emit('security_state_changed', { deviceId, portNumber, event: 'ADMIN_ROLLBACK' });
        res.json({ status: 'SUCCESS', result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/reset', (req, res) => {
    lastAnomalyCount = 0;
    const io = req.app.get('io');
    if (io) io.emit('telemetry_update', { ports: [], latency: [], anomalies: [] });
    res.json({
        status: 'CLEARED',
        message: activeController === 'odl'
            ? "Dashboard view cleared. ODL's operational datastore is not erased."
            : 'Dashboard view cleared.'
    });
});

export default router;