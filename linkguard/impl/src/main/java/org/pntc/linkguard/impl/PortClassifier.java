/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Switch-facing vs host-facing (Section 5.7). Fail-secure: anything not positively confirmed as
 * host-facing is treated as switch-facing (stricter mitigation).
 *
 * <p>SWITCH_FACING is set only after an active probe verified the link. HOST_FACING is set only when
 * a port shows ordinary host traffic (ARP/IP), never carried LLDP, and has been observed for a settle
 * period (so an inter-switch port whose first frame was data is not mistaken for a host port).
 */
final class PortClassifier {
    enum Kind { SWITCH_FACING, HOST_FACING, UNKNOWN }

    private final Map<String, Kind> confirmed = new ConcurrentHashMap<>();
    private final Map<String, Long> firstSeen = new ConcurrentHashMap<>();
    private final Set<String> lldpSeen = ConcurrentHashMap.newKeySet();

    void observePort(String key) {
        firstSeen.putIfAbsent(key, System.currentTimeMillis());
    }

    void noteLldp(String key) {
        lldpSeen.add(key);
    }

    void markSwitchFacing(String key) {
        confirmed.put(key, Kind.SWITCH_FACING);
    }

    /** Returns true only on the transition to HOST_FACING. */
    boolean observeHostTraffic(String key) {
        observePort(key);
        if (confirmed.containsKey(key) || lldpSeen.contains(key)) {
            return false;
        }
        if (System.currentTimeMillis() - firstSeen.get(key) < Settings.CLASSIFY_SETTLE_MS) {
            return false;
        }
        return confirmed.putIfAbsent(key, Kind.HOST_FACING) == null;
    }

    Kind classify(String key) {
        return confirmed.getOrDefault(key, Kind.UNKNOWN);
    }

    void reset() {
        confirmed.clear();
        firstSeen.clear();
        lldpSeen.clear();
    }
}