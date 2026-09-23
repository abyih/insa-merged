// import React, { useState, useEffect } from 'react';
// import { useTopology } from './Dependencies/pipeline/DataPipelineContext';
// import { extractDeviceData } from './Dependencies/mappers/topology-mapper';
// import { provisionSlice, deleteFlow } from './Dependencies/api/apiController';
// import { Shield, Server, Activity, Cpu, Trash2, Plus, RotateCcw, CheckCircle } from 'lucide-react';

// const NetworkSlicing = () => {
//     // 1. DATA SOURCES: Fetch live network state
//     const { data: rawTopology, fetch: refreshTopology } = useTopology();
//     const { nodes } = extractDeviceData(rawTopology);
    
//     // Filter live devices for selectors
//     const liveHosts = nodes.filter(n => n.group === 'host');
//     const liveSwitches = nodes.filter(n => n.group === 'switch');

//     // 2. STATE: Form and Slice List
//     const [slices, setSlices] = useState(() => {
//         const saved = localStorage.getItem('sdn_slices');
//         return saved ? JSON.parse(saved) : [];
//     });

//     const initialForm = {
//         id: null,
//         name: '',
//         hosts: [],
//         switches: [],
//         trafficType: 'All',
//         bandwidth: '',
//         policies: {
//             hostIsolation: true,
//             switchIsolation: false,
//             trafficIsolation: false,
//             bandwidthIsolation: false
//         }
//     };
//     const [formData, setFormData] = useState(initialForm);

//     // Save slices to local storage whenever they change
//     useEffect(() => {
//         localStorage.setItem('sdn_slices', JSON.stringify(slices));
//     }, [slices]);

//     // 3. HANDLERS
//     const handleCreateSlice = async () => {
//         if (!formData.name || formData.hosts.length === 0) {
//             alert("Please provide a Slice Name and select at least one Host.");
//             return;
//         }

//         const newSlice = { ...formData, id: Date.now(), status: 'Active' };
        
//         // SDN Orchestration Logic: Push rules to ODL
//         // For Host Isolation, we technically 'Allow' traffic between selected hosts 
//         // and 'Drop' everything else. Here we trigger the API.
//         try {
//             for (const hostId of formData.hosts) {
//                 // Extract switch and port from our discovery ID (host:openflow:1:3)
//                 const parts = hostId.split(':');
//                 const switchId = `${parts[1]}:${parts[2]}`;
//                 const port = parts[3];

//                 await provisionSlice(switchId, `slice-${newSlice.id}`, port, "ALLOW");
//             }
            
//             setSlices([...slices, newSlice]);
//             setFormData(initialForm);
//             alert(`Slice "${newSlice.name}" successfully deployed to ODL.`);
//         } catch (err) {
//             console.error("Slicing Error:", err);
//             alert("Failed to push slice to controller.");
//         }
//     };

//     const handleDeleteSlice = async (id) => {
//         const sliceToDelete = slices.find(s => s.id === id);
//         // Logic: Tell ODL to remove the flows associated with this slice ID
//         // Note: Real implementation would iterate through hosts and delete specifically.
//         setSlices(slices.filter(s => s.id !== id));
//     };

//     return (
//         <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
//             {/* HEADER */}
//             <div className="mb-8">
//                 <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Network Slicing Policy</h1>
//                 <p className="text-slate-500 font-medium">Define logical isolation and QoS parameters for your infrastructure.</p>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
//                 {/* LEFT: CONFIGURATION CARD */}
//                 <div className="lg:col-span-1 space-y-6">
//                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
//                         <div className="flex items-center gap-3 mb-6">
//                             <Shield className="text-blue-600" size={24} />
//                             <h2 className="font-black uppercase text-slate-700 tracking-widest text-sm">Create New Slice</h2>
//                         </div>

//                         <div className="space-y-5">
//                             {/* Slice Name */}
//                             <div>
//                                 <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Slice Name</label>
//                                 <input 
//                                     type="text" 
//                                     className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
//                                     placeholder="e.g. Admin-Slice"
//                                     value={formData.name}
//                                     onChange={(e) => setFormData({...formData, name: e.target.value})}
//                                 />
//                             </div>

//                             {/* Host Selection (Dynamic) */}
//                             <div>
//                                 <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Select Target Hosts</label>
//                                 <select 
//                                     multiple
//                                     className="w-full bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs h-32 outline-none"
//                                     value={formData.hosts}
//                                     onChange={(e) => setFormData({...formData, hosts: Array.from(e.target.selectedOptions, option => option.value)})}
//                                 >
//                                     {liveHosts.map(h => <option key={h.id} value={h.id}>{h.label} ({h.id})</option>)}
//                                 </select>
//                                 <p className="text-[9px] text-slate-400 mt-1 italic">Hold Ctrl/Cmd to select multiple</p>
//                             </div>

//                             {/* Isolation Type (Policy Checkboxes) */}
//                             <div>
//                                 <label className="block text-[10px] font-black uppercase text-slate-400 mb-3">Enable Policies</label>
//                                 <div className="grid grid-cols-2 gap-3">
//                                     {Object.keys(formData.policies).map(policy => (
//                                         <label key={policy} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
//                                             <input 
//                                                 type="checkbox" 
//                                                 checked={formData.policies[policy]} 
//                                                 onChange={(e) => setFormData({...formData, policies: {...formData.policies, [policy]: e.target.checked}})}
//                                                 className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
//                                             />
//                                             <span className="text-[10px] font-bold text-slate-600 capitalize">{policy.replace(/([A-Z])/g, ' $1')}</span>
//                                         </label>
//                                     ))}
//                                 </div>
//                             </div>

//                             {/* Traffic Type */}
//                             <div>
//                                 <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Traffic Type Match</label>
//                                 <select 
//                                     className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none"
//                                     value={formData.trafficType}
//                                     onChange={(e) => setFormData({...formData, trafficType: e.target.value})}
//                                 >
//                                     <option>All</option>
//                                     <option>HTTP (Port 80)</option>
//                                     <option>HTTPS (Port 443)</option>
//                                     <option>SSH (Port 22)</option>
//                                     <option>Video (UDP)</option>
//                                 </select>
//                             </div>

//                             {/* Buttons */}
//                             <div className="pt-4 flex flex-col gap-3">
//                                 <button 
//                                     onClick={handleCreateSlice}
//                                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
//                                 >
//                                     <Plus size={18} /> Create Network Slice
//                                 </button>
//                                 <button 
//                                     onClick={() => setFormData(initialForm)}
//                                     className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
//                                 >
//                                     <RotateCcw size={18} /> Reset Form
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* RIGHT: SLICE INVENTORY TABLE */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 h-full">
//                         <div className="flex justify-between items-center mb-8">
//                             <div className="flex items-center gap-3">
//                                 <Server className="text-emerald-500" size={24} />
//                                 <h2 className="font-black uppercase text-slate-700 tracking-widest text-sm">Active Slices</h2>
//                             </div>
//                             <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
//                                 {slices.length} Slices Configured
//                             </span>
//                         </div>

//                         {slices.length === 0 ? (
//                             <div className="flex flex-col items-center justify-center py-20 text-slate-300 italic">
//                                 <Activity size={48} className="mb-4 opacity-20" />
//                                 <p>No network slices currently active.</p>
//                             </div>
//                         ) : (
//                             <div className="overflow-x-auto">
//                                 <table className="w-full text-left">
//                                     <thead>
//                                         <tr className="border-b border-slate-50">
//                                             <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Slice Details</th>
//                                             <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Hosts</th>
//                                             <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Policies</th>
//                                             <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Status</th>
//                                             <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Actions</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody className="divide-y divide-slate-50">
//                                         {slices.map(slice => (
//                                             <tr key={slice.id} className="group hover:bg-slate-50 transition-colors">
//                                                 <td className="py-5">
//                                                     <p className="font-bold text-slate-800">{slice.name}</p>
//                                                     <p className="text-[10px] text-slate-400 font-mono">{slice.trafficType}</p>
//                                                 </td>
//                                                 <td className="py-5">
//                                                     <div className="flex flex-wrap gap-1">
//                                                         {slice.hosts.map(h => (
//                                                             <span key={h} className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded">
//                                                                 {h.split(':').pop()}
//                                                             </span>
//                                                         ))}
//                                                     </div>
//                                                 </td>
//                                                 <td className="py-5">
//                                                     <div className="flex gap-2">
//                                                         {slice.policies.hostIsolation && <CheckCircle size={14} className="text-emerald-500" title="Host Isolation" />}
//                                                         {slice.policies.switchIsolation && <Cpu size={14} className="text-blue-400" title="Switch Isolation" />}
//                                                     </div>
//                                                 </td>
//                                                 <td className="py-5">
//                                                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase">
//                                                         {slice.status}
//                                                     </span>
//                                                 </td>
//                                                 <td className="py-5">
//                                                     <button 
//                                                         onClick={() => handleDeleteSlice(slice.id)}
//                                                         className="p-2 text-slate-300 hover:text-red-500 transition-colors"
//                                                     >
//                                                         <Trash2 size={18} />
//                                                     </button>
//                                                 </td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// 



























// import React, { useState, useEffect, useMemo } from 'react';
// import { useTopology, useNodes } from './Dependencies/pipeline/DataPipelineContext';
// import { extractDeviceData } from './Dependencies/mappers/topology-mapper';
// import { provisionSlice } from './Dependencies/api/apiController';
// import { Shield, Server, Activity, Trash2, Plus, RefreshCw, Zap, Search } from 'lucide-react';

// const NetworkSlicing = () => {
//     const { data: rawTopo, fetch: fetchTopo, loading: loadingTopo } = useTopology();
//     const { data: rawInv, fetch: fetchInv } = useNodes();

//     // 1. MATCH TOPOLOGY LOGIC (Finds those "Edge Port" Laptops)
//     const { discoveredHosts, discoveredSwitches } = useMemo(() => {
//         // We use your existing mapper to get the EXACT same nodes as the Topology Page
//         const mappedData = extractDeviceData(rawTopo);
//         const nodes = mappedData?.nodes || [];

//         const h = nodes.filter(n => n.group === 'host');
//         const s = nodes.filter(n => n.group === 'switch');

//         // Fallback: If Topology is empty, get switches from Inventory
//         if (s.length === 0) {
//             const invNodes = rawInv?.["opendaylight-inventory:nodes"]?.node || rawInv?.node || [];
//             invNodes.forEach(node => {
//                 if (!node.id.startsWith("host:")) s.push({ id: node.id, label: node.id, group: 'switch' });
//             });
//         }

//         console.log(`[Slicing Engine] Sync: ${s.length} Switches | ${h.length} Hosts`);
//         return { discoveredHosts: h, discoveredSwitches: s };
//     }, [rawTopo, rawInv]);

//     // 2. STATE
//     const [slices, setSlices] = useState(() => {
//         const saved = localStorage.getItem('sdn_slices');
//         return saved ? JSON.parse(saved) : [];
//     });

//     const [formData, setFormData] = useState({ name: '', hosts: [] });

//     useEffect(() => {
//         fetchTopo();
//         fetchInv();
//     }, []);

//     useEffect(() => {
//         localStorage.setItem('sdn_slices', JSON.stringify(slices));
//     }, [slices]);

//     const handleCreateSlice = async () => {
//         if (!formData.name || formData.hosts.length === 0) return alert("Select Name and Hosts");
//         try {
//             for (const hId of formData.hosts) {
//                 // Parse IDs like "host:openflow:1:3"
//                 const parts = hId.split(':');
//                 if (parts.length < 4) continue;
//                 await provisionSlice(`${parts[1]}:${parts[2]}`, `slice-${Date.now()}`, parts[3], "ALLOW");
//             }
//             setSlices([...slices, { ...formData, id: Date.now(), status: 'Active' }]);
//             setFormData({ name: '', hosts: [] });
//             alert("Network Slice Deployed!");
//         } catch (e) { alert("Deployment Error"); }
//     };

//     return (
//         <div className="p-8 bg-slate-50 min-h-screen">
//             <div className="mb-10 flex justify-between items-center text-slate-900">
//                 <div>
//                     <h1 className="text-4xl font-black tracking-tighter uppercase">Slicing Orchestrator</h1>
//                     <div className="flex gap-4 mt-3">
//                         <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100">
//                             <Server size={12} /> {discoveredSwitches.length} Switches Detected
//                         </div>
//                         <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100">
//                             <Activity size={12} /> {discoveredHosts.length} Hosts Discovered
//                         </div>
//                     </div>
//                 </div>
//                 <button onClick={() => {fetchTopo(); fetchInv();}} className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95">
//                     <RefreshCw size={14} className={loadingTopo ? "animate-spin" : ""} /> Sync Network
//                 </button>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
//                 {/* CONFIGURATION */}
//                 <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
//                     <h2 className="font-black uppercase text-slate-700 text-xs tracking-widest mb-8 flex items-center gap-2">
//                         <Shield size={18} className="text-blue-500" /> New Slice Policy
//                     </h2>
//                     <div className="space-y-6">
//                         <div>
//                             <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Slice Identity</label>
//                             <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500" placeholder="e.g. Admin-Network" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
//                         </div>
//                         <div>
//                             <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Member Hosts</label>
//                             <select multiple className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 h-64 text-[11px] font-mono outline-none focus:border-blue-500" value={formData.hosts} onChange={e => setFormData({...formData, hosts: Array.from(e.target.selectedOptions, o => o.value)})}>
//                                 {discoveredHosts.map(h => <option key={h.id} value={h.id} className="p-2 mb-1 rounded-lg uppercase font-bold hover:bg-blue-50">{h.label || h.id}</option>)}
//                                 {discoveredHosts.length === 0 && <option disabled>No laptops found on map. Run 'pingAll'...</option>}
//                             </select>
//                         </div>
//                         <button onClick={handleCreateSlice} className="w-full bg-slate-900 text-white font-black uppercase py-5 rounded-[1.5rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
//                             <Plus size={20} strokeWidth={3} /> Provision Slice
//                         </button>
//                     </div>
//                 </div>

//                 {/* INVENTORY */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm h-full min-h-[600px]">
//                         <h2 className="font-black uppercase text-slate-700 text-xs tracking-widest mb-10">Active SDN Slices</h2>
//                         {slices.length === 0 ? (
//                             <div className="h-full flex flex-col items-center justify-center py-32 text-slate-300">
//                                 <Search size={64} className="opacity-10 mb-4" />
//                                 <p className="font-bold uppercase text-[10px] tracking-widest opacity-40">No logical slices active</p>
//                             </div>
//                         ) : (
//                             <table className="w-full text-left">
//                                 <thead className="text-[10px] font-black uppercase text-slate-400">
//                                     <tr><th className="pb-5">Slice Name</th><th className="pb-5">Members</th><th className="pb-5">Status</th><th className="pb-5 text-right">Action</th></tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-slate-50">
//                                     {slices.map(s => (
//                                         <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
//                                             <td className="py-6 flex items-center gap-3">
//                                                 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">S</div>
//                                                 <p className="font-black text-slate-800 text-sm uppercase">{s.name}</p>
//                                             </td>
//                                             <td className="py-6">
//                                                 <div className="flex flex-wrap gap-1">
//                                                     {s.hosts.map(h => <span key={h} className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold uppercase">{h.split(':').pop()}</span>)}
//                                                 </div>
//                                             </td>
//                                             <td className="py-6"><span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Active</span></td>
//                                             <td className="py-6 text-right"><button onClick={() => setSlices(slices.filter(x => x.id !== s.id))} className="text-slate-200 hover:text-red-500"><Trash2 size={18} /></button></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// 






























// 
















// import React, { useState, useEffect, useMemo } from 'react';
// import { getTopology, provisionSlice, deleteFlow, installMeter, deleteMeter } from './Dependencies/api/apiController';
// import { 
//   Shield, Plus, RefreshCw, Trash2, MapPin, Search, 
//   Activity, Server, Cpu, CheckCircle2, AlertCircle, Zap, Link2, BarChart3
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// // ─── CONFIGURATION ──────────────────────────────────────────
// const TOTAL_CAPACITY_KBPS = 100000; // 100 Mbps Global Budget

// // ─── INTERNAL UI COMPONENTS ────────────────────────────────────
// const StatCard = ({ label, val, icon, colorClass }) => (
//     <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
//         <div><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p><p className="text-2xl font-black text-slate-800">{val}</p></div>
//         <div className={`p-3 rounded-2xl ${colorClass}`}>{icon}</div>
//     </div>
// );

// const NetworkSlicing = () => {
//     // ─── STATE ──────────────────────────────────────────────────
//     const [topoRaw, setTopoRaw] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [toasts, setToasts] = useState([]);
//     const [slices, setSlices] = useState(() => JSON.parse(localStorage.getItem('sdn_orchestrator_slices') || "[]"));

//     const [formData, setFormData] = useState({ 
//         name: '', 
//         isolationMode: 'host', 
//         selectedHosts: [], 
//         selectedLink: '', 
//         trafficType: 'All Traffic (Drop completely)', 
//         bandwidth: '' 
//     });

//     // ─── ADMISSION CONTROL MATH ────────────────────────────────
//     const usedBandwidth = useMemo(() => {
//         return slices.reduce((acc, s) => acc + (Number(s.qosBandwidth) || 0), 0);
//     }, [slices]);

//     const remainingBandwidth = TOTAL_CAPACITY_KBPS - usedBandwidth;
//     const capacityPercent = (usedBandwidth / TOTAL_CAPACITY_KBPS) * 100;

//     // ─── DISCOVERY LOGIC ────────────────────
//     const refreshDiscovery = async () => {
//         setLoading(true);
//         try {
//             const data = await getTopology();
//             setTopoRaw(data);
//             addToast("Network Map Synchronized", "success");
//         } catch (e) { addToast("ODL Controller Unreachable", "error"); }
//         finally { setLoading(false); }
//     };

//     useEffect(() => { refreshDiscovery(); }, []);
//     useEffect(() => { localStorage.setItem('sdn_orchestrator_slices', JSON.stringify(slices)); }, [slices]);

//     const discoveredHosts = useMemo(() => {
//         const nodes = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.node || topoRaw?.topology?.[0]?.node || [];
//         return nodes.filter(n => n["node-id"]?.startsWith("host:"));
//     }, [topoRaw]);

//     const discoveredLinks = useMemo(() => {
//         const links = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.link || topoRaw?.topology?.[0]?.link || [];
//         const swLinks = links.filter(l => l.source?.["source-node"]?.startsWith("openflow:") && l.destination?.["dest-node"]?.startsWith("openflow:"));
//         const uniqueLinks = []; const seen = new Set();
//         swLinks.forEach(l => {
//             const sig = [l.source["source-node"], l.destination["dest-node"]].sort().join("<->");
//             if (!seen.has(sig)) { seen.add(sig); uniqueLinks.push(l); }
//         });
//         return uniqueLinks;
//     }, [topoRaw]);

//     const addToast = (msg, type) => {
//         const id = Date.now();
//         setToasts(prev => [...prev, { id, msg, type }]);
//         setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
//     };

//     // ─── PROVISIONING ENGINE (ADMISSION CONTROL INTEGRATED) ─────
//     const handleProvision = async () => {
//         if (!formData.name) return addToast("Provide a Slice Name", "error");
        
//         // 1. ADMISSION CONTROL CHECK
//         const requested = Number(formData.bandwidth) || 0;
//         if (requested > remainingBandwidth) {
//             return addToast(`Admission Denied: Only ${remainingBandwidth} Kbps remaining!`, "error");
//         }

//         try {
//             const provisionedDetails = [];
//             const isQoS = formData.bandwidth && !formData.trafficType.includes("All Traffic");
//             const targetAction = isQoS ? "ALLOW" : "DROP";

//             if (formData.isolationMode === 'host') {
//                 if (formData.selectedHosts.length === 0) return addToast("Select at least one host", "error");
//                 for (const hostId of formData.selectedHosts) {
//                     const hostNode = discoveredHosts.find(h => h["node-id"] === hostId);
//                     const attachment = hostNode?.["host-tracker-service:attachment-points"]?.[0];
//                     if (!attachment?.["tp-id"]) continue;
//                     const parts = attachment["tp-id"].split(':');
//                     const targetSwitch = `${parts[0]}:${parts[1]}`;
//                     const port = parts[2];
//                     let mId = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;
//                     if (mId) await installMeter(targetSwitch, mId, formData.bandwidth);
//                     await provisionSlice(targetSwitch, formData.name, port, targetAction, formData.trafficType, mId ? {meterId: mId} : null);
//                     provisionedDetails.push({ targetSwitch, port, label: hostId.split(':').pop(), meterId: mId });
//                 }
//             } else {
//                 if (!formData.selectedLink) return addToast("Select a core link", "error");
//                 const linkObj = discoveredLinks.find(l => l["link-id"] === formData.selectedLink);
//                 const srcSwitch = linkObj.source["source-node"]; const srcPort = linkObj.source["source-tp"].split(':').pop();
//                 const dstSwitch = linkObj.destination["dest-node"]; const dstPort = linkObj.destination["dest-tp"].split(':').pop();
//                 let sMid = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;
//                 let dMid = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;
//                 if (sMid) await installMeter(srcSwitch, sMid, formData.bandwidth);
//                 if (dMid) await installMeter(dstSwitch, dMid, formData.bandwidth);
//                 await provisionSlice(srcSwitch, formData.name, srcPort, targetAction, formData.trafficType, sMid ? {meterId: sMid} : null);
//                 await provisionSlice(dstSwitch, formData.name, dstPort, targetAction, formData.trafficType, dMid ? {meterId: dMid} : null);
//                 provisionedDetails.push({ targetSwitch: srcSwitch, port: srcPort, label: srcSwitch.split(':').pop(), meterId: sMid }, { targetSwitch: dstSwitch, port: dstPort, label: dstSwitch.split(':').pop(), meterId: dMid });
//             }

//             setSlices([{ id: Date.now(), name: formData.name, type: formData.isolationMode, targets: provisionedDetails, traffic: formData.trafficType, qosBandwidth: isQoS ? formData.bandwidth : null, status: isQoS ? 'Throttled' : 'Isolated', created: new Date().toLocaleTimeString() }, ...slices]);
//             setFormData({ ...formData, name: '', selectedHosts: [], selectedLink: '', bandwidth: '' });
//             addToast(`Provisioned: ${formData.name}`, "success");
//         } catch (e) { 
//             if (formData.bandwidth) addToast("Switch rejected QoS Meter. Hardware constraint detected.", "error");
//             else addToast("Deployment Error", "error");
//         }
//     };

//     const handleDecommission = async (slice) => {
//         try {
//             for (const item of (slice.targets || [])) {
//                 await deleteFlow(item.targetSwitch, 0, slice.name);
//                 if (item.meterId) await deleteMeter(item.targetSwitch, item.meterId);
//             }
//             setSlices(slices.filter(s => s.id !== slice.id));
//             addToast("Resources Released", "success");
//         } catch (e) { addToast("Removal Failed", "error"); }
//     };

//     return (
//         <div className="min-h-screen bg-slate-50 p-8 font-sans">
//             <div className="fixed top-24 right-8 z-[100] space-y-3 pointer-events-none">
//                 <AnimatePresence>{toasts.map(t => (
//                     <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
//                         className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl border pointer-events-auto ${t.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
//                         {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span className="font-black uppercase text-[10px] tracking-widest">{t.msg}</span>
//                     </motion.div>
//                 ))}</AnimatePresence>
//             </div>

//             <div className="flex justify-between items-start mb-12">
//                 <div><h1 className="text-5xl font-black tracking-tighter uppercase text-slate-900 leading-none">Slicing <span className="text-blue-600 font-black">Orchestrator</span></h1><p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-4 ml-1">Intelligent Resource Broker</p></div>
//                 <button onClick={refreshDiscovery} className="bg-white border-2 border-slate-200 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase flex items-center gap-3 hover:border-blue-500 transition-all shadow-sm">
//                     <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Discovery
//                 </button>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
//                 <StatCard label="Live Hosts" val={discoveredHosts.length} icon={<Activity size={20} className="text-emerald-500" />} colorClass="bg-emerald-50" />
//                 <StatCard label="Network Load" val={`${(usedBandwidth/1000).toFixed(1)} Mbps`} icon={<BarChart3 size={20} className="text-blue-500" />} colorClass="bg-blue-50" />
//                 <StatCard label="ODL Status" val={topoRaw ? "ONLINE" : "OFFLINE"} icon={<Server size={20} className={topoRaw ? "text-emerald-500" : "text-red-500"} />} colorClass={topoRaw ? "bg-emerald-50" : "bg-red-50"} />
//                 <StatCard label="Active Slices" val={slices.length} icon={<Shield size={20} className="text-purple-500" />} colorClass="bg-purple-50" />
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
//                 <div className="lg:col-span-4">
//                     <div className="bg-[#1e293b] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden h-fit">
//                         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
//                         <h2 className="font-black uppercase text-[11px] tracking-[0.2em] mb-10 flex items-center gap-3 text-blue-400"><Zap size={20} fill="currentColor" /> Admission Control</h2>
                        
//                         {/* CAPACITY BAR */}
//                         <div className="mb-8">
//                             <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 mb-2">
//                                 <span>Network Capacity</span>
//                                 <span>{remainingBandwidth.toLocaleString()} Kbps Left</span>
//                             </div>
//                             <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
//                                 <motion.div animate={{ width: `${capacityPercent}%` }} className={`h-full ${capacityPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} />
//                             </div>
//                         </div>

//                         <div className="space-y-8 relative z-10">
//                             <div className="flex gap-2 p-1 bg-slate-800 rounded-2xl border-2 border-white/5 mb-2">
//                                 <button onClick={() => setFormData({...formData, isolationMode: 'host', selectedLink: ''})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'host' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Host Isolation</button>
//                                 <button onClick={() => setFormData({...formData, isolationMode: 'link', selectedHosts: []})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'link' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Link Isolation</button>
//                             </div>
//                             <input className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 text-blue-100" placeholder="Policy Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
//                             <AnimatePresence mode="wait">
//                                 {formData.isolationMode === 'host' ? (
//                                     <motion.div key="host" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
//                                         <div className="bg-slate-800 border-2 border-white/5 rounded-[1.5rem] p-4 max-h-64 overflow-y-auto space-y-2">
//                                             {discoveredHosts.map(h => {
//                                                 const isS = formData.selectedHosts.includes(h["node-id"]);
//                                                 return (
//                                                     <div key={h["node-id"]} onClick={() => setFormData({...formData, selectedHosts: isS ? formData.selectedHosts.filter(id => id !== h["node-id"]) : [...formData.selectedHosts, h["node-id"]]})}
//                                                         className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isS ? 'bg-blue-600' : 'bg-slate-900/50 hover:bg-slate-700'}`}>
//                                                         <span className="font-mono text-[10px] font-bold uppercase">{h["node-id"].split(':').pop()}</span>{isS ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-white/20"></div>}
//                                                     </div>
//                                                 );
//                                             })}
//                                         </div>
//                                     </motion.div>
//                                 ) : (
//                                     <motion.div key="link" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
//                                         <select className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer text-white" value={formData.selectedLink} onChange={e => setFormData({...formData, selectedLink: e.target.value})}>
//                                             <option value="">Select Link to Sever...</option>
//                                             {discoveredLinks.map(l => <option key={l["link-id"]} value={l["link-id"]}>Switch {l.source["source-node"].split(':').pop()} ↔ Switch {l.destination["dest-node"].split(':').pop()}</option>)}
//                                         </select>
//                                     </motion.div>
//                                 )}
//                             </AnimatePresence>
//                             <div className="grid grid-cols-2 gap-4">
//                                 <select className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl px-5 py-4 text-[10px] font-bold text-white" value={formData.trafficType} onChange={e => setFormData({...formData, trafficType: e.target.value})}>
//                                     <option>All Traffic (Drop completely)</option><option>HTTP (TCP 80)</option><option>HTTPS (TCP 443)</option><option>SSH (TCP 22)</option><option>ICMP (Ping)</option>
//                                 </select>
//                                 <div className={`relative ${formData.trafficType.includes("All") ? 'opacity-30 pointer-events-none' : ''}`}>
//                                     <input type="number" className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl pl-5 pr-10 py-4 text-xs font-bold text-white outline-none" placeholder="Rate" value={formData.bandwidth} onChange={e => setFormData({...formData, bandwidth: e.target.value})} />
//                                     <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">Kbps</span>
//                                 </div>
//                             </div>
//                             <button onClick={handleProvision} className={`w-full text-white font-black uppercase py-5 rounded-[1.5rem] shadow-2xl transition-all flex items-center justify-center gap-3 ${formData.isolationMode === 'link' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'}`}>
//                                 <Plus size={20} strokeWidth={4} /> Deploy {formData.isolationMode} Slice
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm min-h-[700px] overflow-hidden text-slate-800">
//                     <div className="flex justify-between items-center mb-10 px-2"><h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em]">Operational Policy Inventory</h2><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} /><input className="bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none w-64" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
//                     {slices.length === 0 ? <div className="flex flex-col items-center justify-center py-32 opacity-20 text-slate-900"><Shield size={64} className="mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">No active logical slices</p></div> : (
//                         <div className="overflow-x-auto px-2"><table className="w-full text-left border-separate border-spacing-y-4"><thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="px-6">Identity</th><th>Mapping</th><th>Firewall & QoS</th><th>Status</th><th className="text-right px-6">Manage</th></tr></thead>
//                                 <tbody>{slices.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
//                                     <tr key={s.id} className="group transition-all"><td className="bg-slate-50 rounded-l-[1.5rem] px-6 py-6 border-y border-l border-slate-100"><p className="font-black text-slate-800 text-sm uppercase">{s.name}</p><p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sync: {s.created}</p></td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100">{s.type === 'link' ? <div className="bg-purple-50 text-purple-600 border border-purple-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase w-fit">{(s.targets?.[0]?.label || 'S')} ↔ {(s.targets?.[1]?.label || 'S')}</div> : <div className="flex flex-wrap gap-1">{(s.targets || []).map(h => <span key={h.label} className="bg-white border border-slate-200 px-2 py-1 rounded text-[8px] font-black text-blue-600 uppercase shadow-sm"><MapPin size={8} className="inline mr-1"/> {h.targetSwitch} (P{h.port})</span>)}</div>}</td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100"><p className="text-[10px] font-black text-slate-700 uppercase italic">{(s.traffic || 'All Traffic').split('(')[0]}</p>{s.qosBandwidth ? <p className="text-[9px] font-black text-blue-500 uppercase mt-1 bg-blue-100 px-2 py-0.5 rounded w-fit">QoS: {s.qosBandwidth} Kbps</p> : <p className="text-[9px] font-bold text-red-400 mt-1">Total Block</p>}</td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${s.status === 'Throttled' ? 'bg-blue-50 text-blue-600 border-blue-100' : s.type === 'link' ? 'bg-purple-100 text-purple-700' : 'bg-red-50 text-red-600'}`}>{s.status || 'Isolated'}</span></td>
//                                             <td className="bg-slate-50 rounded-r-[1.5rem] px-6 py-6 text-right border-y border-r border-slate-100"><button onClick={() => handleDecommission(s)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:scale-110 active:scale-95"><Trash2 size={16} /></button></td></tr>
//                                 ))}</tbody></table></div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };
// 


























































// import React, { useState, useEffect, useMemo } from 'react';
// import { getTopology, provisionSlice, deleteFlow, installMeter, deleteMeter } from './Dependencies/api/apiController';
// import { 
//     Shield, Plus, RefreshCw, Trash2, MapPin, Search, 
//     Activity, Server, CheckCircle2, AlertCircle, Zap, Link2, Brain, Sparkles, Play, Pause, ArrowDown
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// const GLOBAL_CAPACITY_KBPS = 100000;

// // ─── INTERNAL UI COMPONENTS ────────────────────────────────────
// const StatCard = ({ label, val, icon, colorClass }) => (
//     <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
//         <div>
//             <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
//             <p className="text-2xl font-black text-slate-800">{val}</p>
//         </div>
//         <div className={`p-3 rounded-2xl ${colorClass}`}>{icon}</div>
//     </div>
// );

// const NetworkSlicing = () => {
//     // ─── STATE ──────────────────────────────────────────────────
//     const [topoRaw, setTopoRaw] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [toasts, setToasts] = useState([]);

//     const [slices, setSlices] = useState(() => {
//         const saved = localStorage.getItem('sdn_orchestrator_slices');
//         return saved ? JSON.parse(saved) : [];
//     });

//     const [formData, setFormData] = useState({
//         name: '',
//         isolationMode: 'host', 
//         selectedHosts: [],
//         selectedLink: '',
//         trafficType: 'All Traffic (Drop completely)',
//         bandwidth: '',
//         priority: 'Medium',
//         latency: 'Medium'
//     });

//     const [intentText, setIntentText] = useState("");
//     const [parsedIntent, setParsedIntent] = useState(null);
//     const [admissionStatus, setAdmissionStatus] = useState(null);

//     // ─── DISCOVERY LOGIC (ODL 23 COMPATIBLE) ────────────────────
//     const refreshDiscovery = async () => {
//         setLoading(true);
//         try {
//             const data = await getTopology();
//             setTopoRaw(data);
//             addToast("Network Map Synchronized", "success");
//         } catch (error) {
//             addToast("ODL Controller Unreachable", "error");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => { refreshDiscovery(); }, []);
//     useEffect(() => { localStorage.setItem('sdn_orchestrator_slices', JSON.stringify(slices)); }, [slices]);

//     const discoveredHosts = useMemo(() => {
//         const nodes = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.node || topoRaw?.topology?.[0]?.node || [];
//         return nodes.filter(n => n["node-id"]?.startsWith("host:"));
//     }, [topoRaw]);

//     const discoveredLinks = useMemo(() => {
//         const links = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.link || topoRaw?.topology?.[0]?.link || [];
//         const swLinks = links.filter(l => l.source?.["source-node"]?.startsWith("openflow:") && l.destination?.["dest-node"]?.startsWith("openflow:"));
//         const uniqueLinks = [];
//         const seen = new Set();
//         swLinks.forEach(l => {
//             const sig = [l.source?.["source-node"], l.destination?.["dest-node"]].sort().join("<->");
//             if (!seen.has(sig)) { seen.add(sig); uniqueLinks.push(l); }
//         });
//         return uniqueLinks;
//     }, [topoRaw]);

//     // Only count bandwidth for active slices
//     const allocatedBandwidth = useMemo(() => slices.filter(s => s.isActive).reduce((sum, s) => sum + parseInt(s.qosBandwidth || 0), 0), [slices]);
//     const utilizationPct = Math.min((allocatedBandwidth / GLOBAL_CAPACITY_KBPS) * 100, 100);

//     const addToast = (msg, type) => {
//         const id = Date.now();
//         setToasts(prev => [...prev, { id, msg, type }]);
//         setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
//     };

//     // ─── INTENT PARSING ENGINE (AUTO-FILLS MANUAL FORM) ─────────
//     const handleParseIntent = () => {
//         if (!intentText.trim()) return;
        
//         const lower = intentText.toLowerCase();
//         let bw = ""; let traffic = "All Traffic (Drop completely)"; let mode = "host"; 
//         let name = "Custom Slice";
//         let priority = "Medium"; let latency = "Medium";
        
//         const kbpsMatch = lower.match(/(\d+)\s*kbps/);
//         const mbpsMatch = lower.match(/(\d+)\s*mbps/);
//         if (kbpsMatch) bw = kbpsMatch[1];
//         else if (mbpsMatch) bw = (parseInt(mbpsMatch[1]) * 1000).toString();

//         // 1. Determine Name Independently
//         if (lower.includes("hospital") || lower.includes("medical")) name = "Hospital Traffic Slice";
//         else if (lower.includes("guest")) name = "Guest Network Slice";
//         else if (lower.includes("iot") || lower.includes("camera")) name = "IoT Device Slice";

//         // 2. Determine Priority & Latency Independently
//         if (lower.includes("critical")) { priority = "Critical"; latency = "Low"; }
//         else if (lower.includes("hospital")) { priority = "High"; latency = "Low"; }
//         else if (lower.includes("guest")) { priority = "Low"; latency = "High"; }
//         else if (lower.includes("high")) priority = "High";
        
//         // 3. Determine Traffic Type Independently
//         if (lower.includes("http")) traffic = "HTTP (TCP 80)";
//         if (lower.includes("ssh")) traffic = "SSH (TCP 22)";
//         if (lower.includes("link")) mode = "link";
        
//         const foundHost = discoveredHosts.find(h => lower.includes(h["node-id"].toLowerCase().split(':')[1]));
//         const selectedHosts = foundHost ? [foundHost["node-id"]] : [];

//         setFormData({
//             name,
//             isolationMode: mode,
//             selectedHosts,
//             selectedLink: '',
//             trafficType: bw ? (traffic.includes("All Traffic") ? "HTTP (TCP 80)" : traffic) : traffic, 
//             bandwidth: bw,
//             priority,
//             latency
//         });

//         setParsedIntent({
//             bandwidth: bw ? `${bw} Kbps` : "None",
//             priority,
//             latency,
//             isolation: mode.toUpperCase(),
//             qos: bw ? "Enabled" : "Disabled",
//             security: bw ? "Allow Port" : "STRICT (Drop All)"
//         });

//         setTimeout(() => setParsedIntent(null), 8000); 
//     };

//     const applyTemplate = (text) => setIntentText(text);

//     // ─── PROVISIONING LOGIC (WITH ADMISSION CONTROL) ────────────
//     const handleProvision = async () => {
//         if (!formData.name) {
//             setAdmissionStatus({ status: 'error', msg: '✕ REJECTED — Missing Slice Name' });
//             setTimeout(() => setAdmissionStatus(null), 4000);
//             return;
//         }

//         // Admission Control Validation
//         const reqBw = parseInt(formData.bandwidth || 0);
//         if (reqBw > (GLOBAL_CAPACITY_KBPS - allocatedBandwidth)) {
//             setAdmissionStatus({ status: 'error', msg: `✕ REJECTED — Insufficient Bandwidth (${GLOBAL_CAPACITY_KBPS - allocatedBandwidth} Kbps available)` });
//             setTimeout(() => setAdmissionStatus(null), 4000);
//             return;
//         }

//         try {
//             const provisionedDetails = [];
//             const isQoS = formData.bandwidth && !formData.trafficType.includes("All Traffic");
//             const targetAction = isQoS ? "ALLOW" : "DROP";

//             // Map Priority string to OpenFlow numeric priority
//             const priorityMap = { 'Critical': 1000, 'High': 900, 'Medium': 800, 'Low': 700 };
//             const numPriority = priorityMap[formData.priority] || 800;

//             if (formData.isolationMode === 'host') {
//                 if (formData.selectedHosts.length === 0) return addToast("Select at least one host", "error");
                
//                 for (const hostId of formData.selectedHosts) {
//                     const hostNode = discoveredHosts.find(h => h["node-id"] === hostId);
//                     const attachment = hostNode?.["host-tracker-service:attachment-points"]?.[0];
//                     const tpId = attachment?.["tp-id"]; 
//                     if (!tpId) { addToast(`Location unknown for ${hostId.split(':').pop()}`, "error"); continue; }
                    
//                     const parts = tpId.split(':');
//                     const targetSwitch = `${parts[0]}:${parts[1]}`;
//                     const port = parts[2];

//                     let mId = null;
//                     if (isQoS) {
//                         mId = Math.floor(Math.random() * 9000) + 1;
//                         try { await installMeter(targetSwitch, mId, formData.bandwidth); } 
//                         catch (e) { return addToast("Switch rejected QoS Meter.", "error"); }
//                     }
//                     await provisionSlice(targetSwitch, formData.name, port, targetAction, formData.trafficType, mId ? {meterId: mId} : null, numPriority);
//                     provisionedDetails.push({ targetSwitch, port, label: hostId.split(':').pop(), meterId: mId });
//                 }
//             } else {
//                 if (!formData.selectedLink) return addToast("Select a core link to sever", "error");
//                 const linkObj = discoveredLinks.find(l => l["link-id"] === formData.selectedLink);
//                 if (!linkObj) return;

//                 const srcSwitch = linkObj.source["source-node"];
//                 const srcPort = linkObj.source["source-tp"].split(':').pop();
//                 const dstSwitch = linkObj.destination["dest-node"];
//                 const dstPort = linkObj.destination["dest-tp"].split(':').pop();

//                 let srcMeterId = null, dstMeterId = null;
//                 if (isQoS) {
//                     srcMeterId = Math.floor(Math.random() * 9000) + 1; dstMeterId = Math.floor(Math.random() * 9000) + 1;
//                     try {
//                         await installMeter(srcSwitch, srcMeterId, formData.bandwidth);
//                         await installMeter(dstSwitch, dstMeterId, formData.bandwidth);
//                     } catch (e) { return addToast("Switch rejected QoS Meter.", "error"); }
//                 }

//                 await provisionSlice(srcSwitch, formData.name, srcPort, targetAction, formData.trafficType, srcMeterId ? {meterId: srcMeterId} : null, numPriority);
//                 await provisionSlice(dstSwitch, formData.name, dstPort, targetAction, formData.trafficType, dstMeterId ? {meterId: dstMeterId} : null, numPriority);

//                 provisionedDetails.push({ targetSwitch: srcSwitch, port: srcPort, label: srcSwitch.split(':').pop(), meterId: srcMeterId });
//                 provisionedDetails.push({ targetSwitch: dstSwitch, port: dstPort, label: dstSwitch.split(':').pop(), meterId: dstMeterId });
//             }

//             setSlices([{
//                 id: Date.now(), name: formData.name, type: formData.isolationMode, targets: provisionedDetails,
//                 traffic: formData.trafficType, qosBandwidth: isQoS ? formData.bandwidth : null,
//                 priority: formData.priority, latency: formData.latency,
//                 status: isQoS ? 'Throttled' : 'Isolated', isActive: true, created: new Date().toLocaleTimeString()
//             }, ...slices]);

//             setAdmissionStatus({ status: 'success', msg: `✓ ADMITTED — Capacity Confirmed (${reqBw} Kbps reserved)` });
//             setTimeout(() => setAdmissionStatus(null), 5000);

//             setFormData({ name: '', isolationMode: 'host', selectedHosts: [], selectedLink: '', trafficType: 'All Traffic (Drop completely)', bandwidth: '', priority: 'Medium', latency: 'Medium' });
//             setIntentText("");
//             setParsedIntent(null);
            
//         } catch (err) { addToast("SDN Flow Deployment Failed", "error"); }
//     };

//     const handleToggleActive = async (slice) => {
//         try {
//             if (slice.isActive) {
//                 // Deactivate: Delete flows/meters
//                 for (const item of slice.targets) {
//                     await deleteFlow(item.targetSwitch, 0, slice.name);
//                     if (item.meterId) await deleteMeter(item.targetSwitch, item.meterId);
//                 }
//             } else {
//                 // Reactivate: Re-provision flows/meters
//                 const targetAction = slice.qosBandwidth ? "ALLOW" : "DROP";
//                 const priorityMap = { 'Critical': 1000, 'High': 900, 'Medium': 800, 'Low': 700 };
//                 const numPriority = priorityMap[slice.priority] || 800;

//                 for (const item of slice.targets) {
//                     if (item.meterId) {
//                         try { await installMeter(item.targetSwitch, item.meterId, slice.qosBandwidth); } catch(e){}
//                     }
//                     await provisionSlice(item.targetSwitch, slice.name, item.port, targetAction, slice.traffic, item.meterId ? {meterId: item.meterId} : null, numPriority);
//                 }
//             }
            
//             setSlices(slices.map(s => s.id === slice.id ? { ...s, isActive: !s.isActive } : s));
//             addToast(`Slice ${slice.isActive ? 'Deactivated' : 'Activated'}`, "success");
//         } catch (e) {
//             addToast(`Failed to toggle slice status`, "error");
//         }
//     };

//     const handleDecommission = async (slice) => {
//         try {
//             if (slice.isActive) {
//                 for (const item of slice.targets) {
//                     await deleteFlow(item.targetSwitch, 0, slice.name);
//                     if (item.meterId) await deleteMeter(item.targetSwitch, item.meterId);
//                 }
//             }
//             setSlices(slices.filter(s => s.id !== slice.id));
//             addToast("Network Merge Complete", "success");
//         } catch (e) { addToast("Decommission Failed", "error"); }
//     };

//     return (
//         <div className="min-h-screen bg-slate-50 p-8 font-sans">
//             <div className="fixed top-24 right-8 z-[100] space-y-3 pointer-events-none">
//                 <AnimatePresence>
//                     {toasts.map(t => (
//                         <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
//                             className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl border pointer-events-auto ${t.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
//                             {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
//                             <span className="font-black uppercase text-[10px] tracking-widest">{t.msg}</span>
//                         </motion.div>
//                     ))}
//                 </AnimatePresence>
//             </div>

//             <div className="flex justify-between items-start mb-10">
//                 <div>
//                     <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 flex items-center">
//                         <Brain className="mr-3 text-blue-600" size={32}/> Intent-Based Slicing Orchestrator
//                     </h1>
//                 </div>
//                 <button onClick={refreshDiscovery} className="bg-white border-2 border-slate-200 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase flex items-center gap-3 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
//                     <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Discovery
//                 </button>
//             </div>

//             {/* ENVIRONMENT CHECKLIST */}
//             <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-6 items-center">
//                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-200 pr-6 mr-2 flex items-center gap-2">
//                     <Server size={14} className="text-slate-400"/> Environment Checklist
//                 </p>
//                 <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${topoRaw ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={14}/> ODL Controller Online</span>
//                 <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${topoRaw ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={14}/> Topology Discovery</span>
//                 <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${topoRaw ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={14}/> Flow Programming</span>
//                 <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${topoRaw ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={14}/> QoS Enforcement</span>
//                 <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${topoRaw ? 'text-emerald-600' : 'text-slate-300'}`}><CheckCircle2 size={14}/> Firewall Rules</span>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
//                 <div className="md:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
//                     <div className="flex justify-between items-center mb-2">
//                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Network Load</p>
//                         <p className="text-xs font-bold text-slate-700">{utilizationPct.toFixed(0)}%</p>
//                     </div>
//                     <div className="w-full bg-slate-100 rounded-full h-2">
//                         <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${utilizationPct}%` }}></div>
//                     </div>
//                     <p className="text-right text-[12px] font-black text-slate-700 mt-2">
//                         {allocatedBandwidth.toLocaleString()} <span className="text-slate-400 font-bold text-[9px]">/ {GLOBAL_CAPACITY_KBPS.toLocaleString()} Kbps Allocated</span>
//                     </p>
//                 </div>
//                 <StatCard label="Total Slices" val={slices.length} icon={<Shield size={20} className="text-purple-500" />} colorClass="bg-purple-50" />
//                 <StatCard label="Active Slices" val={slices.filter(s=>s.isActive).length} icon={<Activity size={20} className="text-blue-500" />} colorClass="bg-blue-50" />
//                 <StatCard label="Live Hosts" val={discoveredHosts.length} icon={<Server size={20} className="text-emerald-500" />} colorClass="bg-emerald-50" />
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
//                 {/* CONFIGURATION COLUMN */}
//                 <div className="lg:col-span-4 flex flex-col">
//                     {/* 1. INTENT ENGINE */}
//                     <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex-shrink-0">
//                         <div className="absolute top-0 right-0 p-6 opacity-5"><Sparkles size={120}/></div>
//                         <h2 className="text-sm font-bold mb-4 flex items-center"><Sparkles className="mr-2 text-blue-400" size={16}/> Intent Engine</h2>
                        
//                         <textarea value={intentText} onChange={e => setIntentText(e.target.value)} placeholder="e.g. Isolate host 1 for HTTP critical hospital traffic with 20000 Kbps..." className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm min-h-[100px] relative z-10 focus:outline-none focus:border-blue-500" />
                        
//                         <div className="mt-3 flex flex-wrap gap-2 relative z-10">
//                             <button onClick={()=>applyTemplate("Isolate host 1 for HTTP critical hospital traffic with 20000 Kbps")} className="text-[10px] uppercase font-bold bg-slate-800 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-700">Hospital Traffic</button>
//                             <button onClick={()=>applyTemplate("Create a guest network dropping all traffic to host 2")} className="text-[10px] uppercase font-bold bg-slate-800 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors border border-slate-700">Guest Network</button>
//                         </div>
//                         <button onClick={handleParseIntent} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all relative z-10 shadow-[0_0_15px_rgba(37,99,235,0.4)]">Parse & Auto-Fill Form</button>
                        
//                         {/* PARSED INTENT CARD (Appears on parse) */}
//                         <AnimatePresence>
//                             {parsedIntent && (
//                                 <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-4 overflow-hidden relative z-10">
//                                     <h3 className="text-[10px] text-blue-400 font-black uppercase mb-3 flex items-center gap-2"><Brain size={12}/> Intent Interpretation</h3>
//                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">Bandwidth</span><span className="text-[10px] font-bold text-white">{parsedIntent.bandwidth}</span></div>
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">Priority</span><span className="text-[10px] font-bold text-white">{parsedIntent.priority}</span></div>
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">Latency</span><span className="text-[10px] font-bold text-white">{parsedIntent.latency}</span></div>
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">Isolation</span><span className="text-[10px] font-bold text-white">{parsedIntent.isolation}</span></div>
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">QoS Mode</span><span className="text-[10px] font-bold text-white">{parsedIntent.qos}</span></div>
//                                         <div className="bg-slate-900/50 p-2 rounded-lg"><span className="text-[8px] text-slate-500 uppercase block mb-1">Firewall</span><span className="text-[10px] font-bold text-white truncate block" title={parsedIntent.security}>{parsedIntent.security}</span></div>
//                                     </div>
//                                 </motion.div>
//                             )}
//                         </AnimatePresence>
//                     </div>

//                     {/* VISUAL WORKFLOW ARROWS */}
//                     <div className="flex flex-col items-center justify-center py-1 -my-1 relative z-20">
//                         <div className="w-1 h-6 bg-blue-100 rounded-full"></div>
//                         <div className="bg-blue-100 text-blue-500 rounded-full p-2 border-4 border-slate-50"><ArrowDown size={14} strokeWidth={3} /></div>
//                         <div className="w-1 h-6 bg-blue-100 rounded-full"></div>
//                     </div>

//                     {/* 2. MANUAL CONFIGURATION FORM */}
//                     <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden flex-shrink-0">
//                         <h2 className="font-black uppercase text-[11px] tracking-[0.2em] mb-8 flex items-center gap-3 text-slate-800">
//                             <Zap size={20} className="text-blue-500" /> Policy Configuration
//                         </h2>

//                         <div className="space-y-6 relative z-10">
//                             <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-200 mb-2">
//                                 <button onClick={() => setFormData({...formData, isolationMode: 'host', selectedLink: ''})} 
//                                     className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'host' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
//                                     Host Isolation
//                                 </button>
//                                 <button onClick={() => setFormData({...formData, isolationMode: 'link', selectedHosts: []})} 
//                                     className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'link' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
//                                     Link Isolation
//                                 </button>
//                             </div>

//                             <div>
//                                 <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Slice Name</label>
//                                 <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-800" 
//                                     placeholder="e.g. Hospital-Quarantine" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
//                             </div>

//                             <AnimatePresence mode="wait">
//                                 {formData.isolationMode === 'host' ? (
//                                     <motion.div key="host" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//                                         <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Target Laptops (Multi-Select)</label>
//                                         <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 max-h-48 overflow-y-auto space-y-2">
//                                             {discoveredHosts.map(h => {
//                                                 const isSelected = formData.selectedHosts.includes(h["node-id"]);
//                                                 return (
//                                                     <div key={h["node-id"]} onClick={() => setFormData({...formData, selectedHosts: isSelected ? formData.selectedHosts.filter(id => id !== h["node-id"]) : [...formData.selectedHosts, h["node-id"]]})}
//                                                         className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 hover:bg-slate-100 text-slate-600'}`}>
//                                                         <span className="font-mono text-[10px] font-bold uppercase">{h["node-id"].split(':').pop()}</span>
//                                                         {isSelected && <CheckCircle2 size={12} />}
//                                                     </div>
//                                                 );
//                                             })}
//                                         </div>
//                                     </motion.div>
//                                 ) : (
//                                     <motion.div key="link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
//                                         <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Infrastructure Link</label>
//                                         <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer text-slate-700"
//                                             value={formData.selectedLink} onChange={e => setFormData({...formData, selectedLink: e.target.value})}>
//                                             <option value="">Select Link to Sever...</option>
//                                             {discoveredLinks.map(l => {
//                                                 const s = l.source?.["source-node"].split(':').pop();
//                                                 const d = l.destination?.["dest-node"].split(':').pop();
//                                                 return <option key={l["link-id"]} value={l["link-id"]}>Switch {s} ↔ Switch {d}</option>;
//                                             })}
//                                         </select>
//                                     </motion.div>
//                                 )}
//                             </AnimatePresence>

//                             <div className="grid grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Priority Level</label>
//                                     <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer text-slate-700" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
//                                         <option>Critical</option>
//                                         <option>High</option>
//                                         <option>Medium</option>
//                                         <option>Low</option>
//                                     </select>
//                                 </div>
//                                 <div>
//                                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Latency Req.</label>
//                                     <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer text-slate-700" value={formData.latency} onChange={e => setFormData({...formData, latency: e.target.value})}>
//                                         <option>Low</option>
//                                         <option>Medium</option>
//                                         <option>High</option>
//                                     </select>
//                                 </div>
//                             </div>

//                             <div className="grid grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">Traffic Firewall</label>
//                                     <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-4 text-[10px] font-bold appearance-none cursor-pointer text-slate-700"
//                                         value={formData.trafficType} onChange={e => setFormData({...formData, trafficType: e.target.value})}>
//                                         <option>All Traffic (Drop completely)</option>
//                                         <option>HTTP (TCP 80)</option>
//                                         <option>HTTPS (TCP 443)</option>
//                                         <option>SSH (TCP 22)</option>
//                                         <option>DNS (UDP 53)</option>
//                                         <option>ICMP (Ping)</option>
//                                     </select>
//                                 </div>
//                                 <div className={`transition-opacity ${formData.trafficType.includes("All Traffic") ? 'opacity-30 pointer-events-none' : ''}`}>
//                                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-3 ml-1">QoS Rate Limit</label>
//                                     <div className="relative">
//                                         <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-10 py-4 text-xs font-bold outline-none focus:border-blue-500 text-slate-700"
//                                             placeholder="None" value={formData.bandwidth} onChange={e => setFormData({...formData, bandwidth: e.target.value})} />
//                                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Kbps</span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="relative mt-8">
//                                 <button onClick={handleProvision} className={`w-full text-white font-black uppercase py-5 rounded-[1.5rem] shadow-lg transition-all flex items-center justify-center gap-3 group ${formData.isolationMode === 'link' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}>
//                                     <Plus size={18} strokeWidth={4} className="group-hover:rotate-90 transition-transform" /> Submit to Admission Control
//                                 </button>
                                
//                                 <AnimatePresence>
//                                     {admissionStatus && (
//                                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} 
//                                             className={`absolute left-0 right-0 -bottom-16 p-4 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest shadow-lg ${admissionStatus.status === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-500 text-white shadow-red-500/30'}`}>
//                                             {admissionStatus.msg}
//                                         </motion.div>
//                                     )}
//                                 </AnimatePresence>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* SLICE INVENTORY (RIGHT) */}
//                 <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm overflow-hidden min-h-[700px]">
//                     <div className="flex justify-between items-center mb-10 px-2">
//                         <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em]">Operational Logic Slices</h2>
//                         <div className="relative">
//                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
//                             <input className="bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:border-blue-500 w-64" 
//                                 placeholder="Filter policies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//                         </div>
//                     </div>

//                     {slices.length === 0 ? (
//                         <div className="flex flex-col items-center justify-center py-32 opacity-30 text-slate-900">
//                             <Shield size={64} strokeWidth={1} className="mb-4" />
//                             <p className="font-black uppercase text-[10px] tracking-widest">No active slices configured</p>
//                         </div>
//                     ) : (
//                         <div className="overflow-x-auto px-2">
//                             <table className="w-full text-left border-separate border-spacing-y-4">
//                                 <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
//                                     <tr>
//                                         <th className="px-6 pb-2">Policy Identity</th>
//                                         <th className="pb-2">Target Mapping</th>
//                                         <th className="pb-2">Requirements</th>
//                                         <th className="pb-2">Status</th>
//                                         <th className="text-right px-6 pb-2">Lifecycle</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {slices.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
//                                         <tr key={s.id} className={`group transition-all ${!s.isActive ? 'opacity-50 grayscale' : ''}`}>
//                                             <td className="bg-slate-50 rounded-l-[1.5rem] px-6 py-6 border-y border-l border-slate-100">
//                                                 <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{s.name}</p>
//                                                 <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Sync: {s.created}</p>
//                                             </td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100">
//                                                 {s.type === 'link' ? (
//                                                      <div className="flex items-center gap-1 bg-purple-50 text-purple-600 border border-purple-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase w-fit">
//                                                         <Zap size={10} fill="currentColor"/> {s.targets[0]?.label} ↔ {s.targets[1]?.label}
//                                                      </div>
//                                                 ) : (
//                                                     <div className="flex flex-wrap gap-1 max-w-[150px]">
//                                                         {s.targets.map(h => (
//                                                             <span key={h.label} className="bg-white border border-slate-200 px-2 py-1 rounded text-[8px] font-black text-blue-600 uppercase shadow-sm">
//                                                                 <MapPin size={8} className="inline mr-1"/> {h.targetSwitch} (P{h.port})
//                                                             </span>
//                                                         ))}
//                                                     </div>
//                                                 )}
//                                             </td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100">
//                                                 <p className="text-[10px] font-black text-slate-700 uppercase italic mb-1">P: {s.priority} | L: {s.latency}</p>
//                                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">{(s.traffic || 'All Traffic').split('(')[0]}</p>
//                                                 {s.qosBandwidth ? (
//                                                     <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter bg-blue-100 border border-blue-200 px-2 py-0.5 rounded w-fit">QoS: {s.qosBandwidth} Kbps</p>
//                                                 ) : (
//                                                     <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter mt-1">Total Block</p>
//                                                 )}
//                                             </td>
//                                             <td className="bg-slate-50 py-6 border-y border-slate-100">
//                                                 <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${!s.isActive ? 'bg-slate-200 text-slate-500 border border-slate-300' : s.status === 'Throttled' ? 'bg-blue-50 text-blue-600 border border-blue-100' : s.type === 'link' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
//                                                     {s.isActive ? s.status : 'Deactivated'}
//                                                 </span>
//                                             </td>
//                                             <td className="bg-slate-50 rounded-r-[1.5rem] px-6 py-6 text-right border-y border-r border-slate-100">
//                                                 <div className="flex gap-2 justify-end">
//                                                     <button onClick={() => handleToggleActive(s)} className={`p-2 rounded-lg border shadow-sm transition-colors ${s.isActive ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`} title={s.isActive ? "Deactivate Slice" : "Activate Slice"}>
//                                                         {s.isActive ? <Pause size={16} /> : <Play size={16} />}
//                                                     </button>
//                                                     <button onClick={() => handleDecommission(s)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-white rounded-lg border border-slate-200 shadow-sm" title="Delete Slice">
//                                                         <Trash2 size={16} />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// 






















import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTopology, getActiveController, getFlows } from './Dependencies/api/controllerManager';
import { getQueueState, getMeter } from './Dependencies/api/apiController';
import {
  Shield, Plus, RefreshCw, Trash2, MapPin, Search,
  Activity, Server, CheckCircle2, AlertCircle, Zap, Link2,
  Brain, Sparkles, Gauge, Timer, Pause, Play, ChevronDown, Pencil, Route,
  ShieldCheck, GitBranch, ChevronUp, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseIntent, resolveHosts, INTENT_PRESETS } from './Dependencies/utils/intentParser';
import { compileIntentWithAI, buildGrounding } from './Dependencies/api/aiIntentService';
import { useSlices, SliceProvider } from './Dependencies/pipeline/SliceContext';
import { PRIORITY_NUM, programSlice, unprogramSlice } from './Dependencies/utils/sliceActions';
import { DSCP_LOW_LATENCY, QUEUE_LOW_LATENCY } from './Dependencies/utils/qosConstants';

const NETWORK_CAP_KBPS = 100000;

// Three real phases of one Gemini compile call — not four decorative ones.
// Step 1 covers real (if fast) work: assembling the grounding payload from
// live hosts/slices/capacity. Step 2 spans however long the actual network
// call takes. Step 3 is the real mapping of the response onto the form.
// Nothing here claims a check that didn't happen.
const COMPILE_STEP_LABELS = {
    1: 'Grounding with live topology…',
    2: 'Compiling via Gemini…',
    3: 'Applying to form…',
};
const COMPILE_STEPS = [
    { step: 1, label: 'Grounding intent with live topology' },
    { step: 2, label: 'Compiling via Gemini' },
    { step: 3, label: 'Applying to form' },
];

// 3GPP-style quick profiles — a named shortcut for a priority/latency/
// bandwidth combination the form already supports unrestricted (verified:
// these three fields have no cross-field coupling in the code). Traffic
// type is set to HTTP rather than left on "All Traffic" on purpose —
// buildTargets() only treats a slice as QoS/forwarding (vs. a flat block)
// when trafficType isn't "All Traffic", so leaving it at the default would
// silently produce a DROP-everything slice instead of a working profile.
const SLICE_PROFILES = [
    { key: 'urllc', label: 'URLLC', sub: 'Critical · low latency', priority: 'Critical', latency: 'Low', bandwidth: '5000', trafficType: 'HTTP (TCP 80)' },
    { key: 'embb', label: 'eMBB', sub: 'High throughput', priority: 'High', latency: 'Medium', bandwidth: '50000', trafficType: 'HTTP (TCP 80)' },
    { key: 'mmtc', label: 'mMTC', sub: 'Many light devices', priority: 'Low', latency: 'High', bandwidth: '500', trafficType: 'HTTP (TCP 80)' },
];

const StatCard = ({ label, val, icon, colorClass }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-800">{val}</p>
        </div>
        <div className={`p-3 rounded-2xl ${colorClass}`}>{icon}</div>
    </div>
);

const ChecklistItem = ({ label, ok }) => (
    <div className="flex items-center gap-2">
        <CheckCircle2 size={14} className={ok ? 'text-emerald-500' : 'text-slate-300'} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${ok ? 'text-slate-600' : 'text-slate-300'}`}>{label}</span>
    </div>
);

const NetworkSlicing = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [topoRaw, setTopoRaw] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedEnforcementId, setExpandedEnforcementId] = useState(null);
    const [enforcementResults, setEnforcementResults] = useState({});
    const [verifyingEnforcementId, setVerifyingEnforcementId] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [intentText, setIntentText] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const { slices, setSlices } = useSlices();

    const [formData, setFormData] = useState({
        name: '',
        isolationMode: 'host', 
        selectedHosts: [],
        selectedLink: '',
        trafficType: 'All Traffic (Drop completely)',
        bandwidth: '',        
        priority: 'Medium',   
        latency: 'Medium'     
    });

    const refreshDiscovery = async () => {
        setLoading(true);
        try {
            const data = await getTopology();
            setTopoRaw(data);
            addToast("Network Map Synchronized", "success");
        } catch (error) {
            addToast("ODL Controller Unreachable", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refreshDiscovery(); }, []);

    const discoveredHosts = useMemo(() => {
        const nodes = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.node || topoRaw?.topology?.[0]?.node || [];
        return nodes.filter(n => n["node-id"]?.startsWith("host:"));
    }, [topoRaw]);

    const discoveredLinks = useMemo(() => {
        const links = topoRaw?.["network-topology:network-topology"]?.topology?.[0]?.link || topoRaw?.topology?.[0]?.link || [];
        const swLinks = links.filter(l =>
            l.source?.["source-node"]?.startsWith("openflow:") &&
            l.destination?.["dest-node"]?.startsWith("openflow:")
        );
        const uniqueLinks = [];
        const seen = new Set();
        swLinks.forEach(l => {
            const src = l.source?.["source-node"];
            const dst = l.destination?.["dest-node"];
            const sig = [src, dst].sort().join("<->");
            if (!seen.has(sig)) { seen.add(sig); uniqueLinks.push(l); }
        });
        return uniqueLinks;
    }, [topoRaw]);

    const allocatedKbps = useMemo(
        () => slices.filter(s => !s.paused).reduce((sum, s) => sum + (Number(s.qosBandwidth) || 0), 0),
        [slices]
    );
    const loadPct = Math.min(100, Math.round((allocatedKbps / NETWORK_CAP_KBPS) * 100));
    const activeSlices = slices.filter(s => !s.paused).length;

    const checklist = [
        { label: 'ODL Controller Online', ok: !!topoRaw },
        { label: 'Topology Discovery', ok: discoveredHosts.length > 0 || discoveredLinks.length > 0 },
        { label: 'Flow Programming', ok: slices.length > 0 },
        { label: 'QoS Enforcement', ok: slices.some(s => s.qosBandwidth) },
        { label: 'Firewall Rules', ok: slices.some(s => s.traffic && !s.traffic.includes('All Traffic')) },
        // Stronger than the above: true only once a real VIEW ENFORCEMENT
        // check (live controller + OVS reads) has actually confirmed a
        // slice's policy on the switch — not just that a slice exists.
        { label: 'Slice Enforcement Verified', ok: Object.values(enforcementResults).some(r => r.status === 'checked' && r.perTarget.every(p => p.verdict === 'verified')) },
    ];

    const addToast = (msg, type) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // Holds the full parsed-intent result (from either source) so the UI can
    // show exactly what was matched and derived — §2's "intent translation"
    // transparency. Real output only; cleared on next parse, never
    // fabricated for display.
    const [lastParsedIntent, setLastParsedIntent] = useState(null);

    // Drives the compile step indicator. Steps 1-2 animate across the real
    // wait for the Gemini call (however long that actually takes); step 3
    // only shows once a real result — from either source — is being applied.
    // Not a fixed fake delay: if Gemini responds in 400ms, this moves fast.
    const [compiling, setCompiling] = useState(false);
    const [compileStep, setCompileStep] = useState(0);

    const applyParsedIntent = (intent, text, source) => {
        if (intent.type === 'NAVIGATE') {
            setLastParsedIntent(null);
            addToast(intent.summary, "success");
            navigate(intent.path);
            return;
        }
        if (intent.type === 'SLICE') {
            const selectedHosts = resolveHosts(intent.hostHints, discoveredHosts);
            setFormData(prev => ({ ...prev, ...intent.payload, selectedHosts }));
            setLastParsedIntent({ raw: text, source, ...intent });
            addToast(intent.summary, "success");
            if (intent.hostHints.length && selectedHosts.length === 0) {
                addToast("Named hosts not in live topology — pick manually", "error");
            }
            return;
        }
        setLastParsedIntent(null);
        addToast(intent.summary, "error");
    };

    const applyIntent = async (text) => {
        if (!text.trim() || compiling) return;
        setCompiling(true);
        setCompileStep(1); // Grounding intent with live topology…

        const remainingCapacityKbps = NETWORK_CAP_KBPS - allocatedKbps;
        const grounding = buildGrounding({ discoveredHosts, slices, remainingCapacityKbps });

        let stepTimer = setTimeout(() => setCompileStep(2), 250); // Compiling via Gemini…
        try {
            const intent = await compileIntentWithAI(text, grounding);
            clearTimeout(stepTimer);
            setCompileStep(3); // Applying to form…
            applyParsedIntent(intent, text, 'gemini');
        } catch (err) {
            clearTimeout(stepTimer);
            setCompileStep(3);
            addToast(`Gemini unavailable (${err.message}) — used offline parser instead`, "error");
            applyParsedIntent(parseIntent(text), text, 'heuristic');
        } finally {
            setTimeout(() => { setCompiling(false); setCompileStep(0); }, 200);
        }
    };

    const [editingSliceId, setEditingSliceId] = useState(null);

    const [pendingIntent, setPendingIntent] = useState(null);
    useEffect(() => {
        const st = location.state;
        if (st?.intentPayload) {
            setPendingIntent({
                payload: st.intentPayload,
                hostHints: st.hostHints || [],
                selectedHosts: st.selectedHosts || null,
                sliceId: st.sliceId ?? null,
            });
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Arriving from the Anomaly Detector's "VIEW SLICE" link — scroll to and
    // briefly highlight the affected slice, same replaceState pattern as the
    // intent-payload effect above so a page refresh doesn't re-trigger it.
    const [focusedSliceId, setFocusedSliceId] = useState(null);
    useEffect(() => {
        const st = location.state;
        if (st?.focusSliceId != null) {
            const id = st.focusSliceId;
            setFocusedSliceId(id);
            window.history.replaceState({}, document.title);
            requestAnimationFrame(() => {
                document.getElementById(`slice-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            const t = setTimeout(() => setFocusedSliceId(null), 4000);
            return () => clearTimeout(t);
        }
    }, [location.state]);

    useEffect(() => {
        if (!pendingIntent || loading) return;
        const selectedHosts = pendingIntent.selectedHosts || resolveHosts(pendingIntent.hostHints, discoveredHosts);
        setFormData(prev => ({ ...prev, ...pendingIntent.payload, selectedHosts }));
        if (pendingIntent.sliceId != null) {
            setEditingSliceId(pendingIntent.sliceId);
            addToast("Editing existing slice — Submit to update", "success");
        } else {
            addToast("Form populated by AI Assistant", "success");
        }
        if (pendingIntent.hostHints.length && selectedHosts.length === 0 && !pendingIntent.selectedHosts) {
            addToast("Named hosts not in live topology — pick manually", "error");
        }
        setPendingIntent(null);
    }, [pendingIntent, loading, discoveredHosts]);

    const cancelEdit = () => {
        setEditingSliceId(null);
        setFormData({ ...formData, name: '', selectedHosts: [], selectedLink: '', bandwidth: '' });
    };

    // Builds the target list (switch/port/meter-id per host or link endpoint) —
    // pure planning, no network calls, so create and update share one path.
    const buildTargets = () => {
        const isQoS = formData.bandwidth && !formData.trafficType.includes("All Traffic");
        const targets = [];

        if (formData.isolationMode === 'host') {
            if (formData.selectedHosts.length === 0) { addToast("Select at least one host", "error"); return null; }

            for (const hostId of formData.selectedHosts) {
                const hostNode = discoveredHosts.find(h => h["node-id"] === hostId);
                const attachment = hostNode?.["host-tracker-service:attachment-points"]?.[0];
                const tpId = attachment?.["tp-id"];

                if (!tpId) {
                    addToast(`Location unknown for ${hostId.split(':').pop()}`, "error");
                    continue;
                }

                const parts = tpId.split(':');
                const targetSwitch = `${parts[0]}:${parts[1]}`;
                const port = parts[2];
                const mId = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;
                targets.push({ targetSwitch, port, label: hostId.split(':').pop(), hostId, meterId: mId });
            }
            if (targets.length === 0) return null;
        } else {
            if (!formData.selectedLink) { addToast("Select a core link to sever", "error"); return null; }
            const linkObj = discoveredLinks.find(l => l["link-id"] === formData.selectedLink);
            if (!linkObj) return null;

            const srcSwitch = linkObj.source["source-node"];
            const srcPort = linkObj.source["source-tp"].split(':').pop();
            const dstSwitch = linkObj.destination["dest-node"];
            const dstPort = linkObj.destination["dest-tp"].split(':').pop();
            const srcMeterId = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;
            const dstMeterId = isQoS ? Math.floor(Math.random() * 9000) + 1 : null;

            targets.push({ targetSwitch: srcSwitch, port: srcPort, label: srcSwitch.split(':').pop(), meterId: srcMeterId });
            targets.push({ targetSwitch: dstSwitch, port: dstPort, label: dstSwitch.split(':').pop(), meterId: dstMeterId });
        }

        return { targets, isQoS };
    };

    const handleProvision = async () => {
        if (!formData.name) return addToast("Provide a Slice Name", "error");
        if (getActiveController() !== 'odl') {
            return addToast("Slice provisioning via ONOS isn't implemented yet — switch to OpenDaylight to create or edit slices", "error");
        }

        try {
            const oldSlice = editingSliceId ? slices.find(s => s.id === editingSliceId) : null;
            const plan = buildTargets();
            if (!plan) return;
            const { targets, isQoS } = plan;

            // Admission control excludes this slice's own current allocation when
            // it's being updated, so re-submitting the same bandwidth isn't double-counted.
            const baseline = oldSlice ? allocatedKbps - (Number(oldSlice.qosBandwidth) || 0) : allocatedKbps;
            if (isQoS) {
                const projected = baseline + Number(formData.bandwidth);
                if (projected > NETWORK_CAP_KBPS) {
                    return addToast(`Admission denied — ${projected.toLocaleString()} > ${NETWORK_CAP_KBPS.toLocaleString()} Kbps cap`, "error");
                }
            }

            const nextSlice = {
                id: editingSliceId ?? Date.now(),
                name: formData.name,
                type: formData.isolationMode,
                targets,
                traffic: formData.trafficType,
                qosBandwidth: isQoS ? formData.bandwidth : null,
                priority: formData.priority,
                latency: formData.latency,
                status: isQoS ? 'Throttled' : (formData.isolationMode === 'link' ? 'Severed' : 'Isolated'),
                paused: false,
                created: oldSlice ? oldSlice.created : new Date().toLocaleTimeString(),
            };

            // Update: tear down the previous flows/meters/queues under this slice id
            // first, so LOW->LOW re-applies cleanly and NORMAL<->LOW switches correctly
            // instead of leaving stale rules behind.
            if (oldSlice) await unprogramSlice(oldSlice);

            const { latencyPolicy } = await programSlice(nextSlice);
            nextSlice.latencyPolicy = latencyPolicy;
            if (latencyPolicy?.status === 'ERROR') {
                addToast(`Latency policy error: ${latencyPolicy.error}`, "error");
            }

            setSlices(oldSlice
                ? slices.map(s => s.id === editingSliceId ? nextSlice : s)
                : [nextSlice, ...slices]);

            setFormData({ ...formData, name: '', selectedHosts: [], selectedLink: '', bandwidth: '' });
            setEditingSliceId(null);
            addToast(oldSlice ? `Updated "${formData.name}"` : `Admission Control accepted "${formData.name}"`, "success");

        } catch (err) {
            addToast("SDN Flow Deployment Failed", "error");
        }
    };

    const togglePause = async (slice) => {
        try {
            if (slice.paused) {
                const { latencyPolicy } = await programSlice(slice);
                if (latencyPolicy?.status === 'ERROR') addToast(`Latency policy error: ${latencyPolicy.error}`, "error");
                addToast(`Resumed "${slice.name}"`, "success");
                setSlices(slices.map(s => s.id === slice.id
                    ? { ...s, paused: false, latencyPolicy, status: s.qosBandwidth ? 'Throttled' : (s.type === 'link' ? 'Severed' : 'Isolated') }
                    : s));
            } else {
                await unprogramSlice(slice);
                addToast(`Paused "${slice.name}"`, "success");
                setSlices(slices.map(s => s.id === slice.id
                    ? { ...s, paused: true, status: 'Paused', latencyPolicy: s.latencyPolicy ? { ...s.latencyPolicy, status: 'NOT_APPLIED' } : s.latencyPolicy }
                    : s));
            }
        } catch (e) {
            addToast("Lifecycle update failed on the switch", "error");
        }
    };

    const handleDecommission = async (slice) => {
        try {
            await unprogramSlice(slice);
            setSlices(slices.filter(s => s.id !== slice.id));
            addToast("Network Merge Complete", "success");
        } catch (e) {
            addToast("Decommission Failed", "error");
        }
    };

    // ── VIEW ENFORCEMENT — real per-target reads, same pattern the Tools
    // page's "Verify Slice" already uses (getQueueState/getMeter), extended
    // here to also confirm the classification flow itself is on the switch
    // via controllerManager.getFlows() — not a green check because a slice
    // merely exists. ────────────────────────────────────────────────────────
    const runVerifyEnforcement = async (slice) => {
        setVerifyingEnforcementId(slice.id);
        try {
            const perTarget = await Promise.all(
                slice.targets.map(async (target) => {
                    const issues = [];

                    // Flow: does the classification rule this slice installed
                    // actually exist on the switch right now?
                    let flowInstalled = false;
                    let flowsSupported = true;
                    try {
                        const flowRes = await getFlows(target.targetSwitch);
                        flowsSupported = flowRes?.supported !== false;
                        flowInstalled = flowsSupported && (flowRes.flows || []).some((f) => f.id === slice.name);
                        if (flowsSupported && !flowInstalled) issues.push('Classification flow not found on switch');
                    } catch (err) {
                        flowsSupported = false;
                        issues.push(`Flow read failed: ${err.message}`);
                    }

                    // QoS: only meaningful for Low-latency slices that actually
                    // carry a bandwidth value (matches wantsLatencyPolicy in
                    // sliceActions.js — nothing to schedule otherwise).
                    let queue = null;
                    if (slice.latency === 'Low' && slice.latencyPolicy) {
                        queue = await getQueueState(target.targetSwitch, target.port);
                        if (queue.status !== 'ACTIVE') issues.push('Queue not configured on switch');
                        else if (String(queue.sliceId) !== String(slice.id)) issues.push('Queue belongs to a different slice');
                        else if (queue.dscp !== slice.latencyPolicy.dscp || queue.queue !== slice.latencyPolicy.queue) issues.push('DSCP/queue differs from expected');
                    }

                    // Meter: bandwidth cap, when this target has one.
                    let meter = null;
                    if (target.meterId) {
                        meter = await getMeter(target.targetSwitch, target.meterId);
                        if (meter.status !== 'ACTIVE') issues.push('Meter not installed on switch');
                        else if (slice.qosBandwidth && Number(meter.rateKbps) !== Number(slice.qosBandwidth)) issues.push(`Meter rate ${meter.rateKbps}Kbps ≠ expected ${slice.qosBandwidth}Kbps`);
                    }

                    return { target, flowInstalled, flowsSupported, queue, meter, verdict: issues.length === 0 ? 'verified' : 'mismatch', issues };
                })
            );
            setEnforcementResults((prev) => ({ ...prev, [slice.id]: { status: 'checked', perTarget, checkedAt: new Date().toLocaleTimeString() } }));
        } catch (err) {
            setEnforcementResults((prev) => ({ ...prev, [slice.id]: { status: 'error', reason: err.message } }));
        } finally {
            setVerifyingEnforcementId(null);
        }
    };

    const toggleEnforcement = (slice) => {
        const opening = expandedEnforcementId !== slice.id;
        setExpandedEnforcementId(opening ? slice.id : null);
        if (opening) runVerifyEnforcement(slice);
    };

    const filteredSlices = slices.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">

            <div className="fixed top-24 right-8 z-[100] space-y-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
                            className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl border pointer-events-auto ${t.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
                            {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span className="font-black uppercase text-[10px] tracking-widest">{t.msg}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-600"><Brain size={28} /></div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">
                            Intent-Based <span className="text-blue-600">Slicing Orchestrator</span>
                        </h1>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3 ml-1">Logical Infrastructure Control</p>
                    </div>
                </div>
                <button onClick={refreshDiscovery} className="bg-white border-2 border-slate-200 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase flex items-center gap-3 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 shadow-sm">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Discovery
                </button>
            </div>

            <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm px-8 py-5 mb-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                    <Server size={16} className="text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Environment Checklist</span>
                </div>
                {checklist.map(c => <ChecklistItem key={c.label} label={c.label} ok={c.ok} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-10">
                <div className="lg:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Gauge size={12} /> Global Network Load</p>
                        <p className="text-lg font-black text-slate-800">{loadPct}%</p>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                            initial={{ width: 0 }} animate={{ width: `${loadPct}%` }} transition={{ duration: 0.6 }} />
                    </div>
                    <p className="text-right text-[10px] font-bold text-slate-400 mt-2">
                        <span className="text-slate-700 font-black">{allocatedKbps.toLocaleString()}</span> / {NETWORK_CAP_KBPS.toLocaleString()} Kbps Allocated
                    </p>
                </div>
                <div className="lg:col-span-1"><StatCard label="Total Slices" val={slices.length} icon={<Shield size={20} className="text-purple-500" />} colorClass="bg-purple-50" /></div>
                <div className="lg:col-span-1"><StatCard label="Active Slices" val={activeSlices} icon={<Activity size={20} className="text-blue-500" />} colorClass="bg-blue-50" /></div>
                <div className="lg:col-span-1"><StatCard label="Live Hosts" val={discoveredHosts.length} icon={<Server size={20} className={discoveredHosts.length ? "text-emerald-500" : "text-slate-400"} />} colorClass={discoveredHosts.length ? "bg-emerald-50" : "bg-slate-100"} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                <div className="lg:col-span-4 space-y-0">
                    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <h2 className="font-black uppercase text-[12px] tracking-[0.2em] mb-6 flex items-center gap-3 text-blue-400 relative z-10">
                            <Sparkles size={18} fill="currentColor" /> Intent Engine
                        </h2>
                        <textarea
                            value={intentText}
                            onChange={e => setIntentText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); applyIntent(intentText); } }}
                            rows={3}
                            placeholder="e.g. Isolate host 1 for HTTP critical hospital traffic with 20000 Kbps..."
                            className="w-full bg-slate-800/70 border-2 border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-blue-500 transition-all text-blue-50 placeholder:text-slate-500 resize-none relative z-10"
                        />
                        <div className="flex gap-2 my-4 relative z-10">
                            <button onClick={() => setIntentText(INTENT_PRESETS.hospital)}
                                className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:border-blue-500 transition-all">
                                Hospital Traffic
                            </button>
                            <button onClick={() => setIntentText(INTENT_PRESETS.guest)}
                                className="px-4 py-2 rounded-xl bg-slate-800 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:border-blue-500 transition-all">
                                Guest Network
                            </button>
                        </div>
                        <button onClick={() => applyIntent(intentText)} disabled={compiling}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-black uppercase py-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 group relative z-10 text-[11px] tracking-widest">
                            {compiling
                                ? <><Loader2 size={16} className="animate-spin" /> {COMPILE_STEP_LABELS[compileStep] || "Compiling…"}</>
                                : <><Sparkles size={16} className="group-hover:rotate-12 transition-transform" /> Parse &amp; Auto-Fill Form</>}
                        </button>

                        <AnimatePresence>
                            {compiling && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden relative z-10">
                                    <div className="mt-4 space-y-2">
                                        {COMPILE_STEPS.map(({ step, label }) => (
                                            <div key={step} className={`flex items-center gap-3 text-[11px] font-bold transition-colors ${compileStep > step ? "text-emerald-400" : compileStep === step ? "text-blue-300" : "text-slate-600"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${compileStep > step ? "bg-emerald-400" : compileStep === step ? "bg-blue-400 animate-pulse" : "bg-slate-700"}`} />
                                                {label}…
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Intent Translation — shows exactly what actually parsed this
                            input, and which engine did it. Every value below comes
                            straight from that source's real return, nothing re-derived
                            or invented for display. */}
                        {lastParsedIntent && (
                            <div className="mt-5 pt-5 border-t border-white/10 relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">User Intent</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${lastParsedIntent.source === 'gemini' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                                        {lastParsedIntent.source === 'gemini' ? 'Compiled via Gemini' : 'Compiled via Offline Heuristic'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-mono italic leading-relaxed -mt-2">"{lastParsedIntent.raw}"</p>
                                {lastParsedIntent.source === 'gemini' ? (
                                    lastParsedIntent.rationale && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">AI Rationale</p>
                                            <p className="text-[11px] text-slate-300 leading-relaxed">{lastParsedIntent.rationale}</p>
                                        </div>
                                    )
                                ) : lastParsedIntent.matchedKeywords?.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Matched Keywords</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {lastParsedIntent.matchedKeywords.map((k, i) => (
                                                <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-300">{k}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">Compiled Policy</p>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                                        <div><dt className="inline text-slate-500">Priority: </dt><dd className="inline font-bold text-white">{lastParsedIntent.payload.priority}</dd></div>
                                        <div><dt className="inline text-slate-500">Latency: </dt><dd className="inline font-bold text-white">{lastParsedIntent.payload.latency}</dd></div>
                                        <div><dt className="inline text-slate-500">Protocol: </dt><dd className="inline font-bold text-white">{lastParsedIntent.payload.trafficType.split(' (')[0]}</dd></div>
                                        <div><dt className="inline text-slate-500">Bandwidth: </dt><dd className="inline font-bold text-white">{lastParsedIntent.payload.bandwidth ? `${lastParsedIntent.payload.bandwidth} Kbps` : 'Not specified'}</dd></div>
                                        <div className="col-span-2">
                                            <dt className="inline text-slate-500">DSCP / Queue: </dt>
                                            <dd className="inline font-bold">
                                                {lastParsedIntent.payload.latency === 'Low'
                                                    ? (lastParsedIntent.payload.bandwidth
                                                        ? <span className="text-emerald-400">{DSCP_LOW_LATENCY} / Priority Queue {QUEUE_LOW_LATENCY} — will be enforced on submit</span>
                                                        : <span className="text-amber-400">Not applied — Low latency needs a bandwidth value too (nothing to schedule otherwise)</span>)
                                                    : <span className="text-slate-400">Not applicable — latency isn't Low</span>}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                                <p className="text-[9px] text-slate-500 leading-relaxed">
                                    Hosts: {lastParsedIntent.hostHints?.length ? lastParsedIntent.hostHints.join(', ') : 'none named — pick manually below'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center py-3">
                        <div className="w-9 h-9 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm text-blue-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <h2 className="font-black uppercase text-[12px] tracking-[0.2em] mb-8 flex items-center gap-3 text-slate-800">
                            <Zap size={18} className="text-blue-500" fill="currentColor" /> Policy Configuration
                        </h2>

                        <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                <button onClick={() => setFormData({ ...formData, isolationMode: 'host', selectedLink: '' })}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'host' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                                    Host Isolation
                                </button>
                                <button onClick={() => setFormData({ ...formData, isolationMode: 'link', selectedHosts: [] })}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.isolationMode === 'link' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                                    Link Isolation
                                </button>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">Slice Name</label>
                                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-blue-500 transition-all text-slate-800"
                                    placeholder="e.g. Hospital-Quarantine" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <AnimatePresence mode="wait">
                                {formData.isolationMode === 'host' ? (
                                    <motion.div key="host" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">Target Laptops (Multi-Select)</label>
                                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-3 max-h-56 overflow-y-auto space-y-2">
                                            {discoveredHosts.length === 0 && (
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No hosts discovered</p>
                                            )}
                                            {discoveredHosts.map(h => {
                                                const isSelected = formData.selectedHosts.includes(h["node-id"]);
                                                return (
                                                    <div key={h["node-id"]} onClick={() => setFormData({ ...formData, selectedHosts: isSelected ? formData.selectedHosts.filter(id => id !== h["node-id"]) : [...formData.selectedHosts, h["node-id"]] })}
                                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 hover:border-blue-300 text-slate-700'}`}>
                                                        <span className="font-mono text-[10px] font-bold uppercase">{h["node-id"].split(':').pop()}</span>
                                                        {isSelected ? <CheckCircle2 size={14} /> : <div className="w-3 h-3 rounded-full border border-slate-300"></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div key="link" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">Infrastructure Link</label>
                                        <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold appearance-none cursor-pointer text-slate-800"
                                            value={formData.selectedLink} onChange={e => setFormData({ ...formData, selectedLink: e.target.value })}>
                                            <option value="">Select Link to Sever...</option>
                                            {discoveredLinks.map(l => {
                                                const s = l.source?.["source-node"].split(':').pop();
                                                const d = l.destination?.["dest-node"].split(':').pop();
                                                return <option key={l["link-id"]} value={l["link-id"]}>Switch {s} ↔ Switch {d}</option>;
                                            })}
                                        </select>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">3GPP Profile (optional)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SLICE_PROFILES.map(p => (
                                        <button key={p.key} type="button"
                                            onClick={() => setFormData({ ...formData, priority: p.priority, latency: p.latency, bandwidth: p.bandwidth, trafficType: p.trafficType })}
                                            title={p.sub}
                                            className="flex flex-col items-center justify-center gap-0.5 bg-slate-50 hover:bg-blue-50 border-2 border-slate-100 hover:border-blue-300 rounded-2xl px-2 py-3 transition-all">
                                            <span className="text-[11px] font-black uppercase text-slate-700">{p.label}</span>
                                            <span className="text-[8px] font-bold text-slate-400 text-center leading-tight">{p.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">Priority Level</label>
                                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold appearance-none cursor-pointer text-slate-800"
                                        value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1 flex items-center gap-1"><Timer size={10} /> Latency Req.</label>
                                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold appearance-none cursor-pointer text-slate-800"
                                        value={formData.latency} onChange={e => setFormData({ ...formData, latency: e.target.value })}>
                                        <option>Low</option><option>Medium</option><option>High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">Traffic Firewall</label>
                                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-[10px] font-bold appearance-none cursor-pointer text-slate-800"
                                        value={formData.trafficType} onChange={e => setFormData({ ...formData, trafficType: e.target.value })}>
                                        <option>All Traffic (Drop completely)</option>
                                        <option>HTTP (TCP 80)</option>
                                        <option>HTTPS (TCP 443)</option>
                                        <option>SSH (TCP 22)</option>
                                        <option>DNS (UDP 53)</option>
                                        <option>ICMP (Ping)</option>
                                    </select>
                                </div>
                                <div className={`transition-opacity ${formData.trafficType.includes("All Traffic") ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-1">QoS Rate Limit</label>
                                    <div className="relative">
                                        <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-4 pr-12 py-3.5 text-xs font-bold outline-none focus:border-blue-500 text-slate-800"
                                            placeholder="None" value={formData.bandwidth} onChange={e => setFormData({ ...formData, bandwidth: e.target.value })} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Kbps</span>
                                    </div>
                                </div>
                            </div>

                            {editingSliceId && (
                                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
                                    <span className="text-[10px] font-black uppercase text-amber-700">Editing existing slice</span>
                                    <button onClick={cancelEdit} className="text-[10px] font-black uppercase text-amber-700 underline">Cancel</button>
                                </div>
                            )}

                            <button onClick={handleProvision} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase py-5 rounded-[1.5rem] shadow-2xl transition-all flex items-center justify-center gap-3 group text-[11px] tracking-widest">
                                <Plus size={18} strokeWidth={4} className="group-hover:rotate-90 transition-transform" /> {editingSliceId ? 'Update Slice' : 'Submit to Admission Control'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm overflow-hidden min-h-[700px]">
                    <div className="flex justify-between items-center mb-10 px-2">
                        <h2 className="font-black uppercase text-slate-900 text-[11px] tracking-[0.2em]">Operational Logic Slices</h2>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input className="bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:border-blue-500 w-64"
                                placeholder="Filter policies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    {filteredSlices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-20 text-slate-900">
                            <Shield size={64} strokeWidth={1} className="mb-4" />
                            <p className="font-black uppercase text-[10px] tracking-widest">No active slices configured</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto px-2">
                            <table className="w-full text-left border-separate border-spacing-y-4">
                                <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="px-6 pb-2">Policy Identity</th>
                                        <th className="pb-2">Target Mapping</th>
                                        <th className="pb-2">Requirements</th>
                                        <th className="pb-2">Status</th>
                                        <th className="text-right px-6 pb-2">Lifecycle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSlices.map(s => (
                                    <React.Fragment key={s.id}>
                                        <tr id={`slice-row-${s.id}`} className={`group transition-all ${s.paused ? 'opacity-50' : ''} ${focusedSliceId === s.id ? 'ring-2 ring-offset-2 ring-red-400 rounded-2xl' : ''}`}>
                                            <td className="bg-slate-50 rounded-l-[1.5rem] px-6 py-6 border-y border-l border-slate-100">
                                                <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{s.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Sync: {s.created}</p>
                                            </td>
                                            <td className="bg-slate-50 py-6 border-y border-slate-100">
                                                {s.type === 'link' ? (
                                                     <div className="flex items-center gap-1 bg-purple-50 text-purple-600 border border-purple-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase w-fit">
                                                        <Zap size={10} fill="currentColor"/> {s.targets[0]?.label} ↔ {s.targets[1]?.label}
                                                     </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {s.targets.map(h => (
                                                            <span key={h.label} className={`flex items-center gap-1 border px-3 py-1.5 rounded-lg text-[9px] font-black uppercase w-fit ${h.quarantined ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                <Zap size={10} fill="currentColor"/> {h.targetSwitch?.split(':').pop()} → P{h.port}
                                                                {h.quarantined && <span className="ml-1">⚠ QUARANTINED</span>}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="bg-slate-50 py-6 border-y border-slate-100">
                                                <p className="text-[9px] font-black text-slate-700 uppercase italic">P: {(s.priority || 'Medium')} | L: {(s.latency || 'Medium')}</p>
                                                <p className="text-[10px] font-black text-slate-500 uppercase mt-1">{(s.traffic || 'All Traffic').split('(')[0]}</p>
                                                {s.qosBandwidth ? (
                                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mt-1 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded w-fit" title="QoS: traffic is allowed through, treated with a bandwidth/priority policy">QoS: {s.qosBandwidth} Kbps</p>
                                                ) : (
                                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter mt-1 bg-red-50 border border-red-100 px-2 py-0.5 rounded w-fit" title="Isolation: traffic is filtered/separated, not merely rate-limited">Isolation: Total Block</p>
                                                )}
                                                {s.latency === 'Low' && (
                                                    <p className={`text-[9px] font-black uppercase tracking-tighter mt-1 px-2 py-0.5 rounded w-fit border ${
                                                        s.latencyPolicy?.status === 'ACTIVE' ? 'bg-emerald-100 border-emerald-200 text-emerald-600'
                                                        : s.latencyPolicy?.status === 'ERROR' ? 'bg-red-100 border-red-200 text-red-600'
                                                        : 'bg-slate-100 border-slate-200 text-slate-500'
                                                    }`} title={s.latencyPolicy?.error || ''}>
                                                        DSCP {s.latencyPolicy?.dscp ?? '46'} · Q{s.latencyPolicy?.queue ?? '0'} · {s.latencyPolicy?.status || 'NOT_APPLIED'}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="bg-slate-50 py-6 border-y border-slate-100">
                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${s.paused ? 'bg-amber-50 text-amber-600 border border-amber-100' : s.status === 'Throttled' ? 'bg-blue-50 text-blue-600 border border-blue-100' : s.type === 'link' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="bg-slate-50 rounded-r-[1.5rem] px-6 py-6 text-right border-y border-r border-slate-100">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleEnforcement(s)}
                                                        title="View Enforcement"
                                                        className={`transition-colors p-2 rounded-lg border shadow-sm ${expandedEnforcementId === s.id ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'}`}>
                                                        {expandedEnforcementId === s.id ? <ChevronUp size={16} /> : <ShieldCheck size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => navigate('/flows', { state: { filterFlowName: s.name, filterLabel: s.name } })}
                                                        title="View Flows"
                                                        className="text-indigo-400 hover:text-indigo-600 transition-colors p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        <GitBranch size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const ids = s.type === 'link'
                                                                ? s.targets.map(t => t.targetSwitch).filter(Boolean)
                                                                : s.targets.map(t => t.hostId).filter(Boolean);
                                                            navigate('/path-trace', { state: { sliceId: s.id, sourceId: ids[0] || '', destId: ids[1] || '' } });
                                                        }}
                                                        title="Trace Path"
                                                        className="text-emerald-400 hover:text-emerald-600 transition-colors p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        <Route size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingSliceId(s.id);
                                                            setFormData({
                                                                name: s.name,
                                                                isolationMode: s.type,
                                                                selectedHosts: s.type === 'host' ? s.targets.map(t => t.hostId).filter(Boolean) : [],
                                                                selectedLink: '',
                                                                trafficType: s.traffic,
                                                                bandwidth: s.qosBandwidth || '',
                                                                priority: s.priority,
                                                                latency: s.latency,
                                                            });
                                                            addToast("Editing existing slice — Submit to update", "success");
                                                        }}
                                                        title="Edit"
                                                        className="text-blue-400 hover:text-blue-600 transition-colors p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => togglePause(s)} title={s.paused ? 'Resume' : 'Pause'}
                                                        className="text-amber-400 hover:text-amber-600 transition-colors p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                        {s.paused ? <Play size={16} /> : <Pause size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirmDeleteId === s.id) { handleDecommission(s); setConfirmDeleteId(null); }
                                                            else { setConfirmDeleteId(s.id); setTimeout(() => setConfirmDeleteId(cur => (cur === s.id ? null : cur)), 3000); }
                                                        }}
                                                        title={confirmDeleteId === s.id ? 'Click again to confirm' : 'Decommission'}
                                                        className={`transition-colors p-2 rounded-lg border shadow-sm ${confirmDeleteId === s.id ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-300 hover:text-red-500'}`}>
                                                        {confirmDeleteId === s.id ? <span className="text-[9px] font-black uppercase px-1">Sure?</span> : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedEnforcementId === s.id && (
                                            <tr>
                                                <td colSpan={5} className="px-2 pb-4">
                                                    <div className="bg-[#0f172a] rounded-[2rem] p-6 text-white">
                                                        {verifyingEnforcementId === s.id ? (
                                                            <p className="text-xs text-slate-400 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Verifying against live controller/OVS state…</p>
                                                        ) : !enforcementResults[s.id] ? (
                                                            <p className="text-xs text-slate-400">Not yet checked.</p>
                                                        ) : enforcementResults[s.id].status === 'error' ? (
                                                            <p className="text-xs text-red-400">Verification failed: {enforcementResults[s.id].reason}</p>
                                                        ) : (() => {
                                                            const result = enforcementResults[s.id];
                                                            const allVerified = result.perTarget.every((p) => p.verdict === 'verified');
                                                            return (
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enforcement — checked {result.checkedAt}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${allVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                                                                {allVerified ? '🟢 ENFORCED' : '🟠 NOT FULLY VERIFIED'}
                                                                            </span>
                                                                            <button onClick={() => runVerifyEnforcement(s)} className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300">Re-check</button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {result.perTarget.map(({ target, flowInstalled, flowsSupported, queue, meter, verdict, issues }) => (
                                                                            <div key={target.label + target.targetSwitch} className={`rounded-2xl border p-4 ${verdict === 'verified' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/5'}`}>
                                                                                <p className="text-xs font-bold mb-2 text-white">{target.targetSwitch} · Port {target.port}{target.hostId ? ` — ${target.label}` : ''}</p>

                                                                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1 mt-3">OpenFlow Enforcement</p>
                                                                                <p className="text-[11px] text-slate-300">
                                                                                    {!flowsSupported ? '❔ Classification Rule — Not Verifiable (controller doesn\'t expose flow reads)' : flowInstalled ? '✓ Classification Rule Installed' : '✕ Classification Rule Not Found'}
                                                                                </p>

                                                                                {s.latency === 'Low' && s.latencyPolicy && (
                                                                                    <>
                                                                                        <p className="text-[9px] font-black uppercase text-slate-500 mb-1 mt-3">QoS Enforcement</p>
                                                                                        <p className="text-[11px] text-slate-300">{queue?.status === 'ACTIVE' ? `✓ DSCP ${queue.dscp} · Queue ${queue.queue}` : '✕ Queue Not Configured'}</p>
                                                                                    </>
                                                                                )}
                                                                                {meter && (
                                                                                    <p className="text-[11px] text-slate-300">{meter.status === 'ACTIVE' ? `✓ Bandwidth Enforcement — ${meter.rateKbps} Kbps` : '✕ Meter Not Installed'}</p>
                                                                                )}

                                                                                {issues.length > 0 && (
                                                                                    <p className="text-[10px] text-amber-400 mt-2 italic">{issues.join(' · ')}</p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px]">
                                                                        <span className="text-slate-500 uppercase font-black">Controller</span>
                                                                        <span className="font-bold">{getActiveController() === 'odl' ? 'OpenDaylight' : 'ONOS'} <span className={topoRaw ? 'text-emerald-400' : 'text-red-400'}>● {topoRaw ? 'CONNECTED' : 'UNAVAILABLE'}</span></span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default function OdlSlicingWrapped(props) {
  return (
    <SliceProvider>
      <NetworkSlicing {...props} />
    </SliceProvider>
  );
}
