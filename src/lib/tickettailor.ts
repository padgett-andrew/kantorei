import type { ConcertEvent, ConcertPerformance, ConcertStatus } from '../types/choir';
import { cachedFetchJson } from './cache';
import { getEnv } from './env';
import { sanitizeHeroImageUrl } from './utils';

export interface ResolvedTicketTailorEntry {
  label: string;
  widgetUrl: string;
  publicUrl: string;
  isExternal?: boolean;
  isFree?: boolean;
  externalProvider?: string;
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

/**
 * Detects an arts presenter, ticketing platform, or venue organization name from an external URL.
 */
export function detectProviderFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const fullHost = parsed.hostname.toLowerCase();
    // Strip common technical subdomains that don't indicate the actual presenter organization
    const host = fullHost.replace(
      /^(?:www|tickets?|boxoffice|secure|events?|buy|order|store|shop|portal|app|tours?)\./,
      ''
    );

    // 1. Regional Orchestras, Halls & Twin Cities Arts Partners
    if (host.includes('minnesotaorchestra')) return 'Minnesota Orchestra';
    if (host.includes('thespco') || host.includes('spco')) return 'Saint Paul Chamber Orchestra';
    if (host.includes('ordway')) return 'The Ordway';
    if (host.includes('schubert')) return 'The Schubert Club';
    if (host.includes('vocalessence')) return 'VocalEssence';
    if (host.includes('northrop')) return 'Northrop';
    if (host.includes('thecedar') || host.includes('thecedar.org')) return 'The Cedar Cultural Center';
    if (host.includes('fitzgeraldtheater') || host.includes('first-avenue')) return 'The Fitzgerald Theater';
    if (host.includes('dakotacooks') || host.includes('dakotajazz')) return 'The Dakota';
    if (host.includes('walkerart')) return 'Walker Art Center';
    if (host.includes('artsmia')) return 'Minneapolis Institute of Art';
    if (host.includes('choralarts')) return 'Choral Arts';
    if (host.includes('dalewarland')) return 'Dale Warland Singers';
    if (host.includes('lakesareamusic') || host.includes('lamf')) return 'Lakes Area Music Festival';
    if (host.includes('carnegiehall')) return 'Carnegie Hall';
    if (host.includes('kennedy-center')) return 'The Kennedy Center';
    if (host.includes('mpr.org') || host.includes('yourclassical')) return 'Minnesota Public Radio';

    // 2. Twin Cities & Regional Sacred / Cathedral Venues
    if (host.includes('cathedralsaintpaul') || host.includes('cathedral-stpaul')) return 'Cathedral of Saint Paul';
    if (host.includes('mary.org') || host.includes('basilicastmary') || host.includes('basilica')) return 'The Basilica of Saint Mary';
    if (host.includes('cpcstpaul')) return 'Central Presbyterian Church';
    if (host.includes('westminstermpls')) return 'Westminster Presbyterian Church';

    // 3. Choral Associations
    if (host.includes('acda.org') || host.includes('acda-mn')) return 'ACDA';
    if (host.includes('chorusamerica')) return 'Chorus America';

    // 4. Universities & Colleges
    if (host.includes('umn.edu')) return 'University of Minnesota';
    if (host.includes('stthomas.edu')) return 'University of St. Thomas';
    if (host.includes('stolaf.edu')) return 'St. Olaf College';
    if (host.includes('gustavus.edu')) return 'Gustavus Adolphus College';
    if (host.includes('cord.edu') || host.includes('concordiacollege')) return 'Concordia College';
    if (host.includes('csbsju.edu')) return "College of Saint Benedict & Saint John's University";
    if (host.includes('luther.edu')) return 'Luther College';
    if (host.includes('macalester.edu')) return 'Macalester College';
    if (host.includes('augsburg.edu')) return 'Augsburg University';
    if (host.includes('unwsp.edu')) return 'University of Northwestern – St. Paul';

    // 5. Ticketing Platforms
    if (host.includes('ticketmaster') || host.includes('livenation')) return 'Ticketmaster';
    if (host.includes('eventbrite')) return 'Eventbrite';
    if (host.includes('axs.com') || host.includes('axs.')) return 'AXS';
    if (host.includes('etix.com')) return 'Etix';
    if (host.includes('tixr.com')) return 'Tixr';
    if (host.includes('seatgeek')) return 'SeatGeek';
    if (host.includes('ovationtix') || host.includes('audienceview')) return 'AudienceView';
    if (host.includes('brownpapertickets')) return 'Brown Paper Tickets';
    if (host.includes('citywinery')) return 'City Winery';

    // 6. Generic clean fallback for other domains (e.g. crosstown-arts.org -> "Crosstown Arts")
    const baseName = host.split('.')[0] || '';
    if (baseName && baseName !== 'tickets' && baseName !== 'boxoffice') {
      const words = baseName.split(/[-_]+/).filter(Boolean);
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  } catch {
    // ignore
  }
  return '';
}

function isPerformanceTimeLabel(text: string): boolean {
  return /\b(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)|matinee|evening|night|performance|show)\b/i.test(
    text
  );
}

async function resolveSingleTarget(
  rawTarget: string,
  boxOfficeBaseUrl: string
): Promise<{
  widgetUrl: string;
  publicUrl: string;
  isExternal?: boolean;
  isFree?: boolean;
  externalProvider?: string;
} | null> {
  const trimmed = rawTarget.trim();
  if (!trimmed || trimmed === 'DEMO' || trimmed === 'DEMO_SERIES_ID') {
    return null;
  }

  // 0. Free / No tickets / Goodwill admission keywords
  if (
    /^(?:FREE|FREE_ADMISSION|DOOR|AT_DOOR|DONATION|NO_TICKETS|UNRESERVED)$/i.test(
      trimmed
    )
  ) {
    return {
      widgetUrl: '',
      publicUrl: '',
      isFree: true,
    };
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

  // 6. External partner box office (e.g. Minnesota Orchestra, SPCO, Ordway, Schubert Club, Eventbrite, etc.)
  if (/^https?:\/\//i.test(trimmed)) {
    const provider = detectProviderFromUrl(trimmed);
    const isFree = /\b(?:free|rsvp|admission|open-seating)\b/i.test(trimmed);

    return {
      widgetUrl: '',
      publicUrl: trimmed,
      isExternal: true,
      isFree,
      externalProvider: provider || undefined,
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

  // Check for explicit partner/presenter directive (e.g. "Partner: Minnesota Orchestra" or "Presenter: SPCO")
  let explicitGlobalProvider = '';
  const candidateParts: string[] = [];

  for (const part of parts) {
    const directiveMatch =
      /^(?:partner|presenter|host|provider|organization|org):\s*(.+)$/i.exec(part);
    if (directiveMatch) {
      explicitGlobalProvider = directiveMatch[1].trim();
      continue;
    }
    candidateParts.push(part);
  }

  const resolved = await Promise.all(
    candidateParts.map(async (part, idx): Promise<ResolvedTicketTailorEntry | null> => {
      // Support "Label: URL", "[Label] URL", or "(Label) URL"
      const bracketMatch = /^[\[\(](.*?)[\]\)]\s*(https?:\/\/\S+|\d+)$/.exec(part);
      const colonMatch = /^(.*?):\s*(https?:\/\/\S+|\d+)$/.exec(part);
      const matched =
        bracketMatch ||
        (colonMatch && !/^https?$/i.test(colonMatch[1]) ? colonMatch : null);

      const customLabel = matched ? matched[1].trim() : '';
      const targetStr = customLabel && matched ? matched[2] : part;

      const res = await resolveSingleTarget(targetStr, boxOfficeBaseUrl);
      if (!res) return null;

      const isTimeLabel = customLabel ? isPerformanceTimeLabel(customLabel) : false;
      const providerOverride =
        explicitGlobalProvider ||
        (!isTimeLabel && customLabel ? customLabel : '') ||
        res.externalProvider;

      return {
        label:
          (isTimeLabel ? customLabel : '') ||
          defaultLabels[idx] ||
          (customLabel && !explicitGlobalProvider ? customLabel : '') ||
          (res.isFree ? 'Free Admission' : `Performance ${idx + 1}`),
        widgetUrl: res.widgetUrl,
        publicUrl: res.publicUrl,
        isExternal: res.isExternal,
        isFree: res.isFree,
        externalProvider: providerOverride,
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

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function parseConcertDateTimestamp(concert: ConcertEvent): number {
  if (concert.performances && concert.performances.length > 0) {
    for (const perf of concert.performances) {
      if (perf.dateDisplay) {
        const d = new Date(perf.dateDisplay);
        if (!isNaN(d.getTime())) return d.getTime();
      }
    }
  }

  const raw = concert.datesDisplay || '';
  const isoMatch = /\b(202\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.exec(raw);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00Z`);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const monthMatch =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(202\d))?/i.exec(
      raw
    );

  if (monthMatch) {
    const monthKey = monthMatch[1].toLowerCase();
    const month = MONTH_MAP[monthKey] ?? 0;
    const day = parseInt(monthMatch[2], 10);
    const now = new Date();
    const currentYear = now.getFullYear();

    let year = monthMatch[3] ? parseInt(monthMatch[3], 10) : 0;
    if (!year) {
      const currentMonth = now.getMonth();
      if (currentMonth >= 7) {
        year = month >= 7 ? currentYear : currentYear + 1;
      } else {
        year = month >= 7 ? currentYear - 1 : currentYear;
      }
    }

    let hours = 19;
    let minutes = 30;
    const timeMatch = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(raw);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return Number.MAX_SAFE_INTEGER;
}

function extractTicketIdentifiers(c: ConcertEvent): Set<string> {
  const ids = new Set<string>();
  const collect = (str?: string) => {
    if (!str) return;
    const matches = str.match(/\b(?:\d{5,}|ev_\w+)\b/g);
    if (matches) {
      for (const m of matches) ids.add(m);
    }
  };
  collect(c.ttEventSeriesId);
  collect(c.slug);
  if (c.performances) {
    for (const p of c.performances) {
      collect(p.venueAddress);
      collect(p.venueName);
    }
  }
  return ids;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function areSameConcert(a: ConcertEvent, b: ConcertEvent): boolean {
  // 1. Direct Ticket Tailor numeric ID or event ID overlap (e.g. 2507642)
  const aIds = extractTicketIdentifiers(a);
  const bIds = extractTicketIdentifiers(b);
  if (aIds.size > 0 && bIds.size > 0) {
    for (const id of aIds) {
      if (bIds.has(id)) return true;
    }
  }

  // 2. Normalized slug or title match
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const aSlug = norm(a.slug);
  const bSlug = norm(b.slug);
  const aTitle = norm(a.title);
  const bTitle = norm(b.title);

  if (aSlug && (aSlug === bSlug || aSlug === bTitle)) return true;
  if (bSlug && (bSlug === aSlug || bSlug === aTitle)) return true;
  if (aTitle && aTitle === bTitle) return true;

  // 3. Fuzzy title match (e.g. "aventwithkantorei" vs "adventwithkantorei" = distance 1)
  if (aTitle && bTitle) {
    const dist = levenshteinDistance(aTitle, bTitle);
    const maxLen = Math.max(aTitle.length, bTitle.length);
    if (dist <= 2 || (maxLen >= 10 && dist <= 3)) {
      return true;
    }
    // Substring containment (e.g. "voicesacrossborders" contained in longer title)
    if (
      (aTitle.length >= 8 && bTitle.includes(aTitle)) ||
      (bTitle.length >= 8 && aTitle.includes(bTitle))
    ) {
      return true;
    }
  }

  // 4. Same calendar day + shared title keyword
  const aTime = parseConcertDateTimestamp(a);
  const bTime = parseConcertDateTimestamp(b);
  if (
    aTime !== Number.MAX_SAFE_INTEGER &&
    bTime !== Number.MAX_SAFE_INTEGER &&
    Math.abs(aTime - bTime) < 24 * 60 * 60 * 1000
  ) {
    const aWords = a.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    const bWords = b.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    const sharedWord = aWords.some((w) => bWords.includes(w));
    if (sharedWord) return true;
  }

  return false;
}

export function sortConcertsByDate(concerts: ConcertEvent[]): ConcertEvent[] {
  return [...concerts].sort((a, b) => {
    const aTime = parseConcertDateTimestamp(a);
    const bTime = parseConcertDateTimestamp(b);
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.title.localeCompare(b.title);
  });
}

export function mergeAndSortConcerts(
  ttConcerts: ConcertEvent[],
  sheetConcerts: ConcertEvent[]
): ConcertEvent[] {
  const merged: ConcertEvent[] = [];

  // Start with all Ticket Tailor concerts
  for (const tt of ttConcerts) {
    merged.push({ ...tt });
  }

  // Process Google Sheet concerts
  for (const sc of sheetConcerts) {
    const matchIdx = merged.findIndex((existing) => areSameConcert(existing, sc));
    if (matchIdx === -1) {
      // New concert only in sheet (e.g. Free concert, Minnesota Orchestra collaboration)
      merged.push({ ...sc });
    } else {
      // Same concert found! Merge them cleanly:
      // Prefer Google Sheet's curated human titles, descriptions, hero posters, and venues.
      // Prefer Ticket Tailor's live checkout widget URLs and occurrences.
      const existing = merged[matchIdx];
      merged[matchIdx] = {
        slug: sc.slug || existing.slug,
        title: sc.title || existing.title, // Fixes any typo in Ticket Tailor (e.g. "Avent")
        datesDisplay: sc.datesDisplay || existing.datesDisplay,
        venueName: sc.venueName || existing.venueName,
        venueAddress: sc.venueAddress || existing.venueAddress,
        description: sc.description || existing.description,
        heroImageUrl: sc.heroImageUrl || existing.heroImageUrl,
        ttEventSeriesId: existing.ttEventSeriesId || sc.ttEventSeriesId,
        status: existing.status || sc.status,
        performances:
          existing.performances && existing.performances.length > 0
            ? existing.performances
            : sc.performances,
      };
    }
  }

  return sortConcertsByDate(merged);
}


