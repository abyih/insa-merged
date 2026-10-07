package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
import java.lang.Class;
import java.lang.Override;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.opendaylight.yangtools.binding.DataRoot;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * module linkguard {
 *   yang-version 1.1;
 *   namespace urn:opendaylight:params:xml:ns:yang:linkguard;
 *   prefix linkguard;
 *   revision 2024-08-06 {
 *   }
 *   container linkguard-config {
 *     leaf enabled {
 *       type boolean;
 *       default false;
 *     }
 *   }
 *   rpc toggle {
 *     input input {
 *       leaf enabled {
 *         type boolean;
 *       }
 *     }
 *     output output {
 *       leaf status {
 *         type string;
 *       }
 *     }
 *   }
 *   rpc unlock {
 *     input input {
 *       leaf device-id {
 *         type string;
 *       }
 *       leaf port-number {
 *         type uint32;
 *       }
 *     }
 *     output output {
 *       leaf status {
 *         type string;
 *       }
 *       leaf message {
 *         type string;
 *       }
 *     }
 *   }
 *   rpc reset {
 *     output output {
 *       leaf status {
 *         type string;
 *       }
 *       leaf message {
 *         type string;
 *       }
 *     }
 *   }
 *   container linkguard-status {
 *     config false;
 *     list anomaly {
 *       key id;
 *       leaf id {
 *         type string;
 *       }
 *       leaf attack-type {
 *         type string;
 *       }
 *       leaf severity {
 *         type string;
 *       }
 *       leaf source {
 *         type string;
 *       }
 *       leaf details {
 *         type string;
 *       }
 *       leaf mitigation-action {
 *         type string;
 *       }
 *       leaf mitigation-reason {
 *         type string;
 *       }
 *       leaf mitigation-state {
 *         type string;
 *       }
 *       leaf detected-at {
 *         type string;
 *       }
 *     }
 *     list port-classification {
 *       key port-id;
 *       leaf port-id {
 *         type string;
 *       }
 *       leaf switch-id {
 *         type string;
 *       }
 *       leaf port-no {
 *         type string;
 *       }
 *       leaf classification {
 *         type string;
 *       }
 *       leaf status {
 *         type string;
 *       }
 *       leaf last-updated {
 *         type string;
 *       }
 *     }
 *     list link-latency {
 *       key link-id;
 *       leaf link-id {
 *         type string;
 *       }
 *       leaf current-rtt-us {
 *         type uint64;
 *       }
 *       leaf baseline-rtt-us {
 *         type uint64;
 *       }
 *       leaf threshold-us {
 *         type uint64;
 *       }
 *       leaf deviation-us {
 *         type int64;
 *       }
 *       leaf status {
 *         type string;
 *       }
 *       leaf last-check {
 *         type string;
 *       }
 *     }
 *     list quarantined-port {
 *       key port-id;
 *       leaf port-id {
 *         type string;
 *       }
 *       leaf attempts {
 *         type uint16;
 *       }
 *       leaf state {
 *         type string;
 *       }
 *       leaf next-attempt-at {
 *         type string;
 *       }
 *     }
 *   }
 * }
 * </pre>
 *
 */
@Generated("mdsal-binding-generator")
public interface LinkguardData
    extends
    DataRoot<LinkguardData>
{




    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardData> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardData.class;
    }
    
    /**
     * Return linkguardConfig, or {@code null} if it is not present.
     *
     * @return {@code LinkguardConfig} linkguardConfig, or {@code null} if it is not present.
     *
     */
    LinkguardConfig getLinkguardConfig();
    
    /**
     * Return linkguardConfig, or an empty instance if it is not present.
     *
     * @return {@code LinkguardConfig} linkguardConfig, or an empty instance if it is not present.
     *
     */
    @NonNull LinkguardConfig nonnullLinkguardConfig();
    
    /**
     * Return linkguardStatus, or {@code null} if it is not present.
     *
     * @return {@code LinkguardStatus} linkguardStatus, or {@code null} if it is not present.
     *
     */
    LinkguardStatus getLinkguardStatus();
    
    /**
     * Return linkguardStatus, or an empty instance if it is not present.
     *
     * @return {@code LinkguardStatus} linkguardStatus, or an empty instance if it is not present.
     *
     */
    @NonNull LinkguardStatus nonnullLinkguardStatus();

}

