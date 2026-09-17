package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
import com.google.common.base.MoreObjects;
import java.lang.Class;
import java.lang.NullPointerException;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.util.Map;
import java.util.Objects;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.eclipse.jdt.annotation.Nullable;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogs;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogsKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatencyKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassificationKey;
import org.opendaylight.yang.svc.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.YangModuleInfoImpl;
import org.opendaylight.yangtools.binding.Augmentable;
import org.opendaylight.yangtools.binding.ChildOf;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;
import org.opendaylight.yangtools.yang.common.QName;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * container linkguard-status {
 *   config false;
 *   list detection-logs {
 *     key port-id;
 *     leaf port-id {
 *       type string;
 *     }
 *     leaf attack-type {
 *       type attack-type;
 *     }
 *     leaf severity {
 *       type string;
 *     }
 *     leaf details {
 *       type string;
 *     }
 *     leaf source {
 *       type string;
 *     }
 *     leaf timestamp {
 *       type string;
 *     }
 *   }
 *   list port-classification {
 *     key port-id;
 *     leaf port-id {
 *       type string;
 *     }
 *     leaf switch-id {
 *       type string;
 *     }
 *     leaf port-no {
 *       type uint32;
 *     }
 *     leaf classification {
 *       type port-classification-type;
 *     }
 *     leaf status {
 *       type string;
 *     }
 *     leaf last-updated {
 *       type string;
 *     }
 *   }
 *   list link-latency {
 *     key link-id;
 *     leaf link-id {
 *       type string;
 *     }
 *     leaf current-rtt {
 *       type decimal64 {
 *         fraction-digits 2;
 *       }
 *     }
 *     leaf baseline-rtt {
 *       type decimal64 {
 *         fraction-digits 2;
 *       }
 *     }
 *     leaf threshold {
 *       type decimal64 {
 *         fraction-digits 2;
 *       }
 *     }
 *     leaf status {
 *       type string;
 *     }
 *     leaf last-check {
 *       type string;
 *     }
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link LinkguardStatusBuilder}.
 * @see LinkguardStatusBuilder
 *
 */
@Generated("mdsal-binding-generator")
public interface LinkguardStatus
    extends
    ChildOf<LinkguardData>,
    Augmentable<LinkguardStatus>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("linkguard-status");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardStatus> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardStatus.class;
    }
    
    /**
     * Default implementation of {@link Object#hashCode()} contract for this interface.
     * Implementations of this interface are encouraged to defer to this method to get consistent hashing
     * results across all implementations.
     *
     * @param obj Object for which to generate hashCode() result.
     * @return Hash code value of data modeled by this interface.
     * @throws NullPointerException if {@code obj} is {@code null}
     */
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull LinkguardStatus obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getDetectionLogs());
        result = prime * result + Objects.hashCode(obj.getLinkLatency());
        result = prime * result + Objects.hashCode(obj.getPortClassification());
        for (var augmentation : obj.augmentations().values()) {
            result += augmentation.hashCode();
        }
        return result;
    }
    
    /**
     * Default implementation of {@link Object#equals(Object)} contract for this interface.
     * Implementations of this interface are encouraged to defer to this method to get consistent equality
     * results across all implementations.
     *
     * @param thisObj Object acting as the receiver of equals invocation
     * @param obj Object acting as argument to equals invocation
     * @return True if thisObj and obj are considered equal
     * @throws NullPointerException if {@code thisObj} is {@code null}
     */
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull LinkguardStatus thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardStatus.class, obj);
        return other != null
            && Objects.equals(thisObj.getDetectionLogs(), other.getDetectionLogs())
            && Objects.equals(thisObj.getLinkLatency(), other.getLinkLatency())
            && Objects.equals(thisObj.getPortClassification(), other.getPortClassification())
            && thisObj.augmentations().equals(other.augmentations());
    }
    
    /**
     * Default implementation of {@link Object#toString()} contract for this interface.
     * Implementations of this interface are encouraged to defer to this method to get consistent string
     * representations across all implementations.
     *
     * @param obj Object for which to generate toString() result.
     * @return {@link String} value of data modeled by this interface.
     * @throws NullPointerException if {@code obj} is {@code null}
     */
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull LinkguardStatus obj) {
        final var helper = MoreObjects.toStringHelper("LinkguardStatus");
        CodeHelpers.appendValue(helper, "detectionLogs", obj.getDetectionLogs());
        CodeHelpers.appendValue(helper, "linkLatency", obj.getLinkLatency());
        CodeHelpers.appendValue(helper, "portClassification", obj.getPortClassification());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    /**
     * Return detectionLogs, or {@code null} if it is not present.
     *
     * @return {@code Map<DetectionLogsKey, DetectionLogs>} detectionLogs, or {@code null} if it is not present.
     *
     */
    @Nullable Map<DetectionLogsKey, DetectionLogs> getDetectionLogs();
    
    /**
     * Return detectionLogs, or an empty list if it is not present.
     *
     * @return {@code Map<DetectionLogsKey, DetectionLogs>} detectionLogs, or an empty list if it is not present.
     *
     */
    default @NonNull Map<DetectionLogsKey, DetectionLogs> nonnullDetectionLogs() {
        return CodeHelpers.nonnull(getDetectionLogs());
    }
    
    /**
     * Return portClassification, or {@code null} if it is not present.
     *
     * @return {@code Map<PortClassificationKey, PortClassification>} portClassification, or {@code null} if it is not present.
     *
     */
    @Nullable Map<PortClassificationKey, PortClassification> getPortClassification();
    
    /**
     * Return portClassification, or an empty list if it is not present.
     *
     * @return {@code Map<PortClassificationKey, PortClassification>} portClassification, or an empty list if it is not present.
     *
     */
    default @NonNull Map<PortClassificationKey, PortClassification> nonnullPortClassification() {
        return CodeHelpers.nonnull(getPortClassification());
    }
    
    /**
     * Return linkLatency, or {@code null} if it is not present.
     *
     * @return {@code Map<LinkLatencyKey, LinkLatency>} linkLatency, or {@code null} if it is not present.
     *
     */
    @Nullable Map<LinkLatencyKey, LinkLatency> getLinkLatency();
    
    /**
     * Return linkLatency, or an empty list if it is not present.
     *
     * @return {@code Map<LinkLatencyKey, LinkLatency>} linkLatency, or an empty list if it is not present.
     *
     */
    default @NonNull Map<LinkLatencyKey, LinkLatency> nonnullLinkLatency() {
        return CodeHelpers.nonnull(getLinkLatency());
    }

}

