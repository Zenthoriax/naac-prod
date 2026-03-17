# Antigravity: V3.1 NAAC Forensic Auditor

## Project Overview
The NAAC SSR Verifier (V3.1 Architecture) is a Zero-Trust forensic auditing system powered by the Groq Llama-3.3 inference engine. It is designed to empower institutional IQAC cells and pre-DVV simulations by enforcing strict quantitative arithmetic checks, domain linkage validation, and metadata drift analysis on uploaded evidence protocols.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend:** React, Vite
- **Database:** Neon Postgres (Connection Pooling & Atomic Transactions)
- **AI Core:** Groq API (Llama-3.3-70b for text, Llama-3.2-11b-Vision for scanned PDFs)
- **Auth:** Passport.js (Google OAuth 2.0)

## Security & Resilience Features
- **Domain Guard:** Strictly limits system access to authorized assessors holding `@jainuniversity.ac.in` credentials.
- **Free-Tier Resilience:** Employs global API rate limiting (10 audits per hour per user) via `express-rate-limit` to prevent infrastructure abuse and ensure graceful fallbacks during API threshold breaches.
- **Atomic Telemetry:** Utilizes PostgreSQL atomic transaction rollbacks to prevent database corruption if a forensic audit fails midway.
- **Llama-Vision Fallback:** Automatically detects legacy scanned imagery inside PDFs and routes them directly to Groq's multimodal endpoints, completely bypassing fragile OS-level OCR dependencies.

## Installation Guide

### 1. Repository Setup
Clone the repository and install the dependencies for both the backend and frontend.

```bash
git clone https://github.com/your-username/naac-prod.git
cd naac-prod
npm run install:all
```

### 2. Environment Variables
Copy the template environment file and populate it with your specific API and database keys.
```bash
cp .env.example .env
```

### 3. Database Migration
Ensure your Neon PostgreSQL database has the required schema. Specifically, the `users` and `naac_audits` tables, and the session storage.
```bash
node server/scripts/migrate.js
```

### 4. Boot the Servers
Start both the Vite frontend and the Express backend concurrently:
```bash
npm run dev
```

---
*Designed & Engineered by Zenthoriax*
