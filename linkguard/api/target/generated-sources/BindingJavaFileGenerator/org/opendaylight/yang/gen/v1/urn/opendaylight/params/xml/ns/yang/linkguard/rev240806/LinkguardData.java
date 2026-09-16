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
 *   typedef attack-type {
 *     type enumeration {
 *       enum TOPOLOGY_POISONING;
 *       enum SIGNATURE_FORGERY;
 *       enum FLOODING;
 *       enum PERMANENT_LOCKOUT;
 *       enum MANUAL_ROLLBACK;
 *       enum INJECTION;
 *       enum RELAY;
 *     }
 *   }
 *   typedef port-classification-type {
 *     type enumeration {
 *       enum TRUSTED;
 *       enum UNTRUSTED;
 *       enum SWITCH_FACING;
 *       enum HOST_FACING;
 *       enum RECOVERING;
 *     }
 *   }
 *   container linkguard-config {
 *     leaf enabled {
 *       type boolean;
 *       default false;
 *     }
 *   }
 *   container linkguard-status {
 *     config false;
 *     list detection-logs {
 *       key port-id;
 *       leaf port-id {
 *         type string;
 *       }
 *       leaf attack-type {
 *         type attack-type;
 *       }
 *       leaf severity {
 *         type string;
 *       }
 *       leaf details {
 *         type string;
 *       }
 *       leaf source {
 *         type string;
 *       }
 *       leaf timestamp {
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
 *         type uint32;
 *       }
 *       leaf classification {
 *         type port-classification-type;
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
 *       leaf current-rtt {
 *         type decimal64 {
 *           fraction-digits 2;
 *         }
 *       }
 *       leaf baseline-rtt {
 *         type decimal64 {
 *           fraction-digits 2;
 *         }
 *       }
 *       leaf threshold {
 *         type decimal64 {
 *           fraction-digits 2;
 *         }
 *       }
 *       leaf status {
 *         type string;
 *       }
 *       leaf last-check {
 *         type string;
 *       }
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

