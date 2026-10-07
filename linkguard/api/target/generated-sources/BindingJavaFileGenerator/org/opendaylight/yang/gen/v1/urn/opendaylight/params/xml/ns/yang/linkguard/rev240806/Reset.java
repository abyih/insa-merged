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
 * rpc reset {
 *   output output {
 *     leaf status {
 *       type string;
 *     }
 *     leaf message {
 *       type string;
 *     }
 *   }
 * }
 * </pre>
 *
 */
@FunctionalInterface
@Generated("mdsal-binding-generator")
public interface Reset
    extends
    Rpc<ResetInput, ResetOutput>
{



    /**
     * YANG identifier of the statement represented by this class.
     */
    public static final @NonNull QName QNAME = YangModuleInfoImpl.qnameOf("reset");

    @Override
    ListenableFuture<RpcResult<ResetOutput>> invoke(ResetInput input);
    
    @Override
    default Class<org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Reset> implementedInterface() {
        return org.opendaylight.yang.gen.v1.urn.opendaylight.params.xml.ns.yang.linkguard.rev240806.Reset.class;
    }

}

