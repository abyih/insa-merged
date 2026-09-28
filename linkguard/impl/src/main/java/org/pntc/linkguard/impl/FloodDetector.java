/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** PLPC (Section 5.5): counts LLDP/BDDP arrivals per port inside a fixed window. */
final class FloodDetector {
    private final Map<String, AtomicInteger> counts = new ConcurrentHashMap<>();

    /** @return true if this arrival pushed the port above the threshold for the current window. */
    boolean record(String portKey) {
        return counts.computeIfAbsent(portKey, k -> new AtomicInteger()).incrementAndGet()
            > Settings.FLOOD_THRESHOLD;
    }

    /** Called every {@link Settings#FLOOD_WINDOW_S} seconds. */
    void resetWindow() {
        counts.clear();
    }

    void clear(String portKey) {
        counts.remove(portKey);
    }
}