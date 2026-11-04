const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'hr',
  'br',
  'span',
  'div',
]);

/**
 * Edge-safe, zero-dependency HTML sanitizer tailored for Google Docs HTML exports.
 * Strips <head>, <style>, <script>, <iframe>, event attributes, and unsafe URLs
 * while keeping clean semantic structure for `.handbook-prose`.
 */
export function sanitizeHandbookHtml(rawHtml: string): string {
  // Extract <body> content if full HTML document was exported by Google Docs
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(rawHtml);
  let html = bodyMatch ? bodyMatch[1] : rawHtml;

  // Remove dangerous or noisy container blocks completely including contents
  html = html.replace(
    /<(script|style|iframe|object|embed|form|svg|math|head|meta|link|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  );
  html = html.replace(
    /<(script|style|iframe|object|embed|form|meta|link|input|button)\b[^>]*\/?>/gi,
    ''
  );

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Sanitize remaining tags and attributes
  html = html.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (fullMatch, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    if (fullMatch.startsWith('</')) {
      if (tag === 'br' || tag === 'hr') return '';
      return `</${tag}>`;
    }

    if (tag === 'br' || tag === 'hr') {
      return `<${tag} />`;
    }

    if (tag === 'a') {
      const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs);
      let href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();

      // Unwrap Google Docs redirect links (https://www.google.com/url?q=...)
      try {
        if (href.startsWith('https://www.google.com/url')) {
          const parsed = new URL(href);
          const target = parsed.searchParams.get('q');
          if (target) href = target;
        }
      } catch {
        // Keep original href
      }

      const safeHref = /^(https?:|mailto:|tel:|#|\/)/i.test(href) ? escapeAttr(href) : '#';
      const externalAttrs = /^https?:/i.test(safeHref)
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${safeHref}"${externalAttrs}>`;
    }

    if (tag === 'td' || tag === 'th') {
      const colspanMatch = /\bcolspan\s*=\s*["']?(\d{1,2})["']?/i.exec(rawAttrs);
      const rowspanMatch = /\browspan\s*=\s*["']?(\d{1,2})["']?/i.exec(rawAttrs);
      const attrs = [
        colspanMatch ? ` colspan="${colspanMatch[1]}"` : '',
        rowspanMatch ? ` rowspan="${rowspanMatch[1]}"` : '',
      ].join('');
      return `<${tag}${attrs}>`;
    }

    // Convert Google Docs bold/italic inline spans into semantic tags where helpful, otherwise strip noisy inline styles
    if (tag === 'span') {
      const styleMatch = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const style = (styleMatch?.[1] ?? styleMatch?.[2] ?? '').toLowerCase();
      const isBold = /font-weight\s*:\s*(700|800|900|bold)/.test(style);
      const isItalic = /font-style\s*:\s*italic/.test(style);
      if (isBold && isItalic) return '<span class="font-semibold italic">';
      if (isBold) return '<span class="font-semibold">';
      if (isItalic) return '<span class="italic">';
      return '<span>';
    }

    return `<${tag}>`;
  });

  // Clean up empty paragraphs produced by Google Docs spacer lines
  html = html.replace(/<p>\s*(<span>\s*<\/span>\s*)*<\/p>/gi, '');

  // Auto-linkify bare https:// URLs in text nodes outside existing <a>...</a> anchors
  const anchorSplit = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);
  html = anchorSplit
    .map((segment, idx) => {
      if (idx % 2 === 1) return segment; // Already inside <a>...</a>
      return segment.replace(/(<[^>]+>)|(\bhttps?:\/\/[^\s<")\]']+)/gi, (_m, tag, rawUrl) => {
        if (tag) return tag;
        // Strip trailing punctuation like periods or commas from sentence-ending URLs
        const trailingMatch = /([.,;:!?]+)$/.exec(rawUrl);
        const cleanUrl = trailingMatch ? rawUrl.slice(0, -trailingMatch[1].length) : rawUrl;
        const suffix = trailingMatch ? trailingMatch[1] : '';
        const safe = escapeAttr(cleanUrl);
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>${suffix}`;
      });
    })
    .join('');

  return html.trim();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Decodes basic HTML entities commonly returned in API payloads or Google Docs exports.
 */
export function decodeBasicHtmlEntities(raw: string): string {
  return raw
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x3A;/gi, ':')
    .replace(/&#x3F;/gi, '?')
    .replace(/&#x3D;/gi, '=')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Strips HTML tags and entities, converting <p> and <br> into newlines.
 */
export function stripHtml(html?: string | null): string {
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

