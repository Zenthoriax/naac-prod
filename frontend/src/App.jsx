import { useState, useRef, useCallback, useEffect } from "react";

const API = "/api";

/* ════════════════════════════════════════════
   DEMO DATA
════════════════════════════════════════════ */
const DEMO = [
  {
    url: "https://www.coursera.org/verify/FAKE9XK28PLR",
    claimContext: "Student completed Machine Learning by Stanford University on Coursera",
    verdict: "FAKE", riskScore: 93,
    aiReasoning: "Coursera certificate ID 'FAKE9XK28PLR' returns HTTP 404. This ID does not exist in Coursera's database — the credential is fabricated. Certificate format looks plausible but the verification ID is invalid.",
    redFlags: ["Certificate ID not found in Coursera database (HTTP 404)", "Coursera verification endpoint confirms ID is invalid", "Certificate cannot be independently verified"],
    checks: { reachable: false, trustedDomain: true, sslValid: true, certificateExists: false },
    meta: { platform: "Coursera", verifiedBy: "platform-specific", httpStatus: 404 },
  },
  {
    url: "https://nptel.ac.in/noc/Ecertificate/?q=noc23_cs47_1872643",
    claimContext: "Faculty completed Data Structures & Algorithms — IIT Madras via NPTEL",
    verdict: "GENUINE", riskScore: 7,
    aiReasoning: "NPTEL certificate URL resolves on archive.nptel.ac.in. Page confirms course completion with learner name, course title, and score visible. Roll number corresponds to a valid NPTEL record.",
    redFlags: [],
    checks: { reachable: true, trustedDomain: true, sslValid: true, contentValid: true },
    meta: { platform: "NPTEL", verifiedBy: "platform-specific", httpStatus: 200 },
  },
  {
    url: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE/view",
    claimContext: "MOU signed with TCS Ltd. for industry collaboration 2023-24",
    verdict: "SUSPICIOUS", riskScore: 62,
    aiReasoning: "Google Drive file is private and requires login to access. NAAC peer teams cannot verify private Drive links. The college must change sharing to 'Anyone with the link can view' for this to be accepted as valid proof.",
    redFlags: ["File requires Google account login — not publicly accessible", "NAAC assessors cannot verify private Drive links", "Action required: change link sharing to public"],
    checks: { accessible: false, requiresLogin: true, publiclyShared: false, trustedDomain: true },
    meta: { platform: "Google Drive", verifiedBy: "platform-specific", httpStatus: 200 },
  },
  {
    url: "https://doi.org/10.1016/j.fake.2023.01.999",
    claimContext: "Research paper in Elsevier International Journal of Computer Science, 2023",
    verdict: "FAKE", riskScore: 88,
    aiReasoning: "DOI 10.1016/j.fake.2023.01.999 does not resolve. A published paper's DOI must always redirect to the publisher. Journal code 'j.fake' is not a real Elsevier journal — this DOI is entirely fabricated.",
    redFlags: ["DOI does not resolve — likely fabricated", "'j.fake' is not a real Elsevier journal identifier", "No redirect to any known publisher"],
    checks: { validFormat: true, resolves: false, trustedDomain: true },
    meta: { platform: "DOI", verifiedBy: "platform-specific", httpStatus: 404 },
  },
  {
    url: "http://192.168.1.45/certificates/student_cert_2024.pdf",
    claimContext: "Certificate of participation in national level hackathon",
    verdict: "FAKE", riskScore: 98,
    aiReasoning: "URL uses a private LAN IP address (192.168.1.45) — completely inaccessible to anyone outside the college network. No NAAC assessor can ever reach this address. This is a deliberate fabrication technique.",
    redFlags: ["Private IP address — inaccessible outside local network", "No external assessor can ever verify this URL", "Classic proof fabrication technique"],
    checks: { reachable: false, isIPAddress: true, trustedDomain: false, sslValid: false },
    meta: { platform: null, verifiedBy: "rule-based", httpStatus: 0 },
  },
  {
    url: "https://swayam.gov.in/certificate/download?id=2024-CS-47823",
    claimContext: "Faculty completed SWAYAM MOOC — Introduction to Artificial Intelligence (8 weeks)",
    verdict: "GENUINE", riskScore: 8,
    aiReasoning: "SWAYAM certificate URL resolves on swayam.gov.in (Government of India official MOOC platform). Page confirms course completion with valid certificate ID and faculty name.",
    redFlags: [],
    checks: { reachable: true, trustedDomain: true, sslValid: true, contentValid: true },
    meta: { platform: "SWAYAM", verifiedBy: "platform-specific", httpStatus: 200 },
  },
  {
    url: "https://www.linkedin.com/learning/certificates/abc123def456ghi789",
    claimContext: "Staff completed Leadership and Management Certificate — LinkedIn Learning",
    verdict: "SUSPICIOUS", riskScore: 28,
    aiReasoning: "LinkedIn renders content via JavaScript and cannot be fully verified automatically. URL is reachable and the domain is legitimate, but certificate content cannot be confirmed without a browser. Manual review by the verification committee is required.",
    redFlags: ["LinkedIn requires JS rendering — automated verification not possible", "Manual committee review required for this certificate"],
    checks: { reachable: true, fullyVerifiable: false, trustedDomain: true },
    meta: { platform: "LinkedIn", verifiedBy: "platform-specific", httpStatus: 200 },
  },
  {
    url: "https://github.com/dept-cs/final-year-ai-project-2024",
    claimContext: "B.Tech Final Year Project — AI-based Crop Disease Detection System",
    verdict: "GENUINE", riskScore: 11,
    aiReasoning: "GitHub repository exists and is publicly accessible. Contains 5 months of commits, a README describing the project, and source code consistent with a final year AI project.",
    redFlags: [],
    checks: { exists: true, isPublic: true, trustedDomain: true, sslValid: true },
    meta: { platform: "GitHub", verifiedBy: "platform-specific", httpStatus: 200 },
  },
];

/* ════════════════════════════════════════════
   CONSTANTS & HELPERS
════════════════════════════════════════════ */
const VC = {
  GENUINE:     { color: "#16a34a", light: "#dcfce7", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓", label: "GENUINE" },
  SUSPICIOUS:  { color: "#d97706", light: "#fef3c7", bg: "#fffbeb", border: "#fde68a", icon: "⚠", label: "SUSPICIOUS" },
  FAKE:        { color: "#dc2626", light: "#fee2e2", bg: "#fef2f2", border: "#fecaca", icon: "✕", label: "FAKE" },
  UNREACHABLE: { color: "#6b7280", light: "#f3f4f6", bg: "#f9fafb", border: "#e5e7eb", icon: "◌", label: "UNREACHABLE" },
  PENDING:     { color: "#2563eb", light: "#dbeafe", bg: "#eff6ff", border: "#bfdbfe", icon: "…", label: "CHECKING" },
};

const PLATFORM_ICONS = {
  "Coursera": "🎓", "NPTEL": "🏛️", "SWAYAM": "🇮🇳", "DOI": "📄",
  "Google Drive": "📁", "GitHub": "💻", "LinkedIn": "💼",
};

/* ════════════════════════════════════════════
   SMALL COMPONENTS
════════════════════════════════════════════ */
function VerdictBadge({ verdict, size = "md" }) {
  const c = VC[verdict] || VC.PENDING;
  const pad = size === "sm" ? "2px 8px" : "3px 12px";
  const fs  = size === "sm" ? 11 : 12;
  return (
    <span style={{
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 20, padding: pad,
      fontSize: fs, fontWeight: 700,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span>{c.icon}</span> {c.label}
    </span>
  );
}

function RiskBar({ score }) {
  const color = score < 35 ? "#16a34a" : score < 65 ? "#d97706" : "#dc2626";
  const label = score < 35 ? "Low" : score < 65 ? "Medium" : "High";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 6, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 700, minWidth: 70 }}>{score}/100 · {label}</span>
    </div>
  );
}

function Pill({ children, color = "#6b7280", bg = "#f3f4f6" }) {
  return (
    <span style={{
      background: bg, color, border: `1px solid ${color}30`,
      borderRadius: 4, padding: "2px 8px",
      fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
    }}>
      {children}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} title="Copy URL" style={{
      background: "none", border: "1px solid #e5e7eb", borderRadius: 4,
      padding: "2px 8px", cursor: "pointer", fontSize: 10,
      color: copied ? "#16a34a" : "#9ca3af",
      transition: "all 0.15s", flexShrink: 0,
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

/* ════════════════════════════════════════════
   LINK CARD
════════════════════════════════════════════ */
function LinkCard({ item, idx }) {
  const [open, setOpen] = useState(false);
  const isPending = item.verdict === "PENDING";
  const c = VC[item.verdict] || VC.PENDING;

  const cardBorder = {
    FAKE:        "border-left: 4px solid #dc2626",
    SUSPICIOUS:  "border-left: 4px solid #d97706",
    GENUINE:     "border-left: 4px solid #16a34a",
    UNREACHABLE: "border-left: 4px solid #9ca3af",
    PENDING:     "border-left: 4px solid #93c5fd",
  }[item.verdict] || "";

  const borderColor = {
    FAKE: "#dc2626", SUSPICIOUS: "#d97706",
    GENUINE: "#16a34a", UNREACHABLE: "#9ca3af", PENDING: "#93c5fd",
  }[item.verdict] || "#e5e7eb";

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: "0 8px 8px 0",
      marginBottom: 8,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {/* Header row */}
      <div
        onClick={() => !isPending && setOpen(o => !o)}
        style={{
          padding: "12px 16px", cursor: isPending ? "default" : "pointer",
          display: "flex", alignItems: "flex-start", gap: 12,
          userSelect: "none",
        }}
      >
        {/* Index */}
        <span style={{
          color: "#9ca3af", fontSize: 11, fontFamily: "monospace",
          minWidth: 28, paddingTop: 3, flexShrink: 0,
        }}>
          #{String(idx + 1).padStart(2, "0")}
        </span>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <VerdictBadge verdict={item.verdict} size="sm" />
            {!isPending && item.riskScore !== undefined && <RiskBar score={item.riskScore} />}
            {item.meta?.platform && (
              <Pill color="#4b5563" bg="#f9fafb">
                {PLATFORM_ICONS[item.meta.platform] || "🔗"} {item.meta.platform}
              </Pill>
            )}
            {item.meta?.verifiedBy === "platform-specific" && (
              <Pill color="#7c3aed" bg="#f5f3ff">✓ Deep check</Pill>
            )}
            {item.meta?.verifiedBy === "claude-ai" && (
              <Pill color="#0369a1" bg="#f0f9ff">⬡ Claude AI</Pill>
            )}
          </div>

          {/* URL */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "monospace", fontSize: 11, color: "#2563eb",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flex: 1, minWidth: 0,
            }}>
              {item.url}
            </span>
            <CopyButton text={item.url} />
            <a
              href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="Open URL in new tab"
              style={{
                background: "none", border: "1px solid #e5e7eb", borderRadius: 4,
                padding: "2px 8px", cursor: "pointer", fontSize: 10,
                color: "#9ca3af", textDecoration: "none", flexShrink: 0,
              }}
            >
              Open ↗
            </a>
          </div>

          {/* Context */}
          {item.claimContext && (
            <div style={{
              fontSize: 11, color: "#6b7280", marginTop: 4,
              fontStyle: "italic",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              SSR context: "{item.claimContext.slice(0, 120)}{item.claimContext.length > 120 ? "…" : ""}"
            </div>
          )}
        </div>

        {/* Chevron / spinner */}
        <div style={{ flexShrink: 0, paddingTop: 4 }}>
          {isPending ? (
            <span style={{ color: "#2563eb", fontSize: 14, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
          ) : (
            <span style={{
              color: "#9ca3af", fontSize: 14,
              display: "inline-block",
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}>▾</span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{ background: "#fafafa", borderTop: "1px solid #f3f4f6", padding: "14px 16px 16px 60px" }}>

          {/* AI Reasoning */}
          {item.aiReasoning && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                AI Analysis
              </div>
              <div style={{
                background: "#fff", border: "1px solid #e5e7eb",
                borderLeft: `3px solid ${c.color}`,
                borderRadius: "0 6px 6px 0",
                padding: "10px 14px",
                fontSize: 13, color: "#374151", lineHeight: 1.6,
              }}>
                {item.aiReasoning}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {item.redFlags?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Issues Found
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {item.redFlags.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 6, padding: "6px 10px",
                    fontSize: 12, color: "#991b1b",
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>⚑</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical checks */}
          {item.checks && Object.keys(item.checks).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Technical Checks
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(item.checks).filter(([, v]) => typeof v === "boolean").map(([k, v]) => (
                  <span key={k} style={{
                    background: v ? "#f0fdf4" : "#fef2f2",
                    color: v ? "#16a34a" : "#dc2626",
                    border: `1px solid ${v ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: 4, padding: "2px 8px",
                    fontSize: 10, fontFamily: "monospace",
                  }}>
                    {v ? "✓" : "✕"} {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          {item.meta && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              {item.meta.httpStatus !== undefined && (
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>
                  HTTP {item.meta.httpStatus}
                </span>
              )}
              {item.meta.domain && (
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>
                  {item.meta.domain}
                </span>
              )}
              {item.meta.model && (
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>
                  model: {item.meta.model}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   SUMMARY PANEL
════════════════════════════════════════════ */
function SummaryPanel({ results }) {
  const cnt   = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  const n     = results.length;
  const risk  = n > 0 ? Math.round((((cnt.FAKE || 0) * 100 + (cnt.SUSPICIOUS || 0) * 50 + (cnt.UNREACHABLE || 0) * 20) / (n * 100)) * 100) : 0;
  const hasFake  = (cnt.FAKE || 0) > 0;
  const hasSusp  = (cnt.SUSPICIOUS || 0) > 0;
  const verdict  = hasFake ? "HIGH RISK" : hasSusp ? "MODERATE RISK" : "LOW RISK";
  const vColor   = hasFake ? "#dc2626"   : hasSusp ? "#d97706"       : "#16a34a";
  const vBg      = hasFake ? "#fef2f2"   : hasSusp ? "#fffbeb"       : "#f0fdf4";
  const vBorder  = hasFake ? "#fecaca"   : hasSusp ? "#fde68a"       : "#bbf7d0";

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 10, padding: 20, marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Overall Assessment
          </div>
          <div style={{
            display: "inline-block",
            background: vBg, color: vColor, border: `1px solid ${vBorder}`,
            borderRadius: 8, padding: "6px 16px",
            fontSize: 18, fontWeight: 900, letterSpacing: "0.03em",
          }}>
            {verdict}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
            {n} link{n !== 1 ? "s" : ""} audited
            {hasFake && ` · ${cnt.FAKE} fake credential${cnt.FAKE !== 1 ? "s" : ""} found`}
            {hasSusp && ` · ${cnt.SUSPICIOUS} item${cnt.SUSPICIOUS !== 1 ? "s" : ""} need manual review`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Risk Score</div>
          <RiskBar score={risk} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Genuine",     count: cnt.GENUINE || 0,     color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Suspicious",  count: cnt.SUSPICIOUS || 0,  color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: "Fake",        count: cnt.FAKE || 0,        color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: "Unreachable", count: cnt.UNREACHABLE || 0, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`,
            borderRadius: 8, padding: "12px 8px", textAlign: "center",
          }}>
            <div style={{ color, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{count}</div>
            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Attention list */}
      {(hasFake || hasSusp) && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            ⚑ Requires Attention ({(cnt.FAKE || 0) + (cnt.SUSPICIOUS || 0)} items)
          </div>
          {results.filter(r => r.verdict === "FAKE" || r.verdict === "SUSPICIOUS").map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "4px 0", borderBottom: i < (cnt.FAKE + cnt.SUSPICIOUS - 1) ? "1px solid #fecaca" : "none",
            }}>
              <VerdictBadge verdict={r.verdict} size="sm" />
              <span style={{
                fontSize: 11, fontFamily: "monospace", color: "#6b7280",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
              }}>
                {r.url}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════ */
export default function App() {
  const [mode,      setMode]      = useState("upload");
  const [file,      setFile]      = useState(null);
  const [textIn,    setTextIn]    = useState("");
  const [urlIn,     setUrlIn]     = useState("");
  const [status,    setStatus]    = useState("idle");
  const [results,   setResults]   = useState([]);
  const [prog,      setProg]      = useState({ n: 0, total: 0, cur: "" });
  const [errMsg,    setErrMsg]    = useState("");
  const [drag,      setDrag]      = useState(false);
  const [filter,    setFilter]    = useState("ALL");
  const [docName,   setDocName]   = useState("");
  const [exporting, setExporting] = useState(false);
  const [health,    setHealth]    = useState(null);
  const fileRef  = useRef();
  const abortRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setFile(f); setDocName(f.name); }
  }, []);

  const cancelAudit = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("done");
  };

  /* ── Demo ── */
  const runDemo = () => {
    setStatus("verifying"); setResults([]); setDocName("DEMO — Sample SSR Document"); setFilter("ALL");
    setProg({ n: 0, total: DEMO.length, cur: "" });
    DEMO.forEach((item, i) => setTimeout(() => {
      setProg({ n: i + 1, total: DEMO.length, cur: item.url });
      setResults(p => [...p, item]);
      if (i === DEMO.length - 1) setStatus("done");
    }, i * 420));
  };

  /* ── Export ── */
  const exportReport = async () => {
    setExporting(true);
    try {
      const r = await fetch(`${API}/report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, documentName: docName || "SSR Document", generatedAt: new Date().toLocaleString("en-IN") }),
      });
      if (!r.ok) throw new Error("API error");
      const html = await r.text();
      dlBlob(html, "text/html", `naac-audit-${Date.now()}.html`);
    } catch { clientExport(); }
    finally { setExporting(false); }
  };

  const dlBlob = (content, type, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  };

  const clientExport = () => {
    const sorted = [...results].sort((a, b) =>
      ({ FAKE: 0, SUSPICIOUS: 1, UNREACHABLE: 2, GENUINE: 3 }[a.verdict] ?? 4) -
      ({ FAKE: 0, SUSPICIOUS: 1, UNREACHABLE: 2, GENUINE: 3 }[b.verdict] ?? 4)
    );
    const cnt = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
    const vc  = (cnt.FAKE || 0) > 0 ? "#dc2626" : (cnt.SUSPICIOUS || 0) > 0 ? "#d97706" : "#16a34a";
    const vt  = (cnt.FAKE || 0) > 0 ? "HIGH RISK" : (cnt.SUSPICIOUS || 0) > 0 ? "MODERATE RISK" : "LOW RISK";
    const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const CC  = { GENUINE: "#16a34a", SUSPICIOUS: "#d97706", FAKE: "#dc2626", UNREACHABLE: "#6b7280" };

    const rows = sorted.map((r, i) => `
      <tr style="border-bottom:1px solid #e5e7eb;vertical-align:top">
        <td style="padding:10px 8px;color:#9ca3af;font-family:monospace;font-size:11px">#${String(i + 1).padStart(2, "0")}</td>
        <td style="padding:10px 8px">
          <span style="color:${CC[r.verdict]||"#6b7280"};font-weight:700;font-size:11px">${r.verdict}</span>
          ${r.meta?.platform ? `<span style="color:#6b7280;font-size:10px;margin-left:8px">${esc(r.meta.platform)}</span>` : ""}
          <div style="font-family:monospace;font-size:10px;color:#2563eb;margin-top:3px;word-break:break-all">${esc(r.url)}</div>
          ${r.claimContext ? `<div style="font-size:10px;color:#6b7280;font-style:italic;margin-top:2px">"${esc(r.claimContext.slice(0, 100))}"</div>` : ""}
        </td>
        <td style="padding:10px 8px;text-align:center;font-weight:700;font-size:14px;color:${(r.riskScore || 0) >= 60 ? "#dc2626" : (r.riskScore || 0) >= 30 ? "#d97706" : "#16a34a"}">${r.riskScore ?? "-"}</td>
        <td style="padding:10px 8px;font-size:11px;color:#374151;line-height:1.5">
          ${esc(r.aiReasoning || "")}
          ${(r.redFlags || []).map(f => `<div style="color:#dc2626;font-size:10px;margin-top:3px">⚑ ${esc(f)}</div>`).join("")}
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>NAAC Audit Report</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f9fafb;padding:40px;color:#111}
@media print{body{background:#fff;padding:20px}.noprint{display:none}}</style></head><body>
<div style="max-width:900px;margin:0 auto">
<div style="border-bottom:3px solid #dc2626;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:flex-end">
  <div>
    <div style="font-size:10px;color:#dc2626;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">NAAC SSR VERIFIER v2.0</div>
    <h1 style="font-size:22px;font-weight:900;color:#111">Proof Authenticity Audit Report</h1>
    <div style="color:#6b7280;font-size:12px;margin-top:4px">${esc(docName || "SSR Document")} · ${new Date().toLocaleString("en-IN")}</div>
  </div>
  <div style="background:${vc}18;color:${vc};border:1px solid ${vc}44;border-radius:8px;padding:8px 16px;font-size:18px;font-weight:900">${vt}</div>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
${[["Genuine", cnt.GENUINE || 0, "#16a34a"], ["Suspicious", cnt.SUSPICIOUS || 0, "#d97706"], ["Fake", cnt.FAKE || 0, "#dc2626"], ["Unreachable", cnt.UNREACHABLE || 0, "#6b7280"]].map(([l, c, cl]) =>
  `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="color:${cl};font-size:26px;font-weight:900">${c}</div><div style="color:#6b7280;font-size:11px;margin-top:3px">${l}</div></div>`).join("")}
</div>
<button class="noprint" onclick="window.print()" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:8px 18px;cursor:pointer;font-size:12px;margin-bottom:16px">🖨 Print / Save as PDF</button>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
<thead><tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
<th style="padding:10px 8px;text-align:left;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.08em">#</th>
<th style="padding:10px 8px;text-align:left;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.08em">URL &amp; Context</th>
<th style="padding:10px 8px;text-align:center;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.08em">Risk</th>
<th style="padding:10px 8px;text-align:left;color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.08em">Analysis</th>
</tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
<span>NAAC SSR Verifier v2.0 · Powered by Azure AI (Claude)</span><span>For internal pre-submission review only</span></div>
</div></body></html>`;
    dlBlob(html, "text/html", `naac-audit-${Date.now()}.html`);
  };

  /* ── Audit ── */
  const runAudit = async () => {
    setStatus("extracting"); setResults([]); setErrMsg(""); setFilter("ALL");
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      let links = [];
      if (mode === "upload" && file) {
        const form = new FormData(); form.append("file", file);
        const r = await fetch(`${API}/extract`, { method: "POST", body: form, signal: ac.signal });
        if (!r.ok) { const d = await r.json().catch(() => ({ error: "Extract failed" })); throw new Error(d.error || `HTTP ${r.status}`); }
        const d = await r.json(); links = d.links || [];
        if (d.info?.title) setDocName(d.info.title);
      } else if (mode === "text") {
        const found = textIn.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) || [];
        links = [...new Set(found.map(u => u.replace(/[.,;:!?)\]]+$/, "")).filter(u => u.length > 8))].map(url => ({ url, context: "" }));
      } else if (mode === "url") {
        links = [{ url: urlIn.trim(), context: "Direct URL check" }];
      }

      if (links.length === 0) {
        setErrMsg("No hyperlinks found. Make sure the PDF has embedded (clickable) links, or paste text containing URLs.");
        setStatus("error"); return;
      }

      setProg({ n: 0, total: links.length, cur: "" }); setStatus("verifying");
      for (let i = 0; i < links.length; i++) {
        if (ac.signal.aborted) break;
        const { url, context } = links[i];
        setProg({ n: i + 1, total: links.length, cur: url });
        setResults(p => [...p, { url, claimContext: context, verdict: "PENDING" }]);
        try {
          const r = await fetch(`${API}/verify`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, context }), signal: ac.signal,
          });
          const d = await r.json();
          setResults(p => p.map(x => x.url === url ? { ...x, ...d } : x));
        } catch (err) {
          if (err.name === "AbortError") break;
          setResults(p => p.map(x => x.url === url ? {
            ...x, verdict: "UNREACHABLE", riskScore: 30,
            aiReasoning: "Network error — could not reach this URL during verification.",
            redFlags: ["Network error fetching URL"], checks: { reachable: false },
          } : x));
        }
      }
      setStatus("done"); abortRef.current = null;
    } catch (err) {
      if (err.name === "AbortError") { setStatus("done"); return; }
      setErrMsg(err.message); setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle"); setResults([]); setFile(null);
    setTextIn(""); setUrlIn(""); setErrMsg("");
    setFilter("ALL"); setDocName("");
    abortRef.current?.abort(); abortRef.current = null;
  };

  /* ── Derived state ── */
  const done    = results.filter(r => r.verdict !== "PENDING");
  const cnt     = done.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  const filt    = filter === "ALL" ? results : results.filter(r => r.verdict === filter);
  const sorted  = [...filt].sort((a, b) =>
    ({ FAKE: 0, SUSPICIOUS: 1, UNREACHABLE: 2, PENDING: 3, GENUINE: 4 }[a.verdict] ?? 5) -
    ({ FAKE: 0, SUSPICIOUS: 1, UNREACHABLE: 2, PENDING: 3, GENUINE: 4 }[b.verdict] ?? 5)
  );
  const canGo = (mode === "upload" && file) || (mode === "text" && textIn.trim()) || (mode === "url" && urlIn.trim());

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", color: "#111827", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── Top Nav ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 900 }}>
              ✓
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>NAAC SSR Verifier</div>
              <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1 }}>Proof Authenticity Audit · v2.0</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {health && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: health.ai?.enabled ? "#16a34a" : "#d97706", display: "inline-block" }} />
                {health.ai?.enabled ? `AI: ${health.ai.model}` : "AI: Rule-based mode"}
              </div>
            )}
            <span style={{ fontSize: 11, color: "#d1d5db", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, padding: "3px 8px" }}>
              Internal Use Only
            </span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

        {/* ════ IDLE ════ */}
        {status === "idle" && (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", padding: "32px 16px 28px", marginBottom: 20 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Verify SSR Proof Links
              </h1>
              <p style={{ color: "#6b7280", fontSize: 14, maxWidth: 520, margin: "0 auto 20px", lineHeight: 1.6 }}>
                Upload your SSR PDF, paste text, or check a single URL. Every hyperlink is verified with deep platform checks and Claude AI reasoning — catch fake certificates before submission.
              </p>
              <button
                onClick={runDemo}
                style={{
                  background: "#f3f4f6", color: "#374151",
                  border: "1px solid #d1d5db", borderRadius: 6,
                  padding: "7px 18px", cursor: "pointer", fontSize: 12,
                  fontWeight: 600, transition: "all 0.15s",
                }}
              >
                ▷ Try Demo  (see how it works — no upload needed)
              </button>
            </div>

            {/* Main input card */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", padding: 4, borderRadius: 8 }}>
                {[
                  { id: "upload", icon: "📎", label: "Upload PDF" },
                  { id: "text",   icon: "📝", label: "Paste Text" },
                  { id: "url",    icon: "🔗", label: "Single URL" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    style={{
                      flex: 1, padding: "8px 4px",
                      background: mode === tab.id ? "#fff" : "transparent",
                      color: mode === tab.id ? "#111827" : "#6b7280",
                      border: mode === tab.id ? "1px solid #e5e7eb" : "1px solid transparent",
                      borderRadius: 6, cursor: "pointer", fontSize: 12,
                      fontWeight: mode === tab.id ? 700 : 500,
                      boxShadow: mode === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Upload */}
              {mode === "upload" && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${drag ? "#dc2626" : file ? "#16a34a" : "#d1d5db"}`,
                    borderRadius: 10, padding: "40px 24px", textAlign: "center",
                    cursor: "pointer", background: drag ? "#fef2f2" : file ? "#f0fdf4" : "#fafafa",
                    marginBottom: 16, transition: "all 0.2s",
                  }}
                >
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setDocName(f.name); } }} />
                  {file ? (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                      <div style={{ color: "#16a34a", fontWeight: 700, fontSize: 14 }}>{file.name}</div>
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                      <div style={{ color: "#374151", fontWeight: 600, fontSize: 14 }}>Drop your SSR PDF here</div>
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>or click to browse · PDF only · max 20 MB</div>
                    </>
                  )}
                </div>
              )}

              {/* Text paste */}
              {mode === "text" && (
                <textarea
                  value={textIn} onChange={e => setTextIn(e.target.value)}
                  placeholder="Paste the full SSR document text, or just a list of URLs (one per line)…"
                  style={{
                    width: "100%", height: 180, background: "#fafafa",
                    border: "1px solid #d1d5db", borderRadius: 8,
                    color: "#111827", fontSize: 13, padding: "12px 14px",
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                    marginBottom: 16, fontFamily: "inherit", lineHeight: 1.5,
                  }}
                />
              )}

              {/* Single URL */}
              {mode === "url" && (
                <div style={{ marginBottom: 16 }}>
                  <input
                    value={urlIn} onChange={e => setUrlIn(e.target.value)}
                    placeholder="https://www.coursera.org/verify/XXXXXXXXXX"
                    onKeyDown={e => e.key === "Enter" && canGo && runAudit()}
                    style={{
                      width: "100%", background: "#fafafa",
                      border: "1px solid #d1d5db", borderRadius: 8,
                      color: "#111827", fontSize: 13, padding: "12px 14px",
                      outline: "none", boxSizing: "border-box", fontFamily: "monospace",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    Works with Coursera, NPTEL, SWAYAM, DOI links, GitHub, Google Drive, LinkedIn, and more
                  </div>
                </div>
              )}

              {/* Run button */}
              <button
                onClick={runAudit}
                disabled={!canGo}
                style={{
                  width: "100%", padding: "13px",
                  background: canGo ? "#dc2626" : "#f3f4f6",
                  color: canGo ? "#fff" : "#9ca3af",
                  border: "none", borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: canGo ? "pointer" : "default",
                  letterSpacing: "0.03em", transition: "all 0.2s",
                  boxShadow: canGo ? "0 2px 8px rgba(220,38,38,0.3)" : "none",
                }}
              >
                Run Verification Audit →
              </button>
            </div>

            {/* Feature cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { icon: "📋", title: "Extract Links", desc: "All hyperlinks pulled from PDF with surrounding context" },
                { icon: "🔍", title: "Deep Verify", desc: "Platform-specific checks: Coursera, NPTEL, SWAYAM, DOI, GitHub, Drive" },
                { icon: "🤖", title: "Claude AI", desc: "AI reads each page and reasons whether the proof is genuine or fabricated" },
                { icon: "📊", title: "Audit Report", desc: "Export a printable HTML report sorted by risk level" },
              ].map(f => (
                <div key={f.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Supported platforms */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Platforms with Deep Verification
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  ["Coursera",      "🎓"], ["NPTEL",         "🏛️"], ["SWAYAM",      "🇮🇳"],
                  ["DOI/Journals",  "📄"], ["Google Drive",  "📁"], ["GitHub",       "💻"],
                  ["LinkedIn",      "💼"], ["IEEE",          "⚡"], ["Scopus",       "🔬"],
                  ["Springer",      "📚"], ["Elsevier",      "📖"], ["PubMed",       "🧬"],
                  ["AICTE",         "🏫"], ["UGC",           "🎯"], ["NAAC",         "✅"],
                ].map(([label, icon]) => (
                  <span key={label} style={{ background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 500 }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════ EXTRACTING ════ */}
        {status === "extracting" && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "64px 24px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 44, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Extracting links from document…</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Parsing PDF and identifying all hyperlinks</div>
          </div>
        )}

        {/* ════ VERIFYING + DONE ════ */}
        {(status === "verifying" || status === "done") && (
          <>
            {/* Progress bar */}
            {status === "verifying" && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Verifying links…</span>
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 10 }}>{prog.n} of {prog.total} checked</span>
                  </div>
                  <button
                    onClick={cancelAudit}
                    style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    ✕ Cancel
                  </button>
                </div>
                <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${(prog.n / prog.total) * 100}%`, background: "linear-gradient(90deg, #dc2626, #f87171)", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  → {prog.cur}
                </div>
                {done.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {[["FAKE", "#dc2626", "#fef2f2", "#fecaca"], ["SUSPICIOUS", "#d97706", "#fffbeb", "#fde68a"], ["GENUINE", "#16a34a", "#f0fdf4", "#bbf7d0"]].map(([v, c, bg, border]) =>
                      (cnt[v] || 0) > 0 && (
                        <span key={v} style={{ background: bg, color: c, border: `1px solid ${border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                          {cnt[v]} {v}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary + toolbar */}
            {status === "done" && done.length > 0 && (
              <>
                <SummaryPanel results={done} />

                {/* Toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  {/* Filter tabs */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[
                      { key: "ALL",         label: `All (${results.length})`,               col: "#374151", bg: "#f3f4f6" },
                      { key: "FAKE",        label: `Fake (${cnt.FAKE || 0})`,               col: "#dc2626", bg: "#fef2f2" },
                      { key: "SUSPICIOUS",  label: `Suspicious (${cnt.SUSPICIOUS || 0})`,   col: "#d97706", bg: "#fffbeb" },
                      { key: "GENUINE",     label: `Genuine (${cnt.GENUINE || 0})`,         col: "#16a34a", bg: "#f0fdf4" },
                      { key: "UNREACHABLE", label: `Unreachable (${cnt.UNREACHABLE || 0})`, col: "#6b7280", bg: "#f9fafb" },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        style={{
                          padding: "5px 12px",
                          background: filter === f.key ? f.bg : "#fff",
                          color: f.col,
                          border: `1px solid ${filter === f.key ? f.col + "60" : "#e5e7eb"}`,
                          borderRadius: 20, cursor: "pointer", fontSize: 11,
                          fontWeight: filter === f.key ? 700 : 500,
                          opacity: (f.key !== "ALL" && (cnt[f.key] || 0) === 0) ? 0.4 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={exportReport}
                      disabled={exporting}
                      style={{
                        background: "#fff", color: exporting ? "#9ca3af" : "#374151",
                        border: "1px solid #d1d5db", borderRadius: 6,
                        padding: "6px 14px", cursor: exporting ? "default" : "pointer",
                        fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                      }}
                    >
                      {exporting ? "⟳ Exporting…" : "↓ Export Report"}
                    </button>
                    <button
                      onClick={reset}
                      style={{
                        background: "#fff", color: "#374151",
                        border: "1px solid #d1d5db", borderRadius: 6,
                        padding: "6px 14px", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      ← New Audit
                    </button>
                  </div>
                </div>

                {docName && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>
                    Document: {docName}
                  </div>
                )}
              </>
            )}

            {/* Cards */}
            {sorted.map((item, i) => <LinkCard key={`${item.url}-${i}`} item={item} idx={i} />)}
            {filt.length === 0 && filter !== "ALL" && status === "done" && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
                No {filter.toLowerCase()} links found.
              </div>
            )}
          </>
        )}

        {/* ════ ERROR ════ */}
        {status === "error" && (
          <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 12, padding: "48px 32px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{errMsg}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
              If the backend isn't deployed yet, use the demo to preview how the tool works.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={reset} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                ← Try Again
              </button>
              <button onClick={() => { reset(); setTimeout(runDemo, 50); }} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                ▷ Run Demo Instead
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "16px 24px", textAlign: "center", fontSize: 11, color: "#9ca3af", background: "#fff", marginTop: 32 }}>
        NAAC SSR Verifier v2.0 · Powered by Azure AI (Claude) · For internal pre-submission use only
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:hover:not(:disabled) { filter: brightness(0.95); }
        @media (max-width: 600px) {
          main { padding: 12px 10px !important; }
          header { padding: 0 12px !important; }
        }
      `}</style>
    </div>
  );
}
