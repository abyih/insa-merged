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
import org.opendaylight.yangtools.yang.common.QName;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * list anomaly {
 *   key id;
 *   leaf id {
 *     type string;
 *   }
 *   leaf attack-type {
 *     type string;
 *   }
 *   leaf severity {
 *     type string;
 *   }
 *   leaf source {
 *     type string;
 *   }
 *   leaf details {
 *     type string;
 *   }
 *   leaf mitigation-action {
 *     type string;
 *   }
 *   leaf mitigation-reason {
 *     type string;
 *   }
 *   leaf mitigation-state {
 *     type string;
 *   }
 *   leaf detected-at {
 *     type string;
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link AnomalyBuilder}.
 * @see AnomalyBuilder
 * @see AnomalyKey
 *
 */
@Generated("mdsal-binding-generator")
public interface Anomaly
    extends
    ChildOf<LinkguardStatus>,
    EntryObject<Anomaly, AnomalyKey>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("anomaly");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.Anomaly> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.Anomaly.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull Anomaly obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getAttackType());
        result = prime * result + Objects.hashCode(obj.getDetails());
        result = prime * result + Objects.hashCode(obj.getDetectedAt());
        result = prime * result + Objects.hashCode(obj.getId());
        result = prime * result + Objects.hashCode(obj.getMitigationAction());
        result = prime * result + Objects.hashCode(obj.getMitigationReason());
        result = prime * result + Objects.hashCode(obj.getMitigationState());
        result = prime * result + Objects.hashCode(obj.getSeverity());
        result = prime * result + Objects.hashCode(obj.getSource());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull Anomaly thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.Anomaly.class, obj);
        return other != null
            && Objects.equals(thisObj.getAttackType(), other.getAttackType())
            && Objects.equals(thisObj.getDetails(), other.getDetails())
            && Objects.equals(thisObj.getDetectedAt(), other.getDetectedAt())
            && Objects.equals(thisObj.getId(), other.getId())
            && Objects.equals(thisObj.getMitigationAction(), other.getMitigationAction())
            && Objects.equals(thisObj.getMitigationReason(), other.getMitigationReason())
            && Objects.equals(thisObj.getMitigationState(), other.getMitigationState())
            && Objects.equals(thisObj.getSeverity(), other.getSeverity())
            && Objects.equals(thisObj.getSource(), other.getSource())
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull Anomaly obj) {
        final var helper = MoreObjects.toStringHelper("Anomaly");
        CodeHelpers.appendValue(helper, "attackType", obj.getAttackType());
        CodeHelpers.appendValue(helper, "details", obj.getDetails());
        CodeHelpers.appendValue(helper, "detectedAt", obj.getDetectedAt());
        CodeHelpers.appendValue(helper, "id", obj.getId());
        CodeHelpers.appendValue(helper, "mitigationAction", obj.getMitigationAction());
        CodeHelpers.appendValue(helper, "mitigationReason", obj.getMitigationReason());
        CodeHelpers.appendValue(helper, "mitigationState", obj.getMitigationState());
        CodeHelpers.appendValue(helper, "severity", obj.getSeverity());
        CodeHelpers.appendValue(helper, "source", obj.getSource());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    @Override
    AnomalyKey key();
    
    /**
     * Return id, or {@code null} if it is not present.
     *
     * @return {@code String} id, or {@code null} if it is not present.
     *
     */
    String getId();
    
    /**
     * Return id, guaranteed to be non-null.
     *
     * @return {@code String} id, guaranteed to be non-null.
     * @throws NoSuchElementException if id is not present
     *
     */
    default @NonNull String requireId() {
        return CodeHelpers.require(getId(), "id");
    }
    
    /**
     * Return attackType, or {@code null} if it is not present.
     *
     * @return {@code String} attackType, or {@code null} if it is not present.
     *
     */
    String getAttackType();
    
    /**
     * Return attackType, guaranteed to be non-null.
     *
     * @return {@code String} attackType, guaranteed to be non-null.
     * @throws NoSuchElementException if attackType is not present
     *
     */
    default @NonNull String requireAttackType() {
        return CodeHelpers.require(getAttackType(), "attacktype");
    }
    
    /**
     * Return severity, or {@code null} if it is not present.
     *
     * @return {@code String} severity, or {@code null} if it is not present.
     *
     */
    String getSeverity();
    
    /**
     * Return severity, guaranteed to be non-null.
     *
     * @return {@code String} severity, guaranteed to be non-null.
     * @throws NoSuchElementException if severity is not present
     *
     */
    default @NonNull String requireSeverity() {
        return CodeHelpers.require(getSeverity(), "severity");
    }
    
    /**
     * Return source, or {@code null} if it is not present.
     *
     * @return {@code String} source, or {@code null} if it is not present.
     *
     */
    String getSource();
    
    /**
     * Return source, guaranteed to be non-null.
     *
     * @return {@code String} source, guaranteed to be non-null.
     * @throws NoSuchElementException if source is not present
     *
     */
    default @NonNull String requireSource() {
        return CodeHelpers.require(getSource(), "source");
    }
    
    /**
     * Return details, or {@code null} if it is not present.
     *
     * @return {@code String} details, or {@code null} if it is not present.
     *
     */
    String getDetails();
    
    /**
     * Return details, guaranteed to be non-null.
     *
     * @return {@code String} details, guaranteed to be non-null.
     * @throws NoSuchElementException if details is not present
     *
     */
    default @NonNull String requireDetails() {
        return CodeHelpers.require(getDetails(), "details");
    }
    
    /**
     * Return mitigationAction, or {@code null} if it is not present.
     *
     * @return {@code String} mitigationAction, or {@code null} if it is not present.
     *
     */
    String getMitigationAction();
    
    /**
     * Return mitigationAction, guaranteed to be non-null.
     *
     * @return {@code String} mitigationAction, guaranteed to be non-null.
     * @throws NoSuchElementException if mitigationAction is not present
     *
     */
    default @NonNull String requireMitigationAction() {
        return CodeHelpers.require(getMitigationAction(), "mitigationaction");
    }
    
    /**
     * Return mitigationReason, or {@code null} if it is not present.
     *
     * @return {@code String} mitigationReason, or {@code null} if it is not present.
     *
     */
    String getMitigationReason();
    
    /**
     * Return mitigationReason, guaranteed to be non-null.
     *
     * @return {@code String} mitigationReason, guaranteed to be non-null.
     * @throws NoSuchElementException if mitigationReason is not present
     *
     */
    default @NonNull String requireMitigationReason() {
        return CodeHelpers.require(getMitigationReason(), "mitigationreason");
    }
    
    /**
     * Return mitigationState, or {@code null} if it is not present.
     *
     * @return {@code String} mitigationState, or {@code null} if it is not present.
     *
     */
    String getMitigationState();
    
    /**
     * Return mitigationState, guaranteed to be non-null.
     *
     * @return {@code String} mitigationState, guaranteed to be non-null.
     * @throws NoSuchElementException if mitigationState is not present
     *
     */
    default @NonNull String requireMitigationState() {
        return CodeHelpers.require(getMitigationState(), "mitigationstate");
    }
    
    /**
     * Return detectedAt, or {@code null} if it is not present.
     *
     * @return {@code String} detectedAt, or {@code null} if it is not present.
     *
     */
    String getDetectedAt();
    
    /**
     * Return detectedAt, guaranteed to be non-null.
     *
     * @return {@code String} detectedAt, guaranteed to be non-null.
     * @throws NoSuchElementException if detectedAt is not present
     *
     */
    default @NonNull String requireDetectedAt() {
        return CodeHelpers.require(getDetectedAt(), "detectedat");
    }

}

