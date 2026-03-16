# NAAC SSR Verifier v2.0 — Deployment Guide
## Using Azure Student Credits + Render.com (free hosting)

---

## Overview

| Component | Service | Cost |
|---|---|---|
| Claude AI | Azure AI Foundry (Claude Sonnet) | ~₹0.04 per 200-link audit |
| Hosting | Render.com free tier | $0 |
| Total for 1,000 full audits | | ~₹40 |

Your $100 Azure student credit covers approximately **50,000+ full SSR audits**.

---

## Architecture

```
Browser
  │
  ▼
Render.com (free)
  ├── React frontend (static)
  └── Express API
        ├── /api/extract  → pdf-parse (no AI needed)
        ├── /api/verify   → Azure AI Claude Sonnet
        └── /api/report   → HTML report generator
                 │
                 ▼
          Azure AI Foundry
          Claude Sonnet 4.5
          (your student credits)
```

---

## STEP 1 — Set Up Azure AI Foundry

This is the only setup that uses your student credits.

### 1a. Create an Azure AI Foundry resource

1. Go to: **https://portal.azure.com**
2. Sign in with your **student email** (the one with the $100 credits)
3. In the top search bar, type **"Azure AI Foundry"** and click it
4. Click **"+ Create"**
5. Fill in:
   - **Subscription**: Azure for Students
   - **Resource group**: Create new → name it `naac-verifier-rg`
   - **Name**: `naac-verifier-ai` (must be globally unique — add your college initials if taken)
   - **Region**: `East US` (has best Claude availability)
6. Click **"Review + create"** → **"Create"**
7. Wait ~2 minutes for deployment

### 1b. Deploy Claude Sonnet in AI Foundry

1. Once the resource is created, click **"Go to resource"**
2. Click **"Launch Azure AI Foundry"** (the big button on the overview page)
   - This opens **ai.azure.com** with your resource selected
3. In the left menu, click **"Model catalog"**
4. In the search box, type **"Claude"**
5. Click **"claude-sonnet-4-5"** (or latest Claude Sonnet available)
6. Click **"Deploy"** → **"Serverless API"**
7. Deployment name: leave as `claude-sonnet-4-5`
8. Click **"Deploy"**
9. Wait ~1 minute

### 1c. Get your endpoint and key

After deployment:
1. In AI Foundry, click **"Deployments"** in the left menu
2. Click your `claude-sonnet-4-5` deployment
3. You will see:
   - **Target URI** — copy this (looks like `https://naac-verifier-ai.services.ai.azure.com/models`)
   - **Key** — copy this (a long hex string)
4. Save both somewhere safe — you'll need them in Step 3

> **Note on the endpoint format:** The endpoint should be just the base URL:
> `https://naac-verifier-ai.services.ai.azure.com`
> (not the full path with `/models` — the app adds that automatically)

---

## STEP 2 — Push to GitHub

### 2a. Create a GitHub repository

1. Go to: **https://github.com/new**
2. Name: `naac-ssr-verifier`
3. Set to **Private** ✓ (keep your college's tool private)
4. Do NOT tick "Add a README"
5. Click **"Create repository"**

### 2b. Push the code

Open a terminal, go inside the `naac-prod` folder, and run:

```bash
git init
git add .
git commit -m "NAAC SSR Verifier v2.0 — Azure AI Claude"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/naac-ssr-verifier.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

---

## STEP 3 — Deploy to Render (Free Hosting)

### 3a. Create a Render account

1. Go to: **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with GitHub (easiest — no credit card needed)

### 3b. Create a Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Find `naac-ssr-verifier` and click **"Connect"**

### 3c. Configure the service

Fill these in **exactly**:

| Field | Value |
|---|---|
| **Name** | `naac-ssr-verifier` |
| **Region** | Singapore (closest to India) |
| **Branch** | `main` |
| **Root Directory** | *(leave blank)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

### 3d. Add environment variables

Scroll down to **"Environment Variables"** and add these one by one:

| Key | Value |
|---|---|
| `AZURE_AI_ENDPOINT` | Your endpoint from Step 1c (e.g. `https://naac-verifier-ai.services.ai.azure.com`) |
| `AZURE_AI_KEY` | Your key from Step 1c |
| `AZURE_AI_MODEL` | `claude-sonnet-4-5` |
| `NODE_ENV` | `production` |

### 3e. Deploy

Click **"Create Web Service"**.

Render will clone your repo, run the build, and start the server.
First deploy takes **3–5 minutes**.

When the log shows:
```
  ┌─────────────────────────────────────────┐
  │        NAAC SSR Verifier v2.0           │
  │  AI     : enabled ✓                     │
  └─────────────────────────────────────────┘
```
it's live. ✓

---

## STEP 4 — Verify It's Working

1. Open your Render URL (shown in the Render dashboard, looks like `https://naac-ssr-verifier.onrender.com`)
2. Check the health endpoint: `https://naac-ssr-verifier.onrender.com/api/health`
   - Should show `"enabled": true` and your model name
3. Click **"▷ Try Demo"** in the app to test the UI without uploading anything
4. Try the "Single URL" mode with: `https://www.coursera.org/verify/TESTFAKE123`
   - Should return FAKE with reasoning

---

## Running Locally (Development)

### Prerequisites
- Node.js 18+ (`node --version` to check)
- Git

### Setup

```bash
# 1. Go into the project folder
cd naac-prod

# 2. Install dependencies
npm run install:all

# 3. Create your local .env
cp .env.example .env
```

Now open `.env` in any text editor and fill in your Azure AI values:
```
AZURE_AI_ENDPOINT=https://naac-verifier-ai.services.ai.azure.com
AZURE_AI_KEY=your_actual_key_here
AZURE_AI_MODEL=claude-sonnet-4-5
NODE_ENV=development
```

### Run (single command)

```bash
npm run dev
```

This starts both backend (port 3000) and frontend (port 5173) together.
Open **http://localhost:5173** in your browser.

---

## Deploying Updates

After any code change:

```bash
git add .
git commit -m "describe your change"
git push
```

Render auto-detects the push and redeploys in ~2 minutes.

---

## Switching to Claude Opus (more thorough, uses more credits)

In Render → Your service → Environment:
- Change `AZURE_AI_MODEL` to `claude-opus-4-5`
- Click **"Save Changes"**
- Render will auto-restart

---

## Cost Tracking

To monitor your Azure credit usage:
1. Azure Portal → search **"Cost Management"**
2. Click **"Cost analysis"**
3. Set a **Budget alert** at $20 so you get an email warning early

### Approximate costs (Claude Sonnet on Azure):
| Action | Cost |
|---|---|
| 1 URL verified (AI analysis) | ~$0.000025 |
| Full SSR audit (200 links) | ~$0.005 |
| 1,000 full audits | ~$5 |
| Your $100 credit | ~20,000 full audits |

---

## Troubleshooting

**Health check shows `"enabled": false`**
→ Your `AZURE_AI_ENDPOINT` or `AZURE_AI_KEY` is wrong in Render environment variables.
→ Double-check: the endpoint should NOT have a trailing slash or `/models` at the end.

**"Deploy failed" in Render logs**
→ Look for the error. Most common: Node version mismatch.
→ Fix: In Render → Settings → Node version → set to `18`.

**"PDF has no links" error**
→ PDF is image-based (scanned). Run OCR first at https://www.ilovepdf.com/ocr-pdf

**Render free tier sleeps after 15 min of inactivity**
→ First request after sleep takes ~30 seconds (cold start).
→ Workaround: Set up a free monitor at https://uptimerobot.com to ping `/api/health` every 14 minutes.
→ Permanent fix: Upgrade Render to Starter tier ($7/month).

**Azure deployment shows "model not found"**
→ Make sure `AZURE_AI_MODEL` exactly matches the deployment name in Azure AI Foundry.
→ Go to AI Foundry → Deployments → copy the exact name shown there.

---

## Project Structure

```
naac-prod/
├── server/index.js              ← Express server (security, rate limiting, routing)
├── src/api/
│   ├── verify.js                ← Azure AI Claude analysis + platform verifiers
│   ├── extract.js               ← PDF hyperlink extraction (pdf-parse)
│   ├── report.js                ← HTML audit report generator
│   ├── health.js                ← Health check endpoint
│   └── platform-verifiers.js   ← Coursera, NPTEL, SWAYAM, DOI, GitHub, Drive, LinkedIn
├── frontend/
│   ├── src/App.jsx              ← Complete React UI (demo, filter, export, cancel)
│   ├── src/main.jsx             ← Entry point + ErrorBoundary
│   ├── src/ErrorBoundary.jsx    ← Crash recovery component
│   └── public/manifest.json    ← Web app manifest
├── .env.example                 ← Environment variable template
├── render.yaml                  ← Render deployment config
├── README.md                    ← Project overview
└── DEPLOY.md                    ← This file
```

---

## Security

- Rate limited: 80 API calls per 15 min per IP
- Upload limit: 12 PDFs per hour per IP  
- Max PDF size: 20 MB
- Helmet.js security headers on all responses
- CORS restricted to configured origins in production
- API keys only in environment variables — never in code
