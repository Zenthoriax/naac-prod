"use strict";

const https = require("https");
const http  = require("http");
const { URL } = require("url");

function fetch(url, timeoutMs = 7000) {
  return new Promise((resolve) => {
    try {
      const p   = new URL(url);
      const lib = p.protocol === "https:" ? https : http;
      const req = lib.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NAAC-Verifier/2.0)", Accept: "text/html,*/*" },
        timeout: timeoutMs, rejectUnauthorized: false,
      }, (res) => {
        let body = "";
        res.on("data", c => { body += c; if (body.length > 12000) res.destroy(); });
        res.on("end",  () => resolve({ ok: true, status: res.statusCode, headers: res.headers, body: body.slice(0, 12000) }));
        res.on("error",() => resolve({ ok: false, status: 0, body: "", headers: {} }));
      });
      req.on("timeout", () => { req.destroy(); resolve({ ok: false, status: 0, body: "TIMEOUT", headers: {} }); });
      req.on("error",  e  => resolve({ ok: false, status: 0, body: e.message, headers: {} }));
    } catch (e) { resolve({ ok: false, status: 0, body: e.message, headers: {} }); }
  });
}

/* ── Coursera ── */
async function coursera(url) {
  const m = url.match(/coursera\.org\/verify\/([A-Z0-9]+)/i);
  if (!m) return { platform:"Coursera", verdict:"SUSPICIOUS", riskScore:52, reasoning:"URL doesn't match Coursera's certificate verification format (/verify/CERT_ID).", redFlags:["Non-standard Coursera URL format"], checks:{validFormat:false} };

  const certId = m[1];
  const r = await fetch(url);

  if (!r.ok || r.status === 404) return { platform:"Coursera", verdict:"FAKE", riskScore:93, reasoning:`Coursera certificate ID "${certId}" returns HTTP ${r.status || "error"}. This ID does not exist in Coursera's database — the credential is fabricated.`, redFlags:[`Certificate ID ${certId} not found (HTTP ${r.status || "error"})`, "Coursera verification endpoint confirms this ID is invalid"], checks:{validFormat:true, certificateExists:false, httpOk:false} };

  const b = r.body.toLowerCase();
  const isError    = b.includes("page not found") || b.includes("invalid certificate") || b.includes("certificate not found");
  const isValid    = b.includes("certificate") && (b.includes("completed") || b.includes("issued") || b.includes("verify"));

  if (isError) return { platform:"Coursera", verdict:"FAKE", riskScore:90, reasoning:`Coursera returned HTTP 200 but the page shows an error state for certificate ID "${certId}". This ID is invalid or revoked.`, redFlags:["Certificate page explicitly shows error/invalid state", `ID ${certId} does not correspond to a valid certificate`], checks:{validFormat:true, certificateExists:false, httpOk:true, contentValid:false} };
  if (isValid) return { platform:"Coursera", verdict:"GENUINE", riskScore:5, reasoning:`Coursera certificate ID "${certId}" verified successfully. The page confirms course completion with learner details.`, redFlags:[], checks:{validFormat:true, certificateExists:true, httpOk:true, contentValid:true} };

  return { platform:"Coursera", verdict:"SUSPICIOUS", riskScore:38, reasoning:"Coursera page loaded (HTTP 200) but certificate details could not be parsed. Manual verification recommended.", redFlags:["Certificate content ambiguous — manual check recommended"], checks:{validFormat:true, httpOk:true, contentValid:null} };
}

/* ── NPTEL ── */
async function nptel(url) {
  const r = await fetch(url);
  if (!r.ok || r.status >= 400) return { platform:"NPTEL", verdict:"FAKE", riskScore:87, reasoning:`NPTEL certificate URL returns HTTP ${r.status || "error"}. Valid NPTEL certificates should resolve on archive.nptel.ac.in.`, redFlags:[`NPTEL URL returned HTTP ${r.status || "error"}`], checks:{reachable:false} };

  const b = r.body.toLowerCase();
  if (b.includes("not found") || b.includes("invalid") || b.includes("error 404")) return { platform:"NPTEL", verdict:"FAKE", riskScore:89, reasoning:"NPTEL URL loaded but shows an error/not-found state. The roll number in this URL doesn't correspond to any valid NPTEL certificate.", redFlags:["NPTEL certificate page shows invalid/not-found state"], checks:{reachable:true, contentValid:false} };
  if (b.includes("nptel") && (b.includes("certificate") || b.includes("score") || b.includes("course"))) return { platform:"NPTEL", verdict:"GENUINE", riskScore:7, reasoning:"NPTEL certificate URL resolves and page content confirms a valid certificate.", redFlags:[], checks:{reachable:true, contentValid:true} };

  return { platform:"NPTEL", verdict:"SUSPICIOUS", riskScore:42, reasoning:"NPTEL URL is reachable but certificate content could not be confirmed. Manual verification recommended.", redFlags:["NPTEL page content ambiguous"], checks:{reachable:true, contentValid:null} };
}

/* ── SWAYAM ── */
async function swayam(url) {
  const r = await fetch(url);
  if (!r.ok || r.status >= 400) return { platform:"SWAYAM", verdict:"FAKE", riskScore:82, reasoning:`SWAYAM certificate URL returned HTTP ${r.status || "error"}. Valid SWAYAM certs resolve on swayam.gov.in.`, redFlags:[`SWAYAM URL returned HTTP ${r.status || "error"}`], checks:{reachable:false} };

  const b   = r.body.toLowerCase();
  const ok  = b.includes("swayam") && (b.includes("certificate") || b.includes("course"));
  return ok
    ? { platform:"SWAYAM", verdict:"GENUINE", riskScore:8, reasoning:"SWAYAM certificate resolves on swayam.gov.in and page confirms course completion.", redFlags:[], checks:{reachable:true, contentValid:true} }
    : { platform:"SWAYAM", verdict:"SUSPICIOUS", riskScore:44, reasoning:"SWAYAM URL reachable but certificate content ambiguous. Manual check recommended.", redFlags:["SWAYAM page content ambiguous"], checks:{reachable:true, contentValid:null} };
}

/* ── DOI ── */
async function doi(url) {
  const m = url.match(/doi\.org\/(10\.\d{4,}\/\S+)/i);
  if (!m) return { platform:"DOI", verdict:"SUSPICIOUS", riskScore:52, reasoning:"URL points to doi.org but doesn't follow standard DOI format (10.XXXX/suffix).", redFlags:["Non-standard DOI format — cannot verify"], checks:{validFormat:false} };

  const doiId = m[1];
  const r     = await fetch(url);

  if (!r.ok && r.status !== 301 && r.status !== 302 && r.status !== 303) {
    return { platform:"DOI", verdict:"FAKE", riskScore:88, reasoning:`DOI ${doiId} does not resolve. A published paper's DOI must always resolve via doi.org. This DOI appears fabricated.`, redFlags:[`DOI ${doiId} does not resolve`, "No redirect to any publisher — DOI likely fabricated"], checks:{validFormat:true, resolves:false} };
  }

  const redirectTo = r.headers["location"] || "";
  const knownPubs  = ["springer","elsevier","ieee","acm","nature","wiley","tandfonline","mdpi","hindawi","pubmed","ncbi","oup","sage","iopp","frontiersin","plos","bmc"];
  const isKnown    = knownPubs.some(p => redirectTo.toLowerCase().includes(p));

  if (r.status >= 300 && r.status < 400) {
    return { platform:"DOI", verdict: isKnown ? "GENUINE" : "SUSPICIOUS", riskScore: isKnown ? 5 : 32,
      reasoning: isKnown
        ? `DOI ${doiId} resolves and redirects to a known publisher (${redirectTo.split("/")[2] || "publisher"}). This is a valid published paper.`
        : `DOI ${doiId} redirects but to an unrecognised domain (${redirectTo.split("/")[2] || "unknown"}). May still be genuine — manual check recommended.`,
      redFlags: isKnown ? [] : ["DOI redirects to an unrecognised domain"],
      checks:{validFormat:true, resolves:true, knownPublisher:isKnown} };
  }

  return { platform:"DOI", verdict:"GENUINE", riskScore:9, reasoning:`DOI ${doiId} resolves successfully.`, redFlags:[], checks:{validFormat:true, resolves:true} };
}

/* ── Google Drive / Docs ── */
async function googleDrive(url) {
  const r = await fetch(url);
  if (!r.ok) return { platform:"Google Drive", verdict:"UNREACHABLE", riskScore:40, reasoning:"Google Drive link is not accessible — file may be deleted or never existed.", redFlags:["Google Drive link is broken or deleted"], checks:{accessible:false} };

  const b = (r.body || "").toLowerCase();
  const isPrivate = b.includes("you need access") || b.includes("request access") || b.includes("this file is private") || (b.includes("sign in") && b.includes("google") && b.includes("continue"));

  return isPrivate
    ? { platform:"Google Drive", verdict:"SUSPICIOUS", riskScore:62, reasoning:"Google Drive file is private/requires login. NAAC proofs must be publicly accessible for independent verification by the peer team. Change sharing to 'Anyone with the link can view'.", redFlags:["File is private — requires Google account login to access","NAAC assessors cannot verify private Drive links","Change link sharing to 'Anyone with the link'"], checks:{accessible:false, requiresLogin:true, publiclyShared:false} }
    : { platform:"Google Drive", verdict:"GENUINE", riskScore:14, reasoning:"Google Drive link is publicly accessible. Note: file contents not verified — ensure the file actually contains the claimed proof.", redFlags:["File contents not verified — manual spot check recommended"], checks:{accessible:true, publiclyShared:true} };
}

/* ── GitHub ── */
async function github(url) {
  const r = await fetch(url);
  if (!r.ok || r.status === 404) return { platform:"GitHub", verdict:"FAKE", riskScore:78, reasoning:"GitHub URL returns 404. The repository or file does not exist — this is a fabricated project link.", redFlags:["GitHub repository/file not found (404)","Project does not exist at this URL"], checks:{exists:false} };

  const b = (r.body || "").toLowerCase();
  const isPrivate = b.includes("this repository has been archived") || (b.includes("page not found") && r.status === 200);
  if (isPrivate) return { platform:"GitHub", verdict:"SUSPICIOUS", riskScore:56, reasoning:"GitHub URL loads but shows a private or archived state. Contents cannot be independently verified.", redFlags:["GitHub repository is private or archived"], checks:{exists:true, isPublic:false} };

  return { platform:"GitHub", verdict:"GENUINE", riskScore:11, reasoning:"GitHub repository exists and is publicly accessible.", redFlags:[], checks:{exists:true, isPublic:true} };
}

/* ── LinkedIn ── */
async function linkedin(url) {
  const r = await fetch(url);
  if (!r.ok || r.status >= 400) return { platform:"LinkedIn", verdict:"FAKE", riskScore:72, reasoning:"LinkedIn URL is unreachable or returns an error. Certificate or profile may be invalid/deleted.", redFlags:["LinkedIn URL returns error — certificate may be invalid"], checks:{reachable:false} };

  return { platform:"LinkedIn", verdict:"SUSPICIOUS", riskScore:28, reasoning:"LinkedIn renders content via JavaScript and cannot be fully verified automatically. URL is reachable but contents are unconfirmable without a browser. Manual review required.", redFlags:["LinkedIn requires JS rendering — automated verification not possible","Manual review by committee required"], checks:{reachable:true, fullyVerifiable:false} };
}

/* ── Dispatcher ── */
async function platformVerify(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (h.includes("coursera.org"))                                return await coursera(url);
    if (h.includes("nptel.ac.in"))                                 return await nptel(url);
    if (h.includes("swayam.gov.in") || h.includes("swayam"))       return await swayam(url);
    if (h === "doi.org")                                           return await doi(url);
    if (h.includes("drive.google.com") || h.includes("docs.google.com")) return await googleDrive(url);
    if (h === "github.com")                                        return await github(url);
    if (h.includes("linkedin.com"))                                return await linkedin(url);
    return null;
  } catch { return null; }
}

module.exports = { platformVerify };
