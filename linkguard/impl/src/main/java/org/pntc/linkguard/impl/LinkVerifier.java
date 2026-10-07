/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Link Verification Module (Sections 5.4, 5.9): per-link baselines, Tukey's boxplot detector with
 * congestion factor G, three-strikes rules, rolling 120 s re-verification sweep, and the historical
 * link records used by the recovery audit.
 */
final class LinkVerifier {
    private static final Logger LOG = LoggerFactory.getLogger(LinkVerifier.class);

    static final class LinkInfo {
        final Endpoint a;
        final Endpoint b;
        final String key;
        volatile boolean plumbed;
        volatile boolean ready;
        volatile boolean verified;
        volatile boolean probing;
        volatile long lastLldp;
        volatile long lastVerified;
        volatile long probeStartedAt;
        double baselineUs;
        int outlierStreak;
        int shortfallStreak;

        LinkInfo(Endpoint x, Endpoint y) {
            boolean swap = x.key().compareTo(y.key()) > 0;
            this.a = swap ? y : x;
            this.b = swap ? x : y;
            this.key = a.key() + "|" + b.key();
        }

        String label() {
            return a.key() + " <-> " + b.key();
        }
    }

    private final FlowManager flows;
    private final ProbeService probes;
    private final PortClassifier classifier;
    private final ScheduledExecutorService scheduler;
    private final BooleanSupplier enabled;
    private final Random random = new Random();
    private final Map<String, LinkInfo> links = new ConcurrentHashMap<>();
    private final Set<String> historical = ConcurrentHashMap.newKeySet();
    private final Map<String, Long> grace = new ConcurrentHashMap<>();
    private volatile double historicalMedian;
    private volatile PortBlocker blocker;

    LinkVerifier(FlowManager flows, ProbeService probes, PortClassifier classifier,
                 ScheduledExecutorService scheduler, BooleanSupplier enabled) {
        this.flows = flows;
        this.probes = probes;
        this.classifier = classifier;
        this.scheduler = scheduler;
        this.enabled = enabled;
    }

    void setBlocker(PortBlocker blocker) {
        this.blocker = blocker;
    }

    // ---------------------------------------------------------------------------------
    //  Discovery
    // ---------------------------------------------------------------------------------

    /** An LLDP/BDDP frame sent by {@code src} arrived on {@code dst}: candidate link, verify actively. */
    void onDiscovery(Endpoint src, Endpoint dst) {
        if (blocker.isMitigated(src.key()) || blocker.isMitigated(dst.key())) {
            return;
        }
        LinkInfo candidate = new LinkInfo(src, dst);
        LinkInfo l = links.computeIfAbsent(candidate.key, k -> candidate);
        l.lastLldp = System.currentTimeMillis();
        historical.add(l.key);
        synchronized (l) {
            if (l.plumbed) {
                return;
            }
            l.plumbed = true;
        }
        LOG.info("LINK-GUARD: new candidate link {} — installing probe plumbing", l.label());
        flows.installProbePlumbing(l.a);
        flows.installProbePlumbing(l.b);
        flows.writePort(l.a, "MONITORED", "Verifying");
        flows.writePort(l.b, "MONITORED", "Verifying");
        scheduler.schedule(() -> {
            l.ready = true;
            verify(l, ProbeService.Purpose.NEW_LINK);
        }, Settings.PLUMBING_DELAY_MS, TimeUnit.MILLISECONDS);
    }

    // ---------------------------------------------------------------------------------
    //  Probing
    // ---------------------------------------------------------------------------------

    private void verify(LinkInfo l, ProbeService.Purpose purpose) {
        if (!enabled.getAsBoolean() || !l.ready || blocker.isMitigated(l.a.key()) || blocker.isMitigated(l.b.key())) {
            return;
        }
        long now = System.currentTimeMillis();
        if (l.probing && now - l.probeStartedAt < Settings.PROBE_TIMEOUT_MS + 2_000) {
            return;
        }
        l.probing = true;
        l.probeStartedAt = now;
        boolean forward = random.nextBoolean(); // randomised direction each cycle
        Endpoint from = forward ? l.a : l.b;
        Endpoint to = forward ? l.b : l.a;
        probes.send(from, to, purpose, Settings.PROBE_TIMEOUT_MS, r -> onResult(l, r));
    }

    /** One-shot probe used by the persistence check and the recovery audit (no streak side effects). */
    void adHocProbe(Endpoint from, Endpoint to, ProbeService.Purpose purpose, long timeoutMs,
                    Consumer<Boolean> done) {
        probes.send(from, to, purpose, timeoutMs, r -> {
            boolean ok = r.status() == ProbeService.Status.COMPLETED
                && r.copies() >= r.expected() - 1
                && r.rttMicros() > 0
                && r.rttMicros() <= threshold();
            LOG.info("LINK-GUARD: {} probe {} -> {}: status={} copies={}/{} rtt={}us => {}", purpose, from, to,
                r.status(), r.copies(), r.expected(), (long) r.rttMicros(), ok ? "PASS" : "FAIL");
            done.accept(ok);
        });
    }

    private void onResult(LinkInfo l, ProbeService.Result r) {
        l.probing = false;
        switch (r.status()) {
            case TRANSMIT_FAILED -> LOG.warn("LINK-GUARD: probe on {} could not be sent: {}", l.label(), r.detail());
            case FORGERY -> blocker.stage1(r.offending() != null ? r.offending() : r.from(), "SIGNATURE_FORGERY",
                r.detail(), PortBlocker.STAGE1_ACTION);
            case SIZE_VIOLATION -> {
                if (!inGrace(l)) {
                    blocker.stage1(r.offending(), "IN_BAND_RELAY", r.detail(), PortBlocker.STAGE1_ACTION);
                }
            }
            case COMPLETED -> evaluate(l, r);
            default -> { }
        }
    }

    private void evaluate(LinkInfo l, ProbeService.Result r) {
        if (inGrace(l)) {
            return; // data path is still converging after a restore (Section 8.8)
        }
        boolean shortfall = r.copies() < r.expected();
        if (shortfall) {
            l.shortfallStreak++;
            LOG.warn("LINK-GUARD: {} shortfall {}/{} (streak {})", l.label(), r.copies(), r.expected(), l.shortfallStreak);
            if (l.shortfallStreak >= Settings.SHORTFALL_STREAK) {
                l.shortfallStreak = 0;
                String d = "Only " + r.copies() + " of " + r.expected() + " probe copies returned on " + l.label()
                    + " " + Settings.SHORTFALL_STREAK + " times in a row (switch relay suppressing probes)";
                blocker.stage1(l.a, "SWITCH_RELAY", d, PortBlocker.STAGE1_ACTION);
                blocker.stage1(l.b, "SWITCH_RELAY", d, PortBlocker.STAGE1_ACTION); // symmetric
                return;
            }
        } else {
            l.shortfallStreak = 0;
        }

        boolean outlier = false;
        if (r.rttMicros() > 0 && r.copies() >= Settings.MIN_COPIES_FOR_BASELINE) {
            double thr = threshold();
            double rtt = r.rttMicros();
            outlier = rtt > thr;
            if (outlier) {
                l.outlierStreak++;
                LOG.warn("LINK-GUARD: {} RTT {}us > threshold {}us (streak {})", l.label(), (long) rtt, (long) thr,
                    l.outlierStreak);
                if (l.outlierStreak >= Settings.OUTLIER_STREAK) {
                    l.outlierStreak = 0;
                    String d = "RTT " + (long) rtt + "us is a Tukey outlier (threshold " + (long) thr + "us) on "
                        + l.label();
                    flows.writeLatency(l.label(), (long) rtt, (long) l.baselineUs, (long) thr, "Anomalous");
                    blocker.stage1(l.a, "LATENCY_OUTLIER_RELAY", d, PortBlocker.STAGE1_ACTION);
                    blocker.stage1(l.b, "LATENCY_OUTLIER_RELAY", d, PortBlocker.STAGE1_ACTION);
                    return;
                }
            } else {
                l.outlierStreak = 0;
                l.baselineUs = l.baselineUs <= 0 ? rtt
                    : (1 - Settings.EMA_ALPHA) * l.baselineUs + Settings.EMA_ALPHA * rtt;
            }
            flows.writeLatency(l.label(), (long) rtt, (long) l.baselineUs, (long) thr,
                outlier ? "Anomalous" : "Normal");
        }

        if (!shortfall && !outlier) {
            l.lastVerified = System.currentTimeMillis();
            if (!l.verified) {
                l.verified = true;
                classifier.markSwitchFacing(l.a.key());
                classifier.markSwitchFacing(l.b.key());
                flows.writePort(l.a, "TRUSTED", "Active");
                flows.writePort(l.b, "TRUSTED", "Active");
                LOG.info("LINK-GUARD: link {} verified by active probing", l.label());
            }
        }
    }

    // ---------------------------------------------------------------------------------
    //  Tukey's boxplot with congestion factor G (Section 5.4)
    // ---------------------------------------------------------------------------------

    double threshold() {
        List<Double> b = links.values().stream().filter(l -> l.verified && l.baselineUs > 0)
            .map(l -> l.baselineUs).sorted().toList();
        if (b.size() < Settings.TUKEY_MIN_LINKS) {
            return Settings.STATIC_THRESHOLD_US;
        }
        double q1 = percentile(b, 25);
        double q3 = percentile(b, 75);
        double iqr = q3 - q1;
        double hist = historicalMedian;
        double g = hist <= 0 ? 1.0 : Math.max(1.0, percentile(b, 50) / hist);
        return Math.max(g * (q3 + Settings.TUKEY_K * iqr), Settings.MIN_THRESHOLD_US);
    }

    private static double percentile(List<Double> sorted, int pct) {
        int idx = Math.max(0, Math.min((int) Math.ceil(pct / 100.0 * sorted.size()) - 1, sorted.size() - 1));
        return sorted.get(idx);
    }

    // ---------------------------------------------------------------------------------
    //  Periodic re-verification (Section 5.9)
    // ---------------------------------------------------------------------------------

    void sweep() {
        if (!enabled.getAsBoolean()) {
            return;
        }
        long now = System.currentTimeMillis();
        links.values().removeIf(l -> now - l.lastLldp > Settings.LINK_STALE_MS
            && !blocker.isMitigated(l.a.key()) && !blocker.isMitigated(l.b.key()));

        List<LinkInfo> eligible = links.values().stream()
            .filter(l -> l.ready && !l.probing && !blocker.isMitigated(l.a.key()) && !blocker.isMitigated(l.b.key()))
            .sorted(Comparator.comparingLong((LinkInfo l) -> l.lastVerified)).toList();
        int cycles = (int) (Settings.SLA_S / Settings.SWEEP_PERIOD_S);
        int batch = Math.max(1, (int) Math.ceil(links.size() / (double) cycles));
        for (int i = 0; i < Math.min(batch, eligible.size()); i++) {
            verify(eligible.get(i), ProbeService.Purpose.SWEEP);
        }

        List<Double> b = links.values().stream().filter(l -> l.verified && l.baselineUs > 0)
            .map(l -> l.baselineUs).sorted().toList();
        if (!b.isEmpty()) {
            double cur = percentile(b, 50);
            historicalMedian = historicalMedian <= 0 ? cur : 0.95 * historicalMedian + 0.05 * cur;
        }
    }

    // ---------------------------------------------------------------------------------
    //  Recovery support
    // ---------------------------------------------------------------------------------

    /** Exact-match neighbour lookup from historical link keys (fixes the substring bug of Section 8.7). */
    Endpoint neighbourOf(String portKey) {
        for (String k : historical) {
            String[] seg = k.split("\\|");
            if (seg.length != 2) {
                continue;
            }
            if (seg[0].equals(portKey)) {
                return Endpoint.parse(seg[1]);
            }
            if (seg[1].equals(portKey)) {
                return Endpoint.parse(seg[0]);
            }
        }
        return null;
    }

    /** A port was restored: relax checks for a while and re-learn its link from the next LLDP. */
    void onRestored(String portKey) {
        grace.put(portKey, System.currentTimeMillis() + Settings.GRACE_MS);
        links.values().removeIf(l -> l.a.key().equals(portKey) || l.b.key().equals(portKey));
    }

    private boolean inGrace(LinkInfo l) {
        long now = System.currentTimeMillis();
        return now < grace.getOrDefault(l.a.key(), 0L) || now < grace.getOrDefault(l.b.key(), 0L);
    }

    void reset() {
        links.clear();
        historical.clear();
        grace.clear();
        historicalMedian = 0;
    }
}