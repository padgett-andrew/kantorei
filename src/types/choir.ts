export const VOICE_PARTS = [
  'S', 'S1', 'S2',
  'A', 'A1', 'A2',
  'T', 'T1', 'T2',
  'B', 'B1', 'B2',
] as const;
export const SECTION_GROUPS = ['Soprano', 'Alto', 'Tenor', 'Bass'] as const;
export const MEMBER_ROLES = ['Singer', 'Section_Leader', 'Admin'] as const;
export const SINGER_STATUSES = ['Active', 'On_Leave', 'Inactive'] as const;
export const EVENT_TYPES = ['Rehearsal', 'Sectional', 'Retreat', 'Dress', 'Concert'] as const;
export const ABSENCE_STATUSES = ['Absent', 'Late', 'Cleared'] as const;
export const CONCERT_STATUSES = ['Draft', 'Upcoming', 'On_Sale', 'Past'] as const;

export type VoicePart = (typeof VOICE_PARTS)[number];
export type SectionGroup = (typeof SECTION_GROUPS)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];
export type SingerStatus = (typeof SINGER_STATUSES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];
export type ConcertStatus = (typeof CONCERT_STATUSES)[number];

export interface Singer {
  email: string; // Primary key (normalized lowercase)
  name: string;
  voicePart?: VoicePart | '';
  sectionGroup?: SectionGroup | '';
  role: MemberRole;
  phone: string;
  /** True only when actively singing in the current concert cycle (included in roll call & alerts) */
  active: boolean;
  /** 'Active' = singing this season; 'On_Leave' = skipping season (asleep: no roll call or season alerts); 'Inactive' = former member */
  status: SingerStatus;
  /** Optional Google profile picture or avatar URL */
  picture?: string;
  photoUrl?: string;
}

export function canAccessPortal(singer?: Pick<Singer, 'status' | 'active'> | null): boolean {
  if (!singer) return false;
  return singer.status === 'Active' || singer.status === 'On_Leave' || singer.active;
}

export interface ScheduleEvent {
  eventId: string; // Primary key
  date: string;    // YYYY-MM-DD
  time: string;
  type: EventType;
  title: string;
  location: string;
  snack1Name: string;
  snack2Name: string;
  snack3Name: string;
  snack4Name: string;
  notes: string;
  description?: string;
}

export interface ParsedSnackSlot {
  name: string;
  item: string;
}

const OPEN_SLOT_PLACEHOLDERS = new Set([
  'open',
  'tbd',
  'vacant',
  'unclaimed',
  'available',
  'none',
  '-',
  '--',
]);

export function parseSnackEntry(raw?: string | null): ParsedSnackSlot {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { name: '', item: '' };

  // Explicit bracket/parenthesis-only custom duty: "(Room Setup)" or "[Room Setup]"
  if (
    (trimmed.startsWith('(') && trimmed.endsWith(')')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return { name: '', item: trimmed.slice(1, -1).trim() };
  }

  // Explicit prefix: "Role: Stage Setup" or "Duty: Door Greeter"
  const prefixMatch = /^(?:role|duty|task|slot)\s*[:—–-]\s*(.+)$/i.exec(trimmed);
  if (prefixMatch) {
    return { name: '', item: prefixMatch[1].trim() };
  }

  // Pattern 1: "Andrew Padgett (Cheese & crackers)" or "Open (Room Setup)"
  const parenMatch = /^([^(]+?)\s*\(([^)]+)\)$/.exec(trimmed);
  if (parenMatch) {
    const singer = parenMatch[1].trim();
    const item = parenMatch[2].trim();
    if (OPEN_SLOT_PLACEHOLDERS.has(singer.toLowerCase())) {
      return { name: '', item };
    }
    return { name: singer, item };
  }

  // Pattern 2: "Andrew Padgett — Cheese & crackers" or "Open - Room Setup"
  const dashMatch = /^([^-—:]+?)\s*[-—:]\s*(.+)$/.exec(trimmed);
  if (dashMatch) {
    const singer = dashMatch[1].trim();
    const item = dashMatch[2].trim();
    if (OPEN_SLOT_PLACEHOLDERS.has(singer.toLowerCase())) {
      return { name: '', item };
    }
    return { name: singer, item };
  }

  if (OPEN_SLOT_PLACEHOLDERS.has(trimmed.toLowerCase())) {
    return { name: '', item: '' };
  }

  return { name: trimmed, item: '' };
}

export function formatSnackEntry(name: string, item?: string): string {
  const trimmedName = (name || '').trim();
  const trimmedItem = (item || '').trim();
  if (!trimmedName) return trimmedItem ? `(${trimmedItem})` : '';
  if (!trimmedItem) return trimmedName;
  return `${trimmedName} (${trimmedItem})`;
}

export interface AbsenceRecord {
  timestamp: string;
  eventId: string;
  date: string;
  singerName: string;
  singerEmail: string;
  voicePart: VoicePart | '';
  reason: string;
  submittedBy: string;
  status: AbsenceStatus;
}

export interface ConcertPerformance {
  dateDisplay: string;
  venueName: string;
  venueAddress?: string;
  label?: string;
  /** Normalized YYYY-MM-DD performance date for calendar calculations */
  isoDate?: string;
}

export interface ConcertEvent {
  slug: string;
  title: string;
  datesDisplay: string;
  venueName: string;
  venueAddress: string;
  description: string;
  ttEventSeriesId: string;
  status: ConcertStatus;
  heroImageUrl?: string;
  posterImageUrl?: string;
  performances?: ConcertPerformance[];
  boxOfficeNote?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  subtitle: string;
  youtubeUrl: string;
  category: string;
  description?: string;
}

export interface PortalConfig {
  Choir_Name: string;
  Conductor_Name?: string;
  Conductor_Email: string;
  Associate_Director_Email?: string;
  Manager_Email: string;
  Attendance_Admin_Emails?: string;
  Absence_Notification_Emails?: string;
  Notify_All_Admins_On_Absence?: string;
  Repertoire_Drive_Folder_ID: string;
  Handbook_Google_Doc_ID: string;
  Strategic_Plan_Google_Doc_ID: string;
  Season_Pass_TT_Widget_URL: string;
  Portal_Announcement: string;
  Calendar_Timezone: string;
  YouTube_URL: string;
  Instagram_URL: string;
  Facebook_URL: string;
  MailerLite_Group_ID?: string;
  // Official Contact Info
  Contact_Email?: string;
  Contact_Phone?: string;
  Contact_Address?: string;
  // Dynamic Content & Statements (Editable via Google Sheet Config tab)
  Mission_Statement?: string;
  Vision_Statement?: string;
  Hero_Tagline?: string;
  Hero_Subtitle?: string;
  Hero_Video_URL?: string;
  Hero_Image_URL?: string;
  About_Header_Title?: string;
  About_History_P1?: string;
  About_History_P2?: string;
  Auditions_Blurb?: string;
  Auditions_Timing_Note?: string;
  Auditions_Rehearsal_Cadence?: string;
  Auditions_Process_Note?: string;
  Auditions_Form_URL?: string;
  Auditions_Google_Form_URL?: string;
  Support_Hero_Title?: string;
  Support_Hero_Subtitle?: string;
  Support_Gala_Title?: string;
  Support_Gala_Blurb?: string;
  Support_Matching_Title?: string;
  Support_Matching_Blurb?: string;
  Support_Auditions_Title?: string;
  Support_Auditions_Blurb?: string;
  Tax_Exempt_Disclaimer?: string;
  // Donation Platform & Little Green Light Integration
  Donation_Platform?: 'givebutter' | 'lgl' | 'both' | string;
  LGL_Form_URL?: string;
  Givebutter_Account_ID?: string;
  Givebutter_Campaign_ID?: string;
  Givebutter_Widget_ID?: string;
  // Newsletter, Email Signup & Footer Copy
  Newsletter_Category?: string;
  Newsletter_Headline?: string;
  Newsletter_Description?: string;
  Newsletter_Button_Text?: string;
  Footer_About_Blurb?: string;
  Home_Newsletter_Title?: string;
  Home_Newsletter_Description?: string;
  Concerts_Newsletter_Title?: string;
  Concerts_Newsletter_Description?: string;
  // Home Spotlight Control ('concert' | 'recording' | 'friends' or specific media ID)
  Home_Spotlight_Type?: string;
  Home_Spotlight_Media_ID?: string;
  Home_Spotlight_Title?: string;
  Home_Spotlight_Description?: string;
  Spotlight_Type?: string;
  Spotlight_Media_ID?: string;
  // Empty State Copy for Concerts Page
  No_Concerts_Title?: string;
  No_Concerts_Blurb?: string;
  [key: string]: string | undefined;
}

export interface BoardMember {
  name: string;
  role: string;
  order: number;
  bioNotes?: string;
  active: boolean;
}

export interface LeadershipMember {
  name: string;
  title: string;
  bio: string;
  order: number;
  email?: string;
  imageUrl?: string;
  active: boolean;
}

export interface GivingTier {
  name: string;
  range: string;
  description: string;
  order: number;
  active: boolean;
}

export interface SubscriberRecord {
  timestamp: string;
  email: string;
  name?: string;
  source: string;
  status: 'Active' | 'Unsubscribed';
}

export interface SheetWarning {
  tab:
    | 'Roster'
    | 'Schedule'
    | 'Absences'
    | 'Concerts'
    | 'Media'
    | 'Seating_Charts'
    | 'Board'
    | 'Leadership'
    | 'Giving_Tiers'
    | 'Subscribers'
    | 'Messages';
  rowNumber: number;
  message: string;
}

export const BULLETIN_CATEGORIES = [
  'Rehearsal_Notes',
  'Announcement',
  'Part_Assignments',
  'Logistics',
  'Discussion',
] as const;
export type BulletinCategory = (typeof BULLETIN_CATEGORIES)[number];

export const BULLETIN_MESSAGE_STATUSES = ['Published', 'Pinned', 'Archived'] as const;
export type BulletinMessageStatus = (typeof BULLETIN_MESSAGE_STATUSES)[number];

export interface BulletinMessage {
  id: string;
  timestamp: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  category: BulletinCategory;
  pinned: boolean;
  status: BulletinMessageStatus;
  threadId?: string;
}

export interface DriveMusicFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  isPdf: boolean;
  isAudio: boolean;
  isDoc?: boolean;
  canExportPdf?: boolean;
  matchesUserSection?: boolean;
}

export interface RepertoirePiece {
  folderId: string;
  title: string;
  concertId?: string;
  concertTitle?: string;
  files: DriveMusicFile[];
}

export function inferSectionGroup(voicePart?: VoicePart | string | null): SectionGroup | '' {
  const norm = String(voicePart || '').trim().toUpperCase();
  if (!norm) return '';
  if (norm.startsWith('S')) return 'Soprano';
  if (norm.startsWith('A')) return 'Alto';
  if (norm.startsWith('T')) return 'Tenor';
  if (norm.startsWith('B')) return 'Bass';
  return '';
}

export function formatVoicePartLabel(vp: VoicePart | string): string {
  switch (vp) {
    case 'S':
      return 'S — Soprano (General)';
    case 'S1':
      return 'S1 — Soprano 1';
    case 'S2':
      return 'S2 — Soprano 2';
    case 'A':
      return 'A — Alto (General)';
    case 'A1':
      return 'A1 — Alto 1';
    case 'A2':
      return 'A2 — Alto 2';
    case 'T':
      return 'T — Tenor (General)';
    case 'T1':
      return 'T1 — Tenor 1';
    case 'T2':
      return 'T2 — Tenor 2';
    case 'B':
      return 'B — Bass (General)';
    case 'B1':
      return 'B1 — Bass 1';
    case 'B2':
      return 'B2 — Bass 2';
    default:
      return String(vp || '');
  }
}

export function normalizeVoicePart(raw: unknown): VoicePart | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (!cleaned) return null;

  if ((VOICE_PARTS as readonly string[]).includes(cleaned)) {
    return cleaned as VoicePart;
  }

  // Common full name and variation handling
  if (/^SOPRANO1?$/i.test(cleaned)) return cleaned.endsWith('1') ? 'S1' : 'S';
  if (/^SOPRANO2$/i.test(cleaned)) return 'S2';
  if (/^ALTO1?$/i.test(cleaned)) return cleaned.endsWith('1') ? 'A1' : 'A';
  if (/^ALTO2$/i.test(cleaned)) return 'A2';
  if (/^TENOR1?$/i.test(cleaned)) return cleaned.endsWith('1') ? 'T1' : 'T';
  if (/^TENOR2$/i.test(cleaned)) return 'T2';
  if (/^BASS1?$/i.test(cleaned)) return cleaned.endsWith('1') ? 'B1' : 'B';
  if (/^BASS2$/i.test(cleaned)) return 'B2';
  if (/^BARITONE$/i.test(cleaned)) return 'B1';
  if (/^MEZZO(SOPRANO)?$/i.test(cleaned)) return 'A1';

  return null;
}

export const SEATING_CHART_STATUSES = ['Draft', 'Published'] as const;
export type SeatingChartStatus = (typeof SEATING_CHART_STATUSES)[number];

export interface SeatingSeat {
  seatIndex: number;
  singerEmail?: string;
  singerName?: string;
  voicePart?: VoicePart;
  isAisle?: boolean;
  customLabel?: string;
}

export interface SeatingRow {
  rowNumber: number;
  name: string;
  seats: SeatingSeat[];
}

export interface SeatingChart {
  id: string;
  season: string;
  concertSlug?: string;
  concertTitle?: string;
  title: string;
  description?: string;
  status: SeatingChartStatus;
  rows: SeatingRow[];
  createdAt: string;
  updatedAt: string;
}

export interface SingerSeatLocation {
  chartId: string;
  chartTitle: string;
  rowNumber: number;
  rowName: string;
  seatIndex: number;
  totalSeatsInRow: number;
  voicePart?: VoicePart;
}

export function findSingerSeatInChart(
  chart: SeatingChart,
  singerEmail: string
): SingerSeatLocation | null {
  const normEmail = (singerEmail || '').trim().toLowerCase();
  if (!normEmail) return null;
  for (const row of chart.rows) {
    for (const seat of row.seats) {
      if (seat.singerEmail && seat.singerEmail.trim().toLowerCase() === normEmail) {
        return {
          chartId: chart.id,
          chartTitle: chart.title,
          rowNumber: row.rowNumber,
          rowName: row.name,
          seatIndex: seat.seatIndex,
          totalSeatsInRow: row.seats.filter((s) => !s.isAisle).length,
          voicePart: seat.voicePart,
        };
      }
    }
  }
  return null;
}

