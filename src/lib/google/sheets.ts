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
  type SubscriberRecord,
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
  SubscriberRowSchema,
} from '../schemas';
import { fetchGoogleCalendarEvents } from './calendar';
import { isBlankRow, padRow, readSheetValues } from './client';
import { demoStore, type SnackClaim } from './demo-store';
import { interpolateAllConfig } from '../config-interpolate';
import { processConcertDates, resolveConcertStatus } from '../dates';
import { getTodayIso } from '../utils';
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
        .filter((r) => r[0] && r[1] && (r[2] || r[3]))
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
    const today = getTodayIso('America/Chicago');
    const enriched = demoStore.concerts.map((c) => {
      const { datesDisplay, performances } = processConcertDates(
        c.datesDisplay,
        c.venueName,
        c.venueAddress
      );
      const perfs = performances.length > 0 ? performances : c.performances;
      const status = resolveConcertStatus(
        c.status,
        { datesDisplay: datesDisplay || c.datesDisplay, performances: perfs },
        today
      );
      return {
        ...c,
        datesDisplay: datesDisplay || c.datesDisplay,
        performances: perfs,
        status,
      };
    });
    return { concerts: sortConcertsByDate(enriched), warnings: [] };
  }

  return cachedFetchJson('concerts', 60, async () => {
    const rows = await readSheetValues('Concerts!A2:K', locals);
    const concerts: ConcertEvent[] = [];
    const warnings: SheetWarning[] = [];

    rows.forEach((rawRow, idx) => {
      if (isBlankRow(rawRow)) return;
      const parsed = ConcertRowSchema.safeParse(padRow(rawRow, 11));
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
        media: media.length > 0 ? media : (import.meta.env.DEV ? [...demoStore.media] : []),
        warnings,
      };
    } catch {
      return { media: import.meta.env.DEV ? [...demoStore.media] : [], warnings: [] };
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
    return interpolateAllConfig({
      ...demoStore.config,
      ...(envRepertoireFolder ? { Repertoire_Drive_Folder_ID: envRepertoireFolder } : {}),
    });
  }

  return cachedFetchJson('config', 60, async () => {
    const rows = await readSheetValues('Config!A2:C', locals);
    const map: PortalConfig = {
      Choir_Name: 'Kantorei',
      Conductor_Name: 'Adam Reinwald',
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
      About_History_P1:
        'Founded in 1988 by Dr. Axel Theimer, and now led by Adam Reinwald, Kantorei is one of the premier choral ensembles in Minnesota. With an integral focus on vocal health, Kantorei’s singers have set a standard in Minnesota for rich and effortless choral sound. Kantorei performs a wide range of mostly a cappella music from around the world. Most concerts include signature pieces complementing pieces from both well-known and emerging composers.',
      About_History_P2:
        'Kantorei performs primarily in Minnesota and shares recordings worldwide. Through its outreach programming, Kantorei invites audiences of all ages to share its pursuit of singing for a lifetime.',
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
      Support_Gala_Title: 'Annual Kantorei Gala & Friendraisers',
      Support_Gala_Blurb:
        'Our annual Gala is Kantorei’s signature fundraising celebration—bringing singers, alumni, and patrons together for live music, hospitality, and community support. Follow us on Instagram and Facebook for upcoming Gala dates and sponsorship opportunities.',
      Support_Matching_Title: 'Employer Matching, DAFs & Checks',
      Support_Matching_Blurb:
        'Kantorei welcomes corporate matching gifts (Benevity, CyberGrants, YourCause), Donor-Advised Fund grants, and gifts of appreciated securities. Contact [info@kantorei.net](mailto:info@kantorei.net) or call [612-21-SINGS (612-217-4647)](tel:+16122174647) for our EIN and delivery instructions. Checks may be mailed to 660 23rd Ave NW, Saint Paul, MN 55112.',
      Support_Auditions_Title: 'Audition for Kantorei',
      Support_Auditions_Blurb:
        'Beyond financial contributions, Kantorei is sustained by the dedication and artistry of our singers. We hold auditions in the Spring (usually mid-May) and the Fall (mid-August) to fill out our roster of singers for the coming season, rehearsing at rotating venues across the Twin Cities. Inquiries and submissions are warmly welcomed year-round. Come sing with us!',
      Tax_Exempt_Disclaimer:
        'Kantorei is a registered 501(c)(3) nonprofit arts organization in Minnesota. Contributions are tax-deductible to the fullest extent permitted by law.',
      Newsletter_Category: 'Friends of Kantorei',
      Newsletter_Headline: 'Stay in tune with our season.',
      Newsletter_Description:
        'Receive concert announcements, early-access ticket alerts, and artistic listening guides from conductor Adam Reinwald.',
      Newsletter_Button_Text: 'Join Free',
      Footer_About_Blurb:
        'Founded in 1988 by Axel Theimer and led by Artistic Director Adam Reinwald, Kantorei is one of Minnesota’s premier choral ensembles—sharing rich, effortless a cappella sound and singing for a lifetime.',
      Home_Newsletter_Title: 'Stay in Tune with Friends of Kantorei',
      Home_Newsletter_Description:
        'Join our circle of patrons, alumni, and choral lovers. Get first access to concert tickets, conductor Adam Reinwald’s listening guides, and unreleased choral recordings.',
      Concerts_Newsletter_Title: 'Never Miss a Concert Announcement',
      Concerts_Newsletter_Description:
        'Be the first to hear about upcoming season programs, early-access ticket sales, and guest artist appearances across the Twin Cities.',
      No_Concerts_Title: 'No Upcoming Concerts',
      No_Concerts_Blurb:
        "We don't have any upcoming concerts scheduled at this time. Join our email list below to be notified as soon as new concert dates, programs, and tickets are announced.",
      Home_Spotlight_Type: '',
      Home_Spotlight_Media_ID: '',
      Home_Spotlight_Title: 'Stay in Touch with Kantorei',
      Home_Spotlight_Description:
        "We don't have any upcoming concerts scheduled right now. Join Friends of Kantorei to receive season announcements, recording releases, and priority ticket access.",
    };

    for (const row of rows) {
      const key = (row[0] ?? '').trim();
      const val = (row[1] ?? '').trim();
      if (key && val) {
        map[key] = val;
      }
    }
    return interpolateAllConfig(map);
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
      return { seatingCharts: import.meta.env.DEV ? [...demoStore.seatingCharts] : [], warnings: [] };
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
        board: board.length > 0 ? board : (import.meta.env.DEV ? [...demoStore.board] : []),
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { board: import.meta.env.DEV ? [...demoStore.board] : [], warnings: [] };
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
        leadership: leadership.length > 0 ? leadership : (import.meta.env.DEV ? [...demoStore.leadership] : []),
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { leadership: import.meta.env.DEV ? [...demoStore.leadership] : [], warnings: [] };
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
        givingTiers: givingTiers.length > 0 ? givingTiers : (import.meta.env.DEV ? [...demoStore.givingTiers] : []),
        warnings,
      };
    } catch {
      // Tab may not exist yet in sheet
      return { givingTiers: import.meta.env.DEV ? [...demoStore.givingTiers] : [], warnings: [] };
    }
  });
}

export async function getGivingTiers(locals?: App.Locals): Promise<GivingTier[]> {
  const { givingTiers } = await getGivingTiersWithWarnings(locals);
  return givingTiers;
}

export async function getSubscribersWithWarnings(
  locals?: App.Locals
): Promise<{ subscribers: SubscriberRecord[]; warnings: SheetWarning[] }> {
  if (isSandboxSheetMode(locals)) {
    return { subscribers: [...(demoStore.subscribers || [])], warnings: [] };
  }

  const cacheKey = 'subscribers_with_warnings';
  return cachedFetchJson(cacheKey, 60, async () => {
    try {
      const allRows = await readSheetValues('Subscribers!A1:E', locals);
      const rows = allRows.slice(1);
      const subscribers: SubscriberRecord[] = [];
      const warnings: SheetWarning[] = [];

      rows.forEach((row, idx) => {
        if (isBlankRow(row)) return;
        const padded = padRow(row, 5);
        const parsed = SubscriberRowSchema.safeParse(padded);
        if (parsed.success) {
          subscribers.push(parsed.data);
        } else {
          warnings.push({
            tab: 'Subscribers',
            rowNumber: idx + 2,
            message: parsed.error.issues.map((i) => i.message).join('; '),
          });
        }
      });

      return {
        subscribers: subscribers.length > 0 ? subscribers : (import.meta.env.DEV ? [...demoStore.subscribers] : []),
        warnings,
      };
    } catch {
      return { subscribers: import.meta.env.DEV ? [...demoStore.subscribers] : [], warnings: [] };
    }
  });
}

export async function getSubscribers(locals?: App.Locals): Promise<SubscriberRecord[]> {
  const { subscribers } = await getSubscribersWithWarnings(locals);
  return subscribers;
}

export async function getAllSheetWarnings(locals?: App.Locals): Promise<SheetWarning[]> {
  const [r, s, a, c, m, sc, b, l, gt, sub] = await Promise.all([
    getRosterWithWarnings(locals),
    getScheduleWithWarnings(locals),
    getAbsencesWithWarnings(locals),
    getConcertsWithWarnings(locals),
    getMediaWithWarnings(locals),
    getSeatingChartsWithWarnings(locals),
    getBoardMembersWithWarnings(locals),
    getLeadershipWithWarnings(locals),
    getGivingTiersWithWarnings(locals),
    getSubscribersWithWarnings(locals),
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
    ...sub.warnings,
  ];
}

