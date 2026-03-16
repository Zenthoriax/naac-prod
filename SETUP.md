# NAAC SSR Verifier — Complete Setup Guide
## Step-by-step from zero to live (no prior experience needed)

---

## What You Need Before Starting

- Your **college email** (the one with Azure student credits)
- A **GitHub account** (free) — create at https://github.com if you don't have one
- **Node.js 18+** installed on your computer — download from https://nodejs.org (LTS version)
- **Git** installed — download from https://git-scm.com
- Basic familiarity with opening a terminal / command prompt

**Time required:** About 20–30 minutes for first-time setup.

---

## PART 1 — Azure AI Setup (~10 minutes)
### Get Claude AI working on your student credits

---

### Step 1.1 — Sign in to Azure

1. Open a browser and go to: **https://portal.azure.com**
2. Click **"Sign in"**
3. Enter your **college email address** (the one registered for Azure for Students)
4. Enter your password
5. If prompted, complete any two-factor authentication

> **Check your credits first:** In the Azure portal, search for "Subscriptions" in the top bar. Click "Azure for Students". You should see your remaining credit balance (you need at least a few dollars remaining).

---

### Step 1.2 — Create an Azure AI Foundry Resource

1. In the Azure portal, click the **search bar at the top** and type: `Azure AI Foundry`
2. Click **"Azure AI Foundry"** in the results (the one with the AI icon)
3. Click the **"+ Create"** button
4. Fill in the form:

   | Field | What to enter |
   |---|---|
   | **Subscription** | Azure for Students |
   | **Resource group** | Click "Create new" → type `naac-verifier-rg` → click OK |
   | **Name** | `naac-verifier-ai` (if taken, try `naac-ai-yourname`) |
   | **Region** | `East US` |

5. Click **"Review + create"** at the bottom
6. Review the summary, then click **"Create"**
7. Wait for the deployment to complete — you'll see a spinning icon, then "Your deployment is complete" (takes 1–3 minutes)
8. Click **"Go to resource"**

---

### Step 1.3 — Open Azure AI Foundry Studio

1. On your new AI resource page, look for a large button that says **"Launch Azure AI Foundry"** or **"Go to Azure AI Foundry"**
2. Click it — this opens a new tab at **ai.azure.com**
3. You should see your resource selected in the left panel

---

### Step 1.4 — Deploy Claude Sonnet

1. In the left sidebar, click **"Model catalog"**
2. In the search box at the top, type: `claude`
3. You'll see several Claude models. Click on **"claude-sonnet-4-5"**
   - If you don't see claude-sonnet-4-5, try "claude-sonnet" — use the latest Sonnet available
4. Click the **"Deploy"** button
5. In the dropdown that appears, select **"Serverless API"**
6. A panel will open on the right. You'll see:
   - **Deployment name**: leave as `claude-sonnet-4-5`
   - **Content filter**: leave as default
7. Click **"Deploy"** at the bottom of the panel
8. Wait ~1 minute for the deployment to complete

---

### Step 1.5 — Copy Your Endpoint and Key

This is the most important step — you need these two values to connect the app to AI.

1. In AI Foundry, click **"Deployments"** in the left sidebar
2. You'll see your `claude-sonnet-4-5` deployment listed
3. Click on it
4. You'll see a page with:
   - **Target URI** — looks like `https://naac-verifier-ai.services.ai.azure.com/models/chat/completions`
   - **Key** — a long string of letters and numbers

5. **Copy the Target URI** and paste it into Notepad/TextEdit. Then **remove the `/models/chat/completions` part at the end** — you only want: `https://naac-verifier-ai.services.ai.azure.com`

6. **Copy the Key** (click "Show" first if it's hidden, then copy)

7. Keep these somewhere safe — you'll need them in Part 3.

> **Example of what you should have:**
> - Endpoint: `https://naac-verifier-ai.services.ai.azure.com`
> - Key: `a1b2c3d4e5f6...` (32 characters)

---

## PART 2 — Project Setup on Your Computer (~5 minutes)

---

### Step 2.1 — Download and Extract the Project

1. Download the `naac-ssr-verifier-v2.zip` file
2. Extract/unzip it to a folder on your Desktop or Documents
3. You should now have a folder called `naac-prod` containing many files

---

### Step 2.2 — Create Your Environment File

1. Open the `naac-prod` folder
2. Find the file named `.env.example`
3. **Make a copy** of it and rename the copy to `.env` (just `.env`, no other extension)
   - On Windows: Right-click → Copy → Paste → Rename to `.env`
   - On Mac: Duplicate and rename
4. Open the `.env` file with any text editor (Notepad, TextEdit, VS Code)
5. Fill in your values:

```
AZURE_AI_ENDPOINT=https://naac-verifier-ai.services.ai.azure.com
AZURE_AI_KEY=paste_your_key_here
AZURE_AI_MODEL=claude-sonnet-4-5
NODE_ENV=development
```

6. Save and close the file

> **Important:** The `.env` file must stay private — never upload it to GitHub or share it. The `.gitignore` file already ensures it won't be uploaded accidentally.

---

### Step 2.3 — Install Dependencies

1. Open a **Terminal** (Mac/Linux) or **Command Prompt / PowerShell** (Windows)
2. Navigate to the `naac-prod` folder:
   ```bash
   cd Desktop/naac-prod
   # (adjust the path to wherever you extracted the folder)
   ```
3. Run:
   ```bash
   npm run install:all
   ```
   This installs all required packages. It will take 1–3 minutes and show a lot of output — this is normal.

---

### Step 2.4 — Test It Locally

1. Still in the terminal, run:
   ```bash
   npm run dev
   ```
2. You'll see output like:
   ```
   server  | NAAC SSR Verifier v2.0
   server  | AI: enabled ✓
   frontend| Local: http://localhost:5173
   ```
3. Open your browser and go to: **http://localhost:5173**
4. You should see the NAAC SSR Verifier homepage
5. Click **"▷ Try Demo"** — you should see 8 sample links being verified with results

**If the demo works, your local setup is complete.** Press `Ctrl+C` in the terminal to stop.

---

## PART 3 — Deploy to Render (Free Hosting) (~10 minutes)

Render hosts your app online so your whole team can use it without needing to run it locally.

---

### Step 3.1 — Push to GitHub

1. Go to **https://github.com/new** to create a new repository
2. Fill in:
   - **Repository name**: `naac-ssr-verifier`
   - **Visibility**: Private (recommended — keep your tool private)
   - Do **NOT** check "Add a README file"
3. Click **"Create repository"**
4. GitHub will show you a page with instructions. Look for the section **"…or push an existing repository from the command line"**

5. Open your terminal, go into the `naac-prod` folder, and run these commands **one at a time**:

```bash
git init
git add .
git commit -m "NAAC SSR Verifier v2.0 — initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/naac-ssr-verifier.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

6. It will ask for your GitHub username and password. For the password, **use a Personal Access Token**, not your account password:
   - Go to https://github.com/settings/tokens → "Generate new token (classic)"
   - Check "repo" scope → Generate → Copy the token
   - Paste it as the password in the terminal

7. After pushing, refresh your GitHub repository page — you should see all the project files there.

---

### Step 3.2 — Create a Render Account

1. Go to: **https://render.com**
2. Click **"Get Started for Free"**
3. Click **"Continue with GitHub"** — sign in with the same GitHub account
4. Authorize Render to access your GitHub

---

### Step 3.3 — Create a Web Service on Render

1. Once logged into Render, click **"New +"** in the top navigation
2. Select **"Web Service"**
3. In the list of repositories, find `naac-ssr-verifier` and click **"Connect"**

---

### Step 3.4 — Configure the Service

Fill in these fields exactly:

| Field | Value |
|---|---|
| **Name** | `naac-ssr-verifier` |
| **Region** | `Singapore` |
| **Branch** | `main` |
| **Root Directory** | *(leave completely blank)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

---

### Step 3.5 — Add Environment Variables

Scroll down on the same page to find the **"Environment Variables"** section. Click **"Add Environment Variable"** for each of these:

| Key | Value |
|---|---|
| `AZURE_AI_ENDPOINT` | Your endpoint from Step 1.5 (e.g. `https://naac-verifier-ai.services.ai.azure.com`) |
| `AZURE_AI_KEY` | Your key from Step 1.5 |
| `AZURE_AI_MODEL` | `claude-sonnet-4-5` |
| `NODE_ENV` | `production` |

> **Double-check the endpoint:** It should NOT end with `/models` or `/chat/completions` — just the base URL.

---

### Step 3.6 — Deploy

1. Scroll to the bottom and click **"Create Web Service"**
2. Render will start deploying. You'll see a live log stream.
3. Watch for this output in the logs:

```
==> Build successful 🎉
==> Deploying...
  NAAC SSR Verifier v2.0
  AI: enabled ✓
  Model: claude-sonnet-4-5
==> Your service is live 🎉
```

4. Deployment takes about **3–6 minutes** on first run.

---

### Step 3.7 — Access Your Live App

1. At the top of your Render service page, you'll see a URL like: `https://naac-ssr-verifier.onrender.com`
2. Click it — your app is now live!
3. **Verify AI is working:** Go to `https://naac-ssr-verifier.onrender.com/api/health`
   - You should see JSON with `"enabled": true`

---

## PART 4 — Using the App

---

### How to Verify an SSR Document

**Method 1: Upload PDF (Recommended)**
1. Open the app
2. Click **"Upload PDF"** tab
3. Drag and drop your SSR PDF, or click to browse
4. Click **"Run Verification Audit"**
5. Watch as each link is verified in real-time

**Method 2: Paste Text**
1. Click **"Paste Text"** tab
2. Copy the text content of your SSR (or just the list of URLs)
3. Paste into the text box
4. Click **"Run Verification Audit"**

**Method 3: Check a Single URL**
1. Click **"Single URL"** tab
2. Paste the URL (e.g., a Coursera certificate link)
3. Press Enter or click **"Run Verification Audit"**

---

### Understanding the Results

**GENUINE** (green) — The link works, the platform confirms the proof is real, and the content matches what's claimed.

**SUSPICIOUS** (yellow) — Something is off. Common reasons:
- Google Drive link is private (fix: change sharing to "Anyone with the link")
- LinkedIn certificate (needs manual committee review)
- URL works but content couldn't be fully verified

**FAKE** (red) — Strong evidence of fabrication:
- Coursera/NPTEL certificate ID returns 404 (doesn't exist)
- DOI doesn't resolve to any publisher
- URL uses a private IP address
- Certificate generator URL detected

**UNREACHABLE** (grey) — URL is broken, returns error, or timed out.

---

### Reading a Result Card

Click any result to expand it and see:
- **AI Analysis** — Claude's reasoning in plain English
- **Issues Found** — Specific problems detected (red flags)
- **Technical Checks** — HTTP status, SSL, domain trust etc.
- **Copy** button — Copy the URL to clipboard
- **Open ↗** button — Open the URL in a new tab to inspect manually

---

### Exporting the Audit Report

After an audit completes:
1. Click **"↓ Export Report"** in the toolbar
2. An HTML file downloads to your computer
3. Open it in any browser
4. Click **"🖨 Print / Save as PDF"** to create a PDF version
5. Share the report with the NAAC committee or use it as a pre-submission checklist

---

### Filtering Results

Use the filter buttons to focus on specific categories:
- **All** — Shows everything
- **Fake** — Only confirmed fake/fabricated links
- **Suspicious** — Links that need manual review
- **Genuine** — Verified authentic links
- **Unreachable** — Broken links

---

## PART 5 — Keeping It Running

---

### Render Free Tier Sleep Issue

Render's free tier **spins down after 15 minutes of inactivity**. The first request after sleep takes about 30 seconds to wake up. This is usually fine for internal use.

**To keep it always awake (optional):**
1. Create a free account at **https://uptimerobot.com**
2. Click "Add New Monitor"
3. Monitor type: **HTTP(s)**
4. URL: `https://naac-ssr-verifier.onrender.com/api/health`
5. Monitoring interval: **14 minutes**
6. Save — UptimeRobot will ping your app every 14 minutes, preventing sleep

---

### Deploying Updates

Whenever you change code and want to update the live app:

```bash
git add .
git commit -m "describe what you changed"
git push
```

Render detects the push automatically and redeploys in ~2 minutes.

---

### Monitoring Azure Credit Usage

To make sure you don't accidentally overspend:
1. Azure Portal → search "Cost Management"
2. Click **"Budgets"** → **"+ Add"**
3. Set amount to **$20** with email alert
4. This warns you before costs get high

At normal usage (~10 SSR audits per day), you'll use less than **$2 per month**.

---

## Troubleshooting

**App loads but shows "AI: Rule-based mode" in the header**
→ Your `AZURE_AI_ENDPOINT` or `AZURE_AI_KEY` is wrong in Render environment variables.
→ Fix: Render dashboard → your service → Environment → check and correct the values → Manual Deploy.

**"Deploy failed" in Render logs, mentions Node version**
→ Render → your service → Settings → scroll to "Build & Deploy" → set Node Version to `18`.

**"No links found in PDF"**
→ Your PDF is image-based (scanned, not digital). The text extractor can't read images.
→ Fix: Go to https://www.ilovepdf.com/ocr-pdf → upload the PDF → download the OCR version → re-upload to the verifier.

**Render deployment succeeds but app shows a white screen**
→ The frontend build may have failed silently. Check Render logs for errors during the build step.

**Azure API key error ("401 Unauthorized")**
→ Your key may have expired or been regenerated. Go to Azure AI Foundry → Deployments → your deployment → regenerate key → update in Render environment variables.

**"Too many requests" error**
→ The app limits 80 verifications per 15 minutes per user to prevent abuse. Wait 15 minutes and try again.

---

## Quick Reference

| Task | Where |
|---|---|
| View live app | `https://naac-ssr-verifier.onrender.com` |
| Check AI status | `https://naac-ssr-verifier.onrender.com/api/health` |
| View Render logs | render.com → your service → Logs tab |
| Update Azure key | Azure portal → AI Foundry → Deployments |
| Monitor credit usage | Azure portal → Cost Management |
| Redeploy after code change | `git add . && git commit -m "msg" && git push` |
