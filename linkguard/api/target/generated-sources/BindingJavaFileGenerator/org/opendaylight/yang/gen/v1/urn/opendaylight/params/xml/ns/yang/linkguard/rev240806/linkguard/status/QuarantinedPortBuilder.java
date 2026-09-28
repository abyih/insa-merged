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
import org.opendaylight.yangtools.yang.common.Uint16;

/**
 * Class that builds {@link QuarantinedPort} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     QuarantinedPort createQuarantinedPort(int fooXyzzy, int barBaz) {
 *         return new QuarantinedPortBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of QuarantinedPort, as instances can be freely passed around without
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
 * @see QuarantinedPort
 *
 */
@Generated("mdsal-binding-generator")
public class QuarantinedPortBuilder {

    private Uint16 _attempts;
    private String _nextAttemptAt;
    private String _portId;
    private String _state;
    private QuarantinedPortKey key;


    Map<Class<? extends Augmentation<QuarantinedPort>>, Augmentation<QuarantinedPort>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public QuarantinedPortBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link QuarantinedPort}.
     *
     * @param base QuarantinedPort from which the builder should be initialized
     */
    public QuarantinedPortBuilder(final QuarantinedPort base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this.key = base.key();
        this._portId = base.getPortId();
        this._attempts = base.getAttempts();
        this._nextAttemptAt = base.getNextAttemptAt();
        this._state = base.getState();
    }



    /**
     * Return current value associated with the property corresponding to {@link QuarantinedPort#key()}.
     *
     * @return current value
     */
    public QuarantinedPortKey key() {
        return key;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link QuarantinedPort#getAttempts()}.
     *
     * @return current value
     */
    public Uint16 getAttempts() {
        return _attempts;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link QuarantinedPort#getNextAttemptAt()}.
     *
     * @return current value
     */
    public String getNextAttemptAt() {
        return _nextAttemptAt;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link QuarantinedPort#getPortId()}.
     *
     * @return current value
     */
    public String getPortId() {
        return _portId;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link QuarantinedPort#getState()}.
     *
     * @return current value
     */
    public String getState() {
        return _state;
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
    public <E$$ extends Augmentation<QuarantinedPort>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    /**
     * Set the key value corresponding to {@link QuarantinedPort#key()} to the specified
     * value.
     *
     * @param key desired value
     * @return this builder
     */
    public QuarantinedPortBuilder withKey(final QuarantinedPortKey key) {
        this.key = key;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link QuarantinedPort#getAttempts()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public QuarantinedPortBuilder setAttempts(final Uint16 value) {
        this._attempts = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link QuarantinedPort#getNextAttemptAt()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public QuarantinedPortBuilder setNextAttemptAt(final String value) {
        this._nextAttemptAt = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link QuarantinedPort#getPortId()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public QuarantinedPortBuilder setPortId(final String value) {
        this._portId = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link QuarantinedPort#getState()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public QuarantinedPortBuilder setState(final String value) {
        this._state = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public QuarantinedPortBuilder addAugmentation(Augmentation<QuarantinedPort> augmentation) {
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
    public QuarantinedPortBuilder removeAugmentation(Class<? extends Augmentation<QuarantinedPort>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link QuarantinedPort} instance.
     *
     * @return A new {@link QuarantinedPort} instance.
     */
    public @NonNull QuarantinedPort build() {
        return new QuarantinedPortImpl(this);
    }

    private static final class QuarantinedPortImpl
        extends AbstractEntryObject<QuarantinedPort, QuarantinedPortKey>
        implements QuarantinedPort {
    
        private final Uint16 _attempts;
        private final String _nextAttemptAt;
        private final String _portId;
        private final String _state;
    
        QuarantinedPortImpl(final QuarantinedPortBuilder base) {
            super(base.augmentation, extractKey(base));
            final var key = key();
            this._portId = key.getPortId();
            this._attempts = base.getAttempts();
            this._nextAttemptAt = base.getNextAttemptAt();
            this._state = base.getState();
        }
        
        private static @NonNull QuarantinedPortKey extractKey(final QuarantinedPortBuilder base) {
            final var key = base.key();
            return key != null ? key
                : new QuarantinedPortKey(base.getPortId());
        }
    
        @Override
        public Uint16 getAttempts() {
            return _attempts;
        }
        
        @Override
        public String getNextAttemptAt() {
            return _nextAttemptAt;
        }
        
        @Override
        public String getPortId() {
            return _portId;
        }
        
        @Override
        public String getState() {
            return _state;
        }
    
        
        
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = QuarantinedPort.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return QuarantinedPort.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return QuarantinedPort.bindingToString(this);
        }
    }
}
