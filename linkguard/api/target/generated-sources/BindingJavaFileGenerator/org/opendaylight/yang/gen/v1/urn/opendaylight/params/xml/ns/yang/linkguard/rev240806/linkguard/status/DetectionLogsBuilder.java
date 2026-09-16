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
import org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.AttackType;
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractEntryObject;

/**
 * Class that builds {@link DetectionLogs} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     DetectionLogs createDetectionLogs(int fooXyzzy, int barBaz) {
 *         return new DetectionLogsBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of DetectionLogs, as instances can be freely passed around without
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
 * @see DetectionLogs
 *
 */
@Generated("mdsal-binding-generator")
public class DetectionLogsBuilder {

    private AttackType _attackType;
    private String _details;
    private String _portId;
    private String _severity;
    private String _source;
    private String _timestamp;
    private DetectionLogsKey key;


    Map<Class<? extends Augmentation<DetectionLogs>>, Augmentation<DetectionLogs>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public DetectionLogsBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link DetectionLogs}.
     *
     * @param base DetectionLogs from which the builder should be initialized
     */
    public DetectionLogsBuilder(final DetectionLogs base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this.key = base.key();
        this._portId = base.getPortId();
        this._attackType = base.getAttackType();
        this._details = base.getDetails();
        this._severity = base.getSeverity();
        this._source = base.getSource();
        this._timestamp = base.getTimestamp();
    }



    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#key()}.
     *
     * @return current value
     */
    public DetectionLogsKey key() {
        return key;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getAttackType()}.
     *
     * @return current value
     */
    public AttackType getAttackType() {
        return _attackType;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getDetails()}.
     *
     * @return current value
     */
    public String getDetails() {
        return _details;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getPortId()}.
     *
     * @return current value
     */
    public String getPortId() {
        return _portId;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getSeverity()}.
     *
     * @return current value
     */
    public String getSeverity() {
        return _severity;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getSource()}.
     *
     * @return current value
     */
    public String getSource() {
        return _source;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link DetectionLogs#getTimestamp()}.
     *
     * @return current value
     */
    public String getTimestamp() {
        return _timestamp;
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
    public <E$$ extends Augmentation<DetectionLogs>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    /**
     * Set the key value corresponding to {@link DetectionLogs#key()} to the specified
     * value.
     *
     * @param key desired value
     * @return this builder
     */
    public DetectionLogsBuilder withKey(final DetectionLogsKey key) {
        this.key = key;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getAttackType()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setAttackType(final AttackType value) {
        this._attackType = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getDetails()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setDetails(final String value) {
        this._details = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getPortId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setPortId(final String value) {
        this._portId = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getSeverity()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setSeverity(final String value) {
        this._severity = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getSource()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setSource(final String value) {
        this._source = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link DetectionLogs#getTimestamp()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public DetectionLogsBuilder setTimestamp(final String value) {
        this._timestamp = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public DetectionLogsBuilder addAugmentation(Augmentation<DetectionLogs> augmentation) {
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
    public DetectionLogsBuilder removeAugmentation(Class<? extends Augmentation<DetectionLogs>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link DetectionLogs} instance.
     *
     * @return A new {@link DetectionLogs} instance.
     */
    public @NonNull DetectionLogs build() {
        return new DetectionLogsImpl(this);
    }

    private static final class DetectionLogsImpl
        extends AbstractEntryObject<DetectionLogs, DetectionLogsKey>
        implements DetectionLogs {
    
        private final AttackType _attackType;
        private final String _details;
        private final String _portId;
        private final String _severity;
        private final String _source;
        private final String _timestamp;
    
        DetectionLogsImpl(final DetectionLogsBuilder base) {
            super(base.augmentation, extractKey(base));
            final var key = key();
            this._portId = key.getPortId();
            this._attackType = base.getAttackType();
            this._details = base.getDetails();
            this._severity = base.getSeverity();
            this._source = base.getSource();
            this._timestamp = base.getTimestamp();
        }
        
        private static @NonNull DetectionLogsKey extractKey(final DetectionLogsBuilder base) {
            final var key = base.key();
            return key != null ? key
                : new DetectionLogsKey(base.getPortId());
        }
    
        @Override
        public AttackType getAttackType() {
            return _attackType;
        }
        
        @Override
        public String getDetails() {
            return _details;
        }
        
        @Override
        public String getPortId() {
            return _portId;
        }
        
        @Override
        public String getSeverity() {
            return _severity;
        }
        
        @Override
        public String getSource() {
            return _source;
        }
        
        @Override
        public String getTimestamp() {
            return _timestamp;
        }
    
        
        
        
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = DetectionLogs.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return DetectionLogs.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return DetectionLogs.bindingToString(this);
        }
    }
}
