package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.linkguard.status;
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
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.PortClassificationType;
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractEntryObject;
import org.opendaylight.yangtools.yang.common.Uint32;

/**
 * Class that builds {@link PortClassification} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     PortClassification createPortClassification(int fooXyzzy, int barBaz) {
 *         return new PortClassificationBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of PortClassification, as instances can be freely passed around without
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
 * @see PortClassification
 *
 */
@Generated("mdsal-binding-generator")
public class PortClassificationBuilder {

    private PortClassificationType _classification;
    private String _lastUpdated;
    private String _portId;
    private Uint32 _portNo;
    private String _status;
    private String _switchId;
    private PortClassificationKey key;


    Map<Class<? extends Augmentation<PortClassification>>, Augmentation<PortClassification>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public PortClassificationBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link PortClassification}.
     *
     * @param base PortClassification from which the builder should be initialized
     */
    public PortClassificationBuilder(final PortClassification base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this.key = base.key();
        this._portId = base.getPortId();
        this._classification = base.getClassification();
        this._lastUpdated = base.getLastUpdated();
        this._portNo = base.getPortNo();
        this._status = base.getStatus();
        this._switchId = base.getSwitchId();
    }



    /**
     * Return current value associated with the property corresponding to {@link PortClassification#key()}.
     *
     * @return current value
     */
    public PortClassificationKey key() {
        return key;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getClassification()}.
     *
     * @return current value
     */
    public PortClassificationType getClassification() {
        return _classification;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getLastUpdated()}.
     *
     * @return current value
     */
    public String getLastUpdated() {
        return _lastUpdated;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getPortId()}.
     *
     * @return current value
     */
    public String getPortId() {
        return _portId;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getPortNo()}.
     *
     * @return current value
     */
    public Uint32 getPortNo() {
        return _portNo;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getStatus()}.
     *
     * @return current value
     */
    public String getStatus() {
        return _status;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link PortClassification#getSwitchId()}.
     *
     * @return current value
     */
    public String getSwitchId() {
        return _switchId;
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
    public <E$$ extends Augmentation<PortClassification>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    /**
     * Set the key value corresponding to {@link PortClassification#key()} to the specified
     * value.
     *
     * @param key desired value
     * @return this builder
     */
    public PortClassificationBuilder withKey(final PortClassificationKey key) {
        this.key = key;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getClassification()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setClassification(final PortClassificationType value) {
        this._classification = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getLastUpdated()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setLastUpdated(final String value) {
        this._lastUpdated = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getPortId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setPortId(final String value) {
        this._portId = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getPortNo()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setPortNo(final Uint32 value) {
        this._portNo = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getStatus()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setStatus(final String value) {
        this._status = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link PortClassification#getSwitchId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public PortClassificationBuilder setSwitchId(final String value) {
        this._switchId = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public PortClassificationBuilder addAugmentation(Augmentation<PortClassification> augmentation) {
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
    public PortClassificationBuilder removeAugmentation(Class<? extends Augmentation<PortClassification>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link PortClassification} instance.
     *
     * @return A new {@link PortClassification} instance.
     */
    public @NonNull PortClassification build() {
        return new PortClassificationImpl(this);
    }

    private static final class PortClassificationImpl
        extends AbstractEntryObject<PortClassification, PortClassificationKey>
        implements PortClassification {
    
        private final PortClassificationType _classification;
        private final String _lastUpdated;
        private final String _portId;
        private final Uint32 _portNo;
        private final String _status;
        private final String _switchId;
    
        PortClassificationImpl(final PortClassificationBuilder base) {
            super(base.augmentation, extractKey(base));
            final var key = key();
            this._portId = key.getPortId();
            this._classification = base.getClassification();
            this._lastUpdated = base.getLastUpdated();
            this._portNo = base.getPortNo();
            this._status = base.getStatus();
            this._switchId = base.getSwitchId();
        }
        
        private static @NonNull PortClassificationKey extractKey(final PortClassificationBuilder base) {
            final var key = base.key();
            return key != null ? key
                : new PortClassificationKey(base.getPortId());
        }
    
        @Override
        public PortClassificationType getClassification() {
            return _classification;
        }
        
        @Override
        public String getLastUpdated() {
            return _lastUpdated;
        }
        
        @Override
        public String getPortId() {
            return _portId;
        }
        
        @Override
        public Uint32 getPortNo() {
            return _portNo;
        }
        
        @Override
        public String getStatus() {
            return _status;
        }
        
        @Override
        public String getSwitchId() {
            return _switchId;
        }
    
        
        
        
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = PortClassification.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return PortClassification.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return PortClassification.bindingToString(this);
        }
    }
}
