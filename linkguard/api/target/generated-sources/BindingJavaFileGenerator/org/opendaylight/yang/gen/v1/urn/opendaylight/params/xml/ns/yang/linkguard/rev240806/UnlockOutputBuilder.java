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
import org.opendaylight.yangtools.binding.Augmentation;
import org.opendaylight.yangtools.binding.lib.AbstractAugmentable;

/**
 * Class that builds {@link UnlockOutput} instances. Overall design of the class is that of a
 * <a href="https://en.wikipedia.org/wiki/Fluent_interface">fluent interface</a>, where method chaining is used.
 *
 * <p>
 * In general, this class is supposed to be used like this template:
 * <pre>
 *   <code>
 *     UnlockOutput createUnlockOutput(int fooXyzzy, int barBaz) {
 *         return new UnlockOutputBuilder()
 *             .setFoo(new FooBuilder().setXyzzy(fooXyzzy).build())
 *             .setBar(new BarBuilder().setBaz(barBaz).build())
 *             .build();
 *     }
 *   </code>
 * </pre>
 *
 * <p>
 * This pattern is supported by the immutable nature of UnlockOutput, as instances can be freely passed around without
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
 * @see UnlockOutput
 *
 */
@Generated("mdsal-binding-generator")
public class UnlockOutputBuilder {

    private String _message;
    private String _status;


    Map<Class<? extends Augmentation<UnlockOutput>>, Augmentation<UnlockOutput>> augmentation = Map.of();

    /**
     * Construct an empty builder.
     */
    public UnlockOutputBuilder() {
        // No-op
    }

    

    /**
     * Construct a builder initialized with state from specified {@link UnlockOutput}.
     *
     * @param base UnlockOutput from which the builder should be initialized
     */
    public UnlockOutputBuilder(final UnlockOutput base) {
        final var aug = base.augmentations();
        if (!aug.isEmpty()) {
            this.augmentation = new HashMap<>(aug);
        }
        this._message = base.getMessage();
        this._status = base.getStatus();
    }



    /**
     * Return current value associated with the property corresponding to {@link UnlockOutput#getMessage()}.
     *
     * @return current value
     */
    public String getMessage() {
        return _message;
    }
    
    /**
     * Return current value associated with the property corresponding to {@link UnlockOutput#getStatus()}.
     *
     * @return current value
     */
    public String getStatus() {
        return _status;
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
    public <E$$ extends Augmentation<UnlockOutput>> E$$ augmentation(Class<E$$> augmentationType) {
        return (E$$) augmentation.get(Objects.requireNonNull(augmentationType));
    }

    
    /**
     * Set the property corresponding to {@link UnlockOutput#getMessage()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public UnlockOutputBuilder setMessage(final String value) {
        this._message = value;
        return this;
    }
    
    /**
     * Set the property corresponding to {@link UnlockOutput#getStatus()} to the specified
     * value.
     *
     * @param value desired value
     * @return this builder
     */
    public UnlockOutputBuilder setStatus(final String value) {
        this._status = value;
        return this;
    }
    
    /**
      * Add an augmentation to this builder's product.
      *
      * @param augmentation augmentation to be added
      * @return this builder
      * @throws NullPointerException if {@code augmentation} is null
      */
    public UnlockOutputBuilder addAugmentation(Augmentation<UnlockOutput> augmentation) {
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
    public UnlockOutputBuilder removeAugmentation(Class<? extends Augmentation<UnlockOutput>> augmentationType) {
        if (this.augmentation instanceof HashMap) {
            this.augmentation.remove(augmentationType);
        }
        return this;
    }

    /**
     * A new {@link UnlockOutput} instance.
     *
     * @return A new {@link UnlockOutput} instance.
     */
    public @NonNull UnlockOutput build() {
        return new UnlockOutputImpl(this);
    }

    private static final class UnlockOutputImpl
        extends AbstractAugmentable<UnlockOutput>
        implements UnlockOutput {
    
        private final String _message;
        private final String _status;
    
        UnlockOutputImpl(final UnlockOutputBuilder base) {
            super(base.augmentation);
            this._message = base.getMessage();
            this._status = base.getStatus();
        }
    
        @Override
        public String getMessage() {
            return _message;
        }
        
        @Override
        public String getStatus() {
            return _status;
        }
    
        
    
        private int hash = 0;
        private volatile boolean hashValid = false;
        
        @Override
        public int hashCode() {
            if (hashValid) {
                return hash;
            }
        
            final int result = UnlockOutput.bindingHashCode(this);
            hash = result;
            hashValid = true;
            return result;
        }
    
        @Override
        public boolean equals(Object obj) {
            return UnlockOutput.bindingEquals(this, obj);
        }
    
        @Override
        public String toString() {
            return UnlockOutput.bindingToString(this);
        }
    }
}
