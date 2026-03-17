const Groq = require("groq-sdk");
require("dotenv").config();

let groqClient = null;

function getGroqClient() {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[SECURITY] GROQ_API_KEY is missing. Falling back to simple regex checks.");
    return null;
  }

  groqClient = new Groq({ apiKey });
  return groqClient;
}

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Runs a forensic arithmetic and logic check against the text/PDF content.
 */
async function runForensicAudit(textContent, claimContext = "") {
  const client = getGroqClient();
  if (!client) {
      throw new Error("Groq API client not initialized.");
  }

  // Cap text length to prevent context explosion
  const processedText = textContent.trim().slice(0, 16000);

  const prompt = `You are JAIN SSR Verifier, a specialized NAAC DVV forensic auditor. Your operational philosophy is Zero-Trust.

Chain-of-Thought Protocol:
1. Extract: Identify all numbers, tables, and links/domains in the text.
2. Verify: Recalculate every sum in any table. Verify if any domain cited is NOT an institutional domain (.ac.in/.edu.in) and rely instead on unsafe cloud providers (Google Drive/Dropbox).
3. Detect: Look for date inconsistencies (e.g., claiming a 2021 report but dates show 2024).

Context/Claim: "${claimContext}"

Text to Audit:
"""
${processedText}
"""

Output Protocol:
Return strictly a JSON object (no markdown, no conversational filler) matching this schema:
{
  "verdict": "GENUINE | SUSPICIOUS | FAKE | NON-COMPLIANT",
  "risk_score": <int 0-100>,
  "reasoning": "Detailed forensic explanation",
  "audit_findings": [
    {
      "severity": "CRITICAL | WARNING | INFO",
      "reasoning": "Explanation",
      "evidence_location": {"page": 0, "line": "description"}
    }
  ]
}`;

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      temperature: 0,
      top_p: 0.1,
      seed: 420,
      response_format: { type: "json_object" },
    });

    const rawMsg = chatCompletion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawMsg);
    return parsed;
  } catch (err) {
    console.error("[Groq Audit Error]", err.message);
    throw err;
  }
}

/**
 * 2. Scanned PDF (Vision) Audit Route
 * Bypasses Node text extraction and sends base64 images straight to Llama Vision.
 */
async function runVisionAudit(base64Image, claimContext = "") {
  const client = getGroqClient();
  if (!client) {
      throw new Error("Groq API client not initialized.");
  }

  const VISION_MODEL = "llama-3.2-11b-vision-preview";

  const prompt = `You are JAIN SSR Verifier, a specialized NAAC DVV forensic auditor. Your operational philosophy is Zero-Trust.

Chain-of-Thought Protocol:
1. Extract: Extract the text visible in the document image provided.
2. Verify: Recalculate every sum in any table. Verify if any domain cited is NOT an institutional domain (.ac.in/.edu.in).
3. Detect: Look for date inconsistencies.

Context/Claim: "${claimContext}"

Output Protocol:
Return strictly a JSON object matching this schema (do NOT format as markdown, just raw JSON):
{
  "verdict": "GENUINE | SUSPICIOUS | FAKE | NON-COMPLIANT",
  "risk_score": 50,
  "reasoning": "Detailed forensic explanation",
  "audit_findings": [
    {
      "severity": "CRITICAL",
      "reasoning": "Explanation"
    }
  ]
}`;

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      model: VISION_MODEL,
      temperature: 0,
    });

    let rawMsg = chatCompletion.choices[0]?.message?.content || "{}";
    if (rawMsg.startsWith('\`\`\`json')) rawMsg = rawMsg.substring(7);
    if (rawMsg.startsWith('\`\`\`')) rawMsg = rawMsg.substring(3);
    if (rawMsg.endsWith('\`\`\`')) rawMsg = rawMsg.substring(0, rawMsg.length - 3);

    const parsed = JSON.parse(rawMsg.trim());
    return parsed;
  } catch (err) {
    console.error("[Groq Vision API Error]", err.message);
    throw err;
  }
}

module.exports = {
  runForensicAudit,
  runVisionAudit,
  MODEL
};
