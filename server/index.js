"use strict";

require("dotenv").config();

const path    = require("path");
const fs      = require("fs");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const multer  = require("multer"); 
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // Add connect-pg-simple
const passport = require('./src/auth/passport');
const db = require('./src/db'); // Require db pool
const logger = require('./src/utils/logger'); // Structured Logger

// Import routes
const verifyRoute = require('./src/api/verify');
const extractRoute = require("./src/api/extract"); // Keep extractRoute
const reportRoute  = require("./src/api/report"); // Keep reportRoute
const healthRoute  = require("./src/api/health"); // Keep healthRoute
const auditorHandler = require('./src/api/auditor'); // This replaces the old auditRoute
const auditRoutesV3 = require('./routes/auditRoutes');

const app = express();
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
app.use(express.urlencoded({ extended: true })); // Added from edit

// Setup Session for Passport with Postgres Store
app.use(session({
    store: new pgSession({
        pool: db.getPool(), // Connection pool
        tableName: 'session' // Use another table-name than the default "session" one
    }),
    secret: process.env.SESSION_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

app.use(passport.initialize());
app.use(passport.session());

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
// ─── AUTHENTICATION ROUTES (Google OAuth) ───
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=domain_lockdown' }),
    function(req, res) {
        // Successful authentication
        const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');
        res.redirect(`${frontendUrl}/dashboard`);
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        req.session.destroy(() => {
            res.redirect('/login');
        });
    });
});

app.get('/api/auth/session', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// ─── CORE V3 API ROUTES ───
app.use('/api/audit', auditRoutesV3); // Mount the new Groq AI pipeline

// Legacy V2 Routes (Kept for fallback compatibility)
app.get( "/api/health",  healthRoute);
app.post("/api/verify",  apiLimiter, verifyRoute);
app.post("/api/v2/audit", apiLimiter, auditorHandler); // Moved to v2 namespace
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
app.use((err, req, res, _next) => {
  const status  = err.status  || 500;
  const message = IS_PROD ? "An unexpected error occurred." : err.message;
  
  if (status >= 500) {
      logger.error(`[Server Error] ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
  } else {
      logger.warn(`[Client Error] ${req.method} ${req.url}: ${err.message}`);
  }

  res.status(status).json({ error: message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ┌───────────────────────────────────────────────┐
  │        NAAC SSR Verifier v3.0 (Groq)          │
  ├───────────────────────────────────────────────┤
  │  URL    : http://localhost:${String(PORT).padEnd(19)}│
  │  API    : http://localhost:${String(PORT + "/api").padEnd(19)}│
  │  Mode   : ${String(process.env.NODE_ENV || "development").padEnd(34)}│
  │  Model  : ${String(process.env.GROQ_MODEL || "llama-3.3").padEnd(34)}│
  │  AI     : ${process.env.GROQ_API_KEY ? "Groq Inference Engine Online      " : "Disabled (Regex Only)             "}│
  └───────────────────────────────────────────────┘
  `);
});

module.exports = app; // for testing
