package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status;
import com.google.common.base.MoreObjects;
import java.lang.Class;
import java.lang.Long;
import java.lang.NullPointerException;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.util.NoSuchElementException;
import java.util.Objects;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.LinkguardStatus;
import org.opendaylight.yang.svc.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.YangModuleInfoImpl;
import org.opendaylight.yangtools.binding.ChildOf;
import org.opendaylight.yangtools.binding.EntryObject;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;
import org.opendaylight.yangtools.yang.common.QName;
import org.opendaylight.yangtools.yang.common.Uint64;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * list link-latency {
 *   key link-id;
 *   leaf link-id {
 *     type string;
 *   }
 *   leaf current-rtt-us {
 *     type uint64;
 *   }
 *   leaf baseline-rtt-us {
 *     type uint64;
 *   }
 *   leaf threshold-us {
 *     type uint64;
 *   }
 *   leaf deviation-us {
 *     type int64;
 *   }
 *   leaf status {
 *     type string;
 *   }
 *   leaf last-check {
 *     type string;
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link LinkLatencyBuilder}.
 * @see LinkLatencyBuilder
 * @see LinkLatencyKey
 *
 */
@Generated("mdsal-binding-generator")
public interface LinkLatency
    extends
    ChildOf<LinkguardStatus>,
    EntryObject<LinkLatency, LinkLatencyKey>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("link-latency");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull LinkLatency obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getBaselineRttUs());
        result = prime * result + Objects.hashCode(obj.getCurrentRttUs());
        result = prime * result + Objects.hashCode(obj.getDeviationUs());
        result = prime * result + Objects.hashCode(obj.getLastCheck());
        result = prime * result + Objects.hashCode(obj.getLinkId());
        result = prime * result + Objects.hashCode(obj.getStatus());
        result = prime * result + Objects.hashCode(obj.getThresholdUs());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull LinkLatency thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency.class, obj);
        return other != null
            && Objects.equals(thisObj.getBaselineRttUs(), other.getBaselineRttUs())
            && Objects.equals(thisObj.getCurrentRttUs(), other.getCurrentRttUs())
            && Objects.equals(thisObj.getDeviationUs(), other.getDeviationUs())
            && Objects.equals(thisObj.getThresholdUs(), other.getThresholdUs())
            && Objects.equals(thisObj.getLastCheck(), other.getLastCheck())
            && Objects.equals(thisObj.getLinkId(), other.getLinkId())
            && Objects.equals(thisObj.getStatus(), other.getStatus())
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull LinkLatency obj) {
        final var helper = MoreObjects.toStringHelper("LinkLatency");
        CodeHelpers.appendValue(helper, "baselineRttUs", obj.getBaselineRttUs());
        CodeHelpers.appendValue(helper, "currentRttUs", obj.getCurrentRttUs());
        CodeHelpers.appendValue(helper, "deviationUs", obj.getDeviationUs());
        CodeHelpers.appendValue(helper, "lastCheck", obj.getLastCheck());
        CodeHelpers.appendValue(helper, "linkId", obj.getLinkId());
        CodeHelpers.appendValue(helper, "status", obj.getStatus());
        CodeHelpers.appendValue(helper, "thresholdUs", obj.getThresholdUs());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    @Override
    LinkLatencyKey key();
    
    /**
     * Return linkId, or {@code null} if it is not present.
     *
     * @return {@code String} linkId, or {@code null} if it is not present.
     *
     */
    String getLinkId();
    
    /**
     * Return linkId, guaranteed to be non-null.
     *
     * @return {@code String} linkId, guaranteed to be non-null.
     * @throws NoSuchElementException if linkId is not present
     *
     */
    default @NonNull String requireLinkId() {
        return CodeHelpers.require(getLinkId(), "linkid");
    }
    
    /**
     * Return currentRttUs, or {@code null} if it is not present.
     *
     * @return {@code Uint64} currentRttUs, or {@code null} if it is not present.
     *
     */
    Uint64 getCurrentRttUs();
    
    /**
     * Return currentRttUs, guaranteed to be non-null.
     *
     * @return {@code Uint64} currentRttUs, guaranteed to be non-null.
     * @throws NoSuchElementException if currentRttUs is not present
     *
     */
    default @NonNull Uint64 requireCurrentRttUs() {
        return CodeHelpers.require(getCurrentRttUs(), "currentrttus");
    }
    
    /**
     * Return baselineRttUs, or {@code null} if it is not present.
     *
     * @return {@code Uint64} baselineRttUs, or {@code null} if it is not present.
     *
     */
    Uint64 getBaselineRttUs();
    
    /**
     * Return baselineRttUs, guaranteed to be non-null.
     *
     * @return {@code Uint64} baselineRttUs, guaranteed to be non-null.
     * @throws NoSuchElementException if baselineRttUs is not present
     *
     */
    default @NonNull Uint64 requireBaselineRttUs() {
        return CodeHelpers.require(getBaselineRttUs(), "baselinerttus");
    }
    
    /**
     * Return thresholdUs, or {@code null} if it is not present.
     *
     * @return {@code Uint64} thresholdUs, or {@code null} if it is not present.
     *
     */
    Uint64 getThresholdUs();
    
    /**
     * Return thresholdUs, guaranteed to be non-null.
     *
     * @return {@code Uint64} thresholdUs, guaranteed to be non-null.
     * @throws NoSuchElementException if thresholdUs is not present
     *
     */
    default @NonNull Uint64 requireThresholdUs() {
        return CodeHelpers.require(getThresholdUs(), "thresholdus");
    }
    
    /**
     * Return deviationUs, or {@code null} if it is not present.
     *
     * @return {@code Long} deviationUs, or {@code null} if it is not present.
     *
     */
    Long getDeviationUs();
    
    /**
     * Return deviationUs, guaranteed to be non-null.
     *
     * @return {@code Long} deviationUs, guaranteed to be non-null.
     * @throws NoSuchElementException if deviationUs is not present
     *
     */
    default @NonNull Long requireDeviationUs() {
        return CodeHelpers.require(getDeviationUs(), "deviationus");
    }
    
    /**
     * Return status, or {@code null} if it is not present.
     *
     * @return {@code String} status, or {@code null} if it is not present.
     *
     */
    String getStatus();
    
    /**
     * Return status, guaranteed to be non-null.
     *
     * @return {@code String} status, guaranteed to be non-null.
     * @throws NoSuchElementException if status is not present
     *
     */
    default @NonNull String requireStatus() {
        return CodeHelpers.require(getStatus(), "status");
    }
    
    /**
     * Return lastCheck, or {@code null} if it is not present.
     *
     * @return {@code String} lastCheck, or {@code null} if it is not present.
     *
     */
    String getLastCheck();
    
    /**
     * Return lastCheck, guaranteed to be non-null.
     *
     * @return {@code String} lastCheck, guaranteed to be non-null.
     * @throws NoSuchElementException if lastCheck is not present
     *
     */
    default @NonNull String requireLastCheck() {
        return CodeHelpers.require(getLastCheck(), "lastcheck");
    }

}

