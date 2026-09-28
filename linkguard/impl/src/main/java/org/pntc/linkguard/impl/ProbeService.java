/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Link Latency Module (Sections 5.2, 5.3, 6.1).
 *
 * <p>A 1500-byte ICMP echo (DF set) is injected with TransmitPacket out of one link end. Both link
 * ends have the same probe flow -> ALL group: bucket 1 copies the frame to the controller, bucket 2
 * decrements TTL and sends it back out of the ingress port. The probe therefore ping-pongs across the
 * physical link until TTL expires; with initial TTL = T the controller receives T copies (alternating
 * between the two switches). The RTT is the median delta between consecutive copies from the SAME
 * switch (control-channel latency cancels out).
 *
 * <p>Each probe carries an HMAC-SHA256 over (txId, timestamp, endpoints) with a 256-bit in-memory key
 * (constant-time compare). The transaction id is the 32-bit ICMP identifier+sequence.
 */
final class ProbeService {
    private static final Logger LOG = LoggerFactory.getLogger(ProbeService.class);

    enum Purpose { NEW_LINK, SWEEP, CONFIRM, AUDIT }

    enum Status { COMPLETED, FORGERY, SIZE_VIOLATION, TRANSMIT_FAILED }

    record Result(Status status, Purpose purpose, Endpoint from, Endpoint to, Endpoint offending,
                  int expected, int copies, double rttMicros, String detail) {
    }

    private record Arrival(Endpoint at, long nanos) {
    }

    private static final class Probe {
        final int txId;
        final Purpose purpose;
        final Endpoint from;
        final Endpoint to;
        final long ts;
        final int expected;
        final Consumer<Result> callback;
        final List<Arrival> arrivals = new ArrayList<>();
        boolean done;
        ScheduledFuture<?> quiet;
        ScheduledFuture<?> hard;

        Probe(int txId, Purpose purpose, Endpoint from, Endpoint to, long ts, int expected,
              Consumer<Result> callback) {
            this.txId = txId;
            this.purpose = purpose;
            this.from = from;
            this.to = to;
            this.ts = ts;
            this.expected = expected;
            this.callback = callback;
        }
    }

    private final FlowManager flows;
    private final ScheduledExecutorService scheduler;
    private final SecureRandom random = new SecureRandom();
    private final byte[] key = new byte[32];
    private final Map<Integer, Probe> active = new ConcurrentHashMap<>();
    private final Map<Integer, Long> completed = new ConcurrentHashMap<>();
    private volatile BiConsumer<Endpoint, String> orphanHandler = (e, d) -> { };

    ProbeService(FlowManager flows, ScheduledExecutorService scheduler) {
        this.flows = flows;
        this.scheduler = scheduler;
        random.nextBytes(key); // volatile-memory only, per Section 6.1.1
    }

    /** Called for probe-looking frames that match no live probe (forgery / replay). */
    void setOrphanHandler(BiConsumer<Endpoint, String> handler) {
        this.orphanHandler = handler;
    }

    // ---------------------------------------------------------------------------------
    //  Outbound
    // ---------------------------------------------------------------------------------

    void send(Endpoint from, Endpoint to, Purpose purpose, long timeoutMs, Consumer<Result> callback) {
        int txId;
        do {
            txId = random.nextInt();
        } while (txId == 0 || active.containsKey(txId));
        int ttl = Settings.TTL_CHOICES[random.nextInt(Settings.TTL_CHOICES.length)];
        long ts = System.currentTimeMillis();
        Probe p = new Probe(txId, purpose, from, to, ts, ttl, callback);
        byte[] packet = buildProbe(txId, ttl, sign(txId, ts, from, to));
        active.put(txId, p);
        p.hard = scheduler.schedule(() -> finish(p, Status.COMPLETED, null, "timeout"),
            timeoutMs, TimeUnit.MILLISECONDS);
        LOG.debug("LINK-GUARD: probe {} {} -> {} ttl={} purpose={}", Integer.toHexString(txId), from, to, ttl, purpose);
        flows.transmit(from, packet, err -> finish(p, Status.TRANSMIT_FAILED, null, err));
    }

    // ---------------------------------------------------------------------------------
    //  Inbound (called from the packet-in listener thread)
    // ---------------------------------------------------------------------------------

    /** @return true if the frame was a LINK-GUARD probe (consumed), false if it is ordinary traffic. */
    boolean onPacket(Endpoint in, byte[] b, long nanos) {
        int ip = 14;
        if (b.length < ip + 20 + 8 || b[12] != 0x08 || b[13] != 0x00) {
            return false;
        }
        int ihl = (b[ip] & 0x0F) * 4;
        if (ihl < 20 || b[ip + 9] != 1 || !matches(b, ip + 12, Settings.PROBE_SRC_IP)
            || !matches(b, ip + 16, Settings.PROBE_DST_IP)) {
            return false;
        }
        int ic = ip + ihl;
        if (b.length < ic + 8 + 32) {
            orphanHandler.accept(in, "Malformed probe frame (too short) received on " + in);
            return true;
        }
        int txId = (u16(b, ic + 4) << 16) | u16(b, ic + 6);
        Probe p = active.get(txId);
        if (p == null) {
            Long doneAt = completed.get(txId);
            if (doneAt == null || System.currentTimeMillis() - doneAt > Settings.LATE_GRACE_MS) {
                orphanHandler.accept(in, "Probe with unknown or expired transaction id "
                    + Integer.toHexString(txId) + " on " + in + " (forgery or replay)");
            }
            return true;
        }
        Endpoint offending = null;
        Status status = null;
        String detail = null;
        synchronized (p) {
            if (p.done) {
                return true;
            }
            if (!in.equals(p.from) && !in.equals(p.to)) {
                return true; // copy from a port that is not part of the link under test: ignore
            }
            byte[] expected = sign(p.txId, p.ts, p.from, p.to);
            byte[] got = Arrays.copyOfRange(b, ic + 8, ic + 8 + 32);
            if (!MessageDigest.isEqual(expected, got)) {
                status = Status.FORGERY;
                offending = in;
                detail = "HMAC-SHA256 signature mismatch on probe " + Integer.toHexString(txId) + " received on " + in;
            } else if (u16(b, ip + 2) < Settings.MIN_RETURNED_IP_LEN) {
                status = Status.SIZE_VIOLATION;
                offending = in;
                detail = "Returned probe IP length " + u16(b, ip + 2) + " < " + Settings.MIN_RETURNED_IP_LEN
                    + " on " + in + " (fragmented/tunnelled)";
            } else {
                p.arrivals.add(new Arrival(in, nanos));
                cancel(p.quiet);
                p.quiet = scheduler.schedule(() -> finish(p, Status.COMPLETED, null, "quiet"),
                    Settings.QUIET_MS, TimeUnit.MILLISECONDS);
                if (p.arrivals.size() >= p.expected) {
                    status = Status.COMPLETED;
                    detail = "all copies returned";
                }
            }
        }
        if (status != null) {
            finish(p, status, offending, detail);
        }
        return true;
    }

    // ---------------------------------------------------------------------------------
    //  Completion
    // ---------------------------------------------------------------------------------

    private void finish(Probe p, Status status, Endpoint offending, String detail) {
        Result r;
        synchronized (p) {
            if (p.done) {
                return;
            }
            p.done = true;
            cancel(p.quiet);
            cancel(p.hard);
            r = new Result(status, p.purpose, p.from, p.to, offending, p.expected, p.arrivals.size(),
                status == Status.COMPLETED ? medianRtt(p) : -1, detail);
        }
        active.remove(p.txId);
        long now = System.currentTimeMillis();
        completed.put(p.txId, now);
        completed.values().removeIf(t -> now - t > 30_000);
        scheduler.execute(() -> {
            try {
                p.callback.accept(r);
            } catch (RuntimeException e) {
                LOG.warn("LINK-GUARD: probe callback failed", e);
            }
        });
    }

    private static double medianRtt(Probe p) {
        Map<Endpoint, List<Long>> perSwitch = new HashMap<>();
        for (Arrival a : p.arrivals) {
            perSwitch.computeIfAbsent(a.at(), k -> new ArrayList<>()).add(a.nanos());
        }
        List<Double> deltas = new ArrayList<>();
        for (List<Long> t : perSwitch.values()) {
            Collections.sort(t);
            for (int i = 1; i < t.size(); i++) {
                deltas.add((t.get(i) - t.get(i - 1)) / 1000.0);
            }
        }
        if (deltas.isEmpty()) {
            return -1;
        }
        Collections.sort(deltas);
        int n = deltas.size();
        return n % 2 == 1 ? deltas.get(n / 2) : (deltas.get(n / 2 - 1) + deltas.get(n / 2)) / 2.0;
    }

    // ---------------------------------------------------------------------------------
    //  Packet construction / crypto
    // ---------------------------------------------------------------------------------

    private byte[] sign(int txId, long ts, Endpoint from, Endpoint to) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal((txId + "|" + ts + "|" + from.key() + "|" + to.key()).getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    private byte[] buildProbe(int txId, int ttl, byte[] sig) {
        byte[] b = new byte[14 + Settings.PROBE_IP_LEN];
        System.arraycopy(Settings.PROBE_DST_MAC, 0, b, 0, 6);
        System.arraycopy(Settings.PROBE_SRC_MAC, 0, b, 6, 6);
        b[12] = 0x08;
        b[13] = 0x00;
        int ip = 14;
        b[ip] = 0x45;
        put16(b, ip + 2, Settings.PROBE_IP_LEN);
        put16(b, ip + 4, random.nextInt(0x10000));
        put16(b, ip + 6, 0x4000); // DF: a tunnel must fragment (detected) or drop (shortfall)
        b[ip + 8] = (byte) ttl;
        b[ip + 9] = 1;
        System.arraycopy(Settings.PROBE_SRC_IP, 0, b, ip + 12, 4);
        System.arraycopy(Settings.PROBE_DST_IP, 0, b, ip + 16, 4);
        put16(b, ip + 10, checksum(b, ip, 20));
        int ic = ip + 20;
        b[ic] = 8; // echo request
        put16(b, ic + 4, txId >>> 16);
        put16(b, ic + 6, txId & 0xFFFF);
        System.arraycopy(sig, 0, b, ic + 8, sig.length); // 32-byte HMAC right after the transaction id
        put16(b, ic + 2, checksum(b, ic, b.length - ic));
        return b;
    }

    private static int checksum(byte[] b, int off, int len) {
        long sum = 0;
        for (int i = 0; i < len; i += 2) {
            int hi = b[off + i] & 0xFF;
            int lo = i + 1 < len ? b[off + i + 1] & 0xFF : 0;
            sum += (hi << 8) | lo;
        }
        while ((sum >> 16) != 0) {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }
        return (int) (~sum & 0xFFFF);
    }

    private static void put16(byte[] b, int off, int v) {
        b[off] = (byte) (v >> 8);
        b[off + 1] = (byte) v;
    }

    private static int u16(byte[] b, int off) {
        return ((b[off] & 0xFF) << 8) | (b[off + 1] & 0xFF);
    }

    private static boolean matches(byte[] b, int off, byte[] want) {
        for (int i = 0; i < want.length; i++) {
            if (b[off + i] != want[i]) {
                return false;
            }
        }
        return true;
    }

    private static void cancel(ScheduledFuture<?> f) {
        if (f != null) {
            f.cancel(false);
        }
    }
}