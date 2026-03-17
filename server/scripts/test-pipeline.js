const db = require('../src/db');
const { runForensicAudit, MODEL } = require('../src/api/groqClient');

async function runV3PipelineTest() {
    console.log("================================================");
    console.log("🚀 STARTING NAAC AUDIT V3 PIPELINE TEST 🚀");
    console.log("================================================\n");

    try {
        // 1. Database Connection Test
        console.log("-> [STEP 1] Testing Neon Postgres Database Connection...");
        const dbRes = await db.query("SELECT NOW() as current_time");
        console.log(`✅ Database connected successfully to Singapore Neon Server. Server time: ${dbRes.rows[0].current_time}`);

        // Set up a mock user parameter if `users` table is empty
        // In reality, this requires existing Google OAuth users, but for test we'll create a system bot user
        let botUserId;
        const userCheck = await db.query("SELECT id FROM users WHERE email = 'system.bot@jainuniversity.ac.in'");
        if (userCheck.rows.length === 0) {
            const botInsert = await db.query(
                "INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING id",
                ['system_bot_id_999', 'system.bot@jainuniversity.ac.in', 'JAIN SSR Test Bot']
            );
            botUserId = botInsert.rows[0].id;
            console.log("✅ Provisioned System Bot in DB for test audit.");
        } else {
            botUserId = userCheck.rows[0].id;
        }

        // 2. Groq AI Ping Test
        console.log("\n-> [STEP 2] Pinging Groq SDK Inference Layer...");
        if (!process.env.GROQ_API_KEY) {
            console.error("❌ GROQ_API_KEY is not set in `.env`.");
            process.exit(1);
        }
        console.log(`✅ GROQ_API_KEY detected. Model target: ${MODEL}`);
        
        // 3. Simulated Fake Audit
        console.log("\n-> [STEP 3] Simulating 'Fake Audit' with sample text...");
        const sampleText = `
        Institutional Report 2024
        Criterion 2.1: Enrolled Students = 1500
        Table A: Salary Expenses
        Item 1      ₹100,000
        Item 2      ₹250,500
        Total       ₹350,000
        
        Evidence Document 1: https://drive.google.com/file/d/1abc123/view
        Note: The attached certificate claims 2021 but metadata shows 2024.
        `;

        const forensicResult = await runForensicAudit(sampleText, "Simulated Load Test");
        console.log("\n--- JSON OUTPUT FROM GROQ ---");
        console.log(JSON.stringify(forensicResult, null, 2));

        if (!forensicResult.verdict) {
            throw new Error("Groq Output was missing the mandated 'verdict' key.");
        }

        console.log("\n-> [STEP 4] Persisting Audit Record to Database...");
        const insertQuery = `
            INSERT INTO naac_audits 
            (user_id, target_url, claim_context, verdict, risk_score, audit_findings, action_required)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        `;
        const insertParams = [
            botUserId,
            "test_pipeline_simulation.txt",
            "Simulated Load Test",
            forensicResult.verdict,
            forensicResult.risk_score || 0,
            JSON.stringify(forensicResult.audit_findings || []),
            forensicResult.naac_action_required || ""
        ];
        
        const saveRes = await db.query(insertQuery, insertParams);
        console.log(`✅ Audit JSON successfully persisted. Record ID: ${saveRes.rows[0].id}`);

        console.log("\n================================================");
        console.log("🏁 ALL SYSTEMS PASS: V3 PIPELINE OPERATIONAL 🏁");
        console.log("================================================");
        
        process.exit(0);

    } catch (err) {
        console.error("\n❌ PIPELINE TEST FAILED ❌");
        console.error(err);
        process.exit(1);
    }
}

runV3PipelineTest();
