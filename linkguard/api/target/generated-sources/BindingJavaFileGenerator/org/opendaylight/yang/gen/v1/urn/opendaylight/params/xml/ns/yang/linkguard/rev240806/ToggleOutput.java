package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
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
import org.opendaylight.yang.svc.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.YangModuleInfoImpl;
import org.opendaylight.yangtools.binding.Augmentable;
import org.opendaylight.yangtools.binding.RpcOutput;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;
import org.opendaylight.yangtools.yang.common.QName;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * output output {
 *   leaf status {
 *     type string;
 *   }
 * }
 * </pre>
 *
 */
@Generated("mdsal-binding-generator")
public interface ToggleOutput
    extends
    RpcOutput,
    Augmentable<ToggleOutput>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("output");

    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutput> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutput.class;
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
    static int bindingHashCode(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull ToggleOutput obj) {
        int result = 1;
        final int prime = 31;
        result = prime * result + Objects.hashCode(obj.getStatus());
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
    static boolean bindingEquals(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull ToggleOutput thisObj, final Object obj) {
        if (thisObj == obj) {
            return true;
        }
        final var other = CodeHelpers.checkCast(org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.ToggleOutput.class, obj);
        return other != null
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
    static String bindingToString(final org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.@NonNull ToggleOutput obj) {
        final var helper = MoreObjects.toStringHelper("ToggleOutput");
        CodeHelpers.appendValue(helper, "status", obj.getStatus());
        CodeHelpers.appendAugmentations(helper, "augmentation", obj);
        return helper.toString();
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

}

