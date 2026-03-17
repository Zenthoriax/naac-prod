-- Production NAAC Verifier Schema for Neon Postgres

-- 1. Users table for Google OAuth mapping
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. NAAC Audits table for storing forensic results
CREATE TABLE IF NOT EXISTS naac_audits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_url TEXT,
    claim_context TEXT,
    verdict VARCHAR(50) NOT NULL,
    risk_score INTEGER NOT NULL,
    audit_findings JSONB NOT NULL,
    action_required TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user history lookups
CREATE INDEX IF NOT EXISTS idx_naac_audits_user_id ON naac_audits(user_id);
-- Index for finding similar URLs/files audited previously
CREATE INDEX IF NOT EXISTS idx_naac_audits_target_url ON naac_audits(target_url);

-- 3. Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
