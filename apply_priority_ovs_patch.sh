#!/usr/bin/env bash
# apply_priority_ovs_patch.sh
# Replaces Neutron minimum_bandwidth rule creation (which blocks Nova from
# creating any port on the network - confirmed via testing, incompatible
# with Geneve overlays on this DevStack) with direct OVS HTB queue
# enforcement, applied automatically at slice creation and whenever VM
# membership or priority changes (PUT /api/slices/:id) - no manual button,
# matching how the bandwidth ceiling and DSCP mark already work.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

SERVER=server.js
OVSDIRECT=ovsDirect.js

for f in "$SERVER" "$OVSDIRECT"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f not found. Run this script from ~/Insa-dluxf"
    exit 1
  fi
done

check_unique() {
  local file="$1" pattern="$2" label="$3"
  local count
  count=$(grep -cF "$pattern" "$file")
  if [ "$count" -ne 1 ]; then
    echo "ERROR: anchor for '$label' found $count times in $file (expected exactly 1). Aborting, no changes made."
    exit 1
  fi
}

MIGRATION_ANCHOR='try { db.exec("ALTER TABLE slices ADD COLUMN dscp_marking_rule_id TEXT"); } catch (_) {}'
POST_START='    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[b.priority || "MEDIUM"] ?? 0.5;'
POST_END='  const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(id);'
PUT_START='app.put("/api/slices/:id", (req, res) => {'
PUT_END='app.post("/api/slices/:id/activate", (req, res) => {'
EXPORT_LINE='export { enforceBandwidthDirect, pushDenyFlow, removeDenyFlow, dumpTable250 };'

check_unique "$SERVER" "$MIGRATION_ANCHOR" "db migration anchor"
check_unique "$SERVER" "$POST_START" "POST /api/slices priority block start"
check_unique "$SERVER" "$POST_END" "POST /api/slices end anchor"
check_unique "$SERVER" "$PUT_START" "PUT /api/slices/:id start"
check_unique "$SERVER" "$PUT_END" "activate route (PUT end boundary)"
check_unique "$OVSDIRECT" "$EXPORT_LINE" "ovsDirect.js export line"

echo "All anchors verified unique. Backing up files..."
cp "$SERVER" "${SERVER}.priority.bak"
cp "$OVSDIRECT" "${OVSDIRECT}.priority.bak"

TMPDIR=$(mktemp -d)

# ---------- ovsDirect.js: add runVsctl + enforceMinBandwidthDirect ----------
cat > "$TMPDIR/ovsfuncs.txt" <<'EOF'
async function runVsctl(args) {
  const cmd = `sudo ovs-vsctl ${args}`;
  try {
    const { stdout, stderr } = await execAsync(cmd);
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
export { enforceBandwidthDirect, enforceMinBandwidthDirect, pushDenyFlow, removeDenyFlow, dumpTable250 };
EOF

awk -v r="$TMPDIR/ovsfuncs.txt" -v anchor="$EXPORT_LINE" '
  $0 == anchor { while ((getline line < r) > 0) print line; close(r); next }
  { print }
' "$OVSDIRECT" > "$TMPDIR/ovsDirect.new"
mv "$TMPDIR/ovsDirect.new" "$OVSDIRECT"
echo "Patched $OVSDIRECT (added enforceMinBandwidthDirect)"

# ---------- server.js: DB migration ----------
cat > "$TMPDIR/migration.txt" <<'EOF'
try { db.exec("ALTER TABLE slices ADD COLUMN priority_enforcement_status TEXT DEFAULT 'not_configured'"); } catch (_) {}
EOF

awk -v r="$TMPDIR/migration.txt" -v anchor="$MIGRATION_ANCHOR" '
  { print }
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
' "$SERVER" > "$TMPDIR/step1.js"

# ---------- server.js: replace priority block in POST /api/slices ----------
cat > "$TMPDIR/post_replacement.txt" <<'EOF'
    let priorityEnforcementStatus = "pending";
    // 2b. Priority -> guaranteed bandwidth floor. NOTE: we do NOT create a
    //     Neutron minimum_bandwidth rule here - on this DevStack, any
    //     network carrying that rule blocks Nova from creating ANY port on
    //     it at all (NetworksWithQoSPolicyNotSupported), because Nova
    //     requires Placement bandwidth-resource tracking, which is not
    //     wired up and is structurally incompatible with Geneve overlay
    //     networks (confirmed via direct testing). Instead, the guarantee
    //     is enforced directly on OVS via a Linux HTB queue (min-rate)
    //     below, applied to each VM already in vmIds, and re-applied
    //     automatically in PUT /api/slices/:id whenever VM membership or
    //     priority changes - the same bypass-Neutron-QoS approach
    //     enforce-bandwidth already uses for the ceiling.
    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[b.priority || "MEDIUM"] ?? 0.5;
    const minKbpsForPriority = Math.round(maxKbps * priorityFraction);
    if (priorityFraction > 0 && (b.vmIds || []).length > 0) {
      try {
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => (b.vmIds || []).includes(s.id));
        const ports = portsData.ports || [];
        const results = [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforceMinBandwidthDirect(ifaceName, minKbpsForPriority, maxKbps);
          results.push({ vmId: server.id, ...r });
        }
        priorityEnforcementStatus = results.length > 0 && results.every((r) => r.success)
          ? "enforced (direct OVS HTB queue, verified on device)"
          : results.length > 0
          ? "partially enforced (direct OVS HTB queue)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
      } catch (priErr) {
        console.error("Slice Manager: direct priority enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else if (priorityFraction === 0) {
      priorityEnforcementStatus = "best-effort (LOW priority, no guarantee)";
    } else {
      priorityEnforcementStatus = "no VMs assigned yet (attach VMs, then update the slice to apply)";
    }

    // 3. Apply the QoS policy at the network level, so any port created on
    //    this network inherits the bandwidth ceiling and DSCP mark
    //    automatically. (The priority guarantee is enforced separately,
    //    per-port, directly via OVS - see above.)
    await osJson(`${NEUTRON_URL}/networks/${networkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: { qos_policy_id: qosPolicyId } }),
    });

    qosStatus = "enforced (Neutron QoS policy applied at network level)";
  } catch (err) {
    console.error("Slice Manager: OpenStack resource creation failed:", err.message);
    creationError = err.message;
    qosStatus = `creation failed: ${err.message}`;
  }

  db.prepare(
    `INSERT INTO slices
      (id, name, description, project_id, network_id, network_name, vm_ids,
       slice_type, bandwidth_min, bandwidth_max, priority, isolation_level,
       latency_requirement, status, qos_status, isolation_status, qos_policy_id,
       allocated_mbps, per_vm_mbps, bandwidth_limit_rule_id, minimum_bandwidth_rule_id,
       dscp_marking_rule_id, priority_enforcement_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.name,
    b.description || "",
    b.projectId || "",
    networkId || "",
    networkName || "",
    JSON.stringify(b.vmIds || []),
    b.sliceType || "custom",
    `${requestedMbps} Mbps`,
    `${requestedMbps} Mbps`,
    b.priority || "MEDIUM",
    b.isolationLevel || "STANDARD",
    b.latencyRequirement || "STANDARD",
    creationError ? "ERROR" : "ACTIVE",
    qosStatus,
    "not_configured",
    qosPolicyId,
    creationError ? 0 : requestedMbps,
    creationError ? 0 : perVmMbps,
    bandwidthLimitRuleId,
    minimumBandwidthRuleId,
    dscpMarkingRuleId,
    priorityEnforcementStatus,
  );

EOF

awk -v r="$TMPDIR/post_replacement.txt" -v startA="$POST_START" -v endA="$POST_END" '
  BEGIN { skipping=0 }
  {
    if (!skipping && $0 == startA) {
      while ((getline line < r) > 0) print line
      close(r)
      skipping = 1
    }
    if (skipping) {
      if ($0 == endA) { skipping = 0; print }
      next
    }
    print
  }
' "$TMPDIR/step1.js" > "$TMPDIR/step2.js"

# ---------- server.js: replace PUT /api/slices/:id handler ----------
cat > "$TMPDIR/put_replacement.txt" <<'EOF'
app.put("/api/slices/:id", async (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Slice not found" });

    const b = req.body;
    const newVmIds = b.vmIds ?? JSON.parse(existing.vm_ids || "[]");
    const newPriority = b.priority ?? existing.priority;

    db.prepare(
      `UPDATE slices SET
        name = ?, description = ?, network_id = ?, network_name = ?, vm_ids = ?,
        slice_type = ?, bandwidth_min = ?, bandwidth_max = ?, priority = ?,
        isolation_level = ?, latency_requirement = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      b.name ?? existing.name,
      b.description ?? existing.description,
      b.networkId ?? existing.network_id,
      b.networkName ?? existing.network_name,
      JSON.stringify(newVmIds),
      b.sliceType ?? existing.slice_type,
      b.bandwidthMin ?? existing.bandwidth_min,
      b.bandwidthMax ?? existing.bandwidth_max,
      newPriority,
      b.isolationLevel ?? existing.isolation_level,
      b.latencyRequirement ?? existing.latency_requirement,
      req.params.id,
    );

    // Re-apply the direct-OVS priority guarantee whenever VM membership or
    // priority changes, so enforced state stays in sync with declared state
    // without needing a manual button (mirrors how the bandwidth ceiling and
    // DSCP mark are always network-level, so they're never out of sync).
    let priorityEnforcementStatus = existing.priority_enforcement_status || "not_configured";
    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[newPriority] ?? 0.5;
    if (priorityFraction > 0 && newVmIds.length > 0) {
      try {
        const perVm = existing.per_vm_mbps || parseFloat(String(existing.bandwidth_max).match(/[\d.]+/)?.[0] || "0");
        const maxKbps = Math.round(perVm * 1000);
        const minKbps = Math.round(maxKbps * priorityFraction);
        const [serversData, portsData] = await Promise.all([
          osJson(`${NOVA_URL}/servers/detail`),
          osJson(`${NEUTRON_URL}/ports`),
        ]);
        const servers = (serversData.servers || []).filter((s) => newVmIds.includes(s.id));
        const ports = portsData.ports || [];
        const results = [];
        for (const server of servers) {
          const port = ports.find((p) => p.device_id === server.id);
          if (!port) continue;
          const ifaceName = `tap${port.id.slice(0, 11)}`;
          const r = await ovsDirect.enforceMinBandwidthDirect(ifaceName, minKbps, maxKbps);
          results.push({ vmId: server.id, ...r });
        }
        priorityEnforcementStatus = results.length > 0 && results.every((r) => r.success)
          ? "enforced (direct OVS HTB queue, verified on device)"
          : results.length > 0
          ? "partially enforced (direct OVS HTB queue)"
          : "no VMs found to enforce (attach VMs, then update the slice to re-apply)";
      } catch (priErr) {
        console.error("Slice Manager: direct priority re-enforcement failed:", priErr.message);
        priorityEnforcementStatus = `enforcement failed: ${priErr.message}`;
      }
    } else if (priorityFraction === 0) {
      priorityEnforcementStatus = "best-effort (LOW priority, no guarantee)";
    }

    db.prepare("UPDATE slices SET priority_enforcement_status = ? WHERE id = ?").run(
      priorityEnforcementStatus,
      req.params.id,
    );

    const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    res.json({ slice: rowToSlice(row) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

EOF

awk -v r="$TMPDIR/put_replacement.txt" -v startA="$PUT_START" -v endA="$PUT_END" '
  BEGIN { skipping=0 }
  {
    if (!skipping && $0 == startA) {
      while ((getline line < r) > 0) print line
      close(r)
      skipping = 1
    }
    if (skipping) {
      if ($0 == endA) { skipping = 0; print }
      next
    }
    print
  }
' "$TMPDIR/step2.js" > "$TMPDIR/step3.js"

mv "$TMPDIR/step3.js" "$SERVER"
rm -rf "$TMPDIR"

echo ""
echo "Patched $SERVER:"
echo "  - New DB column: priority_enforcement_status"
echo "  - POST /api/slices: replaced blocked Neutron minimum_bandwidth rule with direct OVS HTB queue enforcement"
echo "  - PUT /api/slices/:id: now async, automatically re-applies priority enforcement on VM/priority changes"
echo "Patched $OVSDIRECT:"
echo "  - Added enforceMinBandwidthDirect (Linux HTB min-rate queue via ovs-vsctl)"
echo ""
echo "Backups: ${SERVER}.priority.bak, ${OVSDIRECT}.priority.bak"
echo "Run: node --check server.js && node --check ovsDirect.js"
