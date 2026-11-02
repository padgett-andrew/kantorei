import { z } from 'zod';
import {
  CONCERT_STATUSES,
  EVENT_TYPES,
  inferSectionGroup,
  MEMBER_ROLES,
  SECTION_GROUPS,
  VOICE_PARTS,
  type AbsenceRecord,
  type ConcertEvent,
  type ScheduleEvent,
  type Singer,
} from '../types/choir';

const trimmedString = z.preprocess((v) => String(v ?? '').trim(), z.string());

export const SingerRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().email('Invalid email address')).transform((e) => e.toLowerCase()),
    trimmedString.pipe(z.string().min(1, 'Missing singer name')),
    trimmedString.transform((v) => v.toUpperCase()).pipe(z.enum(VOICE_PARTS)),
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

    const active = ['true', 'yes', '1', 'y', 'active'].includes(rawActive.toLowerCase());

    return {
      email,
      name,
      voicePart,
      sectionGroup: normalizedSection,
      role: normalizedRole,
      phone,
      active,
    };
  });

export const ScheduleRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Event_ID')),
    trimmedString.pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
    trimmedString,
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Event Title')),
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(
    ([eventId, date, time, rawType, title, location, snack1Name, snack2Name, notes]): ScheduleEvent => {
      const type =
        EVENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? 'Rehearsal';
      return {
        eventId,
        date,
        time: time || '7:00 PM - 9:30 PM',
        type,
        title,
        location: location || 'TBD',
        snack1Name,
        snack2Name,
        notes,
      };
    }
  );

export const AbsenceRowSchema = z
  .tuple([
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Event_ID')),
    trimmedString,
    trimmedString.pipe(z.string().min(1, 'Missing Singer_Name')),
    trimmedString.pipe(z.string().email('Invalid Singer_Email')).transform((e) => e.toLowerCase()),
    trimmedString.transform((v) => v.toUpperCase()).pipe(z.enum(VOICE_PARTS)),
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
      status: rawStatus.toLowerCase() === 'cleared' ? 'Cleared' : 'Absent',
    })
  );

export const ConcertRowSchema = z
  .tuple([
    trimmedString.pipe(z.string().min(1, 'Missing Concert_Slug')),
    trimmedString.pipe(z.string().min(1, 'Missing Concert Title')),
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
    trimmedString,
  ])
  .transform(
    ([
      slug,
      title,
      datesDisplay,
      venueName,
      venueAddress,
      description,
      ttEventSeriesId,
      rawStatus,
      heroImageUrl,
    ]): ConcertEvent => {
      const normalizedStatus =
        CONCERT_STATUSES.find(
          (s) => s.toLowerCase() === rawStatus.replace(/\s+/g, '_').toLowerCase()
        ) ?? 'Upcoming';

      return {
        slug,
        title,
        datesDisplay,
        venueName,
        venueAddress,
        description,
        ttEventSeriesId: ttEventSeriesId || 'DEMO_SERIES_ID',
        status: normalizedStatus,
        heroImageUrl: heroImageUrl || undefined,
      };
    }
  );


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
