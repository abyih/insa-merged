package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status;
import java.lang.Class;
import java.lang.Long;
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
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractEntryObject;
import org.opendaylight.yangtools.yang.common.Uint64;

/**
 * Class that builds {@link LinkLatency} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     LinkLatency createLinkLatency(int fooXyzzy, int barBaz) {
 *         return new LinkLatencyBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of LinkLatency, as instances can be freely passed around without
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
 * @see LinkLatency
 *
 */
@Generated("mdsal-binding-generator")
public class LinkLatencyBuilder {

    private Uint64 _baselineRttUs;
    private Uint64 _currentRttUs;
    private Long _deviationUs;
    private String _lastCheck;
    private String _linkId;
    private String _status;
    private Uint64 _thresholdUs;
    private LinkLatencyKey key;


    Map<Class<? extends Augmentation<LinkLatency>>, Augmentation<LinkLatency>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public LinkLatencyBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link LinkLatency}.
     *
     * @param base LinkLatency from which the builder should be initialized
     */
    public LinkLatencyBuilder(final LinkLatency base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this.key = base.key();
        this._linkId = base.getLinkId();
        this._baselineRttUs = base.getBaselineRttUs();
        this._currentRttUs = base.getCurrentRttUs();
        this._deviationUs = base.getDeviationUs();
        this._lastCheck = base.getLastCheck();
        this._status = base.getStatus();
        this._thresholdUs = base.getThresholdUs();
    }



    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#key()}.
     *
     * @return current value
     */
    public LinkLatencyKey key() {
        return key;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getBaselineRttUs()}.
     *
     * @return current value
     */
    public Uint64 getBaselineRttUs() {
        return _baselineRttUs;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getCurrentRttUs()}.
     *
     * @return current value
     */
    public Uint64 getCurrentRttUs() {
        return _currentRttUs;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getDeviationUs()}.
     *
     * @return current value
     */
    public Long getDeviationUs() {
        return _deviationUs;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getLastCheck()}.
     *
     * @return current value
     */
    public String getLastCheck() {
        return _lastCheck;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getLinkId()}.
     *
     * @return current value
     */
    public String getLinkId() {
        return _linkId;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getStatus()}.
     *
     * @return current value
     */
    public String getStatus() {
        return _status;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link LinkLatency#getThresholdUs()}.
     *
     * @return current value
     */
    public Uint64 getThresholdUs() {
        return _thresholdUs;
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
    public <E$$ extends Augmentation<LinkLatency>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    /**
     * Set the key value corresponding to {@link LinkLatency#key()} to the specified
     * value.
     *
     * @param key desired value
     * @return this builder
     */
    public LinkLatencyBuilder withKey(final LinkLatencyKey key) {
        this.key = key;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getBaselineRttUs()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setBaselineRttUs(final Uint64 value) {
        this._baselineRttUs = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getCurrentRttUs()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setCurrentRttUs(final Uint64 value) {
        this._currentRttUs = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getDeviationUs()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setDeviationUs(final Long value) {
        this._deviationUs = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getLastCheck()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setLastCheck(final String value) {
        this._lastCheck = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getLinkId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setLinkId(final String value) {
        this._linkId = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getStatus()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setStatus(final String value) {
        this._status = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link LinkLatency#getThresholdUs()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public LinkLatencyBuilder setThresholdUs(final Uint64 value) {
        this._thresholdUs = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public LinkLatencyBuilder addAugmentation(Augmentation<LinkLatency> augmentation) {
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
    public LinkLatencyBuilder removeAugmentation(Class<? extends Augmentation<LinkLatency>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link LinkLatency} instance.
     *
     * @return A new {@link LinkLatency} instance.
     */
    public @NonNull LinkLatency build() {
        return new LinkLatencyImpl(this);
    }

    private static final class LinkLatencyImpl
        extends AbstractEntryObject<LinkLatency, LinkLatencyKey>
        implements LinkLatency {
    
        private final Uint64 _baselineRttUs;
        private final Uint64 _currentRttUs;
        private final Long _deviationUs;
        private final String _lastCheck;
        private final String _linkId;
        private final String _status;
        private final Uint64 _thresholdUs;
    
        LinkLatencyImpl(final LinkLatencyBuilder base) {
            super(base.augmentation, extractKey(base));
            final var key = key();
            this._linkId = key.getLinkId();
            this._baselineRttUs = base.getBaselineRttUs();
            this._currentRttUs = base.getCurrentRttUs();
            this._deviationUs = base.getDeviationUs();
            this._lastCheck = base.getLastCheck();
            this._status = base.getStatus();
            this._thresholdUs = base.getThresholdUs();
        }
        
        private static @NonNull LinkLatencyKey extractKey(final LinkLatencyBuilder base) {
            final var key = base.key();
            return key != null ? key
                : new LinkLatencyKey(base.getLinkId());
        }
    
        @Override
        public Uint64 getBaselineRttUs() {
            return _baselineRttUs;
        }
        
        @Override
        public Uint64 getCurrentRttUs() {
            return _currentRttUs;
        }
        
        @Override
        public Long getDeviationUs() {
            return _deviationUs;
        }
        
        @Override
        public String getLastCheck() {
            return _lastCheck;
        }
        
        @Override
        public String getLinkId() {
            return _linkId;
        }
        
        @Override
        public String getStatus() {
            return _status;
        }
        
        @Override
        public Uint64 getThresholdUs() {
            return _thresholdUs;
        }
    
        
        
        
        
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = LinkLatency.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return LinkLatency.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return LinkLatency.bindingToString(this);
        }
    }
}
