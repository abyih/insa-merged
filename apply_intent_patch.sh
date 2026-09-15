#!/usr/bin/env bash
# apply_intent_patch.sh
# Automatically inserts the intent-based slice creation code into
# server.js and src/Pages/NetworkSlices.jsx, using unique anchor lines.
# Run this from ~/Insa-dluxf (the project root).

set -euo pipefail

SERVER=server.js
FRONTEND=src/Pages/NetworkSlices.jsx

if [ ! -f "$SERVER" ]; then
  echo "ERROR: $SERVER not found. Run this script from ~/Insa-dluxf"
  exit 1
fi
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

ANCHOR1='// ---- Slice creation: admission control + real network + real QoS ----'
ANCHOR2='  const [creating, setCreating] = useState(false);'
ANCHOR3='  async function handleActivate(id, activate) {'
ANCHOR4_A='            <h3 className="text-xl font-bold mb-4">Create Network Slice</h3>'
ANCHOR4_B='            <div className="mb-4">'

check_unique "$SERVER" "$ANCHOR1" "backend route anchor"
check_unique "$FRONTEND" "$ANCHOR2" "creating state anchor"
check_unique "$FRONTEND" "$ANCHOR3" "handleActivate anchor"
check_unique "$FRONTEND" "$ANCHOR4_A" "modal title anchor"

echo "All anchors verified unique. Backing up files..."
cp "$SERVER" "${SERVER}.bak"
cp "$FRONTEND" "${FRONTEND}.bak"

TMPDIR=$(mktemp -d)

# ---------- Patch 1: backend parseIntent + route (insert BEFORE anchor1) ----------
cat > "$TMPDIR/patch1.txt" <<'PATCH1EOF'
// ---- Rule-based intent parser: plain-English -> technical slice parameters ----
function parseIntent(text) {
  const raw = text || "";
  const lower = raw.toLowerCase();

  const matchedKeywords = [];
  const prioritySuggestions = [];
  const isolationSuggestions = [];
  const latencySuggestions = [];
  const bandwidthSuggestions = [];

  const RULES = [
    {
      keywords: ["critical", "hospital", "medical", "emergency"],
      explanation: "critical/medical context -> HIGH priority, STRICT isolation, LOW latency, higher bandwidth",
      apply: () => {
        prioritySuggestions.push("HIGH");
        isolationSuggestions.push("STRICT");
        latencySuggestions.push("LOW");
        bandwidthSuggestions.push(500);
      },
    },
    {
      keywords: ["guest", "visitor", "public"],
      explanation: "guest/public-facing context -> LOW priority, lower bandwidth",
      apply: () => {
        prioritySuggestions.push("LOW");
        bandwidthSuggestions.push(50);
      },
    },
    {
      keywords: ["research", "data", "analysis"],
      explanation: "research/data-analysis context -> higher bandwidth, STRICT isolation",
      apply: () => {
        bandwidthSuggestions.push(300);
        isolationSuggestions.push("STRICT");
      },
    },
    {
      keywords: ["fast", "low latency", "real-time", "real time", "urgent"],
      explanation: "time-sensitivity keyword -> LOW latency",
      apply: () => {
        latencySuggestions.push("LOW");
      },
    },
    {
      keywords: ["secure", "isolated", "private", "protected"],
      explanation: "security keyword -> STRICT isolation",
      apply: () => {
        isolationSuggestions.push("STRICT");
      },
    },
    {
      keywords: ["high bandwidth", "video", "streaming"],
      explanation: "high-throughput workload -> higher bandwidth",
      apply: () => {
        bandwidthSuggestions.push(500);
      },
    },
  ];

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(lower)) {
        matchedKeywords.push({ keyword: kw, reason: rule.explanation });
        rule.apply();
      }
    }
  }

  const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const priority = prioritySuggestions.length
    ? prioritySuggestions.reduce((best, p) => (PRIORITY_RANK[p] > PRIORITY_RANK[best] ? p : best), "LOW")
    : "MEDIUM";

  const isolationLevel = isolationSuggestions.includes("STRICT") ? "STRICT" : "STANDARD";
  const latencyRequirement = latencySuggestions.includes("LOW") ? "LOW" : "STANDARD";
  const bandwidthMbps = bandwidthSuggestions.length ? Math.max(...bandwidthSuggestions) : 200;

  return {
    priority,
    isolationLevel,
    latencyRequirement,
    bandwidthMbps,
    matchedKeywords,
    usedDefaults: matchedKeywords.length === 0,
  };
}

// ---- Intent preview endpoint: parses text into params, creates nothing ----
app.post("/api/slices/parse-intent", (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  const result = parseIntent(text);
  res.json(result);
});

PATCH1EOF

awk -v r="$TMPDIR/patch1.txt" -v anchor="$ANCHOR1" '
  index($0, anchor) == 1 { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$SERVER" > "$TMPDIR/server.js.new"
mv "$TMPDIR/server.js.new" "$SERVER"
echo "Patched $SERVER (parseIntent + /api/slices/parse-intent)"

# ---------- Patch 2: frontend state (insert AFTER anchor2) ----------
cat > "$TMPDIR/patch2.txt" <<'PATCH2EOF'
  const [intentText, setIntentText] = useState("");
  const [parsedIntent, setParsedIntent] = useState(null);
  const [parsingIntent, setParsingIntent] = useState(false);
PATCH2EOF

awk -v r="$TMPDIR/patch2.txt" -v anchor="$ANCHOR2" '
  { print }
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
' "$FRONTEND" > "$TMPDIR/frontend.tmp1"

# ---------- Patch 3: handleParseIntent function (insert BEFORE anchor3) ----------
cat > "$TMPDIR/patch3.txt" <<'PATCH3EOF'
  async function handleParseIntent() {
    if (!intentText.trim()) {
      alert("Describe what you need first.");
      return;
    }
    setParsingIntent(true);
    try {
      const res = await fetch("/api/slices/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: intentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse intent");
      setParsedIntent(data);
      setForm((f) => ({
        ...f,
        sliceType: "custom",
        priority: data.priority,
        isolationLevel: data.isolationLevel,
        latencyRequirement: data.latencyRequirement,
        bandwidthMbps: String(data.bandwidthMbps),
      }));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setParsingIntent(false);
    }
  }

PATCH3EOF

awk -v r="$TMPDIR/patch3.txt" -v anchor="$ANCHOR3" '
  $0 == anchor { while ((getline line < r) > 0) print line; close(r) }
  { print }
' "$TMPDIR/frontend.tmp1" > "$TMPDIR/frontend.tmp2"

# ---------- Patch 4: intent box JSX (insert BEFORE the Template div, right after modal title) ----------
cat > "$TMPDIR/patch4.txt" <<'PATCH4EOF'
            <div className="mb-5 rounded-2xl border border-blue-800/50 bg-blue-950/20 p-4">
              <label className="block mb-2 text-sm text-slate-300 font-semibold">
                Describe what you need
              </label>
              <textarea
                value={intentText}
                onChange={(e) => setIntentText(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 outline-none focus:border-blue-500 text-sm"
                rows={2}
                placeholder="e.g. I need a slice for hospital equipment, needs to be fast and very secure"
              />
              <button
                onClick={handleParseIntent}
                disabled={parsingIntent}
                className="mt-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-60"
              >
                {parsingIntent ? "Parsing..." : "Parse Intent"}
              </button>

              {parsedIntent && (
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
                  <p className="text-slate-200 font-semibold mb-1">
                    Detected: {parsedIntent.priority} priority, {parsedIntent.isolationLevel} isolation,{" "}
                    {parsedIntent.latencyRequirement} latency, {parsedIntent.bandwidthMbps} Mbps
                  </p>
                  {parsedIntent.matchedKeywords.length > 0 ? (
                    <ul className="text-slate-400 space-y-0.5 mt-1">
                      {parsedIntent.matchedKeywords.map((m, i) => (
                        <li key={i}>
                          matched "<span className="text-blue-400">{m.keyword}</span>" - {m.reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 mt-1">No keywords matched - using default values below.</p>
                  )}
                  <p className="text-slate-500 mt-2">
                    Fields below have been pre-filled - review and adjust before creating.
                  </p>
                </div>
              )}
            </div>

PATCH4EOF

# Only insert before the FIRST occurrence of the "mb-4 Template" div that
# immediately follows the modal title line, to avoid touching other
# unrelated "mb-4" divs elsewhere in the file.
awk -v r="$TMPDIR/patch4.txt" -v title="$ANCHOR4_A" -v tmpl="$ANCHOR4_B" '
  BEGIN { armed=0 }
  {
    if (armed && $0 == tmpl) {
      while ((getline line < r) > 0) print line
      close(r)
      armed = 0
    }
    print
    if ($0 == title) armed = 1
  }
' "$TMPDIR/frontend.tmp2" > "$TMPDIR/frontend.tmp3"

mv "$TMPDIR/frontend.tmp3" "$FRONTEND"
rm -rf "$TMPDIR"

echo "Patched $FRONTEND (intent state, handleParseIntent, intent textbox UI)"
echo ""
echo "Done. Backups saved as ${SERVER}.bak and ${FRONTEND}.bak"
echo "Restart your backend (node server.js / nodemon) and refresh the frontend to test."
