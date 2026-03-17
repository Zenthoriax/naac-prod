"use strict";

const { URL }   = require("url");
const https     = require("https");
const http      = require("http");
const { platformVerify } = require("./platform-verifiers");

/* ─────────────────────────────────────────────
   Azure AI Inference client — lazy init
   Works with Claude on Azure Marketplace via:
   https://<resource>.services.ai.azure.com/models
   ───────────────────────────────────────────── */
let _client = null;

function getClient() {
  if (_client) return _client;

  const endpoint = process.env.AZURE_AI_ENDPOINT;
  const apiKey   = process.env.AZURE_AI_KEY;

  if (!endpoint || !apiKey) return null;

  try {
    const { default: createClient } = require("@azure-rest/ai-inference");
    const { AzureKeyCredential }    = require("@azure/core-auth");
    _client = createClient(endpoint, new AzureKeyCredential(apiKey));
  } catch (err) {
    console.error("[Azure AI] Client init failed:", err.message);
    return null;
  }

  return _client;
}

const MODEL = () => process.env.AZURE_AI_MODEL || "claude-sonnet-4-5";

/* ─── Trusted domain registry ─── */
const TRUSTED = {
  "coursera.org":            "Coursera",
  "linkedin.com":            "LinkedIn",
  "nptel.ac.in":             "NPTEL (IIT/IISc)",
  "swayam.gov.in":           "SWAYAM (Govt. of India)",
  "swayamprabha.gov.in":     "SWAYAM Prabha",
  "udemy.com":               "Udemy",
  "edx.org":                 "edX",
  "mit.edu":                 "MIT",
  "ugc.ac.in":               "University Grants Commission",
  "ugcmoocs.inflibnet.ac.in":"UGC MOOCs",
  "inflibnet.ac.in":         "INFLIBNET",
  "aicte-india.org":         "AICTE",
  "aicte.ac.in":             "AICTE",
  "naac.gov.in":             "NAAC Official",
  "nirf.org":                "NIRF Rankings",
  "nba.ind.in":              "NBA (National Board of Accreditation)",
  "github.com":              "GitHub",
  "drive.google.com":        "Google Drive",
  "docs.google.com":         "Google Docs",
  "youtube.com":             "YouTube",
  "youtu.be":                "YouTube",
  "scopus.com":              "Scopus",
  "webofscience.com":        "Web of Science",
  "doi.org":                 "DOI Registry",
  "pubmed.ncbi.nlm.nih.gov": "PubMed",
  "springer.com":            "Springer",
  "link.springer.com":       "Springer",
  "elsevier.com":            "Elsevier",
  "sciencedirect.com":       "ScienceDirect (Elsevier)",
  "ieee.org":                "IEEE",
  "ieeexplore.ieee.org":     "IEEE Xplore",
  "acm.org":                 "ACM Digital Library",
  "dl.acm.org":              "ACM Digital Library",
  "wiley.com":               "Wiley",
  "tandfonline.com":         "Taylor & Francis",
  "mdpi.com":                "MDPI",
  "researchgate.net":        "ResearchGate",
  "academia.edu":            "Academia.edu",
  "patents.google.com":      "Google Patents",
  "ipindia.gov.in":          "IP India (Patents)",
};

/* ─── HTTP fetch helper ─── */
function fetchURL(rawUrl, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(rawUrl);
      const lib    = parsed.protocol === "https:" ? https : http;
      const req = lib.get(rawUrl, {
        headers: {
          "User-Agent":      "Mozilla/5.0 (compatible; NAAC-Verifier/2.0)",
          "Accept":          "text/html,application/xhtml+xml,*/*;q=0.9",
          "Accept-Language": "en-US,en;q=0.5",
        },
        timeout:            timeoutMs,
        rejectUnauthorized: false,
      }, (res) => {
        let body = "";
        res.on("data",  c => { body += c; if (body.length > 12000) res.destroy(); });
        res.on("end",   () => resolve({ ok: true, status: res.statusCode, headers: res.headers, body: body.slice(0, 12000) }));
        res.on("error", () => resolve({ ok: false, status: 0, body: "", headers: {} }));
      });
      req.on("timeout", () => { req.destroy(); resolve({ ok: false, status: 0, body: "TIMEOUT", headers: {} }); });
      req.on("error",  e  => resolve({ ok: false, status: 0, body: e.message, headers: {} }));
    } catch (e) {
      resolve({ ok: false, status: 0, body: e.message, headers: {} });
    }
  });
}

/* ─── SSL validity check ─── */
function checkSSL(hostname) {
  return new Promise((resolve) => {
    try {
      const req = https.request(
        { hostname, port: 443, method: "HEAD", rejectUnauthorized: true, timeout: 5000 },
        () => resolve({ valid: true })
      );
      req.on("error",   () => resolve({ valid: false }));
      req.on("timeout", () => { req.destroy(); resolve({ valid: false }); });
      req.end();
    } catch { resolve({ valid: false }); }
  });
}

/* ─── Claude AI analysis via Azure AI Inference ─── */
async function claudeAnalyze({ url, context, fetchResult, domainInfo, checks }) {
  const client = getClient();
  if (!client) return ruleBasedFallback({ url, fetchResult, domainInfo, checks });

  const stripped = (fetchResult?.body || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);

  const prompt = `You are an expert auditor for NAAC (National Assessment and Accreditation Council of India), verifying proof hyperlinks in an SSR (Self Study Report). Determine if this link is a genuine, independently verifiable proof.

URL: ${url}
SSR context: "${context || "Not specified"}"
HTTP status: ${fetchResult?.status ?? "unreachable"}
Domain: ${new URL(url).hostname}
Trusted domain: ${domainInfo ? `YES — ${domainInfo}` : "NO — not in known provider list"}
SSL valid: ${checks.sslValid ? "YES" : "NO"}

Page content (first 2500 chars, tags stripped):
"""
${stripped || "Could not fetch page content"}
"""

Rules:
- HTTP 404/error → FAKE (proof does not exist)
- Private/login-required page → SUSPICIOUS (cannot be independently verified)
- Domain is a lookalike (e.g. coursera.fake.com) → FAKE
- Certificate page with real name/course/date/ID → GENUINE
- DOI resolves to real publisher → GENUINE
- Placeholder or template content → FAKE or SUSPICIOUS

Respond with ONLY valid JSON (no markdown fences, no explanation):
{
  "verdict": "GENUINE|SUSPICIOUS|FAKE|UNREACHABLE",
  "riskScore": <integer 0-100>,
  "reasoning": "<2-4 clear sentences>",
  "redFlags": ["<specific issue>"]
}`;

  try {
    // Azure AI Inference SDK — same interface as OpenAI chat completions
    const response = await client.path("/chat/completions").post({
      body: {
        model:       MODEL(),
        messages:    [{ role: "user", content: prompt }],
        max_tokens:  512,
        temperature: 0,
      },
    });

    if (response.status !== "200") {
      throw new Error(`Azure AI returned status ${response.status}: ${JSON.stringify(response.body)}`);
    }

    const raw     = response.body.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed  = JSON.parse(cleaned);

    const VALID = new Set(["GENUINE", "SUSPICIOUS", "FAKE", "UNREACHABLE"]);
    if (!VALID.has(parsed.verdict)) throw new Error(`Bad verdict: ${parsed.verdict}`);

    return {
      verdict:   parsed.verdict,
      riskScore: Math.max(0, Math.min(100, parseInt(parsed.riskScore, 10) || 50)),
      reasoning: String(parsed.reasoning || ""),
      redFlags:  Array.isArray(parsed.redFlags) ? parsed.redFlags.map(String) : [],
    };
  } catch (err) {
    console.error("[Claude/Azure] Analysis error:", err.message);
    return ruleBasedFallback({ url, fetchResult, domainInfo, checks });
  }
}

/* ─── Rule-based fallback (no credentials or API error) ─── */
function ruleBasedFallback({ url, fetchResult, domainInfo, checks }) {
  const flags = [];
  let   score = 0;

  if (!fetchResult?.ok || (fetchResult?.status ?? 0) >= 400) {
    score += 42;
    flags.push(`URL returned HTTP ${fetchResult?.status || "error"} — page unreachable or not found`);
  }
  if (checks.isIPAddress)    { score += 30; flags.push("URL uses a raw IP address — highly suspicious"); }
  if (checks.isShortenedUrl) { score += 14; flags.push("Shortened URL hides the real destination"); }
  if (!domainInfo)           { score += 18; flags.push("Domain not in known legitimate provider list"); }
  if (!checks.sslValid)      { score += 12; flags.push("SSL certificate invalid or expired"); }

  if (url.includes("coursera.org/verify") &&
      (fetchResult?.status === 404 || (fetchResult?.body || "").toLowerCase().includes("not found"))) {
    score += 40;
    flags.push("Coursera certificate ID returns 404 — certificate does not exist");
  }

  score = Math.min(100, score);
  const verdict = !fetchResult?.ok
    ? "UNREACHABLE"
    : score >= 60 ? "FAKE"
    : score >= 28 ? "SUSPICIOUS"
    : "GENUINE";

  return {
    verdict,
    riskScore: score,
    reasoning: flags.length
      ? `Rule-based check flagged ${flags.length} issue(s). ${flags[0]}.`
      : "No issues detected. Domain is trusted and URL is reachable.",
    redFlags: flags,
  };
}

/* ─── Express route handler ─── */
module.exports = async function verifyHandler(req, res) {
  const { url, context: claimContext } = req.body || {};

  if (!url || typeof url !== "string")
    return res.status(400).json({ error: "url (string) is required" });

  if (url.length > 2048)
    return res.status(400).json({ error: "URL too long (max 2048 chars)" });

  /* Validate URL format */
  let parsed;
  try {
    parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return res.json({
      url, claimContext: claimContext || "",
      verdict: "FAKE", riskScore: 85,
      aiReasoning: "Malformed or non-HTTP URL — strong indicator of a fabricated link.",
      redFlags: ["Malformed or non-HTTP URL"],
      checks: { reachable: false, validUrl: false, trustedDomain: false, sslValid: false },
      meta: { verifiedBy: "validation" },
    });
  }

  const hostname = parsed.hostname;

  /* Parallel: HTTP fetch + SSL check */
  const [fetchResult, sslResult] = await Promise.all([
    fetchURL(url),
    parsed.protocol === "https:" ? checkSSL(hostname) : Promise.resolve({ valid: false }),
  ]);

  /* Domain trust lookup */
  const bare       = hostname.replace(/^www\./, "");
  const base2      = bare.split(".").slice(-2).join(".");
  const domainInfo = TRUSTED[bare] || TRUSTED[base2] || null;

  const checks = {
    reachable:     fetchResult.ok && fetchResult.status < 400,
    httpOk:        fetchResult.ok && fetchResult.status === 200,
    trustedDomain: !!domainInfo,
    sslValid:      sslResult.valid,
    isIPAddress:   /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname),
    isShortenedUrl:/bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly/i.test(hostname),
  };

  /* Platform-specific verifier first (Coursera, NPTEL, DOI, Drive, GitHub, LinkedIn) */
  const platform = await platformVerify(url);

  let analysis;
  if (platform) {
    analysis = {
      verdict:   platform.verdict,
      riskScore: platform.riskScore,
      reasoning: platform.reasoning,
      redFlags:  platform.redFlags || [],
    };
    Object.assign(checks, platform.checks || {});
  } else {
    analysis = await claudeAnalyze({ url, context: claimContext, fetchResult, domainInfo, checks });
  }

  const aiEnabled = !!getClient();

  return res.json({
    url,
    claimContext:  claimContext || "",
    verdict:       analysis.verdict,
    riskScore:     analysis.riskScore,
    aiReasoning:   analysis.reasoning,
    redFlags:      analysis.redFlags,
    checks,
    meta: {
      httpStatus:  fetchResult.status,
      domain:      hostname,
      domainInfo:  domainInfo || null,
      platform:    platform?.platform || null,
      verifiedBy:  platform ? "platform-specific" : (aiEnabled ? "claude-ai" : "rule-based"),
      model:       (!platform && aiEnabled) ? MODEL() : null,
    },
  });
};
