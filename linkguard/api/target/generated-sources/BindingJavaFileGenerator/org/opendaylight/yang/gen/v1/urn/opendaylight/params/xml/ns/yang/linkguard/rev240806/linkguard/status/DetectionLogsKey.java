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
 * This class represents the key of {@link DetectionLogs} class.
 *
 * @see DetectionLogs
 *
 */
@Generated("mdsal-binding-generator")
public final class DetectionLogsKey
 implements Key<DetectionLogs> {
    @java.io.Serial
    private static final long serialVersionUID = -4370192387303689697L;
    private final String _portId;


    /**
     * Constructs an instance.
     *
     * @param _portId the entity portId
     * @throws NullPointerException if any of the arguments are null
     */
    public DetectionLogsKey(@NonNull String _portId) {
        this._portId = CodeHelpers.requireKeyProp(_portId, "portId");
    }
    
    /**
     * Creates a copy from Source Object.
     *
     * @param source Source object
     */
    public DetectionLogsKey(DetectionLogsKey source) {
        this._portId = source._portId;
    }


    /**
     * Return portId, guaranteed to be non-null.
     *
     * @return {@code String} portId, guaranteed to be non-null.
     */
    public @NonNull String getPortId() {
        return _portId;
    }


    @Override
    public int hashCode() {
        return CodeHelpers.wrapperHashCode(_portId);
    }

    @Override
    public final boolean equals(Object obj) {
        return this == obj || obj instanceof DetectionLogsKey other
            && Objects.equals(_portId, other._portId);
    }

    @Override
    public String toString() {
        final var helper = MoreObjects.toStringHelper(DetectionLogsKey.class);
        CodeHelpers.appendValue(helper, "portId", _portId);
        return helper.toString();
    }
}

