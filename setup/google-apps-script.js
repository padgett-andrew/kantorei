/**
 * ==============================================================================
 * KANTOREI GOOGLE APPS SCRIPT: REAL-TIME EDGE CACHE INVALIDATION
 * ==============================================================================
 *
 * HOW TO INSTALL IN GOOGLE SHEETS (Takes 60 seconds):
 * 1. Open your Master Google Sheet in your web browser.
 * 2. In the top menu, click: Extensions -> Apps Script
 * 3. Delete any default code in Code.gs, and paste this entire script.
 * 4. Update WEBHOOK_URL (replace with your production domain, e.g. https://kantorei.net).
 * 5. Update WEBHOOK_SECRET (set SHEET_WEBHOOK_SECRET in .env / Cloudflare, or leave empty to use default).
 * 6. Click the Save icon (floppy disk).
 * 7. In the left sidebar, click Triggers (alarm clock icon) -> "+ Add Trigger":
 *    - Choose function to run: onSheetEdit
 *    - Choose which deployment should run: Head
 *    - Select event source: From spreadsheet
 *    - Select event type: On edit
 *    - Failure notification settings: Notify me daily
 *    - Click Save.
 *
 * That's it! Any time a cell is edited in Roster, Schedule, Seating, or Concerts,
 * the Cloudflare Worker cache will purge in under 100ms.
 */

// Production domain URL:
var WEBHOOK_URL = 'https://kantorei.net/api/webhooks/sheet-sync';

// Webhook secret matching SHEET_WEBHOOK_SECRET in Cloudflare:
var WEBHOOK_SECRET = 'your-sheet-webhook-secret';

function onSheetEdit(e) {
  try {
    var sheetName = e && e.range ? e.range.getSheet().getName() : 'all';
    
    var payload = JSON.stringify({
      tab: sheetName,
      secret: WEBHOOK_SECRET
    });

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (err) {
    Logger.log('Webhook error: ' + err.toString());
  }
}

