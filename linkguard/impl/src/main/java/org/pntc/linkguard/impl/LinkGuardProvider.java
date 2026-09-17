// package org.pntc.linkguard.impl;

// import com.google.common.util.concurrent.Futures;
// import com.google.common.util.concurrent.ListenableFuture;
// import com.google.common.util.concurrent.MoreExecutors;
// import java.util.concurrent.Executors;
// import java.util.concurrent.ScheduledExecutorService;
// import org.opendaylight.mdsal.binding.api.DataBroker;
// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.mdsal.binding.api.RpcProviderService;
// import org.opendaylight.mdsal.binding.api.WriteTransaction;
// import org.opendaylight.mdsal.common.api.LogicalDatastoreType;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.*;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacket;
// import org.opendaylight.yangtools.concepts.Registration;
// import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
// import org.opendaylight.yangtools.yang.common.RpcResult;
// import org.opendaylight.yangtools.yang.common.RpcResultBuilder;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// public class LinkGuardProvider implements Toggle {
//     private static final Logger LOG = LoggerFactory.getLogger(LinkGuardProvider.class);

//     private final DataBroker dataBroker;
//     private final NotificationService notificationService;
//     private final RpcProviderService rpcProviderService;
//     private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

//     private PacketHandler packetHandler;
//     private Registration rpcReg;
//     private Registration pktReg;
//     private Registration latencyReg;

//     public LinkGuardProvider(DataBroker dataBroker, NotificationService notificationService,
//                               RpcProviderService rpcProviderService) {
//         this.dataBroker = dataBroker;
//         this.notificationService = notificationService;
//         this.rpcProviderService = rpcProviderService;
//     }

//     public void init() {
//         try {
//             LOG.info("LINK-GUARD: Initializing core security framework...");
//             initializeDatastore();

//             FlowManager flowManager = new FlowManager(dataBroker, scheduler);
//             TransmitPacket transmitPacket = null; 
            
//             LatencyEngine latencyEngine = new LatencyEngine(flowManager, transmitPacket, scheduler);
//             this.packetHandler = new PacketHandler(flowManager, latencyEngine, scheduler);

//             this.pktReg = notificationService.registerListener(PacketReceived.class, packetHandler);
//             this.latencyReg = notificationService.registerListener(PacketReceived.class, latencyEngine);

//             this.rpcReg = rpcProviderService.registerRpcImplementation(this);

//             LOG.info("LINK-GUARD: System fully Active and Monitoring.");
//         } catch (Exception e) {
//             LOG.error("LINK-GUARD: Error during initialization: ", e);
//         }
//     }

//     private void initializeDatastore() {
//         try {
//             // 1. Write Configuration Data in its own transaction (MDSAL 15 rule)
//             LinkguardConfig config = new LinkguardConfigBuilder().setEnabled(false).build();
//             WriteTransaction tx1 = dataBroker.newWriteOnlyTransaction();
//             tx1.put(LogicalDatastoreType.CONFIGURATION, 
//                 InstanceIdentifier.create(LinkguardConfig.class).toIdentifier(), 
//                 config);
//             tx1.commit();

//             // 2. Write Operational Data in its own separate transaction
//             LinkguardStatus status = new LinkguardStatusBuilder().build();
//             WriteTransaction tx2 = dataBroker.newWriteOnlyTransaction();
//             tx2.put(LogicalDatastoreType.OPERATIONAL, 
//                 InstanceIdentifier.create(LinkguardStatus.class).toIdentifier(), 
//                 status);
//             tx2.commit();

//             LOG.info("LINK-GUARD: Datastore successfully initialized.");
//         } catch (Exception e) {
//             LOG.error("LINK-GUARD: Failed to initialize datastore", e);
//         }
//     }

//     @Override
//     public ListenableFuture<RpcResult<ToggleOutput>> invoke(ToggleInput input) {
//         boolean enabled = Boolean.TRUE.equals(input.getEnabled());
//         LOG.info("LINK-GUARD: Toggle RPC received. State -> {}", enabled);

//         LinkguardConfig config = new LinkguardConfigBuilder().setEnabled(enabled).build();
//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.put(LogicalDatastoreType.CONFIGURATION,
//             InstanceIdentifier.create(LinkguardConfig.class).toIdentifier(),
//             config);

//         return Futures.transform(tx.commit(), result -> {
//             if (packetHandler != null) {
//                 packetHandler.setEnabled(enabled);
//             }
//             return RpcResultBuilder.success(new ToggleOutputBuilder().setStatus("SUCCESS").build()).build();
//         }, MoreExecutors.directExecutor());
//     }

//     public void close() {
//         if (rpcReg != null) rpcReg.close();
//         if (pktReg != null) pktReg.close();
//         if (latencyReg != null) latencyReg.close();
//         scheduler.shutdown();
//     }
// }

/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.MoreExecutors;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import org.opendaylight.mdsal.binding.api.DataBroker;
import org.opendaylight.mdsal.binding.api.NotificationService;
import org.opendaylight.mdsal.binding.api.RpcProviderService;
import org.opendaylight.mdsal.binding.api.WriteTransaction;
import org.opendaylight.mdsal.common.api.LogicalDatastoreType;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.*;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.*;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
import org.opendaylight.yangtools.concepts.Registration;
import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
import org.opendaylight.yangtools.yang.common.Decimal64;
import org.opendaylight.yangtools.yang.common.RpcResult;
import org.opendaylight.yangtools.yang.common.RpcResultBuilder;
import org.opendaylight.yangtools.yang.common.Uint32;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LinkGuardProvider implements Toggle {
    private static final Logger LOG = LoggerFactory.getLogger(LinkGuardProvider.class);

    private final DataBroker dataBroker;
    private final NotificationService notificationService;
    private final RpcProviderService rpcProviderService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    private PacketHandler packetHandler;
    private Registration rpcReg;
    private Registration pktReg;

    public LinkGuardProvider(DataBroker dataBroker, NotificationService notificationService,
                              RpcProviderService rpcProviderService) {
        this.dataBroker = dataBroker;
        this.notificationService = notificationService;
        this.rpcProviderService = rpcProviderService;
    }

    public void init() {
        try {
            LOG.info("LINK-GUARD: Initializing core security framework...");
            initializeDatastore();

            FlowManager flowManager = new FlowManager(dataBroker, scheduler);
            LatencyEngine latencyEngine = new LatencyEngine(flowManager);
            
            this.packetHandler = new PacketHandler(flowManager, latencyEngine, scheduler);

            this.pktReg = notificationService.registerListener(PacketReceived.class, packetHandler);
            this.rpcReg = rpcProviderService.registerRpcImplementation(this);

            LOG.info("LINK-GUARD: System fully Active and Monitoring.");
        } catch (Exception e) {
            LOG.error("LINK-GUARD: Error during initialization: ", e);
        }
    }

    private void initializeDatastore() {
        try {
            // 1. Write Configuration Data
            LinkguardConfig config = new LinkguardConfigBuilder().setEnabled(false).build();
            WriteTransaction tx1 = dataBroker.newWriteOnlyTransaction();
            tx1.put(LogicalDatastoreType.CONFIGURATION, 
                InstanceIdentifier.create(LinkguardConfig.class).toIdentifier(), 
                config);
            tx1.commit();

            // 2. Seed Default Ports
            Map<PortClassificationKey, PortClassification> initialPorts = new HashMap<>();
            for (int i = 1; i <= 7; i++) {
                String switchId = "openflow:" + i;
                String portKey = switchId + "-port-1";
                PortClassificationKey key = new PortClassificationKey(portKey);
                
                initialPorts.put(key, new PortClassificationBuilder()
                    .withKey(key)
                    .setPortId(portKey)
                    .setSwitchId(switchId)
                    .setPortNo(Uint32.valueOf(1))
                    .setClassification(PortClassificationType.TRUSTED)
                    .setStatus("Active")
                    .setLastUpdated("Just now")
                    .build());
            }

            // 3. Seed Default Link Baselines (Linear Topology links: s1-s2, s2-s3, etc.)
            Map<LinkLatencyKey, LinkLatency> initialLatency = new HashMap<>();
            for (int i = 1; i < 7; i++) {
                String linkId = "openflow:" + i + "/2-openflow:" + (i + 1) + "/2";
                LinkLatencyKey latencyKey = new LinkLatencyKey(linkId);

                initialLatency.put(latencyKey, new LinkLatencyBuilder()
                    .withKey(latencyKey)
                    .setLinkId(linkId)
                    .setCurrentRtt(Decimal64.valueOf(BigDecimal.valueOf(1.25)))
                    .setBaselineRtt(Decimal64.valueOf(BigDecimal.valueOf(1.20)))
                    .setThreshold(Decimal64.valueOf(BigDecimal.valueOf(5.00)))
                    .setStatus("Normal")
                    .setLastCheck("Just now")
                    .build());
            }

            LinkguardStatus status = new LinkguardStatusBuilder()
                    .setPortClassification(initialPorts)
                    .setLinkLatency(initialLatency)
                    .build();

            WriteTransaction tx2 = dataBroker.newWriteOnlyTransaction();
            tx2.put(LogicalDatastoreType.OPERATIONAL, 
                InstanceIdentifier.create(LinkguardStatus.class).toIdentifier(), 
                status);
            tx2.commit();

            LOG.info("LINK-GUARD: Datastore successfully initialized with default ports and latency baselines.");
        } catch (Exception e) {
            LOG.error("LINK-GUARD: Failed to initialize datastore", e);
        }
    }

    @Override
    public ListenableFuture<RpcResult<ToggleOutput>> invoke(ToggleInput input) {
        boolean enabled = Boolean.TRUE.equals(input.getEnabled());
        LOG.info("LINK-GUARD: Toggle RPC received. State -> {}", enabled);

        LinkguardConfig config = new LinkguardConfigBuilder().setEnabled(enabled).build();
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.CONFIGURATION,
            InstanceIdentifier.create(LinkguardConfig.class).toIdentifier(),
            config);

        return Futures.transform(tx.commit(), result -> {
            if (packetHandler != null) {
                packetHandler.setEnabled(enabled);
            }
            return RpcResultBuilder.success(new ToggleOutputBuilder().setStatus("SUCCESS").build()).build();
        }, MoreExecutors.directExecutor());
    }

    public void close() {
        if (rpcReg != null) rpcReg.close();
        if (pktReg != null) pktReg.close();
        scheduler.shutdown();
    }
}