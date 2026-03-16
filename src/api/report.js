"use strict";

module.exports = function reportHandler(req, res) {
  const { results, documentName, generatedAt } = req.body || {};

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "results array is required" });
  }

  const e   = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const cnt = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict]||0)+1; return a; }, {});
  const n   = results.length;
  const risk = n > 0 ? Math.round((((cnt.FAKE||0)*100 + (cnt.SUSPICIOUS||0)*50 + (cnt.UNREACHABLE||0)*25) / (n*100))*100) : 0;
  const overallVerdict = (cnt.FAKE||0)>0 ? "HIGH RISK" : (cnt.SUSPICIOUS||0)>0 ? "MODERATE RISK" : "LOW RISK";
  const vc = (cnt.FAKE||0)>0 ? "#ef4444" : (cnt.SUSPICIOUS||0)>0 ? "#f59e0b" : "#22c55e";

  const sorted = [...results].sort((a,b) => ({FAKE:0,SUSPICIOUS:1,UNREACHABLE:2,GENUINE:3}[a.verdict]??4) - ({FAKE:0,SUSPICIOUS:1,UNREACHABLE:2,GENUINE:3}[b.verdict]??4));

  const COLORS = { GENUINE:"#22c55e", SUSPICIOUS:"#f59e0b", FAKE:"#ef4444", UNREACHABLE:"#6b7280" };

  const badge = v => `<span style="color:${COLORS[v]||"#999"};font-weight:800;font-family:monospace;font-size:11px;">${v}</span>`;

  const rows = sorted.map((r,i) => `
  <tr style="border-bottom:1px solid #1a1a1a;vertical-align:top;">
    <td style="padding:12px 8px;color:#444;font-family:monospace;font-size:11px;">#${String(i+1).padStart(2,"0")}</td>
    <td style="padding:12px 8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        ${badge(r.verdict)}
        ${r.meta?.platform ? `<span style="background:#111;color:#555;font-family:monospace;font-size:9px;padding:1px 6px;border-radius:3px;">${e(r.meta.platform)}</span>` : ""}
        ${r.meta?.model ? `<span style="background:#0a1a0a;color:#22c55e44;font-family:monospace;font-size:9px;padding:1px 6px;border-radius:3px;">⬡ Claude</span>` : ""}
      </div>
      <div style="font-family:monospace;font-size:10px;color:#4a8fff;word-break:break-all;margin-bottom:3px;">${e(r.url)}</div>
      ${r.claimContext ? `<div style="font-size:10px;color:#444;font-style:italic;">"${e((r.claimContext||"").slice(0,120))}"</div>` : ""}
    </td>
    <td style="padding:12px 8px;text-align:center;">
      <span style="font-family:monospace;font-weight:700;font-size:14px;color:${(r.riskScore||0)>=60?"#ef4444":(r.riskScore||0)>=30?"#f59e0b":"#22c55e"};">${r.riskScore??"-"}</span>
      <div style="color:#333;font-size:9px;">/100</div>
    </td>
    <td style="padding:12px 8px;font-size:11px;color:#888;line-height:1.6;">
      ${e(r.aiReasoning||"")}
      ${(r.redFlags||[]).map(f=>`<div style="color:#ef4444;font-size:10px;margin-top:3px;">⚑ ${e(f)}</div>`).join("")}
    </td>
  </tr>`).join("");

  const attentionItems = sorted.filter(r => r.verdict==="FAKE"||r.verdict==="SUSPICIOUS");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>NAAC SSR Audit Report — ${e(documentName||"SSR Document")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#050505;color:#e0e0e0;font-family:'IBM Plex Sans',sans-serif;padding:40px 48px;line-height:1.5}
    @media print{body{background:#fff;color:#111;padding:20px} .noprint{display:none} table{page-break-inside:auto} tr{page-break-inside:avoid}}
    @media(max-width:700px){body{padding:20px} .grid4{grid-template-columns:repeat(2,1fr)!important}}
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom:2px solid #dc2626;padding-bottom:22px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;">
    <div>
      <div style="color:#dc2626;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:7px;font-family:'IBM Plex Mono',monospace;">⬡ NAAC SSR VERIFIER v2.0</div>
      <h1 style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.01em;">Proof Authenticity Audit Report</h1>
      <div style="color:#444;font-size:11px;margin-top:5px;font-family:'IBM Plex Mono',monospace;">
        ${e(documentName||"SSR Document")} &nbsp;·&nbsp; ${e(generatedAt||new Date().toLocaleString("en-IN"))}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="color:${vc};font-size:22px;font-weight:900;font-family:'IBM Plex Mono',monospace;">${overallVerdict}</div>
      <div style="color:#444;font-size:11px;margin-top:3px;">Overall Risk: ${risk}/100 · ${n} links audited</div>
    </div>
  </div>

  <!-- Stat grid -->
  <div class="grid4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;">
    ${[["Genuine",cnt.GENUINE||0,"#22c55e"],["Suspicious",cnt.SUSPICIOUS||0,"#f59e0b"],["Fake",cnt.FAKE||0,"#ef4444"],["Unreachable",cnt.UNREACHABLE||0,"#6b7280"]].map(([l,c,cl])=>`
    <div style="background:#0d0d0d;border:1px solid ${cl}22;border-radius:8px;padding:18px;text-align:center;">
      <div style="color:${cl};font-size:30px;font-weight:900;font-family:'IBM Plex Mono',monospace;">${c}</div>
      <div style="color:#444;font-size:11px;margin-top:3px;">${l}</div>
    </div>`).join("")}
  </div>

  <!-- Attention box -->
  ${attentionItems.length>0 ? `
  <div style="background:#1a0505;border:1px solid #ef444430;border-radius:8px;padding:18px;margin-bottom:28px;">
    <div style="color:#ef4444;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;margin-bottom:10px;">⚑ Requires Attention — ${attentionItems.length} Item${attentionItems.length!==1?"s":""}</div>
    ${attentionItems.map(r=>`
    <div style="padding:6px 0;border-bottom:1px solid #2a0808;display:flex;gap:10px;align-items:baseline;">
      <span style="color:${COLORS[r.verdict]};font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;min-width:88px;">${r.verdict}</span>
      <span style="color:#555;font-family:'IBM Plex Mono',monospace;font-size:10px;word-break:break-all;">${e((r.url||"").slice(0,90))}${(r.url||"").length>90?"…":""}</span>
    </div>`).join("")}
  </div>` : ""}

  <!-- Print button -->
  <button class="noprint" onclick="window.print()" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:8px 20px;cursor:pointer;font-size:11px;font-family:'IBM Plex Mono',monospace;margin-bottom:18px;">🖨  Print / Save as PDF</button>

  <!-- Results table -->
  <table style="width:100%;border-collapse:collapse;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#111;border-bottom:1px solid #1f1f1f;">
        <th style="padding:11px 8px;text-align:left;color:#383838;font-size:10px;letter-spacing:0.1em;font-family:'IBM Plex Mono',monospace;font-weight:400;">#</th>
        <th style="padding:11px 8px;text-align:left;color:#383838;font-size:10px;letter-spacing:0.1em;font-family:'IBM Plex Mono',monospace;font-weight:400;">URL &amp; Context</th>
        <th style="padding:11px 8px;text-align:center;color:#383838;font-size:10px;letter-spacing:0.1em;font-family:'IBM Plex Mono',monospace;font-weight:400;">Risk</th>
        <th style="padding:11px 8px;text-align:left;color:#383838;font-size:10px;letter-spacing:0.1em;font-family:'IBM Plex Mono',monospace;font-weight:400;">AI Analysis</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:16px;border-top:1px solid #111;display:flex;justify-content:space-between;color:#222;font-size:9px;font-family:'IBM Plex Mono',monospace;flex-wrap:wrap;gap:8px;">
    <span>Generated by NAAC SSR Verifier v2.0 · Powered by Anthropic Claude</span>
    <span>⚠ For internal pre-submission review only — not an official NAAC document</span>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="naac-audit-${Date.now()}.html"`);
  return res.send(html);
};
