import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const ALERT_EMAILS = (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
const EMAIL_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute per-port lockout cooldown
const lastEmailSentAt = {};

function isEmailWorthy(alert) {
    if (alert.attackType === 'SIGNATURE_FORGERY' || alert.attackType === 'PERMANENT_LOCKOUT') return true;
    return alert.severity === 'CRITICAL';
}

export async function maybeSendAlertEmail(alert) {
    if (ALERT_EMAILS.length === 0 || !isEmailWorthy(alert)) {
        return;
    }

    const key = `${alert.source}-${alert.attackType}`;
    const now = Date.now();
    if (lastEmailSentAt[key] && now - lastEmailSentAt[key] < EMAIL_COOLDOWN_MS) {
        return; // Suppress notification storm
    }
    lastEmailSentAt[key] = now;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"LINK-GUARD" <alerts@linkguard.local>',
            to: ALERT_EMAILS.join(','),
            subject: `[LINK-GUARD] ${alert.severity}: ${alert.attackType} on ${alert.source}`,
            text: `A critical security event has been quarantined by LINK-GUARD.

Attack type : ${alert.attackType}
Severity    : ${alert.severity}
Source CP   : ${alert.source}
Details     : ${alert.details}
Detected at : ${alert.detectedAt}

Please log in to the administrative dashboard to verify and restore connection paths.`
        });
        console.log(`[LinkGuard Email] Alert email sent successfully for ${key}`);
    } catch (err) {
        console.error('[LinkGuard Email] SMTP transmission failed:', err.message);
    }
}