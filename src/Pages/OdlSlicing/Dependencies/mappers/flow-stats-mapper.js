// // // // /**
// // // //  * Extracts only the essential flow stats from the raw ODL inventory response.
// // // //  *
// // // //  * Returns a flat array of:
// // // //  *   { switch_id, flow_id, packet_count, byte_count, duration }
// // // //  */
// // // // export function mapFlowStats(rawData) {
// // // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // // //   const result = [];

// // // //   nodes.forEach((node) => {
// // // //     const switch_id = node.id;

// // // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // // //       (table.flow || []).forEach((flow) => {
// // // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // // //         const dur = stats.duration || {};

// // // //         result.push({
// // // //           switch_id,
// // // //           flow_id:      flow.id,
// // // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // // //         });
// // // //       });
// // // //     });
// // // //   });

// // // //   return result;
// // // // }

// // // // /**
// // // //  * Extracts only the essential flow stats from the raw ODL inventory response.
// // // //  *
// // // //  * Returns a flat array of:
// // // //  *   { switch_id, flow_id, packet_count, byte_count, duration }
// // // //  */
// // // // export function mapFlowStats(rawData) {
// // // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // // //   const result = [];

// // // //   nodes.forEach((node) => {
// // // //     const switch_id = node.id;

// // // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // // //       (table.flow || []).forEach((flow) => {
// // // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // // //         const dur = stats.duration || {};

// // // //         result.push({
// // // //           switch_id,
// // // //           flow_id:      flow.id,
// // // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // // //         });
// // // //       });
// // // //     });
// // // //   });

// // // //   return result;
// // // // }


// // // /**
// // //  * Extracts ODL stats.
// // //  */
// // // function mapOdlFlowStats(rawData) {
// // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // //   const result = [];

// // //   nodes.forEach((node) => {
// // //     const switch_id = node.id;

// // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // //       (table.flow || []).forEach((flow) => {
// // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // //         const dur = stats.duration || {};

// // //         result.push({
// // //           switch_id,
// // //           flow_id:      flow.id,
// // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // //         });
// // //       });
// // //     });
// // //   });

// // //   return result;
// // // }

// // // /**
// // //  * Extracts ONOS flow stats and converts them to the exact same DTO format.
// // //  */
// // // function mapOnosFlowStats(rawData) {
// // //   const flows = rawData?.flows || [];
// // //   return flows.map((flow) => ({
// // //     switch_id:    flow.deviceId,
// // //     flow_id:      flow.id,
// // //     packet_count: flow.packets || 0,
// // //     byte_count:   flow.bytes || 0,
// // //     duration:     `${flow.life || 0}s`,
// // //   }));
// // // }

// // // /**
// // //  * Switchboard Mapper (Adapter Pattern)
// // //  */
// // // export function mapFlowStats(rawData) {
// // //   // If the payload has been tagged as ONOS by our api-controller
// // //   if (rawData && rawData.controller === "onos") {
// // //     return mapOnosFlowStats(rawData);
// // //   }
// // //   return mapOdlFlowStats(rawData);
// // // }

// // // // /**
// // // //  * Extracts only the essential flow stats from the raw ODL inventory response.
// // // //  *
// // // //  * Returns a flat array of:
// // // //  *   { switch_id, flow_id, packet_count, byte_count, duration }
// // // //  */
// // // // export function mapFlowStats(rawData) {
// // // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // // //   const result = [];

// // // //   nodes.forEach((node) => {
// // // //     const switch_id = node.id;

// // // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // // //       (table.flow || []).forEach((flow) => {
// // // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // // //         const dur = stats.duration || {};

// // // //         result.push({
// // // //           switch_id,
// // // //           flow_id:      flow.id,
// // // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // // //         });
// // // //       });
// // // //     });
// // // //   });

// // // //   return result;
// // // // }


// // // /**
// // //  * Extracts ODL stats.
// // //  */
// // // function mapOdlFlowStats(rawData) {
// // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // //   const result = [];

// // //   nodes.forEach((node) => {
// // //     const switch_id = node.id;

// // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // //       (table.flow || []).forEach((flow) => {
// // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // //         const dur = stats.duration || {};

// // //         result.push({
// // //           switch_id,
// // //           flow_id:      flow.id,
// // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // //         });
// // //       });
// // //     });
// // //   });

// // //   return result;
// // // }

// // // /**
// // //  * Extracts ONOS flow stats and converts them to the exact same DTO format.
// // //  */
// // // function mapOnosFlowStats(rawData) {
// // //   const flows = rawData?.flows || [];
// // //   return flows.map((flow) => ({
// // //     switch_id:    flow.deviceId,
// // //     flow_id:      flow.id,
// // //     packet_count: flow.packets || 0,
// // //     byte_count:   flow.bytes || 0,
// // //     duration:     `${flow.life || 0}s`,
// // //   }));
// // // }

// // // /**
// // //  * Switchboard Mapper (Adapter Pattern)
// // //  */
// // // export function mapFlowStats(rawData) {
// // //   // If the payload has been tagged as ONOS by our api-controller
// // //   if (rawData && rawData.controller === "onos") {
// // //     return mapOnosFlowStats(rawData);
// // //   }
// // //   return mapOdlFlowStats(rawData);
// // // }

// // // /**
// // //  * Extracts Floodlight flow stats and converts them to the same DTO format.
// // //  */
// // // function mapFloodlightFlowStats(rawData) {
// // //   const flows = rawData?.flows || [];
// // //   return flows.map((flow) => ({
// // //     switch_id:    rawData.switch_id,
// // //     flow_id:      flow.cookie || "unknown",
// // //     packet_count: flow.packetCount || 0,
// // //     byte_count:   flow.byteCount || 0,
// // //     duration:     `${flow.durationSeconds || 0}s`,
// // //   }));
// // // }

// // // // Update your main switchboard export to include Floodlight:
// // // export function mapFlowStats(rawData) {
// // //   if (rawData && rawData.controller === "floodlight") {
// // //     return mapFloodlightFlowStats(rawData);
// // //   }
// // //   if (rawData && rawData.controller === "onos") {
// // //     return mapOnosFlowStats(rawData);
// // //   }
// // //   return mapOdlFlowStats(rawData);
// // // }
// // /**
// //  * Extracts ODL stats.
// //  */
// // function mapOdlFlowStats(rawData) {
// //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// //   const result = [];

// //   nodes.forEach((node) => {
// //     const switch_id = node.id;

// //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// //       (table.flow || []).forEach((flow) => {
// //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// //         const dur = stats.duration || {};

// //         result.push({
// //           switch_id,
// //           flow_id:      flow.id,
// //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// //         });
// //       });
// //     });
// //   });

// //   return result;
// // }

// // /**
// //  * Extracts ONOS flow stats and converts them to the exact same DTO format.
// //  */
// // function mapOnosFlowStats(rawData) {
// //   const flows = rawData?.flows || [];
// //   return flows.map((flow) => ({
// //     switch_id:    flow.deviceId,
// //     flow_id:      flow.id,
// //     packet_count: flow.packets || 0,
// //     byte_count:   flow.bytes || 0,
// //     duration:     `${flow.life || 0}s`,
// //   }));
// // }

// // /**
// //  * Extracts Floodlight flow stats from the double-nested switch-flow dictionary.
// //  */
// // function mapFloodlightFlowStats(rawData) {
// //   const flowsMap = rawData?.flows || {};
// //   const result = [];

// //   Object.entries(flowsMap).forEach(([switchId, switchPayload]) => {
// //     const flowsList = switchPayload?.flows;
// //     if (Array.isArray(flowsList)) {
// //       flowsList.forEach((flow, idx) => {
// //         result.push({
// //           switch_id:    switchId,
// //           flow_id:      flow.cookie || `flow-${idx}`,
// //           packet_count: flow.packet_count || 0, // Matches Floodlight's "packet_count"
// //           byte_count:   flow.byte_count || 0,   // Matches Floodlight's "byte_count"
// //           duration:     `${flow.duration_sec || 0}s`, // Matches Floodlight's "duration_sec"
// //         });
// //       });
// //     }
// //   });

// //   return result;
// // }

// // /**
// //  * Switchboard Mapper (Adapter Pattern)
// //  */
// // export function mapFlowStats(rawData) {
// //   if (rawData && rawData.controller === "floodlight") {
// //     return mapFloodlightFlowStats(rawData);
// //   }
// //   if (rawData && rawData.controller === "onos") {
// //     return mapOnosFlowStats(rawData);
// //   }
// //   return mapOdlFlowStats(rawData);
// // }





















// // // /**
// // //  * Extracts only the essential flow stats from the raw ODL inventory response.
// // //  *
// // //  * Returns a flat array of:
// // //  *   { switch_id, flow_id, packet_count, byte_count, duration }
// // //  */
// // // export function mapFlowStats(rawData) {
// // //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// // //   const result = [];

// // //   nodes.forEach((node) => {
// // //     const switch_id = node.id;

// // //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// // //       (table.flow || []).forEach((flow) => {
// // //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// // //         const dur = stats.duration || {};

// // //         result.push({
// // //           switch_id,
// // //           flow_id:      flow.id,
// // //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// // //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// // //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// // //         });
// // //       });
// // //     });
// // //   });

// // //   return result;
// // // }


// // /**
// //  * Extracts ODL stats.
// //  */
// // function mapOdlFlowStats(rawData) {
// //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// //   const result = [];

// //   nodes.forEach((node) => {
// //     const switch_id = node.id;

// //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// //       (table.flow || []).forEach((flow) => {
// //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// //         const dur = stats.duration || {};

// //         result.push({
// //           switch_id,
// //           flow_id:      flow.id,
// //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// //         });
// //       });
// //     });
// //   });

// //   return result;
// // }

// // /**
// //  * Extracts ONOS flow stats and converts them to the exact same DTO format.
// //  */
// // function mapOnosFlowStats(rawData) {
// //   const flows = rawData?.flows || [];
// //   return flows.map((flow) => ({
// //     switch_id:    flow.deviceId,
// //     flow_id:      flow.id,
// //     packet_count: flow.packets || 0,
// //     byte_count:   flow.bytes || 0,
// //     duration:     `${flow.life || 0}s`,
// //   }));
// // }

// // /**
// //  * Switchboard Mapper (Adapter Pattern)
// //  */
// // export function mapFlowStats(rawData) {
// //   // If the payload has been tagged as ONOS by our api-controller
// //   if (rawData && rawData.controller === "onos") {
// //     return mapOnosFlowStats(rawData);
// //   }
// //   return mapOdlFlowStats(rawData);
// // }

// // /**
// //  * Extracts Floodlight flow stats and converts them to the same DTO format.
// //  */
// // function mapFloodlightFlowStats(rawData) {
// //   const flows = rawData?.flows || [];
// //   return flows.map((flow) => ({
// //     switch_id:    rawData.switch_id,
// //     flow_id:      flow.cookie || "unknown",
// //     packet_count: flow.packetCount || 0,
// //     byte_count:   flow.byteCount || 0,
// //     duration:     `${flow.durationSeconds || 0}s`,
// //   }));
// // }

// // // Update your main switchboard export to include Floodlight:
// // export function mapFlowStats(rawData) {
// //   if (rawData && rawData.controller === "floodlight") {
// //     return mapFloodlightFlowStats(rawData);
// //   }
// //   if (rawData && rawData.controller === "onos") {
// //     return mapOnosFlowStats(rawData);
// //   }
// //   return mapOdlFlowStats(rawData);
// // }
// /**
//  * Extracts ODL stats.
//  */
// function mapOdlFlowStats(rawData) {
//   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
//   const result = [];

//   nodes.forEach((node) => {
//     const switch_id = node.id;

//     (node["flow-node-inventory:table"] || []).forEach((table) => {
//       (table.flow || []).forEach((flow) => {
//         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
//         const dur = stats.duration || {};

//         result.push({
//           switch_id,
//           flow_id:      flow.id,
//           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
//           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
//           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
//         });
//       });
//     });
//   });

//   return result;
// }

// /**
//  * Extracts ONOS flow stats and converts them to the exact same DTO format.
//  */
// function mapOnosFlowStats(rawData) {
//   const flows = rawData?.flows || [];
//   return flows.map((flow) => ({
//     switch_id:    flow.deviceId,
//     flow_id:      flow.id,
//     packet_count: flow.packets || 0,
//     byte_count:   flow.bytes || 0,
//     duration:     `${flow.life || 0}s`,
//   }));
// }

// /**
//  * Extracts Floodlight flow stats from the global switch-flow dictionary and flattens them.
//  */
// function mapFloodlightFlowStats(rawData) {
//   const flowsMap = rawData?.flows || {};
//   const result = [];

//   Object.entries(flowsMap).forEach(([switchId, switchPayload]) => {
//     const flowsList = switchPayload?.flows;
//     if (Array.isArray(flowsList)) {
//       flowsList.forEach((flow, idx) => {
//         result.push({
//           switch_id:    switchId,
//           flow_id:      flow.cookie || `flow-${idx}`,
//           packet_count: flow.packet_count || 0, 
//           byte_count:   flow.byte_count || 0,   
//           duration:     `${flow.duration_sec || 0}s`, 
//         });
//       });
//     }
//   });

//   return result;
// }

// /**
//  * Switchboard Mapper (Adapter Pattern)
//  */
// export function mapFlowStats(rawData) {
// 	// Null-guard prevents startup crashes when background context is loading
// 	if (!rawData) return [];

// 	if (rawData.controller === "floodlight") {
// 		return mapFloodlightFlowStats(rawData);
// 	}
// 	if (rawData.controller === "onos") {
// 		return mapOnosFlowStats(rawData);
// 	}
// 	return mapOdlFlowStats(rawData);
// }




















// // /**
// //  * Extracts only the essential flow stats from the raw ODL inventory response.
// //  *
// //  * Returns a flat array of:
// //  *   { switch_id, flow_id, packet_count, byte_count, duration }
// //  */
// // export function mapFlowStats(rawData) {
// //   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
// //   const result = [];

// //   nodes.forEach((node) => {
// //     const switch_id = node.id;

// //     (node["flow-node-inventory:table"] || []).forEach((table) => {
// //       (table.flow || []).forEach((flow) => {
// //         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
// //         const dur = stats.duration || {};

// //         result.push({
// //           switch_id,
// //           flow_id:      flow.id,
// //           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
// //           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
// //           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
// //         });
// //       });
// //     });
// //   });

// //   return result;
// // }


// /**
//  * Extracts ODL stats.
//  */
// function mapOdlFlowStats(rawData) {
//   const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
//   const result = [];

//   nodes.forEach((node) => {
//     const switch_id = node.id;

//     (node["flow-node-inventory:table"] || []).forEach((table) => {
//       (table.flow || []).forEach((flow) => {
//         const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
//         const dur = stats.duration || {};

//         result.push({
//           switch_id,
//           flow_id:      flow.id,
//           packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
//           byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
//           duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
//         });
//       });
//     });
//   });

//   return result;
// }

// /**
//  * Extracts ONOS flow stats and converts them to the exact same DTO format.
//  */
// function mapOnosFlowStats(rawData) {
//   const flows = rawData?.flows || [];
//   return flows.map((flow) => ({
//     switch_id:    flow.deviceId,
//     flow_id:      flow.id,
//     packet_count: flow.packets || 0,
//     byte_count:   flow.bytes || 0,
//     duration:     `${flow.life || 0}s`,
//   }));
// }

// /**
//  * Switchboard Mapper (Adapter Pattern)
//  */
// export function mapFlowStats(rawData) {
//   // If the payload has been tagged as ONOS by our api-controller
//   if (rawData && rawData.controller === "onos") {
//     return mapOnosFlowStats(rawData);
//   }
//   return mapOdlFlowStats(rawData);
// }

// /**
//  * Extracts Floodlight flow stats and converts them to the same DTO format.
//  */
// function mapFloodlightFlowStats(rawData) {
//   const flows = rawData?.flows || [];
//   return flows.map((flow) => ({
//     switch_id:    rawData.switch_id,
//     flow_id:      flow.cookie || "unknown",
//     packet_count: flow.packetCount || 0,
//     byte_count:   flow.byteCount || 0,
//     duration:     `${flow.durationSeconds || 0}s`,
//   }));
// }

// // Update your main switchboard export to include Floodlight:
// export function mapFlowStats(rawData) {
//   if (rawData && rawData.controller === "floodlight") {
//     return mapFloodlightFlowStats(rawData);
//   }
//   if (rawData && rawData.controller === "onos") {
//     return mapOnosFlowStats(rawData);
//   }
//   return mapOdlFlowStats(rawData);
// }
/**
 * Extracts ODL stats.
 */
function mapOdlFlowStats(rawData) {
  const nodes = rawData?.["opendaylight-inventory:nodes"]?.node || [];
  const result = [];

  nodes.forEach((node) => {
    const switch_id = node.id;

    (node["flow-node-inventory:table"] || []).forEach((table) => {
      (table.flow || []).forEach((flow) => {
        const stats = flow["opendaylight-flow-statistics:flow-statistics"] || {};
        const dur = stats.duration || {};

        result.push({
          switch_id,
          flow_id:      flow.id,
          packet_count: stats["packet-count"] ?? stats.packetCount ?? 0,
          byte_count:   stats["byte-count"]   ?? stats.byteCount   ?? 0,
          duration:     `${dur.second ?? 0}s ${dur.nanosecond ?? 0}ns`,
        });
      });
    });
  });

  return result;
}

/**
 * Extracts ONOS flow stats and converts them to the exact same DTO format.
 */
function mapOnosFlowStats(rawData) {
  const flows = rawData?.flows || [];
  return flows.map((flow) => ({
    switch_id:    flow.deviceId,
    flow_id:      flow.id,
    packet_count: flow.packets || 0,
    byte_count:   flow.bytes || 0,
    duration:     `${flow.life || 0}s`,
  }));
}

/**
 * Extracts Floodlight flow stats from the global switch-flow dictionary and flattens them.
 */
function mapFloodlightFlowStats(rawData) {
  const flowsMap = rawData?.flows || {};
  const result = [];

  Object.entries(flowsMap).forEach(([switchId, switchPayload]) => {
    const flowsList = switchPayload?.flows;
    if (Array.isArray(flowsList)) {
      flowsList.forEach((flow, idx) => {
        result.push({
          switch_id:    switchId,
          flow_id:      flow.cookie || `flow-${idx}`,
          packet_count: flow.packet_count || 0, 
          byte_count:   flow.byte_count || 0,   
          duration:     `${flow.duration_sec || 0}s`, 
        });
      });
    }
  });

  return result;
}

/**
 * Switchboard Mapper (Adapter Pattern)
 */
export function mapFlowStats(rawData) {
	// Null-guard prevents startup crashes when background context is loading
	if (!rawData) return [];

	if (rawData.controller === "floodlight") {
		return mapFloodlightFlowStats(rawData);
	}
	if (rawData.controller === "onos") {
		return mapOnosFlowStats(rawData);
	}
	return mapOdlFlowStats(rawData);
}