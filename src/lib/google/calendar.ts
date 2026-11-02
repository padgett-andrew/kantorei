import type { EventType, ScheduleEvent } from '../../types/choir';
import { getGoogleAccessToken } from './client';

export interface GCalEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export function formatGCalTimeRange(
  startDtStr?: string,
  endDtStr?: string,
  timeZone = 'America/Chicago'
): string {
  if (!startDtStr) return 'TBD';
  if (startDtStr.length === 10) return 'All Day';

  try {
    const startDate = new Date(startDtStr);
    const endDate = endDtStr ? new Date(endDtStr) : null;
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
    const startFormatted = timeFormatter.format(startDate);
    if (endDate) {
      const endFormatted = timeFormatter.format(endDate);
      return `${startFormatted} - ${endFormatted}`;
    }
    return startFormatted;
  } catch {
    return '7:00 PM - 9:30 PM';
  }
}

export function inferEventType(title: string, description: string): EventType {
  const combined = `${title} ${description}`.toLowerCase();
  if (combined.includes('concert') || combined.includes('performance')) return 'Concert';
  if (combined.includes('dress')) return 'Dress';
  if (combined.includes('sectional')) return 'Sectional';
  if (combined.includes('retreat')) return 'Retreat';
  return 'Rehearsal';
}

export async function fetchGoogleCalendarEvents(
  calendarId: string,
  locals?: App.Locals
): Promise<ScheduleEvent[]> {
  const token = await getGoogleAccessToken(locals);
  const now = Date.now();
  const timeMin = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { items?: GCalEventItem[] };
  const items = data.items || [];

  return items
    .filter((item) => item.start?.dateTime || item.start?.date)
    .map((item) => {
      const startStr = item.start?.dateTime || item.start?.date || '';
      const endStr = item.end?.dateTime || item.end?.date || '';
      const date = startStr.slice(0, 10);
      const time = formatGCalTimeRange(
        startStr,
        endStr,
        item.start?.timeZone || 'America/Chicago'
      );
      const title = item.summary || 'Ensemble Call';
      const location = item.location || 'Main Sanctuary';
      const notes = item.description || '';
      const type = inferEventType(title, notes);

      return {
        eventId: item.id,
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
}

