package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status;
import com.google.common.base.MoreObjects;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.util.Objects;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.opendaylight.yangtools.binding.Key;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;

/**
 * This class represents the key of {@link Anomaly} class.
 *
 * @see Anomaly
 *
 */
@Generated("mdsal-binding-generator")
public final class AnomalyKey
 implements Key<Anomaly> {
    @java.io.Serial
    private static final long serialVersionUID = 4178510685349777534L;
    private final String _id;


    /**
     * Constructs an instance.
     *
     * @param _id the entity id
     * @throws NullPointerException if any of the arguments are null
     */
    public AnomalyKey(@NonNull String _id) {
        this._id = CodeHelpers.requireKeyProp(_id, "id");
    }
    
    /**
     * Creates a copy from Source Object.
     *
     * @param source Source object
     */
    public AnomalyKey(AnomalyKey source) {
        this._id = source._id;
    }


    /**
     * Return id, guaranteed to be non-null.
     *
     * @return {@code String} id, guaranteed to be non-null.
     */
    public @NonNull String getId() {
        return _id;
    }


    @Override
    public int hashCode() {
        return CodeHelpers.wrapperHashCode(_id);
    }

    @Override
    public final boolean equals(Object obj) {
        return this == obj || obj instanceof AnomalyKey other
            && Objects.equals(_id, other._id);
    }

    @Override
    public String toString() {
        final var helper = MoreObjects.toStringHelper(AnomalyKey.class);
        CodeHelpers.appendValue(helper, "id", _id);
        return helper.toString();
    }
}

