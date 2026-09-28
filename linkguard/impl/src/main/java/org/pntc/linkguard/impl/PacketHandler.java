/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.opendaylight.mdsal.binding.api.NotificationService;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Packet-in entry point: probes -> ProbeService, LLDP/BDDP -> PLPC + boundary defence + link verification. */
public class PacketHandler implements NotificationService.Listener<PacketReceived> {
    private static final Logger LOG = LoggerFactory.getLogger(PacketHandler.class);
    private static final int ETH_LLDP = 0x88cc;
    private static final int ETH_BDDP = 0x8999;
    private static final Pattern CONNECTOR = Pattern.compile("openflow:\\d+:\\d+");
    private static final Pattern NODE = Pattern.compile("openflow:\\d+");

    private final ProbeService probes;
    private final LinkVerifier verifier;
    private final PortBlocker blocker;
    private final PortClassifier classifier;
    private final FloodDetector flood;
    private final FlowManager flows;
    private volatile boolean enabled;

    PacketHandler(ProbeService probes, LinkVerifier verifier, PortBlocker blocker, PortClassifier classifier,
                  FloodDetector flood, FlowManager flows) {
        this.probes = probes;
        this.verifier = verifier;
        this.blocker = blocker;
        this.classifier = classifier;
        this.flood = flood;
        this.flows = flows;
    }

    public void setEnabled(boolean state) {
        this.enabled = state;
    }

    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void onNotification(PacketReceived n) {
        if (!enabled) {
            return;
        }
        try {
            handle(n);
        } catch (RuntimeException e) {
            LOG.warn("LINK-GUARD: packet handling failed", e);
        }
    }

    private void handle(PacketReceived n) {
        long nanos = System.nanoTime(); // timestamp first: probe RTT depends on it
        byte[] p = n.getPayload();
        if (p == null || p.length < 14 || n.getMatch() == null || n.getMatch().getInPort() == null) {
            return;
        }
        Endpoint in = Endpoint.parse(n.getMatch().getInPort().getValue());
        if (in == null) {
            return;
        }
        int type = ((p[12] & 0xFF) << 8) | (p[13] & 0xFF);
        if (type == 0x0800 && probes.onPacket(in, p, nanos)) {
            return;
        }
        if (type == ETH_LLDP || type == ETH_BDDP) {
            discovery(in, p);
        } else if (type == 0x0806 || type == 0x0800 || type == 0x86dd) {
            if (classifier.observeHostTraffic(in.key())) {
                flows.writePort(in, "HOST_FACING", "Active");
            }
        }
    }

    private void discovery(Endpoint in, byte[] p) {
        String key = in.key();
        classifier.observePort(key);
        if (blocker.isMitigated(key)) {
            return;
        }
        // PLPC: no consecutive-reading tolerance, a flood is an attack the moment it is confirmed
        if (flood.record(key)) {
            blocker.stage1(in, "LLDP_FLOODING", "More than " + Settings.FLOOD_THRESHOLD + " LLDP/BDDP frames within "
                + Settings.FLOOD_WINDOW_S + "s on " + key, "Stage 1: LLDP/BDDP selective drop (PLPC)");
            return;
        }
        // Boundary defence: a host-facing port must never originate discovery traffic
        if (classifier.classify(key) == PortClassifier.Kind.HOST_FACING) {
            blocker.stage1(in, "LINK_FABRICATION", "Discovery frame intercepted on host-facing port " + key,
                "Boundary drop: LLDP/BDDP dropped on host-facing port");
            return;
        }
        classifier.noteLldp(key);
        Endpoint src = parseLldpSource(p);
        if (src == null) {
            LOG.debug("LINK-GUARD: could not identify LLDP originator on {}", key);
            return;
        }
        if (!src.equals(in)) {
            verifier.onDiscovery(src, in);
        }
    }

    /** ODL's LLDP carries the sender as openflow:N (system name) and openflow:N:P (custom TLV). */
    private static Endpoint parseLldpSource(byte[] p) {
        String s = new String(p, 14, p.length - 14, StandardCharsets.ISO_8859_1);
        Matcher c = CONNECTOR.matcher(s);
        if (c.find()) {
            return Endpoint.parse(c.group());
        }
        Matcher n = NODE.matcher(s);
        if (n.find()) {
            String port = tlvString(p, 2);
            if (port != null && port.matches("\\d+")) {
                return new Endpoint(n.group(), port);
            }
        }
        return null;
    }

    private static String tlvString(byte[] p, int wanted) {
        int off = 14;
        while (off + 2 <= p.length) {
            int header = ((p[off] & 0xFF) << 8) | (p[off + 1] & 0xFF);
            int type = header >> 9;
            int len = header & 0x1FF;
            if (type == 0 || off + 2 + len > p.length) {
                break;
            }
            if (type == wanted && len > 1) {
                return new String(p, off + 3, len - 1, StandardCharsets.ISO_8859_1).trim();
            }
            off += 2 + len;
        }
        return null;
    }
}
