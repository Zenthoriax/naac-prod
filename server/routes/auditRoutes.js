const express = require('express');
const router = express.Router();
const multer  = require('multer');
const pdfParse = require('pdf-parse');
const Joi = require('joi');
const { rateLimit } = require('express-rate-limit');
const { fromBuffer } = require('pdf2pic');
const db = require('../src/db');
const { runForensicAudit, runVisionAudit } = require('../src/api/groqClient');
const { verifyToken } = require('../src/auth/jwt');
const logger = require('../src/utils/logger');

// Free-Tier Limit: 10 Groq audits per hour per user
const groqLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: "FREE TIER LIMIT: Maximum 10 deep forensic audits per hour allowed. Please wait before submitting more." },
    keyGenerator: (req) => req.user?.id || req.ip
});

// Input Validation Schema using Joi
const auditSchema = Joi.object({
    claimContext: Joi.string().max(1000).optional().allow(""),
    text_content: Joi.string().max(100000).optional().allow(""),
    url: Joi.string().uri().optional().allow("")
}).unknown(true);

// In-memory storage for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Forensic Audit POST Route
router.post('/', verifyToken, groqLimiter, upload.single('document'), async (req, res) => {
    try {
        const { error } = auditSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed: ${error.message}`);
            return res.status(400).json({ error: `Validation Error: ${error.details[0].message}` });
        }

        const { claimContext } = req.body;
        const file = req.file;

        if (!file && !req.body.text_content) {
            return res.status(400).json({ error: "Missing document file or text_content." });
        }

        let textContent = req.body.text_content || "";
        let originalName = req.body.url || "Text Input";

        // Extract PDF text if a file was uploaded
        if (file) {
            originalName = file.originalname;
            if (file.mimetype === 'application/pdf') {
                try {
                    const pdfData = await pdfParse(file.buffer);
                    textContent = pdfData.text;
                } catch (parseErr) {
                    logger.warn(`[AUDIT] pdf-parse failed on ${originalName}. Will attempt Vision fallback. Error: ${parseErr.message}`);
                    textContent = ""; // Force fallback
                }
            } else {
                textContent = file.buffer.toString('utf8');
            }
        }

        if (!textContent.trim() && file && file.mimetype === 'application/pdf') {
            logger.info(`[AUDIT] No text found in ${originalName}. Attempting Llama Vision fallback...`);
            
            try {
                // Convert PDF to Base64 Image
                const options = {
                    density: 300,
                    savePath: './tmp', // Note: Will output to base64 below, savePath just required by library
                    format: 'jpeg',
                    width: 2550,
                    height: 3300
                };
                const storeAsImage = fromBuffer(file.buffer, options);
                
                // Get page 1 as base64
                const dataToReturn = await storeAsImage(1, { responseType: 'base64' });
                const base64Image = dataToReturn.base64;
                
                forensicResult = await runVisionAudit(base64Image, claimContext || "General Check");
            } catch (visionErr) {
                 logger.error(`[Vision Fallback Error] ${visionErr.message}`);
                 return res.status(400).json({ error: "Scanned PDF is completely unreadable. Llama Vision rejected the image payload." });
            }
        } else if (!textContent.trim()) {
            return res.status(400).json({ error: "No readable text extracted for audit. Please upload a searchable PDF." });
        } else {
            // 1. Run the Standard Text Groq Forensic Audit
            logger.info(`[AUDIT] Running Standard Text AI check for user ${req.user.id} on ${originalName}`);
            try {
                forensicResult = await runForensicAudit(textContent, claimContext || "General Check");
            } catch (groqErr) {
                if (groqErr.status === 429) {
                    logger.warn(`[Groq Rate Limit Hit] user ${req.user.id}`);
                    return res.status(429).json({ error: "System is under heavy load (Groq Rate Limit). Your audit is queued. Please try again in 60 seconds." });
                }
                throw groqErr; // Elevate to standard 500 catch if not 429
            }
        }

        // 2. Save Telemetry / Verdict to Neon Postgres atomically
        const result = await db.transaction(async (client) => {
            const insertQuery = `
                INSERT INTO naac_audits 
                (user_id, target_url, claim_context, verdict, risk_score, audit_findings, action_required)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, created_at
            `;
            const dbRes = await client.query(insertQuery, [
                req.user.id,
                originalName,
                claimContext || "General Audit",
                forensicResult.verdict || "UNKNOWN",
                forensicResult.risk_score || 0,
                JSON.stringify(forensicResult.audit_findings || []),
                forensicResult.naac_action_required || ""
            ]);
            
            // Artificial delay removed, logic exists here to add user stats updates later if verified
            // e.g., await client.query('UPDATE users SET audits_run = audits_run + 1 WHERE id = $1', [req.user.id]);
            
            return dbRes.rows[0];
        });

        logger.info(`[AUDIT] DB Insert Success. Record ID: ${result.id}`);

        // 3. Return the JSON output
        return res.json({
            success: true,
            audit_id: result.id,
            v3_engine: "groq-llama-3.3",
            result: forensicResult
        });

    } catch (err) {
        logger.error(`[POST /api/audit] Pipeline Error: ${err.message}`, { stack: err.stack });
        return res.status(500).json({ error: "Internal Forensic Engine Error", details: err.message });
    }
});

// History Route for the Dashboard
router.get('/history', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, target_url, verdict, risk_score, created_at FROM naac_audits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json({ history: rows });
    } catch (err) {
        res.status(500).json({ error: "Database lookup failed." });
    }
});

module.exports = router;
