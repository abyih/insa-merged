# Topology & Path Trace — How They're Built

Scope: this doc covers only two pages — **Topology** (`/topology`) and **Path Trace** (`/path-trace`) — and the shared utilities they're both built on. Nothing else in PNTC is covered here.

---

## 1. The shared foundation

Both pages sit on the same three building blocks. Understanding these first makes both pages make sense.

### `controllerManager.js` — controller abstraction

Neither page ever imports OpenDaylight or ONOS code directly. They call generic functions:

```js
controllerManager.getTopology()   // → same shape regardless of controller
controllerManager.getFlows(id)    // → flow list, or { supported:false } for ONOS
```

`controllerManager` looks at which controller is currently active (a value stored in `localStorage`, set by the toggle in the header) and forwards the call to one of two adapter files:

- `src/api/controllers/odlController.js` — talks to OpenDaylight's RESTCONF API
- `src/api/controllers/onosController.js` — talks to ONOS's REST API

**Why this matters for both pages:** neither `TopologySimple.jsx` nor `PathTrace.jsx` has any `if (controller === 'odl')` branching for fetching data. They just call `controllerManager.getTopology()` and get back the same shape either way. The ONOS adapter's job is to *translate* ONOS's native device/host/link lists into that same shape, so everything downstream is written once.

### `topology-mapper.js` — turning raw controller JSON into a graph

`extractDeviceData(topology)` (in `src/mappers/topology-mapper.js`) is the one function that turns either controller's raw response into:

```js
{
  nodes: [{ id, label, group: 'host' | 'switch', title }],
  links: [{ from, to }]   // includes BOTH switch↔switch links AND host↔switch links
}
```

The important detail: **host-to-switch links are included in the same `links` array as switch-to-switch links.** A host node's `links` entry is built from its `host-tracker-service:attachment-points` field (which switch and port it's physically connected to). This one design choice is what makes Path Trace simple — see §3.

### `graph.js` — the pathfinding utility

`src/utils/graph.js` has three exports, all plain functions with no React or controller knowledge:

- `buildAdjacency(links)` — turns a `{from, to}` list into an adjacency map
- `shortestPath(adj, start, end)` — plain breadth-first search (BFS), returns the node-by-node path or `null`
- `resolveHostAttachment(hostNode)` — reads a host's `attachment-points` field and returns `{ switchId, port }`
- `computeSliceFootprint(slice, links)` — runs `shortestPath` between every pair of a slice's target hosts/switches and returns the set of nodes/edges that footprint touches

**Both pages use this same file.** Topology's Slice View uses `computeSliceFootprint`. Path Trace uses `buildAdjacency` + `shortestPath` directly. It's one BFS implementation, used two ways.

---

## 2. The Topology page

**Files:** `src/Pages/Topology/TopologySimple.jsx` (the page), `src/Pages/Topology/TopologyService.jsx` (data fetching), `src/Pages/Topology/topology.css`

### Data flow

`TopologyService.jsx`'s `getNode()` branches on controller *only here, once*:

- **ONOS active:** calls `controllerManager.getTopology()`, then `extractDeviceData()` — same as everything else in the app.
- **ODL active:** fetches `network-topology` and `opendaylight-inventory` directly, in parallel, then merges and calls `extractDeviceData()`.

One thing worth knowing if you're debugging this specific page: the ODL branch goes through a **Vite dev-server proxy** (`/api/rests/data/...` → `vite.config.js`'s proxy → `https://127.0.0.1:8443`), not through `server.js` like the rest of the app. This is different from Path Trace, Network Slicing, and Tools, which all go through `server.js`. It's a pre-existing pattern specific to this one page — worth knowing so you don't go looking for it in `server.js` and come up empty.

### Rendering — vis-network

The page renders the graph with the `vis-network` library. The core function is `buildStyledGraph(finalData, mode, slices)`, which takes the raw node/link list and a "mode," and returns nodes/edges with opacity, color, and border-width already computed. React just feeds that into a `vis-network` `Network` instance inside a `useEffect`.

### Slice View — the three modes

A dropdown at the top switches `sliceViewMode` between three states:

| Mode | What `buildStyledGraph` does |
|---|---|
| `"physical"` | Everything full opacity, no highlighting — just the real network |
| `"all"` | Every slice gets a distinct color (cycled from a fixed 8-color palette); a node/edge touched by a slice gets that slice's color; anything touched by no slice is dimmed to 25% opacity |
| `"<slice id>"` | Runs `computeSliceFootprint(slice, links)`, colors that slice's exact path blue, dims everything else to ~18% opacity |

The key line, for either "all" or a specific slice:

```js
const { nodeIds, hasEdgeKey } = computeSliceFootprint(slice, finalData.links);
```

This is real pathfinding, not a decorative highlight — `computeSliceFootprint` actually runs BFS between the slice's target hosts over the real discovered link graph, so what lights up is the actual path that slice's traffic would take.

### The right-hand panel

When a slice is selected in Slice View, the panel shows that slice's live stats (host/switch count, bandwidth, priority, and — if it requested low latency — its DSCP/queue/enforcement status) plus four actions: Hide, View Rules (dumps the raw switch:port targets), Edit Slice (navigates to `/slicing` with the slice's data pre-filled), and Delete Slice (calls `unprogramSlice()`, the same teardown function the Slicing page uses, so deleting from the map is a real teardown, not just removing it from the list).

When no slice is selected, the same panel becomes a **node inspector** — click any node on the map, its raw ID and specs show up here (the `title` field built into each node by `extractDeviceData`).

---

## 3. The Path Trace page

**Files:** `src/Pages/PathTrace/PathTrace.jsx`

Answers one question: *"how does traffic from host A actually reach host B, and — if I pick a slice — is that slice's policy actually installed along the way?"*

### Why the pathfinding is so short

Because `extractDeviceData()` already puts hosts *and* switches in one link graph (§1), tracing a path between two hosts is just:

```js
const adj = buildAdjacency(links);
const path = shortestPath(adj, sourceHostId, destHostId);
// path = ['host:00:...:01', 'openflow:1', 'openflow:2', 'host:00:...:02']
```

No separate "resolve host, then trace switches, then re-attach host" logic needed — the BFS walks straight from one host, through however many switches, to the other host, in one call. `resolveHostAttachment()` is only used afterward, to show the exact port each host connects on in the summary panel.

### Slice-aware overlay, and why it's labeled a "derived" path

This app's slices don't store a dedicated physical route — a host-isolation slice is a set of per-port policies (allow/drop/DSCP at each target's switch), not a saved path. So when you select a slice in Path Trace, it does **not** claim "this is the slice's path." It shows the same topology-derived path as always, and separately checks: *is this slice's flow actually installed on each switch that path passes through?*

```js
const { flows } = await controllerManager.getFlows(switchId);
const match = flows.find(f => f.id === selectedSlice.name);
```

(Every slice's flow is installed with its `id` set to the slice's own name — that's what makes this lookup possible without any extra bookkeeping.)

This is why the UI always shows the line *"Path derived from current topology/flow information"* when a slice is selected — it's not being vague, it's being precise about what was actually checked.

### Flow correlation, per hop

For each switch on the path, the result panel shows one of:

- **Flow Programmed** — a flow named after the slice exists there, with its real match/action summarized (e.g. `in-port 2 · TCP · dst port 80` → `Output → NORMAL`)
- **No Slice Flow (Transit Hop)** — no such flow, correctly labeled as "this switch just forwards, it's not specifically governed by this slice" rather than treated as an error
- **Flow correlation unavailable** — shown instead of the above, only when ONOS is the active controller, because `onosController.getFlows()` honestly returns `{ supported: false }` rather than pretending to check something it can't yet check

### Controller abstraction, concretely

Everything Path Trace does — topology fetch, path computation, flow correlation — goes through `controllerManager`. The only controller-specific logic in the whole file is a single `if (controller !== 'odl')` check, and it does nothing except swap in the "unavailable" message. There's no duplicate ODL/ONOS code path for tracing itself.

---

## 4. Quick reference — file map

```
src/Pages/Topology/
  TopologySimple.jsx     the page: vis-network render, Slice View, node inspector
  TopologyService.jsx    data fetching (ODL via Vite proxy, ONOS via controllerManager)
  topology.css

src/Pages/PathTrace/
  PathTrace.jsx           the whole page: form, BFS trace, flow correlation, result panel

src/mappers/
  topology-mapper.js      extractDeviceData() — raw controller JSON → {nodes, links}

src/utils/
  graph.js                buildAdjacency / shortestPath / resolveHostAttachment /
                           computeSliceFootprint — shared by both pages

src/api/
  controllerManager.js    dispatches to whichever adapter is active
  controllers/odlController.js
  controllers/onosController.js
```

**The one sentence to remember:** both pages are thin — almost everything they do is calling `controllerManager` for data and `graph.js` for pathfinding. Neither page contains its own copy of either.
