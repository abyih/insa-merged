// /*
//  * Copyright © 2026 PNTC and others.  All rights reserved.
//  *
//  * This program and the accompanying materials are made available under the
//  * terms of the Eclipse Public License v1.0 which accompanies this distribution,
//  * and is available at http://www.eclipse.org/legal/epl-v10.html
//  */
// package org.pntc.linkguard.impl;

// import com.google.common.util.concurrent.Futures;
// import com.google.common.util.concurrent.ListenableFuture;
// import java.util.concurrent.Executors;
// import java.util.concurrent.ScheduledExecutorService;
// import java.util.concurrent.TimeUnit;
// import org.opendaylight.mdsal.binding.api.DataBroker;
// import org.opendaylight.mdsal.binding.api.NotificationService;
// import org.opendaylight.mdsal.binding.api.RpcProviderService;
// import org.opendaylight.mdsal.binding.api.RpcService;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Reset;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetInput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetOutput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetOutputBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Toggle;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleInput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutputBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Unlock;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockInput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockOutput;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockOutputBuilder;
// import org.opendaylight.yangtools.concepts.Registration;
// import org.opendaylight.yangtools.yang.common.RpcResultBuilder;
// import org.opendaylight.yangtools.yang.common.RpcResult;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// /**
//  * Top-level OSGi provider. Builds the component graph, registers the packet-in listener and the
//  * toggle / unlock / reset RPCs, and schedules the periodic tasks (rolling re-verification sweep,
//  * PLPC window reset).
//  */
// public class LinkGuardProvider {
//     private static final Logger LOG = LoggerFactory.getLogger(LinkGuardProvider.class);

//     private final DataBroker dataBroker;
//     private final NotificationService notificationService;
//     private final RpcProviderService rpcProviderService;
//     private final RpcService rpcService;

//     private ScheduledExecutorService scheduler;
//     private Registration packetReg;
//     private Registration rpcReg;

//     private FlowManager flows;
//     private AnomalyStore store;
//     private PortClassifier classifier;
//     private FloodDetector flood;
//     private ProbeService probes;
//     private PortBlocker blocker;
//     private LinkVerifier verifier;
//     private PacketHandler handler;

//     public LinkGuardProvider(final DataBroker dataBroker, final NotificationService notificationService,
//                              final RpcProviderService rpcProviderService, final RpcService rpcService) {
//         this.dataBroker = dataBroker;
//         this.notificationService = notificationService;
//         this.rpcProviderService = rpcProviderService;
//         this.rpcService = rpcService;
//     }

//     public void init() {
//         scheduler = Executors.newScheduledThreadPool(4, r -> {
//             Thread t = new Thread(r, "linkguard-worker");
//             t.setDaemon(true);
//             return t;
//         });

//         flows = new FlowManager(dataBroker, rpcService, scheduler);
//         store = new AnomalyStore(flows);
//         store.loadFromDisk();
//         classifier = new PortClassifier();
//         flood = new FloodDetector();
//         probes = new ProbeService(flows, scheduler);
//         verifier = new LinkVerifier(flows, probes, classifier, scheduler, () -> handler != null && handler.isEnabled());
//         blocker = new PortBlocker(flows, store, classifier, flood, scheduler);
//         blocker.setVerifier(verifier);
//         verifier.setBlocker(blocker);
//         handler = new PacketHandler(probes, verifier, blocker, classifier, flood, flows);

//         // Restore the shield state persisted by the last toggle (linkguard-config survives restarts).
//         flows.restoreEnabled(on -> {
//             if (on) {
//                 handler.setEnabled(true);
//                 LOG.info("LINK-GUARD shield restored to ENABLED from persisted config");
//             }
//         });

//         // Probes that come back with an unknown/expired transaction id = forgery or replay.
//         probes.setOrphanHandler((port, detail) -> {
//             store.record("PROBE_FORGERY", "HIGH", port.source(), detail,
//                 "Logged", "Unsolicited or replayed probe frame", "DETECTED");
//             if (!blocker.isMitigated(port.key())) {
//                 blocker.stage1(port, "PROBE_FORGERY", detail, PortBlocker.STAGE1_ACTION);
//             }
//         });

//         packetReg = notificationService.registerListener(PacketReceived.class, handler);
//         rpcReg = rpcProviderService.registerRpcImplementations(
//             (Toggle) this::toggle, (Unlock) this::unlock, (Reset) this::reset);

//         scheduler.scheduleWithFixedDelay(guard(verifier::sweep), Settings.SWEEP_PERIOD_S,
//             Settings.SWEEP_PERIOD_S, TimeUnit.SECONDS);
//         scheduler.scheduleWithFixedDelay(guard(flood::resetWindow), Settings.FLOOD_WINDOW_S,
//             Settings.FLOOD_WINDOW_S, TimeUnit.SECONDS);

//         LOG.info("LINK-GUARD initialised");
//     }

//     public void close() {
//         if (packetReg != null) {
//             packetReg.close();
//         }
//         if (rpcReg != null) {
//             rpcReg.close();
//         }
//         if (handler != null) {
//             handler.setEnabled(false);
//         }
//         if (scheduler != null) {
//             scheduler.shutdownNow();
//         }
//         LOG.info("LINK-GUARD closed");
//     }

//     // ------------------------------------------------------------------ RPCs

//     private ListenableFuture<RpcResult<ToggleOutput>> toggle(final ToggleInput input) {
//         boolean on = Boolean.TRUE.equals(input.getEnabled());
//         handler.setEnabled(on);
//         flows.persistEnabled(on);
//         LOG.info("LINK-GUARD shield {}", on ? "ENABLED" : "DISABLED");
//         return Futures.immediateFuture(RpcResultBuilder.success(
//             new ToggleOutputBuilder().setStatus(on ? "enabled" : "disabled").build()).build());
//     }

//     private ListenableFuture<RpcResult<UnlockOutput>> unlock(final UnlockInput input) {
//         Endpoint port = Endpoint.parse(input.getDeviceId() + ":" + input.getPortNumber());
//         UnlockOutputBuilder out = new UnlockOutputBuilder();
//         if (port == null) {
//             out.setStatus("error").setMessage("Invalid device/port");
//         } else if (blocker.unlock(port)) {
//             out.setStatus("success").setMessage("Port " + port.key() + " restored (grace period active)");
//         } else {
//             out.setStatus("noop").setMessage("Port " + port.key() + " was not mitigated");
//         }
//         return Futures.immediateFuture(RpcResultBuilder.success(out.build()).build());
//     }

//     private ListenableFuture<RpcResult<ResetOutput>> reset(final ResetInput input) {
//         blocker.releaseAll();
//         verifier.reset();
//         classifier.reset();
//         store.clear();
//         flows.resetAll();
//         return Futures.immediateFuture(RpcResultBuilder.success(
//             new ResetOutputBuilder().setStatus("success").setMessage("LINK-GUARD state cleared").build()).build());
//     }

//     private static Runnable guard(final Runnable r) {
//         return () -> {
//             try {
//                 r.run();
//             } catch (RuntimeException e) {
//                 LOG.warn("LINK-GUARD periodic task failed", e);
//             }
//         };
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
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.opendaylight.mdsal.binding.api.DataBroker;
import org.opendaylight.mdsal.binding.api.NotificationService;
import org.opendaylight.mdsal.binding.api.RpcProviderService;
import org.opendaylight.mdsal.binding.api.RpcService;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.PacketReceived;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Reset;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetInput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetOutput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ResetOutputBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Toggle;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleInput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutputBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Unlock;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockInput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockOutput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.UnlockOutputBuilder;
import org.opendaylight.yangtools.concepts.Registration;
import org.opendaylight.yangtools.yang.common.RpcResultBuilder;
import org.opendaylight.yangtools.yang.common.RpcResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Top-level OSGi provider. Builds the component graph, registers the packet-in listener and the
 * toggle / unlock / reset RPCs, and schedules the periodic tasks (rolling re-verification sweep,
 * PLPC window reset).
 */
public class LinkGuardProvider {
    private static final Logger LOG = LoggerFactory.getLogger(LinkGuardProvider.class);

    private final DataBroker dataBroker;
    private final NotificationService notificationService;
    private final RpcProviderService rpcProviderService;
    private final RpcService rpcService;

    private ScheduledExecutorService scheduler;
    private Registration packetReg;
    private Registration rpcReg;

    private FlowManager flows;
    private AnomalyStore store;
    private PortClassifier classifier;
    private FloodDetector flood;
    private ProbeService probes;
    private PortBlocker blocker;
    private LinkVerifier verifier;
    private PacketHandler handler;

    public LinkGuardProvider(final DataBroker dataBroker, final NotificationService notificationService,
                             final RpcProviderService rpcProviderService, final RpcService rpcService) {
        this.dataBroker = dataBroker;
        this.notificationService = notificationService;
        this.rpcProviderService = rpcProviderService;
        this.rpcService = rpcService;
    }

    public void init() {
        scheduler = Executors.newScheduledThreadPool(4, r -> {
            Thread t = new Thread(r, "linkguard-worker");
            t.setDaemon(true);
            return t;
        });

        flows = new FlowManager(dataBroker, rpcService, scheduler);
        store = new AnomalyStore(flows);
        store.loadFromDisk();
        classifier = new PortClassifier();
        flood = new FloodDetector();
        probes = new ProbeService(flows, scheduler);
        verifier = new LinkVerifier(flows, probes, classifier, scheduler, () -> handler != null && handler.isEnabled());
        blocker = new PortBlocker(flows, store, classifier, flood, scheduler);
        blocker.setVerifier(verifier);
        verifier.setBlocker(blocker);
        handler = new PacketHandler(probes, verifier, blocker, classifier, flood, flows);

        // Restore the shield state persisted by the last toggle (linkguard-config survives restarts).
        flows.restoreEnabled(on -> {
            if (on) {
                handler.setEnabled(true);
                LOG.info("LINK-GUARD shield restored to ENABLED from persisted config");
            }
        });

        // Probes that come back with an unknown/expired transaction id = forgery or replay.
        probes.setOrphanHandler((port, detail) -> {
            store.record("PROBE_FORGERY", "HIGH", port.source(), detail,
                "Logged", "Unsolicited or replayed probe frame", "DETECTED");
            if (!blocker.isMitigated(port.key())) {
                blocker.stage1(port, "PROBE_FORGERY", detail, PortBlocker.STAGE1_ACTION);
            }
        });

        packetReg = notificationService.registerListener(PacketReceived.class, handler);
        rpcReg = rpcProviderService.registerRpcImplementations(
            (Toggle) this::toggle, (Unlock) this::unlock, (Reset) this::reset);

        scheduler.scheduleWithFixedDelay(guard(verifier::sweep), Settings.SWEEP_PERIOD_S,
            Settings.SWEEP_PERIOD_S, TimeUnit.SECONDS);
        scheduler.scheduleWithFixedDelay(guard(flood::resetWindow), Settings.FLOOD_WINDOW_S,
            Settings.FLOOD_WINDOW_S, TimeUnit.SECONDS);

        LOG.info("LINK-GUARD initialised");
    }

    public void close() {
        if (packetReg != null) {
            packetReg.close();
        }
        if (rpcReg != null) {
            rpcReg.close();
        }
        if (handler != null) {
            handler.setEnabled(false);
        }
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
        LOG.info("LINK-GUARD closed");
    }

    // ------------------------------------------------------------------ RPCs

    private ListenableFuture<RpcResult<ToggleOutput>> toggle(final ToggleInput input) {
        boolean on = Boolean.TRUE.equals(input.getEnabled());
        handler.setEnabled(on);
        flows.persistEnabled(on);
        LOG.info("LINK-GUARD shield {}", on ? "ENABLED" : "DISABLED");
        return Futures.immediateFuture(RpcResultBuilder.success(
            new ToggleOutputBuilder().setStatus(on ? "enabled" : "disabled").build()).build());
    }

    private ListenableFuture<RpcResult<UnlockOutput>> unlock(final UnlockInput input) {
        Endpoint port = Endpoint.parse(input.getDeviceId() + ":" + input.getPortNumber());
        UnlockOutputBuilder out = new UnlockOutputBuilder();
        if (port == null) {
            out.setStatus("error").setMessage("Invalid device/port");
        } else if (blocker.unlock(port)) {
            out.setStatus("success").setMessage("Port " + port.key() + " restored (grace period active)");
        } else {
            out.setStatus("noop").setMessage("Port " + port.key() + " was not mitigated");
        }
        return Futures.immediateFuture(RpcResultBuilder.success(out.build()).build());
    }

    private ListenableFuture<RpcResult<ResetOutput>> reset(final ResetInput input) {
        blocker.releaseAll();
        verifier.reset();
        classifier.reset();
        store.clear();
        flows.resetAll();
        return Futures.immediateFuture(RpcResultBuilder.success(
            new ResetOutputBuilder().setStatus("success").setMessage("LINK-GUARD state cleared").build()).build());
    }

    private static Runnable guard(final Runnable r) {
        return () -> {
            try {
                r.run();
            } catch (RuntimeException e) {
                LOG.warn("LINK-GUARD periodic task failed", e);
            }
        };
    }
}