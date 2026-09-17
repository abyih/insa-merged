package org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806;
import com.google.common.util.concurrent.ListenableFuture;
import java.lang.Class;
import java.lang.FunctionalInterface;
import java.lang.Override;
import javax.annotation.processing.Generated;
import org.eclipse.jdt.annotation.NonNull;
import org.opendaylight.yang.svc.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.YangModuleInfoImpl;
import org.opendaylight.yangtools.binding.Rpc;
import org.opendaylight.yangtools.yang.common.QName;
import org.opendaylight.yangtools.yang.common.RpcResult;

/**
 *
 * <p>
 * This class represents the following YANG schema fragment defined in module <b>linkguard</b>
 * <pre>
 * rpc toggle {
 *   input input {
 *     leaf enabled {
 *       type boolean;
 *     }
 *   }
 *   output output {
 *     leaf status {
 *       type string;
 *     }
 *   }
 * }
 * </pre>
 *
 */
@FunctionalInterface
@Generated("mdsal-binding-generator")
public interface Toggle
    extends
    Rpc<ToggleInput, ToggleOutput>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("toggle");

    @Override
    ListenableFuture<RpcResult<ToggleOutput>> invoke(ToggleInput input);
    
    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Toggle> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Toggle.class;
    }

}

