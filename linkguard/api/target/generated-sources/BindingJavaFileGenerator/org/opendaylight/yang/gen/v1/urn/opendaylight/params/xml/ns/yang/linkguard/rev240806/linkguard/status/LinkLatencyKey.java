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
 * This class represents the key of {@link LinkLatency} class.
 *
 * @see LinkLatency
 *
 */
@Generated("mdsal-binding-generator")
public final class LinkLatencyKey
 implements Key<LinkLatency> {
    @java.io.Serial
    private static final long serialVersionUID = -4496485967894149939L;
    private final String _linkId;


    /**
     * Constructs an instance.
     *
     * @param _linkId the entity linkId
     * @throws NullPointerException if any of the arguments are null
     */
    public LinkLatencyKey(@NonNull String _linkId) {
        this._linkId = CodeHelpers.requireKeyProp(_linkId, "linkId");
    }
    
    /**
     * Creates a copy from Source Object.
     *
     * @param source Source object
     */
    public LinkLatencyKey(LinkLatencyKey source) {
        this._linkId = source._linkId;
    }


    /**
     * Return linkId, guaranteed to be non-null.
     *
     * @return {@code String} linkId, guaranteed to be non-null.
     */
    public @NonNull String getLinkId() {
        return _linkId;
    }


    @Override
    public int hashCode() {
        return CodeHelpers.wrapperHashCode(_linkId);
    }

    @Override
    public final boolean equals(Object obj) {
        return this == obj || obj instanceof LinkLatencyKey other
            && Objects.equals(_linkId, other._linkId);
    }

    @Override
    public String toString() {
        final var helper = MoreObjects.toStringHelper(LinkLatencyKey.class);
        CodeHelpers.appendValue(helper, "linkId", _linkId);
        return helper.toString();
    }
}

