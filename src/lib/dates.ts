import type { ConcertPerformance, ConcertStatus } from '../types/choir';
import { getTodayIso } from './utils';

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export interface ParsedNaturalDate {
  date: Date;
  isoDate: string;
  hasTime: boolean;
  venueHint: string;
  raw: string;
}

/**
 * Parses an individual natural date string into a structured Date object,
 * extracting optional venue hint in parentheses or after hyphen.
 *
 * Supported formats:
 * - "12/19/2026 3:00 PM (Shoreview)"
 * - "12/20/26 3pm - Edina"
 * - "Dec 19, 2026 3pm"
 * - "Saturday, December 19, 3:00 PM"
 * - "2027-03-20 7:30 PM"
 * - "May 14 at 8:00 PM"
 * - "12/19 3pm" (infers choir season year)
 */
export function parseSingleNaturalDate(raw: string): ParsedNaturalDate | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  let venueHint = '';
  let cleaned = trimmed;

  // Extract optional venue/label in parentheses e.g. (Shoreview) or after hyphen/dash e.g. - Shoreview
  const parenMatch = /\(([^)]+)\)$/.exec(cleaned);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    const timeInParen = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(inside);
    if (timeInParen) {
      cleaned = cleaned.replace(/\(([^)]+)\)$/, timeInParen[0]);
      venueHint = inside
        .replace(timeInParen[0], '')
        .replace(/^[\s·—–:-]+|[\s·—–:-]+$/g, '')
        .trim();
    } else {
      venueHint = inside;
      cleaned = cleaned.replace(/\s*\([^)]+\)$/, '').trim();
    }
  } else {
    const dashMatch = /\s+[-—–]\s+([A-Za-z\s,.'-]+)$/.exec(cleaned);
    if (dashMatch) {
      venueHint = dashMatch[1].trim();
      cleaned = cleaned.slice(0, dashMatch.index).trim();
    }
  }

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  const slashMatch = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(cleaned);
  const isoMatch = /\b(202\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.exec(cleaned);
  const textMonthMatch =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(202\d))?/i.exec(
      cleaned
    );

  const now = new Date();
  const currentYear = now.getFullYear();

  if (slashMatch) {
    month = parseInt(slashMatch[1], 10) - 1;
    day = parseInt(slashMatch[2], 10);
    if (slashMatch[3]) {
      year = parseInt(slashMatch[3], 10);
      if (year < 100) year += 2000;
    }
  } else if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else if (textMonthMatch) {
    month = MONTHS[textMonthMatch[1].toLowerCase()];
    day = parseInt(textMonthMatch[2], 10);
    if (textMonthMatch[3]) {
      year = parseInt(textMonthMatch[3], 10);
    }
  }

  if (month !== undefined && day !== undefined) {
    if (!year) {
      // Choral season heuristic:
      // Aug-Dec is fall of current season (current year).
      // Jan-Jul is spring. If current month is Aug-Dec, spring is next year.
      const currentMonth = now.getMonth();
      if (currentMonth >= 7) {
        year = month >= 7 ? currentYear : currentYear + 1;
      } else {
        year = month >= 7 ? currentYear - 1 : currentYear;
      }
    }

    let hours = 19;
    let minutes = 30;
    let hasTime = false;

    const tMatch =
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(cleaned) ||
      /(?:at\s+)?(\d{1,2}):(\d{2})/i.exec(cleaned);

    if (tMatch) {
      hasTime = true;
      let h = parseInt(tMatch[1], 10);
      const m = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      const ampm = tMatch[3] ? tMatch[3].toLowerCase() : '';
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) {
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { date: d, isoDate, hasTime, venueHint, raw: trimmed };
    }
  }

  return null;
}

/**
 * Splits a raw date cell value into individual performance segments.
 * Supports:
 * - Newlines (Option+Enter in Google Sheets)
 * - Pipe delimiters "|"
 * - Semicolons ";"
 * - Ampersands " & "
 */
export function splitDateSegments(raw: string): string[] {
  const trimmed = (raw || '').trim();
  if (!trimmed) return [];

  if (trimmed.includes('\n')) {
    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (trimmed.includes('|')) {
    return trimmed
      .split(/\s*\|\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (trimmed.includes(';')) {
    return trimmed
      .split(/\s*;\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (trimmed.includes(' & ')) {
    return trimmed
      .split(/\s+&\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

/**
 * Transforms raw natural date inputs from Google Sheets into:
 * 1. A clean, editorial `datesDisplay` headline string (e.g. "Sat, Dec 19 (3:00 PM · Shoreview) & Sun, Dec 20 (3:00 PM · Edina)")
 * 2. A structured array of `performances` with individual venue names, times, and map labels.
 */
export function processConcertDates(
  rawDates: string,
  defaultVenueName = '',
  defaultVenueAddress = ''
): { datesDisplay: string; performances: ConcertPerformance[] } {
  const trimmed = (rawDates || '').trim();
  if (!trimmed) return { datesDisplay: '', performances: [] };

  const segments = splitDateSegments(trimmed);
  const parsed = segments.map((s) => parseSingleNaturalDate(s)).filter(Boolean) as ParsedNaturalDate[];

  // Fallback if none parsed as dates
  if (parsed.length === 0) {
    return { datesDisplay: trimmed, performances: [] };
  }

  // Split venue name if multi-venue (e.g. "Shoreview Church · Edina Church")
  const venueParts = defaultVenueName
    .split(/\s*(?:·|\/|\r?\n)\s*/)
    .map((v) => v.trim())
    .filter(Boolean);

  const addressParts = defaultVenueAddress
    .split(/\s*(?:·|\/|\r?\n)\s*/)
    .map((a) => a.trim())
    .filter(Boolean);

  const performances: ConcertPerformance[] = parsed.map((item, idx) => {
    const d = item.date;
    const weekdayLong = d.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'America/Chicago',
    });
    const monthLong = d.toLocaleDateString('en-US', {
      month: 'long',
      timeZone: 'America/Chicago',
    });
    const day = d.getDate();
    const timeFormatted = item.hasTime
      ? d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Chicago',
        })
      : '';

    let assignedVenue = defaultVenueName;
    let assignedAddress = defaultVenueAddress;
    let label = item.venueHint || '';

    if (venueParts.length > 1) {
      if (item.venueHint) {
        const found = venueParts.find((v) =>
          v.toLowerCase().includes(item.venueHint.toLowerCase())
        );
        if (found) assignedVenue = found;
        else if (venueParts[idx]) assignedVenue = venueParts[idx];
      } else if (venueParts[idx]) {
        assignedVenue = venueParts[idx];
      }
    }

    if (addressParts.length > 1) {
      if (item.venueHint) {
        const found = addressParts.find((a) =>
          a.toLowerCase().includes(item.venueHint.toLowerCase())
        );
        if (found) assignedAddress = found;
        else if (addressParts[idx]) assignedAddress = addressParts[idx];
      } else if (addressParts[idx]) {
        assignedAddress = addressParts[idx];
      }
    } else if (/&|\band\b/i.test(defaultVenueAddress)) {
      const cityMatch =
        /\b(Shoreview|Edina|Minneapolis|St\.?\s*Paul|Saint\s*Paul|Roseville|Bloomington|Minnetonka|Plymouth|Wayzata|Stillwater)\b/i.exec(
          assignedVenue
        );
      if (cityMatch) {
        assignedAddress = `${cityMatch[1]}, MN`;
      }
    }

    if (!label) {
      const vLower = assignedVenue.toLowerCase();
      if (vLower.includes('shoreview')) label = 'Shoreview';
      else if (vLower.includes('edina')) label = 'Edina';
      else if (vLower.includes('minneapolis')) label = 'Minneapolis';
      else if (vLower.includes('st. paul') || vLower.includes('saint paul')) label = 'St. Paul';
      else if (venueParts.length > 1 && venueParts[idx]) {
        label = `Venue ${idx + 1}`;
      }
    }

    const dateDisplay = timeFormatted
      ? `${weekdayLong}, ${monthLong} ${day} · ${timeFormatted}`
      : `${weekdayLong}, ${monthLong} ${day}`;

    return {
      dateDisplay,
      venueName: assignedVenue,
      venueAddress: assignedAddress,
      label: label || undefined,
      isoDate: item.isoDate,
    };
  });

  // Check if original string was already an editorial formatted string (e.g. "Sat, December 19, 3:00 PM...")
  const looksAlreadyFormatted =
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(trimmed) && !trimmed.includes('\n');

  let datesDisplay = trimmed;

  if (!looksAlreadyFormatted) {
    const formattedItems = parsed.map((item) => {
      const d = item.date;
      const weekdayShort = d.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'America/Chicago',
      });
      const monthShort = d.toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'America/Chicago',
      });
      const day = d.getDate();
      const timeFormatted = item.hasTime
        ? d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Chicago',
          })
        : '';

      let timeLabel = timeFormatted;
      if (item.venueHint) {
        timeLabel = timeFormatted ? `${timeFormatted} · ${item.venueHint}` : item.venueHint;
      }

      return timeLabel
        ? `${weekdayShort}, ${monthShort} ${day} (${timeLabel})`
        : `${weekdayShort}, ${monthShort} ${day}`;
    });

    datesDisplay = formattedItems.join(' & ');
  }

  return { datesDisplay, performances };
}

/**
 * Extracts a normalized YYYY-MM-DD date string from an ISO timestamp,
 * YYYY-MM-DD string, or natural date expression.
 * Does not include time.
 */
export function extractDateOnly(
  dateOrIso?: string | null,
  timeZone = 'America/Chicago'
): string | null {
  if (!dateOrIso) return null;
  const trimmed = dateOrIso.trim();
  if (!trimmed) return null;

  // 1. Direct YYYY-MM-DD format
  const directMatch = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(trimmed);
  if (directMatch) return trimmed;

  // 2. ISO timestamp with or without time (e.g. "2026-12-19T19:30:00Z", "2026-12-19T19:30:00-06:00")
  if (trimmed.includes('T')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
      }
    } catch {
      // Fallback regex
      const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
      if (match) return match[1];
    }
  }

  // 3. Try parsing natural date
  const parsed = parseSingleNaturalDate(trimmed);
  if (parsed?.isoDate) {
    return parsed.isoDate;
  }

  // 4. Fallback search for YYYY-MM-DD substring
  const subMatch = /\b(202\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.exec(trimmed);
  if (subMatch) return subMatch[0];

  return null;
}

/**
 * Computes the latest performance date (YYYY-MM-DD) for a concert across all performances
 * and natural date strings.
 */
export function getConcertLatestDate(
  concert: { datesDisplay?: string; performances?: ConcertPerformance[] },
  timeZone = 'America/Chicago'
): string | null {
  const dates: string[] = [];

  // Check structured performances first
  if (concert.performances && concert.performances.length > 0) {
    for (const p of concert.performances) {
      if (p.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(p.isoDate)) {
        dates.push(p.isoDate);
      } else if (p.dateDisplay) {
        const d = extractDateOnly(p.dateDisplay, timeZone);
        if (d) dates.push(d);
      }
    }
  }

  // Check datesDisplay
  if (concert.datesDisplay) {
    const segments = splitDateSegments(concert.datesDisplay);
    for (const seg of segments) {
      const d = extractDateOnly(seg, timeZone);
      if (d) dates.push(d);
    }
    const isoMatches = concert.datesDisplay.matchAll(
      /\b(202\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g
    );
    for (const m of isoMatches) {
      dates.push(m[0]);
    }
  }

  if (dates.length === 0) return null;

  dates.sort();
  return dates[dates.length - 1];
}

/**
 * Determines whether all performance dates for a concert have strictly passed today's calendar date.
 * Does NOT include time so patrons buying tickets on the day of the concert (even after start time)
 * can still view and purchase tickets.
 */
export function isConcertPastByDate(
  concert: { datesDisplay?: string; performances?: ConcertPerformance[] },
  todayIso?: string,
  timeZone = 'America/Chicago'
): boolean {
  const today = todayIso || getTodayIso(timeZone);
  const latestDate = getConcertLatestDate(concert, timeZone);
  if (!latestDate) return false;
  // Strictly before today's calendar date (ignoring time)
  return latestDate < today;
}

/**
 * Resolves the final concert status based on administrative preference, published state,
 * and automatic date-based expiration.
 *
 * Rules:
 * 1. "Draft" / "Unpublished" states are ALWAYS preserved so admins can create and edit
 *    half-finished concerts without them showing publicly.
 * 2. Any published concert ("Upcoming" or "On_Sale") whose calendar date has passed
 *    automatically becomes "Past".
 * 3. Same-day concerts (today) remain active/on sale regardless of start time.
 */
export function resolveConcertStatus(
  rawStatus: string | undefined | null,
  concert: { datesDisplay?: string; performances?: ConcertPerformance[] },
  todayIso?: string,
  timeZone = 'America/Chicago'
): ConcertStatus {
  const normalized = (rawStatus || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  // 1. Blank status or explicit Draft/Unpublished state is treated as Draft so admins can create new concerts privately
  if (!normalized) {
    return 'Draft';
  }

  const isDraft = [
    'draft',
    'unpublished',
    'unpub',
    'private',
    'hidden',
    'wip',
    'editing',
    'review',
    'not_published',
  ].includes(normalized);
  if (isDraft) {
    return 'Draft';
  }

  // 2. Explicit past / archived status from editor
  const isExplicitPast = ['past', 'archived', 'archive', 'closed', 'completed', 'done'].includes(
    normalized
  );
  if (isExplicitPast) {
    return 'Past';
  }

  // 3. Automatically mark past if the concert date has passed (strictly before today, ignoring time)
  if (isConcertPastByDate(concert, todayIso, timeZone)) {
    return 'Past';
  }

  // 4. On sale
  const isOnSale = [
    'on_sale',
    'onsale',
    'active',
    'selling',
    'tickets_available',
    'available',
  ].includes(normalized);
  if (isOnSale) {
    return 'On_Sale';
  }

  // 5. Default published status is Upcoming
  return 'Upcoming';
}

