"use strict";

const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { performAudit } = require("../src/api/auditor");

async function extractLinks(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text || "";
  const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\])\]]+/gi;
  const rawMatches = text.match(URL_REGEX) || [];
  
  const cleanUrl = (raw) => raw.replace(/[.,;:!?)"'>\]]+$/, "").trim();
  const cleaned = rawMatches.map(cleanUrl).filter(u => u.length > 10 && u.includes("."));
  
  const seen = new Set();
  const unique = cleaned.filter(u => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  return { 
    links: unique.map(url => ({ url })),
    metadata: {
      Title: data.info?.Title,
      Author: data.info?.Author,
      CreationDate: data.info?.CreationDate
    }
  };
}

async function runEndToEnd() {
  console.log("🚀 Running End-to-End Extraction & Audit on sample_ssr.pdf...\n");

  const pdfPath = path.join(__dirname, "../sample_ssr.pdf");
  if (!fs.existsSync(pdfPath)) {
    console.error("❌ sample_ssr.pdf not found!");
    return;
  }

  const buffer = fs.readFileSync(pdfPath);
  console.log("📄 PDF loaded, extracting links...");
  
  const { links, metadata } = await extractLinks(buffer);
  console.log(`🔗 Extracted ${links.length} unique links.\n`);

  console.log("🧐 AUDIT RESULTS:\n");
  
  // Audit the first 10 links for brevity in console
  const sampleLinks = links.slice(0, 10);
  
  const result = await performAudit({
    links: sampleLinks,
    metadata,
    context: { metricId: "SSR_GENERAL", docType: "Self Study Report" }
  });

  console.log(`VERDICT: ${result.verdict}`);
  console.log(`RISK SCORE: ${result.risk_score}`);
  console.log(`IS AUDIT READY: ${result.is_audit_ready}`);
  console.log(`ACTION: ${result.naac_action_required}\n`);

  console.log("FINDINGS:");
  result.audit_findings.forEach((f, i) => {
    console.log(`${i+1}. [${f.severity}] ${f.reasoning}`);
  });
}

runEndToEnd().catch(console.error);
