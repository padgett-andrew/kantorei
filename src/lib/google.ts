import { importPKCS8, SignJWT } from 'jose';
import {
  formatSnackEntry,
  inferSectionGroup,
  parseSnackEntry,
  type AbsenceRecord,
  type ConcertEvent,
  type DriveMusicFile,
  type MediaItem,
  type PortalConfig,
  type RepertoirePiece,
  type ScheduleEvent,
  type SheetWarning,
  type Singer,
} from '../types/choir';
import { cachedFetchJson, invalidateCacheTag } from './cache';
import { convertDocxToHtml, convertPlainTextToHtml } from './docx';
import { extractGoogleId, getEnv, hasGoogleServiceAccount, isSandboxSheetMode } from './env';
import { DEFAULT_HANDBOOK_HTML, DEFAULT_STRATEGIC_PLAN_HTML } from './handbook-content';
import { sanitizeHandbookHtml } from './sanitize';
import {
  AbsenceRowSchema,
  ConcertRowSchema,
  MediaRowSchema,
  ScheduleRowSchema,
  SingerRowSchema,
} from './schemas';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(locals?: App.Locals): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const clientEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', locals);
  const rawPrivateKey = getEnv('GOOGLE_PRIVATE_KEY', locals);
  if (!clientEmail || !rawPrivateKey) {
    throw new Error('Missing Google Service Account credentials.');
  }

  const normalizedPem = rawPrivateKey.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(normalizedPem, 'RS256');
  const nowSec = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: GOOGLE_SCOPES })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + 3600)
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
    throw new Error(`Google OAuth token exchange failed (${res.status}): ${errText}`);
  }

  const payload = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 120) * 1000,
  };
  return payload.access_token;
}

// ---------------------------------------------------------------------------
// Interactive In-Memory Demo Store (Active when GOOGLE_MASTER_SHEET_ID="DEMO")
// ---------------------------------------------------------------------------

interface DemoStore {
  roster: Singer[];
  schedule: ScheduleEvent[];
  absences: AbsenceRecord[];
  concerts: ConcertEvent[];
  media: MediaItem[];
  config: PortalConfig;
  repertoire: RepertoirePiece[];
  warnings: SheetWarning[];
}

const demoStore: DemoStore = {
  config: {
    Choir_Name: 'Kantorei',
    Conductor_Email: 'adam.reinwald@kantorei.net',
    Associate_Director_Email: '',
    Manager_Email: 'maggieakhavan@gmail.com',
    Attendance_Admin_Emails: 'maggieakhavan@gmail.com',
    Repertoire_Drive_Folder_ID: 'DEMO',
    Handbook_Google_Doc_ID: 'DEMO',
    Strategic_Plan_Google_Doc_ID: 'DEMO',
    Season_Pass_TT_Widget_URL: 'DEMO',
    Portal_Announcement:
      'Welcome to our Advent with Kantorei concert cycle! Rehearsals meet Sunday evenings at Shepherd of the Hills in Shoreview—please log any conflicts early so voicings for Dec 19 (Shoreview) and Dec 20 (Edina) can be finalized.',
    Calendar_Timezone: 'America/Chicago',
    YouTube_URL: 'https://www.youtube.com/@kantoreiMN',
    Instagram_URL: 'https://www.instagram.com/kantorei_mn',
    Facebook_URL: 'https://www.facebook.com/kantoreimn',
  },
  roster: [
    {
      email: 'andrew@kantorei.net',
      name: 'Andrew Padgett',
      voicePart: 'B2',
      sectionGroup: 'Bass',
      role: 'Admin',
      phone: '612-555-0100',
      active: true,
      status: 'Active',
    },
    {
      email: 'maggieakhavan@gmail.com',
      name: 'Maggie Akhavan',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Admin',
      phone: '612-718-5703',
      active: true,
      status: 'Active',
    },
    {
      email: 'polim0501@gmail.com',
      name: 'Maryanne Poliseno',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '612-555-0118',
      active: true,
      status: 'Active',
    },
    {
      email: 'claire.lindqvist@icloud.com',
      name: 'Claire Lindqvist',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Section_Leader',
      phone: '612-555-0112',
      active: true,
      status: 'Active',
    },
    {
      email: 'maya.patel@gmail.com',
      name: 'Maya Patel',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '651-555-0134',
      active: true,
      status: 'Active',
    },
    {
      email: 'hannah.berg@yahoo.com',
      name: 'Hannah Bergstrom',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0177',
      active: true,
      status: 'Active',
    },
    {
      email: 'strand.carlajoy@gmail.com',
      name: 'CarlaJoy Strand',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Section_Leader',
      phone: '612-555-0148',
      active: true,
      status: 'Active',
    },
    {
      email: 'rachel.kim@outlook.com',
      name: 'Rachel Kim',
      voicePart: 'A2',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '651-555-0191',
      active: true,
      status: 'Active',
    },
    {
      email: 'nadia.okafor@gmail.com',
      name: 'Nadia Okafor',
      voicePart: 'A1',
      sectionGroup: 'Alto',
      role: 'Singer',
      phone: '612-555-0163',
      active: true,
      status: 'Active',
    },
    {
      email: 'mclaver8@gmail.com',
      name: 'Michael Claver',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Section_Leader',
      phone: '612-555-0122',
      active: true,
      status: 'Active',
    },
    {
      email: 'julian.cho@icloud.com',
      name: 'Julian Cho',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '651-555-0185',
      active: true,
      status: 'Active',
    },
    {
      email: 'lucas.meyer@gmail.com',
      name: 'Lucas Meyer',
      voicePart: 'T1',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0159',
      active: true,
      status: 'Active',
    },
    {
      email: 'jfrankelly@gmail.com',
      name: 'John Kelly',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Section_Leader',
      phone: '612-555-0199',
      active: true,
      status: 'Active',
    },
    {
      email: 'samuel.brooks@outlook.com',
      name: 'Samuel Brooks',
      voicePart: 'B1',
      sectionGroup: 'Bass',
      role: 'Singer',
      phone: '651-555-0141',
      active: true,
      status: 'Active',
    },
    {
      email: 'jordan.alverez@example.com',
      name: 'Jordan Alverez',
      voicePart: 'T2',
      sectionGroup: 'Tenor',
      role: 'Singer',
      phone: '612-555-0109',
      active: false,
      status: 'On_Leave',
    },
    {
      email: 'former.member@example.com',
      name: 'Elena Rostova',
      voicePart: 'S2',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '612-555-0104',
      active: false,
      status: 'Inactive',
    },
  ],
  schedule: [
    {
      eventId: 'reh-2026-11-08',
      date: '2026-11-08',
      time: '6:30 PM - 9:00 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'CarlaJoy Strand (Clementines & grapes)',
      snack2Name: 'Michael Claver (Homemade brownies - nut free)',
      snack3Name: 'Elena Rostova (Sparkling water & cups)',
      snack4Name: '',
      notes: 'Lauridsen O Magnum Mysterium (mm. 1-48), Shaw "and the swallow", Howells I & II. Fragrance-free policy.',
    },
    {
      eventId: 'reh-2026-11-15',
      date: '2026-11-15',
      time: '6:30 PM - 9:00 PM',
      type: 'Sectional',
      title: 'Sunday Split Sectionals + Tutti Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'Maryanne Poliseno (Cheese board & gluten-free crackers)',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '6:30-7:20 PM Sectionals on Bach BWV 230 fugue; 7:30 PM tutti after snack break.',
    },
    {
      eventId: 'reh-2026-11-22',
      date: '2026-11-22',
      time: '6:30 PM - 9:00 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Tuning & dynamic shaping on Lauridsen; acoustic spacing work on Advent carols.',
    },
    {
      eventId: 'reh-2026-12-06',
      date: '2026-12-06',
      time: '6:30 PM - 9:00 PM',
      type: 'Rehearsal',
      title: 'Sunday Evening Rehearsal — Full Cycle Polishing',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Bring tablet (ForScore) or printed scores; check breath markings with section leaders.',
    },
    {
      eventId: 'reh-2026-12-17',
      date: '2026-12-17',
      time: '6:30 PM - 9:30 PM',
      type: 'Dress',
      title: 'Advent with Kantorei — Acoustic Dress Rehearsal',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: 'John Kelly (Apples & caramel dip)',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: 'Full concert program run-through at the venue to lock in risers and logistics (casual attire OK).',
    },
    {
      eventId: 'con-2026-12-19',
      date: '2026-12-19',
      time: '3:00 PM (1:30 PM Acoustic Call)',
      type: 'Concert',
      title: 'Advent with Kantorei — Shoreview',
      location: 'Shepherd of the Hills Lutheran Church, Shoreview',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '3920 Victoria St N, Shoreview, MN. Concert black attire (fragrance-free); doors open at 2:30 PM.',
    },
    {
      eventId: 'con-2026-12-20',
      date: '2026-12-20',
      time: '3:00 PM (1:30 PM Acoustic Call)',
      type: 'Concert',
      title: 'Advent with Kantorei — Edina',
      location: 'Lutheran Church of the Good Shepherd, Edina',
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes: '4801 France Ave S, Edina, MN. Post-concert greeting with audience & patrons.',
    },
  ],
  absences: [
    {
      timestamp: '2026-10-29T18:15:00.000Z',
      eventId: 'reh-2026-11-15',
      date: '2026-11-15',
      singerName: 'Samuel Brooks',
      singerEmail: 'samuel.brooks@outlook.com',
      voicePart: 'B1',
      reason: 'Work travel to Chicago',
      submittedBy: 'Self',
      status: 'Absent',
    },
    {
      timestamp: '2026-10-30T14:20:00.000Z',
      eventId: 'reh-2026-11-08',
      date: '2026-11-08',
      singerName: 'Maya Patel',
      singerEmail: 'maya.patel@gmail.com',
      voicePart: 'S2',
      reason: 'Family event out of town',
      submittedBy: 'Self',
      status: 'Absent',
    },
  ],
  concerts: [
    {
      slug: 'advent-with-kantorei',
      title: 'Advent with Kantorei',
      datesDisplay:
        'Sat, December 19, 3:00 PM (Shoreview) & Sun, December 20, 3:00 PM (Edina)',
      venueName:
        'Shepherd of the Hills Lutheran Church, Shoreview · Lutheran Church of the Good Shepherd, Edina',
      venueAddress: 'Shoreview & Edina, MN',
      description:
        'Gather in candlelight and winter stillness for Kantorei’s beloved Advent tradition—weaving luminous a cappella carols from around the world, cherished signature works, and radiant music by contemporary and emerging composers.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'On_Sale',
      heroImageUrl: '/images/advent-with-kantorei.webp',
    },
    {
      slug: 'spring-2027',
      title: 'Voices Across Borders',
      datesDisplay: 'Sat, March 20, 7:30 PM & Sun, March 21, 3:00 PM',
      venueName: 'Twin Cities Sanctuary Venues (TBA)',
      venueAddress: 'Minneapolis & St. Paul, MN',
      description:
        'Unaccompanied choral masterworks from the Baltic states, Latin America, and the Upper Midwest—pairing beloved ensemble signature pieces with vibrant works by emerging voices.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'Upcoming',
    },
    {
      slug: 'may-2027',
      title: 'Singing for a Lifetime',
      datesDisplay: 'Sat, May 15, 7:30 PM & Sun, May 16, 3:00 PM',
      venueName: 'Twin Cities Sanctuary Venues (TBA)',
      venueAddress: 'Minneapolis & St. Paul, MN',
      description:
        'Our season finale celebrating community outreach, intergenerational choral artistry, and the effortless, resonant sound that has defined Kantorei in Minnesota since 1988.',
      ttEventSeriesId: 'DEMO_SERIES_ID',
      status: 'Upcoming',
    },
  ],
  media: [
    {
      id: 'yt-dickinson',
      title: 'Two Dickinson Poems ("Look Back on Time")',
      subtitle: 'Composed by Jonathan Posthuma · Look Back on Time Album',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Two+Dickinson+Poems',
      category: 'Album & Lyric Video',
      description:
        'From the album Look Back on Time: Choral Music of Jonathan Posthuma, performed by Kantorei under Artistic Director Adam Reinwald.',
    },
    {
      id: 'yt-opening-window',
      title: 'Opening the Window',
      subtitle: 'Composed by Jonathan Posthuma · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Opening+the+Window',
      category: 'Album & Lyric Video',
      description:
        'Expansive contemporary a cappella writing highlighting Kantorei’s hallmark vocal warmth and effortless blend.',
    },
    {
      id: 'yt-from-such-sparks',
      title: 'From Such Sparks',
      subtitle: 'Choral Music of Gerald Cohen · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=From+Such+Sparks+Gerald+Cohen',
      category: 'Featured Recording',
      description:
        'Studio recording collaboration sharing Kantorei’s artistry with listeners worldwide across YouTube and streaming platforms.',
    },
    {
      id: 'yt-missa-brevis',
      title: 'Kyrie, from Missa Brevis',
      subtitle: 'Composed by Hyun Kook · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Kyrie+Missa+Brevis+Hyun+Kook',
      category: 'Concert Video',
      description:
        'Soaring unaccompanied sacred lines from around the world.',
    },
    {
      id: 'yt-brahms-liebeslieder',
      title: 'Liebeslieder Waltzes',
      subtitle: 'Johannes Brahms · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=Liebeslieder+Waltzes+Brahms',
      category: 'Concert Video',
      description:
        'Romantic chamber repertoire balancing intimacy, buoyancy, and healthy vocal ease.',
    },
    {
      id: 'yt-poem-is-a-home',
      title: 'A Poem is a Home',
      subtitle: 'Music & Lyrics by Jonathan Posthuma · Kantorei MN',
      youtubeUrl:
        'https://www.youtube.com/@kantoreiMN/search?query=A+Poem+is+a+Home',
      category: 'Album & Lyric Video',
      description:
        'Contemporary Minnesota choral storytelling inviting deep meaning and belonging.',
    },
  ],
  repertoire: [
    {
      folderId: 'notes-advent-2026',
      title: 'Advent with Kantorei (Dec) — Director Notes',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-doc-advent-markings',
          name: "Director's Markings, Concert Order & Reference Recordings (Advent).docx",
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 38_400,
          isPdf: false,
          isAudio: false,
          isDoc: true,
          canExportPdf: true,
        },
      ],
    },
    {
      folderId: 'piece-lauridsen',
      title: '01 — Lauridsen: O Magnum Mysterium',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-lauridsen-score',
          name: 'Lauridsen_O_Magnum_Mysterium_Full_Score_SATB.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 428_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-lauridsen-soprano',
          name: 'Lauridsen_Soprano_S1_S2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-lauridsen-alto',
          name: 'Lauridsen_Alto_A1_A2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-lauridsen-tenor',
          name: 'Lauridsen_Tenor_T1_T2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-lauridsen-bass',
          name: 'Lauridsen_Bass_B1_B2_Part_Predominant.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'piece-shaw',
      title: '02 — Caroline Shaw: and the swallow',
      concertId: 'advent-2026',
      concertTitle: 'Advent with Kantorei (Dec)',
      files: [
        {
          id: 'demo-pdf-shaw-score',
          name: 'Shaw_And_The_Swallow_SATB_ForScore.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 312_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-shaw-tutti',
          name: 'Shaw_And_The_Swallow_All_Parts_Reference.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'notes-muertos-2026',
      title: 'Día de los Muertos (Oct) — Director Notes',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-doc-muertos-markings',
          name: "Director's Markings & Concert Order — Día de los Muertos",
          mimeType: 'application/vnd.google-apps.document',
          isPdf: false,
          isAudio: false,
          isDoc: true,
          canExportPdf: true,
        },
      ],
    },
    {
      folderId: 'piece-bach',
      title: '01 — J.S. Bach: Lobet den Herrn, BWV 230',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-pdf-bach-score',
          name: 'Bach_BWV230_Lobet_den_Herrn_SATB_Marked_Breath_Edition.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 690_000,
          isPdf: true,
          isAudio: false,
        },
        {
          id: 'demo-audio-bach-bass',
          name: 'Bach_BWV230_Bass_B1_B2_Fugue_Tempo_88bpm.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
        {
          id: 'demo-audio-bach-soprano',
          name: 'Bach_BWV230_Soprano_S1_S2_Fugue_Tempo_88bpm.wav',
          mimeType: 'audio/wav',
          sizeBytes: 352_844,
          isPdf: false,
          isAudio: true,
        },
      ],
    },
    {
      folderId: 'piece-howells',
      title: '02 — Herbert Howells: Requiem (Movements I–VI)',
      concertId: 'dia-de-los-muertos-2026',
      concertTitle: 'Día de los Muertos (Oct)',
      files: [
        {
          id: 'demo-pdf-howells-score',
          name: 'Howells_Requiem_Full_Score_With_Rehearsal_Letters.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 910_000,
          isPdf: true,
          isAudio: false,
        },
      ],
    },
  ],
  warnings: [],
};

// ---------------------------------------------------------------------------
// Low-level Google Sheets v4 REST Helpers
// ---------------------------------------------------------------------------

async function readSheetValues(range: string, locals?: App.Locals): Promise<string[][]> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets read failed for ${range} (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

async function writeSheetValues(
  range: string,
  values: string[][],
  locals?: App.Locals
): Promise<void> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets write failed for ${range} (${res.status}): ${errText}`);
  }
}

async function appendSheetValues(
  range: string,
  values: string[][],
  locals?: App.Locals
): Promise<void> {
  const sheetId = extractGoogleId(getEnv('GOOGLE_MASTER_SHEET_ID', locals));
  const token = await getGoogleAccessToken(locals);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ majorDimension: 'ROWS', values }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets append failed for ${range} (${res.status}): ${errText}`);
  }
}

function padRow(row: string[], length: number): string[] {
  const out = new Array<string>(length).fill('');
  for (let i = 0; i < length; i++) {
    out[i] = row[i] ?? '';
  }
  return out;
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => !cell || cell.trim() === '');
}

// ---------------------------------------------------------------------------
// Cached Readers with Row-Level Zod Validation
// ---------------------------------------------------------------------------

export async function getRosterWithWarnings(
  locals?: App.Locals
): Promise<{ roster: Singer[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { roster: [...demoStore.roster], warnings: [] };
  }

  return cachedFetchJson('roster', 60, async () => {
    const rows = await readSheetValues('Roster!A2:G', locals);
    const roster: Singer[] = [];
    const warnings: SheetWarning[] = [];

    rows.forEach((rawRow, idx) => {
      if (isBlankRow(rawRow)) return;
      const parsed = SingerRowSchema.safeParse(padRow(rawRow, 7));
      if (parsed.success) {
        roster.push(parsed.data);
      } else {
        warnings.push({
          tab: 'Roster',
          rowNumber: idx + 2,
          message: parsed.error.issues.map((i) => i.message).join('; '),
        });
      }
    });

    return { roster, warnings };
  });
}

export async function getRoster(locals?: App.Locals): Promise<Singer[]> {
  const { roster } = await getRosterWithWarnings(locals);
  return roster;
}

export async function getScheduleWithWarnings(
  locals?: App.Locals
): Promise<{ schedule: ScheduleEvent[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    const sorted = [...demoStore.schedule].sort((a, b) => a.date.localeCompare(b.date));
    return { schedule: sorted, warnings: [] };
  }

  return cachedFetchJson('schedule', 60, async () => {
    const rows = await readSheetValues('Schedule!A2:K', locals);
    const schedule: ScheduleEvent[] = [];
    const warnings: SheetWarning[] = [];

    rows.forEach((rawRow, idx) => {
      if (isBlankRow(rawRow)) return;
      const parsed = ScheduleRowSchema.safeParse(rawRow);
      if (parsed.success) {
        schedule.push(parsed.data);
      } else {
        warnings.push({
          tab: 'Schedule',
          rowNumber: idx + 2,
          message: parsed.error.issues.map((i) => i.message).join('; '),
        });
      }
    });

    schedule.sort((a, b) => a.date.localeCompare(b.date));
    return { schedule, warnings };
  });
}

export async function getSchedule(locals?: App.Locals): Promise<ScheduleEvent[]> {
  const { schedule } = await getScheduleWithWarnings(locals);
  return schedule;
}

export async function getAbsencesWithWarnings(
  locals?: App.Locals
): Promise<{ absences: AbsenceRecord[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { absences: [...demoStore.absences], warnings: [] };
  }

  return cachedFetchJson('absences', 60, async () => {
    const rows = await readSheetValues('Absences!A2:I', locals);
    const absences: AbsenceRecord[] = [];
    const warnings: SheetWarning[] = [];

    rows.forEach((rawRow, idx) => {
      if (isBlankRow(rawRow)) return;
      const parsed = AbsenceRowSchema.safeParse(padRow(rawRow, 9));
      if (parsed.success) {
        absences.push(parsed.data);
      } else {
        warnings.push({
          tab: 'Absences',
          rowNumber: idx + 2,
          message: parsed.error.issues.map((i) => i.message).join('; '),
        });
      }
    });

    return { absences, warnings };
  });
}

export async function getAbsences(locals?: App.Locals): Promise<AbsenceRecord[]> {
  const { absences } = await getAbsencesWithWarnings(locals);
  return absences;
}

export async function getConcertsWithWarnings(
  locals?: App.Locals
): Promise<{ concerts: ConcertEvent[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { concerts: [...demoStore.concerts], warnings: [] };
  }

  return cachedFetchJson('concerts', 60, async () => {
    const rows = await readSheetValues('Concerts!A2:I', locals);
    const concerts: ConcertEvent[] = [];
    const warnings: SheetWarning[] = [];

    rows.forEach((rawRow, idx) => {
      if (isBlankRow(rawRow)) return;
      const parsed = ConcertRowSchema.safeParse(padRow(rawRow, 9));
      if (parsed.success) {
        concerts.push(parsed.data);
      } else {
        warnings.push({
          tab: 'Concerts',
          rowNumber: idx + 2,
          message: parsed.error.issues.map((i) => i.message).join('; '),
        });
      }
    });

    return { concerts, warnings };
  });
}

export async function getConcerts(locals?: App.Locals): Promise<ConcertEvent[]> {
  const { concerts } = await getConcertsWithWarnings(locals);
  return concerts;
}

export async function getMediaWithWarnings(
  locals?: App.Locals
): Promise<{ media: MediaItem[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { media: [...demoStore.media], warnings: [] };
  }

  return cachedFetchJson('media', 120, async () => {
    try {
      const rows = await readSheetValues('Media!A2:F', locals);
      const media: MediaItem[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((rawRow, idx) => {
        if (isBlankRow(rawRow)) return;
        const parsed = MediaRowSchema.safeParse(padRow(rawRow, 6));
        if (parsed.success) {
          media.push(parsed.data);
        } else {
          warnings.push({
            tab: 'Media',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      return {
        media: media.length > 0 ? media : [...demoStore.media],
        warnings,
      };
    } catch {
      // Gracefully fall back if the board hasn't added the optional Media tab yet
      return { media: [...demoStore.media], warnings: [] };
    }
  });
}

export async function getMedia(locals?: App.Locals): Promise<MediaItem[]> {
  const { media } = await getMediaWithWarnings(locals);
  return media;
}

export async function getPortalConfig(locals?: App.Locals): Promise<PortalConfig> {
  const envRepertoireFolder = getEnv('REPERTOIRE_DRIVE_FOLDER_ID', locals).trim();

  if (isSandboxSheetMode(locals)) {
    return {
      ...demoStore.config,
      ...(envRepertoireFolder ? { Repertoire_Drive_Folder_ID: envRepertoireFolder } : {}),
    };
  }

  return cachedFetchJson('config', 60, async () => {
    const rows = await readSheetValues('Config!A2:B', locals);
    const map: PortalConfig = {
      Choir_Name: 'Kantorei',
      Conductor_Email: 'adam.reinwald@kantorei.net',
      Manager_Email: '',
      Repertoire_Drive_Folder_ID: envRepertoireFolder || '1tIPYJBkibVLjQOaGSzZ2y7L9UOTNOyJc',
      Handbook_Google_Doc_ID: 'DEMO',
      Strategic_Plan_Google_Doc_ID: 'DEMO',
      Season_Pass_TT_Widget_URL: 'DEMO',
      Portal_Announcement: '',
      Calendar_Timezone: 'America/Chicago',
      YouTube_URL: 'https://www.youtube.com/@kantoreiMN',
      Instagram_URL: 'https://www.instagram.com/kantorei_mn',
      Facebook_URL: 'https://www.facebook.com/kantoreimn',
    };

    for (const row of rows) {
      const key = (row[0] ?? '').trim();
      const val = (row[1] ?? '').trim();
      if (key && val) {
        map[key] = val;
      }
    }
    return map;
  });
}

export async function getAllSheetWarnings(locals?: App.Locals): Promise<SheetWarning[]> {
  const [r, s, a, c, m] = await Promise.all([
    getRosterWithWarnings(locals),
    getScheduleWithWarnings(locals),
    getAbsencesWithWarnings(locals),
    getConcertsWithWarnings(locals),
    getMediaWithWarnings(locals),
  ]);
  return [...r.warnings, ...s.warnings, ...a.warnings, ...c.warnings, ...m.warnings];
}

// ---------------------------------------------------------------------------
// Safe Primary-Key Mutations (Live Row Resolution Before Cell Write)
// ---------------------------------------------------------------------------

export type SnackSlotNumber = 1 | 2 | 3 | 4;

function getEventSlotValue(ev: ScheduleEvent, slot: SnackSlotNumber): string {
  if (slot === 1) return ev.snack1Name;
  if (slot === 2) return ev.snack2Name;
  if (slot === 3) return ev.snack3Name;
  return ev.snack4Name;
}

function setEventSlotValue(ev: ScheduleEvent, slot: SnackSlotNumber, value: string) {
  if (slot === 1) ev.snack1Name = value;
  else if (slot === 2) ev.snack2Name = value;
  else if (slot === 3) ev.snack3Name = value;
  else ev.snack4Name = value;
}

export async function mutateSnackSlot(params: {
  eventId: string;
  slot: SnackSlotNumber;
  action: 'claim' | 'release' | 'update_item';
  item?: string;
  caller: Singer;
  locals?: App.Locals;
}): Promise<ScheduleEvent> {
  const { eventId, slot, action, item, caller, locals } = params;

  if (isSandboxSheetMode(locals)) {
    const ev = demoStore.schedule.find((e) => e.eventId === eventId);
    if (!ev) throw new NotFoundError(`Rehearsal event "${eventId}" not found.`);

    const currentRaw = getEventSlotValue(ev, slot);
    const parsed = parseSnackEntry(currentRaw);

    if (action === 'claim') {
      if (parsed.name.trim() !== '') {
        throw new ConflictError(`Hospitality Slot ${slot} was just claimed by ${parsed.name}.`);
      }
      setEventSlotValue(ev, slot, formatSnackEntry(caller.name, item));
    } else if (action === 'update_item') {
      const canUpdate =
        caller.role === 'Admin' ||
        parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
      if (!canUpdate) {
        throw new ConflictError(
          `Only ${parsed.name || 'the slot owner'} or an Admin can edit what they are bringing.`
        );
      }
      setEventSlotValue(ev, slot, formatSnackEntry(parsed.name || caller.name, item));
    } else {
      const canRelease =
        caller.role === 'Admin' ||
        parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
      if (!canRelease) {
        throw new ConflictError(`Only ${parsed.name || 'the slot owner'} or an Admin can release this slot.`);
      }
      setEventSlotValue(ev, slot, '');
    }
    return { ...ev };
  }

  // Uncached live lookup of Schedule!A1:K to find exact current row by Event_ID
  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const headerRow = allRows[0] || [];
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === eventId);
  if (matchIdx === -1) {
    throw new NotFoundError(`Rehearsal event "${eventId}" not found in Schedule sheet.`);
  }

  // Check if legacy 9-column sheet has Notes in Column I (index 8)
  const isLegacyNineCol = (headerRow[8] || '').trim().toLowerCase().includes('note');
  if (isLegacyNineCol) {
    // Automatically modernize headers: Column I -> Snack_3, Column J -> Snack_4, Column K -> Notes
    await writeSheetValues('Schedule!I1:K1', [['Snack_3', 'Snack_4', 'Notes']], locals);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][8] && !rows[i][10]) {
        await writeSheetValues(`Schedule!I${i + 2}:K${i + 2}`, [['', '', rows[i][8]]], locals);
        rows[i][10] = rows[i][8];
        rows[i][8] = '';
      }
    }
  }

  const freshRowIndex = matchIdx + 2;
  const row = padRow(rows[matchIdx], 11);
  const colIndex = 5 + slot; // Slot 1 = 6 (G), Slot 2 = 7 (H), Slot 3 = 8 (I), Slot 4 = 9 (J)
  const colLetter = ['G', 'H', 'I', 'J'][slot - 1];
  const currentRaw = row[colIndex]?.trim() || '';
  const parsed = parseSnackEntry(currentRaw);

  if (action === 'claim') {
    if (parsed.name.trim() !== '') {
      throw new ConflictError(`Hospitality Slot ${slot} was just claimed by ${parsed.name}.`);
    }
    const formatted = formatSnackEntry(caller.name, item);
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [[formatted]], locals);
    row[colIndex] = formatted;
  } else if (action === 'update_item') {
    const canUpdate =
      caller.role === 'Admin' ||
      parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
    if (!canUpdate) {
      throw new ConflictError(
        `Only ${parsed.name || 'the slot owner'} or an Admin can edit what they are bringing.`
      );
    }
    const formatted = formatSnackEntry(parsed.name || caller.name, item);
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [[formatted]], locals);
    row[colIndex] = formatted;
  } else {
    const canRelease =
      caller.role === 'Admin' ||
      parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
    if (!canRelease) {
      throw new ConflictError(`Only ${parsed.name || 'the slot owner'} or an Admin can release this slot.`);
    }
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [['']], locals);
    row[colIndex] = '';
  }

  await invalidateCacheTag('schedule');
  return ScheduleRowSchema.parse(row);
}

export async function upsertAbsenceRecord(params: {
  eventId: string;
  date: string;
  targetSinger: Singer;
  reason: string;
  submittedBy: string;
  locals?: App.Locals;
}): Promise<AbsenceRecord> {
  const { eventId, date, targetSinger, reason, submittedBy, locals } = params;
  const normalizedEmail = targetSinger.email.trim().toLowerCase();
  const timestamp = new Date().toISOString();

  const record: AbsenceRecord = {
    timestamp,
    eventId,
    date,
    singerName: targetSinger.name,
    singerEmail: normalizedEmail,
    voicePart: targetSinger.voicePart,
    reason: reason.trim(),
    submittedBy,
    status: 'Absent',
  };

  if (isSandboxSheetMode(locals)) {
    const existingIdx = demoStore.absences.findIndex(
      (a) => a.eventId === eventId && a.singerEmail === normalizedEmail
    );
    if (existingIdx >= 0) {
      demoStore.absences[existingIdx] = record;
    } else {
      demoStore.absences.unshift(record);
    }
    return record;
  }

  const rows = await readSheetValues('Absences!A2:I', locals);
  const existingIdx = rows.findIndex(
    (r) =>
      (r[1] ?? '').trim() === eventId &&
      (r[4] ?? '').trim().toLowerCase() === normalizedEmail
  );

  const rowValues = [
    record.timestamp,
    record.eventId,
    record.date,
    record.singerName,
    record.singerEmail,
    record.voicePart,
    record.reason,
    record.submittedBy,
    record.status,
  ];

  if (existingIdx >= 0) {
    const freshRowIndex = existingIdx + 2;
    await writeSheetValues(`Absences!A${freshRowIndex}:I${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Absences!A:I', [rowValues], locals);
  }

  await invalidateCacheTag('absences');
  return record;
}

export async function clearAbsenceRecord(params: {
  eventId: string;
  singerEmail: string;
  clearedBy: string;
  locals?: App.Locals;
}): Promise<void> {
  const { eventId, singerEmail, clearedBy, locals } = params;
  const normalizedEmail = singerEmail.trim().toLowerCase();

  if (isSandboxSheetMode(locals)) {
    const existing = demoStore.absences.find(
      (a) => a.eventId === eventId && a.singerEmail === normalizedEmail
    );
    if (!existing) {
      throw new NotFoundError('No matching absence record found.');
    }
    existing.status = 'Cleared';
    existing.timestamp = new Date().toISOString();
    existing.submittedBy = clearedBy;
    return;
  }

  const rows = await readSheetValues('Absences!A2:I', locals);
  const existingIdx = rows.findIndex(
    (r) =>
      (r[1] ?? '').trim() === eventId &&
      (r[4] ?? '').trim().toLowerCase() === normalizedEmail
  );

  if (existingIdx === -1) {
    throw new NotFoundError('No matching absence record found.');
  }

  const freshRowIndex = existingIdx + 2;
  const row = padRow(rows[existingIdx], 9);
  row[0] = new Date().toISOString();
  row[7] = clearedBy;
  row[8] = 'Cleared';

  await writeSheetValues(`Absences!A${freshRowIndex}:I${freshRowIndex}`, [row], locals);
  await invalidateCacheTag('absences');
}

export async function upsertRosterSinger(params: {
  singer: Singer;
  mode: 'create' | 'update';
  locals?: App.Locals;
}): Promise<Singer> {
  const { singer, mode, locals } = params;
  const resolvedStatus = singer.status ?? (singer.active ? 'Active' : 'Inactive');
  const normalized: Singer = {
    ...singer,
    email: singer.email.trim().toLowerCase(),
    name: singer.name.trim(),
    sectionGroup: singer.sectionGroup || inferSectionGroup(singer.voicePart),
    phone: singer.phone.trim(),
    status: resolvedStatus,
    active: resolvedStatus === 'Active',
  };

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.roster.findIndex((s) => s.email === normalized.email);
    if (mode === 'create' && idx >= 0) {
      throw new ConflictError(`A singer with email ${normalized.email} already exists.`);
    }
    if (idx >= 0) {
      demoStore.roster[idx] = normalized;
    } else {
      demoStore.roster.push(normalized);
    }
    return normalized;
  }

  const rows = await readSheetValues('Roster!A2:G', locals);
  const matchIdx = rows.findIndex(
    (r) => (r[0] ?? '').trim().toLowerCase() === normalized.email
  );

  if (mode === 'create' && matchIdx >= 0) {
    throw new ConflictError(`A singer with email ${normalized.email} already exists on the Roster.`);
  }

  const sheetStatusCell =
    normalized.status === 'On_Leave'
      ? 'ON_LEAVE'
      : normalized.status === 'Active'
        ? 'TRUE'
        : 'FALSE';

  const rowValues = [
    normalized.email,
    normalized.name,
    normalized.voicePart,
    normalized.sectionGroup,
    normalized.role,
    normalized.phone,
    sheetStatusCell,
  ];

  if (matchIdx >= 0) {
    const freshRowIndex = matchIdx + 2;
    await writeSheetValues(`Roster!A${freshRowIndex}:G${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Roster!A:G', [rowValues], locals);
  }

  await invalidateCacheTag('roster');
  return normalized;
}

export async function upsertScheduleEvent(params: {
  event: ScheduleEvent;
  mode: 'create' | 'update';
  locals?: App.Locals;
}): Promise<ScheduleEvent> {
  const { event, mode, locals } = params;

  const resolvedEventId =
    event.eventId?.trim() ||
    `${(event.type || 'reh').toLowerCase().slice(0, 3)}-${event.date}-${Date.now().toString(36).slice(-4)}`;

  const notesText = (event.notes || event.description || '').trim();

  const normalized: ScheduleEvent = {
    ...event,
    eventId: resolvedEventId,
    title: event.title.trim(),
    date: event.date.trim(),
    time: event.time.trim() || '7:00 PM - 9:30 PM',
    type: event.type || 'Rehearsal',
    location: event.location.trim() || 'TBD',
    snack1Name: event.snack1Name || '',
    snack2Name: event.snack2Name || '',
    snack3Name: event.snack3Name || '',
    snack4Name: event.snack4Name || '',
    notes: notesText,
    description: notesText,
  };

  if (isSandboxSheetMode(locals)) {
    const matchIdx = demoStore.schedule.findIndex((e) => e.eventId === normalized.eventId);
    if (mode === 'create' && matchIdx >= 0) {
      throw new ConflictError(`An event with ID "${normalized.eventId}" already exists.`);
    }
    if (mode === 'update' && matchIdx === -1) {
      throw new NotFoundError(`Event with ID "${normalized.eventId}" not found.`);
    }

    if (matchIdx >= 0) {
      demoStore.schedule[matchIdx] = {
        ...demoStore.schedule[matchIdx],
        ...normalized,
      };
    } else {
      demoStore.schedule.push(normalized);
    }
    demoStore.schedule.sort((a, b) => a.date.localeCompare(b.date));
    return { ...normalized };
  }

  // Uncached live lookup of Schedule!A1:K
  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === normalized.eventId);

  if (mode === 'create' && matchIdx >= 0) {
    throw new ConflictError(`An event with ID "${normalized.eventId}" already exists in the Schedule.`);
  }
  if (mode === 'update' && matchIdx === -1) {
    throw new NotFoundError(`Event with ID "${normalized.eventId}" not found in Schedule.`);
  }

  // Preserve existing snack signups when editing an event
  let s1 = normalized.snack1Name;
  let s2 = normalized.snack2Name;
  let s3 = normalized.snack3Name;
  let s4 = normalized.snack4Name;
  if (matchIdx >= 0) {
    const existingRow = rows[matchIdx];
    if (!s1 && existingRow[6]) s1 = existingRow[6];
    if (!s2 && existingRow[7]) s2 = existingRow[7];
    if (!s3 && existingRow[8]) s3 = existingRow[8];
    if (!s4 && existingRow[9]) s4 = existingRow[9];
  }

  const rowValues = [
    normalized.eventId,
    normalized.date,
    normalized.time,
    normalized.type,
    normalized.title,
    normalized.location,
    s1,
    s2,
    s3,
    s4,
    notesText,
  ];

  if (matchIdx >= 0) {
    const freshRowIndex = matchIdx + 2;
    await writeSheetValues(`Schedule!A${freshRowIndex}:K${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Schedule!A:K', [rowValues], locals);
  }

  await invalidateCacheTag('schedule');
  return normalized;
}

export async function deleteScheduleEvent(params: {
  eventId: string;
  locals?: App.Locals;
}): Promise<{ ok: boolean; eventId: string }> {
  const { eventId, locals } = params;

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.schedule.findIndex((e) => e.eventId === eventId);
    if (idx === -1) throw new NotFoundError(`Event with ID "${eventId}" not found.`);
    demoStore.schedule.splice(idx, 1);
    return { ok: true, eventId };
  }

  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === eventId);
  if (matchIdx === -1) {
    throw new NotFoundError(`Event with ID "${eventId}" not found in Schedule.`);
  }

  const freshRowIndex = matchIdx + 2;
  await writeSheetValues(
    `Schedule!A${freshRowIndex}:K${freshRowIndex}`,
    [['', '', '', '', '', '', '', '', '', '', '']],
    locals
  );

  await invalidateCacheTag('schedule');
  return { ok: true, eventId };
}

// ---------------------------------------------------------------------------
// Google Drive v3 Repertoire, Streaming & Handbook Export (Shared Drive Ready)
// ---------------------------------------------------------------------------

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  shortcutDetails?: {
    targetId?: string;
    targetMimeType?: string;
  };
}

function resolveDriveItem(item: DriveFileItem): {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
} {
  if (
    item.mimeType === 'application/vnd.google-apps.shortcut' &&
    item.shortcutDetails?.targetId &&
    item.shortcutDetails?.targetMimeType
  ) {
    return {
      id: item.shortcutDetails.targetId,
      name: item.name,
      mimeType: item.shortcutDetails.targetMimeType,
      size: item.size,
    };
  }
  return item;
}

function isSupportedDocItem(mimeType: string, name: string): {
  isDoc: boolean;
  canExportPdf: boolean;
} {
  if (mimeType === 'application/vnd.google-apps.document') {
    return { isDoc: true, canExportPdf: true };
  }
  const lower = name.toLowerCase();
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/rtf' ||
    /\.(docx|doc|txt|rtf)$/i.test(lower)
  ) {
    return { isDoc: true, canExportPdf: false };
  }
  return { isDoc: false, canExportPdf: false };
}

function toDriveMusicFile(
  rawItem: DriveFileItem,
  prefixLabel?: string
): DriveMusicFile | null {
  const f = resolveDriveItem(rawItem);
  const isPdf = f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
  const isAudio =
    f.mimeType.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name);
  const docInfo = isSupportedDocItem(f.mimeType, f.name);
  if (!isPdf && !isAudio && !docInfo.isDoc) return null;

  return {
    id: f.id,
    name: prefixLabel ? `${prefixLabel} — ${f.name}` : f.name,
    mimeType: f.mimeType,
    sizeBytes: f.size ? Number(f.size) : undefined,
    isPdf,
    isAudio,
    isDoc: docInfo.isDoc || undefined,
    canExportPdf: docInfo.canExportPdf || undefined,
  };
}

async function driveListQuery(query: string, locals?: App.Locals): Promise<DriveFileItem[]> {
  const token = await getGoogleAccessToken(locals);
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,shortcutDetails(targetId,targetMimeType))',
    orderBy: 'name',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive list failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

interface ConfiguredFolderTarget {
  folderId: string;
  explicitLabel?: string;
}

function parseRepertoireFolderTargets(config: PortalConfig): ConfiguredFolderTarget[] {
  const seen = new Set<string>();
  const targets: ConfiguredFolderTarget[] = [];

  function addRawEntries(rawValue: string, fallbackLabel?: string) {
    const entries = rawValue
      .split(/\s*(?:\||;|\r?\n|,)\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const entry of entries) {
      // Optional "Concert Label: https://drive.google.com/drive/folders/..." syntax
      const colonIdx = entry.indexOf(':');
      let label = fallbackLabel;
      let targetPart = entry;

      if (colonIdx > 0) {
        const prefix = entry.slice(0, colonIdx).trim();
        const rest = entry.slice(colonIdx + 1).trim();
        if (!/^https?$/i.test(prefix) && rest.length >= 10) {
          label = prefix;
          targetPart = rest;
        }
      }

      const folderId = extractGoogleId(targetPart);
      if (
        !folderId ||
        folderId === 'DEMO' ||
        folderId.startsWith('PASTE_') ||
        seen.has(folderId)
      ) {
        continue;
      }
      seen.add(folderId);
      targets.push({ folderId, explicitLabel: label });
    }
  }

  if (config.Repertoire_Drive_Folder_ID) {
    addRawEntries(config.Repertoire_Drive_Folder_ID);
  }

  // Also support one-row-per-concert keys in Config tab: e.g. Repertoire_Folder_Dia_De_Los_Muertos
  for (const [key, val] of Object.entries(config)) {
    if (/^Repertoire_Folder_/i.test(key) && val) {
      const derivedLabel = key
        .replace(/^Repertoire_Folder_/i, '')
        .replace(/_/g, ' ')
        .trim();
      addRawEntries(val, derivedLabel || undefined);
    }
  }

  return targets;
}

async function resolveFolderConcertName(
  target: ConfiguredFolderTarget,
  fallbackConcertTitle: string,
  locals?: App.Locals
): Promise<string> {
  if (target.explicitLabel) return target.explicitLabel;
  try {
    const meta = await getDriveFileMetadata(target.folderId, locals);
    const cleaned = meta.name
      .replace(/\s+(?:music\s+files|sheet\s+music|music\s+folder|repertoire\s+files)$/i, '')
      .trim();
    if (cleaned && !/^(music|scores|repertoire|folder|shared)$/i.test(cleaned)) {
      return cleaned;
    }
  } catch {
    // Ignore metadata read failure and fall back cleanly
  }
  return fallbackConcertTitle;
}

async function scanConcertRootFolder(
  target: ConfiguredFolderTarget,
  fallbackConcertTitle: string,
  totalRoots: number,
  locals?: App.Locals
): Promise<RepertoirePiece[]> {
  const concertTitle = await resolveFolderConcertName(target, fallbackConcertTitle, locals);
  const rootFolderId = target.folderId;
  const escapedRoot = rootFolderId.replace(/'/g, "\\'");
  const rootChildren = await driveListQuery(
    `'${escapedRoot}' in parents and trashed = false`,
    locals
  );

  const rootMusicFiles: DriveMusicFile[] = [];
  const subfolders: { id: string; name: string }[] = [];

  for (const raw of rootChildren) {
    const resolved = resolveDriveItem(raw);
    if (resolved.mimeType === 'application/vnd.google-apps.folder') {
      subfolders.push({ id: resolved.id, name: resolved.name });
    } else {
      const musicFile = toDriveMusicFile(raw);
      if (musicFile) rootMusicFiles.push(musicFile);
    }
  }

  const subfolderPieces = await Promise.all(
    subfolders.map(async (folder): Promise<RepertoirePiece[]> => {
      const escapedFolder = folder.id.replace(/'/g, "\\'");
      const children = await driveListQuery(
        `'${escapedFolder}' in parents and trashed = false`,
        locals
      );

      const directFiles: DriveMusicFile[] = [];
      const nestedFolders: { id: string; name: string }[] = [];

      for (const child of children) {
        const resolvedChild = resolveDriveItem(child);
        if (resolvedChild.mimeType === 'application/vnd.google-apps.folder') {
          nestedFolders.push({ id: resolvedChild.id, name: resolvedChild.name });
        } else {
          const mf = toDriveMusicFile(child);
          if (mf) directFiles.push(mf);
        }
      }

      if (nestedFolders.length > 0) {
        const nestedResults = await Promise.all(
          nestedFolders.map(async (nf) => {
            const escapedNested = nf.id.replace(/'/g, "\\'");
            const nestedRaw = await driveListQuery(
              `'${escapedNested}' in parents and trashed = false`,
              locals
            );
            return {
              folder: nf,
              files: nestedRaw
                .map((item) => toDriveMusicFile(item))
                .filter((f): f is DriveMusicFile => f !== null),
            };
          })
        );

        // If a single master root contains Concert folders -> Piece folders, treat `folder.name` as the Concert group!
        if (directFiles.length === 0) {
          const groupTitle = totalRoots === 1 && rootMusicFiles.length === 0 ? folder.name : concertTitle;
          const groupId = totalRoots === 1 && rootMusicFiles.length === 0 ? folder.id : rootFolderId;
          return nestedResults
            .filter((nr) => nr.files.length > 0)
            .map((nr) => ({
              folderId: nr.folder.id,
              title: nr.folder.name,
              concertId: groupId,
              concertTitle: groupTitle,
              files: nr.files,
            }));
        }

        for (const nr of nestedResults) {
          for (const f of nr.files) {
            directFiles.push({
              ...f,
              name: `${nr.folder.name} — ${f.name}`,
            });
          }
        }
      }

      // If a single master root has no direct files and multiple Concert subfolders each holding flat PDFs
      const treatSubfolderAsConcert =
        totalRoots === 1 && rootMusicFiles.length === 0 && directFiles.length > 3;

      return directFiles.length > 0
        ? [
            {
              folderId: folder.id,
              title: folder.name,
              concertId: treatSubfolderAsConcert ? folder.id : rootFolderId,
              concertTitle: treatSubfolderAsConcert ? folder.name : concertTitle,
              files: directFiles,
            },
          ]
        : [];
    })
  );

  const pieces: RepertoirePiece[] = [];
  if (rootMusicFiles.length > 0) {
    pieces.push({
      folderId: rootFolderId,
      title: subfolders.length > 0 ? `${concertTitle} — Scores & Tracks` : concertTitle,
      concertId: rootFolderId,
      concertTitle,
      files: rootMusicFiles,
    });
  }
  for (const group of subfolderPieces) {
    pieces.push(...group);
  }

  return pieces;
}

export async function getRepertoire(locals?: App.Locals): Promise<RepertoirePiece[]> {
  const [config, concerts] = await Promise.all([
    getPortalConfig(locals),
    getConcerts(locals),
  ]);
  const targets = parseRepertoireFolderTargets(config);

  if (!hasGoogleServiceAccount(locals) || targets.length === 0) {
    return demoStore.repertoire.map((piece) => ({
      ...piece,
      files: piece.files.map((f) => ({ ...f })),
    }));
  }

  const activeConcertTitle =
    concerts.find((c) => c.status === 'On_Sale' || c.status === 'Upcoming')?.title ||
    'Concert Repertoire';

  return cachedFetchJson('music', 300, async () => {
    const groups = await Promise.all(
      targets.map((target, idx) =>
        scanConcertRootFolder(
          target,
          idx === 0 ? activeConcertTitle : `Concert Program ${idx + 1}`,
          targets.length,
          locals
        )
      )
    );
    const flat = groups.flat();

    // Optional standalone Director_Notes_Doc_ID in Config tab if not already inside the Drive folder
    const extraDocId = extractGoogleId(
      config.Director_Notes_Doc_ID || config.Repertoire_Notes_Doc_ID || ''
    );
    if (extraDocId && extraDocId !== 'DEMO' && !extraDocId.startsWith('PASTE_')) {
      const alreadyPresent = flat.some((p) => p.files.some((f) => f.id === extraDocId));
      if (!alreadyPresent) {
        try {
          const meta = await getDriveFileMetadata(extraDocId, locals);
          const docInfo = isSupportedDocItem(meta.mimeType, meta.name);
          if (docInfo.isDoc && flat[0]) {
            flat[0].files.unshift({
              id: meta.id,
              name: meta.name,
              mimeType: meta.mimeType,
              sizeBytes: meta.size,
              isPdf: false,
              isAudio: false,
              isDoc: true,
              canExportPdf: docInfo.canExportPdf || undefined,
            });
          }
        } catch {
          // Ignore invalid or unshared optional doc ID
        }
      }
    }

    return flat;
  });
}

const DEMO_DIRECTOR_MARKINGS_HTML: Record<string, string> = {
  'demo-doc-advent-markings': sanitizeHandbookHtml(`
    <h2>Concert Order &amp; Transitions — Advent with Kantorei</h2>
    <p><strong>Artistic Director Callouts (Adam Reinwald):</strong> Please transfer all measure numbers, breaths, and repeat instructions into ForScore or your octavos prior to our first November sectional.</p>
    <table>
      <thead>
        <tr>
          <th>Order &amp; Piece</th>
          <th>Divisi &amp; Part Assignments</th>
          <th>Repeats, Cuts &amp; Style</th>
          <th>Reference Recording</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Gaudete</strong> — Steven Sametz</td>
          <td><strong>SATB + Solo Quartet:</strong> S1/A1/T1/B1 take upper divisi at m. 34; B2 anchor low drone pedal smoothly.</td>
          <td>Take 1st &amp; 2nd endings at m. 24; <em>subito piano</em> on repeat. Crisp liturgical Latin consonants.</td>
          <td><a href="https://www.youtube.com/watch?v=9yM6S6qU4uY">Listen on YouTube</a></td>
        </tr>
        <tr>
          <td><strong>2. O Magnum Mysterium</strong> — Morten Lauridsen</td>
          <td><strong>Full SATB (8-part divisi mm. 28–39):</strong> S2 split evenly on m. 36 cluster; A2/T1 match warm vowel color; B1/B2 stagger breathing through mm. 44–52.</td>
          <td>&#9833; = 54. No breath before "et admirabile" in m. 5 (carry phrase across barline). Release final chord on beat 4.</td>
          <td><a href="https://www.youtube.com/watch?v=nn5ken3RJBo">Lauridsen Reference (YouTube)</a></td>
        </tr>
        <tr>
          <td><strong>3. and the swallow</strong> — Caroline Shaw</td>
          <td><strong>SATB:</strong> S1/S2 straight tone opening ("How lovely is your dwelling place"); T2/B1 bring out moving inner 16ths at m. 41.</td>
          <td>Observe written glissandi gently (not theatrical); observe 2-bar silence before Coda.</td>
          <td><a href="https://www.youtube.com/watch?v=X3N2h6uP5F4">Shaw Reference (YouTube)</a></td>
        </tr>
      </tbody>
    </table>
    <h3>General Advent Style &amp; Standing Formation</h3>
    <ul>
      <li><strong>Mixed Quartet Formation</strong> for Set I; switch to <strong>Sectional Arc (S–A–B–T)</strong> during organ interlude before Lauridsen.</li>
      <li>All final <em>m</em> and <em>n</em> consonants place cleanly on the release beat unless marked <em>morendo</em>.</li>
    </ul>
  `),
  'demo-doc-muertos-markings': sanitizeHandbookHtml(`
    <h2>Concert Order &amp; Markings — Día de los Muertos</h2>
    <p><strong>Rehearsal &amp; Performance Notes:</strong> Attacca transitions between Movements I &amp; II of the Howells Requiem.</p>
    <ul>
      <li><strong>1. J.S. Bach — Lobet den Herrn, BWV 230:</strong> Observe breath marks in marked score; B1/B2 detached 8ths in continuo-style passages, legato on melismas. Reference: https://www.youtube.com/watch?v=c6b6B8T3a7E</li>
      <li><strong>2. Herbert Howells — Requiem:</strong> S1/A1 float upper cathedral resonance without heavy vibrato; T1/T2 lean into suspensions at rehearsal [C]. Reference: <a href="https://www.youtube.com/watch?v=1bZ0vF3y4fA">Howells Requiem Reference</a></li>
    </ul>
  `),
};

export async function getRepertoireDocHtml(
  fileId: string,
  requestedName: string,
  locals?: App.Locals
): Promise<{
  title: string;
  html: string;
  sourceType: 'gdoc' | 'docx' | 'text' | 'legacy-doc';
  canExportPdf: boolean;
}> {
  if (fileId.startsWith('demo-doc-')) {
    return {
      title: requestedName,
      html:
        DEMO_DIRECTOR_MARKINGS_HTML[fileId] ||
        DEMO_DIRECTOR_MARKINGS_HTML['demo-doc-advent-markings'],
      sourceType: 'docx',
      canExportPdf: true,
    };
  }

  return cachedFetchJson(`repertoire-doc:${fileId}`, 300, async () => {
    const meta = await getDriveFileMetadata(fileId, locals);
    const title = meta.name || requestedName;

    if (meta.mimeType === 'application/vnd.google-apps.document') {
      const token = await getGoogleAccessToken(locals);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}/export?mimeType=text/html`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        throw new Error(`Google Doc markings export failed (${res.status}).`);
      }
      const rawHtml = await res.text();
      return {
        title,
        html: sanitizeHandbookHtml(rawHtml),
        sourceType: 'gdoc' as const,
        canExportPdf: true,
      };
    }

    const lower = title.toLowerCase();
    const isDocx =
      meta.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lower.endsWith('.docx');

    if (isDocx) {
      const mediaRes = await fetchDriveMediaResponse(fileId, null, locals);
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch .docx markings from Google Drive (${mediaRes.status}).`);
      }
      const bytes = new Uint8Array(await mediaRes.arrayBuffer());
      const html = await convertDocxToHtml(bytes);
      return {
        title,
        html,
        sourceType: 'docx' as const,
        canExportPdf: false,
      };
    }

    if (meta.mimeType === 'text/plain' || lower.endsWith('.txt')) {
      const mediaRes = await fetchDriveMediaResponse(fileId, null, locals);
      if (!mediaRes.ok) {
        throw new Error(`Failed to fetch text notes from Google Drive (${mediaRes.status}).`);
      }
      const rawText = await mediaRes.text();
      return {
        title,
        html: convertPlainTextToHtml(rawText),
        sourceType: 'text' as const,
        canExportPdf: false,
      };
    }

    return {
      title,
      html: sanitizeHandbookHtml(
        `<p>This markings file (<strong>${title}</strong>) uses a legacy Word format (<code>.doc</code> / <code>.rtf</code>). Click <strong>Download Original</strong> above to view it, or open it in Google Docs / save as <code>.docx</code> in Drive for instant inline viewing.</p>`
      ),
      sourceType: 'legacy-doc' as const,
      canExportPdf: false,
    };
  });
}

export async function exportGoogleDocPdfResponse(
  fileId: string,
  locals?: App.Locals
): Promise<Response> {
  const token = await getGoogleAccessToken(locals);
  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}/export?mimeType=application/pdf`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function getDriveFileMetadata(
  fileId: string,
  locals?: App.Locals
): Promise<{ id: string; name: string; mimeType: string; size?: number }> {
  const token = await getGoogleAccessToken(locals);
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size',
    supportsAllDrives: 'true',
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new NotFoundError(`Drive file ${fileId} not found (${res.status}).`);
  }

  const meta = (await res.json()) as { id: string; name: string; mimeType: string; size?: string };
  return {
    id: meta.id,
    name: meta.name,
    mimeType: meta.mimeType,
    size: meta.size ? Number(meta.size) : undefined,
  };
}

export async function fetchDriveMediaResponse(
  fileId: string,
  rangeHeader: string | null,
  locals?: App.Locals
): Promise<Response> {
  const token = await getGoogleAccessToken(locals);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (rangeHeader) {
    headers.Range = rangeHeader;
  }

  return fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`,
    { headers }
  );
}

export async function getHandbookHtml(
  locals?: App.Locals
): Promise<{ html: string; isDemo: boolean }> {
  const config = await getPortalConfig(locals);
  const docId = extractGoogleId(config.Handbook_Google_Doc_ID || '');

  if (!hasGoogleServiceAccount(locals) || !docId || docId === 'DEMO' || docId.startsWith('PASTE_')) {
    return { html: DEFAULT_HANDBOOK_HTML, isDemo: true };
  }

  const sanitized = await cachedFetchJson('handbook', 300, async () => {
    const token = await getGoogleAccessToken(locals);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        docId
      )}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(`Handbook Google Doc export failed (${res.status})`);
    }
    const rawHtml = await res.text();
    return sanitizeHandbookHtml(rawHtml);
  });

  return { html: sanitized, isDemo: false };
}

export async function getStrategicPlanHtml(
  locals?: App.Locals
): Promise<{ html: string; isDemo: boolean }> {
  const config = await getPortalConfig(locals);
  const docId = extractGoogleId(config.Strategic_Plan_Google_Doc_ID || '');

  if (!hasGoogleServiceAccount(locals) || !docId || docId === 'DEMO' || docId.startsWith('PASTE_')) {
    return { html: DEFAULT_STRATEGIC_PLAN_HTML, isDemo: true };
  }

  const sanitized = await cachedFetchJson('strategic-plan', 300, async () => {
    const token = await getGoogleAccessToken(locals);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        docId
      )}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(`Strategic Plan Google Doc export failed (${res.status})`);
    }
    const rawHtml = await res.text();
    return sanitizeHandbookHtml(rawHtml);
  });

  return { html: sanitized, isDemo: false };
}

// ---------------------------------------------------------------------------
// On-the-Fly Valid Sample PDF & Choral Pitch WAV Generators for Demo Streaming
// ---------------------------------------------------------------------------

export function generateDemoPdfBytes(title: string): Uint8Array {
  const safeTitle = title.replace(/[()\\]/g, '');
  const streamContent = [
    'BT',
    '/F1 20 Tf',
    '54 730 Td',
    `(Kantorei Rehearsal Score Edition) Tj`,
    '/F1 13 Tf',
    '0 -28 Td',
    `(${safeTitle}) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
    '(ForScore / Tablet Ready Stream - Sandbox Demo Preview) Tj',
    '0 -32 Td',
    '(Connect Repertoire_Drive_Folder_ID in Config to stream live PDFs from Google Drive.) Tj',
    'ET',
    '0.6 w',
    // Staff 1 (5 lines)
    '54 610 m 558 610 l S',
    '54 602 m 558 602 l S',
    '54 594 m 558 594 l S',
    '54 586 m 558 586 l S',
    '54 578 m 558 578 l S',
    // Staff 2 (5 lines)
    '54 530 m 558 530 l S',
    '54 522 m 558 522 l S',
    '54 514 m 558 514 l S',
    '54 506 m 558 506 l S',
    '54 498 m 558 498 l S',
    // Barlines
    '54 578 m 54 610 l S',
    '306 578 m 306 610 l S',
    '558 578 m 558 610 l S',
    '54 498 m 54 530 l S',
    '306 498 m 306 530 l S',
    '558 498 m 558 530 l S',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export function generateDemoWavBytes(fileId: string): Uint8Array {
  const sampleRate = 22050;
  const durationSeconds = 4;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // Pick part-predominant pitch (D major triad / octave for O Magnum Mysterium feel)
  const lower = fileId.toLowerCase();
  const leadFreq = lower.includes('soprano')
    ? 587.33 // D5
    : lower.includes('alto')
      ? 440.0 // A4
      : lower.includes('tenor')
        ? 369.99 // F#4
        : 146.83; // D3 (Bass)

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope =
      Math.min(1, t / 0.15) * Math.min(1, (durationSeconds - t) / 0.35);
    // Warm organ-like harmonic blend with emphasized voice part
    const lead = 0.55 * Math.sin(2 * Math.PI * leadFreq * t) + 0.15 * Math.sin(4 * Math.PI * leadFreq * t);
    const chord =
      0.12 * Math.sin(2 * Math.PI * 293.66 * t) +
      0.1 * Math.sin(2 * Math.PI * 369.99 * t) +
      0.1 * Math.sin(2 * Math.PI * 440.0 * t);
    const sample = Math.max(-1, Math.min(1, (lead + chord) * envelope * 0.75));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Uint8Array(buffer);
}
