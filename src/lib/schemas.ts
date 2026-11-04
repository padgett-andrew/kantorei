import { z } from 'zod';
import { sanitizeHeroImageUrl } from './utils';
import { processConcertDates } from './dates';
import {
  CONCERT_STATUSES,
  EVENT_TYPES,
  inferSectionGroup,
  MEMBER_ROLES,
  normalizeVoicePart,
  SECTION_GROUPS,
  SEATING_CHART_STATUSES,
  VOICE_PARTS,
  type AbsenceRecord,
  type BoardMember,
  type ConcertEvent,
  type GivingTier,
  type LeadershipMember,
  type ScheduleEvent,
  type SeatingChart,
  type SeatingRow,
  type Singer,
  type SubscriberRecord,
} from '../types/choir';

const trimmedString = z.preprocess((v) => String(v ?? '').trim(), z.string());

export const voicePartSchema = z.preprocess((v) => {
  const norm = normalizeVoicePart(v);
  return norm ?? (typeof v === 'string' ? v.trim().toUpperCase() : v);
}, z.enum(VOICE_PARTS));

export const optionalVoicePartSchema = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const norm = normalizeVoicePart(v);
  return norm ?? (typeof v === 'string' ? v.trim().toUpperCase() : v);
}, z.enum(VOICE_PARTS).optional());

export const SingerRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().email('Invalid email address')).transform((e) => e.toLowerCase()),
    trimmedString.pipe(z.string().min(1, 'Missing singer name')),
    voicePartSchema,
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(([email, name, voicePart, rawSection, rawRole, phone, rawActive]): Singer => {
    const normalizedSection =
      SECTION_GROUPS.find((s) => s.toLowerCase() === rawSection.toLowerCase()) ??
      inferSectionGroup(voicePart);

    const normalizedRole =
      MEMBER_ROLES.find((r) => r.toLowerCase() === rawRole.replace(/\s+/g, '_').toLowerCase()) ??
      'Singer';

    const normalizedStatusToken = rawActive.trim().toLowerCase().replace(/\s+/g, '_');
    const isLeave = [
      'on_leave',
      'leave',
      'asleep',
      'sleep',
      'sleeping',
      'paused',
      'hiatus',
      'skipping',
      'sabbatical',
    ].includes(normalizedStatusToken);
    const isActive = ['true', 'yes', '1', 'y', 'active'].includes(normalizedStatusToken);
    const status = isLeave ? 'On_Leave' : isActive ? 'Active' : 'Inactive';

    return {
      email,
      name,
      voicePart,
      sectionGroup: normalizedSection,
      role: normalizedRole,
      phone,
      active: status === 'Active',
      status,
    };
  });

export const ScheduleRowSchema = z
  .array(trimmedString)
  .refine((arr) => arr.length >= 6, { message: 'Schedule row must have at least 6 columns' })
  .refine((arr) => Boolean(arr[0] && arr[0].trim().length > 0), { message: 'Missing Event_ID' })
  .refine((arr) => /^\d{4}-\d{2}-\d{2}$/.test(arr[1] || ''), {
    message: 'Date must be YYYY-MM-DD',
  })
  .refine((arr) => Boolean(arr[4] && arr[4].trim().length > 0), { message: 'Missing Event Title' })
  .transform((row): ScheduleEvent => {
    const eventId = row[0];
    const date = row[1];
    const time = row[2] || '7:00 PM - 9:30 PM';
    const rawType = row[3] || 'Rehearsal';
    const title = row[4];
    const location = row[5] || 'TBD';
    const notes = row[row.length - 1] || '';

    const type =
      EVENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? 'Rehearsal';

    return {
      eventId,
      date,
      time,
      type,
      title,
      location,
      snack1Name: '',
      snack2Name: '',
      snack3Name: '',
      snack4Name: '',
      notes,
      description: notes,
    };
  });

export const AbsenceRowSchema = z
  .tuple([
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Event_ID')),
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Singer_Name')),
    trimmedString.pipe(z.string().email('Invalid Singer_Email')).transform((e) => e.toLowerCase()),
    voicePartSchema,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(
    ([
      timestamp,
      eventId,
      date,
      singerName,
      singerEmail,
      voicePart,
      reason,
      submittedBy,
      rawStatus,
    ]): AbsenceRecord => ({
      timestamp: timestamp || new Date().toISOString(),
      eventId,
      date,
      singerName,
      singerEmail,
      voicePart,
      reason,
      submittedBy: submittedBy || 'Self',
      status: (() => {
        const norm = (rawStatus || '').trim().toLowerCase();
        if (norm === 'cleared') return 'Cleared';
        if (norm === 'late' || norm === 'tardy') return 'Late';
        return 'Absent';
      })(),
    })
  );

export const ConcertRowSchema = z
  .array(trimmedString)
  .refine((arr) => arr.length >= 7, { message: 'Concert row must have at least 7 columns' })
  .refine((arr) => Boolean(arr[0] && arr[0].trim().length > 0), { message: 'Missing Concert_Slug' })
  .refine((arr) => Boolean(arr[1] && arr[1].trim().length > 0), { message: 'Missing Concert Title' })
  .transform((row): ConcertEvent => {
    const slug = row[0] || '';
    const title = row[1] || '';
    const datesDisplay = row[2] || '';
    const venueName = row[3] || '';
    const venueAddress = row[4] || '';
    const description = row[5] || '';
    const ttEventSeriesId = row[6] || 'DEMO_SERIES_ID';
    const rawStatus = row[7] || '';
    const heroImageUrl = row[8] || '';
    const boxOfficeNote = row[9] || undefined;

    const normalizedStatus =
      CONCERT_STATUSES.find(
        (s) => s.toLowerCase() === rawStatus.replace(/\s+/g, '_').toLowerCase()
      ) ?? 'Upcoming';

    const { datesDisplay: processedDates, performances } = processConcertDates(
      datesDisplay,
      venueName,
      venueAddress
    );

    return {
      slug,
      title,
      datesDisplay: processedDates || datesDisplay,
      venueName,
      venueAddress,
      description,
      ttEventSeriesId: ttEventSeriesId || 'DEMO_SERIES_ID',
      status: normalizedStatus,
      heroImageUrl: sanitizeHeroImageUrl(heroImageUrl),
      performances: performances.length > 0 ? performances : undefined,
      boxOfficeNote: boxOfficeNote ? boxOfficeNote.trim() : undefined,
    };
  });


export const MediaRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Media_ID')),
    trimmedString.pipe(z.string().min(1, 'Missing Media Title')),
    trimmedString,
    trimmedString.pipe(z.string().url('Invalid YouTube_URL')),
    trimmedString,
    trimmedString,
  ])
  .transform(([id, title, subtitle, youtubeUrl, category, description]) => ({
    id,
    title,
    subtitle,
    youtubeUrl,
    category: category || 'Performance Video',
    description: description || undefined,
  }));

export const SeatingSeatSchema = z.object({
  seatIndex: z.number().int().min(0),
  singerEmail: z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.string().trim().email().optional()
  ),
  singerName: z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.string().trim().optional()
  ),
  voicePart: optionalVoicePartSchema,
  isAisle: z.boolean().optional(),
  customLabel: z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.string().trim().optional()
  ),
});

export const SeatingRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  name: z.string().trim().min(1),
  seats: z.array(SeatingSeatSchema),
});

export const SeatingChartRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Chart_ID')),
    trimmedString.pipe(z.string().min(1, 'Missing Season')),
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Title')),
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(
    ([
      id,
      season,
      concertSlug,
      title,
      description,
      rawStatus,
      rawLayoutJson,
      createdAt,
      updatedAt,
    ]): SeatingChart => {
      let rows: SeatingRow[] = [];
      if (rawLayoutJson) {
        try {
          const parsed = JSON.parse(rawLayoutJson);
          if (Array.isArray(parsed)) {
            rows = parsed;
          }
        } catch {
          rows = [];
        }
      }
      const status = rawStatus.toLowerCase() === 'published' ? 'Published' : 'Draft';
      return {
        id,
        season,
        concertSlug: concertSlug || undefined,
        title,
        description: description || undefined,
        status,
        rows,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: updatedAt || new Date().toISOString(),
      };
    }
  );

export const UpsertSeatingChartRequestSchema = z.object({
  id: z.string().trim().optional(),
  season: z.string().trim().min(1, 'Season is required (e.g. 2026–2027)'),
  concertSlug: z.string().trim().optional(),
  concertTitle: z.string().trim().optional(),
  title: z.string().trim().min(1, 'Chart title is required'),
  description: z.string().trim().optional(),
  status: z.enum(SEATING_CHART_STATUSES).default('Draft'),
  rows: z.array(SeatingRowSchema).default([]),
});

export const BoardMemberRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Board Member Name')),
    trimmedString.pipe(z.string().min(1, 'Missing Board Member Role')),
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(([name, role, rawOrder, bioNotes, rawActive]): BoardMember => {
    const order = Number(rawOrder) || 999;
    const normActive = rawActive.trim().toLowerCase();
    const active = normActive === '' || ['true', 'yes', '1', 'y', 'active'].includes(normActive);
    return {
      name,
      role,
      order,
      bioNotes: bioNotes || undefined,
      active,
    };
  });

export const LeadershipRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Leadership Name')),
    trimmedString.pipe(z.string().min(1, 'Missing Leadership Title')),
    trimmedString.pipe(z.string().min(1, 'Missing Leadership Bio')),
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(([name, title, bio, rawOrder, email, imageUrl, rawActive]): LeadershipMember => {
    const order = Number(rawOrder) || 999;
    const normActive = rawActive.trim().toLowerCase();
    const active = normActive === '' || ['true', 'yes', '1', 'y', 'active'].includes(normActive);
    return {
      name,
      title,
      bio,
      order,
      email: email || undefined,
      imageUrl: sanitizeHeroImageUrl(imageUrl),
      active,
    };
  });

export const GivingTierRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Giving Tier Name')),
    trimmedString.pipe(z.string().min(1, 'Missing Giving Tier Amount/Range')),
    trimmedString.pipe(z.string().min(1, 'Missing Giving Tier Description')),
    trimmedString,
    trimmedString,
  ])
  .transform(([name, range, description, rawOrder, rawActive]): GivingTier => {
    const order = Number(rawOrder) || 999;
    const normActive = rawActive.trim().toLowerCase();
    const active = normActive === '' || ['true', 'yes', '1', 'y', 'active'].includes(normActive);
    return {
      name,
      range,
      description,
      order,
      active,
    };
  });

export const SubscriberRowSchema = z
  .tuple([
    trimmedString,
    trimmedString.pipe(z.string().email('Invalid subscriber email')).transform((e) => e.toLowerCase()),
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(([timestamp, email, name, source, rawStatus]): SubscriberRecord => {
    const norm = rawStatus.toLowerCase();
    const status = norm === 'unsubscribed' ? 'Unsubscribed' : 'Active';
    return {
      timestamp: timestamp || new Date().toISOString(),
      email,
      name: name || undefined,
      source: source || 'Website',
      status,
    };
  });

export const SubscribeRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .transform((e) => e.toLowerCase()),
  name: z.string().trim().max(120, 'Name is too long').optional().default(''),
  source: z.string().trim().max(80).optional().default('Website'),
  website_hp: z.string().optional().default(''), // Honeypot field for anti-spam
});


