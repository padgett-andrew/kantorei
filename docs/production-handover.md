# Production Handover & Cloudflare Setup Playbook

This document is the exact step-by-step runbook for moving Kantorei's live production environment from your personal development account (`apadgettski.workers.dev`) to Kantorei's official 501(c)(3) Cloudflare organization account at `kantorei.net`.

---

## 1. Cloudflare Account & Domain Setup (Kantorei 501(c)(3))

1. **Create/Log into Kantorei's Cloudflare Account:**
   * Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in with the organization's official admin email (e.g., `admin@kantorei.net`).
2. **Add Domain `kantorei.net`:**
   * Click **Add a domain** $\rightarrow$ enter `kantorei.net` $\rightarrow$ select the **Free Plan ($0/month)**.
   * Update the nameservers at your registrar (GoDaddy, Google Domains / Squarespace, Namecheap) to Cloudflare's assigned nameservers.
   * SSL/TLS encryption mode: Set to **Full (strict)**.

---

## 2. Generate Cloudflare API Token for GitHub Actions

1. In the top-right profile menu, click **My Profile $\rightarrow$ API Tokens**.
2. Click **Create Token** $\rightarrow$ select **"Edit Cloudflare Workers"** template:
   * **Permissions:**
     * `Account` | `Worker Scripts` | `Edit`
     * `Zone` | `Workers Routes` | `Edit`
   * **Account Resources:** Select Kantorei's Account.
   * **Zone Resources:** Select `kantorei.net`.
3. Click **Continue to summary $\rightarrow$ Create Token**. Copy the token.
4. Copy Kantorei's **Account ID** (found on the Workers & Pages overview sidebar).

---

## 3. Configure GitHub Repository Secrets

In your GitHub repository (`padgett-andrew/kantorei`):
1. Navigate to **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**.
2. Add the following repository secrets:
   * `CLOUDFLARE_API_TOKEN`: The API token generated above.
   * `CLOUDFLARE_ACCOUNT_ID`: The Account ID from the Cloudflare dashboard.

> **Note:** As soon as these two secrets are added, every commit merged into `main` will automatically build and deploy directly to Kantorei's official Cloudflare account.

---

## 4. Prepare & Audit Production Environment Variables

1. Create a local `.env.production` file (this file is git-ignored):
   ```env
   # Core & Stateless Auth
   PUBLIC_SITE_URL="https://kantorei.net"
   AUTH_SECRET="<generate with: openssl rand -base64 32>"
   DEV_PREVIEW_BYPASS="false"

   # Google Cloud Service Account & Live Choir Database Sheet
   GOOGLE_SERVICE_ACCOUNT_EMAIL="choir-bot@<kantorei-project>.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID="<your-real-choir-sheet-id>"
   REPERTOIRE_DRIVE_FOLDER_ID="1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc"

   # Resend Email (Live Domain)
   RESEND_API_KEY="re_..."
   PORTAL_FROM_EMAIL="Kantorei Portal <portal@kantorei.net>"
   SANDBOX_OVERRIDE_EMAIL=""
   ```

2. **Audit before uploading:**
   ```bash
   npm run doctor:env:prod -- .env.production
   ```
   This will verify that `AUTH_SECRET` has sufficient entropy, private keys are properly formatted, and no dev bypass or sandbox overrides are active.

---

## 5. Upload Production Secrets to the Worker

Run:
```bash
npm run deploy:secrets -- .env.production
```
Or paste the secrets into the Cloudflare Dashboard under **Workers & Pages $\rightarrow$ kantorei-web $\rightarrow$ Settings $\rightarrow$ Variables and Secrets**.

---

## 6. Attach Custom Domain `kantorei.net`

1. In the Cloudflare Dashboard, open **Workers & Pages $\rightarrow$ kantorei-web $\rightarrow$ Settings $\rightarrow$ Domains & Routes**.
2. Click **Add $\rightarrow$ Custom Domain**:
   * Add `kantorei.net`
   * Add `www.kantorei.net`
3. Cloudflare will automatically provision edge SSL certificates within a few minutes.

---

## 7. Zero-Downtime Rollback Runbook (In an Emergency)

If an issue ever occurs after a production release:
* **Option 1 (CLI):** Run `npx wrangler rollback`
* **Option 2 (Dashboard):** In the Cloudflare Dashboard, go to **Workers & Pages $\rightarrow$ kantorei-web $\rightarrow$ Deployments** $\rightarrow$ click **Rollback to this version** next to the last known good deployment. The rollback is instantaneous worldwide.

