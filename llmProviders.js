import crypto from "crypto";

// ---- Encryption helpers (AES-256-GCM) ----
function getEncryptionKey() {
  const secret = process.env.LLM_KEY_ENCRYPTION_SECRET || "insa-sdn-platform-default-secret-key-2026";
  return crypto.scryptSync(secret, "slice-manager-llm-keys", 32);
}

export function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

export function decryptSecret({ iv, tag, data }) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ---- Provider metadata ----
export const PROVIDERS = {
  gemini: { label: "Google Gemini", defaultModel: "gemini-2.5-flash" },
  groq: { label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
  openrouter: { label: "OpenRouter", defaultModel: "meta-llama/llama-3.3-70b-instruct" },
};

// ---- Prompt Builder ----
export function buildPrompt(userText) {
  return `You are a network slice configuration assistant for an SDN/5G dashboard.
Given a user's plain-English description of what they need, respond with ONLY a raw JSON object (no markdown fences, no explanation) with exactly these fields:

{
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "isolationLevel": "STRICT" | "STANDARD",
  "latencyRequirement": "LOW" | "STANDARD",
  "bandwidthMbps": <number>,
  "matchedKeywords": [{"keyword": "<word or phrase from the text>", "reason": "<short reason>"}],
  "usedDefaults": <true if you had to guess with no real signal in the text, else false>
}

Guidance:
- HIGH priority + LOW latency + STRICT isolation for things like video calls, gaming, real-time control, medical, financial, mission-critical traffic.
- Higher bandwidthMbps (300-1000) for video/streaming/large transfers; lower (10-100) for light/IoT/sensor traffic; default 200 if unclear.
- Medical, hospital, financial, or mission-critical equipment/traffic should get bandwidthMbps in the 400-800 range, reflecting the criticality of the traffic, not just its literal size.
- STRICT isolation for anything mentioning security, privacy, or sensitive data.

User's request: "${userText}"

Respond with ONLY the JSON object.`;
}

export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("LLM response did not contain a valid JSON object");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function normalize(parsed) {
  const PRIORITY = ["HIGH", "MEDIUM", "LOW"];
  const ISOLATION = ["STRICT", "STANDARD"];
  const LATENCY = ["LOW", "STANDARD"];
  return {
    priority: PRIORITY.includes(parsed.priority) ? parsed.priority : "MEDIUM",
    isolationLevel: ISOLATION.includes(parsed.isolationLevel) ? parsed.isolationLevel : "STANDARD",
    latencyRequirement: LATENCY.includes(parsed.latencyRequirement) ? parsed.latencyRequirement : "STANDARD",
    bandwidthMbps: Number.isFinite(Number(parsed.bandwidthMbps)) ? Number(parsed.bandwidthMbps) : 200,
    matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
    usedDefaults: !!parsed.usedDefaults,
    source: "llm",
  };
}

