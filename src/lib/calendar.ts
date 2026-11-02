import type { ScheduleEvent } from '../types/choir';
import { getEnv } from './env';

async function computeHmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export async function getCalendarFeedToken(locals?: App.Locals): Promise<string> {
  const secret = getEnv('AUTH_SECRET', locals) || 'kantorei-fallback-dev-secret';
  return computeHmacHex(secret, 'kantorei-ics-calendar-v1');
}

export async function verifyCalendarFeedToken(
  providedToken: string | null,
  locals?: App.Locals
): Promise<boolean> {
  if (!providedToken) return false;
  const expected = await getCalendarFeedToken(locals);
  if (providedToken.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= providedToken.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function parseClockTime(part: string): { hours: number; minutes: number } | null {
  const match = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(part.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function formatIcsLocalDateTime(isoDate: string, hours: number, minutes: number): string {
  const compactDate = isoDate.replace(/-/g, '');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${compactDate}T${hh}${mm}00`;
}

function addDaysCompact(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10).replace(/-/g, '');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcsCalendar(params: {
  events: ScheduleEvent[];
  choirName: string;
  timeZone: string;
}): string {
  const { events, choirName, timeZone } = params;
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeIcsText(choirName)}//Singer Portal Schedule//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(choirName)} Rehearsals & Concerts`,
    `X-WR-TIMEZONE:${escapeIcsText(timeZone)}`,
  ];

  for (const ev of events) {
    const rangeParts = ev.time.split(/\s*[-–—]\s*/);
    const startClock = rangeParts[0] ? parseClockTime(rangeParts[0]) : null;
    const endClock = rangeParts[1] ? parseClockTime(rangeParts[1]) : null;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.eventId}@kantorei-portal`);
    lines.push(`DTSTAMP:${dtStamp}`);

    if (startClock) {
      const computedEnd = endClock ?? {
        hours: Math.min(startClock.hours + 2, 23),
        minutes: startClock.minutes,
      };
      lines.push(
        `DTSTART;TZID=${timeZone}:${formatIcsLocalDateTime(
          ev.date,
          startClock.hours,
          startClock.minutes
        )}`
      );
      lines.push(
        `DTEND;TZID=${timeZone}:${formatIcsLocalDateTime(
          ev.date,
          computedEnd.hours,
          computedEnd.minutes
        )}`
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ev.date.replace(/-/g, '')}`);
      lines.push(`DTEND;VALUE=DATE:${addDaysCompact(ev.date, 1)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(`[${choirName}] ${ev.title} (${ev.type})`)}`);
    lines.push(`LOCATION:${escapeIcsText(ev.location)}`);

    const details = [
      `Time: ${ev.time}`,
      ev.notes ? `Notes: ${ev.notes}` : '',
      ev.snack1Name || ev.snack2Name || ev.snack3Name || ev.snack4Name
        ? `Hospitality / Snacks: ${[ev.snack1Name, ev.snack2Name, ev.snack3Name, ev.snack4Name].filter(Boolean).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(`DESCRIPTION:${escapeIcsText(details)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

