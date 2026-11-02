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

    let snack1Name = '';
    let snack2Name = '';
    let snack3Name = '';
    let snack4Name = '';
    let notes = '';

    if (row.length >= 11) {
      // Columns: [id, date, time, type, title, location, s1, s2, s3, s4, notes]
      snack1Name = row[6] || '';
      snack2Name = row[7] || '';
      snack3Name = row[8] || '';
      snack4Name = row[9] || '';
      notes = row[10] || '';
    } else if (row.length === 10) {
      snack1Name = row[6] || '';
      snack2Name = row[7] || '';
      snack3Name = row[8] || '';
      notes = row[9] || '';
    } else {
      // Legacy 9-column format: [id, date, time, type, title, location, s1, s2, notes]
      snack1Name = row[6] || '';
      snack2Name = row[7] || '';
      notes = row[8] || '';
    }

    const type =
      EVENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? 'Rehearsal';

    return {
      eventId,
      date,
      time,
      type,
      title,
      location,
      snack1Name,
      snack2Name,
      snack3Name,
      snack4Name,
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
      status: (() => {
        const norm = (rawStatus || '').trim().toLowerCase();
        if (norm === 'cleared') return 'Cleared';
        if (norm === 'late' || norm === 'tardy') return 'Late';
        return 'Absent';
      })(),
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
