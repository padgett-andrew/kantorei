export const VOICE_PARTS = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as const;
export const SECTION_GROUPS = ['Soprano', 'Alto', 'Tenor', 'Bass'] as const;
export const MEMBER_ROLES = ['Singer', 'Section_Leader', 'Admin'] as const;
export const SINGER_STATUSES = ['Active', 'On_Leave', 'Inactive'] as const;
export const EVENT_TYPES = ['Rehearsal', 'Sectional', 'Retreat', 'Dress', 'Concert'] as const;
export const ABSENCE_STATUSES = ['Absent', 'Cleared'] as const;
export const CONCERT_STATUSES = ['Upcoming', 'On_Sale', 'Past'] as const;

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
  voicePart: VoicePart;
  sectionGroup: SectionGroup;
  role: MemberRole;
  phone: string;
  /** True only when actively singing in the current concert cycle (included in roll call & alerts) */
  active: boolean;
  /** 'Active' = singing this season; 'On_Leave' = skipping season (asleep: no roll call or season alerts); 'Inactive' = former member */
  status: SingerStatus;
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
}

export interface ParsedSnackSlot {
  name: string;
  item: string;
}

export function parseSnackEntry(raw?: string | null): ParsedSnackSlot {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { name: '', item: '' };
  // Pattern 1: "Andrew Padgett (Cheese & crackers)"
  const parenMatch = /^([^(]+?)\s*\(([^)]+)\)$/.exec(trimmed);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), item: parenMatch[2].trim() };
  }
  // Pattern 2: "Andrew Padgett — Cheese & crackers" or "Andrew Padgett - Cheese"
  const dashMatch = /^([^-—:]+?)\s*[-—:]\s*(.+)$/.exec(trimmed);
  if (dashMatch) {
    return { name: dashMatch[1].trim(), item: dashMatch[2].trim() };
  }
  return { name: trimmed, item: '' };
}

export function formatSnackEntry(name: string, item?: string): string {
  const trimmedName = (name || '').trim();
  const trimmedItem = (item || '').trim();
  if (!trimmedName) return '';
  if (!trimmedItem) return trimmedName;
  return `${trimmedName} (${trimmedItem})`;
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
  status: ConcertStatus;
  heroImageUrl?: string;
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
  [key: string]: string | undefined;
}

export interface SheetWarning {
  tab: 'Roster' | 'Schedule' | 'Absences' | 'Concerts' | 'Media';
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

export function inferSectionGroup(voicePart: VoicePart): SectionGroup {
  if (voicePart.startsWith('S')) return 'Soprano';
  if (voicePart.startsWith('A')) return 'Alto';
  if (voicePart.startsWith('T')) return 'Tenor';
  return 'Bass';
}
