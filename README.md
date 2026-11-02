# Kantorei — Public Website & Singer Portal

Zero-maintenance **Public Website + Authenticated Singer Portal** built with **Astro 5**, **React 19**, **Tailwind CSS v4**, and **Cloudflare Workers**, powered entirely by a **Master Google Sheet** and **Google Shared Drive**.

## Quick Start (Sandbox / Demo Mode)

The repository comes pre-configured with an interactive **Sandbox Mode** (`GOOGLE_MASTER_SHEET_ID="DEMO"` and `DEV_PREVIEW_BYPASS="true"` in `.env`), so you can test every feature—including rehearsal snack claims, absence notifications, ForScore PDF streaming, iPad audio part playback, role switching (`Admin` / `Section Leader` / `Singer`), and Ticket Tailor / Givebutter checkout previews—before connecting live credentials:

```bash
npm install
npm run dev
```

Open **http://localhost:4321**:
- **Public Site & Box Office:** `/`, `/concerts`, `/about`, `/support`
- **Singer Sign-In (Google OAuth + 6-Digit Email OTP):** `/login`
- **Authenticated Singer Portal:** `/portal`, `/portal/music`, `/portal/absences`, `/portal/snacks`, `/portal/directory`, `/portal/handbook`, `/portal/admin`

## Production Setup Checklist

1. **Google Workspace (Sheets & Shared Drive):**
   - Create a Master Google Sheet with the 5 tabs defined in [`GEMINI.md`](./GEMINI.md): `Roster`, `Schedule`, `Absences`, `Concerts`, and `Config`.
   - Create a Google Cloud Service Account (enable **Google Sheets API** and **Google Drive API**), download its JSON key, and share the Service Account email as **Editor** on the Master Sheet and **Viewer** on the Repertoire folder and Handbook Google Doc.
2. **Authentication (Google OAuth + Resend Email OTP):**
   - Create a Google OAuth 2.0 Web Client with Authorized Redirect URI `https://your-domain.net/api/auth/google/callback`.
   - Create a [Resend](https://resend.com) API key and verify your `.net` domain so both absence notifications and 6-digit login codes for non-Gmail singers (`@icloud.com`, `@outlook.com`, `@yahoo.com`) deliver seamlessly.
3. **Deploy to Cloudflare Workers:**
   ```bash
   npx wrangler login
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
   npx wrangler secret put GOOGLE_PRIVATE_KEY
   npx wrangler secret put GOOGLE_MASTER_SHEET_ID
   npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
   npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
   npx wrangler secret put RESEND_API_KEY
   npm run deploy
   ```

## Verification Commands

```bash
npm run check   # Astro + TypeScript strict verification
npm run build   # Production Cloudflare Worker + client island bundle
```

