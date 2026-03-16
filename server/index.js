"use strict";

require("dotenv").config();

const path    = require("path");
const fs      = require("fs");
const express = require("express");
const helmet  = require("helmet");
const cors    = require("cors");
const { rateLimit } = require("express-rate-limit");
const multer  = require("multer");

const verifyRoute  = require("../src/api/verify");
const extractRoute = require("../src/api/extract");
const reportRoute  = require("../src/api/report");
const healthRoute  = require("../src/api/health");

const app  = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const DIST = path.join(__dirname, "../frontend/dist");
const IS_PROD = process.env.NODE_ENV === "production";

/* ─── Trust proxy (Render sits behind a proxy) ─── */
app.set("trust proxy", 1);

/* ─── Security headers ─── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'"],
      imgSrc:     ["'self'", "data:"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/* ─── CORS ─── */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / server-to-server
    if (!IS_PROD || allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS: origin not allowed"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false,
}));
app.options("*", cors());

/* ─── Body parsing ─── */
app.use(express.json({ limit: "512kb" }));

/* ─── Rate limiters ─── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: IS_PROD ? 80 : 9999,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait 15 minutes and try again." },
  keyGenerator: (req) => req.ip,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: IS_PROD ? 12 : 9999,
  message: { error: "Upload limit reached. Maximum 12 PDF uploads per hour per IP." },
  keyGenerator: (req) => req.ip,
});

/* ─── File upload (PDF only, 20 MB max) ─── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(Object.assign(new Error("Only PDF files are accepted."), { status: 400 }), false);
  },
});

/* ─── API routes ─── */
app.get( "/api/health",  healthRoute);
app.post("/api/verify",  apiLimiter, verifyRoute);
app.post("/api/report",  apiLimiter, reportRoute);
app.post("/api/extract", apiLimiter, uploadLimiter,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(413).json({ error: "File too large. Maximum size is 20 MB." });
        return res.status(400).json({ error: err.message });
      }
      if (err) return res.status(err.status || 400).json({ error: err.message });
      next();
    });
  },
  extractRoute
);

/* ─── Serve built React frontend ─── */
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, {
    maxAge:       IS_PROD ? "7d" : 0,
    etag:         true,
    lastModified: true,
    index:        false,
  }));
  // SPA fallback — everything that isn't /api/* serves index.html
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(path.join(DIST, "index.html"));
  });
} else {
  app.get("/", (_req, res) => res.json({
    status: "running",
    message: "Frontend not built yet. Run: npm run build",
    api: "/api/health",
  }));
}

/* ─── 404 for unknown /api routes ─── */
app.use("/api/*", (_req, res) => res.status(404).json({ error: "API route not found" }));

/* ─── Global error handler ─── */
app.use((err, _req, res, _next) => {
  const status  = err.status  || 500;
  const message = IS_PROD ? "An unexpected error occurred." : err.message;
  if (status >= 500) console.error("[Server Error]", err);
  res.status(status).json({ error: message });
});

/* ─── Start server ─── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │        NAAC SSR Verifier v2.0           │
  ├─────────────────────────────────────────┤
  │  URL    : http://localhost:${String(PORT).padEnd(14)}│
  │  API    : http://localhost:${PORT}/api     │
  │  Mode   : ${String(process.env.NODE_ENV || "development").padEnd(29)}│
  │  Model  : ${String(process.env.CLAUDE_MODEL || "claude-sonnet-4-5").padEnd(29)}│
  │  AI     : ${process.env.ANTHROPIC_API_KEY ? "enabled ✓                     " : "disabled (rule-based fallback)"}│
  └─────────────────────────────────────────┘
  `);
});

module.exports = app; // for testing
