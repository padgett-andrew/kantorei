# Kantorei — Public Website & Singer Portal

A unified, zero-maintenance **Public Marketing Website + Authenticated Singer Portal** built for [Kantorei](https://kantorei.net) (501(c)(3) choral ensemble in Minnesota).

Hosted on **Cloudflare Workers** (`Astro 5 + React 19 + Tailwind CSS v4`), powered entirely by a **Master Google Sheet** and **Google Drive Shared Folder** with zero SQL/NoSQL databases to manage or pay for.

---

## Documentation Directory

| Document | Audience | Description |
| :--- | :--- | :--- |
| **[`docs/admin-guide.md`](./docs/admin-guide.md)** | **Choir Board & Admins** | Non-technical operations manual for the Artistic Director, Music Librarian, Section Leaders, and Managing Director (managing the roster, uploading music, roll call attendance, snack claims, and ticketing). |
| **[`docs/production-handover.md`](./docs/production-handover.md)** | **Dev / Maintainers** | Step-by-step runbook for moving from staging (`*.workers.dev`) to Kantorei's official 501(c)(3) Cloudflare account at `kantorei.net`. |
| **[`GEMINI.md`](./GEMINI.md)** | **Engineers** | Complete architectural blueprint, schema specifications for all 8 Google Sheet tabs, and Web Crypto security model. |

---

## Core Architecture & Philosophy

1. **Zero Database Maintenance:** The Master Google Sheet and a Google Shared Drive serve as the entire CMS and database via lightweight REST APIs + `jose` RS256 Web Crypto JWTs.
2. **Zero Hosting Seat Tax & Zero Egress Fees:** Hosted on Cloudflare Workers ($0 free tier, unlimited board access, 0ms cold starts, and $0 egress fees for streaming rehearsal MP3s and score PDFs).
3. **Universal Singer Login:** Supports both 1-click **"Continue with Google"** OAuth and a **stateless 6-digit Email Login Code (OTP)** via Resend, allowing singers on `@icloud.com`, `@outlook.com`, `@yahoo.com`, or university emails to log in with zero database overhead.
4. **Resilient Edge Caching:** Cloudflare Cache API (`caches.default`) with serve-stale-on-error fallbacks and exponential backoff retries, ensuring the portal stays up even during Google API hiccups.
5. **Sandbox Resilience:** The codebase functions out-of-the-box in local development with realistic mock data even before live Google or Resend credentials are configured.

---

## Quick Start (Local Development)

The repository comes pre-configured with **Interactive Sandbox Mode** (`GOOGLE_MASTER_SHEET_ID="DEMO"` and `DEV_PREVIEW_BYPASS="true"` in `.env.example`). Clone the repository and run:

```bash
# 1. Install dependencies
npm install

# 2. Copy the development environment template
cp .env.example .env

# 3. Start local development server
npm run dev
```

Open **`http://localhost:4321`**:
* **Public Site & Box Office:** `/`, `/concerts`, `/about`, `/support`, `/media`
* **Singer Authentication:** `/login` (1-click Google OAuth or 6-digit Email OTP)
* **Authenticated Singer Portal:**
  * `/portal`: Dashboard with next rehearsal call, announcements, and 1-tap iCal calendar subscription.
  * `/portal/music`: Tablet & ForScore-optimized repertoire browser with audio part player.
  * `/portal/seating`: Formation risers, seat locator, and 1-tap mobile attendance roll call.
  * `/portal/absences`: Self-service absence reporting and section leader notifications.
  * `/portal/snacks`: 1-tap hospitality snack signup board.
  * `/portal/directory`: Member contact directory and administrative roster manager.
  * `/portal/handbook`: Sanitized Google Doc Choir Handbook reader.

---

## CLI Tooling & Command Reference

```bash
# Development & Verification
npm run dev              # Starts Astro 5 dev server with HMR at http://localhost:4321
npm run check            # Runs strict Astro & TypeScript typechecking (0 errors target)
npm run build            # Builds production serverless bundle for Cloudflare Workers
npm run preview          # Runs local Cloudflare Workers preview via wrangler dev

# Environment & Diagnostic Doctors
npm run doctor:env       # Audits active environment configuration against dev rules
npm run doctor:env:prod  # Audits environment against strict production invariants
npm run env:sync-dev     # Synchronizes .env -> .dev.vars for local wrangler dev

# Database & Schema Management
npm run init:sheets      # Idempotently audits & provisions all 8 Master Sheet tabs with canonical headers
npm run backup:sheets    # Creates a timestamped JSON snapshot of the entire Master Sheet in backups/
npm run setup:key        # Imports a downloaded Google Cloud Service Account JSON key into .env

# Deployment & Secrets
npm run deploy:secrets   # Safely uploads production secrets to Cloudflare Workers (guards against dev defaults)
npm run deploy           # Runs typecheck + build + Cloudflare deployment in one chain
```

---

## Directory Structure

```text
├── .github/workflows/
│   └── deploy.yml              # CI/CD: Verification on PRs + Cloudflare Workers deploy on main
├── docs/
│   ├── admin-guide.md          # Non-technical Choir Board & Operations Manual
│   └── production-handover.md  # Production go-live runbook for kantorei.net
├── scripts/
│   ├── doctor-env.mjs          # Environment policy auditor CLI
│   ├── init-sheets.mjs         # Master Sheet schema auto-provisioner
│   ├── backup-sheets.mjs       # Instant JSON database snapshot utility
│   ├── sync-dev-vars.mjs       # .env -> .dev.vars synchronizer
│   └── sync-cloudflare-secrets.mjs # Validated Cloudflare secret uploader
├── setup/
│   └── google-apps-script.js   # Ready-to-paste instant push webhook (<100ms updates)
├── src/
│   ├── middleware.ts           # Route guard, singer hydration, CSRF defense & security headers
│   ├── lib/
│   │   ├── env.ts              # Typed environment variables, Zod schemas & policy engine
│   │   ├── cache.ts            # Edge cache with serve-stale-on-error resilience
│   │   ├── auth.ts             # Google OAuth PKCE, JWT sessions & stateless OTP verification
│   │   ├── google/             # Zero-dependency Google Sheets & Drive REST client + retries
│   │   ├── email.ts            # Direct Resend REST client for login OTP & absence alerts
│   │   └── calendar.ts         # RFC-5545 subscribable .ics calendar feed builder
│   ├── components/             # React islands (SnackBoard, MusicLibrary, Seating, Roster)
│   └── pages/                  # Public marketing pages, authenticated portal & API routes
├── wrangler.jsonc              # Cloudflare Workers serverless deployment configuration
└── GEMINI.md                   # Complete architectural blueprint & sheet schemas
```

---

## Security & Privacy Model

* **Stateless Authentication:** User sessions use Web Crypto HS256 JWTs signed with `AUTH_SECRET` stored in `httpOnly`, `Secure`, `SameSite=Lax` cookies with 180-day choral season persistence. No database sessions or login tables to purge.
* **Live Roster Revocation:** On every protected request, `src/middleware.ts` verifies the singer is currently active in the cached `Roster` sheet. Setting `Active: FALSE` in Google Sheets revokes access globally within 60 seconds.
* **Edge CSRF Defense:** State-mutating API routes (`POST`, `PUT`, `DELETE`) enforce `Sec-Fetch-Site: same-origin` and verify the `Origin` header at the Cloudflare edge.
* **Privacy:** All member phone numbers, email addresses, and database snapshots are git-ignored and never committed to source control.
