// odlSync.js — OpenStack <-> ODL Synchronization Service
// Pushes "shadow" flows into ODL representing OpenStack security policy decisions.
// Uses an isolated table (250) on br-int so it never interferes with OVN's own pipeline.

const ODL_BASE = process.env.ODL_URL || "http://localhost:8181";
const ODL_AUTH = "Basic " + Buffer.from("admin:admin").toString("base64");
const SHADOW_TABLE = 250;

let cachedBrIntNodeId = null;

async function odlFetch(path, options = {}) {
  const res = await fetch(`${ODL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: ODL_AUTH,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function findBrIntNodeId() {
  if (cachedBrIntNodeId) return cachedBrIntNodeId;
  const res = await odlFetch(
    "/rests/data/opendaylight-inventory:nodes?content=nonconfig",
  );
  if (!res.ok) throw new Error(`ODL inventory fetch failed: ${res.status}`);
  const data = await res.json();
  const nodes = data["opendaylight-inventory:nodes"]?.node || [];
  // br-int is an Open vSwitch node with NO description (Mininet switches s1-s4 always
  // report a description like "s1"). If OS_BR_INT_NODE_ID is set explicitly, prefer that.
  const explicitId = process.env.OS_BR_INT_NODE_ID;
  const match = explicitId
    ? nodes.find((n) => n.id === explicitId)
    : nodes.find((n) => {
        const desc = n["flow-node-inventory:description"];
        return (
          n["flow-node-inventory:manufacturer"] === "Nicira, Inc." &&
          (!desc || desc === "None")
        );
      });
  if (!match) {
    throw new Error(
      "Could not find br-int in ODL inventory — is the OVS controller attached?",
    );
  }
  cachedBrIntNodeId = match.id;
  return cachedBrIntNodeId;
}

function buildFlowId(rule) {
  const raw = `${rule.protocol}-${rule.port || "any"}-${rule.destination}`;
  return `os-sync-${raw}`.replace(/[^a-zA-Z0-9-]/g, "_");
}

function buildMatch(rule) {
  const match = { "ethernet-match": { "ethernet-type": { type: 2048 } } }; // IPv4
  const proto = (rule.protocol || "").toLowerCase();
  if (proto === "tcp") {
    match["ip-match"] = { "ip-protocol": 6 };
    if (rule.port) {
      match["tcp-destination-port"] = Number(rule.port);
    }
  } else if (proto === "udp") {
    match["ip-match"] = { "ip-protocol": 17 };
    if (rule.port) {
      match["udp-destination-port"] = Number(rule.port);
    }
  } else if (proto === "icmp") {
    match["ip-match"] = { "ip-protocol": 1 };
  }
  return match;
}

/**
 * Push a shadow flow into ODL representing an OpenStack security rule decision.
 * Safe: lives in table 250, never touched by OVN's own pipeline (tables 0-99).
 */
async function pushSecurityRuleShadow(rule) {
  const nodeId = await findBrIntNodeId();
  const flowId = buildFlowId(rule);

  const flowBody = {
    "flow-node-inventory:flow": [
      {
        id: flowId,
        table_id: SHADOW_TABLE,
        priority: 500,
        match: buildMatch(rule),
        instructions: {
          instruction: [
            {
              order: 0,
              // Send-to-controller so it's visible/countable without altering real traffic paths
              "apply-actions": {
                action: [
                  {
                    order: 0,
                    "output-action": {
                      "output-node-connector": "CONTROLLER",
                      "max-length": 60,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };

  const path = `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
    nodeId,
  )}/flow-node-inventory:table=${SHADOW_TABLE}/flow=${encodeURIComponent(flowId)}`;

  const res = await odlFetch(path, {
    method: "PUT",
    body: JSON.stringify(flowBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ODL flow push failed (${res.status}): ${text}`);
  }

  return { flowId, nodeId, table: SHADOW_TABLE };
}

/**
 * List all shadow flows currently installed (for dashboards/demo).
 */
async function listShadowFlows() {
  const nodeId = await findBrIntNodeId();
  const path = `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
    nodeId,
  )}/flow-node-inventory:table=${SHADOW_TABLE}?content=config`;
  const res = await odlFetch(path);
  if (res.status === 404 || !res.ok) return [];
  const data = await res.json();
  const table = data["flow-node-inventory:table"]?.[0];
  return table?.flow || [];
}

async function deleteShadowFlow(flowId) {
  const nodeId = await findBrIntNodeId();
  const path = `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
    nodeId,
  )}/flow-node-inventory:table=${SHADOW_TABLE}/flow=${encodeURIComponent(flowId)}`;
  const res = await odlFetch(path, { method: "DELETE" });
  return res.ok || res.status === 404;
}


/**
 * Create (or replace) an OpenFlow meter on br-int with a real drop-band rate limit.
 * meterId: integer (unique per slice/purpose)
 * rateKbps: rate limit in kilobits per second
 */
async function createMeter(meterId, rateKbps) {
  const nodeId = await findBrIntNodeId();
  const burst = Math.max(100, Math.floor(rateKbps / 10));
  const meterBody = {
    "flow-node-inventory:meter": [
      {
        "meter-id": meterId,
        "flags": "meter-kbps",
        "meter-band-headers": {
          "meter-band-header": [
            {
              "band-id": 0,
              "band-rate": rateKbps,
              "band-burst-size": burst,
              "drop-rate": rateKbps,
              "drop-burst-size": burst,
            },
          ],
        },
      },
    ],
  };

  const path = `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
    nodeId,
  )}/flow-node-inventory:meter=${meterId}`;

  const res = await odlFetch(path, {
    method: "PUT",
    body: JSON.stringify(meterBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ODL meter creation failed (${res.status}): ${text}`);
  }

  return { meterId, nodeId, rateKbps };
}

/**
 * Push a shadow flow that references a meter (real bandwidth-limiting enforcement),
 * matched to a specific slice VM's IP address. Lives in table 250, same isolated
 * space as pushSecurityRuleShadow — never conflicts with OVN's own tables.
 */
async function pushSliceMeterFlow({ sliceId, vmIp, meterId, rateKbps }) {
  const nodeId = await findBrIntNodeId();
  await createMeter(meterId, rateKbps);

  const flowId = `slice-meter-${sliceId.slice(0, 8)}-${meterId}`;
  const flowBody = {
    "flow-node-inventory:flow": [
      {
        id: flowId,
        table_id: SHADOW_TABLE,
        priority: 600,
        match: {
          "ethernet-match": { "ethernet-type": { type: 2048 } },
          "ipv4-source": `${vmIp}/32`,
        },
        instructions: {
          instruction: [
            {
              order: 0,
              meter: { "meter-id": meterId },
            },
            {
              order: 1,
              "apply-actions": {
                action: [
                  {
                    order: 0,
                    "output-action": {
                      "output-node-connector": "CONTROLLER",
                      "max-length": 60,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };

  const path = `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(
    nodeId,
  )}/flow-node-inventory:table=${SHADOW_TABLE}/flow=${encodeURIComponent(flowId)}`;

  const res = await odlFetch(path, {
    method: "PUT",
    body: JSON.stringify(flowBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ODL meter-flow push failed (${res.status}): ${text}`);
  }

  return { flowId, meterId, rateKbps, nodeId, table: SHADOW_TABLE };
}

export {
  findBrIntNodeId,
  pushSecurityRuleShadow,
  listShadowFlows,
  deleteShadowFlow,
  createMeter,
  pushSliceMeterFlow,
};
