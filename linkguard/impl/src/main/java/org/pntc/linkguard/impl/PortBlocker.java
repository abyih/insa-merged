/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Staged mitigation pipeline (Section 5.8) + bounded self-healing (6.2) + manual rollback (6.3).
 *
 * <pre>
 *  NONE --stage1--> STAGE1 --(persists after 3 s, switch-facing/unknown)--> STAGE2
 *  STAGE2 --cooldown 60/120/240 s--> AUDITING --pass--> NONE (restored)
 *                                            --fail x3--> LOCKED (PERMANENT_LOCKOUT, manual only)
 * </pre>
 */
final class PortBlocker {
    private static final Logger LOG = LoggerFactory.getLogger(PortBlocker.class);
    static final String STAGE1_ACTION = "Stage 1: LLDP/BDDP selective drop";

    enum Stage { NONE, STAGE1, STAGE2, AUDITING, LOCKED }

    private static final class PortState {
        Stage stage = Stage.NONE;
        int attempts;
        String attackType = "UNKNOWN";
        ScheduledFuture<?> escalation;
        ScheduledFuture<?> recovery;
    }

    private final FlowManager flows;
    private final AnomalyStore store;
    private final PortClassifier classifier;
    private final FloodDetector flood;
    private final ScheduledExecutorService scheduler;
    private final Map<String, PortState> states = new ConcurrentHashMap<>();
    private volatile LinkVerifier verifier;

    PortBlocker(FlowManager flows, AnomalyStore store, PortClassifier classifier, FloodDetector flood,
                ScheduledExecutorService scheduler) {
        this.flows = flows;
        this.store = store;
        this.classifier = classifier;
        this.flood = flood;
        this.scheduler = scheduler;
    }

    void setVerifier(LinkVerifier verifier) {
        this.verifier = verifier;
    }

    boolean isMitigated(String portKey) {
        PortState s = states.get(portKey);
        return s != null && s.stage != Stage.NONE;
    }

    private PortState state(String key) {
        return states.computeIfAbsent(key, k -> new PortState());
    }

    // ---------------------------------------------------------------------------------
    //  Stage 1
    // ---------------------------------------------------------------------------------

    void stage1(Endpoint port, String attackType, String details, String action) {
        if (port == null) {
            return;
        }
        PortState s = state(port.key());
        synchronized (s) {
            if (s.stage != Stage.NONE) {
                return; // already mitigated: idempotent
            }
            s.stage = Stage.STAGE1;
            s.attackType = attackType;
            s.escalation = scheduler.schedule(() -> guard(() -> escalate(port)),
                Settings.STAGE2_DELAY_MS, TimeUnit.MILLISECONDS);
        }
        flows.installLldpDrop(port);
        flows.writePort(port, "UNTRUSTED", "Blocked");
        store.record(attackType, "HIGH", port.source(), details, action,
            "Confirmed anomaly on " + port.key(), "STAGE1");
    }

    /** Stage 2 only if the anomaly persists and the port is not host-facing. */
    private void escalate(Endpoint port) {
        PortState s = state(port.key());
        synchronized (s) {
            if (s.stage != Stage.STAGE1) {
                return;
            }
        }
        if (classifier.classify(port.key()) == PortClassifier.Kind.HOST_FACING) {
            LOG.info("LINK-GUARD: {} is host-facing; staying at Stage 1 (never hard-blocked)", port);
            return;
        }
        Endpoint nb = verifier.neighbourOf(port.key());
        if (nb == null) {
            stage2(port, "no known neighbour to re-verify the port against");
            return;
        }
        verifier.adHocProbe(port, nb, ProbeService.Purpose.CONFIRM, Settings.CONFIRM_TIMEOUT_MS, ok -> {
            if (ok) {
                LOG.info("LINK-GUARD: {} re-verified clean after Stage 1; holding at Stage 1", port);
            } else {
                stage2(port, "anomaly persisted " + Settings.STAGE2_DELAY_MS / 1000 + "s after Stage 1");
            }
        });
    }

    // ---------------------------------------------------------------------------------
    //  Stage 2 + recovery schedule
    // ---------------------------------------------------------------------------------

    private void stage2(Endpoint port, String why) {
        PortState s = state(port.key());
        synchronized (s) {
            if (s.stage != Stage.STAGE1) {
                return;
            }
            s.stage = Stage.STAGE2;
        }
        flows.installHardBlock(port);
        store.record(s.attackType, "CRITICAL", port.source(), "Hard block: " + why,
            "Stage 2: hard block (all ingress traffic dropped)", why, "STAGE2");
        scheduleRecovery(port);
    }

    private void scheduleRecovery(Endpoint port) {
        PortState s = state(port.key());
        long sec;
        int attempts;
        synchronized (s) {
            if (s.attempts >= Settings.COOLDOWNS_S.length) {
                lockout(port, s);
                return;
            }
            attempts = s.attempts;
            sec = Settings.COOLDOWNS_S[attempts];
            cancel(s.recovery);
            s.recovery = scheduler.schedule(() -> guard(() -> audit(port)), sec, TimeUnit.SECONDS);
        }
        flows.writeQuarantine(port, attempts, "COOLDOWN", Instant.now().plusSeconds(sec).toString());
        flows.writePort(port, "UNTRUSTED", "Blocked");
    }

    private void lockout(Endpoint port, PortState s) {
        s.stage = Stage.LOCKED;
        cancel(s.recovery);
        flows.installHardBlock(port);
        flows.writeQuarantine(port, s.attempts, "LOCKED", "");
        flows.writePort(port, "UNTRUSTED", "Blocked");
        store.record("PERMANENT_LOCKOUT", "CRITICAL", port.source(),
            "Automated recovery failed " + s.attempts + " times; port stays disabled until an administrator unlocks it",
            "Port locked out — manual intervention required", "Bounded recovery limit reached", "LOCKED");
    }

    // ---------------------------------------------------------------------------------
    //  Sentinel audit
    // ---------------------------------------------------------------------------------

    private void audit(Endpoint port) {
        PortState s = state(port.key());
        synchronized (s) {
            if (s.stage != Stage.STAGE2) {
                return;
            }
            s.stage = Stage.AUDITING;
            s.attempts++;
        }
        Endpoint nb = verifier.neighbourOf(port.key());
        List<Endpoint> group = new ArrayList<>();
        group.add(port);
        if (nb != null) {
            PortState ns = states.get(nb.key());
            if (ns != null) {
                synchronized (ns) {
                    if (ns.stage == Stage.STAGE2) { // symmetric block: audit the whole link together
                        ns.stage = Stage.AUDITING;
                        ns.attempts = s.attempts;
                        cancel(ns.recovery);
                        group.add(nb);
                    }
                }
            }
        }
        // Reopen the interface but KEEP the Stage 1 LLDP/BDDP filter so the threat cannot reach discovery.
        for (Endpoint g : group) {
            flows.removeHardBlock(g);
            flows.writePort(g, "UNTRUSTED", "Blocked/Testing");
        }
        LOG.info("LINK-GUARD: sentinel audit #{} for {} (group {})", s.attempts, port, group);
        scheduler.schedule(() -> guard(() -> {
            if (nb == null) {
                finishAudit(group, s, false);
                return;
            }
            verifier.adHocProbe(port, nb, ProbeService.Purpose.AUDIT, Settings.AUDIT_TIMEOUT_MS,
                ok -> finishAudit(group, s, ok));
        }), Settings.AUDIT_SETTLE_MS, TimeUnit.MILLISECONDS);
    }

    private void finishAudit(List<Endpoint> group, PortState primary, boolean ok) {
        for (Endpoint g : group) {
            if (ok) {
                release(g, "AUTO_RECOVERY", "Automated sentinel audit passed; port restored");
                continue;
            }
            PortState gs = state(g.key());
            synchronized (gs) {
                if (gs.stage != Stage.AUDITING) {
                    continue;
                }
                gs.stage = Stage.STAGE2;
                gs.attempts = primary.attempts;
            }
            flows.installHardBlock(g);
            scheduleRecovery(g); // next cooldown, or PERMANENT_LOCKOUT after the third failure
        }
    }

    // ---------------------------------------------------------------------------------
    //  Rollback
    // ---------------------------------------------------------------------------------

    /** Administrative override (Section 6.3). */
    boolean unlock(Endpoint port) {
        return release(port, "MANUAL_ROLLBACK", "Administrative override: mitigation removed by operator");
    }

    /** @param logType null = silent (used by reset) */
    boolean release(Endpoint port, String logType, String reason) {
        PortState s = states.get(port.key());
        if (s == null) {
            return false;
        }
        synchronized (s) {
            if (s.stage == Stage.NONE) {
                return false;
            }
            cancel(s.escalation);
            cancel(s.recovery);
            s.stage = Stage.NONE;
            s.attempts = 0;
            s.attackType = "UNKNOWN";
        }
        flows.removeLldpDrop(port);
        flows.removeHardBlock(port);
        flows.deleteQuarantine(port);
        flood.clear(port.key());
        verifier.onRestored(port.key());
        if (logType != null) {
            flows.writePort(port, "MONITORED", "Recovered (verifying)");
            store.record(logType, "INFO", port.source(), reason,
                "Restored: Stage 1 filter and hard block removed", "Port returned to normal operation", "RESTORED");
        }
        return true;
    }

    void releaseAll() {
        for (String k : new ArrayList<>(states.keySet())) {
            Endpoint e = Endpoint.parse(k);
            if (e != null) {
                release(e, null, "reset");
            }
        }
        states.clear();
    }

    private static void cancel(ScheduledFuture<?> f) {
        if (f != null) {
            f.cancel(false);
        }
    }

    private static void guard(Runnable r) {
        try {
            r.run();
        } catch (RuntimeException e) {
            LOG.error("LINK-GUARD: scheduled mitigation task failed", e);
        }
    }
}