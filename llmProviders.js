import crypto from "crypto";

// ---- Encryption helpers (AES-256-GCM) ----
// Key is derived from LLM_KEY_ENCRYPTION_SECRET in .env (any length, any string).
function getEncryptionKey() {
  const secret = process.env.LLM_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "LLM_KEY_ENCRYPTION_SECRET is not set in .env — add a long random string there before saving provider keys."
    );
  }
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
  gemini: { label: "Google Gemini", defaultModel: "gemini-flash-latest" },
  groq: { label: "Groq", defaultModel: "openai/gpt-oss-20b" },
  openrouter: { label: "OpenRouter", defaultModel: "openai/gpt-4o-mini" },
};

// ---- Prompt ----
function buildPrompt(userText) {
  return `You are a network slice configuration assistant for a 5G/SDN dashboard.
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

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("LLM response did not contain a JSON object");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function normalize(parsed) {
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

// ---- Provider calls ----
async function callGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
}

async function callOpenAiCompatible(baseUrl, apiKey, model, prompt, extraHeaders = {}) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`${baseUrl} error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Provider returned no content");
  return text;
}

export async function parseIntentViaLLM(provider, apiKey, userText, model) {
  const prompt = buildPrompt(userText);
  const chosenModel = model || PROVIDERS[provider]?.defaultModel;
  let rawText;
  if (provider === "gemini") {
    rawText = await callGemini(apiKey, chosenModel, prompt);
  } else if (provider === "groq") {
    rawText = await callOpenAiCompatible("https://api.groq.com/openai/v1", apiKey, chosenModel, prompt);
  } else if (provider === "openrouter") {
    rawText = await callOpenAiCompatible("https://openrouter.ai/api/v1", apiKey, chosenModel, prompt, {
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "Network Slice Manager",
    });
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const parsed = extractJson(rawText);
  return normalize(parsed);
}
