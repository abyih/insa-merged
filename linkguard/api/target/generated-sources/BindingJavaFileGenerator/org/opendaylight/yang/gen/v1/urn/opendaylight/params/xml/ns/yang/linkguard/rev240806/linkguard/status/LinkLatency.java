package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status;
import com.google.common.base.MoreObjects;
import java.lang.Class;
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
import org.opendaylight.yangtools.yang.common.Decimal64;
import org.opendaylight.yangtools.yang.common.QName;

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
 *   leaf current-rtt {
 *     type decimal64 {
 *       fraction-digits 2;
 *     }
 *   }
 *   leaf baseline-rtt {
 *     type decimal64 {
 *       fraction-digits 2;
 *     }
 *   }
 *   leaf threshold {
 *     type decimal64 {
 *       fraction-digits 2;
 *     }
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
        result = prime * result + Objects.hashCode(obj.getBaselineRtt());
        result = prime * result + Objects.hashCode(obj.getCurrentRtt());
        result = prime * result + Objects.hashCode(obj.getLastCheck());
        result = prime * result + Objects.hashCode(obj.getLinkId());
        result = prime * result + Objects.hashCode(obj.getStatus());
        result = prime * result + Objects.hashCode(obj.getThreshold());
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
            && Objects.equals(thisObj.getBaselineRtt(), other.getBaselineRtt())
            && Objects.equals(thisObj.getCurrentRtt(), other.getCurrentRtt())
            && Objects.equals(thisObj.getThreshold(), other.getThreshold())
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
        CodeHelpers.appendValue(helper, "baselineRtt", obj.getBaselineRtt());
        CodeHelpers.appendValue(helper, "currentRtt", obj.getCurrentRtt());
        CodeHelpers.appendValue(helper, "lastCheck", obj.getLastCheck());
        CodeHelpers.appendValue(helper, "linkId", obj.getLinkId());
        CodeHelpers.appendValue(helper, "status", obj.getStatus());
        CodeHelpers.appendValue(helper, "threshold", obj.getThreshold());
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
     * Return currentRtt, or {@code null} if it is not present.
     *
     * @return {@code Decimal64} currentRtt, or {@code null} if it is not present.
     *
     */
    Decimal64 getCurrentRtt();
    
    /**
     * Return currentRtt, guaranteed to be non-null.
     *
     * @return {@code Decimal64} currentRtt, guaranteed to be non-null.
     * @throws NoSuchElementException if currentRtt is not present
     *
     */
    default @NonNull Decimal64 requireCurrentRtt() {
        return CodeHelpers.require(getCurrentRtt(), "currentrtt");
    }
    
    /**
     * Return baselineRtt, or {@code null} if it is not present.
     *
     * @return {@code Decimal64} baselineRtt, or {@code null} if it is not present.
     *
     */
    Decimal64 getBaselineRtt();
    
    /**
     * Return baselineRtt, guaranteed to be non-null.
     *
     * @return {@code Decimal64} baselineRtt, guaranteed to be non-null.
     * @throws NoSuchElementException if baselineRtt is not present
     *
     */
    default @NonNull Decimal64 requireBaselineRtt() {
        return CodeHelpers.require(getBaselineRtt(), "baselinertt");
    }
    
    /**
     * Return threshold, or {@code null} if it is not present.
     *
     * @return {@code Decimal64} threshold, or {@code null} if it is not present.
     *
     */
    Decimal64 getThreshold();
    
    /**
     * Return threshold, guaranteed to be non-null.
     *
     * @return {@code Decimal64} threshold, guaranteed to be non-null.
     * @throws NoSuchElementException if threshold is not present
     *
     */
    default @NonNull Decimal64 requireThreshold() {
        return CodeHelpers.require(getThreshold(), "threshold");
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

