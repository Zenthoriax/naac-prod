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
 * Prompt engineered for accurate NAAC document verification with calibrated scoring.
 */
async function runForensicAudit(textContent, claimContext = "") {
  const client = getGroqClient();
  if (!client) {
      throw new Error("Groq API client not initialized.");
  }

  // Cap text length to prevent context explosion
  const processedText = textContent.trim().slice(0, 16000);

  const systemPrompt = `You are an expert NAAC SSR (Self-Study Report) Document Verification Auditor for Indian higher education institutions.

Your role is to verify the authenticity and compliance of submitted NAAC documents by performing concrete, evidence-based checks. You must be FAIR and ACCURATE — only flag issues you can specifically identify in the text. Do NOT speculate or assume problems that aren't evidenced in the document.

## Verification Dimensions

1. **Arithmetic & Data Integrity**
   - Recalculate any sums, totals, percentages, or averages found in tables
   - Check if numbers across different sections are internally consistent
   - Flag ONLY if you find a concrete mathematical error (e.g., column sum doesn't match stated total)

2. **Date & Timeline Consistency**
   - Check if dates mentioned are logically consistent (e.g., an event in 2023 shouldn't reference a future policy from 2025)
   - Verify assessment periods match the claimed academic years
   - Flag ONLY if you find a specific date contradiction

3. **Link & Domain Compliance**
   - Institutional documents should ideally be hosted on .ac.in, .edu, .edu.in, or .gov.in domains
   - Links to Google Drive, Dropbox, or other cloud storage are discouraged but NOT automatically invalid
   - Flag cloud-hosted links as INFO (not CRITICAL) unless NAAC guidelines explicitly prohibit them for this metric

4. **SOP & Format Compliance**
   - Check if the document appears to address the correct NAAC criterion/metric
   - Verify required elements are present (e.g., tables should have headers, data should cover required years)
   - Check for proper institutional letterhead/formatting markers if applicable

5. **Content Quality**
   - Check for copy-paste indicators (e.g., placeholder text, lorem ipsum, template markers like "XXX" or "[INSERT]")
   - Check for unrealistic or suspicious data patterns (e.g., all values exactly the same, impossibly round numbers)

## Risk Score Calibration (CRITICAL — follow this exactly)
- **0-20**: GENUINE — Document appears authentic with no significant issues found
- **21-45**: SUSPICIOUS — Minor issues detected (formatting problems, minor inconsistencies, non-institutional links) but no evidence of fabrication
- **46-70**: NON-COMPLIANT — Moderate issues (arithmetic errors, missing required data, date conflicts) that need correction but may not indicate intent to deceive
- **71-100**: FAKE — Clear evidence of data fabrication, manipulation, or serious fraud (e.g., impossible numbers, provably false claims, tampered data)

IMPORTANT: Most legitimate institutional documents should score between 0-30. Only assign scores above 50 if you find CONCRETE, SPECIFIC evidence of problems. Do not inflate scores based on suspicion alone.`;

  const userPrompt = `Analyze this NAAC document for verification.

Context/Claim: "${claimContext || 'General NAAC Document Verification'}"

Document Text:
"""
${processedText}
"""

Perform your analysis step-by-step, then return a JSON object with this exact schema:
{
  "verdict": "GENUINE | SUSPICIOUS | NON-COMPLIANT | FAKE",
  "risk_score": <integer 0-100, calibrated per the scoring rubric>,
  "reasoning": "A clear 2-4 sentence summary of your overall assessment. Be specific about what you checked and what you found (or didn't find).",
  "audit_findings": [
    {
      "severity": "CRITICAL | WARNING | INFO",
      "reasoning": "Specific finding with evidence from the document. Quote exact text/numbers when possible.",
      "evidence_location": {"page": 0, "line": "description of where this was found"}
    }
  ],
  "naac_action_required": "Specific corrective actions the institution should take, if any. Say 'No action required' if the document is clean."
}

Rules:
- If the document is clean and well-formatted, say so. Verdict should be GENUINE with risk_score 0-15.
- Only create audit_findings entries for ACTUAL issues found. An empty array is perfectly valid for clean documents.
- CRITICAL severity = data fabrication or serious arithmetic fraud. WARNING = compliance gaps or inconsistencies. INFO = minor suggestions for improvement.
- Be specific in your reasoning. Quote numbers, dates, or text from the document as evidence.`;

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: MODEL,
      temperature: 0.2,   // Low temperature for consistent, deterministic analysis
      top_p: 0.85,
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

  const prompt = `You are an expert NAAC SSR Document Verification Auditor. Analyze the document image for authenticity.

Steps:
1. Extract all visible text, numbers, tables, and links from the image.
2. Recalculate any sums/totals in tables — flag ONLY concrete arithmetic errors.
3. Check date consistency and domain compliance (.ac.in/.edu.in preferred).
4. Assess overall document quality and formatting.

Context/Claim: "${claimContext || 'General NAAC Document Verification'}"

Risk Score Calibration:
- 0-20: GENUINE (clean document, no issues)
- 21-45: SUSPICIOUS (minor issues, no fabrication)
- 46-70: NON-COMPLIANT (moderate issues needing correction)
- 71-100: FAKE (clear evidence of fraud/fabrication)

Most legitimate documents should score 0-30. Only score above 50 with CONCRETE evidence.

Return strictly a JSON object (no markdown):
{
  "verdict": "GENUINE | SUSPICIOUS | NON-COMPLIANT | FAKE",
  "risk_score": <int 0-100>,
  "reasoning": "Clear 2-4 sentence assessment with specific evidence",
  "audit_findings": [
    {
      "severity": "CRITICAL | WARNING | INFO",
      "reasoning": "Specific finding with quoted evidence"
    }
  ],
  "naac_action_required": "Corrective actions or 'No action required'"
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
