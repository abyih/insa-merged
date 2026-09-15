#!/usr/bin/env bash
# apply_ui_qos_display_patch.sh
# Adds Per-VM Bandwidth, Priority Guarantee, and Latency Marking rows to the
# slice detail panel in NetworkSlices.jsx.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

FRONTEND=src/Pages/NetworkSlices.jsx

if [ ! -f "$FRONTEND" ]; then
  echo "ERROR: $FRONTEND not found. Run this script from ~/Insa-dluxf"
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

ANCHOR='              <Row label="Bandwidth" value={`${selectedSlice.bandwidth_min || "—"} – ${selectedSlice.bandwidth_max || "—"}`} />'

check_unique "$FRONTEND" "$ANCHOR" "Bandwidth Row anchor"

echo "Anchor verified unique. Backing up $FRONTEND..."
cp "$FRONTEND" "${FRONTEND}.uiqos.bak"

TMPDIR=$(mktemp -d)

cat > "$TMPDIR/rows.txt" <<'EOF'
              <Row
                label="Per-VM Bandwidth"
                value={
                  selectedSlice.per_vm_mbps
                    ? `${selectedSlice.per_vm_mbps} Mbps per VM (${selectedSlice.vmIds?.length || 0} VM${selectedSlice.vmIds?.length === 1 ? "" : "s"} sharing ${selectedSlice.bandwidth_max || "—"} total)`
                    : "—"
                }
              />
              <Row
                label="Priority Guarantee"
                value={
                  selectedSlice.minimum_bandwidth_rule_id
                    ? `${selectedSlice.priority} — guaranteed floor enforced (Neutron minimum_bandwidth rule)`
                    : `${selectedSlice.priority} — best-effort only (no guaranteed floor)`
                }
              />
              <Row
                label="Latency Marking"
                value={
                  selectedSlice.dscp_marking_rule_id
                    ? `${selectedSlice.latency_requirement} — traffic marked DSCP 46 (Expedited Forwarding)`
                    : `${selectedSlice.latency_requirement} — no priority marking`
                }
              />
EOF

awk -v r="$TMPDIR/rows.txt" -v anchor="$ANCHOR" '
  { print }
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
' "$FRONTEND" > "$TMPDIR/frontend.new"

mv "$TMPDIR/frontend.new" "$FRONTEND"
rm -rf "$TMPDIR"

echo "Patched $FRONTEND:"
echo "  - Added 'Per-VM Bandwidth', 'Priority Guarantee', 'Latency Marking' rows to the slice detail panel"
echo ""
echo "Backup saved as ${FRONTEND}.uiqos.bak"
echo "Restart your Vite dev server (or it should hot-reload) and open a slice's detail panel to check."
