"use strict";

module.exports = function healthHandler(_req, res) {
  const aiEnabled = !!(process.env.AZURE_AI_ENDPOINT && process.env.AZURE_AI_KEY);
  res.json({
    status:    "ok",
    version:   "2.0.0",
    timestamp: new Date().toISOString(),
    ai: {
      enabled:  aiEnabled,
      provider: "Azure AI (Claude)",
      model:    process.env.AZURE_AI_MODEL || "claude-sonnet-4-5",
      endpoint: process.env.AZURE_AI_ENDPOINT
        ? process.env.AZURE_AI_ENDPOINT.replace(/\/+$/, "").replace(/^(https:\/\/[^/]+).*/, "$1")
        : null,
    },
    uptime: Math.floor(process.uptime()),
  });
};
