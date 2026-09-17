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
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.PortClassificationType;
import org.opendaylight.yang.svc.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.YangModuleInfoImpl;
import org.opendaylight.yangtools.binding.ChildOf;
import org.opendaylight.yangtools.binding.EntryObject;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;
import org.opendaylight.yangtools.yang.common.QName;
import org.opendaylight.yangtools.yang.common.Uint32;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * list port-classification {
 *   key port-id;
 *   leaf port-id {
 *     type string;
 *   }
 *   leaf switch-id {
 *     type string;
 *   }
 *   leaf port-no {
 *     type uint32;
 *   }
 *   leaf classification {
 *     type port-classification-type;
 *   }
 *   leaf status {
 *     type string;
 *   }
 *   leaf last-updated {
 *     type string;
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link PortClassificationBuilder}.
 * @see PortClassificationBuilder
 * @see PortClassificationKey
 *
 */
@Generated("mdsal-binding-generator")
public interface PortClassification
    extends
    ChildOf<LinkguardStatus>,
    EntryObject<PortClassification, PortClassificationKey>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("port-classification");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull PortClassification obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getClassification());
        result = prime * result + Objects.hashCode(obj.getLastUpdated());
        result = prime * result + Objects.hashCode(obj.getPortId());
        result = prime * result + Objects.hashCode(obj.getPortNo());
        result = prime * result + Objects.hashCode(obj.getStatus());
        result = prime * result + Objects.hashCode(obj.getSwitchId());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull PortClassification thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification.class, obj);
        return other != null
            && Objects.equals(thisObj.getPortNo(), other.getPortNo())
            && Objects.equals(thisObj.getLastUpdated(), other.getLastUpdated())
            && Objects.equals(thisObj.getPortId(), other.getPortId())
            && Objects.equals(thisObj.getStatus(), other.getStatus())
            && Objects.equals(thisObj.getSwitchId(), other.getSwitchId())
            && Objects.equals(thisObj.getClassification(), other.getClassification())
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull PortClassification obj) {
        final var helper = MoreObjects.toStringHelper("PortClassification");
        CodeHelpers.appendValue(helper, "classification", obj.getClassification());
        CodeHelpers.appendValue(helper, "lastUpdated", obj.getLastUpdated());
        CodeHelpers.appendValue(helper, "portId", obj.getPortId());
        CodeHelpers.appendValue(helper, "portNo", obj.getPortNo());
        CodeHelpers.appendValue(helper, "status", obj.getStatus());
        CodeHelpers.appendValue(helper, "switchId", obj.getSwitchId());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    @Override
    PortClassificationKey key();
    
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
     * Return switchId, or {@code null} if it is not present.
     *
     * @return {@code String} switchId, or {@code null} if it is not present.
     *
     */
    String getSwitchId();
    
    /**
     * Return switchId, guaranteed to be non-null.
     *
     * @return {@code String} switchId, guaranteed to be non-null.
     * @throws NoSuchElementException if switchId is not present
     *
     */
    default @NonNull String requireSwitchId() {
        return CodeHelpers.require(getSwitchId(), "switchid");
    }
    
    /**
     * Return portNo, or {@code null} if it is not present.
     *
     * @return {@code Uint32} portNo, or {@code null} if it is not present.
     *
     */
    Uint32 getPortNo();
    
    /**
     * Return portNo, guaranteed to be non-null.
     *
     * @return {@code Uint32} portNo, guaranteed to be non-null.
     * @throws NoSuchElementException if portNo is not present
     *
     */
    default @NonNull Uint32 requirePortNo() {
        return CodeHelpers.require(getPortNo(), "portno");
    }
    
    /**
     * Return classification, or {@code null} if it is not present.
     *
     * @return {@code PortClassificationType} classification, or {@code null} if it is not present.
     *
     */
    PortClassificationType getClassification();
    
    /**
     * Return classification, guaranteed to be non-null.
     *
     * @return {@code PortClassificationType} classification, guaranteed to be non-null.
     * @throws NoSuchElementException if classification is not present
     *
     */
    default @NonNull PortClassificationType requireClassification() {
        return CodeHelpers.require(getClassification(), "classification");
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
     * Return lastUpdated, or {@code null} if it is not present.
     *
     * @return {@code String} lastUpdated, or {@code null} if it is not present.
     *
     */
    String getLastUpdated();
    
    /**
     * Return lastUpdated, guaranteed to be non-null.
     *
     * @return {@code String} lastUpdated, guaranteed to be non-null.
     * @throws NoSuchElementException if lastUpdated is not present
     *
     */
    default @NonNull String requireLastUpdated() {
        return CodeHelpers.require(getLastUpdated(), "lastupdated");
    }

}

