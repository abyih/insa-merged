// package org.pntc.linkguard.impl;

// import java.math.BigDecimal;
// import java.time.format.DateTimeFormatter;
// import java.util.concurrent.ConcurrentHashMap;
// import java.util.concurrent.ScheduledExecutorService;
// import java.util.concurrent.TimeUnit;
// import org.opendaylight.mdsal.binding.api.DataBroker;
// import org.opendaylight.mdsal.binding.api.WriteTransaction;
// import org.opendaylight.mdsal.common.api.LogicalDatastoreType;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowCapableNode;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowId;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.Table;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.TableKey;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.Flow;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowKey;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.InstructionsBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.MatchBuilder;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeId;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.Nodes;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.Node;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.NodeKey;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.*;
// import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.*;
// import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
// import org.opendaylight.yangtools.yang.common.Decimal64;
// import org.opendaylight.yangtools.yang.common.Uint16;
// import org.opendaylight.yangtools.yang.common.Uint32;
// import org.opendaylight.yangtools.yang.common.Uint8;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;

// public class FlowManager {
//     private static final Logger LOG = LoggerFactory.getLogger(FlowManager.class);
//     private final DataBroker dataBroker;
//     private final ScheduledExecutorService scheduler;
    
//     private final ConcurrentHashMap<String, Integer> recoveryAttempts = new ConcurrentHashMap<>();
//     private final ConcurrentHashMap<String, Boolean> trustedPorts = new ConcurrentHashMap<>();

//     public FlowManager(DataBroker dataBroker, ScheduledExecutorService scheduler) {
//         this.dataBroker = dataBroker;
//         this.scheduler = scheduler;
//     }

//     public boolean isPortTrusted(String portId) {
//         return trustedPorts.getOrDefault(portId, true);
//     }

//     public void updateUiStatus(String nodeId, String portId, String status) {
//         LOG.info("LINK-GUARD: UI Status update for port {} -> {}", portId, status);
//     }

//     public void blockPort(String nodeId, String portId, String attackTypeStr) {
//         String portKey = nodeId + "-port-" + portId;
//         int attempts = recoveryAttempts.getOrDefault(portKey, 0) + 1;
//         recoveryAttempts.put(portKey, attempts);
//         trustedPorts.put(portKey, false);

//         AttackType attackType = AttackType.forName(attackTypeStr);
//         if (attackType == null) attackType = AttackType.INJECTION;

//         if (attempts > 3) {
//             LOG.error("LINK-GUARD: Port {} reached max recovery attempts (3). PERMANENT_LOCKOUT.", portKey);
//             installDropFlow(nodeId, portId);
//             logAnomaly(portKey, AttackType.forName("PERMANENT_LOCKOUT"), "CRITICAL", "Automated recovery loop exhausted.", nodeId, portId);
//             updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.UNTRUSTED, "Blocked");
//             return;
//         }

//         long backoffSeconds = 60L * (1L << (attempts - 1));
//         LOG.warn("LINK-GUARD: Blocking port {} (Attempt {}/3). Recovery in {}s", portKey, attempts, backoffSeconds);

//         installDropFlow(nodeId, portId);
//         logAnomaly(portKey, attackType, "CRITICAL", "Fabricated LLDP probe detected with forged signature.", nodeId, portId);
//         updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.RECOVERING, "AUTO-RECOVERING");

//         scheduler.schedule(() -> {
//             LOG.info("LINK-GUARD: Executing self-healing audit for port {}", portKey);
//             removeDropFlow(nodeId, portId);
//             trustedPorts.put(portKey, true);
//             updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.TRUSTED, "Active");
//         }, backoffSeconds, TimeUnit.SECONDS);
//     }

//     public void logAnomaly(String source, AttackType attackType, String severity, String details, String nodeId, String portId) {
//         String timeStr = DateTimeFormatter.ofPattern("M/d/yyyy, h:mm:ss a").format(java.time.ZonedDateTime.now());
        
//         DetectionLogs entry = new DetectionLogsBuilder()
//                 .withKey(new DetectionLogsKey(source))
//                 .setPortId(source)
//                 .setAttackType(attackType)
//                 .setSeverity(severity)
//                 .setDetails(details)
//                 .setSource(source)
//                 .setTimestamp(timeStr)
//                 .build();

//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
//                 .child(DetectionLogs.class, new DetectionLogsKey(source)).build().toIdentifier(), entry);
//         tx.commit();
//     }

//     public void updatePortStatus(String portKey, String switchId, long portNo, PortClassificationType classification, String status) {
//         String timeStr = DateTimeFormatter.ofPattern("h:mm:ss a").format(java.time.ZonedDateTime.now());
        
//         PortClassification entry = new PortClassificationBuilder()
//                 .withKey(new PortClassificationKey(portKey))
//                 .setPortId(portKey)
//                 .setSwitchId(switchId)
//                 .setPortNo(Uint32.valueOf(portNo))
//                 .setClassification(classification)
//                 .setStatus(status)
//                 .setLastUpdated(timeStr)
//                 .build();
        
//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
//                 .child(PortClassification.class, new PortClassificationKey(portKey)).build().toIdentifier(), entry);
//         tx.commit();
//     }

//     public void updateLatency(String linkId, double currentRtt, double baselineRtt, double threshold, String status) {
//         String timeStr = DateTimeFormatter.ofPattern("h:mm:ss a").format(java.time.ZonedDateTime.now());
        
//         LinkLatency entry = new LinkLatencyBuilder()
//                 .withKey(new LinkLatencyKey(linkId))
//                 .setLinkId(linkId)
//                 .setCurrentRtt(Decimal64.valueOf(BigDecimal.valueOf(currentRtt)))
//                 .setBaselineRtt(Decimal64.valueOf(BigDecimal.valueOf(baselineRtt)))
//                 .setThreshold(Decimal64.valueOf(BigDecimal.valueOf(threshold)))
//                 .setStatus(status)
//                 .setLastCheck(timeStr)
//                 .build();
        
//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
//                 .child(LinkLatency.class, new LinkLatencyKey(linkId)).build().toIdentifier(), entry);
//         tx.commit();
//     }

//     private void installDropFlow(String nodeId, String portId) {
//         FlowId flowId = new FlowId("lg-block-" + portId);
//         FlowKey flowKey = new FlowKey(flowId);
//         Uint8 table0 = Uint8.valueOf(0);

//         Flow blockFlow = new FlowBuilder()
//             .setFlowName("LinkGuardBlock")
//             .withKey(flowKey)
//             .setTableId(table0)
//             .setPriority(Uint16.valueOf(1000))
//             .setMatch(new MatchBuilder().build())
//             .setInstructions(new InstructionsBuilder().build())
//             .build();

//         InstanceIdentifier<Flow> flowPath = InstanceIdentifier.builder(Nodes.class)
//             .child(Node.class, new NodeKey(new NodeId(nodeId)))
//             .augmentation(FlowCapableNode.class)
//             .child(Table.class, new TableKey(table0))
//             .child(Flow.class, flowKey)
//             .build();

//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.put(LogicalDatastoreType.CONFIGURATION, flowPath.toIdentifier(), blockFlow);
//         tx.commit();
//     }

//     private void removeDropFlow(String nodeId, String portId) {
//         FlowId flowId = new FlowId("lg-block-" + portId);
//         FlowKey flowKey = new FlowKey(flowId);
//         Uint8 table0 = Uint8.valueOf(0);

//         InstanceIdentifier<Flow> flowPath = InstanceIdentifier.builder(Nodes.class)
//             .child(Node.class, new NodeKey(new NodeId(nodeId)))
//             .augmentation(FlowCapableNode.class)
//             .child(Table.class, new TableKey(table0))
//             .child(Flow.class, flowKey)
//             .build();

//         WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
//         tx.delete(LogicalDatastoreType.CONFIGURATION, flowPath.toIdentifier());
//         tx.commit();
//     }
// }

package org.pntc.linkguard.impl;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.opendaylight.mdsal.binding.api.DataBroker;
import org.opendaylight.mdsal.binding.api.WriteTransaction;
import org.opendaylight.mdsal.common.api.LogicalDatastoreType;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowCapableNode;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.FlowId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.Table;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.TableKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.Flow;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.inventory.rev130819.tables.table.FlowKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.InstructionsBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.flow.types.rev131026.flow.MatchBuilder;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.NodeId;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.Nodes;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.Node;
import org.opendaylight.yang.gen.v1.urn.opendaylight.inventory.rev130819.nodes.NodeKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.*;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.*;
import org.opendaylight.yangtools.yang.binding.InstanceIdentifier;
import org.opendaylight.yangtools.yang.common.Decimal64;
import org.opendaylight.yangtools.yang.common.Uint16;
import org.opendaylight.yangtools.yang.common.Uint32;
import org.opendaylight.yangtools.yang.common.Uint8;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FlowManager {
    private static final Logger LOG = LoggerFactory.getLogger(FlowManager.class);
    private final DataBroker dataBroker;
    private final ScheduledExecutorService scheduler;
    
    private final ConcurrentHashMap<String, Integer> recoveryAttempts = new ConcurrentHashMap<>();

    public FlowManager(DataBroker dataBroker, ScheduledExecutorService scheduler) {
        this.dataBroker = dataBroker;
        this.scheduler = scheduler;
    }

    public void updateUiStatus(String portKey, String classificationStr, String status) {
        PortClassificationType clazz = "TRUSTED".equals(classificationStr) ? PortClassificationType.TRUSTED : PortClassificationType.UNTRUSTED;
        String[] parts = portKey.split(":");
        updatePortStatus(portKey, parts[0], Long.parseLong(parts[1]), clazz, status);
    }

    public void blockPort(String nodeId, String portId, String attackTypeStr) {
        String portKey = nodeId + ":" + portId;
        int attempts = recoveryAttempts.getOrDefault(portKey, 0) + 1;
        recoveryAttempts.put(portKey, attempts);

        AttackType attackType = AttackType.forName(attackTypeStr);
        if (attackType == null) attackType = AttackType.INJECTION;

        if (attempts > 3) {
            LOG.error("LINK-GUARD: Port {} reached max recovery attempts (3). PERMANENT_LOCKOUT.", portKey);
            installDropFlow(nodeId, portId);
            logAnomaly(portKey, AttackType.forName("PERMANENT_LOCKOUT"), "CRITICAL", "Automated recovery loop exhausted.", nodeId, portId);
            updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.UNTRUSTED, "Blocked");
            return;
        }

        // Exponential Backoff: Attempt 1 = 60s, Attempt 2 = 120s, Attempt 3 = 240s
        long backoffSeconds = 60L * (1L << (attempts - 1));
        LOG.warn("LINK-GUARD: Blocking port {} (Attempt {}/3). Recovery in {}s", portKey, attempts, backoffSeconds);

        installDropFlow(nodeId, portId);
        logAnomaly(portKey, attackType, "CRITICAL", "Security violation detected. Threat mitigated.", nodeId, portId);
        updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.RECOVERING, "AUTO-RECOVERING");

        scheduler.schedule(() -> {
            LOG.info("LINK-GUARD: Executing self-healing audit for port {}", portKey);
            removeDropFlow(nodeId, portId);
            updatePortStatus(portKey, nodeId, Long.parseLong(portId), PortClassificationType.TRUSTED, "Active");
        }, backoffSeconds, TimeUnit.SECONDS);
    }

    public void logAnomaly(String source, AttackType attackType, String severity, String details, String nodeId, String portId) {
        String timeStr = DateTimeFormatter.ofPattern("M/d/yyyy, h:mm:ss a").format(java.time.ZonedDateTime.now());
        String anomalyId = String.valueOf(System.currentTimeMillis());
        
        DetectionLogs entry = new DetectionLogsBuilder()
                .withKey(new DetectionLogsKey(anomalyId))
                .setPortId(anomalyId) // using timestamp as unique ID for the UI list
                .setAttackType(attackType)
                .setSeverity(severity)
                .setDetails(details)
                .setSource(source)
                .setTimestamp(timeStr)
                .build();

        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
                .child(DetectionLogs.class, new DetectionLogsKey(anomalyId)).build().toIdentifier(), entry);
        tx.commit();
    }

    public void updatePortStatus(String portKey, String switchId, long portNo, PortClassificationType classification, String status) {
        String timeStr = DateTimeFormatter.ofPattern("h:mm:ss a").format(java.time.ZonedDateTime.now());
        // Map portKey from "openflow:1:1" to "openflow:1-port-1" for the UI formatting
        String uiPortKey = switchId + "-port-" + portNo;
        
        PortClassification entry = new PortClassificationBuilder()
                .withKey(new PortClassificationKey(uiPortKey))
                .setPortId(uiPortKey)
                .setSwitchId(switchId)
                .setPortNo(Uint32.valueOf(portNo))
                .setClassification(classification)
                .setStatus(status)
                .setLastUpdated(timeStr)
                .build();
        
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
                .child(PortClassification.class, new PortClassificationKey(uiPortKey)).build().toIdentifier(), entry);
        tx.commit();
    }

    public void updateLatency(String linkId, double currentRtt, double baselineRtt, double threshold, String status) {
        String timeStr = DateTimeFormatter.ofPattern("h:mm:ss a").format(java.time.ZonedDateTime.now());
        
        LinkLatency entry = new LinkLatencyBuilder()
                .withKey(new LinkLatencyKey(linkId))
                .setLinkId(linkId)
                .setCurrentRtt(Decimal64.valueOf(BigDecimal.valueOf(currentRtt)))
                .setBaselineRtt(Decimal64.valueOf(BigDecimal.valueOf(baselineRtt)))
                .setThreshold(Decimal64.valueOf(BigDecimal.valueOf(threshold)))
                .setStatus(status)
                .setLastCheck(timeStr)
                .build();
        
        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.OPERATIONAL, InstanceIdentifier.builder(LinkguardStatus.class)
                .child(LinkLatency.class, new LinkLatencyKey(linkId)).build().toIdentifier(), entry);
        tx.commit();
    }

    private void installDropFlow(String nodeId, String portId) {
        FlowId flowId = new FlowId("lg-block-" + portId);
        FlowKey flowKey = new FlowKey(flowId);
        Uint8 table0 = Uint8.valueOf(0);

        Flow blockFlow = new FlowBuilder()
            .setFlowName("LinkGuardBlock")
            .withKey(flowKey)
            .setTableId(table0)
            .setPriority(Uint16.valueOf(1000))
            .setMatch(new MatchBuilder().build())
            .setInstructions(new InstructionsBuilder().build())
            .build();

        InstanceIdentifier<Flow> flowPath = InstanceIdentifier.builder(Nodes.class)
            .child(Node.class, new NodeKey(new NodeId(nodeId)))
            .augmentation(FlowCapableNode.class)
            .child(Table.class, new TableKey(table0))
            .child(Flow.class, flowKey)
            .build();

        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.put(LogicalDatastoreType.CONFIGURATION, flowPath.toIdentifier(), blockFlow);
        tx.commit();
    }

    private void removeDropFlow(String nodeId, String portId) {
        FlowId flowId = new FlowId("lg-block-" + portId);
        FlowKey flowKey = new FlowKey(flowId);
        Uint8 table0 = Uint8.valueOf(0);

        InstanceIdentifier<Flow> flowPath = InstanceIdentifier.builder(Nodes.class)
            .child(Node.class, new NodeKey(new NodeId(nodeId)))
            .augmentation(FlowCapableNode.class)
            .child(Table.class, new TableKey(table0))
            .child(Flow.class, flowKey)
            .build();

        WriteTransaction tx = dataBroker.newWriteOnlyTransaction();
        tx.delete(LogicalDatastoreType.CONFIGURATION, flowPath.toIdentifier());
        tx.commit();
    }
}