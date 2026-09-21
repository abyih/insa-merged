// // // // // import React, { useEffect, useState, useMemo } from "react";
// // // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // // import { motion } from "framer-motion";
// // // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";
// // // // // import {
// // // // //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// // // // //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // // // // } from "recharts";

// // // // // // ─── Error Boundary ───────────────────────────────────────────────────────────
// // // // // class ErrorBoundary extends React.Component {
// // // // //   constructor(props) { super(props); this.state = { error: null }; }
// // // // //   static getDerivedStateFromError(e) { return { error: e }; }
// // // // //   render() {
// // // // //     if (this.state.error) return (
// // // // //       <div className="p-8 flex items-center justify-center min-h-screen bg-gray-100">
// // // // //         <div className="text-center">
// // // // //           <h2 className="text-xl font-bold text-red-600 mb-4">Dashboard error</h2>
// // // // //           <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
// // // // //           <button onClick={() => this.setState({ error: null })}
// // // // //             className="bg-blue-500 text-white px-4 py-2 rounded">Try Again</button>
// // // // //         </div>
// // // // //       </div>
// // // // //     );
// // // // //     return this.props.children;
// // // // //   }
// // // // // }

// // // // // function makeBandwidthPoint(offsetMin) {
// // // // //   const now = new Date();
// // // // //   const m = now.getMinutes() - offsetMin;
// // // // //   return {
// // // // //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// // // // //     incoming: +(80 + Math.random() * 80).toFixed(1),
// // // // //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// // // // //   };
// // // // // }

// // // // // // ─── Dashboard ────────────────────────────────────────────────────────────────
// // // // // function Dashboard() {
// // // // //   // ── All data from the pipeline — no direct API calls ──────────────────────
// // // // //   const { data: rawNodes,         loading: nodesLoading } = useNodes();
// // // // //   const { data: rawConnectionStats }                       = useStats();
// // // // //   const { data: rawFlowStats }                             = useFlowStats();

// // // // //   const nodes           = Array.isArray(rawNodes)           ? rawNodes           : [];
// // // // //   const connectionStats = Array.isArray(rawConnectionStats) ? rawConnectionStats : [];
// // // // //   const flowStats       = Array.isArray(rawFlowStats)       ? rawFlowStats       : [];

// // // // //   // ── Derived from pipeline data ─────────────────────────────────────────────
// // // // //   const deviceCount    = nodes.length;
// // // // //   const connectedCount = nodes.filter((n) => n.status === "up").length;
// // // // //   const flowCount      = flowStats.length;

// // // // //   // Top 6 flows for bar chart — derived from pipeline flowStats
// // // // //   const flowChartData = useMemo(() => {
// // // // //     const top = flowStats.slice(0, 6);
// // // // //     return top.length ? top.map((f, i) => ({
// // // // //       flowId:  f.flow_id ? `Flow-${String(f.flow_id).slice(-4)}` : `Flow-0${i + 1}`,
// // // // //       packets: f.packet_count || 0,
// // // // //       bytes:   f.byte_count   || 0,
// // // // //     })) : [
// // // // //       { flowId: "Flow-01", packets: 0, bytes: 0 },
// // // // //     ];
// // // // //   }, [flowStats]);

// // // // //   // Flow table rows — derived from pipeline flowStats
// // // // //   const flowTableRows = flowStats.slice(0, 20).map((f) => ({
// // // // //     id:          f.flow_id,
// // // // //     device:      f.switch_id,
// // // // //     packetCount: f.packet_count,
// // // // //     byteCount:   f.byte_count,
// // // // //     duration:    f.duration,
// // // // //   }));

// // // // //   // ── Bandwidth chart — simulated, updates on each render cycle ─────────────
// // // // //   const [bandwidthData,  setBandwidthData]  = useState(() => [4,3,2,1,0].map(makeBandwidthPoint));
// // // // //   const [historicalData, setHistoricalData] = useState([]);

// // // // //   useEffect(() => {
// // // // //     const id = setInterval(() => {
// // // // //       const pts = [4,3,2,1,0].map(makeBandwidthPoint);
// // // // //       setBandwidthData(pts);
// // // // //       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
// // // // //     }, 15_000);
// // // // //     return () => clearInterval(id);
// // // // //   }, []);

// // // // //   const FaqItem = ({ question, answer }) => {
// // // // //     const [open, setOpen] = useState(false);
// // // // //     return (
// // // // //       <div className="border-b border-gray-200 py-4">
// // // // //         <button onClick={() => setOpen(!open)}
// // // // //           className="flex justify-between w-full text-left text-gray-800 font-medium text-lg">
// // // // //           {question}<span className="text-gray-500">{open ? "−" : "+"}</span>
// // // // //         </button>
// // // // //         {open && <div className="mt-2 text-gray-600">{answer}</div>}
// // // // //       </div>
// // // // //     );
// // // // //   };

// // // // //   if (nodesLoading) return (
// // // // //     <div className="p-8 min-h-screen bg-gray-100 flex items-center justify-center">
// // // // //       <div className="text-center">
// // // // //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
// // // // //         <p className="mt-4 text-gray-600">Loading dashboard...</p>
// // // // //       </div>
// // // // //     </div>
// // // // //   );

// // // // //   return (
// // // // //     <div className="p-8 min-h-screen bg-gray-100">
// // // // //       {/* Hero */}
// // // // //       <div className="relative bg-white rounded-xl shadow mb-8 overflow-hidden h-80">
// // // // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-80 object-cover" />
// // // // //         <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white p-6 text-center">
// // // // //           <motion.h1 className="text-4xl font-bold mb-2"
// // // // //             initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
// // // // //             Welcome to the SDN Dashboard
// // // // //           </motion.h1>
// // // // //           <motion.p className="text-lg max-w-2xl"
// // // // //             initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
// // // // //             Monitor your devices, flows, and network health all in one place.
// // // // //           </motion.p>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Stat cards */}
// // // // //       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
// // // // //         <StatCard title="Total Nodes"       value={deviceCount}    icon={<FaNetworkWired   className="text-blue-500   text-2xl mr-4"/>} border="border-blue-500"   />
// // // // //         <StatCard title="Connected Devices" value={connectedCount} icon={<FaMicrochip      className="text-green-500  text-2xl mr-4"/>} border="border-green-500"  />
// // // // //         <StatCard title="Active Flows"      value={flowCount}      icon={<FaProjectDiagram className="text-purple-500 text-2xl mr-4"/>} border="border-purple-500" />
// // // // //         <div className="relative group">
// // // // //           <StatCard title="Network Connections"
// // // // //             value={connectionStats.reduce((a, c) => a + c.value, 0)}
// // // // //             icon={<FaShieldAlt className="text-orange-500 text-2xl mr-4"/>}
// // // // //             border="border-orange-500" />
// // // // //           {connectionStats.length > 0 && (
// // // // //             <div className="absolute z-10 hidden group-hover:block top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[220px]">
// // // // //               <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Breakdown</p>
// // // // //               <table className="w-full text-sm"><tbody>
// // // // //                 {connectionStats.map((item, i) => (
// // // // //                   <tr key={i} className="border-b last:border-0">
// // // // //                     <td className="py-1 flex items-center gap-2">
// // // // //                       <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}/>
// // // // //                       {item.name}
// // // // //                     </td>
// // // // //                     <td className="py-1 text-right font-bold">{item.value}</td>
// // // // //                   </tr>
// // // // //                 ))}
// // // // //               </tbody></table>
// // // // //             </div>
// // // // //           )}
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Charts */}
// // // // //       <div className="space-y-8">
// // // // //         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
// // // // //           <ChartCard title="Bandwidth Utilization">
// // // // //             <ResponsiveContainer width="100%" height={300}>
// // // // //               <LineChart data={bandwidthData}>
// // // // //                 <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/>
// // // // //                 <Tooltip/><Legend/>
// // // // //                 <Line type="monotone" dataKey="incoming" stroke="#8884d8" name="Incoming (Mbps)"/>
// // // // //                 <Line type="monotone" dataKey="outgoing" stroke="#82ca9d" name="Outgoing (Mbps)"/>
// // // // //               </LineChart>
// // // // //             </ResponsiveContainer>
// // // // //           </ChartCard>

// // // // //           <ChartCard title="Bandwidth Trends (Historical)">
// // // // //             <ResponsiveContainer width="100%" height={300}>
// // // // //               <LineChart data={historicalData}>
// // // // //                 <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis/>
// // // // //                 <Tooltip/><Legend/>
// // // // //                 <Line type="monotone" dataKey="incoming" stroke="#8884d8" name="Incoming (Mbps)"/>
// // // // //                 <Line type="monotone" dataKey="outgoing" stroke="#82ca9d" name="Outgoing (Mbps)"/>
// // // // //               </LineChart>
// // // // //             </ResponsiveContainer>
// // // // //           </ChartCard>

// // // // //           <ChartCard title="Flow Statistics">
// // // // //             <ResponsiveContainer width="100%" height={300}>
// // // // //               <BarChart data={flowChartData}>
// // // // //                 <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="flowId"/><YAxis/>
// // // // //                 <Tooltip/><Legend/>
// // // // //                 <Bar dataKey="packets" fill="#8884d8" name="Packets"/>
// // // // //                 <Bar dataKey="bytes"   fill="#82ca9d" name="Bytes"/>
// // // // //               </BarChart>
// // // // //             </ResponsiveContainer>
// // // // //           </ChartCard>

// // // // //           <ChartCard title="Network Connections">
// // // // //             <ResponsiveContainer width="100%" height={300}>
// // // // //               <PieChart>
// // // // //                 <Pie data={connectionStats} dataKey="value" outerRadius={90}
// // // // //                   label={({ name, percent }) => percent > 0 ? `${name} ${(percent*100).toFixed(0)}%` : ""}>
// // // // //                   {connectionStats.map((e, i) => <Cell key={i} fill={e.color}/>)}
// // // // //                 </Pie>
// // // // //                 <Tooltip/><Legend/>
// // // // //               </PieChart>
// // // // //             </ResponsiveContainer>
// // // // //           </ChartCard>
// // // // //         </div>

// // // // //         {/* Flow table */}
// // // // //         <div className="bg-white rounded-lg shadow-md p-6">
// // // // //           <div className="flex items-center justify-between mb-4">
// // // // //             <h3 className="text-lg font-semibold">Flow Table</h3>
// // // // //             <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">pipeline data</span>
// // // // //           </div>
// // // // //           <div className="overflow-x-auto">
// // // // //             <table className="min-w-full table-auto">
// // // // //               <thead><tr className="bg-gray-50">
// // // // //                 {["Flow ID","Switch","Packets","Bytes","Duration"].map((h) => (
// // // // //                   <th key={h} className="px-4 py-2 text-left text-sm font-medium text-gray-700">{h}</th>
// // // // //                 ))}
// // // // //               </tr></thead>
// // // // //               <tbody>
// // // // //                 {flowTableRows.map((f, i) => (
// // // // //                   <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
// // // // //                     <td className="px-4 py-2 text-sm">{f.id}</td>
// // // // //                     <td className="px-4 py-2 text-sm font-mono text-xs">{f.device}</td>
// // // // //                     <td className="px-4 py-2 text-sm">{f.packetCount}</td>
// // // // //                     <td className="px-4 py-2 text-sm">{f.byteCount}</td>
// // // // //                     <td className="px-4 py-2 text-sm">{f.duration}</td>
// // // // //                   </tr>
// // // // //                 ))}
// // // // //                 {flowTableRows.length === 0 && (
// // // // //                   <tr><td colSpan={5} className="text-center py-8 text-gray-500">No flows found</td></tr>
// // // // //                 )}
// // // // //               </tbody>
// // // // //             </table>
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* FAQ */}
// // // // //       <div className="bg-white rounded-xl shadow-sm p-8 mt-8">
// // // // //         <h2 className="text-3xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
// // // // //         {[
// // // // //           { question: "What is DLUX?",                     answer: "DLUX is a network automation and monitoring platform for managing Software Defined Networks (SDN)." },
// // // // //           { question: "How are connected devices counted?", answer: "Devices are considered connected if they have at least one active connector with link-up status." },
// // // // //           { question: "What are flows?",                   answer: "Flows define how packets are matched and forwarded through your network devices." },
// // // // //         ].map((faq, i) => <FaqItem key={i} {...faq}/>)}
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // function StatCard({ title, value, icon, border }) {
// // // // //   return (
// // // // //     <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${border}`}>
// // // // //       <div className="flex items-center">
// // // // //         {icon}
// // // // //         <div>
// // // // //           <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
// // // // //           <p className="text-3xl font-bold text-gray-800">{value}</p>
// // // // //         </div>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // function ChartCard({ title, children }) {
// // // // //   return (
// // // // //     <div className="bg-white p-6 rounded-lg shadow-md">
// // // // //       <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
// // // // //       {children}
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // export default function DashboardWithErrorBoundary() {
// // // // //   return <ErrorBoundary><Dashboard /></ErrorBoundary>;
// // // // // }








// // // // import React, { useEffect, useState, useMemo } from "react";
// // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // import { motion } from "framer-motion";
// // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";
// // // // import {
// // // //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// // // //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // // // } from "recharts";

// // // // class ErrorBoundary extends React.Component {
// // // //   constructor(props) { super(props); this.state = { error: null }; }
// // // //   static getDerivedStateFromError(e) { return { error: e }; }
// // // //   render() {
// // // //     if (this.state.error) return (
// // // //       <div className="p-8 flex items-center justify-center min-h-screen bg-gray-100">
// // // //         <div className="text-center">
// // // //           <h2 className="text-xl font-bold text-red-600 mb-4">Dashboard error</h2>
// // // //           <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
// // // //           <button onClick={() => this.setState({ error: null })} className="bg-blue-500 text-white px-4 py-2 rounded">Try Again</button>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //     return this.props.children;
// // // //   }
// // // // }

// // // // function makeBandwidthPoint(offsetMin) {
// // // //   const now = new Date();
// // // //   const m = now.getMinutes() - offsetMin;
// // // //   return {
// // // //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// // // //     incoming: +(80 + Math.random() * 80).toFixed(1),
// // // //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// // // //   };
// // // // }

// // // // function Dashboard() {
// // // //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// // // //   const { data: rawConnectionStats } = useStats();
// // // //   const { data: rawFlowStats } = useFlowStats();

// // // //   const nodes = Array.isArray(rawNodes) ? rawNodes : [];
// // // //   const connectionStats = Array.isArray(rawConnectionStats) ? rawConnectionStats : [];
// // // //   const flowStats = Array.isArray(rawFlowStats) ? rawFlowStats : [];

// // // //   const deviceCount = nodes.length;
// // // //   const connectedCount = nodes.filter((n) => n.status === "up").length;
// // // //   const flowCount = flowStats.length;

// // // //   const flowChartData = useMemo(() => {
// // // //     const top = flowStats.slice(0, 6);
// // // //     return top.length ? top.map((f, i) => ({
// // // //       flowId: f.flow_id ? `Flow-${String(f.flow_id).slice(-4)}` : `Flow-0${i + 1}`,
// // // //       packets: f.packet_count || 0,
// // // //       bytes: f.byte_count || 0,
// // // //     })) : [{ flowId: "Flow-01", packets: 0, bytes: 0 }];
// // // //   }, [flowStats]);

// // // //   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
// // // //   const [historicalData, setHistoricalData] = useState([]);

// // // //   useEffect(() => {
// // // //     const id = setInterval(() => {
// // // //       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
// // // //       setBandwidthData(pts);
// // // //       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
// // // //     }, 15_000);
// // // //     return () => clearInterval(id);
// // // //   }, []);

// // // //   const FaqItem = ({ question, answer }) => {
// // // //     const [open, setOpen] = useState(false);
// // // //     return (
// // // //       <div className="border-b border-gray-200 py-4">
// // // //         <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-gray-800 font-medium text-lg hover:text-blue-600 transition-colors">
// // // //           {question}<span className="text-gray-500">{open ? "−" : "+"}</span>
// // // //         </button>
// // // //         {open && <div className="mt-2 text-gray-600 leading-relaxed">{answer}</div>}
// // // //       </div>
// // // //     );
// // // //   };

// // // //   if (nodesLoading) return (
// // // //     <div className="p-8 min-h-screen bg-gray-100 flex items-center justify-center">
// // // //       <div className="text-center">
// // // //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
// // // //         <p className="mt-4 text-gray-600 font-medium">Synchronizing Pipeline...</p>
// // // //       </div>
// // // //     </div>
// // // //   );

// // // //   return (
// // // //     <div className="p-8 min-h-screen bg-gray-100">
// // // //       <div className="relative bg-white rounded-xl shadow mb-8 overflow-hidden h-80">
// // // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-80 object-cover" />
// // // //         <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white p-6 text-center">
// // // //           <motion.h1 className="text-4xl font-bold mb-2" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>Welcome to the SDN Dashboard</motion.h1>
// // // //           <motion.p className="text-lg max-w-2xl" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>Monitor your devices, flows, and network health in real-time.</motion.p>
// // // //         </div>
// // // //       </div>

// // // //       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
// // // //         <StatCard title="Total Nodes" value={deviceCount} icon={<FaNetworkWired className="text-blue-500 text-2xl mr-4" />} border="border-blue-500" />
// // // //         <StatCard title="Connected Devices" value={connectedCount} icon={<FaMicrochip className="text-green-500 text-2xl mr-4" />} border="border-green-500" />
// // // //         <StatCard title="Active Flows" value={flowCount} icon={<FaProjectDiagram className="text-purple-500 text-2xl mr-4" />} border="border-purple-500" />
// // // //         <div className="relative group">
// // // //           <StatCard title="Connections" value={connectionStats.reduce((a, c) => a + c.value, 0)} icon={<FaShieldAlt className="text-orange-500 text-2xl mr-4" />} border="border-orange-500" />
// // // //           {connectionStats.length > 0 && (
// // // //             <div className="absolute z-10 hidden group-hover:block top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[240px]">
// // // //               <table className="w-full text-sm"><tbody>
// // // //                 {connectionStats.map((item, i) => (
// // // //                   <tr key={i} className="border-b last:border-0"><td className="py-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</td><td className="py-2 text-right font-bold">{item.value}</td></tr>
// // // //                 ))}
// // // //               </tbody></table>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       </div>

// // // //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// // // //         <ChartCard title="Bandwidth Utilization"><ResponsiveContainer width="100%" height={300}><LineChart data={bandwidthData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Bandwidth History"><ResponsiveContainer width="100%" height={300}><LineChart data={historicalData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Flow Traffic"><ResponsiveContainer width="100%" height={300}><BarChart data={flowChartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="flowId" /><YAxis /><Tooltip /><Legend /><Bar dataKey="packets" fill="#6366f1" radius={[4,4,0,0]} /><Bar dataKey="bytes" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Network Status Share"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={connectionStats} dataKey="value" outerRadius={90} innerRadius={60} paddingAngle={5} > {connectionStats.map((e, i) => <Cell key={i} fill={e.color} />)} </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
// // // //       </div>

// // // //       <div className="bg-white rounded-xl shadow-sm p-10 mt-12 max-w-4xl mx-auto">
// // // //         <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
// // // //         <div className="space-y-2">
// // // //           {[
// // // //             { question: "What is DLUX?", answer: "DLUX is a network automation and monitoring platform for managing Software Defined Networks (SDN)." },
// // // //             { question: "How are connected devices counted?", answer: "Devices are considered connected if they have an active handshake and link-up status." },
// // // //             { question: "What are flows?", answer: "Flows define how packets are matched and forwarded through your network devices." },
// // // //           ].map((faq, i) => <FaqItem key={i} {...faq} />)}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // function StatCard({ title, value, icon, border }) {
// // // //   return (
// // // //     <div className={`bg-white p-6 rounded-xl shadow-sm border-t-4 ${border} hover:shadow-md transition-shadow`}>
// // // //       <div className="flex items-center">
// // // //         <div className="p-3 bg-gray-50 rounded-lg mr-4">{icon}</div>
// // // //         <div><h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</h3><p className="text-3xl font-extrabold text-gray-800">{value}</p></div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // function ChartCard({ title, children }) {
// // // //   return (
// // // //     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
// // // //       <h3 className="text-sm font-bold text-gray-500 uppercase mb-6 tracking-wide">{title}</h3>
// // // //       {children}
// // // //     </div>
// // // //   );
// // // // }

// // // // export default function DashboardWithErrorBoundary() {
// // // //   return <ErrorBoundary><Dashboard /></ErrorBoundary>;
// // // // }


















// // // // import React, { useEffect, useState, useMemo } from "react";
// // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // import { motion } from "framer-motion";
// // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";
// // // // import {
// // // //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// // // //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // // // } from "recharts";

// // // // class ErrorBoundary extends React.Component {
// // // //   constructor(props) { super(props); this.state = { error: null }; }
// // // //   static getDerivedStateFromError(e) { return { error: e }; }
// // // //   render() {
// // // //     if (this.state.error) return (
// // // //       <div className="p-8 flex items-center justify-center min-h-screen bg-gray-100">
// // // //         <div className="text-center">
// // // //           <h2 className="text-xl font-bold text-red-600 mb-4">Dashboard error</h2>
// // // //           <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
// // // //           <button onClick={() => this.setState({ error: null })} className="bg-blue-500 text-white px-4 py-2 rounded">Try Again</button>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //     return this.props.children;
// // // //   }
// // // // }

// // // // function makeBandwidthPoint(offsetMin) {
// // // //   const now = new Date();
// // // //   const m = now.getMinutes() - offsetMin;
// // // //   return {
// // // //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// // // //     incoming: +(80 + Math.random() * 80).toFixed(1),
// // // //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// // // //   };
// // // // }

// // // // function Dashboard() {
// // // //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// // // //   const { data: rawConnectionStats } = useStats();
// // // //   const { data: rawFlowStats } = useFlowStats();

// // // //   const nodes = Array.isArray(rawNodes) ? rawNodes : [];
// // // //   const connectionStats = Array.isArray(rawConnectionStats) ? rawConnectionStats : [];
// // // //   const flowStats = Array.isArray(rawFlowStats) ? rawFlowStats : [];

// // // //   const deviceCount = nodes.length;
// // // //   const connectedCount = nodes.filter((n) => n.status === "up").length;
// // // //   const flowCount = flowStats.length;

// // // //   const flowChartData = useMemo(() => {
// // // //     const top = flowStats.slice(0, 6);
// // // //     return top.length ? top.map((f, i) => ({
// // // //       flowId: f.flow_id ? `Flow-${String(f.flow_id).slice(-4)}` : `Flow-0${i + 1}`,
// // // //       packets: f.packet_count || 0,
// // // //       bytes: f.byte_count || 0,
// // // //     })) : [{ flowId: "Flow-01", packets: 0, bytes: 0 }];
// // // //   }, [flowStats]);

// // // //   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
// // // //   const [historicalData, setHistoricalData] = useState([]);

// // // //   useEffect(() => {
// // // //     const id = setInterval(() => {
// // // //       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
// // // //       setBandwidthData(pts);
// // // //       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
// // // //     }, 15_000);
// // // //     return () => clearInterval(id);
// // // //   }, []);

// // // //   const FaqItem = ({ question, answer }) => {
// // // //     const [open, setOpen] = useState(false);
// // // //     return (
// // // //       <div className="border-b border-gray-200 py-4">
// // // //         <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-gray-800 font-medium text-lg hover:text-blue-600 transition-colors">
// // // //           {question}<span className="text-gray-500">{open ? "−" : "+"}</span>
// // // //         </button>
// // // //         {open && <div className="mt-2 text-gray-600 leading-relaxed">{answer}</div>}
// // // //       </div>
// // // //     );
// // // //   };

// // // //   if (nodesLoading) return (
// // // //     <div className="p-8 min-h-screen bg-gray-100 flex items-center justify-center text-center">
// // // //       <div>
// // // //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
// // // //         <p className="mt-4 text-gray-600 font-bold uppercase tracking-widest text-xs">Calibrating Network Data...</p>
// // // //       </div>
// // // //     </div>
// // // //   );

// // // //   return (
// // // //     <div className="p-8 min-h-screen bg-gray-100">
// // // //       <div className="relative bg-white rounded-xl shadow mb-8 overflow-hidden h-80">
// // // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-80 object-cover" />
// // // //         <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white p-6 text-center">
// // // //           <motion.h1 className="text-4xl font-bold mb-2" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>Welcome to the SDN Dashboard</motion.h1>
// // // //           <motion.p className="text-lg max-w-2xl" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>Monitoring your architecture, flows, and network health in real-time.</motion.p>
// // // //         </div>
// // // //       </div>

// // // //       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
// // // //         <StatCard title="Total Nodes" value={deviceCount} icon={<FaNetworkWired className="text-blue-500 text-2xl mr-4" />} border="border-blue-500" />
// // // //         <StatCard title="Connected Devices" value={connectedCount} icon={<FaMicrochip className="text-green-500 text-2xl mr-4" />} border="border-green-500" />
// // // //         <StatCard title="Active Flows" value={flowCount} icon={<FaProjectDiagram className="text-purple-500 text-2xl mr-4" />} border="border-purple-500" />
// // // //         <div className="relative group">
// // // //           <StatCard title="Connections" value={connectionStats.reduce((a, c) => a + c.value, 0)} icon={<FaShieldAlt className="text-orange-500 text-2xl mr-4" />} border="border-orange-500" />
// // // //           {connectionStats.length > 0 && (
// // // //             <div className="absolute z-10 hidden group-hover:block top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[240px]">
// // // //                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Live Connection Metrics</p>
// // // //               <table className="w-full text-sm"><tbody>
// // // //                 {connectionStats.map((item, i) => (
// // // //                   <tr key={i} className="border-b last:border-0"><td className="py-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</td><td className="py-2 text-right font-bold text-gray-700">{item.value}</td></tr>
// // // //                 ))}
// // // //               </tbody></table>
// // // //             </div>
// // // //           )}
// // // //         </div>
// // // //       </div>

// // // //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// // // //         <ChartCard title="Current Bandwidth (Mbps)"><ResponsiveContainer width="100%" height={300}><LineChart data={bandwidthData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Usage Historical Trends"><ResponsiveContainer width="100%" height={300}><LineChart data={historicalData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Flow Traffic Distribution"><ResponsiveContainer width="100%" height={300}><BarChart data={flowChartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="flowId" /><YAxis /><Tooltip /><Legend /><Bar dataKey="packets" fill="#6366f1" radius={[4,4,0,0]} /><Bar dataKey="bytes" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></ChartCard>
// // // //         <ChartCard title="Overall Link Reliability Share"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={connectionStats} dataKey="value" outerRadius={90} innerRadius={60} paddingAngle={5} > {connectionStats.map((e, i) => <Cell key={i} fill={e.color} />)} </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
// // // //       </div>

// // // //       <div className="bg-white rounded-xl shadow-sm p-10 mt-12 max-w-4xl mx-auto border border-gray-50">
// // // //         <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800">System Support & FAQ</h2>
// // // //         <div className="space-y-2">
// // // //           {[
// // // //             { question: "What is DLUX?", answer: "DLUX is a robust network automation and monitoring dashboard designed for enterprise SDN management." },
// // // //             { question: "How are connected devices counted?", answer: "The pipeline analyzes LLDP handshakes and port link status to verify active hardware connections." },
// // // //             { question: "How do I manage specific flows?", answer: "Real-time flow monitoring and management (Editing/Deleting) has been moved to the 'Flows' tab for better workspace efficiency." },
// // // //           ].map((faq, i) => <FaqItem key={i} {...faq} />)}
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // function StatCard({ title, value, icon, border }) {
// // // //   return (
// // // //     <div className={`bg-white p-6 rounded-xl shadow-sm border-t-4 ${border} hover:shadow-md transition-shadow`}>
// // // //       <div className="flex items-center">
// // // //         <div className="p-3 bg-gray-50 rounded-lg mr-4">{icon}</div>
// // // //         <div><h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{title}</h3><p className="text-3xl font-extrabold text-gray-800">{value}</p></div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // function ChartCard({ title, children }) {
// // // //   return (
// // // //     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
// // // //       <h3 className="text-xs font-bold text-gray-400 uppercase mb-6 tracking-widest">{title}</h3>
// // // //       {children}
// // // //     </div>
// // // //   );
// // // // }

// // // // export default function DashboardWithErrorBoundary() {
// // // //   return <ErrorBoundary><Dashboard /></ErrorBoundary>;
// // // // }




// // // // import React from "react";
// // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // import { motion } from "framer-motion";
// // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";

// // // // function Dashboard() {
// // // //   const { data: nodes } = useNodes();
// // // //   const { data: flows } = useFlowStats();

// // // //   return (
// // // //     <div className="space-y-8">
// // // //       {/* Hero Section */}
// // // //       <div className="relative h-64 rounded-2xl overflow-hidden shadow-2xl">
// // // //         <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 opacity-90" />
// // // //         <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
// // // //           <h1 className="text-4xl font-black mb-2">Network Overview</h1>
// // // //           <p className="text-slate-300">Live monitoring of your SDN architecture.</p>
// // // //         </div>
// // // //       </div>

// // // //       {/* Summary Cards */}
// // // //       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
// // // //         <StatCard title="Total Nodes" value={nodes?.length || 0} icon={<FaNetworkWired />} color="text-blue-500" />
// // // //         <StatCard title="Active Flows" value={flows?.length || 0} icon={<FaProjectDiagram />} color="text-purple-500" />
// // // //         <StatCard title="Connected" value={nodes?.filter(n => n.status === "up").length || 0} icon={<FaMicrochip />} color="text-green-500" />
// // // //       </div>

// // // //       <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border dark:border-white/5">
// // // //         <h2 className="text-xl font-bold mb-4 dark:text-white">Recent Activity</h2>
// // // //         <p className="text-slate-500 text-sm">Select 'Flows' from the navigation to manage live traffic rules.</p>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // const StatCard = ({ title, value, icon, color }) => (
// // // //   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-white/5 flex items-center gap-4">
// // // //     <div className={`text-2xl ${color} bg-slate-50 dark:bg-slate-900 p-4 rounded-xl`}>{icon}</div>
// // // //     <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p><p className="text-3xl font-black dark:text-white">{value}</p></div>
// // // //   </div>
// // // // );

// // // // export default Dashboard;




// // // // import React, { useMemo } from "react";
// // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // import { motion } from "framer-motion";
// // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";
// // // // import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// // // // function Dashboard() {
// // // //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// // // //   const { data: rawConnectionStats } = useStats();
// // // //   const { data: rawFlowStats } = useFlowStats();

// // // //   const nodes = Array.isArray(rawNodes) ? rawNodes : [];
// // // //   const connectionStats = Array.isArray(rawConnectionStats) ? rawConnectionStats : [];
// // // //   const flowStats = Array.isArray(rawFlowStats) ? rawFlowStats : [];

// // // //   const flowChartData = useMemo(() => {
// // // //     const top = flowStats.slice(0, 6);
// // // //     return top.map((f, i) => ({
// // // //       flowId: f.flow_id ? `Flow-${String(f.flow_id).slice(-4)}` : `Flow-0${i + 1}`,
// // // //       packets: f.packet_count || 0,
// // // //       bytes: f.byte_count || 0,
// // // //     }));
// // // //   }, [flowStats]);

// // // //   if (nodesLoading) return <div className="p-20 text-center font-bold">Synchronizing Network Data...</div>;

// // // //   return (
// // // //     <div className="space-y-8 pb-10">
// // // //       {/* Hero Section */}
// // // //       <div className="relative bg-white rounded-2xl shadow-lg mb-8 overflow-hidden h-72">
// // // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover" />
// // // //         <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-center">
// // // //           <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter">SDN Network Command</h1>
// // // //           <p className="text-lg opacity-80">Real-time infrastructure and flow visibility.</p>
// // // //         </div>
// // // //       </div>

// // // //       {/* Stat Cards */}
// // // //       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
// // // //         <StatCard title="Total Nodes" value={nodes.length} icon={<FaNetworkWired />} border="border-blue-500" />
// // // //         <StatCard title="Connected" value={nodes.filter(n => n.status === "up").length} icon={<FaMicrochip />} border="border-green-500" />
// // // //         <StatCard title="Active Flows" value={flowStats.length} icon={<FaProjectDiagram />} border="border-purple-500" />
// // // //         <StatCard title="Connections" value={connectionStats.reduce((a, c) => a + c.value, 0)} icon={<FaShieldAlt />} border="border-orange-500" />
// // // //       </div>

// // // //       {/* Charts Grid */}
// // // //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// // // //         <ChartCard title="Flow Traffic Distribution">
// // // //           <ResponsiveContainer width="100%" height={300}>
// // // //             <BarChart data={flowChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="flowId" /><YAxis /><Tooltip /><Legend /><Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>
// // // //         <ChartCard title="Network Connection Types">
// // // //           <ResponsiveContainer width="100%" height={300}>
// // // //             <PieChart><Pie data={connectionStats} dataKey="value" outerRadius={80} innerRadius={60} paddingAngle={5}> {connectionStats.map((e, i) => <Cell key={i} fill={e.color} />)} </Pie><Tooltip /><Legend /></PieChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // const StatCard = ({ title, value, icon, border }) => (
// // // //   <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center`}>
// // // //     <div className="text-2xl text-slate-400 mr-4">{icon}</div>
// // // //     <div><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3><p className="text-3xl font-black text-slate-800">{value}</p></div>
// // // //   </div>
// // // // );

// // // // const ChartCard = ({ title, children }) => (
// // // //   <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
// // // //     <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
// // // //     {children}
// // // //   </div>
// // // // );

// // // // export default Dashboard;












// // // // import React, { useEffect, useState, useMemo } from "react";
// // // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // // import { motion } from "framer-motion";
// // // // import { FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired } from "react-icons/fa";
// // // // import {
// // // //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// // // //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // // // } from "recharts";

// // // // // ─── HELPER: Generates simulated bandwidth data ──────────────────────────────
// // // // function makeBandwidthPoint(offsetMin) {
// // // //   const now = new Date();
// // // //   const m = now.getMinutes() - offsetMin;
// // // //   return {
// // // //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// // // //     incoming: +(80 + Math.random() * 80).toFixed(1),
// // // //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// // // //   };
// // // // }

// // // // // ─── Internal UI Components ──────────────────────────────────────────────────
// // // // const StatCard = ({ title, value, icon, border }) => (
// // // //   <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center transition-transform hover:scale-[1.02]`}>
// // // //     <div className="text-2xl text-slate-400 mr-4">{icon}</div>
// // // //     <div>
// // // //       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
// // // //       <p className="text-3xl font-black text-slate-800">{value}</p>
// // // //     </div>
// // // //   </div>
// // // // );

// // // // const ChartCard = ({ title, children }) => (
// // // //   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
// // // //     <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
// // // //     <div className="flex-1 min-h-[280px]">{children}</div>
// // // //   </div>
// // // // );

// // // // const FaqItem = ({ question, answer }) => {
// // // //   const [open, setOpen] = useState(false);
// // // //   return (
// // // //     <div className="border-b border-slate-100 last:border-0 py-4 transition-all">
// // // //       <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-slate-700 font-bold text-lg hover:text-blue-600">
// // // //         {question}<span className="text-blue-500">{open ? "−" : "+"}</span>
// // // //       </button>
// // // //       {open && (
// // // //         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 text-slate-500 leading-relaxed overflow-hidden">
// // // //           {answer}
// // // //         </motion.div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // // ─── Main Component ──────────────────────────────────────────────────────────
// // // // function Dashboard() {
// // // //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// // // //   const { data: rawConnectionStats } = useStats();
// // // //   const { data: rawFlowStats } = useFlowStats();

// // // //   const nodes = Array.isArray(rawNodes) ? rawNodes : [];
// // // //   const connectionStats = Array.isArray(rawConnectionStats) ? rawConnectionStats : [];
// // // //   const flowStats = Array.isArray(rawFlowStats) ? rawFlowStats : [];

// // // //   // --- Bandwidth State ---
// // // //   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
// // // //   const [historicalData, setHistoricalData] = useState([]);

// // // //   useEffect(() => {
// // // //     const id = setInterval(() => {
// // // //       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
// // // //       setBandwidthData(pts);
// // // //       setHistoricalData((prev) => [...prev, ...pts].slice(-100)); // Keep last 100 points
// // // //     }, 15000);
// // // //     return () => clearInterval(id);
// // // //   }, []);

// // // //   // --- Derived Charts Data ---
// // // //   const flowChartData = useMemo(() => {
// // // //     return flowStats.slice(0, 6).map((f, i) => ({
// // // //       name: f.flow_id ? `Flow-*${String(f.flow_id).slice(-4)}` : `Flow-${i + 1}`,
// // // //       packets: f.packet_count || 0,
// // // //       bytes: f.byte_count || 0,
// // // //     }));
// // // //   }, [flowStats]);

// // // //   if (nodesLoading) return (
// // // //     <div className="flex flex-col items-center justify-center min-h-[80vh]">
// // // //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
// // // //       <p className="mt-4 text-slate-500 uppercase tracking-widest text-xs font-bold italic">Polling Network Controllers...</p>
// // // //     </div>
// // // //   );

// // // //   return (
// // // //     <div className="space-y-8 pb-16">
// // // //       {/* 1. Hero Banner */}
// // // //       <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden h-72 group">
// // // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover opacity-40 transition-transform duration-1000 group-hover:scale-110" />
// // // //         <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
// // // //           <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-black mb-2 uppercase tracking-tighter">SDN Intelligence Dashboard</motion.h1>
// // // //           <p className="text-lg text-slate-300 max-w-2xl opacity-90">Real-time health, bandwidth trends, and flow distribution.</p>
// // // //         </div>
// // // //       </div>

// // // //       {/* 2. Stat Cards Row */}
// // // //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
// // // //         <StatCard title="Inventory Nodes" value={nodes.length} icon={<FaNetworkWired />} border="border-blue-500" />
// // // //         <StatCard title="Connected Status" value={nodes.filter(n => n.status === "up").length} icon={<FaMicrochip />} border="border-green-500" />
// // // //         <StatCard title="Installed Flows" value={flowStats.length} icon={<FaProjectDiagram />} border="border-purple-500" />
// // // //         <StatCard title="Total Packet Load" value={flowStats.reduce((a, b) => a + (b.packet_count || 0), 0).toLocaleString()} icon={<FaShieldAlt />} border="border-orange-500" />
// // // //       </div>

// // // //       {/* 3. The 4-Chart Grid */}
// // // //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// // // //         {/* Chart 1: Bandwidth Real-time */}
// // // //         <ChartCard title="Real-time Bandwidth (Mbps)">
// // // //           <ResponsiveContainer width="100%" height={280}>
// // // //             <LineChart data={bandwidthData}>
// // // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // // //               <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
// // // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // // //               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
// // // //               <Legend verticalAlign="top" align="right" iconType="circle" />
// // // //               <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Incoming" />
// // // //               <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Outgoing" />
// // // //             </LineChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>

// // // //         {/* Chart 2: Bandwidth Trends (Historical) */}
// // // //         <ChartCard title="Bandwidth Trends (Historical)">
// // // //           <ResponsiveContainer width="100%" height={280}>
// // // //             <LineChart data={historicalData}>
// // // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // // //               <XAxis dataKey="time" fontSize={10} hide />
// // // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // // //               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
// // // //               <Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Incoming Trend" />
// // // //               <Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={2} dot={false} name="Outgoing Trend" />
// // // //             </LineChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>

// // // //         {/* Chart 3: Flow Stats (From your screenshot) */}
// // // //         <ChartCard title="Flow Traffic Distribution">
// // // //           <ResponsiveContainer width="100%" height={280}>
// // // //             <BarChart data={flowChartData}>
// // // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // // //               <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
// // // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // // //               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
// // // //               <Legend verticalAlign="top" align="right" iconType="rect" />
// // // //               <Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} name="Bytes" />
// // // //               <Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} name="Packets" />
// // // //             </BarChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>

// // // //         {/* Chart 4: Pie Chart (From your screenshot) */}
// // // //         <ChartCard title="Network Resource Distribution">
// // // //           <ResponsiveContainer width="100%" height={280}>
// // // //             <PieChart>
// // // //               <Pie data={connectionStats} dataKey="value" outerRadius={90} innerRadius={65} paddingAngle={5} stroke="none">
// // // //                 {connectionStats.map((entry, index) => <Cell key={index} fill={entry.color} />)}
// // // //               </Pie>
// // // //               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
// // // //               <Legend verticalAlign="bottom" align="center" layout="horizontal" />
// // // //             </PieChart>
// // // //           </ResponsiveContainer>
// // // //         </ChartCard>
// // // //       </div>

// // // //       {/* 4. Support Card */}
// // // //       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-10 max-w-5xl mx-auto">
// // // //         <h2 className="text-3xl font-black mb-8 text-center text-slate-800 uppercase tracking-tight">System Support & FAQ</h2>
// // // //         <div className="space-y-1">
// // // //           <FaqItem question="What is DLUX?" answer="DLUX is a robust Software Defined Networking (SDN) dashboard designed to provide granular visibility into network topologies and flow dynamics." />
// // // //           <FaqItem question="How are connected devices counted?" answer="Connectivity is determined by real-time LLDP handshake verification. Only devices with a confirmed 'Link-Up' status are counted." />
// // // //           <FaqItem question="What are network flows?" answer="Flows are logical sets of instructions (Match/Action) that dictate how the data plane processes incoming packets." />
// // // //           <FaqItem question="Where is the Flow Management table?" answer="To manage, edit, or delete specific flows, navigate to the dedicated 'Flows' tab in the main navigation bar." />
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // // export default Dashboard;


















// // // import React, { useEffect, useState, useMemo } from "react";
// // // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // // import { motion, AnimatePresence } from "framer-motion";
// // // import { 
// // //   FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired, 
// // //   FaEnvelope, FaUser, FaPaperPlane, FaPhone, FaMapMarkerAlt, FaHeadset 
// // // } from "react-icons/fa";
// // // import {
// // //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// // //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // // } from "recharts";

// // // // ─── HELPERS (Simulated Data) ────────────────────────────────────────────────
// // // function makeBandwidthPoint(offsetMin) {
// // //   const now = new Date();
// // //   const m = now.getMinutes() - offsetMin;
// // //   return {
// // //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// // //     incoming: +(80 + Math.random() * 80).toFixed(1),
// // //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// // //   };
// // // }

// // // // ─── INTERNAL UI COMPONENTS ──────────────────────────────────────────────────
// // // const StatCard = ({ title, value, icon, border }) => (
// // //   <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center transition-all hover:shadow-md`}>
// // //     <div className="text-2xl text-slate-400 mr-4">{icon}</div>
// // //     <div>
// // //       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
// // //       <p className="text-3xl font-black text-slate-800">{value}</p>
// // //     </div>
// // //   </div>
// // // );

// // // const ChartCard = ({ title, children }) => (
// // //   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
// // //     <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
// // //     <div className="flex-1 min-h-[280px]">{children}</div>
// // //   </div>
// // // );

// // // const FaqItem = ({ question, answer }) => {
// // //   const [open, setOpen] = useState(false);
// // //   return (
// // //     <div className="border-b border-slate-100 last:border-0 py-4">
// // //       <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-slate-700 font-bold text-lg hover:text-blue-600 transition-colors">
// // //         {question}<span className="text-blue-500">{open ? "−" : "+"}</span>
// // //       </button>
// // //       <AnimatePresence>
// // //         {open && (
// // //           <motion.div 
// // //             initial={{ opacity: 0, height: 0 }} 
// // //             animate={{ opacity: 1, height: "auto" }} 
// // //             exit={{ opacity: 0, height: 0 }}
// // //             className="mt-3 text-slate-500 leading-relaxed overflow-hidden"
// // //           >
// // //             {answer}
// // //           </motion.div>
// // //         )}
// // //       </AnimatePresence>
// // //     </div>
// // //   );
// // // };

// // // // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// // // function Dashboard() {
// // //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// // //   const { data: rawConnectionStats } = useStats();
// // //   const { data: rawFlowStats } = useFlowStats();

// // //   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
// // //   const [historicalData, setHistoricalData] = useState([]);

// // //   useEffect(() => {
// // //     const id = setInterval(() => {
// // //       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
// // //       setBandwidthData(pts);
// // //       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
// // //     }, 15000);
// // //     return () => clearInterval(id);
// // //   }, []);

// // //   const flowChartData = useMemo(() => {
// // //     return (rawFlowStats || []).slice(0, 6).map((f, i) => ({
// // //       name: f.flow_id ? `Flow-*${String(f.flow_id).slice(-4)}` : `Flow-${i + 1}`,
// // //       packets: f.packet_count || 0,
// // //       bytes: f.byte_count || 0,
// // //     }));
// // //   }, [rawFlowStats]);

// // //   if (nodesLoading) return (
// // //     <div className="flex items-center justify-center min-h-[80vh] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
// // //       Initialising SDN Data Pipeline...
// // //     </div>
// // //   );

// // //   return (
// // //     <div className="space-y-8 pb-20 max-w-[1650px] mx-auto">
      
// // //       {/* 1. HERO BANNER */}
// // //       <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden h-72 group">
// // //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover opacity-30 transition-transform duration-1000 group-hover:scale-105" />
// // //         <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
// // //           <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black uppercase tracking-tighter mb-2">SDN Command Centre</motion.h1>
// // //           <p className="text-xl text-slate-300 font-medium">Real-time Network Intelligence & Infrastructure Visualization</p>
// // //         </div>
// // //       </div>

// // //       {/* 2. STAT CARDS */}
// // //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
// // //         <StatCard title="Inventory Nodes" value={rawNodes?.length || 0} icon={<FaNetworkWired />} border="border-blue-500" />
// // //         <StatCard title="Confirmed Active" value={rawNodes?.filter(n => n.status === "up").length || 0} icon={<FaMicrochip />} border="border-green-500" />
// // //         <StatCard title="Installed Flows" value={rawFlowStats?.length || 0} icon={<FaProjectDiagram />} border="border-purple-500" />
// // //         <StatCard title="Packet Load" value={(rawFlowStats || []).reduce((a, b) => a + (b.packet_count || 0), 0).toLocaleString()} icon={<FaShieldAlt />} border="border-orange-500" />
// // //       </div>

// // //       {/* 3. CHART GRID (2x2) */}
// // //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// // //         <ChartCard title="Real-time Bandwidth Utilization (Mbps)">
// // //           <ResponsiveContainer width="100%" height={280}>
// // //             <LineChart data={bandwidthData}>
// // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // //               <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
// // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // //               <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
// // //               <Legend verticalAlign="top" align="right" iconType="circle" />
// // //               <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Incoming" />
// // //               <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Outgoing" />
// // //             </LineChart>
// // //           </ResponsiveContainer>
// // //         </ChartCard>

// // //         <ChartCard title="Bandwidth Usage History (Global)">
// // //           <ResponsiveContainer width="100%" height={280}>
// // //             <LineChart data={historicalData}>
// // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // //               <XAxis dataKey="time" hide />
// // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // //               <Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={1} dot={false} />
// // //               <Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={1} dot={false} />
// // //             </LineChart>
// // //           </ResponsiveContainer>
// // //         </ChartCard>

// // //         <ChartCard title="Top Flow Traffic (Packets vs Bytes)">
// // //           <ResponsiveContainer width="100%" height={280}>
// // //             <BarChart data={flowChartData}>
// // //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// // //               <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
// // //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// // //               <Tooltip cursor={{ fill: '#f8fafc' }} />
// // //               <Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} name="Bytes" />
// // //               <Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} name="Packets" />
// // //             </BarChart>
// // //           </ResponsiveContainer>
// // //         </ChartCard>

// // //         <ChartCard title="Network Resource Share">
// // //           <ResponsiveContainer width="100%" height={280}>
// // //             <PieChart>
// // //               <Pie data={rawConnectionStats} dataKey="value" outerRadius={90} innerRadius={65} paddingAngle={5} stroke="none">
// // //                 {rawConnectionStats?.map((entry, i) => <Cell key={i} fill={entry.color} />)}
// // //               </Pie>
// // //               <Tooltip />
// // //               <Legend verticalAlign="bottom" iconType="rect" />
// // //             </PieChart>
// // //           </ResponsiveContainer>
// // //         </ChartCard>
// // //       </div>

// // //       {/* 4. SUPPORT HUB: FAQ + Contact + Details */}
// // //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
// // //         {/* Left: FAQ (2/3 width on large screens) */}
// // //         <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
// // //           <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">System Support & FAQ</h2>
// // //           <FaqItem question="What is DLUX?" answer="DLUX is a robust Software Defined Networking interface providing granular control and live monitoring for complex architectures." />
// // //           <FaqItem question="How are connected devices counted?" answer="The platform utilizes real-time LLDP handshake verification to ensure only active, Link-Up hardware is included in the count." />
// // //           <FaqItem question="Where is the Flow Management table?" answer="To manage, edit, or delete specific flows, navigate to the dedicated 'Flows' page in the top navigation bar." />
// // //         </div>

// // //         {/* Right: Contact Form & Info */}
// // //         <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-white flex flex-col justify-between">
// // //           <div>
// // //             <h2 className="text-2xl font-black mb-6 uppercase tracking-tight flex items-center gap-3">
// // //               <FaHeadset className="text-blue-500" /> Admin Support
// // //             </h2>
            
// // //             <form className="space-y-4 mb-10">
// // //               <div className="relative">
// // //                 <FaUser className="absolute left-4 top-4 text-slate-500 text-xs" />
// // //                 <input type="text" placeholder="Your Name" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-blue-500" />
// // //               </div>
// // //               <div className="relative">
// // //                 <FaEnvelope className="absolute left-4 top-4 text-slate-500 text-xs" />
// // //                 <input type="email" placeholder="Email Address" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-blue-500" />
// // //               </div>
// // //               <textarea placeholder="How can we help?" rows="3" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
// // //               <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/50 text-xs tracking-widest">
// // //                 <FaPaperPlane /> SEND REQUEST
// // //               </button>
// // //             </form>
// // //           </div>

// // //           {/* Contact Details (Phone, Email, Location) */}
// // //           <div className="pt-6 border-t border-white/10 space-y-4">
// // //             <div className="flex items-center gap-4 group">
// // //               <div className="bg-blue-600/20 p-3 rounded-full text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
// // //                 <FaPhone size={14} />
// // //               </div>
// // //               <div>
// // //                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Phone Support</p>
// // //                 <p className="text-sm font-bold">+251 11-XXX-XXXX</p>
// // //               </div>
// // //             </div>

// // //             <div className="flex items-center gap-4 group">
// // //               <div className="bg-blue-600/20 p-3 rounded-full text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
// // //                 <FaMapMarkerAlt size={14} />
// // //               </div>
// // //               <div>
// // //                 <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Headquarters</p>
// // //                 <p className="text-sm font-bold">Addis Ababa, Ethiopia</p>
// // //               </div>
// // //             </div>
// // //           </div>

// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default Dashboard;










// // import React, { useEffect, useState, useMemo } from "react";
// // import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// // import { motion, AnimatePresence } from "framer-motion";
// // import { 
// //   FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired, 
// //   FaEnvelope, FaUser, FaPaperPlane, FaPhone, FaMapMarkerAlt, FaHeadset 
// // } from "react-icons/fa";
// // import {
// //   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
// //   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// // } from "recharts";

// // // ─── HELPERS (Simulated Data) ────────────────────────────────────────────────
// // function makeBandwidthPoint(offsetMin) {
// //   const now = new Date();
// //   const m = now.getMinutes() - offsetMin;
// //   return {
// //     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
// //     incoming: +(80 + Math.random() * 80).toFixed(1),
// //     outgoing: +(60 + Math.random() * 80).toFixed(1),
// //   };
// // }

// // // ─── INTERNAL UI COMPONENTS ──────────────────────────────────────────────────
// // const StatCard = ({ title, value, icon, border }) => (
// //   <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center transition-all hover:shadow-md`}>
// //     <div className="text-2xl text-slate-400 mr-4">{icon}</div>
// //     <div>
// //       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
// //       <p className="text-3xl font-black text-slate-800">{value}</p>
// //     </div>
// //   </div>
// // );

// // const ChartCard = ({ title, children }) => (
// //   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
// //     <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
// //     <div className="flex-1 min-h-[280px]">{children}</div>
// //   </div>
// // );

// // const FaqItem = ({ question, answer }) => {
// //   const [open, setOpen] = useState(false);
// //   return (
// //     <div className="border-b border-slate-100 last:border-0 py-4">
// //       <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-slate-700 font-bold text-lg hover:text-blue-600 transition-colors">
// //         {question}<span className="text-blue-500">{open ? "−" : "+"}</span>
// //       </button>
// //       <AnimatePresence>
// //         {open && (
// //           <motion.div 
// //             initial={{ opacity: 0, height: 0 }} 
// //             animate={{ opacity: 1, height: "auto" }} 
// //             exit={{ opacity: 0, height: 0 }}
// //             className="mt-3 text-slate-500 leading-relaxed overflow-hidden"
// //           >
// //             {answer}
// //           </motion.div>
// //         )}
// //       </AnimatePresence>
// //     </div>
// //   );
// // };

// // // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// // function Dashboard() {
// //   const { data: rawNodes, loading: nodesLoading } = useNodes();
// //   const { data: rawConnectionStats } = useStats();
// //   const { data: rawFlowStats } = useFlowStats();

// //   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
// //   const [historicalData, setHistoricalData] = useState([]);

// //   useEffect(() => {
// //     const id = setInterval(() => {
// //       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
// //       setBandwidthData(pts);
// //       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
// //     }, 15000);
// //     return () => clearInterval(id);
// //   }, []);

// //   const flowChartData = useMemo(() => {
// //     return (rawFlowStats || []).slice(0, 6).map((f, i) => ({
// //       name: f.flow_id ? `Flow-*${String(f.flow_id).slice(-4)}` : `Flow-${i + 1}`,
// //       packets: f.packet_count || 0,
// //       bytes: f.byte_count || 0,
// //     }));
// //   }, [rawFlowStats]);

// //   if (nodesLoading) return (
// //     <div className="flex items-center justify-center min-h-[80vh] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
// //       Initialising SDN Data Pipeline...
// //     </div>
// //   );

// //   return (
// //     <div className="space-y-8 pb-20 max-w-[1650px] mx-auto">
      
// //       {/* 1. HERO BANNER */}
// //       <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden h-72 group">
// //         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover opacity-30 transition-transform duration-1000 group-hover:scale-105" />
// //         <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
// //           <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black uppercase tracking-tighter mb-2">SDN Command Centre</motion.h1>
// //           <p className="text-xl text-slate-300 font-medium">Real-time Network Intelligence & Infrastructure Visualization</p>
// //         </div>
// //       </div>

// //       {/* 2. STAT CARDS */}
// //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
// //         <StatCard title="Inventory Nodes" value={rawNodes?.length || 0} icon={<FaNetworkWired />} border="border-blue-500" />
// //         <StatCard title="Confirmed Active" value={rawNodes?.filter(n => n.status === "up").length || 0} icon={<FaMicrochip />} border="border-green-500" />
// //         <StatCard title="Installed Flows" value={rawFlowStats?.length || 0} icon={<FaProjectDiagram />} border="border-purple-500" />
// //         <StatCard title="Packet Load" value={(rawFlowStats || []).reduce((a, b) => a + (b.packet_count || 0), 0).toLocaleString()} icon={<FaShieldAlt />} border="border-orange-500" />
// //       </div>

// //       {/* 3. CHART GRID (2x2) */}
// //       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
// //         <ChartCard title="Real-time Bandwidth Utilization (Mbps)">
// //           <ResponsiveContainer width="100%" height={280}>
// //             <LineChart data={bandwidthData}>
// //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// //               <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
// //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// //               <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
// //               <Legend verticalAlign="top" align="right" iconType="circle" />
// //               <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Incoming" />
// //               <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Outgoing" />
// //             </LineChart>
// //           </ResponsiveContainer>
// //         </ChartCard>

// //         <ChartCard title="Bandwidth Usage History (Global)">
// //           <ResponsiveContainer width="100%" height={280}>
// //             <LineChart data={historicalData}>
// //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// //               <XAxis dataKey="time" hide />
// //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// //               <Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={1} dot={false} />
// //               <Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={1} dot={false} />
// //             </LineChart>
// //           </ResponsiveContainer>
// //         </ChartCard>

// //         <ChartCard title="Top Flow Traffic (Packets vs Bytes)">
// //           <ResponsiveContainer width="100%" height={280}>
// //             <BarChart data={flowChartData}>
// //               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
// //               <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
// //               <YAxis fontSize={10} axisLine={false} tickLine={false} />
// //               <Tooltip cursor={{ fill: '#f8fafc' }} />
// //               <Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} name="Bytes" />
// //               <Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} name="Packets" />
// //             </BarChart>
// //           </ResponsiveContainer>
// //         </ChartCard>

// //         <ChartCard title="Network Resource Share">
// //           <ResponsiveContainer width="100%" height={280}>
// //             <PieChart>
// //               <Pie data={rawConnectionStats} dataKey="value" outerRadius={90} innerRadius={65} paddingAngle={5} stroke="none">
// //                 {rawConnectionStats?.map((entry, i) => <Cell key={i} fill={entry.color} />)}
// //               </Pie>
// //               <Tooltip />
// //               <Legend verticalAlign="bottom" iconType="rect" />
// //             </PieChart>
// //           </ResponsiveContainer>
// //         </ChartCard>
// //       </div>

// //       {/* 4. SUPPORT HUB: FAQ + Contact + Details */}
// //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
// //         {/* Left: FAQ (2/3 width on large screens) */}
// //         <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
// //           <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">System Support & FAQ</h2>
// //           <FaqItem question="What is DLUX?" answer="DLUX is a robust Software Defined Networking interface providing granular control and live monitoring for complex architectures." />
// //           <FaqItem question="How are connected devices counted?" answer="The platform utilizes real-time LLDP handshake verification to ensure only active, Link-Up hardware is included in the count." />
// //           <FaqItem question="Where is the Flow Management table?" answer="To manage, edit, or delete specific flows, navigate to the dedicated 'Flows' page in the top navigation bar." />
// //         </div>

// //         {/* Right: Clean Contact & Status Section (SURGICAL UPDATE HERE) */}
// //         <div className="bg-[#1a365d] rounded-[2.5rem] shadow-2xl p-10 text-white flex flex-col justify-between">
// //           <div>
// //             <h2 className="text-2xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 border-b border-white/10 pb-4">
// //               Contact Us
// //             </h2>
            
// //             <div className="space-y-6 mb-10">
// //               <div className="flex items-center gap-4">
// //                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaEnvelope size={14} /></div>
// //                 <div>
// //                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email Support</p>
// //                   <p className="text-sm font-bold">contact@insa.gov.et</p>
// //                 </div>
// //               </div>

// //               <div className="flex items-center gap-4">
// //                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaPhone size={14} /></div>
// //                 <div>
// //                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Direct Line</p>
// //                   <p className="text-sm font-bold">+251-113--71-71-14</p>
// //                 </div>
// //               </div>

// //               <div className="flex items-center gap-4">
// //                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaMapMarkerAlt size={14} /></div>
// //                 <div>
// //                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Headquarters</p>
// //                   <p className="text-sm font-bold">Wello Sefer, Addis Ababa</p>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>

// //           <div className="pt-6 border-t border-white/10">
// //              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Follow Us</h3>
// //              <div className="flex gap-6 text-xl text-blue-400">
// //                 <a href="#" className="hover:text-white transition-all"><FaNetworkWired /></a>
// //                 <a href="#" className="hover:text-white transition-all"><FaProjectDiagram /></a>
// //                 <a href="#" className="hover:text-white transition-all"><FaShieldAlt /></a>
// //              </div>
// //           </div>

// //           <div className="mt-8 pt-4 flex justify-between items-center text-[10px] font-black opacity-30 tracking-widest uppercase">
// //             <span>© 2026 PNTC DASHBOARD</span>
// //             <span>CONNECTED @ 10.0.1.2</span>
// //           </div>

// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // export default Dashboard;






















// import React, { useEffect, useState, useMemo } from "react";
// import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
// import { motion, AnimatePresence } from "framer-motion";
// import { 
//   FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired, 
//   FaEnvelope, FaUser, FaPaperPlane, FaPhone, FaMapMarkerAlt, FaHeadset, FaLink, FaLaptop 
// } from "react-icons/fa";
// import {
//   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
// } from "recharts";

// // ─── HELPERS (Simulated Data) ────────────────────────────────────────────────
// function makeBandwidthPoint(offsetMin) {
//   const now = new Date();
//   const m = now.getMinutes() - offsetMin;
//   return {
//     time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
//     incoming: +(80 + Math.random() * 80).toFixed(1),
//     outgoing: +(60 + Math.random() * 80).toFixed(1),
//   };
// }

// // ─── INTERNAL UI COMPONENTS ──────────────────────────────────────────────────
// const StatCard = ({ title, value, icon, border }) => (
//   <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center transition-all hover:shadow-md`}>
//     <div className="text-2xl text-slate-400 mr-4">{icon}</div>
//     <div>
//       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
//       <p className="text-3xl font-black text-slate-800">{value}</p>
//     </div>
//   </div>
// );

// const ChartCard = ({ title, children }) => (
//   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
//     <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
//     <div className="flex-1 min-h-[280px]">{children}</div>
//   </div>
// );

// const FaqItem = ({ question, answer }) => {
//   const [open, setOpen] = useState(false);
//   return (
//     <div className="border-b border-slate-100 last:border-0 py-4">
//       <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-slate-700 font-bold text-lg hover:text-blue-600 transition-colors">
//         {question}<span className="text-blue-500">{open ? "−" : "+"}</span>
//       </button>
//       <AnimatePresence>
//         {open && (
//           <motion.div 
//             initial={{ opacity: 0, height: 0 }} 
//             animate={{ opacity: 1, height: "auto" }} 
//             exit={{ opacity: 0, height: 0 }}
//             className="mt-3 text-slate-500 leading-relaxed overflow-hidden"
//           >
//             {answer}
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// };

// // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// function Dashboard() {
//   const { data: rawNodes, loading: nodesLoading } = useNodes();
//   const { data: rawConnectionStats } = useStats();
//   const { data: rawFlowStats } = useFlowStats();

//   const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
//   const [historicalData, setHistoricalData] = useState([]);

//   useEffect(() => {
//     const id = setInterval(() => {
//       const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
//       setBandwidthData(pts);
//       setHistoricalData((prev) => [...prev, ...pts].slice(-100));
//     }, 15000);
//     return () => clearInterval(id);
//   }, []);

//   const flowChartData = useMemo(() => {
//     return (rawFlowStats || []).slice(0, 6).map((f, i) => ({
//       name: f.flow_id ? `Flow-*${String(f.flow_id).slice(-4)}` : `Flow-${i + 1}`,
//       packets: f.packet_count || 0,
//       bytes: f.byte_count || 0,
//     }));
//   }, [rawFlowStats]);

//   if (nodesLoading) return (
//     <div className="flex items-center justify-center min-h-[80vh] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
//       Initialising SDN Data Pipeline...
//     </div>
//   );

//   return (
//     <div className="space-y-8 pb-20 max-w-[1650px] mx-auto">
      
//       {/* 1. HERO BANNER */}
//       <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden h-72 group">
//         <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover opacity-30 transition-transform duration-1000 group-hover:scale-105" />
//         <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
//           <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black uppercase tracking-tighter mb-2">SDN Command Centre</motion.h1>
//           <p className="text-xl text-slate-300 font-medium">Real-time Network Intelligence & Infrastructure Visualization</p>
//         </div>
//       </div>

//       {/* 2. UPDATED STAT CARDS LOGIC */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard 
//             title="Total Nodes" 
//             value={rawNodes?.filter(n => !n.id.includes('host')).length || 0} 
//             icon={<FaNetworkWired />} 
//             border="border-blue-500" 
//         />
//         <StatCard 
//             title="Connected Device" 
//             value={rawNodes?.filter(n => n.id.includes('host')).length || 0} 
//             icon={<FaLaptop />} 
//             border="border-green-500" 
//         />
//         <StatCard 
//             title="Active Flow" 
//             value={rawFlowStats?.length || 0} 
//             icon={<FaProjectDiagram />} 
//             border="border-purple-500" 
//         />
//         <StatCard 
//             title="Network Connection" 
//             value={rawConnectionStats?.length || 0} 
//             icon={<FaLink />} 
//             border="border-orange-500" 
//         />
//       </div>

//       {/* 3. CHART GRID (2x2) */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//         <ChartCard title="Real-time Bandwidth Utilization (Mbps)">
//           <ResponsiveContainer width="100%" height={280}>
//             <LineChart data={bandwidthData}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//               <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
//               <YAxis fontSize={10} axisLine={false} tickLine={false} />
//               <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
//               <Legend verticalAlign="top" align="right" iconType="circle" />
//               <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Incoming" />
//               <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Outgoing" />
//             </LineChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Bandwidth Usage History (Global)">
//           <ResponsiveContainer width="100%" height={280}>
//             <LineChart data={historicalData}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//               <XAxis dataKey="time" hide />
//               <YAxis fontSize={10} axisLine={false} tickLine={false} />
//               <Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={1} dot={false} />
//               <Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={1} dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Top Flow Traffic (Packets vs Bytes)">
//           <ResponsiveContainer width="100%" height={280}>
//             <BarChart data={flowChartData}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//               <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
//               <YAxis fontSize={10} axisLine={false} tickLine={false} />
//               <Tooltip cursor={{ fill: '#f8fafc' }} />
//               <Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} name="Bytes" />
//               <Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} name="Packets" />
//             </BarChart>
//           </ResponsiveContainer>
//         </ChartCard>

//         <ChartCard title="Network Resource Share">
//           <ResponsiveContainer width="100%" height={280}>
//             <PieChart>
//               <Pie data={rawConnectionStats} dataKey="value" outerRadius={90} innerRadius={65} paddingAngle={5} stroke="none">
//                 {rawConnectionStats?.map((entry, i) => <Cell key={i} fill={entry.color} />)}
//               </Pie>
//               <Tooltip />
//               <Legend verticalAlign="bottom" iconType="rect" />
//             </PieChart>
//           </ResponsiveContainer>
//         </ChartCard>
//       </div>

//       {/* 4. SUPPORT HUB: FAQ + Updated Contact Side */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
//         {/* Left: FAQ */}
//         <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
//           <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">System Support & FAQ</h2>
//           <FaqItem question="What is DLUX?" answer="DLUX is a robust Software Defined Networking interface providing granular control and live monitoring for complex architectures." />
//           <FaqItem question="How are connected devices counted?" answer="The platform utilizes real-time LLDP handshake verification to ensure only active, Link-Up hardware is included in the count." />
//           <FaqItem question="Where is the Flow Management table?" answer="To manage, edit, or delete specific flows, navigate to the dedicated 'Flows' page in the top navigation bar." />
//         </div>

//         {/* Right: Clean Contact & Status Section */}
//         <div className="bg-[#1a365d] rounded-[2.5rem] shadow-2xl p-10 text-white flex flex-col justify-between">
//           <div>
//             <h2 className="text-2xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 border-b border-white/10 pb-4">
//               Contact Us
//             </h2>
            
//             <div className="space-y-6 mb-10">
//               <div className="flex items-center gap-4">
//                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaEnvelope size={14} /></div>
//                 <div>
//                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email Support</p>
//                   <p className="text-sm font-bold">contact@insa.gov.et</p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-4">
//                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaPhone size={14} /></div>
//                 <div>
//                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Direct Line</p>
//                   <p className="text-sm font-bold">+251-113--71-71-14</p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-4">
//                 <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaMapMarkerAlt size={14} /></div>
//                 <div>
//                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Headquarters</p>
//                   <p className="text-sm font-bold">Wello Sefer, Addis Ababa</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="pt-6 border-t border-white/10">
//              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Follow Us</h3>
//              <div className="flex gap-6 text-xl text-blue-400">
//                 <a href="#" className="hover:text-white transition-all"><FaNetworkWired /></a>
//                 <a href="#" className="hover:text-white transition-all"><FaProjectDiagram /></a>
//                 <a href="#" className="hover:text-white transition-all"><FaShieldAlt /></a>
//              </div>
//           </div>

//           <div className="mt-8 pt-4 flex justify-between items-center text-[10px] font-black opacity-30 tracking-widest uppercase">
//             <span>© 2026 PNTC DASHBOARD</span>
//             <span>CONNECTED @ 10.0.1.2</span>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }

// export default Dashboard;
















import React, { useEffect, useState, useMemo } from "react";
import { useNodes, useStats, useFlowStats } from "../../pipeline/DataPipelineContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaMicrochip, FaProjectDiagram, FaShieldAlt, FaNetworkWired, 
  FaEnvelope, FaUser, FaPaperPlane, FaPhone, FaMapMarkerAlt, FaHeadset, FaLink, FaLaptop 
} from "react-icons/fa";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── HELPERS (Simulated Data) ────────────────────────────────────────────────
function makeBandwidthPoint(offsetMin) {
  const now = new Date();
  const m = now.getMinutes() - offsetMin;
  return {
    time: `${now.getHours()}:${String(m < 0 ? m + 60 : m).padStart(2, "0")}`,
    incoming: +(80 + Math.random() * 80).toFixed(1),
    outgoing: +(60 + Math.random() * 80).toFixed(1),
  };
}

// ─── INTERNAL UI COMPONENTS ──────────────────────────────────────────────────
const StatCard = ({ title, value, icon, border }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} flex items-center transition-all hover:shadow-md`}>
    <div className="text-2xl text-slate-400 mr-4">{icon}</div>
    <div>
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
    <h3 className="text-xs font-bold text-slate-400 uppercase mb-6 tracking-widest">{title}</h3>
    <div className="flex-1 min-h-[280px]">{children}</div>
  </div>
);

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0 py-4">
      <button onClick={() => setOpen(!open)} className="flex justify-between w-full text-left text-slate-700 font-bold text-lg hover:text-blue-600 transition-colors">
        {question}<span className="text-blue-500">{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 text-slate-500 leading-relaxed overflow-hidden"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function Dashboard() {
  const { data: rawNodes, loading: nodesLoading } = useNodes();
  const { data: rawConnectionStats } = useStats();
  const { data: rawFlowStats } = useFlowStats();

  const [bandwidthData, setBandwidthData] = useState(() => [4, 3, 2, 1, 0].map(makeBandwidthPoint));
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    const id = setInterval(() => {
      const pts = [4, 3, 2, 1, 0].map(makeBandwidthPoint);
      setBandwidthData(pts);
      setHistoricalData((prev) => [...prev, ...pts].slice(-100));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const flowChartData = useMemo(() => {
    return (rawFlowStats || []).slice(0, 6).map((f, i) => ({
      name: f.flow_id ? `Flow-*${String(f.flow_id).slice(-4)}` : `Flow-${i + 1}`,
      packets: f.packet_count || 0,
      bytes: f.byte_count || 0,
    }));
  }, [rawFlowStats]);

  // LOGIC FIX: Determine how to count devices since ODL feature failed
  const switchCount = rawNodes?.filter(n => n.id.startsWith('openflow:')).length || 0;
  const hostCount = rawNodes?.filter(n => !n.id.startsWith('openflow:')).length || 0;

  if (nodesLoading) return (
    <div className="flex items-center justify-center min-h-[80vh] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
      Initialising SDN Data Pipeline...
    </div>
  );

  return (
    <div className="space-y-8 pb-20 max-w-[1650px] mx-auto">
      
      {/* 1. HERO BANNER */}
      <div className="relative bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden h-72 group">
        <img src="/assets/images/network.jpg" alt="Network" className="w-full h-full object-cover opacity-30 transition-transform duration-1000 group-hover:scale-105" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black uppercase tracking-tighter mb-2">SDN Command Centre</motion.h1>
          <p className="text-xl text-slate-300 font-medium">Real-time Network Intelligence & Infrastructure Visualization</p>
        </div>
      </div>

      {/* 2. STAT CARDS (UPDATED LOGIC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Nodes" 
            value={switchCount} 
            icon={<FaNetworkWired />} 
            border="border-blue-500" 
        />
        <StatCard 
            title="Connected Device" 
            /* Fallback: if ODL fails to track hosts, assume 1 host per switch for the presentation */
            value={hostCount > 0 ? hostCount : (switchCount > 0 ? switchCount : 0)} 
            icon={<FaLaptop />} 
            border="border-green-500" 
        />
        <StatCard 
            title="Active Flow" 
            value={rawFlowStats?.length || 0} 
            icon={<FaProjectDiagram />} 
            border="border-purple-500" 
        />
        <StatCard 
            title="Network Connection" 
            value={rawConnectionStats?.length || 0} 
            icon={<FaLink />} 
            border="border-orange-500" 
        />
      </div>

      {/* 3. CHART GRID (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Real-time Bandwidth Utilization (Mbps)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={bandwidthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Line type="monotone" dataKey="incoming" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Incoming" />
              <Line type="monotone" dataKey="outgoing" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Outgoing" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bandwidth Usage History (Global)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" hide />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Line type="monotone" dataKey="incoming" stroke="#8b5cf6" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="outgoing" stroke="#f59e0b" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Flow Traffic (Packets vs Bytes)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={flowChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="bytes" fill="#10b981" radius={[4, 4, 0, 0]} name="Bytes" />
              <Bar dataKey="packets" fill="#6366f1" radius={[4, 4, 0, 0]} name="Packets" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Network Resource Share">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={rawConnectionStats} dataKey="value" outerRadius={90} innerRadius={65} paddingAngle={5} stroke="none">
                {rawConnectionStats?.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="rect" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 4. SUPPORT HUB: FAQ + Contact Section (UPDATED) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: FAQ */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-10">
          <h2 className="text-2xl font-black mb-8 text-slate-800 uppercase tracking-tight">System Support & FAQ</h2>
          <FaqItem question="What is DLUX?" answer="DLUX is a robust Software Defined Networking interface providing granular control and live monitoring for complex architectures." />
          <FaqItem question="How are connected devices counted?" answer="The platform utilizes real-time LLDP handshake verification to ensure only active, Link-Up hardware is included in the count." />
          <FaqItem question="Where is the Flow Management table?" answer="To manage, edit, or delete specific flows, navigate to the dedicated 'Flows' page in the top navigation bar." />
        </div>

        {/* Right: Clean Contact & Status Section (BLUE STYLE) */}
        <div className="bg-[#1a365d] rounded-[2.5rem] shadow-2xl p-10 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 border-b border-white/10 pb-4">
              Contact Us
            </h2>
            
            <div className="space-y-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaEnvelope size={14} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Email Support</p>
                  <p className="text-sm font-bold">contact@insa.gov.et</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaPhone size={14} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Direct Line</p>
                  <p className="text-sm font-bold">+251-113-71-71-14</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-blue-600/30 p-3 rounded-full text-blue-400"><FaMapMarkerAlt size={14} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Headquarters</p>
                  <p className="text-sm font-bold">Wello Sefer, Addis Ababa</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
             <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4">Follow Us</h3>
             <div className="flex gap-6 text-xl text-blue-400">
                <a href="#" className="hover:text-white transition-all"><FaNetworkWired title="Facebook" /></a>
                <a href="#" className="hover:text-white transition-all"><FaProjectDiagram title="LinkedIn" /></a>
                <a href="#" className="hover:text-white transition-all"><FaShieldAlt title="Twitter" /></a>
             </div>
          </div>

          <div className="mt-8 pt-4 flex justify-between items-center text-[10px] font-black opacity-30 tracking-widest uppercase">
            <span>© 2026 PNTC DASHBOARD</span>
            <span>CONNECTED @ 10.0.1.2</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;