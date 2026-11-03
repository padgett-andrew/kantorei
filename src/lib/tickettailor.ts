import type { ConcertEvent, ConcertPerformance, ConcertStatus } from '../types/choir';
import { cachedFetchJson } from './cache';
import { getEnv } from './env';
import { sanitizeHeroImageUrl } from './utils';

export interface ResolvedTicketTailorEntry {
  label: string;
  widgetUrl: string;
  publicUrl: string;
}

const resolvedUrlCache = new Map<string, { widgetUrl: string; expiresAt: number }>();

function decodeBasicHtmlEntities(raw: string): string {
  return raw
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3A;/gi, ':')
    .replace(/&#x3F;/gi, '?')
    .replace(/&#x3D;/gi, '=')
    .replace(/&amp;/gi, '&');
}

function normalizeBoxOfficeSlug(boxOfficeBaseUrl: string): string {
  const trimmed = (boxOfficeBaseUrl || '').trim();
  const shortMatch = /buytickets\.at\/([^/?#]+)/i.exec(trimmed);
  if (shortMatch) return shortMatch[1];
  const eventsMatch = /tickettailor\.com\/(?:events|all-tickets)\/([^/?#]+)/i.exec(trimmed);
  if (eventsMatch && eventsMatch[1] !== 'demo') return eventsMatch[1];
  return '';
}

async function resolveEventPageToWidgetUrl(eventPageUrl: string): Promise<string> {
  const now = Date.now();
  const cached = resolvedUrlCache.get(eventPageUrl);
  if (cached && cached.expiresAt > now) {
    return cached.widgetUrl;
  }

  try {
    const res = await fetch(eventPageUrl, {
      headers: { Accept: 'text/html' },
    });
    if (res.ok) {
      const html = decodeBasicHtmlEntities(await res.text());
      const chkMatch = /(\/checkout\/(?:view-event|new-session)\/id\/\d+\/chk\/[a-zA-Z0-9]+\/?)/i.exec(
        html
      );
      if (chkMatch) {
        const widgetUrl = `https://www.tickettailor.com${chkMatch[1]}?ref=website_widget`;
        resolvedUrlCache.set(eventPageUrl, {
          widgetUrl,
          expiresAt: now + 30 * 60 * 1000, // 30 minutes
        });
        return widgetUrl;
      }
    }
  } catch {
    // Fall back cleanly if offline or unreachable
  }

  return eventPageUrl;
}

async function resolveSingleTarget(
  rawTarget: string,
  boxOfficeBaseUrl: string
): Promise<{ widgetUrl: string; publicUrl: string } | null> {
  const trimmed = rawTarget.trim();
  if (!trimmed || trimmed === 'DEMO' || trimmed === 'DEMO_SERIES_ID') {
    return null;
  }

  // 1. Pasted <script data-url="https://..."> embed snippet
  const dataUrlMatch = /data-url=["'](https:\/\/[^"']+)["']/i.exec(trimmed);
  if (dataUrlMatch) {
    return { widgetUrl: dataUrlMatch[1], publicUrl: dataUrlMatch[1] };
  }

  // 2. Direct /checkout/view-event/... or /all-tickets/... widget URL
  const directMatch =
    /^(https?:\/\/(?:www\.)?tickettailor\.com\/(?:checkout|all-tickets)\/[^\s"']+)/i.exec(
      trimmed
    );
  if (directMatch) {
    const cleanUrl = directMatch[1];
    const withRef = cleanUrl.includes('ref=')
      ? cleanUrl
      : `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}ref=website_widget`;
    return { widgetUrl: withRef, publicUrl: cleanUrl };
  }

  // 3. buytickets.at/<slug>/<eventId> or buytickets.at/<slug>
  const shortMatch = /^https?:\/\/(?:www\.)?buytickets\.at\/([^/?#]+)(?:\/([^/?#]+))?/i.exec(
    trimmed
  );
  if (shortMatch) {
    const [, slug, eventId] = shortMatch;
    if (!eventId) {
      return {
        widgetUrl: `https://www.tickettailor.com/all-tickets/${slug}/?ref=website_widget`,
        publicUrl: `https://buytickets.at/${slug}`,
      };
    }
    const eventPageUrl = `https://www.tickettailor.com/events/${slug}/${eventId}`;
    const widgetUrl = await resolveEventPageToWidgetUrl(eventPageUrl);
    return {
      widgetUrl,
      publicUrl: `https://buytickets.at/${slug}/${eventId}`,
    };
  }

  // 4. tickettailor.com/events/<slug>/<eventId> or tickettailor.com/events/<slug>
  const ttEventsMatch =
    /^https?:\/\/(?:www\.)?tickettailor\.com\/events\/([^/?#]+)(?:\/([^/?#]+))?/i.exec(trimmed);
  if (ttEventsMatch) {
    const [, slug, eventId] = ttEventsMatch;
    if (slug === 'demo') return null;
    if (!eventId) {
      return {
        widgetUrl: `https://www.tickettailor.com/all-tickets/${slug}/?ref=website_widget`,
        publicUrl: `https://www.tickettailor.com/events/${slug}`,
      };
    }
    const eventPageUrl = `https://www.tickettailor.com/events/${slug}/${eventId}`;
    const widgetUrl = await resolveEventPageToWidgetUrl(eventPageUrl);
    return {
      widgetUrl,
      publicUrl: eventPageUrl,
    };
  }

  // 5. Bare numeric Event ID combined with PUBLIC_TICKET_TAILOR_BOX_OFFICE_URL
  const slug = normalizeBoxOfficeSlug(boxOfficeBaseUrl);
  if (slug && /^\d+$/.test(trimmed)) {
    const eventPageUrl = `https://www.tickettailor.com/events/${slug}/${trimmed}`;
    const widgetUrl = await resolveEventPageToWidgetUrl(eventPageUrl);
    return {
      widgetUrl,
      publicUrl: `https://buytickets.at/${slug}/${trimmed}`,
    };
  }

  return null;
}

export async function resolveTicketTailorEntries(
  rawInput: string,
  boxOfficeBaseUrl: string,
  defaultLabels: string[]
): Promise<ResolvedTicketTailorEntry[]> {
  const trimmed = (rawInput || '').trim();
  if (!trimmed || trimmed === 'DEMO' || trimmed === 'DEMO_SERIES_ID') {
    return [];
  }

  // Multiple <script data-url="..."> snippets pasted together
  const scriptMatches = Array.from(trimmed.matchAll(/data-url=["'](https:\/\/[^"']+)["']/gi));
  if (scriptMatches.length > 1) {
    return scriptMatches.map((m, idx) => ({
      label: defaultLabels[idx] || `Performance ${idx + 1}`,
      widgetUrl: m[1],
      publicUrl: m[1],
    }));
  }

  const parts = trimmed.includes('<script')
    ? [trimmed]
    : trimmed
      .split(/\s*(?:\||;|\r?\n)\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

  const resolved = await Promise.all(
    parts.map(async (part, idx): Promise<ResolvedTicketTailorEntry | null> => {
      const labeledMatch = /^(.*?):\s*(https?:\/\/\S+|\d+)$/.exec(part);
      const customLabel =
        labeledMatch && !/^https?$/i.test(labeledMatch[1]) ? labeledMatch[1].trim() : '';
      const targetStr = customLabel && labeledMatch ? labeledMatch[2] : part;

      const res = await resolveSingleTarget(targetStr, boxOfficeBaseUrl);
      if (!res) return null;

      return {
        label: customLabel || defaultLabels[idx] || `Performance ${idx + 1}`,
        widgetUrl: res.widgetUrl,
        publicUrl: res.publicUrl,
      };
    })
  );

  return resolved.filter((r): r is ResolvedTicketTailorEntry => r !== null);
}

interface TicketTailorRawOccurrence {
  id: string;
  start?: { date?: string; time?: string; formatted?: string; iso?: string };
  end?: { date?: string; time?: string; formatted?: string; iso?: string };
  status?: string;
  venue?: { name?: string; postal_address?: string };
  checkout_url?: string;
  url?: string;
}

interface TicketTailorRawEvent {
  id: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'published' | 'closed' | string;
  start?: { date?: string; time?: string; formatted?: string; iso?: string };
  end?: { date?: string; time?: string; formatted?: string; iso?: string };
  venue?: { name?: string; postal_address?: string; country?: string };
  images?: { header?: string; thumbnail?: string };
  checkout_url?: string;
  url?: string;
  hidden?: string | boolean;
  hidden_event?: boolean;
  occurrences?: TicketTailorRawOccurrence[];
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function formatSingleDate(isoString?: string, fallbackDate?: string, fallbackTime?: string): string {
  if (isoString) {
    try {
      const d = new Date(isoString);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/Chicago',
        });
        const timePart = d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Chicago',
        });
        return `${datePart} (${timePart})`;
      }
    } catch {
      // Fallback
    }
  }
  return [fallbackDate, fallbackTime].filter(Boolean).join(' ');
}

function formatPerformanceDate(iso?: string, fallback?: string): string {
  if (iso) {
    try {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Chicago',
        });
        const timePart = d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Chicago',
        });
        return `${datePart} · ${timePart}`;
      }
    } catch {
      // Fallback
    }
  }
  return fallback || '';
}

function parseEventName(name: string): { baseTitle: string; subLabel: string } {
  const trimmed = name.trim();
  const patterns = [
    /^(.*?)\s*[-—–:]\s*(Night\s*\d+|Day\s*\d+|Performance\s*\d+|Saturday|Sunday|Shoreview|Edina|Minneapolis|St\.\s*Paul.*)$/i,
    /^(.*?)\s+((?:Night|Day|Part)\s*\d+)$/i,
    /^(.*?)\s*\((Saturday|Sunday|Shoreview|Edina|Night\s*\d+|Day\s*\d+)\)$/i,
  ];
  for (const p of patterns) {
    const m = p.exec(trimmed);
    if (m && m[1].trim()) {
      return { baseTitle: m[1].trim(), subLabel: m[2].trim() };
    }
  }
  return { baseTitle: trimmed, subLabel: '' };
}

/**
 * Directly fetches live concerts from Ticket Tailor REST API (`/v1/events`).
 * Eliminates redundant double-entry in Google Sheets when TICKET_TAILOR_API_KEY is configured.
 */
export async function fetchTicketTailorEvents(locals?: App.Locals): Promise<ConcertEvent[]> {
  const apiKey = getEnv('TICKET_TAILOR_API_KEY', locals)
    .trim()
    .replace(/^['"]|['"]$/g, '');
  if (!apiKey || apiKey === 'DEMO') {
    return [];
  }

  return cachedFetchJson('tickettailor_events', 180, async () => {
    try {
      const authHeader = 'Basic ' + btoa(apiKey + ':');

      const res = await fetch('https://api.tickettailor.com/v1/events?limit=50', {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`[TicketTailor] Failed to fetch events (HTTP ${res.status}): ${await res.text()}`);
        return [];
      }

      const json = (await res.json()) as { data?: TicketTailorRawEvent[] };
      const rawEvents = (json.data || []).filter(
        (ev) => ev.hidden !== 'true' && ev.hidden !== true && !ev.hidden_event
      );

      // Sort chronologically by start date
      rawEvents.sort((a, b) => {
        const aIso = a.start?.iso || a.start?.date || '';
        const bIso = b.start?.iso || b.start?.date || '';
        return aIso.localeCompare(bIso);
      });

      const nowIso = new Date().toISOString();

      // Group multi-night performances sharing the same base title (e.g. Night 1 & Night 2)
      const programMap = new Map<string, Array<{ ev: TicketTailorRawEvent; subLabel: string }>>();
      for (const ev of rawEvents) {
        const { baseTitle, subLabel } = parseEventName(ev.name);
        if (!programMap.has(baseTitle)) {
          programMap.set(baseTitle, []);
        }
        programMap.get(baseTitle)!.push({ ev, subLabel });
      }

      const concerts: ConcertEvent[] = [];

      for (const [baseTitle, items] of programMap.entries()) {
        const firstEv = items[0].ev;
        const occurrences =
          firstEv.occurrences && firstEv.occurrences.length > 0 ? firstEv.occurrences : [];

        if (items.length > 1) {
          // Combined Program (e.g., Advent with Kantorei Night 1 & Night 2)
          const datesDisplay = items
            .map((it) => formatSingleDate(it.ev.start?.iso, it.ev.start?.date, it.ev.start?.time))
            .filter(Boolean)
            .join(' & ');

          const venueNames = items.map((it) => it.ev.venue?.name?.trim()).filter(Boolean);
          const uniqueVenues = Array.from(new Set(venueNames));
          const venueName = uniqueVenues.join(' · ') || 'Twin Cities Sanctuary';
          const venueAddress = items[0].ev.venue?.postal_address || '';

          const ttEventSeriesId = items
            .map((it) => {
              const dateLabel = formatSingleDate(
                it.ev.start?.iso,
                it.ev.start?.date,
                it.ev.start?.time
              );
              const venueShort = it.ev.venue?.name?.includes('Shoreview')
                ? 'Shoreview'
                : it.ev.venue?.name?.includes('Edina')
                  ? 'Edina'
                  : it.subLabel || '';
              const label = [dateLabel, venueShort ? `(${venueShort})` : '']
                .filter(Boolean)
                .join(' ');
              const targetUrl = it.ev.checkout_url || it.ev.url || it.ev.id;
              return `${label}: ${targetUrl}`;
            })
            .join(' | ');

          const isAnyOnSale = items.some((it) => it.ev.status === 'published');
          const latestIso =
            items[items.length - 1].ev.end?.iso || items[items.length - 1].ev.start?.iso;
          let status: ConcertStatus = 'Upcoming';
          if (isAnyOnSale) {
            status = latestIso && latestIso < nowIso ? 'Past' : 'On_Sale';
          }

          const slug = baseTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          const performances: ConcertPerformance[] = items.map((it) => {
            const dateDisplay = formatPerformanceDate(it.ev.start?.iso, it.ev.start?.formatted);
            const vName = it.ev.venue?.name?.trim() || 'Twin Cities Sanctuary';
            const vAddress = it.ev.venue?.postal_address?.trim() || '';

            let label = it.subLabel || '';
            const vLower = vName.toLowerCase();
            if (vLower.includes('shoreview')) label = 'Shoreview';
            else if (vLower.includes('edina')) label = 'Edina';
            else if (vLower.includes('minneapolis')) label = 'Minneapolis';
            else if (vLower.includes('st. paul') || vLower.includes('saint paul')) label = 'St. Paul';
            else if (!label) {
              const parts = vName.split(/,\s*/);
              label = parts[parts.length - 1] || vName;
            }

            return {
              dateDisplay,
              venueName: vName,
              venueAddress: vAddress,
              label,
            };
          });

          concerts.push({
            slug,
            title: baseTitle,
            datesDisplay,
            venueName,
            venueAddress,
            description: firstEv.description
              ? stripHtml(firstEv.description)
              : 'Join Kantorei for this seasonal concert performance across Twin Cities venues.',
            ttEventSeriesId,
            status,
            heroImageUrl: sanitizeHeroImageUrl(firstEv.images?.header || firstEv.images?.thumbnail),
            performances,
          });
        } else {
          // Single standalone event
          const ev = firstEv;
          let datesDisplay = '';
          if (occurrences.length > 1) {
            datesDisplay = occurrences
              .map((occ) => formatSingleDate(occ.start?.iso, occ.start?.date, occ.start?.time))
              .filter(Boolean)
              .join(' & ');
          } else {
            datesDisplay = formatSingleDate(ev.start?.iso, ev.start?.date, ev.start?.time);
          }

          const venueName =
            ev.venue?.name || occurrences[0]?.venue?.name || 'Twin Cities Sanctuary';
          const venueAddress =
            ev.venue?.postal_address || occurrences[0]?.venue?.postal_address || '';

          const performances: ConcertPerformance[] =
            occurrences.length > 1
              ? occurrences.map((occ, idx) => ({
                dateDisplay: formatPerformanceDate(occ.start?.iso, occ.start?.formatted),
                venueName: occ.venue?.name?.trim() || venueName,
                venueAddress: occ.venue?.postal_address?.trim() || venueAddress,
                label: `Performance ${idx + 1}`,
              }))
              : [
                {
                  dateDisplay: formatPerformanceDate(ev.start?.iso, ev.start?.formatted),
                  venueName,
                  venueAddress,
                },
              ];

          let status: ConcertStatus = 'Upcoming';
          const latestIso =
            occurrences.length > 0
              ? occurrences[occurrences.length - 1]?.end?.iso ||
              occurrences[occurrences.length - 1]?.start?.iso
              : ev.end?.iso || ev.start?.iso;

          if (ev.status === 'published') {
            status = latestIso && latestIso < nowIso ? 'Past' : 'On_Sale';
          } else if (ev.status === 'closed') {
            status = 'Past';
          }

          let ttEventSeriesId = ev.checkout_url || ev.url || ev.id;
          if (occurrences.length > 1 && occurrences.some((o) => o.url || o.checkout_url)) {
            ttEventSeriesId = occurrences
              .map((o) => {
                const label = formatSingleDate(o.start?.iso, o.start?.date, o.start?.time);
                return `${label}: ${o.checkout_url || o.url || ev.checkout_url || ev.url || ev.id}`;
              })
              .join(' | ');
          }

          const slug = (ev.name || ev.id)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          concerts.push({
            slug,
            title: ev.name,
            datesDisplay,
            venueName,
            venueAddress,
            description: ev.description
              ? stripHtml(ev.description)
              : 'Join Kantorei for this seasonal concert performance.',
            ttEventSeriesId,
            status,
            heroImageUrl: sanitizeHeroImageUrl(ev.images?.header || ev.images?.thumbnail),
            performances,
          });
        }
      }

      return concerts;
    } catch (err) {
      console.warn('[TicketTailor] Error in fetchTicketTailorEvents:', err);
      return [];
    }
  });
}


