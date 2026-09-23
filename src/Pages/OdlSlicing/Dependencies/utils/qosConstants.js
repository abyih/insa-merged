// ─────────────────────────────────────────────────────────────────────────────
// qosConstants.js — single source of truth for the low-latency enforcement
// mechanism (DSCP marking + OVS HTB queue), shared by the frontend (flow/match
// construction, in apiController.js) and the backend (OVS queue provisioning,
// in server.js). Keep queue numbering here, not hard-coded per call site.
// ─────────────────────────────────────────────────────────────────────────────
export const DSCP_LOW_LATENCY = 46;      // DSCP 46 (EF) marks low-latency traffic
export const QUEUE_LOW_LATENCY = 0;      // OVS queue id for DSCP-46 traffic
export const QUEUE_STANDARD = 1;         // OVS queue id for everything else
export const QOS_TYPE = "HTB";
