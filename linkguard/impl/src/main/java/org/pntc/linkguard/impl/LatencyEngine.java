/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
// package org.pntc.linkguard.impl;

// import com.google.common.util.concurrent.FutureCallback;
// import com.google.common.util.concurrent.MoreExecutors;
// import java.nio.ByteBuffer;
// import java.nio.charset.StandardCharsets;
// import java.util.ArrayList;
// import java.util.Collections;
// import java.util.List;
// import java.util.Map;
// import java.util.concurrent.ConcurrentHashMap;
// import java.util.concurrent.ScheduledExecutorService;
// import java.util.concurrent.ScheduledFuture;
// import java.util.concurrent.TimeUnit;
// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeConnectorId;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeConnectorRef;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeId;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeRef;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.Nodes;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.node.NodeConnector;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.node.NodeConnectorKey;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.Node;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.NodeKey;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacket;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacketInputBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacketOutput;
// import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
// import org.opendaylight.yangtools.yang.common.RpcResult;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// public class LatencyEngine implements NotificationService.Listener<PacketReceived> {
//     private static final Logger LOG = LoggerFactory.getLogger(LatencyEngine.class);
//     private static final int SAMPLES_PER_LINK = 10;
//     private static final int PROBE_TIMEOUT_MS = 800;
//     private static final int PROBE_ETHERTYPE = 0x9999;
//     private static final String MARKER_PREFIX = "LGPROBE|";

//     private final FlowManager flowManager;
//     private final TransmitPacket transmitPacket;
//     private final ScheduledExecutorService scheduler;

//     private final Map<String, List<Long>> linkSamples = new ConcurrentHashMap<>();
//     private final Map<String, PendingProbe> pending = new ConcurrentHashMap<>();
//     private final Map<String, ScheduledFuture<?>> pendingTimeouts = new ConcurrentHashMap<>();

//     public LatencyEngine(FlowManager flowManager, TransmitPacket transmitPacket,
//                           ScheduledExecutorService scheduler) {
//         this.flowManager = flowManager;
//         this.transmitPacket = transmitPacket;
//         this.scheduler = scheduler;
//     }

//     public void onLinkConfirmedBidirectional(String linkId) {
//         String[] parsed = parseLinkId(linkId);
//         if (parsed == null) return;
//         sendProbe(linkId, parsed[0], parsed[1], 0);
//     }

//     @Override
//     public void onNotification(PacketReceived notification) {
//         byte[] payload = notification.getPayload();
//         if (payload == null || payload.length < 14) return;
//         int etherType = ((payload[12] & 0xFF) << 8) | (payload[13] & 0xFF);
//         if (etherType != PROBE_ETHERTYPE) return;

//         String text = new String(payload, 14, payload.length - 14, StandardCharsets.UTF_8).trim();
//         if (!text.startsWith(MARKER_PREFIX)) return;
//         String key = text.substring(MARKER_PREFIX.length());

//         PendingProbe probe = pending.remove(key);
//         if (probe == null) return;
//         cancelTimeout(key);

//         long delayMicros = (System.nanoTime() - probe.startTimeNanos) / 1000;
//         recordLatency(probe.linkId, delayMicros);

//         int nextSeq = probe.seq + 1;
//         if (nextSeq < SAMPLES_PER_LINK) {
//             sendProbe(probe.linkId, probe.sourceNode, probe.sourcePort, nextSeq);
//         }
//     }

//     private void sendProbe(String linkId, String sourceNode, String sourcePort, int seq) {
//         String key = linkId + "|" + seq;
//         byte[] probeBytes = buildProbePacket(key);

//         pending.put(key, new PendingProbe(System.nanoTime(), linkId, sourceNode, sourcePort, seq));
//         if (transmitPacket != null) {
//             transmit(sourceNode, sourcePort, probeBytes);
//         }

//         ScheduledFuture<?> timeout = scheduler.schedule(() -> {
//             if (pending.remove(key) != null) {
//                 int nextSeq = seq + 1;
//                 if (nextSeq < SAMPLES_PER_LINK) {
//                     sendProbe(linkId, sourceNode, sourcePort, nextSeq);
//                 }
//             }
//         }, PROBE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
//         pendingTimeouts.put(key, timeout);
//     }

//     private void cancelTimeout(String key) {
//         ScheduledFuture<?> task = pendingTimeouts.remove(key);
//         if (task != null) task.cancel(false);
//     }

//     private void transmit(String nodeId, String portId, byte[] payload) {
//         InstanceIdentifier<Node> nodePath = InstanceIdentifier.builder(Nodes.class)
//             .child(Node.class, new NodeKey(new NodeId(nodeId)))
//             .build();
//         InstanceIdentifier<NodeConnector> connectorPath = InstanceIdentifier.builder(Nodes.class)
//             .child(Node.class, new NodeKey(new NodeId(nodeId)))
//             .child(NodeConnector.class, new NodeConnectorKey(new NodeConnectorId(nodeId + ":" + portId)))
//             .build();

//         TransmitPacketInputBuilder input = new TransmitPacketInputBuilder()
//             .setPayload(payload)
//             .setNode(new NodeRef(nodePath.toIdentifier()))
//             .setEgress(new NodeConnectorRef(connectorPath.toIdentifier()));

//         com.google.common.util.concurrent.Futures.addCallback(
//             transmitPacket.invoke(input.build()),
//             new FutureCallback<RpcResult<TransmitPacketOutput>>() {
//                 @Override
//                 public void onSuccess(RpcResult<TransmitPacketOutput> result) {}
//                 @Override
//                 public void onFailure(Throwable t) {}
//             },
//             MoreExecutors.directExecutor()
//         );
//     }

//     private byte[] buildProbePacket(String markerKey) {
//         byte[] marker = (MARKER_PREFIX + markerKey).getBytes(StandardCharsets.UTF_8);
//         int frameLength = Math.max(60, 14 + marker.length);
//         ByteBuffer buf = ByteBuffer.allocate(frameLength);
//         buf.put(new byte[] {0x02, 0x00, 0x00, 0x00, 0x00, 0x01});
//         buf.put(new byte[] {0x02, 0x00, 0x00, 0x00, 0x00, 0x02});
//         buf.putShort((short) PROBE_ETHERTYPE);
//         buf.put(marker);
//         return buf.array();
//     }

//     private void recordLatency(String linkId, long delayMicros) {
//         List<Long> samples = linkSamples.computeIfAbsent(linkId, k -> Collections.synchronizedList(new ArrayList<>()));
//         samples.add(delayMicros);
//         if (samples.size() >= SAMPLES_PER_LINK) {
//             analyzeLink(linkId, new ArrayList<>(samples));
//             samples.clear();
//         }
//     }

//     private void analyzeLink(String linkId, List<Long> samples) {
//         Collections.sort(samples);
//         long median = samples.get(samples.size() / 2);
//         double currentMs = median / 1000.0;
        
//         flowManager.updateLatency(linkId, currentMs, 1.20, 5.00, currentMs > 5.0 ? "Anomalous" : "Normal");

//         if (currentMs > 5.0) {
//             String[] parsed = parseLinkId(linkId);
//             if (parsed != null) {
//                 flowManager.blockPort(parsed[2], parsed[3], "RELAY");
//             }
//         }
//     }

//     private String[] parseLinkId(String linkId) {
//         String[] halves = linkId.split("->");
//         if (halves.length != 2) return null;
//         String[] src = splitNodePort(halves[0]);
//         String[] dst = splitNodePort(halves[1]);
//         if (src == null || dst == null) return null;
//         return new String[] {src[0], src[1], dst[0], dst[1]};
//     }

//     private String[] splitNodePort(String s) {
//         int idx = s.lastIndexOf(':');
//         if (idx <= 0) return null;
//         return new String[] {s.substring(0, idx), s.substring(idx + 1)};
//     }

//     private static final class PendingProbe {
//         private final long startTimeNanos;
//         private final String linkId;
//         private final String sourceNode;
//         private final String sourcePort;
//         private final int seq;

//         PendingProbe(long startTimeNanos, String linkId, String sourceNode, String sourcePort, int seq) {
//             this.startTimeNanos = startTimeNanos;
//             this.linkId = linkId;
//             this.sourceNode = sourceNode;
//             this.sourcePort = sourcePort;
//             this.seq = seq;
//         }
//     }
// }


package org.pntc.linkguard.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LatencyEngine {
    private static final Logger LOG = LoggerFactory.getLogger(LatencyEngine.class);
    private final FlowManager flowManager;
    
    // Tracks arrival times to calculate intervals
    private final Map<String, Long> lastSeenTimestamps = new ConcurrentHashMap<>();
    
    // Tracks the EMA Baseline and MAD (Mean Absolute Deviation) for EACH specific link
    private final Map<String, Double> baselineMap = new ConcurrentHashMap<>();
    private final Map<String, Double> deviationMap = new ConcurrentHashMap<>();

    public LatencyEngine(FlowManager flowManager) {
        this.flowManager = flowManager;
    }

    public void processLinkTiming(String linkId) {
        long currentTime = System.currentTimeMillis();
        Long lastTime = lastSeenTimestamps.get(linkId);
        lastSeenTimestamps.put(linkId, currentTime);

        if (lastTime != null) {
            long intervalMs = currentTime - lastTime;
            
            // 1. Initial Calibration (First packet, just record it, no analysis yet)
            if (!baselineMap.containsKey(linkId)) {
                baselineMap.put(linkId, (double) intervalMs);
                deviationMap.put(linkId, 1.0); // Start with 1ms expected jitter
                LOG.info("LINK-GUARD: Calibrating new link {}", linkId);
                return;
            }

            double historicalBaseline = baselineMap.get(linkId);
            double historicalMad = deviationMap.get(linkId);

            // 2. Calculate how late or early this packet was compared to this specific link's normal rhythm
            double currentJitter = Math.abs(intervalMs - historicalBaseline);

            // 3. Dynamic Thresholding (Tukey's Inspired 3-Sigma Rule)
            // A link is only anomalous if it deviates by more than 3x its normal jitter + a 15ms buffer for CPU spikes
            double threshold = (historicalMad * 3) + 15.0; 

            String status = currentJitter > threshold ? "Anomalous" : "Normal";

            LOG.info("LINK-GUARD: LLM {} -> Jitter: {}ms, Expected MAD: {}ms, Threshold: {}ms", 
                     linkId, String.format("%.2f", currentJitter), String.format("%.2f", historicalMad), String.format("%.2f", threshold));

            // Update UI/Datastore (We send the jitter metrics so the UI graph shows the spike clearly)
            flowManager.updateLatency(linkId, currentJitter, historicalMad, threshold, status);

            // 4. Update the Learning Model (Only if normal, so attackers can't slowly train it to accept delays)
            if ("Normal".equals(status)) {
                double newBaseline = (0.2 * intervalMs) + (0.8 * historicalBaseline);
                double newMad = (0.2 * currentJitter) + (0.8 * historicalMad);
                baselineMap.put(linkId, newBaseline);
                deviationMap.put(linkId, newMad);
            } else {
                // RELAY ATTACK CAUGHT!
                String[] parts = linkId.split("->");
                if (parts.length == 2) {
                    String[] dstNodePort = parts[1].split(":");
                    if (dstNodePort.length == 2) {
                        LOG.error("LINK-GUARD: Relay Attack (Latency Outlier) detected on {}. Jitter spiked to {}ms!", parts[1], currentJitter);
                        flowManager.blockPort(dstNodePort[0], dstNodePort[1], "RELAY");
                    }
                }
            }
        }
    }
}