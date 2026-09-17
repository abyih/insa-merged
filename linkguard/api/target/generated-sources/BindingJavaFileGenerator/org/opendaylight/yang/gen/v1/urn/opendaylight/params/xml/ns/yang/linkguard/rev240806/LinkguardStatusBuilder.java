package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
import java.lang.Class;
import java.lang.NullPointerException;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogs;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.DetectionLogsKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatency;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.LinkLatencyKey;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassification;
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status.PortClassificationKey;
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractAugmentable;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;

/**
 * Class that builds {@link LinkguardStatus} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     LinkguardStatus createLinkguardStatus(int fooXyzzy, int barBaz) {
 *         return new LinkguardStatusBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of LinkguardStatus, as instances can be freely passed around without
 * worrying about synchronization issues.
 *
 * <p>
 * As a side note: method chaining results in:
 * <ul>
 *   <li>very efficient Java bytecode, as the method invocation result, in this case the Builder reference, is
 *       on the stack, so further method invocations just need to fill method arguments for the next method
 *       invocation, which is terminated by {@link #build()}, which is then returned from the method</li>
 *   <li>better understanding by humans, as the scope of mutable state (the builder) is kept to a minimum and is
 *       very localized</li>
 *   <li>better optimization opportunities, as the object scope is minimized in terms of invocation (rather than
 *       method) stack, making <a href="https://en.wikipedia.org/wiki/Escape_analysis">escape analysis</a> a lot
 *       easier. Given enough compiler (JIT/AOT) prowess, the cost of th builder object can be completely
 *       eliminated</li>
 * </ul>
 *
 * @see LinkguardStatus
 *
 */
@Generated("mdsal-binding-generator")
public class LinkguardStatusBuilder {

    private Map<DetectionLogsKey, DetectionLogs> _detectionLogs;
    private Map<LinkLatencyKey, LinkLatency> _linkLatency;
    private Map<PortClassificationKey, PortClassification> _portClassification;


    Map<Class<? extends Augmentation<LinkguardStatus>>, Augmentation<LinkguardStatus>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public LinkguardStatusBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link LinkguardStatus}.
     *
     * @param base LinkguardStatus from which the builder should be initialized
     */
    public LinkguardStatusBuilder(final LinkguardStatus base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this._detectionLogs = base.getDetectionLogs();
        this._linkLatency = base.getLinkLatency();
        this._portClassification = base.getPortClassification();
    }


    private static final class LazyEmpty {
        static final @NonNull LinkguardStatus INSTANCE = new LinkguardStatusBuilder().build();
    
        private LazyEmpty() {
            // Hidden on purpose
        }
    }
    
    /**
     * Get empty instance of LinkguardStatus.
     *
     * @return An empty {@link LinkguardStatus}
     */
    public static @NonNull LinkguardStatus empty() {
        return LazyEmpty.INSTANCE;
    }

    /**
     * Return current value associated with the property corresponding to {@link LinkguardStatus#getDetectionLogs()}.
     *
     * @return current value
     */
    public Map<DetectionLogsKey, DetectionLogs> getDetectionLogs() {
        return _detectionLogs;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkguardStatus#getLinkLatency()}.
     *
     * @return current value
     */
    public Map<LinkLatencyKey, LinkLatency> getLinkLatency() {
        return _linkLatency;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkguardStatus#getPortClassification()}.
     *
     * @return current value
     */
    public Map<PortClassificationKey, PortClassification> getPortClassification() {
        return _portClassification;
    }

    /**
     * Return the specified augmentation, if it is present in this builder.
     *
     * @param <E$$> augmentation type
     * @param augmentationType augmentation type class
     * @return Augmentation object from this builder, or {@code null} if not present
     * @throws NullPointerException if {@code augmentType} is {@code null}
     */
    @SuppressWarnings({ "unchecked", "checkstyle:methodTypeParameterName"})
    public <E$$ extends Augmentation<LinkguardStatus>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    
    /**
     * Set the property corresponding to {@link LinkguardStatus#getDetectionLogs()} to the specified
     * value.
     *
     * @param values desired value
     * @return this builder
     */
    public LinkguardStatusBuilder setDetectionLogs(final Map<DetectionLogsKey, DetectionLogs> values) {
        this._detectionLogs = values;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkguardStatus#getLinkLatency()} to the specified
     * value.
     *
     * @param values desired value
     * @return this builder
     */
    public LinkguardStatusBuilder setLinkLatency(final Map<LinkLatencyKey, LinkLatency> values) {
        this._linkLatency = values;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkguardStatus#getPortClassification()} to the specified
     * value.
     *
     * @param values desired value
     * @return this builder
     */
    public LinkguardStatusBuilder setPortClassification(final Map<PortClassificationKey, PortClassification> values) {
        this._portClassification = values;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public LinkguardStatusBuilder addAugmentation(Augmentation<LinkguardStatus> augmentation) {
        if (!(this.augmentation instanceof HashMap)) {
            this.augmentation = new HashMap<>();
        }
    
        this.augmentation.put(augmentation.implementedInterface(), augmentation);
        return this;
    }
    
    /**
      * Remove an augmentation from this builder's product. If this builder does not track such an augmentation
      * type, this method does nothing.
      *
      * @param augmentationType augmentation type to be removed
      * @return this builder
      */
    public LinkguardStatusBuilder removeAugmentation(Class<? extends Augmentation<LinkguardStatus>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link LinkguardStatus} instance.
     *
     * @return A new {@link LinkguardStatus} instance.
     */
    public @NonNull LinkguardStatus build() {
        return new LinkguardStatusImpl(this);
    }

    private static final class LinkguardStatusImpl
        extends AbstractAugmentable<LinkguardStatus>
        implements LinkguardStatus {
    
        private final Map<DetectionLogsKey, DetectionLogs> _detectionLogs;
        private final Map<LinkLatencyKey, LinkLatency> _linkLatency;
        private final Map<PortClassificationKey, PortClassification> _portClassification;
    
        LinkguardStatusImpl(final LinkguardStatusBuilder base) {
            super(base.augmentation);
            this._detectionLogs = CodeHelpers.emptyToNull(base.getDetectionLogs());
            this._linkLatency = CodeHelpers.emptyToNull(base.getLinkLatency());
            this._portClassification = CodeHelpers.emptyToNull(base.getPortClassification());
        }
    
        @Override
        public Map<DetectionLogsKey, DetectionLogs> getDetectionLogs() {
            return _detectionLogs;
        }
        
        @Override
        public Map<LinkLatencyKey, LinkLatency> getLinkLatency() {
            return _linkLatency;
        }
        
        @Override
        public Map<PortClassificationKey, PortClassification> getPortClassification() {
            return _portClassification;
        }
    
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = LinkguardStatus.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return LinkguardStatus.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return LinkguardStatus.bindingToString(this);
        }
    }
}
