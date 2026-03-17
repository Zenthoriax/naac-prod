"use strict";

const { URL } = require("url");

/**
 * JAIN SSR Auditor
 * Purpose: Zero-trust protocols to identify undetectable failures in NAAC SSR submissions.
 */

/* ─── Dimension 1: Arithmetic & Data Gravity (Forensics) ─── */
function auditArithmetic(data) {
  const findings = [];
  
  // Example: Cross-check Student numbers if present in different criteria
  // This is a placeholder for more complex reconciliation logic
  const studentMetrics = {
    c2_1: data.metrics?.["2.1.1"]?.value, // Number of students
    c5_2: data.metrics?.["5.2.1"]?.value, // Outgoing students
  };

  if (studentMetrics.c2_1 && studentMetrics.c5_2 && studentMetrics.c5_2 > studentMetrics.c2_1) {
    findings.push({
      finding_id: "ARITHMETIC_INCONSISTENCY_STUDENTS",
      severity: "CRITICAL",
      reasoning: "Critical Inconsistency: 'Outgoing Students' in Criterion 5.2 exceeds 'Total Students' in Criterion 2.1.",
      evidence_location: { page: 0, line_reference: "Cross-criteria reconciliation", coordinates: [0, 0] }
    });
  }

  // Table Recalculation: Decimal-level sum verification
  if (data.tables) {
    data.tables.forEach((table, idx) => {
      // Assuming table.rows[0] is header, and we check the last row for "Total"
      const rows = table.rows || [];
      if (rows.length < 3) return;
      
      const lastRow = rows[rows.length - 1];
      const dataRows = rows.slice(1, rows.length - 1);
      
      // Look for columns that seem to be summable
      for (let colIdx = 0; colIdx < (lastRow.length || 0); colIdx++) {
        const totalVal = parseFloat(lastRow[colIdx]?.replace(/[^0-9.]/g, ""));
        if (isNaN(totalVal)) continue;

        let sum = 0;
        dataRows.forEach(row => {
          const val = parseFloat(row[colIdx]?.replace(/[^0-9.]/g, ""));
          if (!isNaN(val)) sum += val;
        });

        // Check if sum matches total with precision tolerance
        if (Math.abs(sum - totalVal) > 0.01) {
          findings.push({
            finding_id: `ARITHMETIC_SUM_MISMATCH_T${idx}_C${colIdx}`,
            severity: "CRITICAL",
            reasoning: `Total Integrity Failure: Table ${idx+1}, Column ${colIdx+1} sum (${sum.toFixed(2)}) does not match reported total (${totalVal.toFixed(2)}). Possible manual manipulation.`,
            evidence_location: { page: table.page || 0, line_reference: `Table total row`, coordinates: [0, 0] }
          });
        }
      }
    });
  }

  return findings;
}

/* ─── Dimension 2: Link Protocol Enforcement ─── */
function auditLinks(links) {
  const findings = [];
  const CLOUD_STORAGE = ["drive.google.com", "dropbox.com", "onedrive.live.com", "s3.amazonaws.com"];

  links.forEach(link => {
    try {
      const url = new URL(link.url);
      const isCloud = CLOUD_STORAGE.some(domain => url.hostname.includes(domain));
      
      // Strict Institutional Domain Check
      const isInstitutional = url.hostname.endsWith(".ac.in") || url.hostname.endsWith(".edu") || url.hostname.endsWith(".edu.in") || url.hostname.endsWith(".gov.in");
      const isKnownTrusted = /coursera\.org|nptel\.ac\.in|swayam\.gov\.in|github\.com|linkedin\.com/i.test(url.hostname);

      if (isCloud) {
        findings.push({
          finding_id: "LINK_PROTOCOL_CLOUD_STORAGE",
          severity: "CRITICAL",
          reasoning: `Domain Lockdown: Link ${link.url} is hosted on a cloud storage provider. NAAC SOPs require documentation to be hosted on the institutional website domain.`,
          evidence_location: { page: link.page || 0, line_reference: link.url, coordinates: [0,0] }
        });
      } else if (!isInstitutional && !isKnownTrusted) {
        findings.push({
          finding_id: "LINK_PROTOCOL_EXTERNAL_DOMAIN",
          severity: "WARNING",
          reasoning: `Domain Lockdown: Link ${link.url} is hosted on a non-institutional domain. Peer teams prioritize .ac.in or .gov.in domains for verification.`,
          evidence_location: { page: link.page || 0, line_reference: link.url, coordinates: [0,0] }
        });
      }
    } catch (e) {
      // Invalid URL handled elsewhere
    }
  });

  return findings;
}

/* ─── Dimension 3: Visual & Metadata Tampering ─── */
function auditMetadata(metadata, claimYear) {
  const findings = [];
  
  if (metadata.CreationDate) {
    // Basic check for future creation dates or significant drift
    const createdDate = new Date(metadata.CreationDate);
    const now = new Date();
    
    if (createdDate > now) {
      findings.push({
        finding_id: "METADATA_FUTURE_DATE",
        severity: "CRITICAL",
        reasoning: `Metadata Drift: Document creation date (${metadata.CreationDate}) is in the future relative to current audit time. Likely a post-facto reconstruction or system clock tampering.`,
        evidence_location: { page: 1, line_reference: "PDF Metadata: CreationDate", coordinates: [0,0] }
      });
    }
    
    if (claimYear && createdDate.getFullYear() > claimYear + 1) {
       findings.push({
        finding_id: "METADATA_POST_FACTO",
        severity: "WARNING",
        reasoning: `Metadata Drift: Event claimed for ${claimYear} but document created in ${createdDate.getFullYear()}. High risk of post-facto reconstruction.`,
        evidence_location: { page: 1, line_reference: "PDF Metadata: CreationDate", coordinates: [0,0] }
      });
    }
  }

  return findings;
}

/* ─── Dimension 4: SOP Compliance ─── */
function auditSOP(metricId, docType) {
  const findings = [];
  // Expanded SOP 2025 mapping
  const SOP_2025 = {
    // 1. Curricular Aspects
    "1.1.1": ["Academic Calendar", "Syllabus Revision Proof"],
    "1.3.2": ["Experiential Learning Proof", "Internship Certificates"],
    // 2. Teaching-Learning and Evaluation
    "2.1.1": ["Admission List", "Category Wise Enrollment"],
    "2.1.2": ["Admission List", "Seat Reservation Proof"],
    "2.4.1": ["Faculty List", "Appointment Letters"],
    // 3. Research, Innovations and Extension
    "3.1.1": ["Seed Money Proof", "Policy Document"],
    "3.4.3": ["Journal Indexing Proof", "DOI Verification"],
    // 4. Infrastructure and Learning Resources
    "4.1.1": ["Geo-tagged Photos", "Stock Register"],
    "4.2.1": ["ILMS Usage Report", "Library Audit"],
    // 5. Student Support and Progression
    "5.1.1": ["Scholarship Policy", "Beneficiary List"],
    "5.2.1": ["Placement Orders", "Student Progression List"],
    // 6. Governance, Leadership and Management
    "6.2.2": ["Organogram", "E-Governance Report"],
    "6.3.2": ["Financial Support Policy", "Audit Reports"],
    // 7. Institutional Values and Best Practices
    "7.1.1": ["Gender Audit", "Safety Certificates"],
    "7.1.3": ["Green Audit", "Energy Audit", "Environmental Audit"],
  };

  const allowed = SOP_2025[metricId];
  if (allowed) {
     const isCompliant = allowed.some(type => docType?.toLowerCase().includes(type.toLowerCase()));
     if (!isCompliant) {
        findings.push({
          finding_id: "SOP_NON_COMPLIANT_DOCTYPE",
          severity: "CRITICAL",
          reasoning: `Metric-SOP Alignment: Metric ${metricId} requires ${allowed.join(" or ")}, but '${docType || "Unknown"}' was provided. Non-compliant per 2025 SOP rules.`,
          evidence_location: { page: 1, line_reference: "Document Classification", coordinates: [0,0] }
        });
     }
  }

  return findings;
}

/**
 * Main Audit Dispatcher
 */
async function performAudit(input) {
  const { document, links, metadata, context } = input;
  
  const findings = [
    ...auditArithmetic(input),
    ...auditLinks(links || []),
    ...auditMetadata(metadata || {}, context?.claimYear),
    ...auditSOP(context?.metricId, context?.docType)
  ];

  const criticalIssues = findings.filter(f => f.severity === "CRITICAL").length;
  const warnings = findings.filter(f => f.severity === "WARNING").length;

  let verdict = "GENUINE";
  if (criticalIssues > 0) verdict = "NON-COMPLIANT";
  else if (warnings > 0) verdict = "SUSPICIOUS";

  // Risk Score calculation
  const riskScore = Math.min(100, (criticalIssues * 40) + (warnings * 15));

  return {
    is_audit_ready: criticalIssues === 0,
    verdict: verdict,
    risk_score: riskScore,
    audit_findings: findings,
    naac_action_required: generateFixes(findings)
  };
}

function generateFixes(findings) {
  const fixes = [];
  findings.forEach(f => {
    if (f.finding_id === "LINK_PROTOCOL_CLOUD_STORAGE") {
      fixes.push("Move document to the institutional website domain (e.g., college-name.edu.in).");
    }
    if (f.finding_id === "ARITHMETIC_INCONSISTENCY_STUDENTS") {
      fixes.push("Reconcile student numbers between Criterion 2.1 and 5.2 to ensure data integrity.");
    }
    if (f.finding_id === "SOP_NON_COMPLIANT_DOCTYPE") {
      fixes.push("Substitute the existing document with the document type explicitly requested by SOP 2025.");
    }
  });
  return [...new Set(fixes)].join(" ");
}

const auditorHandler = async (req, res) => {
  try {
    const result = await performAudit(req.body);
    res.json(result);
  } catch (err) {
    console.error("[Auditor] Execution error:", err.stack);
    res.status(500).json({ error: "Internal Audit Engine Error", detail: err.message });
  }
};

module.exports = auditorHandler; // Direct export for server/index.js
module.exports.performAudit = performAudit; // Named export for internal use if needed
