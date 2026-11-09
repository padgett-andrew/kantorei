# GEMINI.md — Choir Website & Singer Portal Architecture Blueprint

## 1. Project Overview & Core Philosophy

You are an expert full-stack Astro, React, and Cloudflare Edge engineer building a unified, zero-maintenance **Public Website + Authenticated Singer Portal** for a 501(c)(3) choral ensemble (**Kantorei**), hosted on **Cloudflare Workers** (`Astro 5 + React Islands`) at our `.net` domain.

### The Golden Rule: "Bus-Factor Maintainability"

Non-technical choir board members, music librarians, and section leaders MUST be able to operate the entire site day-to-day without touching code, GitHub, or database dashboards.

1. **Zero Database Maintenance:** A single **Choir Google Sheet** and a **Google Drive / Shared Drive folder** (accessed via a Google Cloud Service Account over lightweight REST + `jose` Web Crypto JWTs) serve as our entire CMS and database. There is no SQL/NoSQL database to pay for, migrate, or unpause after summer hiatus.
3. **Zero Custom Payment Math:** All concert ticketing and Flex Season Passes use embedded **Ticket Tailor** widgets (`0%` fee on `$0` pass redemptions, `50%` charity discount on paid tickets, plus in-cart add-on donations). Standalone fundraising uses embedded **Little Green Light (LGL) Forms** with native Enhanced Checkout (Apple Pay, Google Pay, ACH, credit cards).
5. **Sandbox / Prototype Resilience:** The codebase MUST gracefully handle missing or placeholder credentials during local/sandbox development (rendering realistic mock repertoire/schedule/roster data, interactive preview cards when `DEMO` / `DEMO_SERIES_ID` is configured, and supporting Resend's `onboarding@resend.dev` sandbox rules).
6. **100% Dynamic Content via Google Sheets CMS (Zero Code Deploys for Copy, Contact & Staff Changes):** ALL public site copy, statements, official contact details, board of directors, artistic leadership bios, and giving tiers MUST be manageable directly from the **Choir Google Sheet** (`Config`, `Board`, `Leadership`, `Giving_Tiers`) or Google Drive. Future AI instances and engineers MUST NEVER hardcode copy, statements, emails, phone numbers, or staff rosters into `.astro` or `.tsx` templates. Always read from `getPortalConfig()` or the corresponding sheet getters with safe default fallbacks and 60-second edge caching.

---

## 2. Tech Stack & Dependencies

- **Framework:** **Astro 5** (`output: 'server'` with `@astrojs/cloudflare` adapter, static/cached public HTML shells, and `@astrojs/react` interactive islands)
- **Interactive UI & Styling:** **React 19** + **Tailwind CSS v4** (`@tailwindcss/vite`) + `lucide-react` icons + `clsx` + `tailwind-merge`
- **Authentication:** Native Web Crypto **Google OAuth 2.0 PKCE** + **`jose`** (JWKS ID-token verification, Web Crypto JWT sessions & stateless HMAC-signed 6-digit Email OTP verification — zero database required). Access to `/portal/*` and protected `/api/*` routes is gated by `src/middleware.ts` + live `requireSinger()` / `requireAdmin()` checks against the cached `Roster` sheet.
- **Backend / Google Workspace Integration:** Direct **Google Sheets API v4 & Google Drive API v3 REST calls** via `fetch()` authenticated with a **`jose`** Service Account RS256 JWT (replaces the 180 MB Node-only `googleapis` package for `0ms` Cloudflare Worker cold starts; supports Google Shared Drives via `supportsAllDrives=true&includeItemsFromAllDrives=true`).
- **Schema Resilience:** **`zod`** row-level `.safeParse()` validation on all Google Sheet tabs so blank spacer rows or board typos never crash the site (and surface clear data-health warnings on `/portal/admin`).
- **Edge Caching & Resilience:** Cloudflare Cache API (`caches.default`) with automatic in-memory TTL fallback during local `astro dev`, instant cache-key invalidation on mutations, **serve-stale-on-error** fallback (preventing mass singer logouts during Google API hiccups), and **exponential backoff + jitter retries** (`fetchWithRetry`) on all Google Workspace REST requests.
- **HTML Sanitization:** Edge-safe HTML sanitizer (`sanitize-html` / pure-JS whitelist sanitizer) for rendering the exported Choir Handbook Google Doc cleanly.
- **Transactional Email:** Direct **Resend REST API** via `fetch()` (zero Node SDK overhead; routes absence alerts dynamically to the Artistic Director + Section Leaders, and delivers 6-digit login codes).
- **Hosting:** **Cloudflare Workers** (`wrangler.jsonc`)

### Installation Command

```bash
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
npm install @astrojs/cloudflare @astrojs/react react react-dom @tailwindcss/vite tailwindcss jose zod lucide-react clsx tailwind-merge
npm install -D @types/react @types/react-dom wrangler
```

---

## 3. Environment Variables (`.dev.vars` / `.env` & Cloudflare Secrets)

In local development, Astro/Wrangler reads from `.env` / `.dev.vars`. In production, store secrets via `wrangler secret put` or the Cloudflare Workers dashboard.

```env
# 1. Site & Stateless Auth (Generate AUTH_SECRET with: openssl rand -base64 32)
PUBLIC_SITE_URL="http://localhost:4321"
AUTH_SECRET="your-32-byte-base64-secret"
GOOGLE_OAUTH_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="your-google-oauth-client-secret"
# Strictly honored ONLY when import.meta.env.DEV === true
DEV_PREVIEW_BYPASS="true"

# 2. Google Cloud Service Account (for Sheets v4 & Drive v3 REST APIs)
GOOGLE_SERVICE_ACCOUNT_EMAIL="choir-bot@your-project.iam.gserviceaccount.com"
# Note: Code must always normalize escaped newlines via .replace(/\\n/g, '\n')
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="DEMO"

# 3. Email Notifications & Login OTP (Resend REST API)
# For sandbox testing without DNS access, use "onboarding@resend.dev"
RESEND_API_KEY=""
PORTAL_FROM_EMAIL="Kantorei Portal <onboarding@resend.dev>"
# Optional override during sandbox testing so all emails go to developer's verified Resend address
SANDBOX_OVERRIDE_EMAIL=""

# 4. Box Office & Fundraising Embeds (Use "DEMO" in sandbox mode)
# Base Ticket Tailor box office URL; combined with Concerts.TT_Event_Series_ID as `${BOX_OFFICE_URL}/${ttEventSeriesId}`
PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL="https://www.tickettailor.com/events/demo"
# Optional API key: when provided, /concerts and home page auto-fetch directly from Ticket Tailor REST API (zero Google Sheet double-entry)
TICKET_TAILOR_API_KEY=""
TICKET_TAILOR_WEBHOOK_SECRET=""
PUBLIC_LGL_FORM_URL="https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA"

# 5. Friends of Kantorei Newsletter (MailerLite REST API)
MAILERLITE_API_KEY=""
MAILERLITE_GROUP_ID=""
```

### 3.1 Environment Policy, Tiers & Invariants

Kantorei operates with three clear environment tiers governed by `src/lib/env.ts` and audited by `npm run doctor:env`:

| Tier              | Runtime & Detection                                 | Permitted Fallbacks & Rules                                                                                                                                                                                                                                                |
| :---------------- | :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`development`** | `astro dev` / Vite (`import.meta.env.DEV === true`) | Permissive zero-setup: Fallback to mock data if Sheet ID is `"DEMO"`, dev fallback `AUTH_SECRET` tolerated with warning, OTP code printed on-screen if Resend is unset, `DEV_PREVIEW_BYPASS="true"` allows 1-click role switcher.                                          |
| **`preview`**     | `wrangler dev` (`npm run preview`) / PR previews    | Edge parity: Cloudflare Workers runtime, reads `.dev.vars` (synced via `npm run env:sync-dev`), `DEV_PREVIEW_BYPASS` disabled, Resend sandboxing (`SANDBOX_OVERRIDE_EMAIL` or `onboarding@resend.dev`) required to protect real singers.                                   |
| **`production`**  | Cloudflare Workers (`kantorei-web`)                 | Strict invariant enforcement: `AUTH_SECRET` must be high entropy (>= 32 chars, never default fallback), `DEV_PREVIEW_BYPASS` strictly prohibited, valid Google Service Account credentials & Sheet ID required, `PUBLIC_SITE_URL` must use `https://`, real email routing. |

#### Environment CLI Tooling & Automated Health Audits

- `npm run doctor:env`: Audits current environment against local development rules.
- `npm run doctor:env:prod`: Audits environment against strict production invariants prior to deployment.
- `npm run env:sync-dev`: Synchronizes `.env` into `.dev.vars` for Cloudflare Workers local preview (`wrangler dev`).
- `npm run backup:sheets`: Creates an instantaneous JSON snapshot of all Choir Sheet tabs in a git-ignored `backups/` directory for disaster recovery.
- `npm run init:sheets`: Idempotently audits and provisions any missing Choir Sheet tabs with canonical headers, frozen row 1, column styling, and in-cell Data Validation dropdowns/chips for all constrained fields.
- `npm run deploy:secrets`: Verifies production `AUTH_SECRET` entropy before uploading secrets via `wrangler secret bulk`.
- **Live Health API (`/api/health`)**: Lightweight edge endpoint verifying live connectivity and latency for Google Sheets, Google Drive, Resend, Ticket Tailor, and MailerLite without leaking credentials. Returns HTTP 200 (healthy/degraded) or HTTP 503 (unhealthy/critical failure).
- **Automated Health Monitor (`.github/workflows/health-check.yml`)**: Automated GitHub Actions cron that audits the live production `/api/health` endpoint every Monday morning and emails maintainers if any credentials or services fail.

#### CI/CD & Deployment Pipeline (`.github/workflows/deploy.yml`)

- **Pull Requests & Non-Main Branches:** Automatically verifies `npm ci`, `npm run check` (TypeScript), and `npm run build` on Node 22.
- **Push / Merge to `main`:** Runs full verification and deploys worker to Cloudflare using `cloudflare/wrangler-action@v3`.
- **Required GitHub Secrets:**
  - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token with Edit Workers permissions.
  - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID found on the Workers overview dashboard.

---

## 4. Choir Google Sheet Schema (`GOOGLE_SHEET_ID` / `GOOGLE_MASTER_SHEET_ID`)

Recommend placing the Choir Google Sheet, Repertoire folder, and Choir Handbook inside a **Google Workspace for Nonprofits Shared Drive**. Share `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Content Manager / Editor** on the Choir Google Sheet and **Viewer** on the Repertoire folder and Choir Handbook Doc.

### Tab 1: `Roster` (Range: `Roster!A2:G`)

Controls portal login access (both Google OAuth and Email OTP), section filtering, and absence routing.

| Col | Header          | Example Value        | Specification & Data Validation                                                    |
| :-- | :-------------- | :------------------- | :--------------------------------------------------------------------------------- |
| `A` | `Email`         | `singer@example.com` | Primary key (normalize with `.trim().toLowerCase()`)                               |
| `B` | `Name`          | `Andrew Padgett`     | Full display name                                                                  |
| `C` | `Voice_Part`    | `B2`                 | Dropdown: `S`, `S1`, `S2`, `A`, `A1`, `A2`, `T`, `T1`, `T2`, `B`, `B1`, `B2`       |
| `D` | `Section_Group` | `Bass`               | Dropdown: `Soprano`, `Alto`, `Tenor`, `Bass` (Used for routing to Section Leaders) |
| `E` | `Role`          | `Admin`              | Dropdown: `Singer`, `Section_Leader`, `Admin`                                      |
| `F` | `Phone`         | `612-555-0100`       | Display string for member directory                                                |
| `G` | `Active`        | `Active`             | Dropdown: `Active`, `On_Leave`, `Inactive` (or legacy `TRUE`/`FALSE`)              |

### Tab 2: `Schedule` (Google Calendar API v3 or Choir Sheet `Schedule!A2:K`)

Powers the Singer Portal rehearsal calendar, subscribable `/api/calendar.ics` feed, Absence form date selector, and 1-tap Snack Signup.

- **Hospitality, Snacks & Duties Decoupling**: For standard rehearsals (`Rehearsal`, `Sectional`, `Retreat`), all four slots standardly reflect snack sign-up spots (`Snack Spot 1` through `Snack Spot 4`). On concert calls, slots default to concert crew roles (stage setup, strike, box office, reception). Any slot can be customized directly in the Choir Google Sheet—either by entering a custom duty in `Schedule!G:J` (e.g. `(Room Setup)`, `[Sound Crew]`, or `Singer Name (Custom Duty)`) or via the dedicated `Snacks` sheet tab (`Event_ID`, `Slot`, `Singer_Name`, `Item`, `Updated_At`).
- **Sheet Fallback Table (Legacy or Demo Mode)**:
  | Col | Header         | Example Value       | Specification                                                                  |
  | :-- | :------------- | :------------------ | :----------------------------------------------------------------------------- |
  | `A` | `Event_ID`     | `reh-2026-11-10`    | Unique primary key (resolved dynamically before any cell write)                |
  | `B` | `Date`         | `2026-11-10`        | `YYYY-MM-DD` (Sort ascending; filter `>= today` for upcoming views)            |
  | `C` | `Time`         | `7:00 PM - 9:30 PM` | Display time string (parsed for `.ics` start/end times with sensible fallback) |
  | `D` | `Type`         | `Rehearsal`         | `Rehearsal`, `Sectional`, `Retreat`, `Dress`, `Concert`                        |
  | `E` | `Title`        | `Tuesday Rehearsal` | Event title                                                                    |
  | `F` | `Location`     | `Main Sanctuary`    | Venue / room                                                                   |
  | `G` | `Snack_1_Name` | `Elena Rostova`     | Claimed via `/portal/snacks`                                                   |
  | `H` | `Snack_2_Name` | `Marcus Vance`      | Claimed via `/portal/snacks`                                                   |
  | `I` | `Snack_3_Name` | ``                  | Claimed via `/portal/snacks`                                                   |

| `J` | `Snack_4_Name` |`` | Claimed via `/portal/snacks` |
| `K` | `Notes` | `Focus on movements 1-3` | Rehearsal call notes or repertoire focus |

### Tab 3: `Absences` (Range: `Absences!A2:I`)

Upserted/updated via `POST` and `DELETE /api/absences` (deduplicated by `Event_ID` + `Singer_Email`).

| Col | Header         | Example Value          | Specification                                                                    |
| :-- | :------------- | :--------------------- | :------------------------------------------------------------------------------- |
| `A` | `Timestamp`    | `2026-11-01T19:30:00Z` | ISO timestamp of latest submission/update                                        |
| `B` | `Event_ID`     | `reh-2026-11-10`       | Foreign key to `Schedule.Event_ID`                                               |
| `C` | `Date`         | `2026-11-10`           | Event date (`YYYY-MM-DD`)                                                        |
| `D` | `Singer_Name`  | `Andrew Padgett`       | Singer's full name                                                               |
| `E` | `Singer_Email` | `singer@example.com`   | Normalized email                                                                 |
| `F` | `Voice_Part`   | `B2`                   | Voice part at time of submission                                                 |
| `G` | `Reason`       | `Out of town for work` | User-submitted note                                                              |
| `H` | `Submitted_By` | `Self`                 | `"Self"` or Section Leader/Admin name if marked during roll call                 |
| `I` | `Status`       | `Absent`               | `"Absent"` or `"Cleared"` (allows singers/admins to withdraw an absence cleanly) |

### Tab 4: `Concerts` (Range: `Concerts!A2:K` or Ticket Tailor REST API)

Powers the public `/` home spotlight and `/concerts` box-office page.

- **Ticket Tailor Primary Source (Zero Double-Entry)**: When `TICKET_TAILOR_API_KEY` is configured in `.env`, `/concerts` and the home page auto-fetch published events directly from Ticket Tailor REST API (`/v1/events`). Event titles, dates, venues, blurbs, posters, and embedded checkout widgets are populated automatically with edge caching.
- **Dual Artwork Support (Landscape Banner & Portrait Poster)**: Column I (`Hero_Image_URL`) holds wide 16:9 landscape headers, while Column K (`Poster_Image_URL`) holds vertical flyers/key art posters. If only 1 image is provided, the website automatically falls back to it in both slots and elegantly presents it with safe ambient-blur framing so zero admin double-entry is required.
- **Natural Date & Multi-Performance Input**: Column C (`Dates_Display`) accepts natural date & time inputs without manual day-of-week formatting. Examples:
  - Multi-line in cell: `12/19/2026 3:00 PM (Shoreview)\n12/20/2026 3:00 PM (Edina)`
  - Delimited: `12/19/26 3pm & 12/20/26 3pm` or `March 20, 2027 7:30 PM | March 21, 2027 3:00 PM`
  - Single performance: `3/20/2027 7:30pm` or `May 14 at 8:00 PM`
  - The site automatically computes the weekday, standardizes times (`3:00 PM`), formats editorial headlines, and constructs structured multi-performance cards with venue directions. Existing editorial strings (e.g. `Sat, Dec 12...`) continue to be supported seamlessly.
- **Draft / Unpublished Concerts & Automatic Past Date Expiration**:
  - **Draft / Unpublished State**: To prepare new concerts or edit upcoming programs privately without displaying half-finished cards to the public, set Column H (`Status`) to `Draft` (or `Unpublished`). Draft concerts are completely suppressed from public pages (`/` home spotlight and `/concerts` active and past listings). Logged-in Admins see an interactive **Admin Preview** banner on `/concerts` to inspect artwork, dates, and ticket embeds before going live.
  - **Publishing**: When ready to announce or sell tickets, update `Status` to `Upcoming` or `On_Sale`.
  - **Automatic Expiration by Date (Zero Double-Entry)**: Any concert whose performance date has passed is automatically marked as `Past` and moved to "Past Programs" based strictly on calendar date (ignoring time so patrons purchasing same-day tickets even 5 minutes after start time are never blocked). Same-day concerts remain active until midnight Central Time.
- **Partner Presenters & External Box Offices (e.g., Minnesota Orchestra, SPCO, The Ordway, Schubert Club)**: For guest appearances or co-productions where Kantorei is not managing tickets, enter the partner's box office URL in Column G (`TT_Event_Series_ID`). The website automatically detects external ticketing domains, suppresses the Ticket Tailor embed, and renders a high-trust **Partner Presenter Box Office Card** with direct links to the host presenter's ticketing portal.
- **Free / Non-Ticketed Concerts**: Enter `FREE`, `DOOR`, or `FREE_ADMISSION` in Column G to render an **Open Seating · Goodwill Offering** card.
- **Sheet Fallback / Manual Override Table**:
  | Col | Header               | Example Value                                                             | Specification                                                                                                                                                                                                       |
  | :-- | :------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `A` | `Concert_Slug`       | `winter-2026`                                                             | URL-safe slug                                                                                                                                                                                                       |
  | `B` | `Title`              | `Light in the Winter Dark`                                                | Public concert title                                                                                                                                                                                                |
  | `C` | `Dates_Display`      | `Sat Dec 12 (7:30 PM) & Sun Dec 13 (3:00 PM)`                             | Human-readable dates                                                                                                                                                                                                |
  | `D` | `Venue_Name`         | `Cathedral Sanctuary`                                                     | Venue name                                                                                                                                                                                                          |
  | `E` | `Venue_Address`      | `Minneapolis, MN`                                                         | Address for Google Maps link                                                                                                                                                                                        |
  | `F` | `Description`        | `Join us for an evening of...`                                            | Concert program blurb                                                                                                                                                                                               |
  | `G` | `TT_Event_Series_ID` | `https://www.minnesotaorchestra.org/...`                                  | Ticket Tailor series ID/URL, external partner URL (e.g. `https://www.minnesotaorchestra.org/...`), `FREE`, or `DEMO_SERIES_ID`                                                                                      |
  | `H` | `Status`             | `On_Sale`                                                                 | Dropdown: `Draft`, `Upcoming`, `On_Sale`, `Past` (Leaving blank assumes `Draft`; unpublished `Draft` concerts are hidden from public view; active concerts past their performance date automatically become `Past`) |
  | `I` | `Hero_Image_URL`     | `https://...`                                                             | Optional wide/landscape banner image URL (16:9)                                                                                                                                                                     |
  | `J` | `Box_Office_Note`    | `Kantorei joins the Minnesota Orchestra for this special presentation...` | Optional custom box office notice or partner relationship blurb (overrides the default guest ensemble blurb)                                                                                                        |
  | `K` | `Poster_Image_URL`   | `https://...`                                                             | Optional portrait flyer / key art poster image URL (3:4 or 4:5 vertical)                                                                                                                                            |

### Tab 5: `Config` (Range: `Config!A2:C`)

Key-value settings editable by the board without redeploying code. Structured as a 3-column table so non-technical choir administrators can immediately see what each key controls:

- **Col A (`Key`)**: Canonical configuration identifier (e.g. `Newsletter_Description`)
- **Col B (`Value`)**: Live value or copy text displayed on the site
- **Col C (`Description / Where It Appears`)**: Plain-English explanation of where this text appears across the public website and singer portal

#### Dynamic Variable Tokens in CMS Blurbs (Automatic Cascade)

Any blurb in the Choir Sheet (or in site copy) can include dynamic tokens that automatically resolve to the latest choir settings in `Config` at runtime (via `src/lib/config-interpolate.ts`). When an administrator updates `Contact_Email`, `Contact_Phone`, `Contact_Address`, `Choir_Name`, or `Conductor_Name`, the change immediately cascades across every blurb on the website without needing to edit each text block individually:

- `{Choir_Name}` / `{choir}`: Organization name
- `{Contact_Email}` / `{email}`: Primary inquiries and contact email
- `{Contact_Phone}` / `{phone}`: Primary telephone string
- `{Contact_Phone_Clean}` / `{phone_clean}`: E.164 digits for `tel:` links (e.g. `+16122174647`)
- `{Contact_Address}` / `{address}`: Official mailing address
- `{Conductor_Name}` / `{conductor}` / `{artistic_director}`: Artistic Director name
- `{Conductor_Email}` / `{conductor_email}`: Artistic Director email
- `{Manager_Email}` / `{manager_email}`: Operations Manager email

Standard Config Keys:

- `Choir_Name`: `Kantorei`
- `Conductor_Name`: `Adam Reinwald` (Full display name of Artistic Director; cascades into all blurbs via `{Conductor_Name}`)
- `Conductor_Email`: `adam.reinwald@kantorei.net`
- `Manager_Email`: `maggieakhavan@gmail.com`
- `Repertoire_Drive_Folder_ID`: Google Drive Folder ID containing piece subfolders
- `Handbook_Google_Doc_ID`: Google Doc ID for the live Choir Handbook
- `Strategic_Plan_Google_Doc_ID`: Google Doc ID for the 2026–2036 Strategic Plan
- `Season_Pass_TT_Widget_URL`: Full Ticket Tailor Membership/Season Pass widget URL (or `"DEMO"`)
- `Portal_Announcement`: Banner text shown at the top of `/portal` (empty string hides banner)
- `Calendar_Timezone`: `America/Chicago` (IANA timezone used for `/api/calendar.ics`)
- `YouTube_URL`: `https://www.youtube.com/@kantoreiMN`
- `Instagram_URL`: `https://www.instagram.com/kantorei_mn`
- `Facebook_URL`: `https://www.facebook.com/kantoreimn`
- `Contact_Email`: `info@kantorei.net` (Official choir contact & audition inquiry email)
- `Contact_Phone`: `612-21-SINGS (612-217-4647)` (Official box office & general inquiries line)
- `Contact_Address`: `660 23rd Ave NW, Saint Paul, MN 55112` (Official administrative & mailing address)
- `Mission_Statement`: `Expanding the worldview of artists and audiences through passionate and crafted artistic performances, partnerships, and projects.`
- `Vision_Statement`: `Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.`
- `Hero_Tagline`: `Sing, Laugh, Cry. Be Real…Together.`
- `Hero_Subtitle`: `Kantorei is an a cappella chamber choir based in the Minnesota Twin Cities...`
- `Hero_Video_URL`: `https://www.youtube.com/watch?v=GIvF19VzNPE` (YouTube video URL looped softly in the hero background)
- `Hero_Image_URL`: Optional static fallback or override banner image URL
- `About_Header_Title`: `Vocal health, effortless sound, and singing for a lifetime.`
- `About_History_P1`: First paragraph of choir history and vocal health philosophy on `/about`
- `About_History_P2`: Second paragraph of choir history and outreach mission on `/about`
- `Auditions_Blurb`: `We welcome inquiries from experienced Twin Cities choral singers across all voice parts...`
- `Auditions_Timing_Note`: `We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out a roster of singers for the coming season. Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview. Come sing with us!`
- `Auditions_Rehearsal_Cadence`: `Kantorei rehearses Sunday evenings at rotating venues across the Twin Cities metro area (typically 6–8 rehearsals per concert cycle), beginning each season with a community retreat.`
- `Auditions_Process_Note`: `Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview.`
- `Auditions_Form_URL`: `Full Google Form URL (embedded iframe on /auditions; empty fallback renders direct mailto submission)`
- `Support_Hero_Title`: `Sustain choral artistry and lifelong singing in Minnesota.`
- `Support_Hero_Subtitle`: `Every contribution to Kantorei funds performances...`
- `Support_Gala_Title`: `Annual Kantorei Gala & Friendraisers` (Title for annual gala card on `/support`)
- `Support_Gala_Blurb`: `Our annual Gala is Kantorei’s signature fundraising celebration...`
- `Support_Matching_Title`: `Employer Matching, DAFs & Checks` (Card title on `/support`)
- `Support_Matching_Blurb`: `Kantorei welcomes corporate matching gifts (Benevity, CyberGrants, YourCause), Donor-Advised Fund grants, and gifts of appreciated securities. Contact [info@kantorei.net](mailto:info@kantorei.net) or call [612-21-SINGS (612-217-4647)](tel:+16122174647) for our EIN and delivery instructions. Checks may be mailed to 660 23rd Ave NW, Saint Paul, MN 55112.` (Full body text for employer matching, DAFs, securities, and check mailing instructions on `/support`; supports markdown links `[label](url)`)
- `Support_Auditions_Title`: `Audition for Kantorei` (Audition callout card title on `/support`)
- `Support_Auditions_Blurb`: `Beyond financial contributions, Kantorei is sustained by the dedication and artistry of our singers...` (Audition callout card text on `/support`)
- `Tax_Exempt_Disclaimer`: `Kantorei is a registered 501(c)(3) nonprofit arts organization in Minnesota...`
- `Newsletter_Category`: Badge label above email signup (e.g. `Friends of Kantorei`)
- `Newsletter_Headline`: Main headline for newsletter signup in site-wide footer (`Stay in tune with our season.`)
- `Newsletter_Description`: Callout blurb for newsletter signup in footer (`Receive concert announcements, early-access ticket alerts, and artistic listening guides from conductor Adam Reinwald.`)
- `Newsletter_Button_Text`: Button label on newsletter signup (`Join Free` or `Join Friends of Kantorei`)
- `Footer_About_Blurb`: Short organization bio displayed in site-wide footer below the logo
- `Home_Newsletter_Title` / `Home_Newsletter_Description`: Headline and blurb for homepage patron community banner
- `Concerts_Newsletter_Title` / `Concerts_Newsletter_Description`: Headline and blurb for /concerts box office page callout
- `No_Concerts_Title`: Headline shown on `/concerts` when there are no upcoming concerts scheduled (`No Upcoming Concerts`)
- `No_Concerts_Blurb`: Explanatory text shown on `/concerts` when no performances are scheduled
- `Home_Spotlight_Type`: Homepage hero spotlight mode (`concert`, `recording`, or `friends`; leave empty for auto)
- `Home_Spotlight_Media_ID`: Optional specific Media ID to spotlight on the homepage (e.g. `yt-dickinson`)
- `Home_Spotlight_Title` / `Home_Spotlight_Description`: Headline and blurb for the homepage spotlight card when showing the Friends of Kantorei fallback state
- `MailerLite_API_Key`: MailerLite API Bearer token for Friends of Kantorei newsletter sync (can also be set via `MAILERLITE_API_KEY` secret)
- `MailerLite_Group_ID`: MailerLite group name (e.g. `Friends of Kantorei`) or numeric ID (auto-discovered if left blank)
- `MailerLite_TT_Group_ID`: Optional dedicated MailerLite group for Ticket Tailor opt-ins (allows separate or suppressed automation workflows)
- `Resend_API_Key`: Resend API key for portal transactional emails (OTP login, absences, auditions) (can also be set via `RESEND_API_KEY` secret)
- `Portal_From_Email`: Verified sender email address in Resend for portal alerts (e.g. `Kantorei Portal <onboarding@resend.dev>` or `Kantorei <tickets@kantorei.net>`)
- `Sandbox_Override_Email`: Optional test email to redirect all outgoing Resend emails to during development/testing
- `TT_Webhook_Secret`: Ticket Tailor webhook signing secret for verifying order opt-in webhooks (can also be set via `TICKET_TAILOR_WEBHOOK_SECRET` secret)
- `Ticket_Tailor_API_Key`: Ticket Tailor REST API key for auto-fetching live box office events (can also be set via `TICKET_TAILOR_API_KEY` secret)

### Tab 6: `Media` (Range: `Media!A2:F` or Live YouTube RSS Feed)

Powers the public `/media` YouTube & recordings showcase (plus featured recordings on `/` and Instagram behind-the-scenes).

- **YouTube RSS Primary Source**: Auto-fetches Kantorei's latest videos from `@kantoreiMN` public XML feed (`/feeds/videos.xml?channel_id=...`) with 5-minute Cloudflare edge caching ($0 quota, zero maintenance).
- **Instagram Showcase**: Displays `@kantorei_mn` behind-the-scenes stories, rehearsal blends, and singer spotlights on `/media`.
- **Sheet Fallback / Manual Featured Curation**:
  | Col | Header        | Example Value                                 | Specification                                                 |
  | :-- | :------------ | :-------------------------------------------- | :------------------------------------------------------------ |
  | `A` | `Media_ID`    | `yt-dickinson`                                | Unique slug/ID                                                |
  | `B` | `Title`       | `Two Dickinson Poems ("Look Back on Time")`   | Recording / video title                                       |
  | `C` | `Subtitle`    | `Jonathan Posthuma · Look Back on Time Album` | Composer, album, or concert credit                            |
  | `D` | `YouTube_URL` | `https://www.youtube.com/watch?v=...`         | Any `youtube.com/watch`, `youtu.be`, playlist, or channel URL |
  | `E` | `Category`    | `Album & Lyric Video`                         | Badge label (`Concert Video`, `Featured Recording`, etc.)     |
  | `F` | `Description` | `Performed by Kantorei...`                    | Optional program note                                         |

### Tab 7: `Seating_Charts` (Range: `Seating_Charts!A2:I`)

Powers visual choir formations, physical riser positions, draft/published status, and visual roll call attendance.

| Col | Header         | Example Value                                   | Specification                                                  |
| :-- | :------------- | :---------------------------------------------- | :------------------------------------------------------------- |
| `A` | `Chart_ID`     | `chart-2026-advent-shoreview`                   | Unique slug/ID                                                 |
| `B` | `Season`       | `2026–2027`                                     | Concert season identifier                                      |
| `C` | `Concert_Slug` | `advent-with-kantorei`                          | Foreign key to `Concerts.Concert_Slug` (or empty)              |
| `D` | `Title`        | `Advent with Kantorei — Shoreview Sanctuary`    | Display title                                                  |
| `E` | `Description`  | `4 rows on risers; Soprano/Alto stage right...` | Venue & riser layout notes                                     |
| `F` | `Status`       | `Published`                                     | `"Draft"` (admins/leaders only) or `"Published"` (all singers) |
| `G` | `Layout_JSON`  | `[{"rowNumber":1,"name":"Row 1",...}]`          | Serialized JSON array of rows, seats, and aisles               |
| `H` | `Created_At`   | `2026-10-15T12:00:00.000Z`                      | ISO timestamp                                                  |
| `I` | `Updated_At`   | `2026-11-01T15:30:00.000Z`                      | ISO timestamp                                                  |

### Tab 8: `Board` (Range: `Board!A2:E`)

Powers the Board of Directors grid on the public `/about` page.

| Col | Header      | Example Value       | Specification                     |
| :-- | :---------- | :------------------ | :-------------------------------- |
| `A` | `Name`      | `Michael Campana`   | Board member full display name    |
| `B` | `Role`      | `President & Chair` | Officer title or role description |
| `C` | `Order`     | `1`                 | Integer sorting rank (ascending)  |
| `D` | `Bio_Notes` | ``                  | Optional internal or display note |
| `E` | `Active`    | `TRUE`              | `"TRUE"` or `"FALSE"`             |

### Tab 9: `Leadership` (Range: `Leadership!A2:G`)

Powers the Artistic & Organizational Leadership profile cards on `/about`.

| Col | Header      | Example Value                   | Specification                                        |
| :-- | :---------- | :------------------------------ | :--------------------------------------------------- |
| `A` | `Name`      | `Adam Reinwald`                 | Leader full display name                             |
| `B` | `Title`     | `Artistic & Executive Director` | Staff title                                          |
| `C` | `Bio`       | `Appointed in 2021...`          | Biography text (double newline separates paragraphs) |
| `D` | `Order`     | `1`                             | Integer sorting rank (ascending)                     |
| `E` | `Email`     | `adam.reinwald@kantorei.net`    | Optional public contact email                        |
| `F` | `Image_URL` | ``                              | Optional portrait headshot URL                       |
| `G` | `Active`    | `TRUE`                          | `"TRUE"` or `"FALSE"`                                |

### Tab 10: `Giving_Tiers` (Range: `Giving_Tiers!A2:E`)

Powers the Annual Giving Circles list on `/support`.

| Col | Header         | Example Value                 | Specification                     |
| :-- | :------------- | :---------------------------- | :-------------------------------- |
| `A` | `Tier_Name`    | `Friends of Kantorei`         | Name of giving circle             |
| `B` | `Amount_Range` | `$25 – $99`                   | Display price/contribution tier   |
| `C` | `Description`  | `Supports music licensing...` | Circle impact / donor perks blurb |
| `D` | `Order`        | `1`                           | Integer sorting rank (ascending)  |
| `E` | `Active`       | `TRUE`                        | `"TRUE"` or `"FALSE"`             |

### Tab 11: `Subscribers` (Range: `Subscribers!A2:E`)

Stores audience patrons and "Friends of Kantorei" subscribers collected from the website footer, home spotlight, ticket purchases, or auditions. Synchronized concurrently with MailerLite.

| Col | Header      | Example Value              | Specification                                                                |
| :-- | :---------- | :------------------------- | :--------------------------------------------------------------------------- |
| `A` | `Timestamp` | `2026-11-03T20:00:00.000Z` | ISO timestamp of signup                                                      |
| `B` | `Email`     | `patron@example.com`       | Subscriber email (normalized lowercase)                                      |
| `C` | `Name`      | `Eleanor Vance`            | Optional subscriber display name                                             |
| `D` | `Source`    | `Website_Footer`           | Source tag (`Website_Footer`, `Home_Page`, `Concerts_Page`, `Ticket_Tailor`) |
| `E` | `Status`    | `Active`                   | Dropdown: `Active`, `Unsubscribed`                                           |

---

## 5. TypeScript Interfaces & Zod Schemas (`src/types/choir.ts`)

Always use these strict types and row-level Zod validators across the application:

```typescript
export type VoicePart =
  "S" | "S1" | "S2" | "A" | "A1" | "A2" | "T" | "T1" | "T2" | "B" | "B1" | "B2";
export type SectionGroup = "Soprano" | "Alto" | "Tenor" | "Bass";
export type MemberRole = "Singer" | "Section_Leader" | "Admin";
export type AbsenceStatus = "Absent" | "Cleared";

export interface Singer {
  email: string; // Primary key (normalized lowercase)
  name: string;
  voicePart: VoicePart;
  sectionGroup: SectionGroup;
  role: MemberRole;
  phone: string;
  active: boolean;
}

export interface ScheduleEvent {
  eventId: string; // Primary key
  date: string; // YYYY-MM-DD
  time: string;
  type: "Rehearsal" | "Sectional" | "Retreat" | "Dress" | "Concert";
  title: string;
  location: string;
  snack1Name: string;
  snack2Name: string;
  notes: string;
}

export interface AbsenceRecord {
  timestamp: string;
  eventId: string;
  date: string;
  singerName: string;
  singerEmail: string;
  voicePart: VoicePart;
  reason: string;
  submittedBy: string;
  status: AbsenceStatus;
}

export interface ConcertEvent {
  slug: string;
  title: string;
  datesDisplay: string;
  venueName: string;
  venueAddress: string;
  description: string;
  ttEventSeriesId: string;
  status: "Upcoming" | "On_Sale" | "Past";
  heroImageUrl?: string;
}

export interface PortalConfig {
  Choir_Name: string;
  Conductor_Email: string;
  Manager_Email: string;
  Repertoire_Drive_Folder_ID: string;
  Handbook_Google_Doc_ID: string;
  Season_Pass_TT_Widget_URL: string;
  Portal_Announcement: string;
  Calendar_Timezone: string;
  [key: string]: string;
}

export interface SheetWarning {
  tab: "Roster" | "Schedule" | "Absences" | "Concerts";
  rowNumber: number;
  message: string;
}

export interface DriveMusicFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  isPdf: boolean;
  isAudio: boolean;
  matchesUserSection?: boolean;
}

export interface RepertoirePiece {
  folderId: string;
  title: string;
  files: DriveMusicFile[];
}
```

---

## 6. Directory & Route Structure

```text
wrangler.jsonc                      # Cloudflare Workers configuration
astro.config.mjs                    # Astro 5 server output + Cloudflare & React integrations + Tailwind v4 Vite plugin
src/
├── middleware.ts                   # Protects /portal/* & /api/*, attaches fresh Astro.locals.singer
├── styles/
│   └── global.css                  # Tailwind v4 @import "tailwindcss" + custom choir design tokens
├── types/
│   └── choir.ts                    # Shared TypeScript interfaces + Zod row parsers
├── lib/
│   ├── env.ts                      # Unified env reader (Cloudflare runtime.env + import.meta.env)
│   ├── cache.ts                    # Cloudflare Cache API (caches.default) + dev memory fallback + tag invalidation
│   ├── google.ts                   # jose Service Account JWT + Sheets v4 & Drive v3 REST + Shared Drive & mock fallbacks
│   ├── auth.ts                     # Web Crypto PKCE Google OAuth + jose session JWT + stateless HMAC 6-digit Email OTP
│   ├── email.ts                    # Resend REST client for OTP codes & dynamic Section Leader absence alerts
│   ├── sanitize.ts                 # Edge-safe HTML sanitizer for Google Doc Choir Handbook export
│   ├── calendar.ts                 # RFC 5545 .ics feed builder + HMAC feed token helper
│   └── utils.ts                    # cn() helper and date formatting utilities
├── layouts/
│   ├── PublicLayout.astro          # Zero-JS public marketing layout (Navbar + Footer + SEO metadata)
│   └── PortalLayout.astro          # Authenticated Singer Portal shell (PortalNav + active singer badge)
├── components/
│   ├── public/
│   │   ├── Navbar.astro            # Public nav with "Concerts & Tickets", "Support", and "Singer Login" CTA
│   │   ├── Footer.astro            # 501(c)(3) info, social links, mailing list
│   │   ├── TicketTailorEmbed.tsx   # React island for Flex Season Pass & Concert checkout + in-cart donations
│   │   └── LGLFormEmbed.tsx        # React island for Little Green Light donations + Enhanced Checkout
│   └── portal/
│       ├── LoginCard.tsx           # React island: Google OAuth button + 2-step 6-digit Email OTP form + Dev role switcher
│       ├── PortalNav.astro         # Responsive header/bottom-tab nav showing Voice_Part badge & conditional Admin tab
│       ├── AbsenceManager.tsx      # React island for submitting/updating/withdrawing absences
│       ├── SnackBoard.tsx          # Optimistic UI 1-tap claim/release snack slots with 409 Conflict handling
│       ├── seating/                # Seating & Attendance: Visual riser layout, seat cards, draft/publish editor, section headcount cards & 1-tap mobile attendance
│       ├── MusicLibrary.tsx        # Tablet/ForScore repertoire browser with voice-part filter & inline PDF/Audio player
│       ├── RosterDirectory.tsx     # Combined Roster & Directory: Cards vs Table switcher, search, member contact links & admin roster management
│       └── CalendarAdminControls.tsx # Google Calendar link & instant cache sync button for admins
└── pages/
    ├── index.astro                 # Public Home: Hero, Next Concert spotlight, ensemble mission, audio samples
    ├── concerts.astro              # Season Pass 2-step Flex explainer + Individual Concert embeds
    ├── about.astro                 # Artistic Director bio, ensemble history, audition info
    ├── support.astro               # Tax-deductible giving tiers + LGL Forms embed (Apple Pay & ACH)
    ├── login.astro                 # Singer Portal sign-in (Google OAuth + Email 6-digit OTP)
    ├── portal/
    │   ├── index.astro             # Singer Dashboard: Announcement banner, next rehearsal, .ics subscribe, quick stats
    │   ├── music.astro             # Repertoire browser optimized for iPad / ForScore
    │   ├── seating.astro           # Seating & Attendance: Formation risers, singer seat locator & live rehearsal roll call
    │   ├── absences.astro          # Personal absence form & history
    │   ├── snacks.astro            # Upcoming rehearsal snack signups
    │   ├── directory.astro         # Roster & Directory: Contact cards, table view, search & admin member editor
    │   ├── handbook.astro          # Sanitized HTML render of Handbook Google Doc
    │   └── admin.astro             # Clean redirector for legacy links (routes to /portal/seating or /portal/directory)
    └── api/
        ├── auth/
        │   ├── google.ts           # Initiates Google OAuth PKCE redirect via Web Crypto
        │   ├── google/callback.ts  # Validates Google OAuth callback, checks Roster, issues session cookie
        │   ├── otp/send.ts         # POST: Checks Roster, sends 6-digit code via Resend + sets signed OTP challenge cookie
        │   ├── otp/verify.ts       # POST: Constant-time verifies HMAC OTP challenge, issues session cookie
        │   ├── dev-bypass.ts       # POST (DEV only): Switches preview role (Admin / Section_Leader / Singer)
        │   └── logout.ts           # POST/GET: Clears session cookie
        ├── music/[fileId].ts       # Streams PDF/MP3 from Drive with HTTP Range (206) + Edge Cache support
        ├── absences.ts             # POST: upserts absence + sends Resend alert; DELETE: marks Cleared
        ├── snacks.ts               # POST: looks up Event_ID live and updates Schedule cell G{row} or H{row}
        ├── roster.ts               # POST/PUT: Admin-only endpoint to add or update a singer row by Email
        ├── seating.ts              # GET/POST/PUT/DELETE: Seating chart layout, drafts & publish status
        └── calendar.ics.ts         # GET: HMAC-authenticated subscribable iCalendar feed for Apple/Google/Outlook
```

---

## 7. Detailed Implementation Specifications

### A. Zero-Dependency Google Workspace REST Layer & `zod` Resilience (`src/lib/google.ts`)

1. **Web Crypto Service Account Auth (`jose`):**
   - Import the PEM `GOOGLE_PRIVATE_KEY` (with `.replace(/\\n/g, '\n')`) using `importPKCS8` and sign a short-lived RS256 JWT assertion with `SignJWT` (`scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly'`).
   - Exchange at `https://oauth2.googleapis.com/token` and cache the resulting access token in memory/Edge cache for 50 minutes.
   - Always pass `supportsAllDrives=true&includeItemsFromAllDrives=true` on all Google Drive v3 requests so Shared Drives work out of the box.
2. **Row-Level `zod` Parsing & Sheet Health Warnings:**
   - Parse every non-empty row with `zod` `.safeParse()` (trimming whitespace and normalizing booleans/emails).
   - Skip blank rows silently; record malformed rows into `SheetWarning[]` so the public site and portal never crash, while Admins see exact row-number diagnostics on `/portal/admin`.
3. **Safe Primary-Key Lookup Before Every Write (No Stale `rowIndex` Writes):**
   - Board members may sort, filter, or insert rows in the Choir Google Sheet at any time. **Never accept `rowIndex` from a client payload or rely on a cached `rowIndex` when writing.**
   - **Snacks (`POST /api/snacks`):** Perform an uncached read of `Schedule!A2:H`, find `eventId` (`freshRowIndex = matchIndex + 2`), verify concurrency preconditions (when claiming, target slot `G` or `H` must be empty; when releasing, target slot must match `singer.name` unless caller is `Admin`), and write to `Schedule!G${freshRowIndex}` or `Schedule!H${freshRowIndex}`. Return `409 Conflict` if another singer just claimed the slot.
   - **Roster (`POST / PUT /api/roster`):** Perform an uncached read of `Roster!A2:A` to locate the normalized `email` before updating `Roster!A${freshRowIndex}:G${freshRowIndex}` (or append if adding a new singer after confirming no duplicate email exists).
   - **Absences (`POST / DELETE /api/absences`):** Perform an uncached read of `Absences!A2:I` to find any existing row matching `(eventId, singerEmail)`. Update `Absences!A${freshRowIndex}:I${freshRowIndex}` if found, or append to `Absences!A:I` if new.
4. **Edge Caching & Instant Invalidation (`src/lib/cache.ts`):**
   - Cache Sheet reads (`60s` TTL) and Handbook/Drive metadata (`300s` TTL) via Cloudflare's `caches.default` (falling back to an in-memory `Map` in local dev).
   - Immediately delete the relevant cache key inside `/api/snacks` (`schedule`), `/api/absences` (`absences`), and `/api/roster` (`roster`).
   - When operating in Sandbox/Demo mode (`GOOGLE_SHEET_ID` unset or `"DEMO"`), keep an in-memory mutable store seeded with realistic Kantorei sample data so claiming snacks, submitting absences, and editing the roster work interactively right out of the box!

### B. Dual Stateless Authentication & Live Roster Re-Hydration (`src/lib/auth.ts`, `src/middleware.ts`)

1. **Method 1 — Google OAuth (Native Web Crypto PKCE):**
   - `/api/auth/google` generates state + PKCE code verifier in `httpOnly` cookies and redirects to Google.
   - `/api/auth/google/callback` exchanges the code, extracts the verified Google email, verifies the singer is `active` in `getRoster()`, and sets an `httpOnly`, `Secure`, `SameSite=Lax` JWT session cookie (`kantorei_session`, 14-day expiry).
2. **Method 2 — Stateless 6-Digit Email Login Code (`jose` + Resend):**
   - Solves login for `@icloud.com`, `@yahoo.com`, `@outlook.com`, and non-Google roster emails with **zero database**:
   - `POST /api/auth/otp/send`: Normalizes email and checks `getRoster()`. If active, generates a cryptographically random 6-digit code, emails it via Resend (or logs/displays a sandbox hint in dev when `RESEND_API_KEY` is unset), and sets a 10-minute signed `kantorei_otp` `httpOnly` JWT cookie containing `SHA-256(email + ":" + code + ":" + AUTH_SECRET)`. (Always returns a generic success message if an unknown email is entered to prevent roster enumeration.)
   - `POST /api/auth/otp/verify`: Recomputes the hash from the submitted email + 6-digit code, verifies against the unexpired `kantorei_otp` cookie, clears the challenge cookie, re-verifies `getRoster()`, and issues the `kantorei_session` JWT cookie.
3. **Middleware & 60-Second Roster Re-Hydration (`src/middleware.ts`):**
   - On every `/portal/*` and protected `/api/*` request, `src/middleware.ts` verifies `kantorei_session` (or the strictly `import.meta.env.DEV && DEV_PREVIEW_BYPASS === 'true'` preview singer) **and** looks up the email in cached `getRoster()` (`60s` TTL).
   - Attaches the fresh `Singer` object to `context.locals.singer`. If a board member sets `Active = FALSE` or updates `Role` in Google Sheets, access/permissions update within 60 seconds without waiting for cookie expiration.

### C. Tablet & ForScore-Friendly Music Streaming (`src/pages/api/music/[fileId].ts`)

- Choir members read scores on iPads (ForScore) and rehearse with MP3 part tracks.
- `GET /api/music/[fileId]?name=O_Magnum_Mysterium.pdf`:
  1. Verify `context.locals.singer`.
  2. In Demo mode (`fileId.startsWith('demo-')`), generate and stream a clean valid sample PDF score or synthesized rehearsal audio tone with full `Range` support so tablet/browser players work immediately in local testing.
  3. In Production mode, fetch Drive metadata (`supportsAllDrives=true`) to verify MIME type (`application/pdf` or `audio/*`) and size, then forward any incoming `Range` header to `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`.
  4. Stream the `ReadableStream` response body directly through the Cloudflare Worker with `206 Partial Content` (or `200 OK`), `Accept-Ranges: bytes`, `Content-Range`, `Content-Length`, and `Content-Disposition: inline; filename="${sanitizedName}"`.

### D. Subscribable Rehearsal Calendar Feed (`src/pages/api/calendar.ics.ts`)

- Generates a live RFC 5545 `text/calendar` `.ics` feed of all `Schedule` events (`VEVENT` items with `DTSTART`, `DTEND`, `SUMMARY`, `LOCATION`, `DESCRIPTION`).
- Authenticated via a stateless HMAC query token (`?token=HMAC(AUTH_SECRET, "calendar-feed")`) rather than cookies so Apple Calendar, Google Calendar, and Outlook can poll `webcal://.../api/calendar.ics?token=...` in the background.

### E. Absence Upsert/Withdrawal & Dynamic Section Leader Routing (`src/pages/api/absences.ts`)

1. Validate caller via `context.locals.singer` (only `Section_Leader` or `Admin` may submit on behalf of another singer during roll call).
2. Upsert into `Absences!A:I` keyed by `(eventId, normalizedSingerEmail)` with `Status = 'Absent'`.
3. `DELETE /api/absences` marks an existing row's `Status = 'Cleared'` and invalidates the `absences` cache.
4. On `POST`, look up active `Section_Leader`s matching `targetSinger.sectionGroup`, plus `Conductor_Email` and `Manager_Email` from `Config`, and count total active absences (`status === 'Absent'`) for that `eventId` in that section.
5. **Sandbox Email Safeguard:** If `SANDBOX_OVERRIDE_EMAIL` is set or `PORTAL_FROM_EMAIL` includes `onboarding@resend.dev`, route `to:` to the sandbox address while listing intended recipients (`[Section Leaders, Conductor, Manager]`) at the top of the email body.

### F. Ticket Tailor "Flex Season Pass" & In-Cart Giving + Little Green Light Fundraising (`src/pages/concerts.astro`, `src/pages/support.astro`)

1. **Top Section of `/concerts` — "Flex Season Pass (Buy Now, Pick Your Dates Later)":**
   - Clear 2-step visual guide:
     - **Step 1: Purchase Your Season Pass:** Receive your personal **Pass Code** (valid for 1 VIP admission per concert cycle + pass-holder perks).
     - **Step 2: Reserve Your Performance Night Anytime:** Select Saturday or Sunday below and enter your Pass Code to unlock your **`$0.00` Season Pass VIP Ticket** from that night's seating capacity.
   - Mounts `<TicketTailorEmbed client:visible widgetUrl={config.Season_Pass_TT_Widget_URL} mode="season-pass" />`.
2. **Individual Concert Cards & In-Cart Donations:**
   - Renders `On_Sale` and `Upcoming` concerts from `Concerts`. In Demo mode (`DEMO_SERIES_ID`), renders an interactive **Demo Checkout Preview Card** (performance night selector, Pass Code unlock toggle, `$0.00` Pass Holder VIP tier, General Admission tier, and in-cart add-on donation buttons).
3. **Dedicated Support Page (`/support`):**
   - Renders `<LGLFormEmbed client:load lglFormUrl={lglFormUrl} siteOrigin={Astro.url.origin} choirName={choirName} givingTiers={givingTiers} />` directly connected to Little Green Light Forms with Enhanced Checkout support (Apple Pay, Google Pay, ACH, credit card).

---

## 8. Step-by-Step Build Execution Plan

1. **Phase 1 (Scaffold, Cloudflare Config, Types & Google Workspace Engine):** Initialize Astro 5 + React 19 + Tailwind CSS v4 + `@astrojs/cloudflare`, create `src/types/choir.ts` (`zod` schemas), `src/lib/cache.ts`, and `src/lib/google.ts` (Web Crypto Service Account JWT, Sheets/Drive REST API, primary-key safe mutations, and interactive in-memory Demo store).
2. **Phase 2 (Dual Stateless Auth, Middleware & Layouts):** Build `src/lib/auth.ts` (Web Crypto PKCE Google OAuth + `jose` session & 6-digit Email OTP + Dev role switcher), `src/middleware.ts`, auth API endpoints, `/login`, `PublicLayout.astro`, and `PortalLayout.astro`.
3. **Phase 3 (Singer Portal Core Features):** Build `/portal` (Dashboard + `.ics` calendar subscription modal), `/portal/absences` + `/api/absences` + `src/lib/email.ts`, `/portal/snacks` + `/api/snacks`, `/portal/music` + `/api/music/[fileId]`, `/portal/directory`, `/portal/handbook`, and `/api/calendar.ics`.
4. **Phase 4 (Section Leader & Admin Dashboard):** Build `/portal/admin` + `/api/roster` with the rehearsal attendance matrix by voice part, 1-click "Mark Absent / Clear at Roll Call", "Add / Edit Singer" modal, and Google Sheet `zod` data-health alerts.
5. **Phase 5 (Public Website, Box Office & Verification):** Build `/`, `/concerts`, `/about`, `/support`, `TicketTailorEmbed.tsx`, and `LGLFormEmbed.tsx`, then run full TypeScript & Cloudflare Worker production build verification (`astro check && npm run build`).

---

## 9. SEO & Entity Disambiguation Architecture (`kantorei.net` vs `kantorei.org`)

### A. The Disambiguation Challenge
- **Kantorei (Colorado)** operates at `kantorei.org` (founded in 1997 in Denver, CO).
- **Kantorei (Minnesota)** operates at `kantorei.net` (founded in 1988 by Dr. Axel Theimer in Minneapolis & Saint Paul, MN, led by Artistic Director Adam Reinwald).
- To ensure search engines and LLM answer engines attribute searches accurately to `kantorei.net`:
  1. **Canonical Entity Graph (`src/lib/seo.ts`):** Injects Schema.org `["MusicGroup", "PerformingGroup", "NGO"]` JSON-LD on all public pages with explicit `foundingDate: "1988"`, `founder: "Dr. Axel Theimer"`, `musicDirector: "Adam Reinwald"`, `areaServed` (`Minneapolis, MN`, `Saint Paul, MN`, `Twin Cities Metropolitan Area`, `Minnesota`), and `disambiguatingDescription` explaining the independent 501(c)(3) Minnesota foundation.
  2. **Social Graph Authority:** Declares canonical `sameAs` links to Minnesota-anchored channels (`@kantoreiMN` on YouTube, `kantorei_mn` on Instagram, `kantoreimn` on Facebook).
  3. **Geographic Metadata:** Declares Dublin Core and Geo tags (`geo.region: US-MN`, `geo.placename: Minneapolis-Saint Paul, Minnesota`, `geo.position: 45.0506;-93.1818`).

### B. High-Intent Audience Discovery (Concerts & Holiday Choral Music)
- **Target Queries:** "choral music twin cities", "best choirs in the twin cities", "chamber choir minneapolis", "Christmas concerts twin cities", "Advent choral concert st paul", "holiday choir concert minnesota".
- **Structured `MusicEvent` Schemas:** Dynamically generated for every scheduled performance with venue name, address, date/time, performer (`Kantorei`), ticketing URLs, and enriched Christmas/Advent keywords so Google Event carousels populate automatically.

### C. Singer Discovery (Auditions & Recruitment)
- **Target Queries:** "choir auditions twin cities", "choral auditions minneapolis", "audition for choir twin cities", "chamber choir auditions minnesota", "sing in choir twin cities".
- **Structured `FAQPage` Schema (`/auditions`):** Directly ranks for audition inquiries (SATB split parts, rehearsal schedule, vocal health philosophy, dues-free access, and entity disambiguation).

### D. Technical Crawl Infrastructure
- **`public/robots.txt`:** Allows all public pages, assets, and sitemap while protecting the private singer portal (`/portal/`, `/portal/*`, `/api/`, `/login`).
- **`src/pages/sitemap.xml.ts`:** Edge-cached XML sitemap adhering to sitemaps.org standards with dynamic concert anchor entries.
- **`PublicLayout.astro`:** Injects canonical `<link rel="canonical">`, absolute OpenGraph/Twitter images, and page-specific structured data.

