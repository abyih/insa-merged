#!/usr/bin/env python3
"""
patch_priority_swap.py
------------------------
Fixes the priority/fast-lane mismatch in server.js: previously,
`priorityFraction` (from slice priority: HIGH=0.8, MEDIUM=0.5, LOW=0) set the
floor on the *standard/unmarked* queue, while the DSCP-46 fast lane was
always hardcoded to 10% of the ceiling. This swaps it so priority correctly
protects the fast lane (matching the project's own report description),
and the standard queue gets the fixed 10% instead.

All-or-nothing: verifies every expected line matches exactly before making
any change. If anything doesn't match, it aborts with no modifications.

Run from the project root: python3 patch_priority_swap.py
"""

PATH = "server.js"

with open(PATH, "r") as f:
    lines = f.readlines()

# Each edit: (line_number_1_indexed, expected_old_text, new_text_or_lines)
edits = [
    # Site 3 (reconciliation loop) - call, then declaration
    (2771,
     '        const result = await ovsDirect.enforceDualQueueDirect(ifaceName, minKbps, maxKbps);\n',
     ['        const result = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);\n']),
    (2756,
     '      const minKbps = Math.round(maxKbps * priorityFraction);\n',
     ['      const fastLaneKbps = Math.round(maxKbps * priorityFraction);\n',
      '      const standardMinKbps = Math.round(maxKbps * 0.1);\n']),

    # Site 2 (PUT /api/slices/:id) - call, then declaration
    (1379,
     '          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, minKbps, maxKbps);\n',
     ['          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);\n']),
    (1367,
     '        const minKbps = Math.round(maxKbps * priorityFraction);\n',
     ['        const fastLaneKbps = Math.round(maxKbps * priorityFraction);\n',
      '        const standardMinKbps = Math.round(maxKbps * 0.1);\n']),

    # Site 1 (enforce-bandwidth or similar) - call, then declaration
    (1191,
     '          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, minKbpsForPriority, maxKbps);\n',
     ['          const r = await ovsDirect.enforceDualQueueDirect(ifaceName, standardMinKbps, maxKbps, fastLaneKbps);\n']),
    (1176,
     '    const minKbpsForPriority = Math.round(maxKbps * priorityFraction);\n',
     ['    const fastLaneKbps = Math.round(maxKbps * priorityFraction);\n',
      '    const standardMinKbps = Math.round(maxKbps * 0.1);\n']),
]

# --- Verification pass: check every line matches exactly before changing anything ---
errors = []
for line_no, expected, _ in edits:
    idx = line_no - 1
    if idx >= len(lines):
        errors.append(f"Line {line_no}: file only has {len(lines)} lines")
        continue
    actual = lines[idx]
    if actual != expected:
        errors.append(f"Line {line_no}: mismatch\n  expected: {expected!r}\n  actual:   {actual!r}")

if errors:
    print("ABORTING - no changes made. Mismatches found:")
    for e in errors:
        print(" -", e)
    raise SystemExit(1)

print("All 6 target lines verified exactly. Applying edits...")

# --- Apply edits, highest line number first, so earlier indices stay valid ---
for line_no, _, new_lines in edits:
    idx = line_no - 1
    lines[idx:idx + 1] = new_lines
    print(f"  Patched line {line_no}")

with open(PATH, "w") as f:
    f.writelines(lines)

print("Done. server.js written. Run `node --check server.js` next.")
