// // // // // // import React, { useEffect, useState } from "react";
// // // // // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // // // // import { mapNodeDetails } from "../mappers/node-details-mapper";

// // // // // // function Flows() {
// // // // // //   const [flows, setFlows] = useState([]);
// // // // // //   const [editingFlow, setEditingFlow] = useState(null);
// // // // // //   const [editPriority, setEditPriority] = useState("");
// // // // // //   const [showAll, setShowAll] = useState(false);
// // // // // //   const MAX_VISIBLE = 5;

// // // // // //   useEffect(() => {
// // // // // //     fetchFlows();
// // // // // //   }, []);

// // // // // //   const fetchFlows = async () => {
// // // // // //     try {
// // // // // //       const response = await getNodes();
// // // // // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // // // // //       const parsedNodes = nodes.map((node) =>
// // // // // //         mapNodeDetails({ "opendaylight-inventory:node": [node] })
// // // // // //       );

// // // // // //       const extractedFlows = parsedNodes.flatMap((node) =>
// // // // // //         node.flowTables.flatMap((table) =>
// // // // // //           table.flows.map((flow) => ({
// // // // // //             id: flow.id,
// // // // // //             node: node.id,
// // // // // //             tableId: table.id,
// // // // // //             priority: flow.priority,
// // // // // //             actions: flow.instructions?.instruction || [],
// // // // // //           }))
// // // // // //         )
// // // // // //       );

// // // // // //       setFlows(extractedFlows);
// // // // // //     } catch (err) {
// // // // // //       console.error("❌ Flow fetch failed", err);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleDelete = async (flowId) => {
// // // // // //     const flowToDelete = flows.find((f) => f.id === flowId);
// // // // // //     if (!flowToDelete) return;

// // // // // //     try {
// // // // // //       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
// // // // // //       setFlows(flows.filter((f) => f.id !== flowId));
// // // // // //     } catch (err) {
// // // // // //       console.error("❌ Failed to delete flow", err);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleEdit = (flowId) => {
// // // // // //     const flow = flows.find((f) => f.id === flowId);
// // // // // //     setEditingFlow(flow);
// // // // // //     setEditPriority(flow.priority);
// // // // // //   };

// // // // // //   const handleUpdate = async () => {
// // // // // //     try {
// // // // // //       const updatedFlow = {
// // // // // //         ...editingFlow,
// // // // // //         priority: editPriority,
// // // // // //       };

// // // // // //       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
// // // // // //       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
// // // // // //       setEditingFlow(null);
// // // // // //     } catch (err) {
// // // // // //       console.error("❌ Failed to update flow", err);
// // // // // //     }
// // // // // //   };

// // // // // //   return (
// // // // // //     <div className="p-4 sm:p-8">
// // // // // //       <h1 className="text-xl sm:text-2xl font-bold mb-4">All Flows</h1>
      
// // // // // //       <div className="overflow-x-auto">
// // // // // //         <table className="min-w-full border bg-white shadow rounded text-sm sm:text-base">
// // // // // //           <thead className="bg-gray-100 text-left">
// // // // // //             <tr>
// // // // // //               <th className="p-2">Flow ID</th>
// // // // // //               <th className="p-2">Device</th>
// // // // // //               <th className="p-2">Table</th>
// // // // // //               <th className="p-2">Priority</th>
// // // // // //               <th className="p-2">Actions</th>
// // // // // //             </tr>
// // // // // //           </thead>
// // // // // //           <tbody>
// // // // // //             {(showAll ? flows : flows.slice(0, MAX_VISIBLE)).map((flow, index) => (
// // // // // //   <tr key={index} className="border-t">
// // // // // //     <td className="p-2">{flow.id}</td>
// // // // // //     <td className="p-2">{flow.node}</td>
// // // // // //     <td className="p-2">{flow.tableId}</td>
// // // // // //     <td className="p-2">{flow.priority}</td>
// // // // // //     <td className="p-2 flex flex-wrap gap-2">
// // // // // //       <button
// // // // // //         onClick={() => handleEdit(flow.id)}
// // // // // //         className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
// // // // // //       >
// // // // // //         Edit
// // // // // //       </button>
// // // // // //       <button
// // // // // //         onClick={() => handleDelete(flow.id)}
// // // // // //         className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
// // // // // //       >
// // // // // //         Delete
// // // // // //       </button>
// // // // // //     </td>
// // // // // //   </tr>
// // // // // // ))}

// // // // // //           </tbody>
// // // // // //         </table>
// // // // // //         {flows.length > MAX_VISIBLE && (
// // // // // //         <div className="mt-4 text-center">
// // // // // //           <button
// // // // // //             onClick={() => setShowAll(!showAll)}
// // // // // //             className="text-blue-600 hover:underline"
// // // // // //           >
// // // // // //             {showAll ? "Show Less" : "Show More"}
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       )}

// // // // // //       </div>

// // // // // //       {editingFlow && (
// // // // // //         <div className="mt-6 p-4 border rounded shadow bg-gray-50 max-w-xl mx-auto">
// // // // // //           <h2 className="text-lg font-semibold mb-2">Edit Flow: {editingFlow.id}</h2>
// // // // // //           <label className="block mb-4">
// // // // // //             <span className="mr-2">Priority:</span>
// // // // // //             <input
// // // // // //               type="number"
// // // // // //               className="border rounded p-2 w-full sm:w-40"
// // // // // //               value={editPriority}
// // // // // //               onChange={(e) => setEditPriority(e.target.value)}
// // // // // //             />
// // // // // //           </label>
// // // // // //           <div className="flex flex-wrap gap-3">
// // // // // //             <button
// // // // // //               onClick={handleUpdate}
// // // // // //               className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
// // // // // //             >
// // // // // //               Save
// // // // // //             </button>
// // // // // //             <button
// // // // // //               onClick={() => setEditingFlow(null)}
// // // // // //               className="bg-gray-500 hover:bg-gray-500 text-white px-4 py-2 rounded"
// // // // // //             >
// // // // // //               Cancel
// // // // // //             </button>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       )}
// // // // // //     </div>
// // // // // //   );
// // // // // // }

// // // // // // export default Flows;

// // // // // import React, { useEffect, useState } from "react";
// // // // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // // // import { mapNodeDetails } from "../mappers/node-details-mapper";

// // // // // function Flows() {
// // // // //   const [flows, setFlows] = useState([]);
// // // // //   const [editingFlow, setEditingFlow] = useState(null);
// // // // //   const [editPriority, setEditPriority] = useState("");
// // // // //   const [showAll, setShowAll] = useState(false);
// // // // //   const MAX_VISIBLE = 5;

// // // // //   useEffect(() => {
// // // // //     fetchFlows();
// // // // //   }, []);

// // // // //   const fetchFlows = async () => {
// // // // //     const controller = localStorage.getItem("active_sdn_controller") || "odl";

// // // // //     // --- ONOS ADAPTER PATHWAY ---
// // // // //     if (controller === "onos") {
// // // // //       try {
// // // // //         const response = await fetch("/api/onos/v1/flows", {
// // // // //           headers: { Authorization: "Basic " + btoa("onos:rocks") }
// // // // //         });
// // // // //         const data = await response.json();
// // // // //         const extractedFlows = (data.flows || []).map((flow) => ({
// // // // //           id: flow.id,
// // // // //           node: flow.deviceId,
// // // // //           tableId: flow.tableId || 0,
// // // // //           priority: flow.priority,
// // // // //           actions: flow.treatment?.instructions || [],
// // // // //         }));
// // // // //         setFlows(extractedFlows);
// // // // //         return;
// // // // //       } catch (err) {
// // // // //         console.error("❌ ONOS Flow fetch failed", err);
// // // // //         return;
// // // // //       }
// // // // //     }

// // // // //     // --- DEFAULT ODL PATHWAY (No changes to your friends' work) ---
// // // // //     try {
// // // // //       const response = await getNodes();
// // // // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // // // //       const parsedNodes = nodes.map((node) =>
// // // // //         mapNodeDetails({ "opendaylight-inventory:node": [node] })
// // // // //       );

// // // // //       const extractedFlows = parsedNodes.flatMap((node) =>
// // // // //         node.flowTables.flatMap((table) =>
// // // // //           table.flows.map((flow) => ({
// // // // //             id: flow.id,
// // // // //             node: node.id,
// // // // //             tableId: table.id,
// // // // //             priority: flow.priority,
// // // // //             actions: flow.instructions?.instruction || [],
// // // // //           }))
// // // // //         )
// // // // //       );

// // // // //       setFlows(extractedFlows);
// // // // //     } catch (err) {
// // // // //       console.error("❌ ODL Flow fetch failed", err);
// // // // //     }
// // // // //   };

// // // // //   const handleDelete = async (flowId) => {
// // // // //     const flowToDelete = flows.find((f) => f.id === flowId);
// // // // //     if (!flowToDelete) return;

// // // // //     try {
// // // // //       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
// // // // //       setFlows(flows.filter((f) => f.id !== flowId));
// // // // //     } catch (err) {
// // // // //       console.error("❌ Failed to delete flow", err);
// // // // //     }
// // // // //   };

// // // // //   const handleEdit = (flowId) => {
// // // // //     const flow = flows.find((f) => f.id === flowId);
// // // // //     setEditingFlow(flow);
// // // // //     setEditPriority(flow.priority);
// // // // //   };

// // // // //   const handleUpdate = async () => {
// // // // //     try {
// // // // //       const updatedFlow = {
// // // // //         ...editingFlow,
// // // // //         priority: editPriority,
// // // // //       };

// // // // //       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
// // // // //       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
// // // // //       setEditingFlow(null);
// // // // //     } catch (err) {
// // // // //       console.error("❌ Failed to update flow", err);
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <div className="p-4 sm:p-8">
// // // // //       <h1 className="text-xl sm:text-2xl font-bold mb-4">All Flows</h1>
      
// // // // //       <div className="overflow-x-auto">
// // // // //         <table className="min-w-full border bg-white shadow rounded text-sm sm:text-base">
// // // // //           <thead className="bg-gray-100 text-left">
// // // // //             <tr>
// // // // //               <th className="p-2">Flow ID</th>
// // // // //               <th className="p-2">Device</th>
// // // // //               <th className="p-2">Table</th>
// // // // //               <th className="p-2">Priority</th>
// // // // //               <th className="p-2">Actions</th>
// // // // //             </tr>
// // // // //           </thead>
// // // // //           <tbody>
// // // // //             {(showAll ? flows : flows.slice(0, MAX_VISIBLE)).map((flow, index) => (
// // // // //               <tr key={index} className="border-t">
// // // // //                 <td className="p-2">{flow.id}</td>
// // // // //                 <td className="p-2">{flow.node}</td>
// // // // //                 <td className="p-2">{flow.tableId}</td>
// // // // //                 <td className="p-2">{flow.priority}</td>
// // // // //                 <td className="p-2 flex flex-wrap gap-2">
// // // // //                   <button
// // // // //                     onClick={() => handleEdit(flow.id)}
// // // // //                     className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
// // // // //                   >
// // // // //                     Edit
// // // // //                   </button>
// // // // //                   <button
// // // // //                     onClick={() => handleDelete(flow.id)}
// // // // //                     className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
// // // // //                   >
// // // // //                     Delete
// // // // //                   </button>
// // // // //                 </td>
// // // // //               </tr>
// // // // //             ))}
// // // // //           </tbody>
// // // // //         </table>
// // // // //         {flows.length > MAX_VISIBLE && (
// // // // //           <div className="mt-4 text-center">
// // // // //             <button
// // // // //               onClick={() => setShowAll(!showAll)}
// // // // //               className="text-blue-600 hover:underline"
// // // // //             >
// // // // //               {showAll ? "Show Less" : "Show More"}
// // // // //             </button>
// // // // //           </div>
// // // // //         )}
// // // // //       </div>

// // // // //       {editingFlow && (
// // // // //         <div className="mt-6 p-4 border rounded shadow bg-gray-50 max-w-xl mx-auto">
// // // // //           <h2 className="text-lg font-semibold mb-2">Edit Flow: {editingFlow.id}</h2>
// // // // //           <label className="block mb-4">
// // // // //             <span className="mr-2">Priority:</span>
// // // // //             <input
// // // // //               type="number"
// // // // //               className="border rounded p-2 w-full sm:w-40"
// // // // //               value={editPriority}
// // // // //               onChange={(e) => setEditPriority(e.target.value)}
// // // // //             />
// // // // //           </label>
// // // // //           <div className="flex flex-wrap gap-3">
// // // // //             <button
// // // // //               onClick={handleUpdate}
// // // // //               className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
// // // // //             >
// // // // //               Save
// // // // //             </button>
// // // // //             <button
// // // // //               onClick={() => setEditingFlow(null)}
// // // // //               className="bg-gray-500 hover:bg-gray-500 text-white px-4 py-2 rounded"
// // // // //             >
// // // // //               Cancel
// // // // //             </button>
// // // // //           </div>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // export default Flows;


// // // // import React, { useEffect, useState } from "react";
// // // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // // import { mapNodeDetails } from "../mappers/node-details-mapper";

// // // // function Flows() {
// // // //   const [flows, setFlows] = useState([]);
// // // //   const [editingFlow, setEditingFlow] = useState(null);
// // // //   const [editPriority, setEditPriority] = useState("");
// // // //   const [showAll, setShowAll] = useState(false);
// // // //   const MAX_VISIBLE = 5;

// // // //   useEffect(() => {
// // // //     fetchFlows();
// // // //   }, []);

// // // //   const fetchFlows = async () => {
// // // //     const controller = localStorage.getItem("active_sdn_controller") || "odl";

// // // //     // --- FLOODLIGHT ADAPTER PATHWAY ---
// // // //     if (controller === "floodlight") {
// // // //       try {
// // // //         const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
// // // //         const data = await response.json(); // returns {"00:00...": {"flows": [...]}}
        
// // // //         const extractedFlows = [];
// // // //         if (data && typeof data === "object") {
// // // //           Object.entries(data).forEach(([switchId, switchPayload]) => {
// // // //             const flowsList = switchPayload?.flows; // Extracts flows from the nested object
// // // //             if (Array.isArray(flowsList)) {
// // // //               flowsList.forEach((flow, idx) => {
// // // //                 extractedFlows.push({
// // // //                   id: flow.cookie || `flow-${idx}`,
// // // //                   node: switchId,
// // // //                   tableId: flow.table_id || 0, // Matches "table_id"
// // // //                   priority: flow.priority || 0,
// // // //                   actions: flow.instructions?.instruction_apply_actions?.actions || "drop",
// // // //                 });
// // // //               });
// // // //             }
// // // //           });
// // // //         }
// // // //         setFlows(extractedFlows);
// // // //         return;
// // // //       } catch (err) {
// // // //         console.error("❌ Floodlight Flow fetch failed", err);
// // // //         setFlows([]);
// // // //         return;
// // // //       }
// // // //     }

// // // //     // --- ONOS ADAPTER PATHWAY ---
// // // //     if (controller === "onos") {
// // // //       try {
// // // //         const response = await fetch("/api/onos/v1/flows", {
// // // //           headers: { Authorization: "Basic " + btoa("onos:rocks") }
// // // //         });
// // // //         const data = await response.json();
// // // //         const extractedFlows = (data.flows || []).map((flow) => ({
// // // //           id: flow.id,
// // // //           node: flow.deviceId,
// // // //           tableId: flow.tableId || 0,
// // // //           priority: flow.priority,
// // // //           actions: flow.treatment?.instructions || [],
// // // //         }));
// // // //         setFlows(extractedFlows);
// // // //         return;
// // // //       } catch (err) {
// // // //         console.error("❌ ONOS Flow fetch failed", err);
// // // //         setFlows([]);
// // // //         return;
// // // //       }
// // // //     }

// // // //     // --- DEFAULT ODL PATHWAY ---
// // // //     try {
// // // //       const response = await getNodes();
// // // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // // //       const parsedNodes = nodes.map((node) =>
// // // //         mapNodeDetails({ "opendaylight-inventory:node": [node] })
// // // //       ).filter(Boolean);

// // // //       const extractedFlows = parsedNodes.flatMap((node) => {
// // // //         const tables = Array.isArray(node.flowTables) ? node.flowTables : [];
// // // //         return tables.flatMap((table) => {
// // // //           const tableFlows = Array.isArray(table.flows) ? table.flows : [];
// // // //           return tableFlows.map((flow) => ({
// // // //             id: flow.id,
// // // //             node: node.id,
// // // //             tableId: table.id,
// // // //             priority: flow.priority,
// // // //             actions: flow.instructions?.instruction || [],
// // // //           }));
// // // //         });
// // // //       });

// // // //       setFlows(extractedFlows);
// // // //     } catch (err) {
// // // //       console.error("❌ ODL Flow fetch failed", err);
// // // //       setFlows([]);
// // // //     }
// // // //   };

// // // //   const handleDelete = async (flowId) => {
// // // //     const flowToDelete = flows.find((f) => f.id === flowId);
// // // //     if (!flowToDelete) return;

// // // //     try {
// // // //       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
// // // //       setFlows(flows.filter((f) => f.id !== flowId));
// // // //     } catch (err) {
// // // //       console.error("❌ Failed to delete flow", err);
// // // //     }
// // // //   };

// // // //   const handleEdit = (flowId) => {
// // // //     const flow = flows.find((f) => f.id === flowId);
// // // //     setEditingFlow(flow);
// // // //     setEditPriority(flow.priority);
// // // //   };

// // // //   const handleUpdate = async () => {
// // // //     try {
// // // //       const updatedFlow = {
// // // //         ...editingFlow,
// // // //         priority: editPriority,
// // // //       };

// // // //       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
// // // //       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
// // // //       setEditingFlow(null);
// // // //     } catch (err) {
// // // //       console.error("❌ Failed to update flow", err);
// // // //     }
// // // //   };

// // // //   const safeFlows = Array.isArray(flows) ? flows : [];

// // // //   return (
// // // //     <div className="p-4 sm:p-8">
// // // //       <h1 className="text-xl sm:text-2xl font-bold mb-4">All Flows</h1>
      
// // // //       <div className="overflow-x-auto">
// // // //         <table className="min-w-full border bg-white shadow rounded text-sm sm:text-base">
// // // //           <thead className="bg-gray-100 text-left">
// // // //             <tr>
// // // //               <th className="p-2">Flow ID</th>
// // // //               <th className="p-2">Device</th>
// // // //               <th className="p-2">Table</th>
// // // //               <th className="p-2">Priority</th>
// // // //               <th className="p-2">Actions</th>
// // // //             </tr>
// // // //           </thead>
// // // //           <tbody>
// // // //             {(showAll ? safeFlows : safeFlows.slice(0, MAX_VISIBLE)).map((flow, index) => (
// // // //               <tr key={index} className="border-t">
// // // //                 <td className="p-2">{flow.id}</td>
// // // //                 <td className="p-2">{flow.node}</td>
// // // //                 <td className="p-2">{flow.tableId}</td>
// // // //                 <td className="p-2">{flow.priority}</td>
// // // //                 <td className="p-2 flex flex-wrap gap-2">
// // // //                   <button
// // // //                     onClick={() => handleEdit(flow.id)}
// // // //                     className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
// // // //                   >
// // // //                     Edit
// // // //                   </button>
// // // //                   <button
// // // //                     onClick={() => handleDelete(flow.id)}
// // // //                     className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
// // // //                   >
// // // //                     Delete
// // // //                   </button>
// // // //                 </td>
// // // //               </tr>
// // // //             ))}
// // // //           </tbody>
// // // //         </table>
// // // //         {safeFlows.length > MAX_VISIBLE && (
// // // //           <div className="mt-4 text-center">
// // // //             <button
// // // //               onClick={() => setShowAll(!showAll)}
// // // //               className="text-blue-600 hover:underline"
// // // //             >
// // // //               {showAll ? "Show Less" : "Show More"}
// // // //             </button>
// // // //           </div>
// // // //         )}
// // // //       </div>

// // // //       {editingFlow && (
// // // //         <div className="mt-6 p-4 border rounded shadow bg-gray-50 max-w-xl mx-auto">
// // // //           <h2 className="text-lg font-semibold mb-2">Edit Flow: {editingFlow.id}</h2>
// // // //           <label className="block mb-4">
// // // //             <span className="mr-2">Priority:</span>
// // // //             <input
// // // //               type="number"
// // // //               className="border rounded p-2 w-full sm:w-40"
// // // //               value={editPriority}
// // // //               onChange={(e) => setEditPriority(e.target.value)}
// // // //             />
// // // //           </label>
// // // //           <div className="flex flex-wrap gap-3">
// // // //             <button
// // // //               onClick={handleUpdate}
// // // //               className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
// // // //             >
// // // //               Save
// // // //             </button>
// // // //             <button
// // // //               onClick={() => setEditingFlow(null)}
// // // //               className="bg-gray-500 hover:bg-gray-500 text-white px-4 py-2 rounded"
// // // //             >
// // // //               Cancel
// // // //             </button>
// // // //           </div>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }

// // // // export default Flows;
























// // // import React, { useEffect, useState, useMemo } from "react";
// // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // import { mapNodeDetails } from "../mappers/node-details-mapper";
// // // import { useFlowStats } from "../../pipeline/DataPipelineContext"; // Tune into the Pipeline radio

// // // function Flows() {
// // //   const { data: rawFlowStats } = useFlowStats(); // Live Metrics
// // //   const [flows, setFlows] = useState([]);
// // //   const [editingFlow, setEditingFlow] = useState(null);
// // //   const [editPriority, setEditPriority] = useState("");
// // //   const [showAll, setShowAll] = useState(false);
// // //   const MAX_VISIBLE = 10; 

// // //   useEffect(() => {
// // //     fetchFlows();
// // //   }, []);

// // //   // Format messy duration "4182s 569000000ns" -> "4182s"
// // //   const formatDuration = (str) => {
// // //     if (!str) return "0s";
// // //     return str.toString().split(" ")[0]; 
// // //   };

// // //   const fetchFlows = async () => {
// // //     const controller = localStorage.getItem("active_sdn_controller") || "odl";

// // //     if (controller === "floodlight") {
// // //       try {
// // //         const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
// // //         const data = await response.json();
// // //         const extractedFlows = [];
// // //         if (data && typeof data === "object") {
// // //           Object.entries(data).forEach(([switchId, switchPayload]) => {
// // //             const flowsList = switchPayload?.flows;
// // //             if (Array.isArray(flowsList)) {
// // //               flowsList.forEach((flow, idx) => {
// // //                 extractedFlows.push({
// // //                   id: flow.cookie || `flow-${idx}`,
// // //                   node: switchId,
// // //                   tableId: flow.table_id || 0,
// // //                   priority: flow.priority || 0,
// // //                 });
// // //               });
// // //             }
// // //           });
// // //         }
// // //         setFlows(extractedFlows); return;
// // //       } catch (err) { console.error("Floodlight failed", err); setFlows([]); return; }
// // //     }

// // //     if (controller === "onos") {
// // //       try {
// // //         const response = await fetch("/api/onos/v1/flows", { headers: { Authorization: "Basic " + btoa("onos:rocks") } });
// // //         const data = await response.json();
// // //         const extractedFlows = (data.flows || []).map((flow) => ({
// // //           id: flow.id,
// // //           node: flow.deviceId,
// // //           tableId: flow.tableId || 0,
// // //           priority: flow.priority,
// // //         }));
// // //         setFlows(extractedFlows); return;
// // //       } catch (err) { console.error("ONOS failed", err); setFlows([]); return; }
// // //     }

// // //     try {
// // //       const response = await getNodes();
// // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // //       const parsedNodes = nodes.map((node) => mapNodeDetails({ "opendaylight-inventory:node": [node] })).filter(Boolean);
// // //       const extractedFlows = parsedNodes.flatMap((node) => {
// // //         const tables = Array.isArray(node.flowTables) ? node.flowTables : [];
// // //         return tables.flatMap((table) => {
// // //           const tableFlows = Array.isArray(table.flows) ? table.flows : [];
// // //           return tableFlows.map((flow) => ({
// // //             id: flow.id,
// // //             node: node.id,
// // //             tableId: table.id,
// // //             priority: flow.priority,
// // //           }));
// // //         });
// // //       });
// // //       setFlows(extractedFlows);
// // //     } catch (err) { console.error("ODL failed", err); setFlows([]); }
// // //   };

// // //   // MERGE Logic: Management Data + Live Metrics from Pipeline
// // //   const mergedFlows = useMemo(() => {
// // //     return flows.map(f => {
// // //       const stats = Array.isArray(rawFlowStats) ? rawFlowStats.find(s => s.flow_id === f.id) : null;
// // //       return {
// // //         ...f,
// // //         packetCount: stats?.packet_count || 0,
// // //         byteCount: stats?.byte_count || 0,
// // //         liveDuration: stats?.duration || "0s"
// // //       };
// // //     });
// // //   }, [flows, rawFlowStats]);

// // //   const handleDelete = async (flowId) => {
// // //     const flowToDelete = flows.find((f) => f.id === flowId);
// // //     if (!flowToDelete) return;
// // //     try {
// // //       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
// // //       setFlows(flows.filter((f) => f.id !== flowId));
// // //     } catch (err) { console.error("Delete failed", err); }
// // //   };

// // //   const handleEdit = (flowId) => {
// // //     const flow = flows.find((f) => f.id === flowId);
// // //     setEditingFlow(flow);
// // //     setEditPriority(flow.priority);
// // //   };

// // //   const handleUpdate = async () => {
// // //     try {
// // //       const updatedFlow = { ...editingFlow, priority: editPriority };
// // //       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
// // //       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
// // //       setEditingFlow(null);
// // //     } catch (err) { console.error("Update failed", err); }
// // //   };

// // //   return (
// // //     <div className="p-8 bg-gray-50 min-h-screen">
// // //       <div className="flex justify-between items-end mb-8">
// // //         <div>
// // //           <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Flow Management</h1>
// // //           <p className="text-gray-500 mt-1">Full control over live network traffic and routing rules.</p>
// // //         </div>
// // //         <div className="bg-white border px-4 py-2 rounded-lg shadow-sm text-sm font-bold text-blue-600">
// // //           Sync Status: LIVE ({mergedFlows.length} Flows)
// // //         </div>
// // //       </div>
      
// // //       <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
// // //         <div className="overflow-x-auto">
// // //           <table className="min-w-full text-sm">
// // //             <thead className="bg-gray-50 border-b border-gray-200">
// // //               <tr className="text-gray-400 uppercase text-[11px] font-bold tracking-widest">
// // //                 <th className="px-6 py-4 text-left">Flow ID</th>
// // //                 <th className="px-6 py-4 text-left">Switch</th>
// // //                 <th className="px-6 py-4 text-right">Priority</th>
// // //                 <th className="px-6 py-4 text-right">Packets</th>
// // //                 <th className="px-6 py-4 text-right">Bytes</th>
// // //                 <th className="px-6 py-4 text-right">Duration</th>
// // //                 <th className="px-6 py-4 text-center">Actions</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="divide-y divide-gray-100">
// // //               {(showAll ? mergedFlows : mergedFlows.slice(0, MAX_VISIBLE)).map((flow, index) => (
// // //                 <tr key={index} className="hover:bg-blue-50/50 transition-colors">
// // //                   <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// // //                   <td className="px-6 py-4 text-gray-600">{flow.node}</td>
// // //                   <td className="px-6 py-4 text-right font-bold text-gray-800">{flow.priority}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums text-gray-700">{flow.packetCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums text-gray-700">{flow.byteCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right text-gray-400">{formatDuration(flow.liveDuration)}</td>
// // //                   <td className="px-6 py-4">
// // //                     <div className="flex justify-center gap-3">
// // //                       <button onClick={() => handleEdit(flow.id)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-[11px] transition-all">EDIT</button>
// // //                       <button onClick={() => handleDelete(flow.id)} className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-[11px] transition-all">DELETE</button>
// // //                     </div>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //             </tbody>
// // //           </table>
// // //         </div>

// // //         {mergedFlows.length > MAX_VISIBLE && (
// // //           <div className="p-4 bg-gray-50 text-center border-t border-gray-200">
// // //             <button onClick={() => setShowAll(!showAll)} className="text-blue-600 font-bold hover:text-blue-800 text-xs">
// // //               {showAll ? "COLLAPSE LIST" : `VIEW ALL ${mergedFlows.length} FLOWS`}
// // //             </button>
// // //           </div>
// // //         )}
// // //       </div>

// // //       {editingFlow && (
// // //         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
// // //            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
// // //             <h2 className="text-xl font-extrabold mb-2 text-gray-800">Update Flow Priority</h2>
// // //             <p className="text-gray-400 text-xs mb-6 font-mono">{editingFlow.id}</p>
// // //             <label className="block mb-8">
// // //               <span className="text-gray-500 text-xs font-bold uppercase mb-2 block">New Priority Level</span>
// // //               <input type="number" className="border-2 border-gray-100 rounded-xl p-4 w-full focus:border-blue-500 outline-none transition-all text-lg font-bold" value={editPriority} onChange={(e) => setEditPriority(e.target.value)} />
// // //             </label>
// // //             <div className="flex gap-4">
// // //               <button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg">Save</button>
// // //               <button onClick={() => setEditingFlow(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold">Cancel</button>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default Flows;

















// // // import React, { useEffect, useState, useMemo } from "react";
// // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // import { mapNodeDetails } from "../mappers/node-details-mapper";
// // // import { useFlowStats } from "../pipeline/DataPipelineContext"; // Path fixed to one level up

// // // function Flows() {
// // //   const { data: rawFlowStats } = useFlowStats(); // Real-time metrics
// // //   const [flows, setFlows] = useState([]);
// // //   const [editingFlow, setEditingFlow] = useState(null);
// // //   const [editPriority, setEditPriority] = useState("");
// // //   const [showAll, setShowAll] = useState(false);
// // //   const MAX_VISIBLE = 10; 

// // //   useEffect(() => {
// // //     fetchFlows();
// // //   }, []);

// // //   // Format messy duration "4182s 569000000ns" -> "4182s"
// // //   const formatDuration = (str) => {
// // //     if (!str) return "0s";
// // //     return str.toString().split(" ")[0]; 
// // //   };

// // //   const fetchFlows = async () => {
// // //     const controller = localStorage.getItem("active_sdn_controller") || "odl";

// // //     if (controller === "floodlight") {
// // //       try {
// // //         const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
// // //         const data = await response.json();
// // //         const extractedFlows = [];
// // //         if (data && typeof data === "object") {
// // //           Object.entries(data).forEach(([switchId, switchPayload]) => {
// // //             const flowsList = switchPayload?.flows;
// // //             if (Array.isArray(flowsList)) {
// // //               flowsList.forEach((flow, idx) => {
// // //                 extractedFlows.push({
// // //                   id: flow.cookie || `flow-${idx}`,
// // //                   node: switchId,
// // //                   tableId: flow.table_id || 0,
// // //                   priority: flow.priority || 0,
// // //                 });
// // //               });
// // //             }
// // //           });
// // //         }
// // //         setFlows(extractedFlows); return;
// // //       } catch (err) { console.error("Floodlight failed", err); setFlows([]); return; }
// // //     }

// // //     if (controller === "onos") {
// // //       try {
// // //         const response = await fetch("/api/onos/v1/flows", { headers: { Authorization: "Basic " + btoa("onos:rocks") } });
// // //         const data = await response.json();
// // //         const extractedFlows = (data.flows || []).map((flow) => ({
// // //           id: flow.id,
// // //           node: flow.deviceId,
// // //           tableId: flow.tableId || 0,
// // //           priority: flow.priority,
// // //         }));
// // //         setFlows(extractedFlows); return;
// // //       } catch (err) { console.error("ONOS failed", err); setFlows([]); return; }
// // //     }

// // //     try {
// // //       const response = await getNodes();
// // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // //       const parsedNodes = nodes.map((node) => mapNodeDetails({ "opendaylight-inventory:node": [node] })).filter(Boolean);
// // //       const extractedFlows = parsedNodes.flatMap((node) => {
// // //         const tables = Array.isArray(node.flowTables) ? node.flowTables : [];
// // //         return tables.flatMap((table) => {
// // //           const tableFlows = Array.isArray(table.flows) ? table.flows : [];
// // //           return tableFlows.map((flow) => ({
// // //             id: flow.id,
// // //             node: node.id,
// // //             tableId: table.id,
// // //             priority: flow.priority,
// // //           }));
// // //         });
// // //       });
// // //       setFlows(extractedFlows);
// // //     } catch (err) { console.error("ODL failed", err); setFlows([]); }
// // //   };

// // //   // MERGE LIVE DATA: Combines management logic with live pipeline metrics
// // //   const mergedFlows = useMemo(() => {
// // //     return flows.map(f => {
// // //       const stats = Array.isArray(rawFlowStats) ? rawFlowStats.find(s => s.flow_id === f.id) : null;
// // //       return {
// // //         ...f,
// // //         packetCount: stats?.packet_count || 0,
// // //         byteCount: stats?.byte_count || 0,
// // //         liveDuration: stats?.duration || "0s"
// // //       };
// // //     });
// // //   }, [flows, rawFlowStats]);

// // //   const handleDelete = async (flowId) => {
// // //     const flowToDelete = flows.find((f) => f.id === flowId);
// // //     if (!flowToDelete) return;
// // //     try {
// // //       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
// // //       setFlows(flows.filter((f) => f.id !== flowId));
// // //     } catch (err) { console.error("Delete failed", err); }
// // //   };

// // //   const handleEdit = (flowId) => {
// // //     const flow = flows.find((f) => f.id === flowId);
// // //     setEditingFlow(flow);
// // //     setEditPriority(flow.priority);
// // //   };

// // //   const handleUpdate = async () => {
// // //     try {
// // //       const updatedFlow = { ...editingFlow, priority: editPriority };
// // //       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
// // //       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
// // //       setEditingFlow(null);
// // //     } catch (err) { console.error("Update failed", err); }
// // //   };

// // //   return (
// // //     <div className="p-8 bg-gray-50 min-h-screen">
// // //       <div className="flex justify-between items-end mb-8">
// // //         <div>
// // //           <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Flow Management</h1>
// // //           <p className="text-gray-500 mt-1">Full control and real-time monitoring of network traffic.</p>
// // //         </div>
// // //         <div className="bg-white border px-4 py-2 rounded-lg shadow-sm text-sm font-bold text-blue-600">
// // //           Sync Status: LIVE ({mergedFlows.length} Flows)
// // //         </div>
// // //       </div>
      
// // //       <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
// // //         <div className="overflow-x-auto">
// // //           <table className="min-w-full text-sm">
// // //             <thead className="bg-gray-50 border-b border-gray-200">
// // //               <tr className="text-gray-400 uppercase text-[11px] font-bold tracking-widest">
// // //                 <th className="px-6 py-4 text-left">Flow ID</th>
// // //                 <th className="px-6 py-4 text-left">Switch</th>
// // //                 <th className="px-6 py-4 text-right">Priority</th>
// // //                 <th className="px-6 py-4 text-right">Packets</th>
// // //                 <th className="px-6 py-4 text-right">Bytes</th>
// // //                 <th className="px-6 py-4 text-right">Duration</th>
// // //                 <th className="px-6 py-4 text-center">Actions</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="divide-y divide-gray-100">
// // //               {(showAll ? mergedFlows : mergedFlows.slice(0, MAX_VISIBLE)).map((flow, index) => (
// // //                 <tr key={index} className="hover:bg-blue-50/50 transition-colors">
// // //                   <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// // //                   <td className="px-6 py-4 text-gray-600 font-medium">{flow.node}</td>
// // //                   <td className="px-6 py-4 text-right font-bold text-gray-800">{flow.priority}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums text-gray-700">{flow.packetCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums text-gray-700">{flow.byteCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right text-gray-400">{formatDuration(flow.liveDuration)}</td>
// // //                   <td className="px-6 py-4">
// // //                     <div className="flex justify-center gap-3">
// // //                       <button onClick={() => handleEdit(flow.id)} className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-[11px] transition-all uppercase tracking-tighter">Edit</button>
// // //                       <button onClick={() => handleDelete(flow.id)} className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-md font-bold text-[11px] transition-all uppercase tracking-tighter">Delete</button>
// // //                     </div>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //             </tbody>
// // //           </table>
// // //         </div>

// // //         {mergedFlows.length > MAX_VISIBLE && (
// // //           <div className="p-4 bg-gray-50 text-center border-t border-gray-200">
// // //             <button onClick={() => setShowAll(!showAll)} className="text-blue-600 font-bold hover:text-blue-800 text-xs tracking-wide">
// // //               {showAll ? "COLLAPSE LIST" : `VIEW ALL ${mergedFlows.length} NETWORK FLOWS`}
// // //             </button>
// // //           </div>
// // //         )}
// // //       </div>

// // //       {editingFlow && (
// // //         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
// // //            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
// // //             <h2 className="text-xl font-extrabold mb-1 text-gray-800">Update Flow Priority</h2>
// // //             <p className="text-gray-400 text-xs mb-6 font-mono border-b pb-4">{editingFlow.id}</p>
// // //             <label className="block mb-8">
// // //               <span className="text-gray-500 text-xs font-bold uppercase mb-2 block">New Priority Value</span>
// // //               <input type="number" className="border-2 border-gray-100 rounded-xl p-4 w-full focus:border-blue-500 outline-none transition-all text-lg font-bold" value={editPriority} onChange={(e) => setEditPriority(e.target.value)} />
// // //             </label>
// // //             <div className="flex gap-4">
// // //               <button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all">Save Changes</button>
// // //               <button onClick={() => setEditingFlow(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition-all">Cancel</button>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default Flows;









// // // import React, { useEffect, useState, useMemo } from "react";
// // // import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// // // import { mapNodeDetails } from "../mappers/node-details-mapper";
// // // import { useFlowStats } from "../pipeline/DataPipelineContext"; 

// // // function Flows() {
// // //   const { data: rawFlowStats } = useFlowStats();
// // //   const [flows, setFlows] = useState([]);
// // //   const [editingFlow, setEditingFlow] = useState(null);
// // //   const [editPriority, setEditPriority] = useState("");
// // //   const [showAll, setShowAll] = useState(false);
// // //   const MAX_VISIBLE = 10; 

// // //   useEffect(() => { fetchFlows(); }, []);

// // //   const formatDuration = (str) => str?.toString().split(" ")[0] || "0s";

// // //   const fetchFlows = async () => {
// // //     try {
// // //       const response = await getNodes();
// // //       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// // //       const parsedNodes = nodes.map((node) => mapNodeDetails({ "opendaylight-inventory:node": [node] })).filter(Boolean);
// // //       const extractedFlows = parsedNodes.flatMap((node) =>
// // //         (node.flowTables || []).flatMap((table) =>
// // //           (table.flows || []).map((flow) => ({ id: flow.id, node: node.id, tableId: table.id, priority: flow.priority }))
// // //         )
// // //       );
// // //       setFlows(extractedFlows);
// // //     } catch (err) { console.error(err); }
// // //   };

// // //   const mergedFlows = useMemo(() => {
// // //     return flows.map(f => {
// // //       const stats = Array.isArray(rawFlowStats) ? rawFlowStats.find(s => s.flow_id === f.id) : null;
// // //       return { ...f, packetCount: stats?.packet_count || 0, byteCount: stats?.byte_count || 0, liveDuration: stats?.duration || "0s" };
// // //     });
// // //   }, [flows, rawFlowStats]);

// // //   return (
// // //     <div className="min-h-screen">
// // //       <div className="flex justify-between items-end mb-8">
// // //         <h1 className="text-3xl font-black text-slate-800 dark:text-white">Flow Management</h1>
// // //         <div className="bg-white dark:bg-slate-800 border dark:border-white/5 px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-blue-600">
// // //           Sync: LIVE ({mergedFlows.length} Flows)
// // //         </div>
// // //       </div>
      
// // //       <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5">
// // //         <table className="min-w-full text-sm">
// // //           <thead className="bg-gray-50 dark:bg-slate-900/50 border-b dark:border-white/5">
// // //             <tr className="text-gray-400 uppercase text-[10px] font-bold tracking-widest">
// // //               <th className="px-6 py-4 text-left">Flow ID</th>
// // //               <th className="px-6 py-4 text-left">Switch</th>
// // //               <th className="px-6 py-4 text-right">Priority</th>
// // //               <th className="px-6 py-4 text-right">Packets</th>
// // //               <th className="px-6 py-4 text-right">Bytes</th>
// // //               <th className="px-6 py-4 text-right">Duration</th>
// // //             </tr>
// // //           </thead>
// // //           <tbody className="divide-y divide-gray-100 dark:divide-white/5">
// // //             {mergedFlows.slice(0, showAll ? mergedFlows.length : MAX_VISIBLE).map((flow, i) => (
// // //               <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors">
// // //                 <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// // //                 <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{flow.node}</td>
// // //                 <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">{flow.priority}</td>
// // //                 <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.packetCount.toLocaleString()}</td>
// // //                 <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.byteCount.toLocaleString()}</td>
// // //                 <td className="px-6 py-4 text-right text-gray-400">{formatDuration(flow.liveDuration)}</td>
// // //               </tr>
// // //             ))}
// // //           </tbody>
// // //         </table>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default Flows;





// // // import React, { useState, useMemo } from "react";
// // // import { useFlowStats, useNodes } from "../pipeline/DataPipelineContext"; 
// // // import { deleteFlow, updateFlow } from "../api/api-controller";

// // // function Flows() {
// // //   // 1. Get data directly from the pipeline (like Dashboard did)
// // //   const { data: rawFlowStats, loading: flowsLoading } = useFlowStats();
// // //   const { data: nodes } = useNodes();
  
// // //   const [editingFlow, setEditingFlow] = useState(null);
// // //   const [editPriority, setEditPriority] = useState("");
// // //   const [showAll, setShowAll] = useState(false);
// // //   const MAX_VISIBLE = 10; 

// // //   const formatDuration = (str) => str?.toString().split(" ")[0] || "0s";

// // //   // 2. Process the pipeline data
// // //   const mergedFlows = useMemo(() => {
// // //     const stats = Array.isArray(rawFlowStats) ? rawFlowStats : [];
// // //     return stats.map(s => ({
// // //       id: s.flow_id,
// // //       node: s.switch_id,
// // //       priority: s.priority || 0,
// // //       packetCount: s.packet_count || 0,
// // //       byteCount: s.byte_count || 0,
// // //       liveDuration: s.duration || "0s",
// // //       // We assume table 0 if not provided by pipeline
// // //       tableId: 0 
// // //     }));
// // //   }, [rawFlowStats]);

// // //   const handleDelete = async (flowId, node, tableId) => {
// // //     try {
// // //       await deleteFlow(node, tableId, flowId);
// // //       // Data will auto-refresh via pipeline polling
// // //     } catch (err) { console.error("Delete failed", err); }
// // //   };

// // //   const handleEdit = (flow) => {
// // //     setEditingFlow(flow);
// // //     setEditPriority(flow.priority);
// // //   };

// // //   const handleUpdate = async () => {
// // //     try {
// // //       await updateFlow(editingFlow.node, editingFlow.tableId, editingFlow.id, { priority: editPriority });
// // //       setEditingFlow(null);
// // //     } catch (err) { console.error("Update failed", err); }
// // //   };

// // //   if (flowsLoading && mergedFlows.length === 0) {
// // //     return (
// // //       <div className="flex flex-col items-center justify-center min-h-[400px]">
// // //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
// // //         <p className="mt-4 text-slate-500 font-medium">Fetching Live Flows...</p>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <div className="min-h-screen pb-20">
// // //       <div className="flex justify-between items-end mb-8">
// // //         <div>
// // //           <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Flow Management</h1>
// // //           <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time monitoring of network traffic rules.</p>
// // //         </div>
// // //         <div className="bg-white dark:bg-slate-800 border dark:border-white/5 px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-blue-600">
// // //           Pipeline Status: {mergedFlows.length > 0 ? `LIVE (${mergedFlows.length} Flows)` : "Connecting..."}
// // //         </div>
// // //       </div>
      
// // //       <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5">
// // //         <div className="overflow-x-auto">
// // //           <table className="min-w-full text-sm">
// // //             <thead className="bg-gray-50 dark:bg-slate-900/50 border-b dark:border-white/5">
// // //               <tr className="text-gray-400 uppercase text-[10px] font-bold tracking-widest">
// // //                 <th className="px-6 py-4 text-left">Flow ID</th>
// // //                 <th className="px-6 py-4 text-left">Switch</th>
// // //                 <th className="px-6 py-4 text-right">Priority</th>
// // //                 <th className="px-6 py-4 text-right">Packets</th>
// // //                 <th className="px-6 py-4 text-right">Bytes</th>
// // //                 <th className="px-6 py-4 text-right">Duration</th>
// // //                 <th className="px-6 py-4 text-center">Actions</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="divide-y divide-gray-100 dark:divide-white/5">
// // //               {mergedFlows.slice(0, showAll ? mergedFlows.length : MAX_VISIBLE).map((flow, i) => (
// // //                 <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors">
// // //                   <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// // //                   <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{flow.node}</td>
// // //                   <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">{flow.priority}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.packetCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.byteCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right text-gray-400">{formatDuration(flow.liveDuration)}</td>
// // //                   <td className="px-6 py-4">
// // //                     <div className="flex justify-center gap-2">
// // //                       <button onClick={() => handleEdit(flow)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg font-bold text-[10px]">EDIT</button>
// // //                       <button onClick={() => handleDelete(flow.id, flow.node, flow.tableId)} className="text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg font-bold text-[10px]">DELETE</button>
// // //                     </div>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //               {mergedFlows.length === 0 && !flowsLoading && (
// // //                 <tr><td colSpan={7} className="text-center py-20 text-slate-400">No active flows found in pipeline.</td></tr>
// // //               )}
// // //             </tbody>
// // //           </table>
// // //         </div>
// // //       </div>

// // //       {editingFlow && (
// // //         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
// // //           <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
// // //             <h2 className="text-xl font-bold mb-6 dark:text-white">Update Flow Priority</h2>
// // //             <input 
// // //               type="number" 
// // //               className="w-full border-2 dark:border-white/10 dark:bg-slate-900 rounded-xl p-4 mb-6 outline-none focus:border-blue-500 dark:text-white font-bold" 
// // //               value={editPriority} 
// // //               onChange={(e) => setEditPriority(e.target.value)} 
// // //             />
// // //             <div className="flex gap-4">
// // //               <button onClick={handleUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save</button>
// // //               <button onClick={() => setEditingFlow(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold">Cancel</button>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default Flows;











// // // import React, { useState, useMemo } from "react";
// // // import { useFlowStats } from "../pipeline/DataPipelineContext"; 
// // // import { deleteFlow, updateFlow } from "../api/api-controller";

// // // function Flows() {
// // //   const { data: rawFlowStats, loading: flowsLoading } = useFlowStats();
  
// // //   const [editingFlow, setEditingFlow] = useState(null);
// // //   const [editPriority, setEditPriority] = useState("");
// // //   const [showAll, setShowAll] = useState(false);
// // //   const MAX_VISIBLE = 10; 

// // //   const formatDuration = (str) => str?.toString().split(" ")[0] || "0s";

// // //   const mergedFlows = useMemo(() => {
// // //     const stats = Array.isArray(rawFlowStats) ? rawFlowStats : [];
// // //     return stats.map(s => ({
// // //       id: s.flow_id,
// // //       node: s.switch_id,
// // //       priority: s.priority || 0,
// // //       packetCount: s.packet_count || 0,
// // //       byteCount: s.byte_count || 0,
// // //       liveDuration: s.duration || "0s",
// // //       tableId: s.table_id ?? 0 // Uses table_id from stats if present
// // //     }));
// // //   }, [rawFlowStats]);

// // //   const handleDelete = async (flowId, node, tableId) => {
// // //     try {
// // //       await deleteFlow(node, tableId, flowId);
// // //     } catch (err) { console.error("Delete failed", err); }
// // //   };

// // //   const handleEdit = (flow) => {
// // //     setEditingFlow(flow);
// // //     setEditPriority(flow.priority);
// // //   };

// // //   const handleUpdate = async () => {
// // //     try {
// // //       await updateFlow(editingFlow.node, editingFlow.tableId, editingFlow.id, { priority: editPriority });
// // //       setEditingFlow(null);
// // //     } catch (err) { console.error("Update failed", err); }
// // //   };

// // //   if (flowsLoading && mergedFlows.length === 0) {
// // //     return (
// // //       <div className="flex flex-col items-center justify-center min-h-[400px]">
// // //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
// // //         <p className="mt-4 text-slate-500 font-medium">Fetching Live Flows...</p>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <div className="min-h-screen pb-20">
// // //       <div className="flex justify-between items-end mb-8">
// // //         <div>
// // //           <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Flow Management</h1>
// // //           <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time monitoring of network traffic rules.</p>
// // //         </div>
// // //         <div className="bg-white dark:bg-slate-800 border dark:border-white/5 px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-blue-600">
// // //           Pipeline Status: {mergedFlows.length > 0 ? `LIVE (${mergedFlows.length} Flows)` : "Connecting..."}
// // //         </div>
// // //       </div>
      
// // //       <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5">
// // //         <div className="overflow-x-auto">
// // //           <table className="min-w-full text-sm">
// // //             <thead className="bg-gray-50 dark:bg-slate-900/50 border-b dark:border-white/5">
// // //               <tr className="text-gray-400 uppercase text-[10px] font-bold tracking-widest">
// // //                 <th className="px-6 py-4 text-left">Flow ID</th>
// // //                 <th className="px-6 py-4 text-left">Switch</th>
// // //                 <th className="px-6 py-4 text-right">Priority</th>
// // //                 <th className="px-6 py-4 text-right">Packets</th>
// // //                 <th className="px-6 py-4 text-right">Bytes</th>
// // //                 <th className="px-6 py-4 text-right">Duration</th>
// // //                 <th className="px-6 py-4 text-center">Actions</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody className="divide-y divide-gray-100 dark:divide-white/5">
// // //               {mergedFlows.slice(0, showAll ? mergedFlows.length : MAX_VISIBLE).map((flow) => (
// // //                 <tr key={`${flow.node}-${flow.id}`} className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors">
// // //                   <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// // //                   <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">{flow.node}</td>
// // //                   <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">{flow.priority}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.packetCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right tabular-nums dark:text-gray-400">{flow.byteCount.toLocaleString()}</td>
// // //                   <td className="px-6 py-4 text-right text-gray-400">{formatDuration(flow.liveDuration)}</td>
// // //                   <td className="px-6 py-4">
// // //                     <div className="flex justify-center gap-2">
// // //                       <button onClick={() => handleEdit(flow)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg font-bold text-[10px]">EDIT</button>
// // //                       <button onClick={() => handleDelete(flow.id, flow.node, flow.tableId)} className="text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg font-bold text-[10px]">DELETE</button>
// // //                     </div>
// // //                   </td>
// // //                 </tr>
// // //               ))}
// // //               {mergedFlows.length === 0 && !flowsLoading && (
// // //                 <tr><td colSpan={7} className="text-center py-20 text-slate-400">No active flows found in pipeline.</td></tr>
// // //               )}
// // //             </tbody>
// // //           </table>
// // //         </div>

// // //         {/* RESTORED: Show More / Show Less Button */}
// // //         {mergedFlows.length > MAX_VISIBLE && (
// // //           <div className="p-4 bg-gray-50 dark:bg-slate-900/30 text-center border-t dark:border-white/5">
// // //             <button
// // //               onClick={() => setShowAll(!showAll)}
// // //               className="text-blue-600 font-bold hover:underline text-xs"
// // //             >
// // //               {showAll ? "SHOW LESS" : `VIEW ALL ${mergedFlows.length} FLOWS`}
// // //             </button>
// // //           </div>
// // //         )}
// // //       </div>

// // //       {editingFlow && (
// // //         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
// // //           <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
// // //             <h2 className="text-xl font-bold mb-6 dark:text-white">Update Flow Priority</h2>
// // //             <input 
// // //               type="number" 
// // //               className="w-full border-2 dark:border-white/10 dark:bg-slate-900 rounded-xl p-4 mb-6 outline-none focus:border-blue-500 dark:text-white font-bold" 
// // //               value={editPriority} 
// // //               onChange={(e) => setEditPriority(e.target.value)} 
// // //             />
// // //             <div className="flex gap-4">
// // //               <button onClick={handleUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save</button>
// // //               <button onClick={() => setEditingFlow(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold">Cancel</button>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default Flows;


































// // import React, { useState, useMemo, useEffect } from "react";
// // import { useFlowStats } from "../pipeline/DataPipelineContext"; 
// // import { deleteFlow, updateFlow, getNodes } from "../api/api-controller";
// // import { mapNodeDetails } from "../mappers/node-details-mapper";

// // function Flows() {
// //   const { data: rawFlowStats, loading: flowsLoading } = useFlowStats();
// //   const [managementFlows, setManagementFlows] = useState([]);
// //   const [editingFlow, setEditingFlow] = useState(null);
// //   const [editPriority, setEditPriority] = useState("");
// //   const [showAll, setShowAll] = useState(false);

// //   useEffect(() => {
// //     const fetchManagement = async () => {
// //       try {
// //         const response = await getNodes();
// //         const nodes = response["opendaylight-inventory:nodes"]?.node || [];
// //         const parsed = nodes.map(n => mapNodeDetails({ "opendaylight-inventory:node": [n] })).filter(Boolean);
// //         const extracted = parsed.flatMap(node => 
// //           (node.flowTables || []).flatMap(table => 
// //             (table.flows || []).map(f => ({ id: f.id, node: node.id, tableId: table.id, priority: f.priority }))
// //           )
// //         );
// //         setManagementFlows(extracted);
// //       } catch (err) { console.error(err); }
// //     };
// //     fetchManagement();
// //   }, []);

// //   const mergedFlows = useMemo(() => {
// //     return managementFlows.map(f => {
// //       const live = Array.isArray(rawFlowStats) ? rawFlowStats.find(s => s.flow_id === f.id) : null;
// //       return { ...f, packets: live?.packet_count || 0, bytes: live?.byte_count || 0, duration: live?.duration?.split(" ")[0] || "0s" };
// //     });
// //   }, [managementFlows, rawFlowStats]);

// //   const handleDelete = async (flow) => {
// //     try {
// //       await deleteFlow(flow.node, flow.tableId, flow.id);
// //       setManagementFlows(managementFlows.filter(f => f.id !== flow.id));
// //     } catch (err) { console.error(err); }
// //   };

// //   const handleUpdate = async () => {
// //     try {
// //       await updateFlow(editingFlow.node, editingFlow.tableId, editingFlow.id, { priority: editPriority });
// //       setManagementFlows(managementFlows.map(f => f.id === editingFlow.id ? { ...f, priority: editPriority } : f));
// //       setEditingFlow(null);
// //     } catch (err) { console.error(err); }
// //   };

// //   return (
// //     <div className="p-8 min-h-screen bg-slate-50">
// //       <div className="flex justify-between items-end mb-8">
// //         <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Flow Management</h1><p className="text-slate-500">Live monitoring and traffic control.</p></div>
// //         <div className="bg-white border px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-blue-600">LIVE ({mergedFlows.length} Flows)</div>
// //       </div>
      
// //       <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
// //         <table className="min-w-full text-sm">
// //           <thead className="bg-gray-50 border-b">
// //             <tr className="text-gray-400 uppercase text-[10px] font-bold tracking-widest">
// //               <th className="px-6 py-4 text-left">Flow ID</th>
// //               <th className="px-6 py-4 text-left">Switch</th>
// //               <th className="px-6 py-4 text-right">Priority</th>
// //               <th className="px-6 py-4 text-right">Packets</th>
// //               <th className="px-6 py-4 text-right">Bytes</th>
// //               <th className="px-6 py-4 text-right">Duration</th>
// //               <th className="px-6 py-4 text-center">Actions</th>
// //             </tr>
// //           </thead>
// //           <tbody className="divide-y divide-gray-100">
// //             {mergedFlows.slice(0, showAll ? mergedFlows.length : 10).map((flow, i) => (
// //               <tr key={i} className="hover:bg-blue-50/50">
// //                 <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
// //                 <td className="px-6 py-4 text-gray-600">{flow.node}</td>
// //                 <td className="px-6 py-4 text-right font-bold">{flow.priority}</td>
// //                 <td className="px-6 py-4 text-right">{flow.packets.toLocaleString()}</td>
// //                 <td className="px-6 py-4 text-right">{flow.bytes.toLocaleString()}</td>
// //                 <td className="px-6 py-4 text-right text-gray-400">{flow.duration}</td>
// //                 <td className="px-6 py-4"><div className="flex justify-center gap-2">
// //                   <button onClick={() => {setEditingFlow(flow); setEditPriority(flow.priority);}} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-[10px]">EDIT</button>
// //                   <button onClick={() => handleDelete(flow)} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-[10px]">DELETE</button>
// //                 </div></td>
// //               </tr>
// //             ))}
// //           </tbody>
// //         </table>
// //       </div>

// //       {editingFlow && (
// //         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
// //           <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
// //             <h2 className="text-xl font-bold mb-4">Update Flow Priority</h2>
// //             <input type="number" className="border-2 rounded-xl p-4 w-full mb-6 font-bold" value={editPriority} onChange={(e) => setEditPriority(e.target.value)} />
// //             <div className="flex gap-4">
// //               <button onClick={handleUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Save</button>
// //               <button onClick={() => setEditingFlow(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">Cancel</button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// // export default Flows;
































// import React, { useState, useMemo, useEffect } from "react";
// import { useFlowStats } from "../pipeline/DataPipelineContext"; 
// import { deleteFlow, updateFlow, getNodes } from "../api/api-controller";
// import { mapNodeDetails } from "../mappers/node-details-mapper";

// function Flows() {
//   const { data: rawFlowStats, loading: flowsLoading } = useFlowStats();
//   const [managementFlows, setManagementFlows] = useState([]);
//   const [editingFlow, setEditingFlow] = useState(null);
//   const [editPriority, setEditPriority] = useState("");
//   const [showAll, setShowAll] = useState(false);

//   useEffect(() => {
//     const fetchManagement = async () => {
//       const controller = localStorage.getItem("active_sdn_controller") || "floodlight";
//       try {
//         if (controller === "floodlight") {
//           // FIX: Call the specific All Flows endpoint for Floodlight
//           const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
//           const data = await response.json();
//           const extracted = [];
          
//           Object.entries(data).forEach(([dpid, payload]) => {
//             const flowsList = payload.flows || [];
//             flowsList.forEach((f, idx) => {
//               extracted.push({
//                 id: f.cookie || `flow-${idx}`,
//                 node: dpid,
//                 tableId: f.table_id || 0,
//                 priority: f.priority,
//                 packets: f.packetCount || 0,
//                 bytes: f.byteCount || 0,
//                 duration: `${f.durationSeconds || 0}s`
//               });
//             });
//           });
//           setManagementFlows(extracted);
//         } else {
//           // ODL Pathway
//           const response = await getNodes();
//           const nodes = response["opendaylight-inventory:nodes"]?.node || [];
//           const parsed = nodes.map(n => mapNodeDetails({ "opendaylight-inventory:node": [n] })).filter(Boolean);
//           const extracted = parsed.flatMap(node => 
//             (node.flowTables || []).flatMap(table => 
//               (table.flows || []).map(f => ({ id: f.id, node: node.id, tableId: table.id, priority: f.priority }))
//             )
//           );
//           setManagementFlows(extracted);
//         }
//       } catch (err) { console.error("Flow fetch failed:", err); }
//     };
//     fetchManagement();
//   }, []);

//   // Merge Management flows with Pipeline stats if available
//   const mergedFlows = useMemo(() => {
//     return managementFlows.map(f => {
//       const live = Array.isArray(rawFlowStats) ? rawFlowStats.find(s => s.flow_id === f.id) : null;
//       return { 
//         ...f, 
//         packets: live?.packet_count || f.packets || 0, 
//         bytes: live?.byte_count || f.bytes || 0, 
//         duration: live?.duration?.split(" ")[0] || f.duration || "0s" 
//       };
//     });
//   }, [managementFlows, rawFlowStats]);

//   // ... (Keep your existing handleDelete and handleUpdate functions)

//   return (
//     <div className="p-8 min-h-screen bg-slate-50">
//       <div className="flex justify-between items-end mb-8">
//         <div>
//           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Flow Management</h1>
//           <p className="text-slate-500">Live monitoring and traffic control.</p>
//         </div>
//         <div className="bg-white border px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-blue-600">
//           LIVE ({mergedFlows.length} Flows)
//         </div>
//       </div>
      
//       <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-50 border-b">
//             <tr className="text-gray-400 uppercase text-[10px] font-bold tracking-widest">
//               <th className="px-6 py-4 text-left">Flow ID</th>
//               <th className="px-6 py-4 text-left">Switch</th>
//               <th className="px-6 py-4 text-right">Priority</th>
//               <th className="px-6 py-4 text-right">Packets</th>
//               <th className="px-6 py-4 text-right">Bytes</th>
//               <th className="px-6 py-4 text-right">Duration</th>
//               <th className="px-6 py-4 text-center">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {mergedFlows.length === 0 ? (
//                 <tr><td colSpan={7} className="text-center py-10 text-gray-400">No flows found. Run 'pingall' in Mininet.</td></tr>
//             ) : mergedFlows.slice(0, showAll ? mergedFlows.length : 10).map((flow, i) => (
//               <tr key={i} className="hover:bg-blue-50/50">
//                 <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">{flow.id}</td>
//                 <td className="px-6 py-4 text-gray-600">{flow.node}</td>
//                 <td className="px-6 py-4 text-right font-bold">{flow.priority}</td>
//                 <td className="px-6 py-4 text-right">{flow.packets.toLocaleString()}</td>
//                 <td className="px-6 py-4 text-right">{flow.bytes.toLocaleString()}</td>
//                 <td className="px-6 py-4 text-right text-gray-400">{flow.duration}</td>
//                 <td className="px-6 py-4">
//                   <div className="flex justify-center gap-2">
//                     <button onClick={() => {setEditingFlow(flow); setEditPriority(flow.priority);}} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-[10px]">EDIT</button>
//                     <button onClick={() => handleDelete(flow)} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-bold text-[10px]">DELETE</button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//       {/* ... (Keep your editing modal here) ... */}
//     </div>
//   );
// }
// export default Flows;

























// import React, { useEffect, useState } from "react";
// import { getNodes, deleteFlow, updateFlow } from "../api/api-controller";
// import { mapNodeDetails } from "../mappers/node-details-mapper";

// function Flows() {
//   const [flows, setFlows] = useState([]);
//   const [editingFlow, setEditingFlow] = useState(null);
//   const [editPriority, setEditPriority] = useState("");
//   const [showAll, setShowAll] = useState(false);
//   const MAX_VISIBLE = 5;

//   useEffect(() => {
//     fetchFlows();
//   }, []);

//   const fetchFlows = async () => {
//     const controller = localStorage.getItem("active_sdn_controller") || "odl";

//     // --- FLOODLIGHT ADAPTER PATHWAY ---
//     if (controller === "floodlight") {
//       try {
//         const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
//         const data = await response.json(); // returns {"00:00...": {"flows": [...]}}
        
//         const extractedFlows = [];
//         if (data && typeof data === "object") {
//           Object.entries(data).forEach(([switchId, switchPayload]) => {
//             const flowsList = switchPayload?.flows;
//             if (Array.isArray(flowsList)) {
//               flowsList.forEach((flow, idx) => {
//                 extractedFlows.push({
//                   // Composite Unique ID prevents collisions between identical cookies on different switches
//                   id: `${switchId}-${flow.cookie || "0"}-${idx}`, 
//                   node: switchId,
//                   tableId: flow.table_id || 0,
//                   priority: flow.priority || 0,
//                   actions: flow.instructions?.instruction_apply_actions?.actions || "drop",
//                 });
//               });
//             }
//           });
//         }
//         setFlows(extractedFlows);
//         return;
//       } catch (err) {
//         console.error("❌ Floodlight Flow fetch failed", err);
//         setFlows([]);
//         return;
//       }
//     }

//     // --- ONOS ADAPTER PATHWAY ---
//     if (controller === "onos") {
//       try {
//         const response = await fetch("/api/onos/v1/flows", {
//           headers: { Authorization: "Basic " + btoa("onos:rocks") }
//         });
//         const data = await response.json();
//         const extractedFlows = (data.flows || []).map((flow) => ({
//           id: flow.id,
//           node: flow.deviceId,
//           tableId: flow.tableId || 0,
//           priority: flow.priority,
//           actions: flow.treatment?.instructions || [],
//         }));
//         setFlows(extractedFlows);
//         return;
//       } catch (err) {
//         console.error("❌ ONOS Flow fetch failed", err);
//         setFlows([]);
//         return;
//       }
//     }

//     // --- DEFAULT ODL PATHWAY ---
//     try {
//       const response = await getNodes();
//       const nodes = response["opendaylight-inventory:nodes"]?.node || [];
//       const parsedNodes = nodes.map((node) =>
//         mapNodeDetails({ "opendaylight-inventory:node": [node] })
//       ).filter(Boolean);

//       const extractedFlows = parsedNodes.flatMap((node) => {
//         const tables = Array.isArray(node.flowTables) ? node.flowTables : [];
//         return tables.flatMap((table) => {
//           const tableFlows = Array.isArray(table.flows) ? table.flows : [];
//           return tableFlows.map((flow) => ({
//             id: flow.id,
//             node: node.id,
//             tableId: table.id,
//             priority: flow.priority,
//             actions: flow.instructions?.instruction || [],
//           }));
//         });
//       });

//       setFlows(extractedFlows);
//     } catch (err) {
//       console.error("❌ ODL Flow fetch failed", err);
//       setFlows([]);
//     }
//   };

//   const handleDelete = async (flowId) => {
//     const flowToDelete = flows.find((f) => f.id === flowId);
//     if (!flowToDelete) return;

//     try {
//       await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
//       setFlows(flows.filter((f) => f.id !== flowId));
//     } catch (err) {
//       console.error("❌ Failed to delete flow", err);
//     }
//   };

//   const handleEdit = (flowId) => {
//     const flow = flows.find((f) => f.id === flowId);
//     setEditingFlow(flow);
//     setEditPriority(flow.priority);
//   };

//   const handleUpdate = async () => {
//     try {
//       const updatedFlow = {
//         ...editingFlow,
//         priority: editPriority,
//       };

//       await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
//       setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
//       setEditingFlow(null);
//     } catch (err) {
//       console.error("❌ Failed to update flow", err);
//     }
//   };

//   const safeFlows = Array.isArray(flows) ? flows : [];

//   return (
//     <div className="p-4 sm:p-8">
//       <h1 className="text-xl sm:text-2xl font-bold mb-4">All Flows</h1>
      
//       <div className="overflow-x-auto">
//         <table className="min-w-full border bg-white shadow rounded text-sm sm:text-base">
//           <thead className="bg-gray-100 text-left">
//             <tr>
//               <th className="p-2">Flow ID</th>
//               <th className="p-2">Device</th>
//               <th className="p-2">Table</th>
//               <th className="p-2">Priority</th>
//               <th className="p-2">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {(showAll ? safeFlows : safeFlows.slice(0, MAX_VISIBLE)).map((flow, index) => (
//               <tr key={index} className="border-t">
//                 <td className="p-2 truncate max-w-[200px]" title={flow.id}>{flow.id}</td>
//                 <td className="p-2">{flow.node}</td>
//                 <td className="p-2">{flow.tableId}</td>
//                 <td className="p-2">{flow.priority}</td>
//                 <td className="p-2 flex flex-wrap gap-2">
//                   <button
//                     onClick={() => handleEdit(flow.id)}
//                     className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     onClick={() => handleDelete(flow.id)}
//                     className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         {safeFlows.length > MAX_VISIBLE && (
//           <div className="mt-4 text-center">
//             <button
//               onClick={() => setShowAll(!showAll)}
//               className="text-blue-600 hover:underline"
//             >
//               {showAll ? "Show Less" : "Show More"}
//             </button>
//           </div>
//         )}
//       </div>

//       {editingFlow && (
//         <div className="mt-6 p-4 border rounded shadow bg-gray-50 max-w-xl mx-auto">
//           <h2 className="text-lg font-semibold mb-2">Edit Flow: {editingFlow.id}</h2>
//           <label className="block mb-4">
//             <span className="mr-2">Priority:</span>
//             <input
//               type="number"
//               className="border rounded p-2 w-full sm:w-40"
//               value={editPriority}
//               onChange={(e) => setEditPriority(e.target.value)}
//             />
//           </label>
//           <div className="flex flex-wrap gap-3">
//             <button
//               onClick={handleUpdate}
//               className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
//             >
//               Save
//             </button>
//             <button
//               onClick={() => setEditingFlow(null)}
//               className="bg-gray-500 hover:bg-gray-500 text-white px-4 py-2 rounded"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Flows;


















import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getNodes, deleteFlow, updateFlow } from "../api/apiController";
import { mapNodeDetails } from "../mappers/node-details-mapper";
import { getActiveController } from "../api/controllerManager";

function Flows() {
  const location = useLocation();
  const [flows, setFlows] = useState([]);
  const [editingFlow, setEditingFlow] = useState(null);
  const [editPriority, setEditPriority] = useState("");
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 5;

  // Arriving from a slice's "VIEW FLOWS" link — pre-filter to that slice's
  // real flow name (slice flows are always installed under the slice's own
  // name/id, so a substring match on the real flow ID is honest, not a
  // separate lookup table). Client-side filter over already-fetched flows —
  // Flows.jsx has no server-side filter API to call into.
  const [flowFilter, setFlowFilter] = useState(null);
  useEffect(() => {
    if (location.state?.filterFlowName) {
      setFlowFilter({ term: location.state.filterFlowName, label: location.state.filterLabel || location.state.filterFlowName });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    // Was reading a dead localStorage key ("active_sdn_controller") that
    // nothing in the live app writes anymore — SdnToggle/SdnContext, the
    // components that used to set it, are dead code. The real Header uses
    // controllerManager exclusively, so this page was silently stuck on ODL
    // regardless of the actual controller toggle.
    const controller = getActiveController();

    // --- FLOODLIGHT ADAPTER PATHWAY ---
    if (controller === "floodlight") {
      try {
        const response = await fetch("/api/floodlight/wm/core/switch/all/flow/json");
        const data = await response.json(); // returns {"00:00...": {"flows": [...]}}
        
        const extractedFlows = [];
        if (data && typeof data === "object") {
          Object.entries(data).forEach(([switchId, switchPayload]) => {
            const flowsList = switchPayload?.flows;
            if (Array.isArray(flowsList)) {
              flowsList.forEach((flow, idx) => {
                extractedFlows.push({
                  // Composite Unique ID prevents collisions between identical cookies on different switches
                  id: `${switchId}-${flow.cookie || "0"}-${idx}`, 
                  node: switchId,
                  tableId: flow.table_id || 0,
                  priority: flow.priority || 0,
                  actions: flow.instructions?.instruction_apply_actions?.actions || "drop",
                });
              });
            }
          });
        }
        setFlows(extractedFlows);
        return;
      } catch (err) {
        console.error("❌ Floodlight Flow fetch failed", err);
        setFlows([]);
        return;
      }
    }

    // --- ONOS ADAPTER PATHWAY ---
    if (controller === "onos") {
      try {
        const response = await fetch("/api/onos/v1/flows", {
          headers: { Authorization: "Basic " + btoa("onos:rocks") }
        });
        const data = await response.json();
        const extractedFlows = (data.flows || []).map((flow) => ({
          id: flow.id,
          node: flow.deviceId,
          tableId: flow.tableId || 0,
          priority: flow.priority,
          actions: flow.treatment?.instructions || [],
        }));
        setFlows(extractedFlows);
        return;
      } catch (err) {
        console.error("❌ ONOS Flow fetch failed", err);
        setFlows([]);
        return;
      }
    }

    // --- DEFAULT ODL PATHWAY ---
    try {
      const response = await getNodes();
      const nodes = response["opendaylight-inventory:nodes"]?.node || [];
      const parsedNodes = nodes.map((node) =>
        mapNodeDetails({ "opendaylight-inventory:node": [node] })
      ).filter(Boolean);

      const extractedFlows = parsedNodes.flatMap((node) => {
        const tables = Array.isArray(node.flowTables) ? node.flowTables : [];
        return tables.flatMap((table) => {
          const tableFlows = Array.isArray(table.flows) ? table.flows : [];
          return tableFlows.map((flow) => ({
            id: flow.id,
            node: node.id,
            tableId: table.id,
            priority: flow.priority,
            actions: flow.instructions?.instruction || [],
          }));
        });
      });

      setFlows(extractedFlows);
    } catch (err) {
      console.error("❌ ODL Flow fetch failed", err);
      setFlows([]);
    }
  };

  const handleDelete = async (flowId) => {
    const flowToDelete = flows.find((f) => f.id === flowId);
    if (!flowToDelete) return;

    try {
      await deleteFlow(flowToDelete.node, flowToDelete.tableId, flowId);
      setFlows(flows.filter((f) => f.id !== flowId));
    } catch (err) {
      console.error("❌ Failed to delete flow", err);
    }
  };

  const handleEdit = (flowId) => {
    const flow = flows.find((f) => f.id === flowId);
    setEditingFlow(flow);
    setEditPriority(flow.priority);
  };

  const handleUpdate = async () => {
    try {
      const updatedFlow = {
        ...editingFlow,
        priority: editPriority,
      };

      await updateFlow(updatedFlow.node, updatedFlow.tableId, updatedFlow.id, updatedFlow);
      setFlows(flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f)));
      setEditingFlow(null);
    } catch (err) {
      console.error("❌ Failed to update flow", err);
    }
  };

  const allFlows = Array.isArray(flows) ? flows : [];
  const safeFlows = flowFilter
    ? allFlows.filter((f) => (f.id || "").toLowerCase().includes(flowFilter.term.toLowerCase()))
    : allFlows;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">All Flows</h1>

      {flowFilter && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm">
          <span>Filtered to flows matching <strong>"{flowFilter.label}"</strong> — {safeFlows.length} of {allFlows.length} flows</span>
          <button onClick={() => setFlowFilter(null)} className="text-blue-500 hover:underline font-semibold">Clear</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white shadow rounded text-sm sm:text-base">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Flow ID</th>
              <th className="p-2">Device</th>
              <th className="p-2">Table</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(showAll ? safeFlows : safeFlows.slice(0, MAX_VISIBLE)).map((flow, index) => (
              <tr key={index} className="border-t">
                <td className="p-2 truncate max-w-[200px]" title={flow.id}>{flow.id}</td>
                <td className="p-2">{flow.node}</td>
                <td className="p-2">{flow.tableId}</td>
                <td className="p-2">{flow.priority}</td>
                <td className="p-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(flow.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {safeFlows.length > MAX_VISIBLE && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-blue-600 hover:underline"
            >
              {showAll ? "Show Less" : "Show More"}
            </button>
          </div>
        )}
      </div>

      {editingFlow && (
        <div className="mt-6 p-4 border rounded shadow bg-gray-50 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-2">Edit Flow: {editingFlow.id}</h2>
          <label className="block mb-4">
            <span className="mr-2">Priority:</span>
            <input
              type="number"
              className="border rounded p-2 w-full sm:w-40"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleUpdate}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setEditingFlow(null)}
              className="bg-gray-500 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Flows;