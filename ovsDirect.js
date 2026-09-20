// ovsDirect.js — Direct OVS enforcement via ovs-ofctl.
// Used where ODL's RESTCONF meter/flow translation has a confirmed device-sync
// gap (see odlSync.js comments + build report). This bypasses ODL for these
// specific operations and talks straight to Open vSwitch, which we verified
// works reliably. Confined to table 250, same isolated space odlSync.js uses.

import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const BRIDGE = "br-int";
const TABLE = 250;

let sudoAvailable = null;
async function isSudoPasswordless() {
  if (sudoAvailable !== null) return sudoAvailable;
  try {
    await execAsync("sudo -n true", { timeout: 500 });
    sudoAvailable = true;
  } catch {
    sudoAvailable = false;
  }
  return sudoAvailable;
}

async function runOfctl(args) {
  if (!(await isSudoPasswordless())) {
    return { success: false, error: "Passwordless sudo unavailable on host", skipped: true };
  }
  const cmd = `sudo -n ovs-ofctl -O OpenFlow13 ${args}`;
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 2000 });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), cmd };
  } catch (err) {
    return { success: false, error: err.message, cmd };
  }
}

/**
 * Create a real rate-limiting meter directly on OVS, and a flow that applies
 * it to traffic from a specific VM IP. Verified reliable (unlike the ODL
 * RESTCONF meter path, which has a device-sync bug in this ODL build).
 */
async function enforceBandwidthDirect(vmIp, meterId, rateKbps) {
  const burst = Math.max(100, Math.floor(rateKbps / 10));

  const meterResult = await runOfctl(
    `add-meter ${BRIDGE} "meter=${meterId},kbps,burst,band=type=drop,rate=${rateKbps},burst_size=${burst}"`,
  );
  if (!meterResult.success) return { success: false, step: "meter", ...meterResult };

  const flowResult = await runOfctl(
    `add-flow ${BRIDGE} "table=${TABLE},priority=600,ip,nw_src=${vmIp},actions=meter:${meterId},CONTROLLER:60"`,
  );
  if (!flowResult.success) return { success: false, step: "flow", ...flowResult };

  return { success: true, vmIp, meterId, rateKbps, bridge: BRIDGE, table: TABLE };
}

/**
 * Push an explicit DROP flow blocking traffic from a specific source IP.
 * Used for STRICT-isolation slices as a second, independent enforcement layer
 * on top of Neutron security groups (defense-in-depth, not a replacement).
 */
async function pushDenyFlow(sourceIp) {
  const result = await runOfctl(
    `add-flow ${BRIDGE} "table=${TABLE},priority=700,ip,nw_src=${sourceIp},actions=drop"`,
  );
  return { ...result, sourceIp, bridge: BRIDGE, table: TABLE };
}

async function removeDenyFlow(sourceIp) {
  const result = await runOfctl(`del-flows ${BRIDGE} "table=${TABLE},ip,nw_src=${sourceIp}"`);
  return { ...result, sourceIp };
}

async function dumpTable250() {
  const result = await runOfctl(`dump-flows ${BRIDGE} table=${TABLE}`);
  return result;
}

async function runVsctl(args) {
  if (!(await isSudoPasswordless())) {
    return { success: false, error: "Passwordless sudo unavailable on host", skipped: true };
  }
  const cmd = `sudo -n ovs-vsctl ${args}`;
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 2000 });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), cmd };
  } catch (err) {
    return { success: false, error: err.message, cmd };
  }
}
/**
 * Guarantee a minimum egress rate for a specific VM's OVS port using a real
 * Linux HTB queue (min-rate), applied directly via ovs-vsctl. This is a
 * genuine bandwidth floor enforced by OVS's own traffic-control layer -
 * independent of, and complementary to, the ovs-ofctl meter used for the
 * ceiling in enforceBandwidthDirect. Bypasses Neutron QoS / Nova Placement
 * entirely: on this DevStack, a Neutron minimum_bandwidth rule blocks Nova
 * from creating ANY port on the network at all, because Nova requires
 * Placement bandwidth-resource tracking, which is not wired up and is
 * structurally incompatible with Geneve overlay networks (confirmed via
 * direct testing - see build notes). This direct-OVS approach sidesteps
 * that entirely, the same way enforceBandwidthDirect already bypasses
 * Neutron QoS for the ceiling.
 */
async function enforceMinBandwidthDirect(ovsInterfaceName, minRateKbps, maxRateKbps) {
  const minBps = Math.round(minRateKbps * 1000);
  const maxBps = Math.round(maxRateKbps * 1000);

  // Clear any existing QoS on this port first, so repeated calls (e.g. after
  // a slice's VM list or priority changes) don't leave orphaned queue
  // records behind on the port.
  await runVsctl(`--if-exists clear port ${ovsInterfaceName} qos`);

  const result = await runVsctl(
    `-- set port ${ovsInterfaceName} qos=@newqos ` +
    `-- --id=@newqos create qos type=linux-htb other-config:max-rate=${maxBps} queues=0=@q0 ` +
    `-- --id=@q0 create queue other-config:min-rate=${minBps} other-config:max-rate=${maxBps}`
  );

  if (!result.success) return { success: false, step: "htb-queue", ovsInterfaceName, ...result };
  return { success: true, ovsInterfaceName, minRateKbps, maxRateKbps };
}

async function runTc(args) {
  if (!(await isSudoPasswordless())) {
    return { success: false, error: "Passwordless sudo unavailable on host", skipped: true };
  }
  const cmd = `sudo -n tc ${args}`;
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 2000 });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim(), cmd };
  } catch (err) {
    return { success: false, error: err.message, cmd };
  }
}

async function enforceDualQueueDirect(ovsInterfaceName, minRateKbpsPriority, maxRateKbps, dscpFastLaneKbps) {
  const minBps = Math.round(minRateKbpsPriority * 1000);
  const maxBps = Math.round(maxRateKbps * 1000);
  const fastLaneKbps = Math.max(100, dscpFastLaneKbps ?? Math.round(maxRateKbps * 0.1));
  const fastLaneBps = fastLaneKbps * 1000;

  await runVsctl(`--if-exists clear port ${ovsInterfaceName} qos`);

  const qosResult = await runVsctl(
    `-- set port ${ovsInterfaceName} qos=@newqos ` +
    `-- --id=@newqos create qos type=linux-htb other-config:max-rate=${maxBps} queues:0=@q0 queues:1=@q1 ` +
    `-- --id=@q0 create queue other-config:min-rate=${minBps} other-config:max-rate=${maxBps} ` +
    `-- --id=@q1 create queue other-config:min-rate=${fastLaneBps} other-config:max-rate=${maxBps} other-config:priority=0`
  );
  if (!qosResult.success) return { success: false, step: "dual-htb-queue", ovsInterfaceName, ...qosResult };

  let classReady = false;
  for (let i = 0; i < 10; i++) {
    const check = await runTc(`class show dev ${ovsInterfaceName}`);
    if (check.success && check.stdout.includes("1:2")) { classReady = true; break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!classReady) {
    return { success: false, step: "class-1-2-not-ready", ovsInterfaceName, minRateKbpsPriority, maxRateKbps, fastLaneKbps };
  }

  const filterResult = await runTc(
    `filter add dev ${ovsInterfaceName} parent 1: protocol ip prio 1 u32 match ip tos 0xb8 0xff flowid 1:2`
  );
  if (!filterResult.success) return { success: false, step: "dscp-filter", ovsInterfaceName, ...filterResult };

  return { success: true, ovsInterfaceName, minRateKbpsPriority, maxRateKbps, fastLaneKbps };
}

/**
 * Drift detector for persistence reconciliation: checks whether a port's
 * current QoS is still the real linux-htb config, or has silently reverted
 * to OVN's linux-noop default (e.g. after br-int is rebuilt, a vswitchd
 * restart, or VM migration). Read-only - never modifies anything.
 */
async function isQueueConfigured(ovsInterfaceName) {
  const qosLookup = await runVsctl(`--if-exists get port ${ovsInterfaceName} qos`);
  if (!qosLookup.success) return { configured: false, reason: "lookup-failed", error: qosLookup.error };
  const qosUuid = (qosLookup.stdout || "").replace(/"/g, "").trim();
  if (!qosUuid || qosUuid === "[]") return { configured: false, reason: "no-qos-assigned" };
  const typeLookup = await runVsctl(`--if-exists get qos ${qosUuid} type`);
  const qosType = (typeLookup.stdout || "").replace(/"/g, "").trim();
  if (qosType !== "linux-htb") return { configured: false, reason: "wrong-qos-type", qosType };
  return { configured: true, qosUuid };
}

/**
 * Undo of enforceDualQueueDirect: detaches the port's QoS (removing the
 * OVS Queue/QoS rows) and deletes the HTB qdisc + DSCP classifier tc
 * filter. Used when a slice's priority/latency requirement no longer
 * needs a guaranteed fast lane, or when the slice is deleted - so the
 * old guarantee doesn't keep silently running on the interface.
 * Safe to call even if nothing is configured (both steps are no-ops
 * in that case).
 */
async function clearQueueDirect(ovsInterfaceName) {
  const qosResult = await runVsctl(`--if-exists clear port ${ovsInterfaceName} qos`);
  const tcResult = await runTc(`qdisc del dev ${ovsInterfaceName} root`);
  return {
    success: qosResult.success,
    ovsInterfaceName,
    qosCleared: qosResult.success,
    tcCleared: tcResult.success,
    note: "QoS detached; HTB qdisc removal attempted (no-op if none existed)",
  };
}


/**
 * True packets-per-second enforcement via a tc ingress policer, not an
 * nftables/netfilter rule. Netfilter's hooks (where an earlier version of
 * this function lived) are never invoked for VM-to-VM traffic switched
 * entirely within OVS's own datapath - OVS bypasses the kernel's standard
 * netfilter hooks for ports on the same bridge, confirmed empirically: an
 * nftables limit rule on this exact topology saw 0 packet hits under a
 * flood test. tc's ingress qdisc hooks at the netdev level itself instead
 * - the same layer enforceDualQueueDirect's egress HTB queue already
 * relies on - which OVS still passes through when delivering frames
 * to/from a tap device, and which the flood test confirmed does see and
 * drop traffic correctly.
 *
 * Uses tc's `police` action with `pkts_rate` (genuine packet-count based
 * policing), not a byte-rate approximation - so the enforced number means
 * exactly "N packets per second," not "however many packets fit in N
 * bytes/sec assuming some estimated average packet size."
 *
 * Lives on the interface's ingress qdisc - entirely separate from OVN's
 * Northbound/Southbound state (can't be wiped by ovn-controller's
 * reconciliation) and from OVS's own QoS/queue records, which only govern
 * the egress/root qdisc (so this never conflicts with the HTB bandwidth
 * queue enforceDualQueueDirect manages on the same interface).
 */
async function enforcePpsLimitDirect(ovsInterfaceName, maxPps) {
  // Clear first so repeated calls (slice updates) don't stack duplicate
  // filters on top of each other.
  await runTc(`qdisc del dev ${ovsInterfaceName} ingress`);

  const qdiscResult = await runTc(`qdisc add dev ${ovsInterfaceName} handle ffff: ingress`);
  if (!qdiscResult.success) return { success: false, step: "pps-ingress-qdisc", ovsInterfaceName, maxPps, ...qdiscResult };

  const burst = Math.max(5, Math.round(maxPps * 0.1));
  const filterResult = await runTc(
    `filter add dev ${ovsInterfaceName} parent ffff: matchall action police pkts_rate ${maxPps} pkts_burst ${burst} drop`
  );
  if (!filterResult.success) return { success: false, step: "pps-filter", ovsInterfaceName, maxPps, ...filterResult };

  return { success: true, ovsInterfaceName, maxPps };
}

/**
 * Undo of enforcePpsLimitDirect: removes the interface's ingress qdisc
 * entirely, which takes its attached policer filter down with it. Safe to
 * call even if none exists - a "Cannot find device" / "No such file or
 * directory" style error from a not-present qdisc is treated as
 * already-clear, not a failure.
 */
async function clearPpsLimitDirect(ovsInterfaceName) {
  const result = await runTc(`qdisc del dev ${ovsInterfaceName} ingress`);
  return {
    success: true,
    ovsInterfaceName,
    cleared: result.success,
    note: result.success ? "ingress qdisc removed" : "no existing pps ingress qdisc (already clear)",
  };
}

/**
 * Drift detector for the tc PPS policer, mirroring isQueueConfigured's
 * role for the HTB bandwidth queue. Read-only - never modifies anything.
 * Used by the persistence reconciliation loop to detect if the ingress
 * qdisc/filter was silently wiped (interface recreated, host reboot
 * before this process re-applies state, etc.) and needs restoring.
 */
async function isPpsConfigured(ovsInterfaceName) {
  const result = await runTc(`filter show dev ${ovsInterfaceName} parent ffff:`);
  if (!result.success) return { configured: false, reason: "no-ingress-qdisc" };
  const hasPolicer = /police/.test(result.stdout || "");
  return hasPolicer ? { configured: true } : { configured: false, reason: "no-pps-filter" };
}

export { enforceBandwidthDirect, enforceDualQueueDirect, pushDenyFlow, removeDenyFlow, dumpTable250, isQueueConfigured, clearQueueDirect, enforcePpsLimitDirect, clearPpsLimitDirect, isPpsConfigured };
