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
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractEntryObject;

/**
 * Class that builds {@link Anomaly} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     Anomaly createAnomaly(int fooXyzzy, int barBaz) {
 *         return new AnomalyBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of Anomaly, as instances can be freely passed around without
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
 * @see Anomaly
 *
 */
@Generated("mdsal-binding-generator")
public class AnomalyBuilder {

    private String _attackType;
    private String _details;
    private String _detectedAt;
    private String _id;
    private String _mitigationAction;
    private String _mitigationReason;
    private String _mitigationState;
    private String _severity;
    private String _source;
    private AnomalyKey key;


    Map<Class<? extends Augmentation<Anomaly>>, Augmentation<Anomaly>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public AnomalyBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link Anomaly}.
     *
     * @param base Anomaly from which the builder should be initialized
     */
    public AnomalyBuilder(final Anomaly base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this.key = base.key();
        this._id = base.getId();
        this._attackType = base.getAttackType();
        this._details = base.getDetails();
        this._detectedAt = base.getDetectedAt();
        this._mitigationAction = base.getMitigationAction();
        this._mitigationReason = base.getMitigationReason();
        this._mitigationState = base.getMitigationState();
        this._severity = base.getSeverity();
        this._source = base.getSource();
    }



    /**
     * Return current value associated with the property corresponding to {@link Anomaly#key()}.
     *
     * @return current value
     */
    public AnomalyKey key() {
        return key;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getAttackType()}.
     *
     * @return current value
     */
    public String getAttackType() {
        return _attackType;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getDetails()}.
     *
     * @return current value
     */
    public String getDetails() {
        return _details;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getDetectedAt()}.
     *
     * @return current value
     */
    public String getDetectedAt() {
        return _detectedAt;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getId()}.
     *
     * @return current value
     */
    public String getId() {
        return _id;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getMitigationAction()}.
     *
     * @return current value
     */
    public String getMitigationAction() {
        return _mitigationAction;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getMitigationReason()}.
     *
     * @return current value
     */
    public String getMitigationReason() {
        return _mitigationReason;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getMitigationState()}.
     *
     * @return current value
     */
    public String getMitigationState() {
        return _mitigationState;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getSeverity()}.
     *
     * @return current value
     */
    public String getSeverity() {
        return _severity;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link Anomaly#getSource()}.
     *
     * @return current value
     */
    public String getSource() {
        return _source;
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
    public <E$$ extends Augmentation<Anomaly>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    /**
     * Set the key value corresponding to {@link Anomaly#key()} to the specified
     * value.
     *
     * @param key desired value
     * @return this builder
     */
    public AnomalyBuilder withKey(final AnomalyKey key) {
        this.key = key;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getAttackType()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setAttackType(final String value) {
        this._attackType = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getDetails()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setDetails(final String value) {
        this._details = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getDetectedAt()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setDetectedAt(final String value) {
        this._detectedAt = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setId(final String value) {
        this._id = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getMitigationAction()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setMitigationAction(final String value) {
        this._mitigationAction = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getMitigationReason()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setMitigationReason(final String value) {
        this._mitigationReason = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getMitigationState()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setMitigationState(final String value) {
        this._mitigationState = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getSeverity()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setSeverity(final String value) {
        this._severity = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link Anomaly#getSource()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public AnomalyBuilder setSource(final String value) {
        this._source = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public AnomalyBuilder addAugmentation(Augmentation<Anomaly> augmentation) {
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
    public AnomalyBuilder removeAugmentation(Class<? extends Augmentation<Anomaly>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link Anomaly} instance.
     *
     * @return A new {@link Anomaly} instance.
     */
    public @NonNull Anomaly build() {
        return new AnomalyImpl(this);
    }

    private static final class AnomalyImpl
        extends AbstractEntryObject<Anomaly, AnomalyKey>
        implements Anomaly {
    
        private final String _attackType;
        private final String _details;
        private final String _detectedAt;
        private final String _id;
        private final String _mitigationAction;
        private final String _mitigationReason;
        private final String _mitigationState;
        private final String _severity;
        private final String _source;
    
        AnomalyImpl(final AnomalyBuilder base) {
            super(base.augmentation, extractKey(base));
            final var key = key();
            this._id = key.getId();
            this._attackType = base.getAttackType();
            this._details = base.getDetails();
            this._detectedAt = base.getDetectedAt();
            this._mitigationAction = base.getMitigationAction();
            this._mitigationReason = base.getMitigationReason();
            this._mitigationState = base.getMitigationState();
            this._severity = base.getSeverity();
            this._source = base.getSource();
        }
        
        private static @NonNull AnomalyKey extractKey(final AnomalyBuilder base) {
            final var key = base.key();
            return key != null ? key
                : new AnomalyKey(base.getId());
        }
    
        @Override
        public String getAttackType() {
            return _attackType;
        }
        
        @Override
        public String getDetails() {
            return _details;
        }
        
        @Override
        public String getDetectedAt() {
            return _detectedAt;
        }
        
        @Override
        public String getId() {
            return _id;
        }
        
        @Override
        public String getMitigationAction() {
            return _mitigationAction;
        }
        
        @Override
        public String getMitigationReason() {
            return _mitigationReason;
        }
        
        @Override
        public String getMitigationState() {
            return _mitigationState;
        }
        
        @Override
        public String getSeverity() {
            return _severity;
        }
        
        @Override
        public String getSource() {
            return _source;
        }
    
        
        
        
        
        
        
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = Anomaly.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return Anomaly.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return Anomaly.bindingToString(this);
        }
    }
}
