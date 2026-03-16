# NAAC SSR Verifier v2.0

**Detect fake and unverifiable proof links in NAAC Self Study Reports before submission.**

Powered by **Claude Sonnet on Azure AI** — uses your Azure student credits, no separate API subscription needed.

---

## What It Does

Extracts every hyperlink from your SSR PDF and audits each one:

| Platform | What's checked |
|---|---|
| **Coursera** | Certificate ID verified against Coursera's database |
| **NPTEL** | Certificate page content on archive.nptel.ac.in |
| **SWAYAM** | Resolution on swayam.gov.in |
| **DOI / Journals** | DOI resolves to real publisher (IEEE, Springer, Elsevier…) |
| **Google Drive** | Public vs private — NAAC needs public links |
| **GitHub** | Repository exists and is public |
| **LinkedIn** | Reachability + manual review flag |
| **All others** | Claude AI reads the page and reasons about authenticity |

**Verdicts:** GENUINE · SUSPICIOUS · FAKE · UNREACHABLE

**Features:** Demo mode · Filter by verdict · Export printable HTML report · Cancel mid-audit

---

## Deploy (15 minutes)

See **[DEPLOY.md](./DEPLOY.md)** for complete step-by-step instructions.

Short version:
1. Azure Portal → Azure AI Foundry → deploy `claude-sonnet-4-5`
2. Copy your endpoint + key
3. Push this repo to GitHub
4. Create Web Service on Render.com — connect repo, add env vars, deploy

---

## Local Development

```bash
npm run install:all        # install all dependencies
cp .env.example .env       # copy env template
# fill in AZURE_AI_ENDPOINT and AZURE_AI_KEY in .env
npm run dev                # starts backend + frontend together
# open http://localhost:5173
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AZURE_AI_ENDPOINT` | ✅ | Azure AI Foundry endpoint URL |
| `AZURE_AI_KEY` | ✅ | Azure AI API key |
| `AZURE_AI_MODEL` | No | Model name (default: `claude-sonnet-4-5`) |
| `NODE_ENV` | No | `production` on server |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

---

## Cost (Azure Student Credits)

~**$0.005 per 200-link SSR audit**. Your $100 credit covers ~20,000 full audits.

*Internal pre-submission review tool. Not an official NAAC document.*
