/*
 * Copyright © 2026 PNTC and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */
package org.pntc.linkguard.impl;

import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.MoreExecutors;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;
import org.opendaylight.mdsal.binding.api.DataBroker;
import org.opendaylight.mdsal.binding.api.RpcService;
import org.opendaylight.mdsal.binding.api.WriteTransaction;
import org.opendaylight.mdsal.common.api.CommitInfo;
import org.opendaylight.mdsal.common.api.LogicalDatastoreType;
import org.opendaylight.yang.gen.v1.urn.ietf.params.xml.ns.yang.ietf.inet.types.rev130715.Ipv4Prefix;
import org.opendaylight.yang.gen.v1.urn.ietf.params.xml.ns.yang.ietf.inet.types.rev130715.Uri;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.DecNwTtlCaseBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.DropActionCaseBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.GroupActionCaseBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.OutputActionCaseBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.dec.nw.ttl._case.DecNwTtlBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.drop.action._case.DropActionBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.group.action._case.GroupActionBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.action.output.action._case.OutputActionBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.list.Action;
import org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.list.ActionBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowCapableNode;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.Table;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.TableKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.Flow;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.FlowCookie;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.FlowModFlags;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.InstructionsBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.Match;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.MatchBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.instruction.instruction.ApplyActionsCaseBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.instruction.instruction.apply.actions._case.ApplyActionsBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.instruction.list.Instruction;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.instruction.list.InstructionBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.BucketId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.GroupId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.GroupTypes;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.group.BucketsBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.group.buckets.Bucket;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.group.buckets.BucketBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.groups.Group;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.groups.GroupBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.group.types.rev131018.groups.GroupKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeConnectorId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeConnectorRef;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeRef;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.Nodes;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.node.NodeConnector;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.node.NodeConnectorKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.Node;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.NodeKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.l2.types.rev130827.EtherType;
import org.opendaylight.yang.gen.v1.urn.opendaylight.model.match.types.rev131026.ethernet.match.fields.EthernetTypeBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.model.match.types.rev131026.match.EthernetMatch;
import org.opendaylight.yang.gen.v1.urn.opendaylight.model.match.types.rev131026.match.EthernetMatchBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.model.match.types.rev131026.match.IpMatchBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.model.match.types.rev131026.match.layer._3.match.Ipv4MatchBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacket;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacketInput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacketInputBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.packet.service.rev130709.TransmitPacketOutput;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardConfig;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardConfigBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardStatus;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.Anomaly;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.AnomalyBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.AnomalyKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatencyBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatencyKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassificationBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassificationKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPort;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPortBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPortKey;
import org.opendaylight.yangtools.binding.DataObject;
import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
import org.opendaylight.yangtools.yang.common.RpcResult;
import org.opendaylight.yangtools.yang.common.Uint16;
import org.opendaylight.yangtools.yang.common.Uint32;
import org.opendaylight.yangtools.yang.common.Uint64;
import org.opendaylight.yangtools.yang.common.Uint8;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The only class that talks to MD-SAL / the OpenFlow plugin.
 *
 * <p>Stage 1 = high-priority drop of LLDP (0x88cc) and BDDP (0x8999) on one ingress port.
 * Stage 2 = drop of ALL ingress traffic on the port. (ODL's FRM has no stable "port admin down"
 * API, so the hard block is implemented as an in_port drop-all flow.)
 * Probe plumbing = one ALL group per switch (bucket 1: copy to controller, bucket 2: dec TTL +
 * output IN_PORT) referenced by a per-port flow that matches only our signed ICMP probes.
 */
final class FlowManager {
    private static final Logger LOG = LoggerFactory.getLogger(FlowManager.class);
    private static final Uint32 ANY = Uint32.valueOf(0xFFFFFFFFL);
    private static final int ETH_LLDP = 0x88cc;
    private static final int ETH_BDDP = 0x8999;
    private static final int ETH_IPV4 = 0x0800;

    private final DataBroker dataBroker;
    private final RpcService rpcService;
    private final ScheduledExecutorService scheduler;
    private final Set<String> groupNodes = ConcurrentHashMap.newKeySet();
    private final Set<Endpoint> probePorts = ConcurrentHashMap.newKeySet();

    FlowManager(DataBroker dataBroker, RpcService rpcService, ScheduledExecutorService scheduler) {
        this.dataBroker = dataBroker;
        this.rpcService = rpcService;
        this.scheduler = scheduler;
    }

    // =====================================================================================
    //  Mitigation flows
    // =====================================================================================

    void installLldpDrop(Endpoint p) {
        put(flowIid(p.node(), "lg-lldp-" + p.port()),
            flow("lg-lldp-" + p.port(), Settings.PRIO_LLDP_DROP, ethMatch(p, ETH_LLDP), dropInstruction()),
            "LLDP drop " + p);
        put(flowIid(p.node(), "lg-bddp-" + p.port()),
            flow("lg-bddp-" + p.port(), Settings.PRIO_LLDP_DROP, ethMatch(p, ETH_BDDP), dropInstruction()),
            "BDDP drop " + p);
    }

    void removeLldpDrop(Endpoint p) {
        delete(LogicalDatastoreType.CONFIGURATION, flowIid(p.node(), "lg-lldp-" + p.port()), "LLDP drop " + p);
        delete(LogicalDatastoreType.CONFIGURATION, flowIid(p.node(), "lg-bddp-" + p.port()), "BDDP drop " + p);
    }

    void installHardBlock(Endpoint p) {
        Match m = new MatchBuilder().setInPort(new NodeConnectorId(p.key())).build();
        put(flowIid(p.node(), "lg-hard-" + p.port()),
            flow("lg-hard-" + p.port(), Settings.PRIO_HARD_BLOCK, m, dropInstruction()), "hard block " + p);
    }

    void removeHardBlock(Endpoint p) {
        delete(LogicalDatastoreType.CONFIGURATION, flowIid(p.node(), "lg-hard-" + p.port()), "hard block " + p);
    }

    // =====================================================================================
    //  Probe plumbing + packet-out
    // =====================================================================================

    /** Idempotent: group on the switch first, then the per-port probe flow after a short delay. */
    void installProbePlumbing(Endpoint p) {
        if (!probePorts.add(p)) {
            return;
        }
        if (groupNodes.add(p.node())) {
            put(groupIid(p.node()), probeGroup(), "probe group on " + p.node());
        }
        scheduler.schedule(() -> put(flowIid(p.node(), "lg-probe-" + p.port()), probeFlow(p), "probe flow " + p),
            1500, TimeUnit.MILLISECONDS);
    }

    /** Injects a raw Ethernet frame out of the given switch port through the OpenFlow plugin. */
    void transmit(Endpoint egress, byte[] payload, Consumer<String> onFailure) {
        try {
            TransmitPacket rpc = rpcService.getRpc(TransmitPacket.class);
            InstanceIdentifier<Node> node = nodeIid(egress.node());
            InstanceIdentifier<NodeConnector> nc = node.child(NodeConnector.class,
                new NodeConnectorKey(new NodeConnectorId(egress.key())));
            TransmitPacketInput in = new TransmitPacketInputBuilder()
                .setPayload(payload)
                .setNode(new NodeRef(node.toIdentifier()))
                .setEgress(new NodeConnectorRef(nc.toIdentifier()))
                .build();
            Futures.addCallback(rpc.invoke(in), new FutureCallback<RpcResult<TransmitPacketOutput>>() {
                @Override
                public void onSuccess(RpcResult<TransmitPacketOutput> result) {
                    if (!result.isSuccessful()) {
                        onFailure.accept("TransmitPacket rejected: " + result.getErrors());
                    }
                }

                @Override
                public void onFailure(Throwable t) {
                    onFailure.accept("TransmitPacket failed: " + t);
                }
            }, MoreExecutors.directExecutor());
        } catch (RuntimeException e) {
            onFailure.accept("TransmitPacket RPC unavailable (is odl-openflowplugin-southbound installed?): " + e);
        }
    }

    // =====================================================================================
    //  Operational datastore (dashboard / RESTCONF)
    // =====================================================================================

    /** Persists the shield on/off state in linkguard-config so the dashboard backend can read it. */
    void persistEnabled(boolean on) {
        put(InstanceIdentifier.create(LinkguardConfig.class),
            new LinkguardConfigBuilder().setEnabled(on).build(), "config enabled=" + on);
    }

    /** Reads the persisted shield state (survives Karaf restarts) and hands it to the callback. */
    void restoreEnabled(Consumer<Boolean> callback) {
        var tx = dataBroker.newReadOnlyTransaction();
        tx.read(LogicalDatastoreType.CONFIGURATION, InstanceIdentifier.create(LinkguardConfig.class).toIdentifier())
            .addCallback(new FutureCallback<Optional<LinkguardConfig>>() {
                @Override
                public void onSuccess(Optional<LinkguardConfig> result) {
                    tx.close();
                    callback.accept(result.isPresent() && Boolean.TRUE.equals(result.orElseThrow().getEnabled()));
                }

                @Override
                public void onFailure(Throwable t) {
                    tx.close();
                    LOG.warn("LINK-GUARD: could not read persisted shield state", t);
                }
            }, MoreExecutors.directExecutor());
    }

    void writeAnomaly(AnomalyStore.Entry a) {
        Anomaly e = new AnomalyBuilder().withKey(new AnomalyKey(a.id())).setId(a.id())
            .setAttackType(a.attackType()).setSeverity(a.severity()).setSource(a.source())
            .setDetails(a.details()).setMitigationAction(a.action()).setMitigationReason(a.reason())
            .setMitigationState(a.state()).setDetectedAt(a.detectedAt()).build();
        merge(InstanceIdentifier.builder(LinkguardStatus.class).child(Anomaly.class, new AnomalyKey(a.id())).build(),
            e, "anomaly " + a.id());
    }

    void deleteAnomaly(String id) {
        delete(LogicalDatastoreType.OPERATIONAL,
            InstanceIdentifier.builder(LinkguardStatus.class).child(Anomaly.class, new AnomalyKey(id)).build(),
            "anomaly " + id);
    }

    void writePort(Endpoint p, String classification, String status) {
        PortClassification e = new PortClassificationBuilder().withKey(new PortClassificationKey(p.key()))
            .setPortId(p.key()).setSwitchId(p.node()).setPortNo(p.port()).setClassification(classification)
            .setStatus(status).setLastUpdated(Instant.now().toString()).build();
        merge(InstanceIdentifier.builder(LinkguardStatus.class)
            .child(PortClassification.class, new PortClassificationKey(p.key())).build(), e, "port " + p);
    }

    void writeLatency(String linkId, long currentUs, long baselineUs, long thresholdUs, String status) {
        LinkLatency e = new LinkLatencyBuilder().withKey(new LinkLatencyKey(linkId)).setLinkId(linkId)
            .setCurrentRttUs(Uint64.valueOf(Math.max(0, currentUs)))
            .setBaselineRttUs(Uint64.valueOf(Math.max(0, baselineUs)))
            .setThresholdUs(Uint64.valueOf(Math.max(0, thresholdUs)))
            .setDeviationUs(currentUs - baselineUs).setStatus(status)
            .setLastCheck(Instant.now().toString()).build();
        merge(InstanceIdentifier.builder(LinkguardStatus.class).child(LinkLatency.class, new LinkLatencyKey(linkId))
            .build(), e, "latency " + linkId);
    }

    void writeQuarantine(Endpoint p, int attempts, String state, String nextAttemptAt) {
        QuarantinedPort e = new QuarantinedPortBuilder().withKey(new QuarantinedPortKey(p.key()))
            .setPortId(p.key()).setAttempts(Uint16.valueOf(attempts)).setState(state)
            .setNextAttemptAt(nextAttemptAt).build();
        merge(InstanceIdentifier.builder(LinkguardStatus.class)
            .child(QuarantinedPort.class, new QuarantinedPortKey(p.key())).build(), e, "quarantine " + p);
    }

    void deleteQuarantine(Endpoint p) {
        delete(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
            .child(QuarantinedPort.class, new QuarantinedPortKey(p.key())).build(), "quarantine " + p);
    }

    /** Wipes the status tree and every probe flow/group we installed. */
    void resetAll() {
        for (Endpoint p : probePorts) {
            delete(LogicalDatastoreType.CONFIGURATION, flowIid(p.node(), "lg-probe-" + p.port()), "probe flow " + p);
        }
        for (String n : groupNodes) {
            delete(LogicalDatastoreType.CONFIGURATION, groupIid(n), "probe group " + n);
        }
        probePorts.clear();
        groupNodes.clear();
        delete(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.create(LinkguardStatus.class), "status tree");
    }

    // =====================================================================================
    //  Builders
    // =====================================================================================

    private static InstanceIdentifier<Node> nodeIid(String nodeId) {
        return InstanceIdentifier.builder(Nodes.class).child(Node.class, new NodeKey(new NodeId(nodeId))).build();
    }

    private static InstanceIdentifier<Flow> flowIid(String nodeId, String flowId) {
        return InstanceIdentifier.builder(Nodes.class).child(Node.class, new NodeKey(new NodeId(nodeId)))
            .augmentation(FlowCapableNode.class).child(Table.class, new TableKey(Uint8.ZERO))
            .child(Flow.class, new FlowKey(new FlowId(flowId))).build();
    }

    private static InstanceIdentifier<Group> groupIid(String nodeId) {
        return InstanceIdentifier.builder(Nodes.class).child(Node.class, new NodeKey(new NodeId(nodeId)))
            .augmentation(FlowCapableNode.class)
            .child(Group.class, new GroupKey(new GroupId(Uint32.valueOf(Settings.GROUP_ID)))).build();
    }

    private static EthernetMatch ethType(int type) {
        return new EthernetMatchBuilder()
            .setEthernetType(new EthernetTypeBuilder().setType(new EtherType(Uint32.valueOf(type))).build())
            .build();
    }

    private static Match ethMatch(Endpoint p, int type) {
        return new MatchBuilder().setInPort(new NodeConnectorId(p.key())).setEthernetMatch(ethType(type)).build();
    }

    /** Ordered map keyed by each list entry's own key (avoids a class whose package moved between releases). */
    @SafeVarargs
    private static <K, V> Map<K, V> keyed(Function<V, K> key, V... values) {
        Map<K, V> map = new LinkedHashMap<>();
        for (V v : values) {
            map.put(key.apply(v), v);
        }
        return map;
    }

    private static Flow flow(String id, int priority, Match match, Instruction instruction) {
        return new FlowBuilder().withKey(new FlowKey(new FlowId(id))).setId(new FlowId(id)).setFlowName(id)
            .setTableId(Uint8.ZERO).setPriority(Uint16.valueOf(priority)).setMatch(match)
            .setInstructions(new InstructionsBuilder().setInstruction(keyed(Instruction::key, instruction)).build())
            .setIdleTimeout(Uint16.ZERO).setHardTimeout(Uint16.ZERO)
            .setCookie(new FlowCookie(Uint64.valueOf(Settings.GROUP_ID)))
            .setBarrier(false).setFlags(new FlowModFlags(false, false, false, false, false)).build();
    }

    private static Action act(int order, org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.Action choice) {
        return new ActionBuilder().setOrder(order).setAction(choice).build();
    }

    private static Instruction apply(Action... actions) {
        return new InstructionBuilder().setOrder(0)
            .setInstruction(new ApplyActionsCaseBuilder()
                .setApplyActions(new ApplyActionsBuilder().setAction(keyed(Action::key, actions)).build()).build())
            .build();
    }

    private static Instruction dropInstruction() {
        return apply(act(0, new DropActionCaseBuilder().setDropAction(new DropActionBuilder().build()).build()));
    }

    private static org.opendaylight.yang.gen.v1.urn.opendaylight.action.types.rev131112.action.Action output(String port) {
        return new OutputActionCaseBuilder().setOutputAction(new OutputActionBuilder()
            .setOutputNodeConnector(new Uri(port)).setMaxLength(Uint16.MAX_VALUE).build()).build();
    }

    private static Group probeGroup() {
        Bucket toController = new BucketBuilder().setBucketId(new BucketId(Uint32.ZERO)).setWeight(Uint16.ZERO)
            .setWatchPort(ANY).setWatchGroup(ANY)
            .setAction(keyed(Action::key, act(0, output("CONTROLLER")))).build();
        Bucket bounce = new BucketBuilder().setBucketId(new BucketId(Uint32.ONE)).setWeight(Uint16.ZERO)
            .setWatchPort(ANY).setWatchGroup(ANY)
            .setAction(keyed(Action::key,
                act(0, new DecNwTtlCaseBuilder().setDecNwTtl(new DecNwTtlBuilder().build()).build()),
                act(1, output("INPORT")))).build();
        GroupId gid = new GroupId(Uint32.valueOf(Settings.GROUP_ID));
        return new GroupBuilder().withKey(new GroupKey(gid)).setGroupId(gid).setGroupName("linkguard-probe")
            .setGroupType(GroupTypes.GroupAll).setBarrier(false)
            .setBuckets(new BucketsBuilder().setBucket(keyed(Bucket::key, toController, bounce)).build()).build();
    }

    private static Flow probeFlow(Endpoint p) {
        Match m = new MatchBuilder().setInPort(new NodeConnectorId(p.key())).setEthernetMatch(ethType(ETH_IPV4))
            .setIpMatch(new IpMatchBuilder().setIpProtocol(Uint8.ONE).build())
            .setLayer3Match(new Ipv4MatchBuilder()
                .setIpv4Source(new Ipv4Prefix(Settings.PROBE_SRC_IP_STR + "/32")).build())
            .build();
        Instruction toGroup = apply(act(0, new GroupActionCaseBuilder().setGroupAction(new GroupActionBuilder()
            .setGroupId(Uint32.valueOf(Settings.GROUP_ID)).setGroup("linkguard-probe").build()).build()));
        return flow("lg-probe-" + p.port(), Settings.PRIO_PROBE, m, toGroup);
    }

    // =====================================================================================
    //  Transaction helpers
    // =====================================================================================

    private <T extends DataObject> void merge(InstanceIdentifier<T> path, T data, String what) {
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.merge(LogicalDatastoreType.OPERATIONAL, path.toIdentifier(), data);
        commit(tx, what);
    }

    private <T extends DataObject> void put(InstanceIdentifier<T> path, T data, String what) {
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.CONFIGURATION, path.toIdentifier(), data);
        commit(tx, what);
    }

    private void delete(LogicalDatastoreType store, InstanceIdentifier<?> path, String what) {
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.delete(store, path.toIdentifier());
        commit(tx, "delete " + what);
    }

    private void commit(WriteTransaction tx, String what) {
        tx.commit().addCallback(new FutureCallback<CommitInfo>() {
    
              @Override
            public void onSuccess(CommitInfo result) {
                LOG.debug("LINK-GUARD: committed {}", what);
            }

            @Override
            public void onFailure(Throwable t) {
                LOG.error("LINK-GUARD: failed to commit {}", what, t);
            }
        }, MoreExecutors.directExecutor());
    }
}