#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { importPKCS8, SignJWT } from 'jose';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const map = {};
  if (!fs.existsSync(envPath)) return map;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function extractId(raw = '') {
  const t = raw.trim();
  const folder = /\/folders\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (folder) return folder[1];
  const doc = /\/d\/([a-zA-Z0-9_-]{15,})/.exec(t);
  if (doc) return doc[1];
  return t;
}

const dotEnv = loadDotEnv();
const env = { ...dotEnv, ...process.env };

const clientEmail = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const privateKeyRaw = (env.GOOGLE_PRIVATE_KEY || '').trim();
const sheetId = extractId(env.GOOGLE_MASTER_SHEET_ID || '');

console.log('\n======================================================');
console.log(' 🛠️   KANTOREI MASTER GOOGLE SHEET SCHEMA PROVISIONER');
console.log('======================================================\n');

const SCHEMA_SPEC = {
  Roster: {
    headers: ['Email', 'Name', 'Voice_Part', 'Section_Group', 'Role', 'Phone', 'Active'],
    sampleRows: [
      ['singer@example.com', 'Andrew Padgett', 'B2', 'Bass', 'Admin', '612-555-0100', 'Active'],
    ],
    validations: [
      {
        column: 'Voice_Part',
        options: ['S', 'S1', 'S2', 'A', 'A1', 'A2', 'T', 'T1', 'T2', 'B', 'B1', 'B2'],
        message: 'Select an allowed voice part (e.g. S1, A2, T1, B2)',
      },
      {
        column: 'Section_Group',
        options: ['Soprano', 'Alto', 'Tenor', 'Bass'],
        message: 'Select a section group (Soprano, Alto, Tenor, Bass)',
      },
      {
        column: 'Role',
        options: ['Singer', 'Section_Leader', 'Admin'],
        message: 'Select a portal role (Singer, Section_Leader, Admin)',
      },
      {
        column: 'Active',
        options: ['Active', 'On_Leave', 'Inactive', 'TRUE', 'FALSE'],
        message: 'Select member status (Active, On_Leave, Inactive)',
      },
    ],
  },
  Schedule: {
    headers: [
      'Event_ID',
      'Date',
      'Time',
      'Type',
      'Title',
      'Location',
      'Snack_1_Name',
      'Snack_2_Name',
      'Snack_3_Name',
      'Snack_4_Name',
      'Notes',
    ],
    sampleRows: [
      [
        'reh-2026-11-10',
        '2026-11-10',
        '7:00 PM - 9:30 PM',
        'Rehearsal',
        'Tuesday Rehearsal',
        'Main Sanctuary',
        '',
        '',
        '',
        '',
        'Focus on movements 1-3',
      ],
    ],
    validations: [
      {
        column: 'Type',
        options: ['Rehearsal', 'Sectional', 'Retreat', 'Dress', 'Concert'],
        message: 'Select an event type (Rehearsal, Sectional, Retreat, Dress, Concert)',
      },
    ],
  },
  Absences: {
    headers: [
      'Timestamp',
      'Event_ID',
      'Date',
      'Singer_Name',
      'Singer_Email',
      'Voice_Part',
      'Reason',
      'Submitted_By',
      'Status',
    ],
    sampleRows: [],
    validations: [
      {
        column: 'Voice_Part',
        options: ['S', 'S1', 'S2', 'A', 'A1', 'A2', 'T', 'T1', 'T2', 'B', 'B1', 'B2'],
        message: 'Select an allowed voice part',
      },
      {
        column: 'Status',
        options: ['Absent', 'Late', 'Cleared'],
        message: 'Select absence status (Absent, Late, Cleared)',
      },
    ],
  },
  Concerts: {
    headers: [
      'Concert_Slug',
      'Title',
      'Dates_Display',
      'Venue_Name',
      'Venue_Address',
      'Description',
      'TT_Event_Series_ID',
      'Status',
      'Hero_Image_URL',
      'Box_Office_Note',
    ],
    sampleRows: [
      [
        'winter-2026',
        'Light in the Winter Dark',
        'Sat Dec 12 (7:30 PM) & Sun Dec 13 (3:00 PM)',
        'Cathedral Sanctuary',
        'Minneapolis, MN',
        'Join us for an evening of choral masterworks.',
        'DEMO_SERIES_ID',
        'On_Sale',
        '',
        '',
      ],
    ],
    validations: [
      {
        column: 'Status',
        options: ['Upcoming', 'On_Sale', 'Past'],
        message: 'Select concert status (Upcoming, On_Sale, Past)',
      },
    ],
  },
  Config: {
    headers: ['Key', 'Value'],
    sampleRows: [
      ['Choir_Name', 'Kantorei'],
      ['Conductor_Email', 'adam.reinwald@kantorei.net'],
      ['Manager_Email', 'maggieakhavan@gmail.com'],
      ['Repertoire_Drive_Folder_ID', '1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc'],
      ['Handbook_Google_Doc_ID', ''],
      ['Strategic_Plan_Google_Doc_ID', ''],
      ['Season_Pass_TT_Widget_URL', 'DEMO'],
      ['Portal_Announcement', 'Welcome to the Kantorei Singer Portal.'],
      ['Calendar_Timezone', 'America/Chicago'],
      ['YouTube_URL', 'https://www.youtube.com/@kantoreiMN'],
      ['Instagram_URL', 'https://www.instagram.com/kantorei_mn'],
      ['Facebook_URL', 'https://www.facebook.com/kantoreimn'],
      ['Contact_Email', 'info@kantorei.net'],
      ['Contact_Phone', '612-21-SINGS (612-217-4647)'],
      ['Contact_Address', '660 23rd Ave NW, Saint Paul, MN 55112'],
      [
        'Mission_Statement',
        'Expanding the worldview of artists and audiences through passionate and crafted artistic performances, partnerships, and projects.',
      ],
      [
        'Vision_Statement',
        'Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
      ],
      ['Hero_Tagline', 'Sing, Laugh, Cry. Be Real…Together.'],
      [
        'Hero_Subtitle',
        'Kantorei is an a cappella chamber choir based in the Minnesota Twin Cities. Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
      ],
      ['About_Header_Title', 'Vocal health, effortless sound, and singing for a lifetime.'],
      [
        'Auditions_Blurb',
        'We welcome inquiries from experienced Twin Cities choral singers across all voice parts (S1, S2, A1, A2, T1, T2, B1, B2) who share our commitment to vocal health, independent preparation, and expressive a cappella ensemble singing.',
      ],
      [
        'Auditions_Timing_Note',
        'We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out a roster of singers for the coming season. Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
      ],
      [
        'Auditions_Rehearsal_Cadence',
        'Kantorei rehearses Sunday evenings at rotating venues across the Twin Cities metro area (typically 6–8 rehearsals per concert cycle), beginning each season with a community retreat.',
      ],
      [
        'Auditions_Process_Note',
        'Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview.',
      ],
      ['Auditions_Form_URL', ''],
      ['Support_Hero_Title', 'Sustain choral artistry and lifelong singing in Minnesota.'],
      [
        'Support_Hero_Subtitle',
        'Every contribution to Kantorei funds performances, composer commissions, recordings shared worldwide, Friends of Kantorei community programming, and keeps ensemble membership free of mandatory singer dues.',
      ],
      [
        'Support_Gala_Blurb',
        'Our annual Gala is Kantorei’s signature fundraising celebration—bringing singers, alumni, and patrons together for live music, hospitality, and community support. Follow us on Instagram and Facebook for upcoming Gala dates and sponsorship opportunities.',
      ],
      [
        'Tax_Exempt_Disclaimer',
        'Kantorei is a registered 501(c)(3) nonprofit arts organization in Minnesota. Contributions are tax-deductible to the fullest extent permitted by law.',
      ],
    ],
  },
  Board: {
    headers: ['Name', 'Role', 'Order', 'Bio_Notes', 'Active'],
    sampleRows: [
      ['Michael Campana', 'President & Chair', '1', '', 'TRUE'],
      ['Joe Cook Morey', 'Vice-President & Vice Chair', '2', '', 'TRUE'],
      ['Kressen Anderson', 'Treasurer', '3', '', 'TRUE'],
      ['Molly Tengwall', 'Secretary', '4', '', 'TRUE'],
      ['Genna Palumbo', 'Singer Representative', '5', '', 'TRUE'],
      ['Dan Belknap', 'At-Large Member', '6', '', 'TRUE'],
      ['Naomi Karstad', 'At-Large Member', '7', '', 'TRUE'],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Leadership: {
    headers: ['Name', 'Title', 'Bio', 'Order', 'Email', 'Image_URL', 'Active'],
    sampleRows: [
      [
        'Adam Reinwald',
        'Artistic & Executive Director',
        'Appointed in 2021, Adam Reinwald is a nationally recognized vocal chamber artist, conductor, and nonprofit arts strategist with over two decades of experience in the choral arts—including work with the National Lutheran Choir and nearly two decades with the acclaimed vocal ensemble Cantus.\n\nIn demand as a coach for small- to mid-size arts organizations focusing on new media and digital branding, Adam has presented nationally at Chorus America, ACDA, and the Young Nonprofit Professionals Network.',
        '1',
        'adam.reinwald@kantorei.net',
        '',
        'TRUE',
      ],
      [
        'Tony Rangel',
        'Assistant Conductor',
        'Tony Rangel serves as Assistant Conductor, collaborating closely on ensemble preparation and directing one or more pieces on every Kantorei concert program.\n\nAn experienced choral educator and Twin Cities ensemble singer, Tony has directed the choral programs at Columbia Heights and Armstrong high schools, currently leads the choral program at Stillwater Middle School, and authors graduate-level music education courses through Forward Motion Online Learning.',
        '2',
        '',
        '',
        'TRUE',
      ],
      [
        'Dr. Axel Theimer',
        'Founder & Artistic Director Emeritus',
        'Born in St. Johann in Tirol, Austria, and trained in the Vienna Choir Boys before earning his MFA and DMA at the University of Minnesota, Dr. Axel Theimer founded Kantorei in 1988.\n\nDirector of Choral Activities at the College of Saint Benedict and Saint John’s University for 52 years, founder of the Amadeus Chamber Symphony, Music Director of the National Catholic Youth Choir, and Executive Director of The VoiceCare Network, Dr. Theimer is a recipient of the ACDA-MN Choir Director of the Year Award (2001), MMEA Hall of Fame induction (2004), and the F. Melius Christiansen Lifetime Achievement Award (2011).',
        '3',
        '',
        '',
        'TRUE',
      ],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Giving_Tiers: {
    headers: ['Tier_Name', 'Amount_Range', 'Description', 'Order', 'Active'],
    sampleRows: [
      [
        'Friends of Kantorei',
        '$25 – $99',
        'Supports music licensing and recognition in our concert programs.',
        '1',
        'TRUE',
      ],
      [
        'Chorister Circle',
        '$100 – $249',
        'Helps keep participation free of mandatory singer dues and folder fees.',
        '2',
        'TRUE',
      ],
      [
        'Recording & Outreach Patron',
        '$250 – $499',
        'Advances worldwide digital recordings and community choral partnerships.',
        '3',
        'TRUE',
      ],
      [
        'Director’s Circle',
        '$500+',
        'Underwrites living composer commissions, guest collaborators, and touring.',
        '4',
        'TRUE',
      ],
    ],
    validations: [
      {
        column: 'Active',
        options: ['TRUE', 'FALSE'],
        message: 'Select TRUE or FALSE',
      },
    ],
  },
  Media: {
    headers: ['Media_ID', 'Title', 'Subtitle', 'YouTube_URL', 'Category', 'Description'],
    sampleRows: [],
    validations: [
      {
        column: 'Category',
        options: ['Concert Video', 'Featured Recording', 'Album & Lyric Video'],
        message: 'Select a category or enter custom text',
      },
    ],
  },
  Seating_Charts: {
    headers: [
      'Chart_ID',
      'Season',
      'Concert_Slug',
      'Title',
      'Description',
      'Status',
      'Layout_JSON',
      'Created_At',
      'Updated_At',
    ],
    sampleRows: [],
    validations: [
      {
        column: 'Status',
        options: ['Draft', 'Published'],
        message: 'Select seating chart status (Draft, Published)',
      },
    ],
  },
  Snacks: {
    headers: ['Event_ID', 'Slot', 'Singer_Name', 'Item', 'Updated_At'],
    sampleRows: [],
    validations: [
      {
        column: 'Slot',
        options: ['1', '2', '3', '4'],
        message: 'Select snack slot (1, 2, 3, 4)',
      },
    ],
  },
};

if (!clientEmail || !privateKeyRaw || !sheetId || sheetId === 'DEMO') {
  console.log('ℹ️   Running in DEMO mode or missing Google credentials.');
  console.log('   Here is the canonical schema layout for the Master Sheet:\n');
  for (const [tab, spec] of Object.entries(SCHEMA_SPEC)) {
    console.log(`   📄 [${tab}]`);
    console.log(`      Columns: ${spec.headers.join(', ')}`);
    if (spec.validations && spec.validations.length > 0) {
      for (const v of spec.validations) {
        console.log(`      🔘 Dropdown on "${v.column}": [${v.options.join(', ')}]`);
      }
    }
    console.log('');
  }
  console.log('Set your credentials in .env to provision live sheets automatically.\n');
  process.exit(0);
}

async function getAccessToken() {
  const normalizedPem = privateKeyRaw.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`);
  }

  const payload = await res.json();
  return payload.access_token;
}

async function run() {
  try {
    process.stdout.write('🔑 Authenticating with Google Cloud...');
    const token = await getAccessToken();
    console.log(' Connected!\n');

    console.log(`🔍 Inspecting Google Spreadsheet ID: ${sheetId}...`);
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Failed to read spreadsheet metadata (${metaRes.status}): ${errText}`);
    }

    const meta = await metaRes.json();
    console.log(`   Spreadsheet Title: "${meta.properties?.title || 'Master Sheet'}"`);

    const existingSheets = meta.sheets || [];
    const sheetMap = new Map();
    for (const s of existingSheets) {
      sheetMap.set(s.properties.title, s.properties.sheetId);
    }

    console.log(`   Existing Tabs: ${Array.from(sheetMap.keys()).join(', ')}\n`);

    for (const [tabName, spec] of Object.entries(SCHEMA_SPEC)) {
      if (!sheetMap.has(tabName)) {
        console.log(`➕ Creating missing tab [${tabName}]...`);

        // 1. Add sheet
        const addRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: tabName,
                      gridProperties: {
                        frozenRowCount: 1,
                      },
                    },
                  },
                },
              ],
            }),
          }
        );

        if (!addRes.ok) {
          console.error(`   ⚠️ Failed to create sheet [${tabName}]:`, await addRes.text());
          continue;
        }

        // 2. Write headers & default rows
        const valuesToWrite = [spec.headers, ...(spec.sampleRows || [])];
        const writeRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1`
          )}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${tabName}!A1`,
              majorDimension: 'ROWS',
              values: valuesToWrite,
            }),
          }
        );

        if (writeRes.ok) {
          console.log(`   ✅ Created [${tabName}] with ${spec.headers.length} canonical headers.`);
        }
      } else {
        // Tab exists: check headers
        const headRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
            `${tabName}!A1:Z1`
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (headRes.ok) {
          const headData = await headRes.json();
          const currentHeaders = headData.values?.[0] || [];
          const missing = spec.headers.filter(
            (h) => !currentHeaders.some((ch) => ch.trim().toLowerCase() === h.toLowerCase())
          );

          if (missing.length === 0) {
            console.log(`✅ [${tabName}] is healthy (all ${spec.headers.length} headers present).`);
          } else {
            console.log(`⚠️  [${tabName}] is missing columns: ${missing.join(', ')}`);
            // Non-destructively append missing column headers to row 1
            const updatedHeaders = [...currentHeaders, ...missing];
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
                `${tabName}!A1`
              )}?valueInputOption=USER_ENTERED`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  range: `${tabName}!A1`,
                  majorDimension: 'ROWS',
                  values: [updatedHeaders],
                }),
              }
            );
            console.log(`   ✅ Appended missing columns to [${tabName}].`);
          }
        }
      }
    }

    // Refresh sheet metadata so we have updated sheet IDs for newly created tabs
    const refreshedMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const refreshedMeta = await refreshedMetaRes.json();
    const updatedSheetMap = new Map();
    for (const s of refreshedMeta.sheets || []) {
      updatedSheetMap.set(s.properties.title, s.properties.sheetId);
    }

    console.log('\n🔽 Provisioning In-Cell Dropdowns & Data Validation Rules...');
    const validationRequests = [];

    for (const [tabName, spec] of Object.entries(SCHEMA_SPEC)) {
      if (!spec.validations || spec.validations.length === 0) continue;
      const targetSheetId = updatedSheetMap.get(tabName);
      if (targetSheetId === undefined) continue;

      const headRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          `${tabName}!A1:Z1`
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!headRes.ok) continue;
      const headData = await headRes.json();
      const currentHeaders = (headData.values?.[0] || []).map((h) => h.trim().toLowerCase());

      for (const v of spec.validations) {
        const colIdx = currentHeaders.indexOf(v.column.trim().toLowerCase());
        if (colIdx === -1) {
          console.warn(`   ⚠️ Column "${v.column}" not found in [${tabName}], skipping validation.`);
          continue;
        }

        validationRequests.push({
          tabName,
          column: v.column,
          optionCount: v.options.length,
          request: {
            setDataValidation: {
              range: {
                sheetId: targetSheetId,
                startRowIndex: 1, // Row 2 downward (skipping header row 0)
                startColumnIndex: colIdx,
                endColumnIndex: colIdx + 1,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: v.options.map((opt) => ({ userEnteredValue: opt })),
                },
                inputMessage: v.message,
                strict: false,
                showCustomUi: true,
              },
            },
          },
        });
      }
    }

    if (validationRequests.length > 0) {
      const batchRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: validationRequests.map((vr) => vr.request),
          }),
        }
      );

      if (!batchRes.ok) {
        const errText = await batchRes.text();
        console.error(`   ⚠️ Failed to apply dropdown validation rules: ${errText}`);
      } else {
        for (const vr of validationRequests) {
          console.log(`   🔘 [${vr.tabName}] Dropdown configured for "${vr.column}" (${vr.optionCount} options)`);
        }
        console.log(`   ✅ Successfully configured ${validationRequests.length} interactive dropdown rules!`);
      }
    }

    // Harmonize legacy 'TRUE' values in Roster to 'Active' for clean dropdown display
    try {
      const rosterRowsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
          'Roster!A2:G'
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (rosterRowsRes.ok) {
        const rosterRows = (await rosterRowsRes.json()).values || [];
        let needsUpdate = false;
        const patchedRows = rosterRows.map((r) => {
          if (r[6] === 'TRUE' || r[6] === 'true') {
            needsUpdate = true;
            const copy = [...r];
            copy[6] = 'Active';
            return copy;
          }
          return r;
        });

        if (needsUpdate) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
              'Roster!A2:G'
            )}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: 'Roster!A2:G',
                majorDimension: 'ROWS',
                values: patchedRows,
              }),
            }
          );
          console.log('\n✨ Harmonized existing Roster active rows to display the "Active" dropdown pill.');
        }
      }
    } catch (harmonizeErr) {
      console.warn('   ⚠️ Could not harmonize existing Roster rows:', harmonizeErr.message);
    }

    console.log('\n======================================================');
    console.log('🎉 Google Sheet Schema & Dropdown Provisioning Complete!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

run();
