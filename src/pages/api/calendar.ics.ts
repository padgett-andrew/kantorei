import type { APIRoute } from 'astro';
import { buildIcsCalendar, verifyCalendarFeedToken } from '../../lib/calendar';
import { getPortalConfig, getSchedule } from '../../lib/google';

export const GET: APIRoute = async ({ url, locals }) => {
  const token = url.searchParams.get('token');
  const hasValidToken = await verifyCalendarFeedToken(token, locals);

  if (!hasValidToken && !locals.singer) {
    return new Response('Unauthorized calendar token.', { status: 401 });
  }

  const [schedule, config] = await Promise.all([
    getSchedule(locals),
    getPortalConfig(locals),
  ]);

  const choirName = config.Choir_Name || 'Kantorei';
  const timeZone = config.Calendar_Timezone || 'America/Chicago';

  const icsBody = buildIcsCalendar({
    events: schedule,
    choirName,
    timeZone,
  });

  return new Response(icsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="kantorei-rehearsals.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
};

