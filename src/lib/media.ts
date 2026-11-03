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

export interface InstagramPostCard {
  id: string;
  title: string;
  category: string;
  url: string;
  embedUrl?: string;
  summary: string;
}

export interface InstagramShowcase {
  profileUrl: string;
  handle: string;
  posts: InstagramPostCard[];
}

export function getInstagramShowcase(config?: { Instagram_URL?: string }): InstagramShowcase {
  const profileUrl = config?.Instagram_URL || 'https://www.instagram.com/kantorei_mn';
  const handleMatch = /instagram\.com\/([^/?#]+)/i.exec(profileUrl);
  const handle = handleMatch ? `@${handleMatch[1]}` : '@kantorei_mn';

  return {
    profileUrl,
    handle,
    posts: [
      {
        id: 'ig-advent-rehearsal',
        title: 'Sunday Rehearsal Blend & Voicings',
        category: 'Rehearsal Clip',
        url: 'https://www.instagram.com/kantorei_mn/',
        summary:
          'Warmups and four-part acoustic blend under Adam Reinwald at Shepherd of the Hills Sanctuary.',
      },
      {
        id: 'ig-singer-spotlight',
        title: 'Singer Spotlight: Life with Kantorei',
        category: 'Behind the Scenes',
        url: 'https://www.instagram.com/kantorei_mn/',
        summary:
          'Meet the singers from our Soprano and Bass sections sharing what singing for a lifetime means to them.',
      },
      {
        id: 'ig-concert-preview',
        title: 'Advent with Kantorei: Shoreview & Edina',
        category: 'Concert Preview',
        url: 'https://www.instagram.com/kantorei_mn/',
        summary:
          'Previewing signature unaccompanied repertoire and venue acoustics for our upcoming weekend performances.',
      },
    ],
  };
}
