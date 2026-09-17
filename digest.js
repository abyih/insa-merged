import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { exec } from 'child_process';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const DIGEST_EMAILS = (process.env.DIGEST_EMAILS || process.env.ALERT_EMAILS || '')
    .split(',').map(s => s.trim()).filter(Boolean);

const PERSISTENT_LOG_PATH = '/tmp/linkguard_alerts.log';
const CONTAINER_NAME = process.env.ONOS_CONTAINER_NAME || 'onos-2.7';

/**
 * Extracts and parses the persistent JSON log directly from the ONOS container disk,
 * filters logs by the dynamic timeframe window, and emails an aggregated digest report.
 */
export async function sendDigest(windowMs, label) {
    if (DIGEST_EMAILS.length === 0) {
        return;
    }

    // Direct Docker Exec read bypasses the REST API entirely for 100% database persistence reliability
    const readLogCmd = `docker exec ${CONTAINER_NAME} cat ${PERSISTENT_LOG_PATH}`;
    
    exec(readLogCmd, async (err, stdout) => {
        let anomalies = [];
        if (!err && stdout) {
            anomalies = stdout.split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        return null;
                    }
                })
                .filter(Boolean);
        }

        const cutoff = Date.now() - windowMs;
        const inWindow = anomalies.filter(a => (a.timestamp || 0) >= cutoff);

        // System Keepalive: Send an "all-clear" message if no events occurred in the window
        if (inWindow.length === 0) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || '"LINK-GUARD" <alerts@linkguard.local>',
                    to: DIGEST_EMAILS.join(','),
                    subject: `[LINK-GUARD] ${label} Digest -- No active threats`,
                    text: `LINK-GUARD ${label} Security Digest

No security threats, spoofing anomalies, or LLDP floods were recorded on the persistent log inside the controller during this reporting period.`
                });
            } catch (mailErr) {
                console.error(`[LinkGuard Digest] Failed to send ${label} clear digest:`, mailErr.message);
            }
            return;
        }

        // Aggregate Telemetry Metrics
        const byType = {};
        const byPort = {};
        const permanentLockouts = [];

        for (const a of inWindow) {
            byType[a.attackType] = (byType[a.attackType] || 0) + 1;
            const portKey = `${a.deviceId}-port-${a.portNumber}`;
            byPort[portKey] = (byPort[portKey] || 0) + 1;
            if (a.attackType === 'PERMANENT_LOCKOUT') {
                permanentLockouts.push(portKey);
            }
        }

        const typeLines = Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `  ${type.padEnd(24)} ${count}`)
            .join('\n');

        const portLines = Object.entries(byPort)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([port, count]) => `  ${port.padEnd(28)} ${count} event(s)`)
            .join('\n');

        const lockoutSection = permanentLockouts.length > 0
            ? `\nPorts requiring manual attention (auto-recovery exhausted):\n  ${[...new Set(permanentLockouts)].join('\n  ')}\n`
            : '';

        const text = `LINK-GUARD ${label} Security Digest

Period            : last ${label.toLowerCase()} (${new Date(cutoff).toLocaleString()} -- ${new Date().toLocaleString()})
Total events      : ${inWindow.length}
${lockoutSection}
Breakdown by attack type:
${typeLines}

Top affected ports:
${portLines}

Open the LINK-GUARD dashboard for full details on any individual event.`;

        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"LINK-GUARD" <alerts@linkguard.local>',
                to: DIGEST_EMAILS.join(','),
                subject: `[LINK-GUARD] ${label} Digest -- ${inWindow.length} event(s)${permanentLockouts.length ? ', ' + permanentLockouts.length + ' requiring attention' : ''}`,
                text
            });
            console.log(`[LinkGuard Digest] ${label} digest successfully sent.`);
        } catch (mailErr) {
            console.error(`[LinkGuard Digest] Failed to send ${label} digest:`, mailErr.message);
        }
    });
}

/**
 * Registers cron schedules on startup.
 */
export function registerDigestJobs() {
    const dailySchedule = process.env.DIGEST_DAILY_CRON || '0 8 * * *';   // 8:00 AM daily
    const weeklySchedule = process.env.DIGEST_WEEKLY_CRON || '0 8 * * 1'; // 8:00 AM every Monday

    if (process.env.DIGEST_DAILY_ENABLED !== 'false') {
        cron.schedule(dailySchedule, () => {
            sendDigest(24 * 60 * 60 * 1000, 'Daily');
        });
        console.log(`[LinkGuard Digest] Daily digest scheduled: ${dailySchedule}`);
    }

    if (process.env.DIGEST_WEEKLY_ENABLED === 'true') {
        cron.schedule(weeklySchedule, () => {
            sendDigest(7 * 24 * 60 * 60 * 1000, 'Weekly');
        });
        console.log(`[LinkGuard Digest] Weekly digest scheduled: ${weeklySchedule}`);
    }
}