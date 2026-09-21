// import { useCallback, useEffect, useRef, useState } from "react";
// import { DataSet } from "vis-data";
// import { Network } from "vis-network";
// import "./topology.css";
// import { io } from "socket.io-client";

// const socket = io("http://localhost:5000");

// const TopologySimple = ({ topologyData, onReload }) => {
// 	const containerRef = useRef(null);
// 	const edgesRef = useRef(null); // Track edges outside useEffect

// 	const [selectedNode, setSelectedNode] = useState(null);

// 	// const [devices, setDevices] = useState(null);
// 	const findNodeByMac = useCallback(
// 		(mac) => {
// 			const node = topologyData.nodes.find(
// 				(n) => n.group === "host" && n.id.includes(mac.toLowerCase())
// 			);
// 			return node?.id || null;
// 		},
// 		[topologyData.nodes]
// 	);

// 	const buildGraph = useCallback(() => {
// 		const graph = {};
// 		topologyData.links.forEach(({ from, to }) => {
// 			if (!graph[from]) graph[from] = [];
// 			if (!graph[to]) graph[to] = [];
// 			graph[from].push(to);
// 			graph[to].push(from);
// 		});
// 		return graph;
// 	}, [topologyData.links]);

// 	const findShortestPath = (graph, start, end) => {
// 		const queue = [[start]];
// 		const visited = new Set();

// 		while (queue.length > 0) {
// 			const path = queue.shift();
// 			const node = path[path.length - 1];

// 			if (node === end) return path;

// 			if (!visited.has(node)) {
// 				visited.add(node);
// 				(graph[node] || []).forEach((neighbor) => {
// 					queue.push([...path, neighbor]);
// 				});
// 			}
// 		}
// 		return null;
// 	};

// 	const highlightPath = (path) => {
// 		if (!path || path.length < 2) return;

// 		const edges = edgesRef.current;
// 		const highlightColor = { color: "red" };

// 		for (let i = 0; i < path.length - 1; i++) {
// 			const from = path[i];
// 			const to = path[i + 1];

// 			const edge = edges.get({
// 				filter: (e) =>
// 					(e.from === from && e.to === to) ||
// 					(e.from === to && e.to === from),
// 			})[0];

// 			if (edge) {
// 				edges.update({ ...edge, color: highlightColor, width: 4 });

// 				// Revert after 1s
// 				setTimeout(() => {
// 					edges.update({
// 						...edge,
// 						color: { color: "#070707" },
// 						width: 2,
// 					});
// 				}, 1000);
// 			}
// 		}
// 	};
// 	useEffect(() => {
// 		console.log("Topology Data:", topologyData);
// 		if (!topologyData) return;
// 		// setDevices(extractDevices(topologyData));

// 		const nodes = new DataSet(topologyData.nodes || []);
// 		const edges = new DataSet(topologyData.links || []);
// 		edgesRef.current = edges;

// 		const data = { nodes, edges };
// 		const portDots = topologyData.dots || [];

// 		const options = {
// 			width: "100%",
// 			height: "600px",
// 			nodes: {
// 				size: 30,
// 				font: { color: "#2B1B17" },
// 			},
// 			edges: {
// 				length: 200,
// 				color: {
// 					color: "#070707",
// 					highlight: "#0066FF",
// 					hover: "#33CC33",
// 				},
// 				smooth: false,
// 			},
// 			physics: {
// 				barnesHut: { gravitationalConstant: -7025 },
// 			},
// 			groups: {
// 				switch: {
// 					shape: "image",
// 					image: "assets/images/Device_switch_3062_unknown_64.png",
// 				},
// 				host: {
// 					shape: "image",
// 					image: "assets/images/Device_pc_3045_default_64.png",
// 				},
// 			},
// 		};

// 		const network = new Network(containerRef.current, data, options);

// 		// Create DOM elements
// 		portDots.forEach(({ id, mac, port }) => {
// 			const dot = document.createElement("div");
// 			dot.className = "port-dot";
// 			dot.id = id;

// 			const popup = document.createElement("div");
// 			popup.className = "port-popup";
// 			popup.innerHTML = `<b>MAC:</b> ${mac}<br><b>Port:</b> ${port}`;

// 			containerRef.current.appendChild(dot);
// 			containerRef.current.appendChild(popup);
// 		});

// 		const getDotPosition = (from, to, distance = 40) => {
// 			const dx = to.x - from.x;
// 			const dy = to.y - from.y;
// 			const len = Math.sqrt(dx * dx + dy * dy);
// 			if (len === 0) return { x: from.x, y: from.y };

// 			const ratio = distance / len;
// 			return {
// 				x: from.x + dx * ratio,
// 				y: from.y + dy * ratio,
// 			};
// 		};

// 		const updateDotPositions = () => {
// 			portDots.forEach(({ id, source, target }) => {
// 				const from = network.getPositions([source])[source];
// 				const to = network.getPositions([target])[target];
// 				if (!from || !to) return;

// 				const { x, y } = getDotPosition(from, to);
// 				const screen = network.canvasToDOM({ x, y });

// 				console.log(screen);
// 				const dot = document.getElementById(id);
// 				const popup = dot?.nextSibling;

// 				if (dot && popup) {
// 					dot.style.left = `${screen.x}px`;
// 					dot.style.top = `${screen.y}px`;
// 					popup.style.left = `${screen.x}px`;
// 					popup.style.top = `${screen.y}px`;
// 				}
// 			});
// 		};

// 		network.once("stabilized", updateDotPositions);
// 		network.on("dragEnd", updateDotPositions);
// 		network.on("afterDrawing", updateDotPositions);

// 		// Handle node click
// 		network.on("click", function (params) {
// 			if (params.nodes.length > 0) {
// 				const nodeId = params.nodes[0];
// 				const clickedNode = nodes.get(nodeId);
// 				setSelectedNode(clickedNode);
// 			} else {
// 				setSelectedNode(null); // Clicked empty space
// 			}
// 		});
// 		socket.on("packet", ({ src, dst }) => {
// 			const srcNode = findNodeByMac(src);
// 			const dstNode = findNodeByMac(dst);

// 			if (!srcNode || !dstNode) {
// 				console.warn("Host node not found for MACs:", src, dst);
// 				return;
// 			}

// 			const graph = buildGraph();
// 			const path = findShortestPath(graph, srcNode, dstNode);

// 			if (!path) {
// 				console.warn("No path found between", srcNode, dstNode);
// 				return;
// 			}

// 			console.log("Highlighting path:", path);
// 			highlightPath(path);
// 		});

// 		// Cleanup on unmount
// 		return () => {
// 			const dots = document.querySelectorAll(".port-dot, .port-popup");
// 			dots.forEach((el) => el.remove());
// 		};
// 	}, [buildGraph, findNodeByMac, topologyData]);

// 	// const highlightEdge = (src, dst) => {
// 	// 	const edges = edgesRef.current;
// 	// 	if (!edges) return;

// 	// 	// Try matching both directions
// 	// 	const edgeId1 = `${src}-${dst}`;
// 	// 	const edgeId2 = `${dst}-${src}`;
// 	// 	const edge = edges.get(edgeId1) || edges.get(edgeId2);
// 	// 	const edgeId = edge?.id;

// 	// 	if (!edgeId) {
// 	// 		console.warn(`No edge found between ${src} and ${dst}`);
// 	// 		return;
// 	// 	}

// 	// 	// Highlight
// 	// 	edges.update({ id: edgeId, color: { color: "red" }, width: 4 });

// 	// 	// Revert after 1s
// 	// 	setTimeout(() => {
// 	// 		edges.update({
// 	// 			id: edgeId,
// 	// 			color: { color: "#070707" },
// 	// 			width: 2,
// 	// 		});
// 	// 	}, 1000);
// 	// };

// 	return (
// 		<div className="topology-container" style={{ display: "flex" }}>
// 			{/* Left side: Graph and Button */}
// 			<div>
// 				<div style={{ marginBottom: "10px" }}>
// 					<button
// 						onClick={onReload}
// 						style={{
// 							padding: "10px 20px",
// 							backgroundColor: "#459BDE",
// 							color: "#fff",
// 							border: "none",
// 							borderRadius: "5px",
// 							cursor: "pointer",
// 						}}
// 					>
// 						Reload Topology
// 					</button>
// 				</div>
// 				<div
// 					ref={containerRef}
// 					style={{
// 						width: "800px",
// 						height: "600px",
// 						border: "1px solid #ccc",
// 						position: "relative",
// 					}}
// 				/>
// 			</div>

// 			{/* Right side: Node Details Panel */}
// 			<div
// 				style={{
// 					marginLeft: "20px",
// 					width: "300px",
// 					padding: "10px",
// 					border: "1px solid #ccc",
// 				}}
// 			>
// 				<h3>Node Details</h3>
// 				{selectedNode ? (
// 					<div>
// 						<p>
// 							<strong>ID:</strong> {selectedNode.id}
// 						</p>
// 						<div
// 							dangerouslySetInnerHTML={{
// 								__html: selectedNode.title,
// 							}}
// 						/>
// 					</div>
// 				) : (
// 					<p>Click on a node to see details.</p>
// 				)}
// 			</div>
// 		</div>
// 	);
// };

// export default TopologySimple;










import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataSet } from "vis-data";
import { Network } from "vis-network";
import { AnimatePresence, motion } from "framer-motion";
import {
    Shield, Layers, EyeOff, Pencil, Trash2, ListTree,
    Activity, Gauge, Zap, ChevronDown
} from "lucide-react";
import { useTopology } from "../../pipeline/DataPipelineContext";
import { extractDeviceData } from "../../mappers/topology-mapper";
import { useSlices } from "../../pipeline/SliceContext";
import { computeSliceFootprint } from "../../utils/graph";
import { unprogramSlice } from "../../utils/sliceActions";
import "./topology.css";

const SLICE_COLORS = ["#3b82f6", "#a855f7", "#f97316", "#10b981", "#ec4899", "#eab308", "#06b6d4", "#f43f5e"];
const sliceColor = (idx) => SLICE_COLORS[idx % SLICE_COLORS.length];

// Builds vis-network node/edge styling for the current Slice View mode without
// mutating the underlying physical topology — physical nodes/links are always
// the same set, only opacity/color/width change to show a slice's footprint.
function buildStyledGraph(finalData, mode, slices) {
    const baseNodes = finalData.nodes.map((n) => ({ ...n }));
    const baseEdges = finalData.links.map((l, i) => ({ ...l, id: `e${i}` }));

    if (mode === "physical") {
        return {
            nodes: baseNodes.map((n) => ({ ...n, opacity: 1, borderWidth: 1 })),
            edges: baseEdges.map((e) => ({ ...e, opacity: 1 })),
        };
    }

    if (mode === "all") {
        const nodeMembers = new Map();
        const edgeMembers = new Map();

        slices.forEach((s, idx) => {
            const color = sliceColor(idx);
            const { nodeIds, hasEdgeKey } = computeSliceFootprint(s, finalData.links);
            nodeIds.forEach((id) => {
                if (!nodeMembers.has(id)) nodeMembers.set(id, []);
                nodeMembers.get(id).push({ name: s.name, color });
            });
            baseEdges.forEach((e) => {
                if (hasEdgeKey(e.from, e.to)) {
                    if (!edgeMembers.has(e.id)) edgeMembers.set(e.id, []);
                    edgeMembers.get(e.id).push({ name: s.name, color });
                }
            });
        });

        const nodes = baseNodes.map((n) => {
            const members = nodeMembers.get(n.id);
            if (!members?.length) return { ...n, opacity: 0.25, borderWidth: 1 };
            const primary = members[0];
            return {
                ...n,
                opacity: 1,
                borderWidth: 4,
                color: { border: primary.color },
                title: `${n.title}<br><b>Slices:</b> ${members.map((m) => m.name).join(", ")}`,
            };
        });
        const edges = baseEdges.map((e) => {
            const members = edgeMembers.get(e.id);
            if (!members?.length) return { ...e, color: { color: "#cbd5e1", opacity: 0.2 }, width: 2 };
            const primary = members[0];
            return {
                ...e,
                color: { color: primary.color, opacity: 1 },
                width: 4,
                dashes: members.length > 1,
                title: `Shared by: ${members.map((m) => m.name).join(", ")}`,
            };
        });
        return { nodes, edges };
    }

    // A specific slice id is selected
    const activeSlice = slices.find((s) => String(s.id) === String(mode));
    if (!activeSlice) {
        return {
            nodes: baseNodes.map((n) => ({ ...n, opacity: 1, borderWidth: 1 })),
            edges: baseEdges.map((e) => ({ ...e, opacity: 1 })),
        };
    }

    const { nodeIds, hasEdgeKey } = computeSliceFootprint(activeSlice, finalData.links);
    const nodes = baseNodes.map((n) =>
        nodeIds.has(n.id)
            ? { ...n, opacity: 1, borderWidth: 4, color: { border: "#2563eb" } }
            : { ...n, opacity: 0.18, borderWidth: 1 }
    );
    const edges = baseEdges.map((e) =>
        hasEdgeKey(e.from, e.to)
            ? { ...e, color: { color: "#2563eb", opacity: 1 }, width: 5 }
            : { ...e, color: { color: "#cbd5e1", opacity: 0.12 }, width: 1 }
    );
    return { nodes, edges };
}

const sliceStats = (slice) => {
    const hostIds = new Set(slice.targets.map((t) => t.hostId).filter(Boolean));
    const switchIds = new Set(slice.targets.map((t) => t.targetSwitch).filter(Boolean));
    return { hostCount: hostIds.size, switchCount: switchIds.size, flowCount: slice.targets.length };
};

const TopologySimple = ({ topologyData: propsData, onReload }) => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const navigate = useNavigate();
    const [selectedNode, setSelectedNode] = useState(null);
    const [sliceViewMode, setSliceViewMode] = useState("physical");
    const [rulesOpen, setRulesOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { data: pipelineData, fetch: pipelineReload, loading: pipelineLoading } = useTopology();
    const { slices, setSlices } = useSlices();

    const rawData = propsData || pipelineData;
    const finalData = (rawData && !rawData.nodes) ? extractDeviceData(rawData) : rawData;
    const handleReload = onReload || pipelineReload;

    const activeSlice = useMemo(
        () => slices.find((s) => String(s.id) === String(sliceViewMode)) || null,
        [slices, sliceViewMode]
    );

    // If the selected slice gets deleted elsewhere (e.g. from the Slicing page), fall back cleanly.
    useEffect(() => {
        if (sliceViewMode !== "physical" && sliceViewMode !== "all" && !activeSlice) {
            setSliceViewMode("physical");
        }
    }, [sliceViewMode, activeSlice]);

    useEffect(() => {
        setRulesOpen(false);
        setConfirmDelete(false);
    }, [sliceViewMode]);

    useEffect(() => {
        if (!finalData || !finalData.nodes || finalData.nodes.length === 0) return;

        const styled = buildStyledGraph(finalData, sliceViewMode, slices);
        const nodes = new DataSet(styled.nodes);
        const edges = new DataSet(styled.edges);

        const options = {
            width: "100%", height: "650px",
            nodes: {
                size: 35, shadow: true,
                font: { color: "#334155", size: 12, face: "Inter" }
            },
            edges: {
                length: 250, width: 2,
                color: { color: "#cbd5e1", highlight: "#3b82f6" },
                smooth: { type: "continuous" }
            },
            groups: {
                switch: { shape: "image", image: "/assets/images/Device_switch_3062_unknown_64.png" },
                host: { shape: "image", image: "/assets/images/Device_pc_3045_default_64.png" },
            },
            physics: { enabled: true, barnesHut: { gravitationalConstant: -8000 } }
        };

        const network = new Network(containerRef.current, { nodes, edges }, options);
        networkRef.current = network;

        network.on("click", (params) => {
            if (params.nodes.length > 0) {
                const node = nodes.get(params.nodes[0]);
                setSelectedNode(node);
            } else {
                setSelectedNode(null);
            }
        });

        return () => networkRef.current?.destroy();
    }, [finalData, sliceViewMode, slices]);

    if (!finalData || !finalData.nodes || finalData.nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] w-full text-slate-400">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold uppercase text-sm">Discovering Topology...</p>
                <button onClick={() => handleReload(true)} className="mt-6 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">Retry Reload</button>
            </div>
        );
    }

    const handleDeleteSlice = async (slice) => {
        try {
            await unprogramSlice(slice);
            setSlices(slices.filter((s) => s.id !== slice.id));
            setSliceViewMode("physical");
        } catch (e) {
            // Leave the slice in place if the switch rejected the teardown — nothing to visually rewrite here yet.
        }
    };

    return (
        <div className="p-4 animate-in fade-in duration-500">
            {/* HEADER + SLICE VIEW CONTROL */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Network Map</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        {sliceViewMode === "physical" ? "Physical Infrastructure" : sliceViewMode === "all" ? "All Logical Slices" : `Slice View — ${activeSlice?.name || ""}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        <select
                            value={sliceViewMode}
                            onChange={(e) => setSliceViewMode(e.target.value)}
                            className="appearance-none bg-white border-2 border-slate-200 rounded-2xl pl-10 pr-9 py-3 text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value="physical">Physical Network</option>
                            <option value="all">All Slices</option>
                            {slices.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                    <button onClick={() => handleReload(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">
                        Refresh Links
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* LEFT: MAP */}
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                    <div ref={containerRef} className="bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner" style={{ height: "650px" }} />
                </div>

                {/* RIGHT: SLICE DETAILS (when a slice is selected) OR NODE INSPECTOR */}
                <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm h-fit sticky top-28">
                    <AnimatePresence mode="wait">
                        {activeSlice ? (
                            <motion.div key="slice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Shield size={18} /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">{activeSlice.name}</h3>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${activeSlice.paused ? "text-amber-500" : "text-emerald-500"}`}>
                                            {activeSlice.paused ? "Paused" : "Active"}
                                        </span>
                                    </div>
                                </div>

                                {(() => {
                                    const { hostCount, switchCount } = sliceStats(activeSlice);
                                    return (
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1 mb-1"><Activity size={10} /> Hosts</p>
                                                <p className="text-lg font-black text-slate-800">{activeSlice.type === "link" ? "—" : hostCount}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1 mb-1"><Zap size={10} /> Switches</p>
                                                <p className="text-lg font-black text-slate-800">{switchCount}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1 mb-1"><Gauge size={10} /> Bandwidth</p>
                                                <p className="text-sm font-black text-slate-800">{activeSlice.qosBandwidth ? `${activeSlice.qosBandwidth} Kbps` : "Blocked"}</p>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Priority</p>
                                                <p className="text-sm font-black text-slate-800">{activeSlice.priority || "Medium"}</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="space-y-2 mb-6 text-[11px] font-bold">
                                    <div className="flex justify-between"><span className="text-slate-400 uppercase">Traffic Policy</span><span className="text-slate-700">{(activeSlice.traffic || "All Traffic").split("(")[0]}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 uppercase">Isolation</span><span className="text-emerald-600">Enabled</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 uppercase">Flow Rules</span><span className="text-slate-700">{activeSlice.targets.length}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 uppercase">QoS Meter</span><span className="text-slate-700">{activeSlice.qosBandwidth && !activeSlice.paused ? "Active" : "None"}</span></div>
                                    {activeSlice.latency === "Low" && (
                                        <>
                                            <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-slate-400 uppercase">Latency Requested</span><span className="text-slate-700">LOW</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400 uppercase">DSCP</span><span className="text-slate-700">{activeSlice.latencyPolicy?.dscp ?? 46}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400 uppercase">Queue</span><span className="text-slate-700">{activeSlice.latencyPolicy?.queue ?? 0}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400 uppercase">QoS</span><span className="text-slate-700">{activeSlice.latencyPolicy?.qos ?? "HTB"}</span></div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 uppercase">Latency Policy</span>
                                                <span className={
                                                    activeSlice.latencyPolicy?.status === "ACTIVE" ? "text-emerald-600"
                                                    : activeSlice.latencyPolicy?.status === "ERROR" ? "text-red-600"
                                                    : "text-slate-500"
                                                } title={activeSlice.latencyPolicy?.error || ""}>
                                                    {activeSlice.latencyPolicy?.status || "NOT_APPLIED"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between"><span className="text-slate-400 uppercase">Measured</span><span className="text-slate-400 italic">Not measured</span></div>
                                        </>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {rulesOpen && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                                            <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                                                {activeSlice.targets.map((t, i) => (
                                                    <p key={i} className="text-[10px] font-mono text-blue-300">
                                                        {t.targetSwitch} : P{t.port} {t.meterId ? `· meter=${t.meterId}` : ""}
                                                    </p>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setSliceViewMode("physical")} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] py-3 rounded-xl transition-all">
                                        <EyeOff size={13} /> Hide Slice
                                    </button>
                                    <button onClick={() => setRulesOpen((v) => !v)} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] py-3 rounded-xl transition-all">
                                        <ListTree size={13} /> {rulesOpen ? "Hide Rules" : "View Rules"}
                                    </button>
                                    <button
                                        onClick={() => navigate("/slicing", { state: {
                                            intentPayload: {
                                                name: activeSlice.name, isolationMode: activeSlice.type, trafficType: activeSlice.traffic,
                                                bandwidth: activeSlice.qosBandwidth || "", priority: activeSlice.priority, latency: activeSlice.latency,
                                            },
                                            hostHints: [],
                                            sliceId: activeSlice.id,
                                            selectedHosts: activeSlice.type === "host" ? activeSlice.targets.map((t) => t.hostId).filter(Boolean) : [],
                                        } })}
                                        className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-black uppercase text-[10px] py-3 rounded-xl transition-all"
                                    >
                                        <Pencil size={13} /> Edit Slice
                                    </button>
                                    <button
                                        onClick={() => confirmDelete ? handleDeleteSlice(activeSlice) : setConfirmDelete(true)}
                                        className={`flex items-center justify-center gap-2 font-black uppercase text-[10px] py-3 rounded-xl transition-all ${confirmDelete ? "bg-red-500 text-white" : "bg-red-50 hover:bg-red-100 text-red-600"}`}
                                    >
                                        <Trash2 size={13} /> {confirmDelete ? "Confirm?" : "Delete Slice"}
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="inspector" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">
                                        {sliceViewMode === "all" ? "All Slices — Legend" : "Node Inspector"}
                                    </h3>
                                </div>

                                {sliceViewMode === "all" ? (
                                    slices.length === 0 ? (
                                        <p className="text-slate-300 italic text-sm text-center py-20">No logical slices provisioned yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {slices.map((s, idx) => (
                                                <button key={s.id} onClick={() => setSliceViewMode(String(s.id))}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all text-left">
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sliceColor(idx) }} />
                                                    <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )
                                ) : selectedNode ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Device ID</p>
                                            <p className="font-mono text-blue-600 font-bold break-all">{selectedNode.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Specifications</p>
                                            <div className="text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedNode.title }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <p className="text-slate-300 italic text-sm">Select a node on the map to view details</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default TopologySimple;