#!/usr/bin/env bash
# apply_qos_patch.sh
# Adds even-split bandwidth, priority (minimum_bandwidth) and latency
# (dscp_marking) Neutron QoS enforcement to POST /api/slices, plus a new
# POST /api/slices/:id/recompute-bandwidth endpoint.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

SERVER=server.js

if [ ! -f "$SERVER" ]; then
  echo "ERROR: $SERVER not found. Run this script from ~/Insa-dluxf"
  exit 1
fi

check_unique() {
  local file="$1" pattern="$2" label="$3"
  local count
  count=$(grep -cF "$pattern" "$file")
  if [ "$count" -ne 1 ]; then
    echo "ERROR: anchor for '$label' found $count times in $file (expected exactly 1). Aborting, no changes made."
    exit 1
  fi
}

ANCHOR_MIGRATION='try { db.exec("ALTER TABLE slices ADD COLUMN allocated_mbps REAL DEFAULT 0"); } catch (_) {}'
ANCHOR_CONST_BEFORE='function parseRateToKbps(str) {'
ANCHOR_BLOCK_START='  const id = randomUUID();'
ANCHOR_BLOCK_END='  const row = db.prepare("SELECT * FROM slices WHERE id = ?").get(id);'
ANCHOR_ROUTE_BEFORE='app.post("/api/slices/:id/enforce-bandwidth", async (req, res) => {'

check_unique "$SERVER" "$ANCHOR_MIGRATION" "db migration anchor"
check_unique "$SERVER" "$ANCHOR_CONST_BEFORE" "parseRateToKbps anchor"
check_unique "$SERVER" "$ANCHOR_BLOCK_START" "slice creation start anchor"
check_unique "$SERVER" "$ANCHOR_BLOCK_END" "slice creation end anchor"
check_unique "$SERVER" "$ANCHOR_ROUTE_BEFORE" "enforce-bandwidth route anchor"

echo "All anchors verified unique. Backing up $SERVER..."
cp "$SERVER" "${SERVER}.qos.bak"

TMPDIR=$(mktemp -d)

# ---------- Insert 1: new DB columns (insert AFTER migration anchor) ----------
cat > "$TMPDIR/migration.txt" <<'EOF'
try { db.exec("ALTER TABLE slices ADD COLUMN per_vm_mbps REAL DEFAULT 0"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN bandwidth_limit_rule_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN minimum_bandwidth_rule_id TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE slices ADD COLUMN dscp_marking_rule_id TEXT"); } catch (_) {}
EOF

awk -v r="$TMPDIR/migration.txt" -v anchor="$ANCHOR_MIGRATION" '
  { print }
  index($0, anchor) == 1 { while ((getline line < r) > 0) print line; close(r) }
' "$SERVER" > "$TMPDIR/step1.js"

# ---------- Insert 2: priority/latency constants (insert BEFORE parseRateToKbps) ----------
cat > "$TMPDIR/constants.txt" <<'EOF'
// ---- Priority -> guaranteed bandwidth floor (fraction of per-VM ceiling) ----
const PRIORITY_MIN_BANDWIDTH_FRACTION = { HIGH: 0.8, MEDIUM: 0.5, LOW: 0 };
// ---- Latency requirement -> DSCP marking value (46 = Expedited Forwarding) ----
const LATENCY_DSCP_VALUE = { LOW: 46, STANDARD: 0 };

EOF

awk -v r="$TMPDIR/constants.txt" -v anchor="$ANCHOR_CONST_BEFORE" '
  index($0, anchor) == 1 { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$TMPDIR/step1.js" > "$TMPDIR/step2.js"

# ---------- Replace: QoS creation block inside POST /api/slices ----------
cat > "$TMPDIR/replacement.txt" <<'EOF'
  const id = randomUUID();
  let networkId = null;
  let networkName = null;
  let qosPolicyId = null;
  let qosStatus = "pending";
  let creationError = null;
  let bandwidthLimitRuleId = null;
  let minimumBandwidthRuleId = null;
  let dscpMarkingRuleId = null;

  const vmCount = Math.max((b.vmIds || []).length, 1);
  const perVmMbps = requestedMbps / vmCount;

  try {
    // 1. Create a real Neutron network dedicated to this slice
    networkName = `slice-${b.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${id.slice(0, 8)}`;
    const networkData = await osJson(`${NEUTRON_URL}/networks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: { name: networkName, admin_state_up: true } }),
    });
    networkId = networkData.network.id;

    // 2. Create a real Neutron QoS policy for this slice
    const policyData = await osJson(`${NEUTRON_URL}/qos/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy: { name: `${networkName}-qos`, description: `QoS policy for slice: ${b.name}` },
      }),
    });
    qosPolicyId = policyData.policy.id;

    // 2a. Bandwidth ceiling - split evenly across VMs currently in the slice,
    //     so the slice's declared total is treated as an aggregate, not a
    //     per-VM number. Recomputed later via the recompute-bandwidth route
    //     when VM membership changes.
    const maxKbps = Math.round(perVmMbps * 1000);
    const bwLimitData = await osJson(`${NEUTRON_URL}/qos/policies/${qosPolicyId}/bandwidth_limit_rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bandwidth_limit_rule: {
          max_kbps: maxKbps,
          max_burst_kbps: Math.round(maxKbps * 0.125),
        },
      }),
    });
    bandwidthLimitRuleId = bwLimitData.bandwidth_limit_rule.id;

    // 2b. Priority -> guaranteed bandwidth floor (ingress direction, the only
    //     direction this DevStack's minimum-bandwidth extension supports).
    //     LOW priority gets no floor rule at all (best-effort only).
    const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[b.priority || "MEDIUM"] ?? 0.5;
    if (priorityFraction > 0) {
      const minKbps = Math.round(maxKbps * priorityFraction);
      const minBwData = await osJson(`${NEUTRON_URL}/qos/policies/${qosPolicyId}/minimum_bandwidth_rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minimum_bandwidth_rule: {
            min_kbps: minKbps,
            direction: "ingress",
          },
        }),
      });
      minimumBandwidthRuleId = minBwData.minimum_bandwidth_rule.id;
    }

    // 2c. Latency requirement -> DSCP marking. LOW latency gets tagged
    //     Expedited Forwarding (DSCP 46); STANDARD gets no marking rule.
    //     Note: this classifies/tags traffic for priority treatment - it does
    //     not by itself guarantee lower latency unless something downstream
    //     (e.g. OVS queueing) is configured to act on the DSCP value.
    const dscpValue = LATENCY_DSCP_VALUE[b.latencyRequirement || "STANDARD"] ?? 0;
    if (dscpValue > 0) {
      const dscpData = await osJson(`${NEUTRON_URL}/qos/policies/${qosPolicyId}/dscp_marking_rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dscp_marking_rule: { dscp_mark: dscpValue },
        }),
      });
      dscpMarkingRuleId = dscpData.dscp_marking_rule.id;
    }

    // 3. Apply the QoS policy at the network level, so any port created on
    //    this network inherits all of the above rules automatically.
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
       dscp_marking_rule_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
  );

EOF

awk -v r="$TMPDIR/replacement.txt" -v startA="$ANCHOR_BLOCK_START" -v endA="$ANCHOR_BLOCK_END" '
  BEGIN { skipping=0 }
  {
    if (!skipping && $0 == startA) {
      while ((getline line < r) > 0) print line
      close(r)
      skipping = 1
    }
    if (skipping) {
      if ($0 == endA) {
        skipping = 0
        print
      }
      next
    }
    print
  }
' "$TMPDIR/step2.js" > "$TMPDIR/step3.js"

# ---------- Insert 3: recompute-bandwidth route (insert BEFORE enforce-bandwidth route) ----------
cat > "$TMPDIR/route.txt" <<'EOF'
app.post("/api/slices/:id/recompute-bandwidth", async (req, res) => {
  try {
    const slice = db.prepare("SELECT * FROM slices WHERE id = ?").get(req.params.id);
    if (!slice) return res.status(404).json({ error: "Slice not found" });
    if (!slice.qos_policy_id) {
      return res.status(400).json({ error: "This slice has no QoS policy to recompute (creation may have failed)." });
    }

    const declaredMatch = String(slice.bandwidth_max || "").match(/[\d.]+/);
    const declaredMbps = declaredMatch ? parseFloat(declaredMatch[0]) : 0;
    if (!declaredMbps) {
      return res.status(400).json({ error: "Could not parse this slice's declared bandwidth_max." });
    }

    const vmIds = JSON.parse(slice.vm_ids || "[]");
    const vmCount = Math.max(vmIds.length, 1);
    const newPerVmMbps = declaredMbps / vmCount;
    const newMaxKbps = Math.round(newPerVmMbps * 1000);
    const previousPerVmMbps = slice.per_vm_mbps || declaredMbps;

    if (slice.bandwidth_limit_rule_id) {
      await osJson(
        `${NEUTRON_URL}/qos/policies/${slice.qos_policy_id}/bandwidth_limit_rules/${slice.bandwidth_limit_rule_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bandwidth_limit_rule: {
              max_kbps: newMaxKbps,
              max_burst_kbps: Math.round(newMaxKbps * 0.125),
            },
          }),
        },
      );
    }

    if (slice.minimum_bandwidth_rule_id) {
      const priorityFraction = PRIORITY_MIN_BANDWIDTH_FRACTION[slice.priority || "MEDIUM"] ?? 0.5;
      const newMinKbps = Math.round(newMaxKbps * priorityFraction);
      await osJson(
        `${NEUTRON_URL}/qos/policies/${slice.qos_policy_id}/minimum_bandwidth_rules/${slice.minimum_bandwidth_rule_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minimum_bandwidth_rule: { min_kbps: newMinKbps },
          }),
        },
      );
    }

    db.prepare(
      "UPDATE slices SET per_vm_mbps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(newPerVmMbps, slice.id);

    res.json({
      sliceId: slice.id,
      vmCount,
      declaredTotalMbps: declaredMbps,
      previousPerVmMbps,
      newPerVmMbps,
      note: `Recomputed: ${vmCount} VM(s) now share ${declaredMbps} Mbps -> ${newPerVmMbps.toFixed(2)} Mbps each (was ${Number(previousPerVmMbps).toFixed(2)} Mbps each). Updated live on the existing Neutron QoS policy - all ports on this slice's network inherit the new rate immediately.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

EOF

awk -v r="$TMPDIR/route.txt" -v anchor="$ANCHOR_ROUTE_BEFORE" '
  index($0, anchor) == 1 { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$TMPDIR/step3.js" > "$TMPDIR/step4.js"

mv "$TMPDIR/step4.js" "$SERVER"
rm -rf "$TMPDIR"

echo "Patched $SERVER:"
echo "  - 4 new DB columns (per_vm_mbps, bandwidth_limit_rule_id, minimum_bandwidth_rule_id, dscp_marking_rule_id)"
echo "  - PRIORITY_MIN_BANDWIDTH_FRACTION / LATENCY_DSCP_VALUE constants"
echo "  - POST /api/slices now creates even-split bandwidth_limit + minimum_bandwidth + dscp_marking rules"
echo "  - New route: POST /api/slices/:id/recompute-bandwidth"
echo ""
echo "Backup saved as ${SERVER}.qos.bak"
echo "Run: node --check server.js   (to verify syntax before starting the server)"
