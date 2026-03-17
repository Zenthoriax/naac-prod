const db = require('../db');
const { MODEL } = require('./groqClient');

module.exports = async function healthHandler(_req, res) {
  let dbStatus = "UNKNOWN";
  try {
      // Ping Neon connection
      await db.query("SELECT 1 AS ping");
      dbStatus = "CONNECTED";
  } catch (err) {
      dbStatus = "DISCONNECTED";
  }

  const aiEnabled = !!process.env.GROQ_API_KEY;

  res.json({
    status: dbStatus === "CONNECTED" && aiEnabled ? "ok" : "degraded",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    ai: {
      enabled: aiEnabled,
      provider: "Groq SDK",
      model: MODEL
    },
    database: {
      provider: "Neon Postgres",
      status: dbStatus
    },
    uptime: Math.floor(process.uptime()),
  });
};
