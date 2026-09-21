// // import React from "react";
// // import { useSdn } from "../../pipeline/SdnContext";

// // export function SdnToggle() {
// //   const { activeController, toggleController } = useSdn();

// //   return (
// //     <div className="flex items-center gap-1 bg-blue-950 p-1 rounded-full border border-blue-800 shadow-inner">
// //       <button
// //         onClick={toggleController}
// //         disabled={activeController === "odl"}
// //         className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
// //           activeController === "odl"
// //             ? "bg-yellow-400 text-blue-900 shadow-md cursor-default"
// //             : "text-gray-300 hover:text-yellow-400 cursor-pointer"
// //         }`}
// //       >
// //         OpenDaylight
// //       </button>
// //       <button
// //         onClick={toggleController}
// //         disabled={activeController === "onos"}
// //         className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
// //           activeController === "onos"
// //             ? "bg-yellow-400 text-blue-900 shadow-md cursor-default"
// //             : "text-gray-300 hover:text-yellow-400 cursor-pointer"
// //         }`}
// //       >
// //         ONOS
// //       </button>
// //     </div>
// //   );
// // }

// import React from "react";
// import { useSdn } from "../../pipeline/SdnContext";

// export function SdnToggle() {
//   const { activeController, changeController } = useSdn();

//   const handleSelect = (controller) => {
//     if (changeController) {
//       changeController(controller);
//     } else {
//       localStorage.setItem("active_sdn_controller", controller);
//       window.location.reload();
//     }
//   };

//   const controllers = [
//     { key: "odl", label: "OpenDaylight" },
//     { key: "onos", label: "ONOS" },
//     { key: "floodlight", label: "Floodlight" }
//   ];

//   return (
//     <div className="flex items-center gap-1 bg-blue-950 p-1 rounded-full border border-blue-800 shadow-inner">
//       {controllers.map((ctrl) => {
//         const isActive = activeController === ctrl.key;
//         return (
//           <button
//             key={ctrl.key}
//             onClick={() => handleSelect(ctrl.key)}
//             disabled={isActive}
//             className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
//               isActive
//                 ? "bg-yellow-400 text-blue-900 shadow-md cursor-default"
//                 : "text-gray-300 hover:text-yellow-400 cursor-pointer"
//             }`}
//           >
//             {ctrl.label}
//           </button>
//         );
//       })}
//     </div>
//   );
// }































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




























import React from "react";
import { useSdn } from "../../pipeline/SdnContext";

export function SdnToggle() {
  const { activeController, changeController } = useSdn();

  const handleSelect = (controller) => {
    if (changeController) {
      changeController(controller);
    } else {
      localStorage.setItem("active_sdn_controller", controller);
      window.location.reload();
    }
  };

  const controllers = [
    { key: "odl", label: "OpenDaylight" },
    { key: "onos", label: "ONOS" },
    { key: "floodlight", label: "Floodlight" }
  ];

  return (
    <div className="flex items-center gap-1 bg-blue-950 p-1 rounded-full border border-blue-800 shadow-inner">
      {controllers.map((ctrl) => {
        const isActive = activeController === ctrl.key;
        return (
          <button
            key={ctrl.key}
            onClick={() => handleSelect(ctrl.key)}
            disabled={isActive}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              isActive
                ? "bg-yellow-400 text-blue-900 shadow-md cursor-default"
                : "text-gray-300 hover:text-yellow-400 cursor-pointer"
            }`}
          >
            {ctrl.label}
          </button>
        );
      })}
    </div>
  );
}