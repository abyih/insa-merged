package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
import java.lang.IllegalArgumentException;
import java.lang.NullPointerException;
import java.lang.Override;
import java.lang.String;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.eclipse.jdt.annotation.Nullable;
import org.opendaylight.yangtools.binding.EnumTypeObject;
import org.opendaylight.yangtools.binding.lib.CodeHelpers;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * typedef port-classification-type {
 *   type enumeration {
 *     enum TRUSTED;
 *     enum UNTRUSTED;
 *     enum SWITCH_FACING;
 *     enum HOST_FACING;
 *     enum RECOVERING;
 *   }
 * }
 * </pre>
 *
 */
@Generated("mdsal-binding-generator")
public enum PortClassificationType implements EnumTypeObject {
    TRUSTED(0, "TRUSTED"),
    
    UNTRUSTED(1, "UNTRUSTED"),
    
    SWITCHFACING(2, "SWITCH_FACING"),
    
    HOSTFACING(3, "HOST_FACING"),
    
    RECOVERING(4, "RECOVERING")
    ;

    private final @NonNull String name;
    private final int value;

    private PortClassificationType(int value, @NonNull String name) {
        this.value = value;
        this.name = name;
    }

    @Override
    public @NonNull String getName() {
        return name;
    }

    @Override
    public int getIntValue() {
        return value;
    }

    /**
     * Return the enumeration member whose {@link #getName()} matches specified assigned name.
     *
     * @param name YANG assigned name
     * @return corresponding PortClassificationType item, or {@code null} if no such item exists
     * @throws NullPointerException if {@code name} is null
     */
    public static @Nullable PortClassificationType forName(String name) {
        return switch (name) {
            case "TRUSTED" -> TRUSTED;
            case "UNTRUSTED" -> UNTRUSTED;
            case "SWITCH_FACING" -> SWITCHFACING;
            case "HOST_FACING" -> HOSTFACING;
            case "RECOVERING" -> RECOVERING;
            default -> null;
        };
    }

    /**
     * Return the enumeration member whose {@link #getIntValue()} matches specified value.
     *
     * @param intValue integer value
     * @return corresponding PortClassificationType item, or {@code null} if no such item exists
     */
    public static @Nullable PortClassificationType forValue(int intValue) {
        return switch (intValue) {
            case 0 -> TRUSTED;
            case 1 -> UNTRUSTED;
            case 2 -> SWITCHFACING;
            case 3 -> HOSTFACING;
            case 4 -> RECOVERING;
            default -> null;
        };
    }

    /**
     * Return the enumeration member whose {@link #getName()} matches specified assigned name.
     *
     * @param name YANG assigned name
     * @return corresponding PortClassificationType item
     * @throws NullPointerException if {@code name} is null
     * @throws IllegalArgumentException if {@code name} does not match any item
     */
    public static @NonNull PortClassificationType ofName(String name) {
        return CodeHelpers.checkEnum(forName(name), name);
    }

    /**
     * Return the enumeration member whose {@link #getIntValue()} matches specified value.
     *
     * @param intValue integer value
     * @return corresponding PortClassificationType item
     * @throws IllegalArgumentException if {@code intValue} does not match any item
     */
    public static @NonNull PortClassificationType ofValue(int intValue) {
        return CodeHelpers.checkEnum(forValue(intValue), intValue);
    }
}
