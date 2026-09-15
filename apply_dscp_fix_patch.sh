#!/usr/bin/env bash
# apply_dscp_fix_patch.sh
# Restores DSCP marking rule creation (dscp_marking_rules), which was
# accidentally dropped from POST /api/slices during last night's priority
# OVS patch. Inserts it back right before the network-level QoS policy PUT.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

SERVER=server.js

if [ ! -f "$SERVER" ]; then
  echo "ERROR: $SERVER not found. Run this script from ~/Insa-dluxf"
  exit 1
fi

ANCHOR='    // 3. Apply the QoS policy at the network level, so any port created on'

count=$(grep -cF "$ANCHOR" "$SERVER")
if [ "$count" -ne 1 ]; then
  echo "ERROR: anchor found $count times (expected exactly 1). Aborting, no changes made."
  exit 1
fi

echo "Anchor verified unique. Backing up $SERVER..."
cp "$SERVER" "${SERVER}.dscpfix.bak"

TMPDIR=$(mktemp -d)

cat > "$TMPDIR/insert.txt" <<'EOF'
    // 2c. Latency requirement -> DSCP marking. LOW latency gets tagged
    //     Expedited Forwarding (DSCP 46); STANDARD gets no marking rule.
    //     (This was accidentally dropped during the priority OVS patch and
    //     is restored here.)
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

EOF

awk -v r="$TMPDIR/insert.txt" -v anchor="$ANCHOR" '
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$SERVER" > "$TMPDIR/server.new"

mv "$TMPDIR/server.new" "$SERVER"
rm -rf "$TMPDIR"

echo "Patched $SERVER: restored DSCP marking rule creation in POST /api/slices"
echo "Backup saved as ${SERVER}.dscpfix.bak"
echo "Run: node --check server.js"
