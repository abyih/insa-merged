#!/usr/bin/env python3
"""
patch_queue_cleanup.py
------------------------
Adds the missing cleanup half of the persistence requirement:
  - clearQueueDirect(): new function in ovsDirect.js that removes a port's
    OVS QoS assignment and HTB qdisc (the undo of enforceDualQueueDirect).
  - Called in PUT /api/slices/:id when a slice's priority/latency no longer
    needs a fast lane (e.g. LOW -> STANDARD), so the old guarantee doesn't
    keep running silently.
  - Called in DELETE /api/slices/:id, before the slice record is removed,
    so a deleted slice doesn't leave a stale queue on its VMs' ports.

Same safety pattern as this project's own apply_*_patch.sh scripts:
each anchor must appear EXACTLY ONCE in the target file, or the whole
script aborts with NO changes made to that file.

Run from the project root: python3 patch_queue_cleanup.py
"""

import re

# ---------------------------------------------------------------------------
# Patch 1: ovsDirect.js — add clearQueueDirect()
# ---------------------------------------------------------------------------

OVSDIRECT = "ovsDirect.js"
with open(OVSDIRECT, "r") as f:
    ovs_content = f.read()

if "clearQueueDirect" in ovs_content:
    print(f"Skipping {OVSDIRECT}: clearQueueDirect already present (already patched).")
    ovs_already_patched = True
else:
    ovs_already_patched = False
    OLD_EXPORT = 'export { enforceBandwidthDirect, enforceDualQueueDirect, pushDenyFlow, removeDenyFlow, dumpTable250, isQueueConfigured };'

    count = ovs_content.count(OLD_EXPORT)
    if count != 1:
        print(f"ABORTING {OVSDIRECT}: export anchor found {count} times (expected 1). No changes made.")
        raise SystemExit(1)

NEW_FUNCTION_AND_EXPORT = '''
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

export { enforceBandwidthDirect, enforceDualQueueDirect, pushDenyFlow, removeDenyFlow, dumpTable250, isQueueConfigured, clearQueueDirect };'''

if not ovs_already_patched:
    ovs_content = ovs_content.replace(OLD_EXPORT, NEW_FUNCTION_AND_EXPORT)
    with open(OVSDIRECT, "w") as f:
        f.write(ovs_content)
    print(f"Patched {OVSDIRECT}: added clearQueueDirect() and updated export.")


# ---------------------------------------------------------------------------
# Patch 2: server.js — call cleanup on latency downgrade (PUT) and on delete
# ---------------------------------------------------------------------------

SERVER = "server.js"
with open(SERVER, "r") as f:
    server_content = f.read()

# --- 2a. PUT handler: replace the "else if (priorityFraction === 0)" branch
#          with one that actively clears any leftover queue config. ---
OLD_ELSE_BLOCK = '''      } catch (priErr) {
        console.error("Slice Manager: direct priority re-enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else if (priorityFraction === 0) {
      priorityEnforcementStatus = "best-effort (LOW priority, no guarantee)";
    }'''

count = server_content.count(OLD_ELSE_BLOCK)
if count != 1:
    print(f"ABORTING {SERVER} (PUT cleanup): anchor found {count} times (expected 1). No changes made to {SERVER}.")
    raise SystemExit(1)

NEW_ELSE_BLOCK = '''      } catch (priErr) {
        console.error("Slice Manager: direct priority re-enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else {
      // Priority/latency no longer needs a queue guarantee (e.g. downgraded
      // from LOW to STANDARD). Actively remove any leftover OVS queue + tc
      // filter so it doesn't keep enforcing a guarantee the slice no longer
      // declares - this is the cleanup half of the persistence requirement.
      try {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ports = portsData.ports || [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearQueueDirect(ifaceName);
        }
        priorityEnforcementStatus = "best-effort (no priority/latency guarantee; queue cleared)";
      } catch (clearErr) {
        console.error("Slice Manager: queue cleanup failed:", clearErr.message);
        priorityEnforcementStatus = `best-effort (queue cleanup failed: ${clearErr.message})`;
      }
    }'''

server_content = server_content.replace(OLD_ELSE_BLOCK, NEW_ELSE_BLOCK)

# --- 2b. DELETE handler: clear queues on each VM port before removing the
#          slice record. ---
OLD_CLEANUP_DECL = "    const cleanupErrors = [];"

count = server_content.count(OLD_CLEANUP_DECL)
if count != 1:
    print(f"ABORTING {SERVER} (DELETE cleanup): anchor found {count} times (expected 1). No changes made to {SERVER}.")
    raise SystemExit(1)

NEW_CLEANUP_DECL = '''    const cleanupErrors = [];

    // Clean up the direct-OVS priority queue (HTB + tc classifier) on each
    // VM's port before removing the slice record, so a deleted slice
    // doesn't leave a stale bandwidth guarantee running on the interface.
    try {
      const vmIdsForCleanup = JSON.parse(slice.vm_ids || "[]");
      if (vmIdsForCleanup.length > 0) {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => vmIdsForCleanup.includes(s.id));
        const ports = portsData.ports || [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          await ovsDirect.clearQueueDirect(ifaceName);
        }
      }
    } catch (queueCleanupErr) {
      cleanupErrors.push(`queue cleanup: ${queueCleanupErr.message}`);
    }'''

server_content = server_content.replace(OLD_CLEANUP_DECL, NEW_CLEANUP_DECL)

with open(SERVER, "w") as f:
    f.write(server_content)

print(f"Patched {SERVER}: added queue cleanup on latency-downgrade (PUT) and on delete (DELETE).")
print("Done. Run: node --check server.js && node --check ovsDirect.js")
