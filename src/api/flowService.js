import {
  getNodes as fetchInventoryNodes,
  getNodeTables as fetchNodeTables,
  getFlows as fetchNodeFlows,
  getConfigFlows as fetchConfigFlows,
  deleteFlow as removeFlow,
  updateFlow as putNodeFlow,
  installFlow as postNodeFlow,
} from "./api-controller";
import NetworkTopologySvc from "../Pages/Topology/TopologyService";

const getErrorMessage = (error) => {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      return JSON.stringify(data);
    }
  }
  return error?.message || "Request failed";
};

export function isObserverNode(nodeId) {
  if (!nodeId) return false;
  const s = String(nodeId).toLowerCase();
  return (
    s.includes("br-int") ||
    s.includes("br-ex") ||
    s.includes("ovsdb") ||
    s.startsWith("vm-") ||
    s.includes("observer")
  );
}

export async function getInventoryNodes() {
  try {
    const [invRes, topoRes] = await Promise.all([
      fetchInventoryNodes().catch(() => null),
      NetworkTopologySvc.getNode("all").catch(() => null),
    ]);

    const inventoryNodes = invRes?.["opendaylight-inventory:nodes"]?.node || [];
    const topoNodes = topoRes?.nodes || [];

    const nodesList = [];
    const seenIds = new Set();

    // 1. Process OpenFlow inventory nodes
    inventoryNodes.forEach((node) => {
      const id = node.id || node["id"];
      if (id) {
        seenIds.add(id);
        const desc = node["flow-node-inventory:description"] || "";
        const mfr = node["flow-node-inventory:manufacturer"] || "";
        const isBrInt =
          (mfr === "Nicira, Inc." && (!desc || desc === "None" || desc.includes("br-int"))) ||
          id.includes("br-int");

        const type = id.startsWith("host:")
          ? "Host"
          : isBrInt
          ? "Integration Bridge (Observer Mode)"
          : "OpenFlow Switch";

        nodesList.push({
          id,
          type,
          isDevStack: isBrInt,
          isReadOnly: isBrInt,
        });
      }
    });

    // 2. Process DevStack OVSDB / Topology bridges (filter out VMs and compute hosts)
    topoNodes.forEach((tn) => {
      if (!tn || !tn.id || seenIds.has(tn.id)) return;
      // Skip VMs and compute hosts — endpoints do not have OpenFlow switch flow tables
      if (
        tn.group === "vm" ||
        tn.group === "ovs-host" ||
        tn.id.startsWith("vm-") ||
        tn.id.startsWith("host:")
      ) {
        return;
      }
      seenIds.add(tn.id);
      const isBridge =
        tn.group === "bridge-int" ||
        tn.group === "bridge-ex" ||
        tn.id.includes("br-int") ||
        tn.id.includes("br-ex");

      const type =
        tn.nodeDetails?.type ||
        (tn.group === "bridge-int"
          ? "Integration Bridge (Observer Mode)"
          : tn.group === "bridge-ex"
          ? "External Bridge (Observer Mode)"
          : isBridge
          ? "Switch Bridge (Observer Mode)"
          : "OVS Node (Observer Mode)");

      nodesList.push({
        id: tn.id,
        type,
        isDevStack: true,
        isReadOnly: true,
      });
    });

    return nodesList;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function getNodeTables(nodeId) {
  try {
    const res = await fetchNodeTables(nodeId);
    return res?.["flow-node-inventory:table"] || [{ id: 0 }];
  } catch (error) {
    return [{ id: 0 }];
  }
}

export async function getFlows(nodeId, tableId) {
  try {
    const flows = await fetchNodeFlows(nodeId, tableId);
    return flows || [];
  } catch (error) {
    return [];
  }
}

export async function getConfigFlows(nodeId, tableId) {
  try {
    const flows = await fetchConfigFlows(nodeId, tableId);
    return flows || [];
  } catch (error) {
    return [];
  }
}

export async function getOperationalFlows(nodeId, tableId) {
  try {
    const flows = await fetchNodeFlows(nodeId, tableId);
    return flows || [];
  } catch (error) {
    return [];
  }
}

export async function deleteFlow(nodeId, tableId, flowId) {
  if (isObserverNode(nodeId)) {
    throw new Error(
      `Device '${nodeId}' is in Observer Mode (managed by OpenStack OVN). Direct flow deletion is disabled.`
    );
  }
  try {
    await removeFlow(nodeId, tableId, flowId);
    return true;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function putFlow(nodeId, tableId, flowId, flowBody) {
  if (isObserverNode(nodeId)) {
    throw new Error(
      `Device '${nodeId}' is in Observer Mode (managed by OpenStack OVN). Direct flow creation is disabled.`
    );
  }
  try {
    await postNodeFlow(nodeId, tableId, flowId, flowBody);
    return true;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
