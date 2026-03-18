import React from 'react';

export default function Docs() {
  return (
    <div style={{ padding: '2rem 10%', fontFamily: '"Inter", sans-serif', color: '#e0e0e0', minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      <h1 style={{ color: '#00ffcc', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>NAAC Forensic Engine Documentation</h1>
      
      <section style={{ marginTop: '2rem', backgroundColor: '#111', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #00ffcc' }}>
        <h2 style={{ color: '#00ffcc', marginTop: 0 }}>Quick Start Guide</h2>
        <ol style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Authenticate:</strong> Use the Secure Gateway. You must log in with an authorized <code style={{color: '#ffaa00'}}>@jainuniversity.ac.in</code> account to pass the Domain Guard.</li>
          <li><strong>Upload Evidence:</strong> Navigate to the Faculty Hub dashboard and select a PDF or TXT document representing your NAAC claim evidence.</li>
          <li><strong>Wait for Analysis:</strong> The AI extracts the text, resolves all numeric tables, checks evidence links, and cross-references metadata. Wait up to 30 seconds.</li>
          <li><strong>Review Verdict:</strong> Assess the resulting Risk Score (0-100) and read the Primary Forensic Indicators to see exactly why the document failed or succeeded.</li>
          <li><strong>Telemetry:</strong> Your specific uploads and scores are securely stored in the Postgres database and will appear in your 'Personal Audit Telemetry' table at the bottom of your dashboard.</li>
        </ol>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ color: '#ff3366' }}>1. Zero-Trust Methodology & Evaluation Metrics</h2>
        <p style={{ lineHeight: '1.6', color: '#aaa' }}>
          The NAAC SSR Verifier utilizes the Groq Llama-3.3 Inference Engine to perform <strong>Zero-Trust Forensic Audits</strong>. 
          Unlike traditional compliance checks, our system inherently suspects manipulation and actively searches for inconsistencies across five primary evaluation metrics:
        </p>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Data Gravity (Arithmetic Integrity):</strong> Recalculating all numeric tables to verify decimal-level sum integrity. If a column claims "Total: 15" but the rows equal 10, the document is flagged for data falsification.</li>
          <li><strong>Domain Lockdown (Link Security):</strong> Assessing hyperlink hosting. Cloud storage links (Google Drive, Dropbox) are immediately flagged with a CRITICAL risk score. NAAC requires evidence to be hosted on secure institutional infrastructure (e.g., <code>.ac.in</code> servers).</li>
          <li><strong>Metadata Drift Check:</strong> Analyzing underlying PDF `CreationDate` attributes against the dates claimed within the text. E.g., A report claiming an event happened in 2021 but carrying a 2024 PDF creation stamp flags as post-facto document fabrication.</li>
          <li><strong>Cross-Criteria Reconciliation:</strong> Ensuring logic constraints across NAAC Criteria. E.g., The system flags if "Outgoing Students" in Criterion 5.2 mathematically exceeds "Total Students" stated in Criterion 2.1.</li>
          <li><strong>SOP 2025 Compliance Rules:</strong> Identifying if the submitted document format strictly aligns with the NAAC Standard Operating Procedure expectations for a given metric.</li>
        </ul>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ color: '#ffaa00' }}>2. Core Supported Use Cases</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
          <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '4px', borderTop: '2px solid #ffaa00' }}>
            <h3 style={{ color: '#e0e0e0', marginTop: 0 }}>Faculty Self-Verification</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>Professors building their department IQAC files can upload their drafted PDFs <em>before</em> submission to the centralized NAAC coordinator. This acts as a spell-checker for logic drops, broken institution links, and bad table math.</p>
          </div>
          <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '4px', borderTop: '2px solid #00ccff' }}>
            <h3 style={{ color: '#e0e0e0', marginTop: 0 }}>Pre-DVV Simulation</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>The platform simulates exactly what the NAAC DVV (Data Validation and Verification) remote compliance bots do. Running your SSR through this pipeline ensures that your DVV deviation score remains as low as possible.</p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '3rem', backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #ffaa00' }}>
        <h2 style={{ color: '#ffaa00', marginTop: 0 }}>2. Handling Scanned PDFs & Imagery</h2>
        <p style={{ lineHeight: '1.6', color: '#aaa' }}>
          By design, the V3 Forensic Engine pipeline <strong>does not perform optical character recognition (OCR)</strong> on uploaded documents.
          If you receive a <code style={{ color: '#ff3366' }}>"No readable text extracted for audit"</code> error, the document provided is likely a scanned image saved as a PDF.
        </p>
        <h4 style={{ color: '#e0e0e0' }}>Resolution:</h4>
        <p style={{ color: '#aaa' }}>
          To audit legacy paper documents, you must first pass them through an OCR pipeline (like Adobe Acrobat or Google Cloud Vision) to embed a searchable text layer before uploading to the Auditor.
        </p>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ color: '#00ccff' }}>3. Infrastructure & Rate Limits (V3.1)</h2>
        <p style={{ lineHeight: '1.6', color: '#aaa' }}>
          To ensure 100% uptime without incurring severe cloud costs, this system employs a <strong>Free-Tier Resilient Architecture</strong>.
        </p>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Rate Limiting:</strong> Each authorized assessor is strictly limited to <strong>10 forensic audits per hour</strong>.</li>
          <li><strong>Graceful Queuing:</strong> If the global Groq API threshold is breached (HTTP 429), your request will not crash. It will be queued, and you will receive a notification to try again in 60 seconds.</li>
          <li><strong>Atomic Telemetry:</strong> All findings are committed to Neon Postgres as atomic transactions. If a scan fails midway, the database rolls back instantly to prevent corrupted audit histories.</li>
        </ul>
      </section>

      <section style={{ marginTop: '3rem', borderTop: '2px dashed #333', paddingTop: '2rem' }}>
        <h1 style={{ color: '#fff' }}>Subdivision 4.2: Self-Study Report (SSR) Compliance & Forensic Standards</h1>
        
        <h2 style={{ color: '#00ccff', marginTop: '2rem' }}>Part A: Digital File Standards</h2>
        <p style={{ color: '#aaa', lineHeight: '1.6' }}>All evidentiary documents submitted to the institutional IQAC must comply with the following unyielding digital architecture constraints:</p>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>The 'Hard 5MB' Rule:</strong> No single PDF upload shall exceed exactly 5.0 Megabytes. The NAAC portal actively rejects oversized submissions, risking a zero-score for the metric.</li>
          <li><strong>Institutional Website Hosting Fallback:</strong> If metric evidence fundamentally exceeds 5MB (e.g., a 200-page Annual Report), you must host the file on the primary institutional website (<code>.ac.in</code> domain).</li>
          <li style={{ color: '#ffaa00', listStyle: 'none', marginLeft: '-1.5rem', borderLeft: '3px solid #ffaa00', paddingLeft: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#111', padding: '1rem' }}>
            <strong>[WARNING] Forensic Tip: No Cloud Storage Allowed</strong><br/>
            Hyperlinks pointing to Google Drive, Microsoft OneDrive, Dropbox, or any personal cloud storage are strictly banned. The DVV algorithms flag these as "Volatile Evidence" capable of post-facto tampering.
          </li>
          <li><strong>Mandatory OCR Enablement:</strong> Every PDF submitted must carry a searchable text layer. If uploading legacy paper/scanned imagery, you <em>must</em> pass the file through optical character recognition (OCR) software before submission. If the file is a flat image, the forensic verifier cannot parse it.</li>
        </ul>

        <h2 style={{ color: '#00ccff', marginTop: '3rem' }}>Part B: Metric Drafting Rules</h2>
        <p style={{ color: '#aaa', lineHeight: '1.6' }}>To satisfy both peer team reviewers and algorithmic DVV parsing, all narratives and datasets must strictly adhere to format boundaries.</p>
        
        <h3 style={{ color: '#e0e0e0', marginTop: '1.5rem' }}>Qualitative Metrics (QlM)</h3>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Strict 500-Word Perimeter:</strong> Narrative responses must concisely detail systems and processes without exceeding 500 total words.</li>
          <li><strong>Evidence-Based Descriptions:</strong> Minimize abstract claims. Ensure narrative focus heavily relies on demonstrable operational actions (e.g., specific Decentralization procedures or concrete Institutional Best Practices).</li>
        </ul>

        <h3 style={{ color: '#e0e0e0', marginTop: '1.5rem' }}>Quantitative Metrics (QnM)</h3>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Data Template Rigidity:</strong> All quantitative claims absolutely must match the requisite Data Templates provided by NAAC in Excel/CSV formats.</li>
          <li><strong>Zero Repeat Counts:</strong> Be forensically precise regarding headcount overlap. You must guarantee a zero-repeat count logic when consolidating student progression or faculty data over the 5-year assessment window.</li>
        </ul>

        <h2 style={{ color: '#00ccff', marginTop: '3rem' }}>Part C: Evidence Integrity (The Forensic Layer)</h2>
        <p style={{ color: '#aaa', lineHeight: '1.6' }}>The burden of proof lies entirely on the institution. We operate on a 'Zero-Trust' verification methodology.</p>
        <ul style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Geotagged Photographs:</strong> All physical infrastructure claims (Criterion 4) must be validated with high-definition, unedited geotagged photography possessing embedded EXIF timestamp/lat-long data.</li>
          <li><strong>Persistent Hyperlinking:</strong> When referencing evidence hosted on the institutional website, the URL provided <em>must</em> be a "Persistent Link."</li>
          <li style={{ color: '#00ffcc', listStyle: 'none', marginLeft: '-1.5rem', borderLeft: '3px solid #00ffcc', paddingLeft: '1rem', marginTop: '0.5rem', backgroundColor: '#111', padding: '1rem' }}>
            <strong>[TIP] Forensic Tip: Deep Linking</strong><br/>
            Do not link to the college homepage (<code>college.ac.in</code>) and expect the assessor to find the document. The link must land directly on the specific evidence file (<code>college.ac.in/iqac/2024/report.pdf</code>).
          </li>
        </ul>

        <h2 style={{ color: '#00ccff', marginTop: '3rem' }}>Part D: Criterion Hierarchy</h2>
        <p style={{ color: '#aaa', lineHeight: '1.6' }}>Before drafting your metric responses, locate your department's required contributions across the 7 primary NAAC dimensions:</p>
        <ol style={{ color: '#aaa', lineHeight: '1.8' }}>
          <li><strong>Curricular Aspects</strong> (Academic flexibility and curriculum enrichment)</li>
          <li><strong>Teaching-Learning and Evaluation</strong> (Student enrolment, catering to diversity, and assessment)</li>
          <li><strong>Research, Innovations and Extension</strong> (Resource mobilization, publications, and outreach)</li>
          <li><strong>Infrastructure and Learning Resources</strong> (Physical facilities, IT infrastructure, and library)</li>
          <li><strong>Student Support and Progression</strong> (Alumni engagement and progression to higher education)</li>
          <li><strong>Governance, Leadership and Management</strong> (Institutional vision, empowerment, and financial management)</li>
          <li><strong>Institutional Values and Best Practices</strong> (Gender equity, environmental consciousness, and distinctiveness)</li>
        </ol>
      </section>

      <section style={{ marginTop: '3rem', borderTop: '2px solid #333' }}>
        <h2 style={{ color: '#00ccff', paddingTop: '2rem' }}>5. Risk Score Definitions</h2>
        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', color: '#aaa' }}>
          <thead>
            <tr style={{ backgroundColor: '#222', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Verdict</th>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Score Range</th>
              <th style={{ padding: '10px', border: '1px solid #444' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #444', color: '#00ffcc', fontWeight: 'bold' }}>GENUINE</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>0 - 14</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>Cryptographically sound. Data matches claims. No external cloud links.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #444', color: '#ffaa00', fontWeight: 'bold' }}>SUSPICIOUS</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>15 - 39</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>Minor inconsistencies (e.g., mismatched Student totals across criteria) or missing metadata. Requires human review.</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #444', color: '#ff3366', fontWeight: 'bold' }}>NON-COMPLIANT</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>40 - 100</td>
              <td style={{ padding: '10px', border: '1px solid #444' }}>Critical logic failure, forged table math, post-facto PDF creation date, or strict SOP violation detected.</td>
            </tr>
          </tbody>
        </table>
      </section>
      
      <div style={{ marginTop: '4rem', paddingBottom: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
        <a href="/login" style={{ color: '#00ffcc', textDecoration: 'none', border: '1px solid #00ffcc', padding: '10px 20px', borderRadius: '4px' }}>
          Back to Secure Gateway
        </a>
        <p style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Designed & Engineered by <strong><span style={{ color: '#00ccff' }}>Zenthoriax & PancakesPekka</span></strong>
        </p>
      </div>
    </div>
  );
}
