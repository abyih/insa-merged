#!/usr/bin/env bash
# apply_form_fields_patch.sh
# Adds visible Priority / Isolation Level / Latency Requirement dropdowns to
# the manual "Create Slice" form, right before the "VMs in this slice" field.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

FRONTEND=src/Pages/NetworkSlices.jsx

if [ ! -f "$FRONTEND" ]; then
  echo "ERROR: $FRONTEND not found. Run this script from ~/Insa-dluxf"
  exit 1
fi

LABEL_ANCHOR='                <label className="block mb-1 text-sm text-slate-400">VMs in this slice</label>'

count=$(grep -cF "$LABEL_ANCHOR" "$FRONTEND")
if [ "$count" -ne 1 ]; then
  echo "ERROR: anchor 'VMs in this slice' label found $count times (expected exactly 1). Aborting, no changes made."
  exit 1
fi

label_line=$(grep -nF "$LABEL_ANCHOR" "$FRONTEND" | cut -d: -f1)
div_line=$((label_line - 1))
div_content=$(sed -n "${div_line}p" "$FRONTEND")

if [ "$div_content" != "              <div>" ]; then
  echo "ERROR: expected the line immediately above 'VMs in this slice' to be a bare '<div>' wrapper, but found:"
  echo "  '$div_content'"
  echo "File may have changed since this script was written. Aborting, no changes made."
  exit 1
fi

echo "Anchor verified (line $div_line is the wrapping <div> for the VMs field). Backing up $FRONTEND..."
cp "$FRONTEND" "${FRONTEND}.formfields.bak"

TMPDIR=$(mktemp -d)

cat > "$TMPDIR/fields.txt" <<'EOF'
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.priority === "LOW"
                      ? "Best-effort (no guaranteed floor)"
                      : `${form.priority === "HIGH" ? "80%" : "50%"} guaranteed bandwidth floor`}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Isolation Level</label>
                  <select
                    value={form.isolationLevel}
                    onChange={(e) => updateField("isolationLevel", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="STRICT">STRICT</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.isolationLevel === "STRICT"
                      ? "Security group + explicit deny flows"
                      : "Security group only"}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-400">Latency Requirement</label>
                  <select
                    value={form.latencyRequirement}
                    onChange={(e) => updateField("latencyRequirement", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {form.latencyRequirement === "LOW" ? "Marked DSCP 46 (EF)" : "No priority marking"}
                  </p>
                </div>
              </div>

EOF

awk -v r="$TMPDIR/fields.txt" -v n="$div_line" '
  NR == n { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$FRONTEND" > "$TMPDIR/frontend.new"

mv "$TMPDIR/frontend.new" "$FRONTEND"
rm -rf "$TMPDIR"

echo "Patched $FRONTEND:"
echo "  - Added Priority / Isolation Level / Latency Requirement dropdowns to the manual Create Slice form"
echo ""
echo "Backup saved as ${FRONTEND}.formfields.bak"
echo "Restart/refresh your Vite dev server and open the Create Slice modal to check."
