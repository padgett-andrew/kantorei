export interface ReferenceRecordingLink {
  url: string;
  label: string;
  embedUrl: string | null;
  videoId: string | null;
  isYouTube: boolean;
}

function parseStartSeconds(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/i.exec(raw);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const sec = m[3] ? Number(m[3]) : 0;
  const total = h * 3600 + min * 60 + sec;
  return total > 0 ? total : null;
}

export function parseYouTubeUrl(rawUrl: string): {
  embedUrl: string | null;
  videoId: string | null;
  isYouTube: boolean;
} {
  try {
    const cleanUrl = rawUrl.replace(/&amp;/g, '&');
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (id && /^[\w-]{11}$/.test(id)) {
        const start = parseStartSeconds(
          parsed.searchParams.get('t') ||
            parsed.searchParams.get('start') ||
            parsed.searchParams.get('time_continue')
        );
        const qs = new URLSearchParams({ rel: '0' });
        if (start) qs.set('start', String(start));
        return {
          videoId: id,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${qs.toString()}`,
          isYouTube: true,
        };
      }
      return { videoId: null, embedUrl: null, isYouTube: true };
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const start = parseStartSeconds(
        parsed.searchParams.get('t') ||
          parsed.searchParams.get('start') ||
          parsed.searchParams.get('time_continue')
      );
      const v = parsed.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) {
        const qs = new URLSearchParams({ rel: '0' });
        if (start) qs.set('start', String(start));
        return {
          videoId: v,
          embedUrl: `https://www.youtube-nocookie.com/embed/${v}?${qs.toString()}`,
          isYouTube: true,
        };
      }

      const pathMatch = /^\/(?:embed|shorts|live)\/([\w-]{11})/.exec(parsed.pathname);
      if (pathMatch) {
        const id = pathMatch[1];
        const qs = new URLSearchParams({ rel: '0' });
        if (start) qs.set('start', String(start));
        return {
          videoId: id,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${qs.toString()}`,
          isYouTube: true,
        };
      }

      const list = parsed.searchParams.get('list');
      if (list) {
        return {
          videoId: null,
          embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`,
          isYouTube: true,
        };
      }

      return { videoId: null, embedUrl: null, isYouTube: true };
    }
  } catch {
    // Ignore malformed URLs
  }

  return { embedUrl: null, videoId: null, isYouTube: false };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  emsp: ' ',
  ensp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  bull: '•',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  agrave: 'à',
  egrave: 'è',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  auml: 'ä',
  euml: 'ë',
  iuml: 'ï',
  ouml: 'ö',
  uuml: 'ü',
  Ouml: 'Ö',
  Uuml: 'Ü',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  ccedil: 'ç',
  iquest: '¿',
  iexcl: '¡',
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, name: string) => NAMED_ENTITIES[name] ?? full);
}

function stripTagsToText(htmlFragment: string): string {
  return decodeHtmlEntities(htmlFragment.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const GENERIC_LINK_LABELS =
  /^(youtube|watch|listen|recording|reference|reference recording|video|audio|link|click here|here|play|open|watch on youtube|listen on youtube|\d+\.?)$/i;

/**
 * Extracts YouTube & audio reference links from sanitized Director's Markings HTML,
 * merging split adjacent Google Docs anchors and inferring the song title from nearby headings or table cells.
 */
export function extractReferenceRecordingsFromHtml(html: string): ReferenceRecordingLink[] {
  const results: ReferenceRecordingLink[] = [];
  const byCanonicalKey = new Map<string, ReferenceRecordingLink>();

  const tokenRegex =
    /<(h1|h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>|<tr\b[^>]*>([\s\S]*?)<\/tr>|<p\b[^>]*>([\s\S]*?)<\/p>|<li\b[^>]*>([\s\S]*?)<\/li>/gi;

  let currentHeading = '';
  let previousShortLine = '';
  let m: RegExpExecArray | null;

  const inspectLinksInFragment = (fragment: string, fallbackContext: string) => {
    // First collect all anchors in this block so split Google Docs formatting (e.g. <a>Gloria, </a><em><a>Missa</a></em>) merges cleanly
    const aRegex = /<a\b[^>]*?\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const blockAnchors = new Map<string, string[]>();
    let aMatch: RegExpExecArray | null;

    while ((aMatch = aRegex.exec(fragment)) !== null) {
      const rawHref = decodeHtmlEntities(aMatch[1]).trim();
      if (!/^https?:/i.test(rawHref)) continue;
      const textPart = stripTagsToText(aMatch[2]);
      const arr = blockAnchors.get(rawHref) ?? [];
      if (textPart) arr.push(textPart);
      blockAnchors.set(rawHref, arr);
    }

    for (const [rawHref, textParts] of blockAnchors.entries()) {
      const yt = parseYouTubeUrl(rawHref);
      const isOtherAudioHost =
        /\b(spotify\.com|soundcloud\.com|music\.apple\.com|bandcamp\.com|vimeo\.com)\b/i.test(
          rawHref
        );

      if (!yt.isYouTube && !isOtherAudioHost) continue;

      // Deduplicate by YouTube videoId (+ start timestamp) or normalized URL
      const dedupeKey = yt.videoId ? `yt:${yt.videoId}:${yt.embedUrl}` : rawHref;
      if (byCanonicalKey.has(dedupeKey)) continue;

      const anchorText = textParts
        .filter((t) => !/^https?:\/\//i.test(t))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const cleanFallback = fallbackContext
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[:\-–—|•]+$/, '')
        .trim();

      const isGenericOrEmpty = !anchorText || GENERIC_LINK_LABELS.test(anchorText);

      let label = anchorText;
      if (isGenericOrEmpty) {
        label = cleanFallback || currentHeading || 'Reference Recording';
      } else if (
        cleanFallback &&
        anchorText.length < 18 &&
        !anchorText.toLowerCase().includes(cleanFallback.toLowerCase().slice(0, 8))
      ) {
        label = `${cleanFallback} — ${anchorText}`;
      }

      const item: ReferenceRecordingLink = {
        url: rawHref,
        label: label.slice(0, 95),
        embedUrl: yt.embedUrl,
        videoId: yt.videoId,
        isYouTube: yt.isYouTube,
      };
      byCanonicalKey.set(dedupeKey, item);
      results.push(item);
    }
  };

  while ((m = tokenRegex.exec(html)) !== null) {
    if (m[1] && m[2] !== undefined) {
      const headingText = stripTagsToText(m[2]).replace(/https?:\/\/\S+/gi, '').trim();
      if (headingText) currentHeading = headingText;
      inspectLinksInFragment(m[2], currentHeading);
    } else if (m[3] !== undefined) {
      const firstCellMatch = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/i.exec(m[3]);
      const rowContext = firstCellMatch ? stripTagsToText(firstCellMatch[1]) : currentHeading;
      inspectLinksInFragment(m[3], rowContext || currentHeading);
    } else {
      const blockHtml = m[4] ?? m[5] ?? '';
      const plainBlock = stripTagsToText(blockHtml)
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/^[\d.)\-–—•\s]+/, '')
        .trim();

      const isSectionBoilerplate =
        /^(total time|closing|opening|interlude|[ivx]+:\s|carol:|final\b)/i.test(plainBlock);

      if (
        !/<a\b/i.test(blockHtml) &&
        /<(strong|b)\b|font-semibold/i.test(blockHtml) &&
        plainBlock.length >= 4 &&
        plainBlock.length <= 85 &&
        !isSectionBoilerplate
      ) {
        currentHeading = plainBlock;
      }

      const beforeLink = stripTagsToText(blockHtml.split(/<a\b/i)[0] || '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[:\-–—|•]+$/, '')
        .trim();
      const context =
        beforeLink && beforeLink.length >= 3 && beforeLink.length <= 75
          ? beforeLink
          : previousShortLine || currentHeading;
      inspectLinksInFragment(blockHtml, context);

      if (plainBlock.length >= 4 && plainBlock.length <= 95 && !isSectionBoilerplate) {
        previousShortLine = plainBlock;
      }
    }
  }

  inspectLinksInFragment(html, currentHeading);
  return results;
}
