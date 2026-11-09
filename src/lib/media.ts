import type { MediaItem } from '../types/choir';
import { cachedFetchJson } from './cache';
import { getEnv } from './env';
import { getPortalConfig } from './google/sheets';

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Resolves a YouTube channel ID from either an explicit ID, an environment variable,
 * or by fetching the @handle page to find the canonical channel ID.
 */
async function resolveYouTubeChannelId(handleUrl: string, locals?: App.Locals): Promise<string | null> {
  const envChannelId = getEnv('YOUTUBE_CHANNEL_ID', locals).trim();
  if (envChannelId && /^UC[\w-]{22}$/.test(envChannelId)) {
    return envChannelId;
  }

  try {
    const res = await fetch(handleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'text/html',
      },
    });
    if (res.ok) {
      const html = await res.text();
      // Match 1: <meta itemprop="identifier" content="UC...">
      const metaMatch = /itemprop=["']identifier["']\s+content=["'](UC[\w-]{22})["']/i.exec(html);
      if (metaMatch) return metaMatch[1];

      // Match 2: <link rel="canonical" href="https://www.youtube.com/channel/UC...">
      const linkMatch = /channel\/(UC[\w-]{22})/i.exec(html);
      if (linkMatch) return linkMatch[1];

      // Match 3: "browseId":"UC..."
      const browseMatch = /["']browseId["']\s*:\s*["'](UC[\w-]{22})["']/i.exec(html);
      if (browseMatch) return browseMatch[1];
    }
  } catch {
    // Return null on offline or network failure
  }

  return null;
}

/**
 * Fetches the latest published videos from Kantorei's public YouTube RSS feed.
 * No API key required; zero quota cost; cached with Cloudflare Cache API.
 */
export async function fetchYouTubeChannelMedia(
  locals?: App.Locals
): Promise<MediaItem[]> {
  return cachedFetchJson('youtube_media', 300, async () => {
    try {
      const config = await getPortalConfig(locals);
      const youtubeUrl = config.YouTube_URL || 'https://www.youtube.com/@kantoreiMN';

      const channelId = await resolveYouTubeChannelId(youtubeUrl, locals);
      if (!channelId) {
        return [];
      }

      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const res = await fetch(feedUrl, {
        headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
      });

      if (!res.ok) {
        return [];
      }

      const xml = await res.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      const mediaItems: MediaItem[] = [];

      for (const entry of entries) {
        const idMatch = /<yt:videoId>([^<]+)<\/yt:videoId>/i.exec(entry);
        const titleMatch = /<title>([^<]+)<\/title>/i.exec(entry);
        const publishedMatch = /<published>([^<]+)<\/published>/i.exec(entry);
        const descMatch = /<media:description>([\s\S]*?)<\/media:description>/i.exec(entry);

        if (!idMatch || !titleMatch) continue;

        const videoId = idMatch[1].trim();
        const rawTitle = decodeXmlEntities(titleMatch[1]);
        const rawDesc = descMatch ? decodeXmlEntities(descMatch[1]) : '';

        let formattedDate = '';
        if (publishedMatch) {
          try {
            const d = new Date(publishedMatch[1]);
            formattedDate = d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
            });
          } catch {
            // Ignore date parsing failure
          }
        }

        mediaItems.push({
          id: `yt-${videoId}`,
          title: rawTitle,
          subtitle: formattedDate ? `Kantorei · Published ${formattedDate}` : 'Kantorei MN',
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          category: 'Featured Recording',
          description: rawDesc ? rawDesc.slice(0, 180) + '…' : undefined,
        });
      }

      return mediaItems;
    } catch (err) {
      console.warn('[YouTube RSS] Error fetching channel media:', err);
      return [];
    }
  });
}

export {
  extractYouTubeEmbedUrl,
  type YouTubeEmbedResult,
} from './youtube';

export function extractInstagramEmbedUrl(rawUrl: string): {
  embedUrl: string | null;
  shortcode: string | null;
  type: 'post' | 'reel' | 'tv' | null;
} {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.includes('instagram.com')) {
      return { embedUrl: null, shortcode: null, type: null };
    }
    const match = /\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i.exec(parsed.pathname);
    if (match) {
      const type = match[1].toLowerCase() as 'post' | 'reel' | 'tv';
      const shortcode = match[2];
      return {
        embedUrl: `https://www.instagram.com/${type}/${shortcode}/embed/captioned/`,
        shortcode,
        type,
      };
    }
  } catch {
    // Ignore invalid URL
  }
  return { embedUrl: null, shortcode: null, type: null };
}

export interface InstagramPostCard {
  id: string;
  shortcode: string;
  url: string;
  embedUrl: string;
}

export interface InstagramShowcase {
  profileUrl: string;
  handle: string;
  posts: InstagramPostCard[];
}

const FALLBACK_KANTOREI_SHORTCODES = [
  'DfIZU6ROzOI',
  'DfFeKKHu2s0',
  'De7IOeOO7nx',
  'DeugmmXOggz',
  'DeR-Lvap9F2',
  'DeH689YJsrI',
  'DdzJcCgJUUW',
  'DdciNo4JXMP',
  'DdW9Frsp9HF',
  'DYVOtGFJIea',
];

/**
 * Fetches recent Instagram post shortcodes for @kantorei_mn directly from Instagram.
 * Cached for 1 hour with Cloudflare Cache API / in-memory fallback.
 */
export async function fetchRecentInstagramShortcodes(
  profileUrl: string = 'https://www.instagram.com/kantorei_mn/'
): Promise<string[]> {
  return cachedFetchJson('instagram_shortcodes', 3600, async () => {
    try {
      const res = await fetch(profileUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
      });
      if (!res.ok) return FALLBACK_KANTOREI_SHORTCODES;

      const html = await res.text();
      const codeMatches = [...html.matchAll(/"code":"([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
      const validCodes = [...new Set(codeMatches)].filter(
        (code) => code.length >= 10 && code.length <= 15 && code !== 'en_US'
      );

      return validCodes.length > 0 ? validCodes : FALLBACK_KANTOREI_SHORTCODES;
    } catch {
      return FALLBACK_KANTOREI_SHORTCODES;
    }
  });
}

export async function getInstagramShowcase(
  config?: {
    Instagram_URL?: string;
    Instagram_Posts?: string;
    [key: string]: string | undefined;
  }
): Promise<InstagramShowcase> {
  const profileUrl = config?.Instagram_URL || 'https://www.instagram.com/kantorei_mn';
  const handleMatch = /instagram\.com\/([^/?#]+)/i.exec(profileUrl);
  const handle = handleMatch ? `@${handleMatch[1]}` : '@kantorei_mn';

  // If board configured specific Instagram post/reel URLs in the Choir Sheet Config tab
  if (config?.Instagram_Posts) {
    const customUrls = config.Instagram_Posts.split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (customUrls.length > 0) {
      const customPosts: InstagramPostCard[] = [];
      for (const [idx, rawUrl] of customUrls.entries()) {
        const { embedUrl, shortcode } = extractInstagramEmbedUrl(rawUrl);
        if (shortcode && embedUrl) {
          customPosts.push({
            id: `ig-custom-${idx + 1}-${shortcode}`,
            shortcode,
            url: `https://www.instagram.com/p/${shortcode}/`,
            embedUrl,
          });
        }
      }

      if (customPosts.length > 0) {
        return {
          profileUrl,
          handle,
          posts: customPosts,
        };
      }
    }
  }

  // Fetch the latest published posts directly from @kantorei_mn
  const shortcodes = await fetchRecentInstagramShortcodes(profileUrl);

  const posts: InstagramPostCard[] = shortcodes.slice(0, 6).map((code) => ({
    id: `ig-${code}`,
    shortcode: code,
    url: `https://www.instagram.com/p/${code}/`,
    embedUrl: `https://www.instagram.com/p/${code}/embed/captioned/`,
  }));

  return {
    profileUrl,
    handle,
    posts,
  };
}
