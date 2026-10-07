/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

/** All tunables in one place. Values follow the ONOS LINK-GUARD documentation. */
final class Settings {
    private Settings() {
    }

    // ---- Active probe identity (Section 5.2) ----
    static final byte[] PROBE_DST_MAC = {0x02, 0x4c, 0x47, 0x00, 0x00, 0x01};
    static final byte[] PROBE_SRC_MAC = {0x02, 0x4c, 0x47, 0x00, 0x00, 0x02};
    static final byte[] PROBE_SRC_IP = {10, (byte) 255, (byte) 255, (byte) 254};
    static final byte[] PROBE_DST_IP = {10, (byte) 255, (byte) 255, (byte) 253};
    static final String PROBE_SRC_IP_STR = "10.255.255.254";
    /** ICMP echo sized to the Ethernet MTU (Section 5.3). */
    static final int PROBE_IP_LEN = 1500;
    /** Returned copies whose IP total length is below this were fragmented/tunnelled. */
    static final int MIN_RETURNED_IP_LEN = 1490;
    /** Randomised per cycle. Even so both switches see the same number of copies. */
    static final int[] TTL_CHOICES = {6, 8, 10};
    /** At least two copies per switch are needed to extract inter-arrival deltas (Section 8.1). */
    static final int MIN_COPIES_FOR_BASELINE = 4;
    static final long GROUP_ID = 0x4C47L;

    // ---- Timers ----
    static final long PROBE_TIMEOUT_MS = 15_000;   // general shortfall timer
    static final long QUIET_MS = 1_500;            // finish early when copies stop arriving
    static final long AUDIT_TIMEOUT_MS = 8_000;    // Section 6.2.2
    static final long CONFIRM_TIMEOUT_MS = 6_000;  // persistence check before Stage 2
    static final long PLUMBING_DELAY_MS = 5_000;   // group + flows converge (Section 8.6)
    static final long AUDIT_SETTLE_MS = 3_000;     // Section 6.2.2
    static final long STAGE2_DELAY_MS = 3_000;     // Section 5.8
    static final long GRACE_MS = 20_000;           // post-restore grace (Section 8.8)
    static final long LATE_GRACE_MS = 2_000;
    static final long SWEEP_PERIOD_S = 10;         // Section 5.9
    static final long SLA_S = 120;
    static final long LINK_STALE_MS = 90_000;
    static final long CLASSIFY_SETTLE_MS = 12_000;

    // ---- PLPC (Section 5.5): ODL's LLDP speaker sends one frame per port per ~5 s ----
    static final int FLOOD_THRESHOLD = 6;
    static final long FLOOD_WINDOW_S = 5;

    // ---- Tukey (Section 5.4) ----
    static final int TUKEY_MIN_LINKS = 15;
    static final double TUKEY_K = 3.0;
    static final double STATIC_THRESHOLD_US = 20_000;
    static final double MIN_THRESHOLD_US = 2_000;
    static final double EMA_ALPHA = 0.2;
    static final int OUTLIER_STREAK = 3;
    static final int SHORTFALL_STREAK = 3;

    // ---- Self-healing (Table 7) ----
    static final long[] COOLDOWNS_S = {60, 120, 240};

    // ---- OpenFlow priorities ----
    static final int PRIO_LLDP_DROP = 65535;
    static final int PRIO_HARD_BLOCK = 65534;
    static final int PRIO_PROBE = 65000;

    static final int MAX_ANOMALIES = 500;
}