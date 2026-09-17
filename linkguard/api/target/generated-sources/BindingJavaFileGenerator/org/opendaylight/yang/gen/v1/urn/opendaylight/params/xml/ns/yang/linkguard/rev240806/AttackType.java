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
 * typedef attack-type {
 *   type enumeration {
 *     enum TOPOLOGY_POISONING;
 *     enum SIGNATURE_FORGERY;
 *     enum FLOODING;
 *     enum PERMANENT_LOCKOUT;
 *     enum MANUAL_ROLLBACK;
 *     enum INJECTION;
 *     enum RELAY;
 *   }
 * }
 * </pre>
 *
 */
@Generated("mdsal-binding-generator")
public enum AttackType implements EnumTypeObject {
    TOPOLOGYPOISONING(0, "TOPOLOGY_POISONING"),
    
    SIGNATUREFORGERY(1, "SIGNATURE_FORGERY"),
    
    FLOODING(2, "FLOODING"),
    
    PERMANENTLOCKOUT(3, "PERMANENT_LOCKOUT"),
    
    MANUALROLLBACK(4, "MANUAL_ROLLBACK"),
    
    INJECTION(5, "INJECTION"),
    
    RELAY(6, "RELAY")
    ;

    private final @NonNull String name;
    private final int value;

    private AttackType(int value, @NonNull String name) {
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
     * @return corresponding AttackType item, or {@code null} if no such item exists
     * @throws NullPointerException if {@code name} is null
     */
    public static @Nullable AttackType forName(String name) {
        return switch (name) {
            case "TOPOLOGY_POISONING" -> TOPOLOGYPOISONING;
            case "SIGNATURE_FORGERY" -> SIGNATUREFORGERY;
            case "FLOODING" -> FLOODING;
            case "PERMANENT_LOCKOUT" -> PERMANENTLOCKOUT;
            case "MANUAL_ROLLBACK" -> MANUALROLLBACK;
            case "INJECTION" -> INJECTION;
            case "RELAY" -> RELAY;
            default -> null;
        };
    }

    /**
     * Return the enumeration member whose {@link #getIntValue()} matches specified value.
     *
     * @param intValue integer value
     * @return corresponding AttackType item, or {@code null} if no such item exists
     */
    public static @Nullable AttackType forValue(int intValue) {
        return switch (intValue) {
            case 0 -> TOPOLOGYPOISONING;
            case 1 -> SIGNATUREFORGERY;
            case 2 -> FLOODING;
            case 3 -> PERMANENTLOCKOUT;
            case 4 -> MANUALROLLBACK;
            case 5 -> INJECTION;
            case 6 -> RELAY;
            default -> null;
        };
    }

    /**
     * Return the enumeration member whose {@link #getName()} matches specified assigned name.
     *
     * @param name YANG assigned name
     * @return corresponding AttackType item
     * @throws NullPointerException if {@code name} is null
     * @throws IllegalArgumentException if {@code name} does not match any item
     */
    public static @NonNull AttackType ofName(String name) {
        return CodeHelpers.checkEnum(forName(name), name);
    }

    /**
     * Return the enumeration member whose {@link #getIntValue()} matches specified value.
     *
     * @param intValue integer value
     * @return corresponding AttackType item
     * @throws IllegalArgumentException if {@code intValue} does not match any item
     */
    public static @NonNull AttackType ofValue(int intValue) {
        return CodeHelpers.checkEnum(forValue(intValue), intValue);
    }
}
