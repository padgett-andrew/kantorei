# Kantorei Portal — Choir Board & Operations Manual

This guide is for non-technical choir board members, the Artistic Director, Managing Director, Section Leaders, Music Librarians, and Hospitality Coordinators. 

The entire Kantorei website and Singer Portal are powered by **Google Workspace (Google Sheets, Google Drive, and Google Calendar)**. You never have to touch code, databases, or web servers to manage day-to-day operations.

---

## Table of Contents
1. [How the System Works](#1-how-the-system-works)
2. [Managing the Singer Roster & Access](#2-managing-the-singer-roster--access)
3. [Managing the Schedule & Call Times](#3-managing-the-schedule--call-times)
4. [Music Library & Repertoire Folders (Librarian's Guide)](#4-music-library--repertoire-folders-librarians-guide)
5. [Seating Charts & Attendance Roll Call](#5-seating-charts--attendance-roll-call)
6. [Hospitality & Snack Claims](#6-hospitality--snack-claims)
7. [Concerts, Box Office & Donations](#7-concerts-box-office--donations)
8. [Choir Handbook & Strategic Plan](#8-choir-handbook--strategic-plan)
9. [Media Showcase & YouTube Videos](#9-media-showcase--youtube-videos)
10. [Admin FAQ & Troubleshooting](#10-admin-faq--troubleshooting)

---

## 1. How the System Works

* **The Choir Google Sheet** is your database. Editing a cell in Google Sheets updates the website and singer portal.
* **Google Drive** holds all sheet music PDFs, audio rehearsal tracks, and director markings docs.
* **Google Calendar** (optional) allows the Artistic Director to post rehearsals directly from their phone or computer.
* **Cloudflare Workers** caches data for fast loading worldwide. Changes appear within 60 seconds automatically on the next page refresh (or immediately if an Admin clicks the sync button).

---

## 2. Managing the Singer Roster & Access

Open the **`Roster`** tab in the Choir Google Sheet (or use the Member Editor at `/portal/directory` if you are logged in as an Admin).

### Columns & Rules
| Column | Header | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **A** | `Email` | `singer@example.com` | Primary key. Must be valid. Singers use this email to log in. |
| **B** | `Name` | `Elena Rostova` | Singer's full display name. |
| **C** | `Voice_Part` | `S1` | Must be one of: `S1`, `S2`, `A1`, `A2`, `T1`, `T2`, `B1`, `B2`. |
| **D** | `Section_Group`| `Soprano` | `Soprano`, `Alto`, `Tenor`, or `Bass`. Used to route absence alerts to Section Leaders. |
| **E** | `Role` | `Singer` | `Singer`, `Section_Leader`, or `Admin`. |
| **F** | `Phone` | `612-555-0100` | Optional phone number displayed in the member directory. |
| **G** | `Active` | `TRUE` | `TRUE` (active access), `FALSE` (access revoked), or `On_Leave` (sabbatical). |

### Important Roster Workflows
* **Adding a New Singer:** Add a new row with their email, name, voice part, and set `Active` to `TRUE`. The singer can immediately log in at `/login` with either 1-click Google OAuth or a 6-digit email code.
* **Sabbaticals & Leaves:** Set `Active` to `On_Leave` (or `Leave`). Their account will be temporarily paused without losing their voice part or history.
* **Removing a Singer:** Set `Active` to `FALSE`. They will immediately lose access to `/portal`. Do not delete the row if you want to preserve past absence history.

---

## 3. Managing the Schedule & Call Times

The portal displays upcoming calls, rehearsals, dress rehearsals, and concerts on `/portal`.

### Option A: Google Calendar (Recommended for Directors)
If `GOOGLE_CALENDAR_ID` is configured, Kantorei admins can create and edit events directly in Google Calendar (web or mobile):
* **Event Title:** e.g., `Tuesday Rehearsal` or `Concert Call: Light in the Winter Dark`.
* **Date & Time:** Set call start and end times (e.g. `7:00 PM – 9:30 PM`).
* **Location:** e.g., `Cathedral Sanctuary` (displays a 1-tap Google Maps button for singers).
* **Description:** Add rehearsal focus, e.g. `Focus on pieces 1-4, bring pencils`.
* Events sync to the portal every 60 seconds.

### Option B: The `Schedule` Sheet Tab
If not using Google Calendar, use the **`Schedule`** tab in the Choir Google Sheet:
* `Event_ID`: Unique ID (e.g. `reh-2026-11-10` or `concert-2026-12-12`).
* `Date`: `YYYY-MM-DD` (e.g. `2026-11-10`).
* `Time`: Display string (e.g. `7:00 PM - 9:30 PM`).
* `Type`: Must be `Rehearsal`, `Sectional`, `Retreat`, `Dress`, or `Concert`.
* `Title`: Event display title.
* `Location`: Venue name or address.
* `Notes`: Repertoire call notes or instructions.

---

## 4. Music Library & Repertoire Folders (Librarian's Guide)

Singers access digital sheet music and rehearsal audio files on `/portal/music` (optimized for iPads and ForScore).

### Google Drive Setup
1. In your **Google Workspace Shared Drive**, locate the main Repertoire Folder (defined by `Repertoire_Drive_Folder_ID` in the `Config` tab).
2. Inside this folder, create **one subfolder for each musical piece** (e.g., `O Magnum Mysterium` or `Look Back on Time`).

### File Naming Conventions Inside Each Piece's Folder
* **Sheet Music PDF:** Name with `.pdf` (e.g., `O_Magnum_Mysterium_Score.pdf`). The portal displays a 1-tap "Open in ForScore / PDF" button.
* **Rehearsal Audio Tracks:** Upload MP3, M4A, or WAV files. Name them with the voice part for automatic filtering:
  * `O_Magnum_Soprano1.mp3` $\rightarrow$ automatically highlighted for Soprano 1 singers.
  * `O_Magnum_Bass_All.m4a` $\rightarrow$ highlighted for Basses.
  * `Tutti_Reference.mp3` $\rightarrow$ available to all sections.
* **Director's Markings & Program Notes:**
  * Create a **Google Doc** or upload a Word `.docx` file inside the piece's folder (e.g. `Director Notes.gdoc`).
  * The portal automatically extracts the text and formatting, and renders an interactive "Director's Notes" panel with YouTube reference links.

---

## 5. Seating Charts & Attendance Roll Call

Located at `/portal/seating` (Section Leaders & Admins only).

### Creating & Publishing Formations
1. Go to `/portal/seating`.
2. Click **Create Formation / Seating Chart**.
3. Choose the concert season and configure rows (e.g., 4 rows on risers, with center aisles).
4. Assign singers to seats by dragging or clicking seats.
5. **Status Control:**
   * **`Draft`**: Visible only to Admins and Section Leaders while planning.
   * **`Published`**: Visible to all singers in the portal, showing them their exact row, riser number, and neighboring singers.

### Live Mobile Roll Call Attendance
1. At rehearsal call time, open `/portal/seating?mode=attendance`.
2. Section Leaders can tap on any singer card to toggle:
   * **Present** (Green)
   * **Late** (Amber)
   * **Absent** (Red)
3. Absences are automatically recorded in the `Absences` sheet tab.

---

## 6. Hospitality & Snack Claims

Located at `/portal/snacks`:
* Each rehearsal event automatically provides 4 snack/hospitality slots.
* Singers can tap **"Claim Slot"** to bring refreshments and specify what they are bringing (e.g. *"Clementines & sparkling water"*).
* Singers can release or edit their own claim. Admins can manage any slot.

---

## 7. Concerts, Box Office & Donations

Controls public concert listings at `/concerts` and the homepage spotlight.

### The `Concerts` Sheet Tab
* `Concert_Slug`: URL slug (e.g., `winter-2026`).
* `Title`: Public concert title (e.g., `Light in the Winter Dark`).
* `Dates_Display`: Human-friendly dates (e.g., `Sat Dec 12 (7:30 PM) & Sun Dec 13 (3:00 PM)`).
* `Venue_Name` & `Venue_Address`: Venue details (displays a Google Maps button).
* `Description`: Concert program blurb.
* `TT_Event_Series_ID`: The **Ticket Tailor Event Series ID** or checkout link (e.g., `ev_1234567`).
  * If set to `"DEMO_SERIES_ID"`, it renders a sandbox ticketing preview.
* `Status`: Set to `On_Sale` (shows tickets button), `Upcoming` (tickets opening soon), or `Past`.
* `Hero_Image_URL`: Image URL for banner display.

### Ticket Tailor Flex Season Pass & Givebutter
In the **`Config`** sheet tab:
* `Season_Pass_TT_Widget_URL`: Your Ticket Tailor Membership/Season Pass widget link.
* Donations are managed via **Givebutter** (`PUBLIC_GIVEBUTTER_ACCOUNT_ID` in `.env`).

---

## 8. Choir Handbook & Strategic Plan

Singers can read the live Choir Handbook at `/portal/handbook`.

1. Create a Google Doc for the **Choir Handbook**.
2. Share the Google Cloud Service Account email as **Viewer** on the doc.
3. Copy the Google Doc ID from the URL (`docs.google.com/document/d/<COPY_THIS_ID>/edit`).
4. Paste the ID into the **`Config`** sheet tab next to `Handbook_Google_Doc_ID`.
5. The portal will automatically fetch and sanitize the doc into clean HTML.

---

## 9. Media Showcase & YouTube Videos

Controls the recordings and video showcase at `/media`:
* Open the **`Media`** sheet tab.
* Add a row with:
  * `Media_ID`: e.g. `yt-look-back-on-time`
  * `Title`: Song or piece title
  * `Subtitle`: Composer or album credit
  * `YouTube_URL`: Any valid YouTube video URL or playlist link
  * `Category`: Badge label (e.g. `Album & Lyric Video`, `Concert Video`)
  * `Description`: Program notes or soloist credits

---

## 10. Admin FAQ & Troubleshooting

### "A singer says they didn't receive their 6-digit email login code."
1. Confirm their email in the **`Roster`** tab is spelled correctly and that `Active` is `TRUE`.
2. Ask the singer to check their **Spam / Junk** or **Promotions** folder for an email from `Kantorei Portal`.
3. If they use a Gmail or Google Workspace account, they can use the 1-click **"Continue with Google"** button instead.

### "I edited a cell in Google Sheets, but the website hasn't updated yet."
* Cloudflare caches sheets for up to **60 seconds** to ensure lightning-fast page loads. Simply refresh the page after 60 seconds.
* As an Admin, you can also click the **"Sync Calendar & Sheet"** button at the top of `/portal` to fetch the changes immediately.

### "A yellow banner says 'Data Health Warning' on my portal."
* Kantorei uses strict validation to protect against accidental typos. If a cell in `Roster` has an invalid voice part (e.g. `Bass` instead of `B1`) or a missing email, the portal safely skips that row and alerts Admins in the banner so you can fix the typo.

### "Can I back up the choir database before a big concert?"
* Yes! Any developer or admin with terminal access can run:
  ```bash
  npm run backup:sheets
  ```
  This creates an instantaneous JSON snapshot of all tabs in a private, timestamped `backups/` directory.

---

## 11. Ensemble Bulletin Board & `singers@kantorei.net` Mailing List Bot

Located at `/portal/messages`, the **Ensemble Bulletin Board** archives dispatches sent to `singers@kantorei.net` and formats rehearsal setlists (with minute pacing) and small-group / Choir 1 part assignments automatically.

### How Messages Are Added
1. **Automatic Mailing List Ingestion (`bulletin-bot@kantorei.net`):**
   * Configure a Cloudflare Email Routing rule for `bulletin-bot@kantorei.net` that forwards parsed JSON (`from`, `subject`, `text`) to `POST https://kantorei.net/api/webhooks/incoming-email` with header `x-kantorei-bot-secret`.
   * Subscribe `bulletin-bot@kantorei.net` to the `singers@kantorei.net` Google Group.
   * Every email sent to `singers@kantorei.net` is automatically stripped of mailing-list footers and appended to the **`Messages`** tab in the Choir Google Sheet.
2. **Direct Portal Posting:**
   * Logged-in Section Leaders and Admins can click **Post Dispatch** directly on `/portal/messages` to paste rehearsal notes or announcements.
3. **Pinning & Archiving:**
   * Click **Pin to Top** on any dispatch to feature it at the top of `/portal/messages` and on the `/portal` overview dashboard.
   * Click **Archive** (or set `Status` to `Archived` in the `Messages` sheet tab) to hide outdated messages.


