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
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.AttackType;
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
 * list detection-logs {
 *   key port-id;
 *   leaf port-id {
 *     type string;
 *   }
 *   leaf attack-type {
 *     type attack-type;
 *   }
 *   leaf severity {
 *     type string;
 *   }
 *   leaf details {
 *     type string;
 *   }
 *   leaf source {
 *     type string;
 *   }
 *   leaf timestamp {
 *     type string;
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link DetectionLogsBuilder}.
 * @see DetectionLogsBuilder
 * @see DetectionLogsKey
 *
 */
@Generated("mdsal-binding-generator")
public interface DetectionLogs
    extends
    ChildOf<LinkguardStatus>,
    EntryObject<DetectionLogs, DetectionLogsKey>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("detection-logs");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogs> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogs.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull DetectionLogs obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getAttackType());
        result = prime * result + Objects.hashCode(obj.getDetails());
        result = prime * result + Objects.hashCode(obj.getPortId());
        result = prime * result + Objects.hashCode(obj.getSeverity());
        result = prime * result + Objects.hashCode(obj.getSource());
        result = prime * result + Objects.hashCode(obj.getTimestamp());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull DetectionLogs thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogs.class, obj);
        return other != null
            && Objects.equals(thisObj.getDetails(), other.getDetails())
            && Objects.equals(thisObj.getPortId(), other.getPortId())
            && Objects.equals(thisObj.getSeverity(), other.getSeverity())
            && Objects.equals(thisObj.getSource(), other.getSource())
            && Objects.equals(thisObj.getTimestamp(), other.getTimestamp())
            && Objects.equals(thisObj.getAttackType(), other.getAttackType())
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull DetectionLogs obj) {
        final var helper = MoreObjects.toStringHelper("DetectionLogs");
        CodeHelpers.appendValue(helper, "attackType", obj.getAttackType());
        CodeHelpers.appendValue(helper, "details", obj.getDetails());
        CodeHelpers.appendValue(helper, "portId", obj.getPortId());
        CodeHelpers.appendValue(helper, "severity", obj.getSeverity());
        CodeHelpers.appendValue(helper, "source", obj.getSource());
        CodeHelpers.appendValue(helper, "timestamp", obj.getTimestamp());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    @Override
    DetectionLogsKey key();
    
    /**
     * Return portId, or {@code null} if it is not present.
     *
     * @return {@code String} portId, or {@code null} if it is not present.
     *
     */
    String getPortId();
    
    /**
     * Return portId, guaranteed to be non-null.
     *
     * @return {@code String} portId, guaranteed to be non-null.
     * @throws NoSuchElementException if portId is not present
     *
     */
    default @NonNull String requirePortId() {
        return CodeHelpers.require(getPortId(), "portid");
    }
    
    /**
     * Return attackType, or {@code null} if it is not present.
     *
     * @return {@code AttackType} attackType, or {@code null} if it is not present.
     *
     */
    AttackType getAttackType();
    
    /**
     * Return attackType, guaranteed to be non-null.
     *
     * @return {@code AttackType} attackType, guaranteed to be non-null.
     * @throws NoSuchElementException if attackType is not present
     *
     */
    default @NonNull AttackType requireAttackType() {
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
     * Return timestamp, or {@code null} if it is not present.
     *
     * @return {@code String} timestamp, or {@code null} if it is not present.
     *
     */
    String getTimestamp();
    
    /**
     * Return timestamp, guaranteed to be non-null.
     *
     * @return {@code String} timestamp, guaranteed to be non-null.
     * @throws NoSuchElementException if timestamp is not present
     *
     */
    default @NonNull String requireTimestamp() {
        return CodeHelpers.require(getTimestamp(), "timestamp");
    }

}

