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
import org.opendaylight.yangtools.yang.common.Uint16;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * list quarantined-port {
 *   key port-id;
 *   leaf port-id {
 *     type string;
 *   }
 *   leaf attempts {
 *     type uint16;
 *   }
 *   leaf state {
 *     type string;
 *   }
 *   leaf next-attempt-at {
 *     type string;
 *   }
 * }
 * </pre>
 * <p>To create instances of this class use {@link QuarantinedPortBuilder}.
 * @see QuarantinedPortBuilder
 * @see QuarantinedPortKey
 *
 */
@Generated("mdsal-binding-generator")
public interface QuarantinedPort
    extends
    ChildOf<LinkguardStatus>,
    EntryObject<QuarantinedPort, QuarantinedPortKey>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("quarantined-port");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPort> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPort.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull QuarantinedPort obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getAttempts());
        result = prime * result + Objects.hashCode(obj.getNextAttemptAt());
        result = prime * result + Objects.hashCode(obj.getPortId());
        result = prime * result + Objects.hashCode(obj.getState());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull QuarantinedPort thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.QuarantinedPort.class, obj);
        return other != null
            && Objects.equals(thisObj.getAttempts(), other.getAttempts())
            && Objects.equals(thisObj.getNextAttemptAt(), other.getNextAttemptAt())
            && Objects.equals(thisObj.getPortId(), other.getPortId())
            && Objects.equals(thisObj.getState(), other.getState())
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.@NonNull QuarantinedPort obj) {
        final var helper = MoreObjects.toStringHelper("QuarantinedPort");
        CodeHelpers.appendValue(helper, "attempts", obj.getAttempts());
        CodeHelpers.appendValue(helper, "nextAttemptAt", obj.getNextAttemptAt());
        CodeHelpers.appendValue(helper, "portId", obj.getPortId());
        CodeHelpers.appendValue(helper, "state", obj.getState());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
    }
    
    @Override
    QuarantinedPortKey key();
    
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
     * Return attempts, or {@code null} if it is not present.
     *
     * @return {@code Uint16} attempts, or {@code null} if it is not present.
     *
     */
    Uint16 getAttempts();
    
    /**
     * Return attempts, guaranteed to be non-null.
     *
     * @return {@code Uint16} attempts, guaranteed to be non-null.
     * @throws NoSuchElementException if attempts is not present
     *
     */
    default @NonNull Uint16 requireAttempts() {
        return CodeHelpers.require(getAttempts(), "attempts");
    }
    
    /**
     * Return state, or {@code null} if it is not present.
     *
     * @return {@code String} state, or {@code null} if it is not present.
     *
     */
    String getState();
    
    /**
     * Return state, guaranteed to be non-null.
     *
     * @return {@code String} state, guaranteed to be non-null.
     * @throws NoSuchElementException if state is not present
     *
     */
    default @NonNull String requireState() {
        return CodeHelpers.require(getState(), "state");
    }
    
    /**
     * Return nextAttemptAt, or {@code null} if it is not present.
     *
     * @return {@code String} nextAttemptAt, or {@code null} if it is not present.
     *
     */
    String getNextAttemptAt();
    
    /**
     * Return nextAttemptAt, guaranteed to be non-null.
     *
     * @return {@code String} nextAttemptAt, guaranteed to be non-null.
     * @throws NoSuchElementException if nextAttemptAt is not present
     *
     */
    default @NonNull String requireNextAttemptAt() {
        return CodeHelpers.require(getNextAttemptAt(), "nextattemptat");
    }

}

