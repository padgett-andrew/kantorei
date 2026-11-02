import {
  formatSnackEntry,
  parseSnackEntry,
  type AbsenceRecord,
  type ConcertEvent,
  type MediaItem,
  type PortalConfig,
  type ScheduleEvent,
  type SheetWarning,
  type Singer,
} from '../../types/choir';
import { cachedFetchJson } from '../cache';
import {
  getCalendarId,
  getEnv,
  hasGoogleServiceAccount,
  isSandboxSheetMode,
} from '../env';
import {
  AbsenceRowSchema,
  ConcertRowSchema,
  MediaRowSchema,
  ScheduleRowSchema,
  SingerRowSchema,
} from '../schemas';
import { fetchGoogleCalendarEvents } from './calendar';
import { isBlankRow, padRow, readSheetValues } from './client';
import { demoStore, type SnackClaim } from './demo-store';

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

export async function getSnackClaims(locals?: App.Locals): Promise<SnackClaim[]> {
  if (isSandboxSheetMode(locals)) {
    return [...(demoStore.snacks || [])];
  }

  // 1. Try reading dedicated Snacks!A2:E tab if created
  try {
    const rows = await readSheetValues('Snacks!A2:E', locals);
    if (rows && rows.length > 0) {
      return rows
        .filter((r) => r[0] && r[1] && r[2])
        .map((r) => ({
          eventId: (r[0] ?? '').trim(),
          slot: (Number(r[1]) || 1) as 1 | 2 | 3 | 4,
          singerName: (r[2] ?? '').trim(),
          item: (r[3] ?? '').trim(),
          updatedAt: (r[4] ?? '').trim(),
        }));
    }
  } catch {
    // Snacks tab might not exist yet; fall back to Schedule!A2:J
  }

  // 2. Fall back to reading columns G, H, I, J from Schedule!A2:J
  try {
    const schedRows = await readSheetValues('Schedule!A2:J', locals);
    const claims: SnackClaim[] = [];
    for (const r of schedRows) {
      const evId = (r[0] ?? '').trim();
      if (!evId) continue;
      for (let s = 1; s <= 4; s++) {
        const val = (r[5 + s] ?? '').trim();
        if (val) {
          const parsed = parseSnackEntry(val);
          claims.push({
            eventId: evId,
            slot: s as 1 | 2 | 3 | 4,
            singerName: parsed.name,
            item: parsed.item,
          });
        }
      }
    }
    return claims;
  } catch {
    return [];
  }
}

export function mergeSnackClaimsIntoSchedule(events: ScheduleEvent[], claims: SnackClaim[]): void {
  const claimMap = new Map<string, Record<number, string>>();
  for (const c of claims) {
    const formatted = formatSnackEntry(c.singerName, c.item);
    if (!claimMap.has(c.eventId)) {
      claimMap.set(c.eventId, {});
    }
    claimMap.get(c.eventId)![c.slot] = formatted;
  }

  for (const ev of events) {
    const eventClaims = claimMap.get(ev.eventId);
    if (eventClaims) {
      if (eventClaims[1]) ev.snack1Name = eventClaims[1];
      if (eventClaims[2]) ev.snack2Name = eventClaims[2];
      if (eventClaims[3]) ev.snack3Name = eventClaims[3];
      if (eventClaims[4]) ev.snack4Name = eventClaims[4];
    }
  }
}

export async function getScheduleWithWarnings(
  locals?: App.Locals
): Promise<{ schedule: ScheduleEvent[]; warnings: SheetWarning[] }> {
  const calendarId = getCalendarId(locals);

  // 1. Live Google Calendar if configured and service account credentials present
  if (calendarId && calendarId !== 'DEMO' && hasGoogleServiceAccount(locals)) {
    try {
      const schedule = await cachedFetchJson('schedule', 60, async () => {
        const events = await fetchGoogleCalendarEvents(calendarId, locals);
        const snackClaims = await getSnackClaims(locals);
        mergeSnackClaimsIntoSchedule(events, snackClaims);
        events.sort((a, b) => a.date.localeCompare(b.date));
        return events;
      });
      return { schedule, warnings: [] };
    } catch (err) {
      console.warn('[Google Calendar fetch failed, falling back to Sheet/Demo]', err);
    }
  }

  // 2. Demo mode
  if (isSandboxSheetMode(locals)) {
    const sorted = [...demoStore.schedule].sort((a, b) => a.date.localeCompare(b.date));
    mergeSnackClaimsIntoSchedule(sorted, demoStore.snacks || []);
    return { schedule: sorted, warnings: [] };
  }

  // 3. Fallback to Master Google Sheet Schedule tab
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

    const snackClaims = await getSnackClaims(locals);
    mergeSnackClaimsIntoSchedule(schedule, snackClaims);
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

