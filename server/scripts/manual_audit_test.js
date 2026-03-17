"use strict";

const { performAudit } = require("../src/api/auditor");

async function runManualAudit() {
  console.log("🛠  Manual Audit Verification with Real SSR Data...\n");

  const realScenarios = [
    {
      name: "Metric 5.1.2 - Institutional Domain (Compliant)",
      input: {
        links: [{ url: "https://vtmnsscollege.ac.in/wp-content/uploads/2024/08/5.1.2-SS-2021-22.pdf", page: 12 }],
        context: { metricId: "5.1.2", docType: "Capacity Development Proof" }
      }
    },
    {
      name: "Metric 5.1.2 - Google Drive Link (Non-Compliant)",
      input: {
        links: [{ url: "https://drive.google.com/file/d/1fQKyrVzmPfGefxT1TyL2C1g9qjd9OhAH/view?usp=sharing", page: 12 }],
        context: { metricId: "5.1.2", docType: "Capacity Development Proof" }
      }
    },
    {
      name: "Metric 7.1.3 - Environment Audit (Google Drive)",
      input: {
        links: [{ url: "https://drive.google.com/file/d/1zy7WhDfXKA1HHJWKz42ueFHovcINNtij/view?usp=sharing", page: 85 }],
        context: { metricId: "7.1.3", docType: "Green Audit Report" }
      }
    }
  ];

  for (const scenario of realScenarios) {
    console.log(`AUDITING: ${scenario.name}`);
    const result = await performAudit(scenario.input);
    
    console.log(`- Verdict: ${result.verdict}`);
    console.log(`- Risk Score: ${result.risk_score}`);
    console.log(`- Audit Findings: ${result.audit_findings.length}`);
    
    result.audit_findings.forEach(f => {
      console.log(`  [${f.severity}] ${f.reasoning}`);
    });
    
    console.log(`- Action Required: ${result.naac_action_required}`);
    console.log("-" .repeat(50));
  }
}

runManualAudit().catch(console.error);
