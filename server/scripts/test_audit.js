"use strict";

const { performAudit } = require("../src/api/auditor");

async function runTests() {
  console.log("🚀 Starting JAIN SSR Auditor Verification...\n");

  const testScenarios = [
    {
      name: "Dimension 1: Arithmetic Inconsistency (Student Numbers)",
      input: {
        metrics: {
          "2.1.1": { value: 100 },
          "5.2.1": { value: 150 } // More outgoing than total!
        }
      },
      expectedVerdict: "NON-COMPLIANT"
    },
    {
      name: "Dimension 2: Link Protocol (Cloud Storage)",
      input: {
        links: [{ url: "https://drive.google.com/file/d/123", page: 2 }]
      },
      expectedVerdict: "NON-COMPLIANT"
    },
    {
      name: "Dimension 3: Metadata Drift (Future Date)",
      input: {
        metadata: { CreationDate: "2027-01-01" }
      },
      expectedVerdict: "NON-COMPLIANT"
    },
    {
      name: "Dimension 4: SOP Compliance (Wrong Doc Type)",
      input: {
        context: { metricId: "7.1.3", docType: "Self-Declaration" } // Needs Green/Energy Audit
      },
      expectedVerdict: "NON-COMPLIANT"
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name}`);
    const result = await performAudit(scenario.input);
    const passed = result.verdict === scenario.expectedVerdict;
    console.log(`Verdict: ${result.verdict} | Risk: ${result.risk_score}`);
    console.log(`Action: ${result.naac_action_required}`);
    console.log(passed ? "✅ PASSED" : "❌ FAILED");
    console.log("-" .repeat(40));
  }
}

runTests().catch(console.error);
