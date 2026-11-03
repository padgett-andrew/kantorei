import {
  formatSnackEntry,
  type AbsenceRecord,
  type BoardMember,
  type ConcertEvent,
  type GivingTier,
  type LeadershipMember,
  type MediaItem,
  type PortalConfig,
  type ScheduleEvent,
  type SeatingChart,
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
  BoardMemberRowSchema,
  ConcertRowSchema,
  GivingTierRowSchema,
  LeadershipRowSchema,
  MediaRowSchema,
  ScheduleRowSchema,
  SeatingChartRowSchema,
  SingerRowSchema,
} from '../schemas';
import { fetchGoogleCalendarEvents } from './calendar';
import { isBlankRow, padRow, readSheetValues } from './client';
import { demoStore, type SnackClaim } from './demo-store';
import { processConcertDates } from '../dates';
import {
  fetchTicketTailorEvents,
  mergeAndSortConcerts,
  sortConcertsByDate,
} from '../tickettailor';
import { fetchYouTubeChannelMedia } from '../media';

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
    // If Snacks tab is empty or not yet initialized
  }

  return [];
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
    const enriched = demoStore.concerts.map((c) => {
      if (!c.performances || c.performances.length === 0) {
        const { datesDisplay, performances } = processConcertDates(
          c.datesDisplay,
          c.venueName,
          c.venueAddress
        );
        return {
          ...c,
          datesDisplay: datesDisplay || c.datesDisplay,
          performances: performances.length > 0 ? performances : undefined,
        };
      }
      return c;
    });
    return { concerts: sortConcertsByDate(enriched), warnings: [] };
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

    return { concerts: sortConcertsByDate(concerts), warnings };
  });
}

export async function getConcerts(locals?: App.Locals): Promise<ConcertEvent[]> {
  let ttConcerts: ConcertEvent[] = [];
  try {
    ttConcerts = await fetchTicketTailorEvents(locals);
  } catch (err) {
    console.warn('[Concerts] Error checking Ticket Tailor API, falling back to sheet:', err);
  }

  const { concerts: sheetConcerts } = await getConcertsWithWarnings(locals);
  return mergeAndSortConcerts(ttConcerts, sheetConcerts);
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
  try {
    const ytMedia = await fetchYouTubeChannelMedia(locals);
    if (ytMedia.length > 0) {
      return ytMedia;
    }
  } catch (err) {
    console.warn('[Media] Error fetching live YouTube media, falling back to sheet:', err);
  }

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
      Contact_Email: 'info@kantorei.net',
      Contact_Phone: '612-21-SINGS (612-217-4647)',
      Contact_Address: '660 23rd Ave NW, Saint Paul, MN 55112',
      Mission_Statement:
        'Expanding the worldview of artists and audiences through passionate and crafted artistic performances, partnerships, and projects.',
      Vision_Statement:
        'Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
      Hero_Tagline: 'Sing, Laugh, Cry. Be Real…Together.',
      Hero_Subtitle:
        'Kantorei is an a cappella chamber choir based in the Minnesota Twin Cities. Fascinatingly remarkable artistic expression, inviting deep meaning and belonging.',
      About_Header_Title:
        'Vocal health, effortless sound, and singing for a lifetime.',
      Auditions_Blurb:
        'We welcome inquiries from experienced Twin Cities choral singers across all voice parts (SATB · general sections and split parts) who share our commitment to vocal health, independent preparation, and expressive a cappella ensemble singing.',
      Auditions_Timing_Note:
        'We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out a roster of singers for the coming season. Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
      Auditions_Rehearsal_Cadence:
        'Kantorei rehearses Sunday evenings at rotating venues across the Twin Cities metro area (typically 6–8 rehearsals per concert cycle), beginning each season with a community retreat.',
      Auditions_Process_Note:
        'Auditions are heard by Artistic Director Adam Reinwald and section leaders, and consist of singing a prepared selection a cappella, some basic musicianship checks, and a brief interview.',
      Auditions_Form_URL: '',
      Support_Hero_Title:
        'Sustain choral artistry and lifelong singing in Minnesota.',
      Support_Hero_Subtitle:
        'Every contribution to Kantorei funds performances, composer commissions, recordings shared worldwide, Friends of Kantorei community programming, and keeps ensemble membership free of mandatory singer dues.',
      Support_Gala_Blurb:
        'Our annual Gala is Kantorei’s signature fundraising celebration—bringing singers, alumni, and patrons together for live music, hospitality, and community support. Follow us on Instagram and Facebook for upcoming Gala dates and sponsorship opportunities.',
      Tax_Exempt_Disclaimer:
        'Kantorei is a registered 501(c)(3) nonprofit arts organization in Minnesota. Contributions are tax-deductible to the fullest extent permitted by law.',
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

export async function getSeatingChartsWithWarnings(
  locals?: App.Locals
): Promise<{ seatingCharts: SeatingChart[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { seatingCharts: [...demoStore.seatingCharts], warnings: [] };
  }

  return cachedFetchJson('seating_charts', 60, async () => {
    try {
      const rows = await readSheetValues('Seating_Charts!A2:I', locals);
      const seatingCharts: SeatingChart[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((rawRow, idx) => {
        if (isBlankRow(rawRow)) return;
        const parsed = SeatingChartRowSchema.safeParse(padRow(rawRow, 9));
        if (parsed.success) {
          seatingCharts.push(parsed.data);
        } else {
          warnings.push({
            tab: 'Seating_Charts',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      return { seatingCharts, warnings };
    } catch {
      // Tab may not exist yet in sheet
      return { seatingCharts: [...demoStore.seatingCharts], warnings: [] };
    }
  });
}

export async function getSeatingCharts(locals?: App.Locals): Promise<SeatingChart[]> {
  const { seatingCharts } = await getSeatingChartsWithWarnings(locals);
  return seatingCharts;
}

export async function getBoardMembersWithWarnings(
  locals?: App.Locals
): Promise<{ board: BoardMember[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { board: [...demoStore.board], warnings: [] };
  }

  return cachedFetchJson('board', 60, async () => {
    try {
      const rows = await readSheetValues('Board!A2:E', locals);
      const board: BoardMember[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((rawRow, idx) => {
        if (isBlankRow(rawRow)) return;
        const parsed = BoardMemberRowSchema.safeParse(padRow(rawRow, 5));
        if (parsed.success) {
          if (parsed.data.active) {
            board.push(parsed.data);
          }
        } else {
          warnings.push({
            tab: 'Board',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      board.sort((a, b) => a.order - b.order);
      return {
        board: board.length > 0 ? board : [...demoStore.board],
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { board: [...demoStore.board], warnings: [] };
    }
  });
}

export async function getBoardMembers(locals?: App.Locals): Promise<BoardMember[]> {
  const { board } = await getBoardMembersWithWarnings(locals);
  return board;
}

export async function getLeadershipWithWarnings(
  locals?: App.Locals
): Promise<{ leadership: LeadershipMember[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { leadership: [...demoStore.leadership], warnings: [] };
  }

  return cachedFetchJson('leadership', 60, async () => {
    try {
      const rows = await readSheetValues('Leadership!A2:G', locals);
      const leadership: LeadershipMember[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((rawRow, idx) => {
        if (isBlankRow(rawRow)) return;
        const parsed = LeadershipRowSchema.safeParse(padRow(rawRow, 7));
        if (parsed.success) {
          if (parsed.data.active) {
            leadership.push(parsed.data);
          }
        } else {
          warnings.push({
            tab: 'Leadership',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      leadership.sort((a, b) => a.order - b.order);
      return {
        leadership: leadership.length > 0 ? leadership : [...demoStore.leadership],
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { leadership: [...demoStore.leadership], warnings: [] };
    }
  });
}

export async function getLeadership(locals?: App.Locals): Promise<LeadershipMember[]> {
  const { leadership } = await getLeadershipWithWarnings(locals);
  return leadership;
}

export async function getGivingTiersWithWarnings(
  locals?: App.Locals
): Promise<{ givingTiers: GivingTier[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { givingTiers: [...demoStore.givingTiers], warnings: [] };
  }

  return cachedFetchJson('giving_tiers', 60, async () => {
    try {
      const rows = await readSheetValues('Giving_Tiers!A2:E', locals);
      const givingTiers: GivingTier[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((rawRow, idx) => {
        if (isBlankRow(rawRow)) return;
        const parsed = GivingTierRowSchema.safeParse(padRow(rawRow, 5));
        if (parsed.success) {
          if (parsed.data.active) {
            givingTiers.push(parsed.data);
          }
        } else {
          warnings.push({
            tab: 'Giving_Tiers',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      givingTiers.sort((a, b) => a.order - b.order);
      return {
        givingTiers: givingTiers.length > 0 ? givingTiers : [...demoStore.givingTiers],
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { givingTiers: [...demoStore.givingTiers], warnings: [] };
    }
  });
}

export async function getGivingTiers(locals?: App.Locals): Promise<GivingTier[]> {
  const { givingTiers } = await getGivingTiersWithWarnings(locals);
  return givingTiers;
}

export async function getAllSheetWarnings(locals?: App.Locals): Promise<SheetWarning[]> {
  const [r, s, a, c, m, sc, b, l, gt] = await Promise.all([
    getRosterWithWarnings(locals),
    getScheduleWithWarnings(locals),
    getAbsencesWithWarnings(locals),
    getConcertsWithWarnings(locals),
    getMediaWithWarnings(locals),
    getSeatingChartsWithWarnings(locals),
    getBoardMembersWithWarnings(locals),
    getLeadershipWithWarnings(locals),
    getGivingTiersWithWarnings(locals),
  ]);
  return [
    ...r.warnings,
    ...s.warnings,
    ...a.warnings,
    ...c.warnings,
    ...m.warnings,
    ...sc.warnings,
    ...b.warnings,
    ...l.warnings,
    ...gt.warnings,
  ];
}

