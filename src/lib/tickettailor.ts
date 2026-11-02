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
  if (/tickettailor\.com\/(?:checkout|all-tickets)\//i.test(trimmed)) {
    return { widgetUrl: trimmed, publicUrl: trimmed };
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
        .split(/\s*(?:\||;|\r?\n|,)\s*/)
        .map((p) => p.trim())
        .filter(Boolean);

  const resolved = await Promise.all(
    parts.map(async (part, idx): Promise<ResolvedTicketTailorEntry | null> => {
      const labeledMatch = /^([^:]+):\s*(https?:\/\/.+|\d+)$/.exec(part);
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

