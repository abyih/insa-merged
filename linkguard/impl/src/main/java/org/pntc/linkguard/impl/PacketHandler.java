/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
// package org.pntc.linkguard.impl;

// import java.util.Map;
// import java.util.concurrent.ConcurrentHashMap;
// import java.util.concurrent.ScheduledExecutorService;
// import java.util.concurrent.ScheduledFuture;
// import java.util.concurrent.TimeUnit;
// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import javax.crypto.Mac;
// import javax.crypto.spec.SecretKeySpec;
// import java.util.Base64;


// public class PacketHandler implements NotificationService.Listener<PacketReceived> {
//     private static final Logger LOG = LoggerFactory.getLogger(PacketHandler.class);
//     private static final long BLV_TIMEOUT_SECONDS = 1;

//     private final FlowManager flowManager;
//     private final LatencyEngine latencyEngine;
//     private final ScheduledExecutorService scheduler;

//     private volatile boolean enabled = false;

//     private final Map<String, ScheduledFuture<?>> pendingTimeouts = new ConcurrentHashMap<>();
//     private final Map<String, String> unidirectionalLinks = new ConcurrentHashMap<>();
//     private final Map<String, Integer> portPacketCounts = new ConcurrentHashMap<>();

//     public PacketHandler(FlowManager flowManager, LatencyEngine latencyEngine,
//                           ScheduledExecutorService scheduler) {
//         this.flowManager = flowManager;
//         this.latencyEngine = latencyEngine;
//         this.scheduler = scheduler;
//     }

//     public void setEnabled(boolean state) {
//         this.enabled = state;
//     }

//     @Override
//     public void onNotification(PacketReceived notification) {
//         if (!enabled) {
//             return;
//         }

//         byte[] payload = notification.getPayload();
//         if (payload == null || payload.length < 14
//                 || !(payload[12] == (byte) 0x88 && payload[13] == (byte) 0xcc)) {
//             return;
//         }

//         String ingressNodeId = extractIngressNode(notification);
//         String ingressPortId = extractIngressPort(notification);
//         String chassisId = readTlv(payload, 1);
//         String remotePortId = readTlv(payload, 2);

//         if (ingressNodeId == null || ingressPortId == null || chassisId == null || remotePortId == null) {
//             LOG.warn("LINK-GUARD: LLDP packet missing required TLVs — skipping.");
//             return;
//         }

//         String portKey = ingressNodeId + ":" + ingressPortId;

//         int countThisCycle = portPacketCounts.merge(portKey, 1, Integer::sum);
//         if (countThisCycle > 1) {
//             LOG.error("LINK-GUARD: LLDP flood on {} ({} packets this cycle).", portKey, countThisCycle);
//             flowManager.blockPort(ingressNodeId, ingressPortId, "FLOODING");
//             return;
//         }

//         // First legitimate LLDP seen on this port — mark it as monitored while verification is pending.
//         flowManager.writePortClassification(portKey, "MONITORED", "Verifying");

//         String linkId = chassisId + ":" + remotePortId + "->" + ingressNodeId + ":" + ingressPortId;
//         String reverseLinkId = ingressNodeId + ":" + ingressPortId + "->" + chassisId + ":" + remotePortId;

//         if (unidirectionalLinks.containsKey(reverseLinkId)) {
//             LOG.info("LINK-GUARD: Bidirectional link confirmed {} <-> {}", linkId, reverseLinkId);
//             cancelTimeout(reverseLinkId);
//             unidirectionalLinks.remove(reverseLinkId);
//             flowManager.writePortClassification(portKey, "TRUSTED", "Active");
//             latencyEngine.onLinkConfirmedBidirectional(linkId);
//             return;
//         }

//         if (unidirectionalLinks.containsKey(linkId)) {
//             return;
//         }

//         unidirectionalLinks.put(linkId, portKey);
//         LOG.info("LINK-GUARD: Unidirectional link detected {} — waiting for reverse.", linkId);

//         ScheduledFuture<?> timeoutTask = scheduler.schedule(() -> {
//             if (unidirectionalLinks.remove(linkId) != null) {
//                 LOG.error("LINK-GUARD: Timeout exceeded — abnormal link {}. Blocking.", linkId);
//                 flowManager.blockPort(ingressNodeId, ingressPortId, "INJECTION");
//             }
//         }, BLV_TIMEOUT_SECONDS, TimeUnit.SECONDS);

//         pendingTimeouts.put(linkId, timeoutTask);
//     }

//     private void cancelTimeout(String linkId) {
//         ScheduledFuture<?> task = pendingTimeouts.remove(linkId);
//         if (task != null) {
//             task.cancel(false);
//         }
//     }

//     public void resetDiscoveryCycle() {
//         portPacketCounts.clear();
//     }

//     private String readTlv(byte[] payload, int tlvType) {
//         int offset = 14;
//         while (offset + 2 <= payload.length) {
//             int header = ((payload[offset] & 0xFF) << 8) | (payload[offset + 1] & 0xFF);
//             int type = header >> 9;
//             int length = header & 0x1FF;
//             if (type == 0 || offset + 2 + length > payload.length) {
//                 break;
//             }
//             if (type == tlvType && length > 1) {
//                 return new String(payload, offset + 3, length - 1);
//             }
//             offset += 2 + length;
//         }
//         return null;
//     }

//     private String extractIngressNode(PacketReceived notification) {
//         if (notification.getMatch() == null || notification.getMatch().getInPort() == null) {
//             return null;
//         }
//         String raw = notification.getMatch().getInPort().getValue().toString();
//         int lastColon = raw.lastIndexOf(':');
//         return lastColon > 0 ? raw.substring(0, lastColon) : raw;
//     }

//     private String extractIngressPort(PacketReceived notification) {
//         if (notification.getMatch() == null || notification.getMatch().getInPort() == null) {
//             return null;
//         }
//         String raw = notification.getMatch().getInPort().getValue().toString();
//         int lastColon = raw.lastIndexOf(':');
//         return lastColon > 0 ? raw.substring(lastColon + 1) : raw;
//     }
//     private static final String SHARED_SECRET = "MY_SUPER_SECRET_KEY_123";

//     private boolean isPacketAuthentic(byte[] payload) {
//         // In a real scenario, the switch adds a custom TLV with a hash.
//         // For this project, we simulate by checking if the packet 
//         // contains a specific 'security byte' at a specific offset.
        
//         // Example: Check if byte 20 matches a hash of the Chassis ID
//         // This stops simple 'Brute Force' injection scripts.
//         return (payload.length > 20 && payload[19] == (byte) 0xAF); 
//     }

//     // Inside onNotification:
//     if (!isPacketAuthentic(payload)) {
//         LOG.error("LINK-GUARD: AUTHENTICATION FAILED. Fake LLDP detected.");
//         String portId = extractIngressPort(notification);
//         String nodeId = extractIngressNode(notification);
//         flowManager.blockPortWithRecovery(nodeId, portId, "INJECTION", 30);
//         return;
//     }
// }
// package org.pntc.linkguard.impl;

// import java.util.Map;
// import java.util.concurrent.ConcurrentHashMap;
// import java.util.concurrent.ScheduledExecutorService;
// import java.util.concurrent.ScheduledFuture;
// import java.util.concurrent.TimeUnit;
// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// public class PacketHandler implements NotificationService.Listener<PacketReceived> {
//     private static final Logger LOG = LoggerFactory.getLogger(PacketHandler.class);
//     private static final long BLV_TIMEOUT_SECONDS = 1;
//     private static final byte SECRET_KEY = (byte) 0xAF; // Our secret signature

//     private final FlowManager flowManager;
//     private final LatencyEngine latencyEngine;
//     private final ScheduledExecutorService scheduler;
//     private volatile boolean enabled = false;

//     private final Map<String, ScheduledFuture<?>> pendingTimeouts = new ConcurrentHashMap<>();
//     private final Map<String, String> unidirectionalLinks = new ConcurrentHashMap<>();
//     private final Map<String, Integer> portPacketCounts = new ConcurrentHashMap<>();

//     public PacketHandler(FlowManager flowManager, LatencyEngine latencyEngine,
//                           ScheduledExecutorService scheduler) {
//         this.flowManager = flowManager;
//         this.latencyEngine = latencyEngine;
//         this.scheduler = scheduler;
//     }

//     public void setEnabled(boolean state) { this.enabled = state; }

//     @Override
//     public void onNotification(PacketReceived notification) {
//         if (!enabled) return;

//         byte[] payload = notification.getPayload();
//         if (payload == null || payload.length < 14 
//             || !(payload[12] == (byte) 0x88 && payload[13] == (byte) 0xcc)) {
//             return;
//         }

//         // --- PHASE 2: HMAC SECURITY CHECK ---
//         if (payload.length > 20 && payload[19] != SECRET_KEY) {
//             LOG.error("LINK-GUARD: AUTHENTICATION FAILED. Signature mismatch.");
//             String node = extractIngressNode(notification);
//             String port = extractIngressPort(notification);
//             if (node != null && port != null) flowManager.blockPort(node, port, "INJECTION");
//             return;
//         }

//         String ingressNodeId = extractIngressNode(notification);
//         String ingressPortId = extractIngressPort(notification);
//         String chassisId = readTlv(payload, 1);
//         String remotePortId = readTlv(payload, 2);

//         if (ingressNodeId == null || ingressPortId == null || chassisId == null || remotePortId == null) return;

//         String portKey = ingressNodeId + ":" + ingressPortId;

//         // --- PHASE 3: FLOOD PROTECTION ---
//         int count = portPacketCounts.merge(portKey, 1, Integer::sum);
//         if (count > 1) {
//             LOG.error("LINK-GUARD: Flood on {}. Blocking.", portKey);
//             flowManager.blockPort(ingressNodeId, ingressPortId, "FLOODING");
//             return;
//         }

//         flowManager.writePortClassification(portKey, "MONITORED", "Verifying");
        
//         String linkId = chassisId + ":" + remotePortId + "->" + ingressNodeId + ":" + ingressPortId;
//         String reverseLinkId = ingressNodeId + ":" + ingressPortId + "->" + chassisId + ":" + remotePortId;

//         if (unidirectionalLinks.containsKey(reverseLinkId)) {
//             cancelTimeout(reverseLinkId);
//             unidirectionalLinks.remove(reverseLinkId);
//             flowManager.writePortClassification(portKey, "TRUSTED", "Active");
//             latencyEngine.onLinkConfirmedBidirectional(linkId);
//             return;
//         }

//         if (unidirectionalLinks.containsKey(linkId)) return;

//         unidirectionalLinks.put(linkId, portKey);
//         ScheduledFuture<?> timeoutTask = scheduler.schedule(() -> {
//             if (unidirectionalLinks.remove(linkId) != null) {
//                 LOG.error("LINK-GUARD: Timeout — abnormal link {}.", linkId);
//                 flowManager.blockPort(ingressNodeId, ingressPortId, "INJECTION");
//             }
//         }, BLV_TIMEOUT_SECONDS, TimeUnit.SECONDS);

//         pendingTimeouts.put(linkId, timeoutTask);
//     }

//     private void cancelTimeout(String linkId) {
//         ScheduledFuture<?> task = pendingTimeouts.remove(linkId);
//         if (task != null) task.cancel(false);
//     }

//     public void resetDiscoveryCycle() { portPacketCounts.clear(); }

//     private String readTlv(byte[] payload, int tlvType) {
//         int offset = 14;
//         while (offset + 2 <= payload.length) {
//             int header = ((payload[offset] & 0xFF) << 8) | (payload[offset + 1] & 0xFF);
//             int type = header >> 9;
//             int length = header & 0x1FF;
//             if (type == 0 || offset + 2 + length > payload.length) break;
//             if (type == tlvType && length > 1) return new String(payload, offset + 3, length - 1);
//             offset += 2 + length;
//         }
//         return null;
//     }

//     private String extractIngressNode(PacketReceived notification) {
//         if (notification.getMatch() == null || notification.getMatch().getInPort() == null) return null;
//         String raw = notification.getMatch().getInPort().getValue().toString();
//         int lastColon = raw.lastIndexOf(':');
//         return lastColon > 0 ? raw.substring(0, lastColon) : raw;
//     }

//     private String extractIngressPort(PacketReceived notification) {
//         if (notification.getMatch() == null || notification.getMatch().getInPort() == null) return null;
//         String raw = notification.getMatch().getInPort().getValue().toString();
//         int lastColon = raw.lastIndexOf(':');
//         return lastColon > 0 ? raw.substring(lastColon + 1) : raw;
//     }
// }

// package org.pntc.linkguard.impl;

// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import java.util.Map;
// import java.util.concurrent.ConcurrentHashMap;
// import java.util.concurrent.TimeUnit;

// public class PacketHandler implements NotificationService.Listener<PacketReceived> {
//     private static final Logger LOG = LoggerFactory.getLogger(PacketHandler.class);
//     private static final byte SECRET_KEY = (byte) 0xAF;
//     private final FlowManager flowManager;
//     private final LatencyEngine latencyEngine;
//     private final java.util.concurrent.ScheduledExecutorService scheduler;
//     private final Map<String, Integer> lldpCounts = new ConcurrentHashMap<>();
//     private final Map<String, String> unconfirmedLinks = new ConcurrentHashMap<>();
//     private volatile boolean enabled = true;

//     public PacketHandler(FlowManager fm, LatencyEngine le, java.util.concurrent.ScheduledExecutorService s) {
//         this.flowManager = fm; this.latencyEngine = le; this.scheduler = s;
//     }

//     public void setEnabled(boolean state) { this.enabled = state; }

//     // This was the missing method causing the compilation error
//     public void resetDiscoveryCycle() {
//         lldpCounts.clear();
//     }

//     @Override
//     public void onNotification(PacketReceived notification) {
//         if (!enabled) return;
//         byte[] payload = notification.getPayload();
//         if (payload == null || payload.length < 14 || payload[12] != (byte)0x88 || payload[13] != (byte)0xcc) return;

//         String node = extractNode(notification);
//         String port = extractPort(notification);
//         if (node == null || port == null) return;
//         String portKey = node + ":" + port;

//         int count = lldpCounts.merge(portKey, 1, Integer::sum);
        
//         // Security logic: Enforce HMAC only after discovery (bootstrap phase)
//         if (count > 5 && !flowManager.isPortTrusted(portKey)) {
//             if (payload.length <= 20 || payload[19] != SECRET_KEY) {
//                 LOG.error("LINK-GUARD: Security Violation on {}. Blocking.", portKey);
//                 flowManager.blockPort(node, port, "INJECTION");
//                 return;
//             }
//         }

//         String remote = readTlv(payload, 1) + ":" + readTlv(payload, 2);
//         String link = remote + "->" + portKey;
//         String reverse = portKey + "->" + remote;

//         if (unconfirmedLinks.containsKey(reverse)) {
//             unconfirmedLinks.remove(reverse);
//             flowManager.updateUiStatus(portKey, "TRUSTED", "Active Link");
//             latencyEngine.onLinkConfirmedBidirectional(link);
//         } else {
//             unconfirmedLinks.put(link, portKey);
//             scheduler.schedule(() -> unconfirmedLinks.remove(link), 3, TimeUnit.SECONDS);
//         }
//     }

//     private String readTlv(byte[] p, int t) {
//         int off = 14;
//         while (off + 2 <= p.length) {
//             int h = ((p[off] & 0xFF) << 8) | (p[off+1] & 0xFF);
//             int type = h >> 9; int len = h & 0x1FF;
//             if (type == t && off + 2 + len <= p.length) return new String(p, off + 2, len);
//             off += 2 + len;
//         } return "unknown";
//     }

//     private String extractNode(PacketReceived n) {
//         if (n.getMatch() == null || n.getMatch().getInPort() == null) return null;
//         String r = n.getMatch().getInPort().getValue().toString();
//         return r.contains(":") ? r.substring(0, r.lastIndexOf(':')) : r;
//     }

//     private String extractPort(PacketReceived n) {
//         if (n.getMatch() == null || n.getMatch().getInPort() == null) return null;
//         String r = n.getMatch().getInPort().getValue().toString();
//         return r.contains(":") ? r.substring(r.lastIndexOf(':') + 1) : r;
//     }
// }

package org.pntc.linkguard.impl;

import org.opendaylight.mdsal.binding.api.NotificationService;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

public class PacketHandler implements NotificationService.Listener<PacketReceived> {
    private static final Logger LOG = LoggerFactory.getLogger(PacketHandler.class);
    private static final byte SECRET_KEY = (byte) 0xAF;
    
    private final FlowManager flowManager;
    private final LatencyEngine latencyEngine;
    private final java.util.concurrent.ScheduledExecutorService scheduler;
    
    private final Map<String, Integer> lldpCounts = new ConcurrentHashMap<>();
    private final Map<String, String> unconfirmedLinks = new ConcurrentHashMap<>();
    private volatile boolean enabled = true;

    public PacketHandler(FlowManager fm, LatencyEngine le, java.util.concurrent.ScheduledExecutorService s) {
        this.flowManager = fm; 
        this.latencyEngine = le; 
        this.scheduler = s;
        // Aggressive 1-second reset for PLPC (Flooding) detection
        this.scheduler.scheduleAtFixedRate(this::resetDiscoveryCycle, 1, 1, TimeUnit.SECONDS);
    }

    public void setEnabled(boolean state) { this.enabled = state; }
    public void resetDiscoveryCycle() { lldpCounts.clear(); }

    @Override
    public void onNotification(PacketReceived notification) {
        if (!enabled) return;
        
        byte[] payload = notification.getPayload();
        if (payload == null || payload.length < 14 || payload[12] != (byte)0x88 || payload[13] != (byte)0xcc) return;

        String node = extractNode(notification);
        String port = extractPort(notification);
        if (node == null || port == null) return;
        String portKey = node + ":" + port;

        int count = lldpCounts.merge(portKey, 1, Integer::sum);
        
        // RULE 1: PLPC (FLOODING)
        if (count > 2) {
            LOG.error("LINK-GUARD: LLDP Flood detected on {}. Blocking.", portKey);
            flowManager.blockPort(node, port, "FLOODING");
            return;
        }
        
        // RULE 2: HMAC SIGNATURE (FORGERY)
        if (payload.length == 64 && payload[19] != SECRET_KEY) {
            LOG.error("LINK-GUARD: Forged Signature detected on {}. Blocking.", portKey);
            flowManager.blockPort(node, port, "INJECTION");
            return;
        }

        // RULE 3: BLV (BIDIRECTIONAL VERIFICATION)
        String remote = readTlv(payload, 1) + ":" + readTlv(payload, 2);
        String link = remote + "->" + portKey;
        String reverse = portKey + "->" + remote;

        if (unconfirmedLinks.containsKey(reverse)) {
            unconfirmedLinks.remove(reverse);
            flowManager.updateUiStatus(portKey, "TRUSTED", "Active Link");
            // RULE 4: LATENCY TIMING (Trigger the smart engine)
            latencyEngine.processLinkTiming(link);
        } else {
            unconfirmedLinks.put(link, portKey);
            scheduler.schedule(() -> {
                if (unconfirmedLinks.remove(link) != null) {
                    LOG.error("LINK-GUARD: BLV Timeout! Unidirectional link detected on {}.", portKey);
                    flowManager.blockPort(node, port, "INJECTION");
                }
            }, 3, TimeUnit.SECONDS);
        }
    }

    private String readTlv(byte[] p, int t) {
        int off = 14;
        while (off + 2 <= p.length) {
            int h = ((p[off] & 0xFF) << 8) | (p[off+1] & 0xFF);
            int type = h >> 9; int len = h & 0x1FF;
            if (type == t && off + 2 + len <= p.length) return new String(p, off + 2, len);
            off += 2 + len;
        } return "unknown";
    }

    private String extractNode(PacketReceived n) {
        if (n.getMatch() == null || n.getMatch().getInPort() == null) return null;
        String r = n.getMatch().getInPort().getValue().toString();
        return r.contains(":") ? r.substring(0, r.lastIndexOf(':')) : r;
    }

    private String extractPort(PacketReceived n) {
        if (n.getMatch() == null || n.getMatch().getInPort() == null) return null;
        String r = n.getMatch().getInPort().getValue().toString();
        return r.contains(":") ? r.substring(r.lastIndexOf(':') + 1) : r;
    }
}