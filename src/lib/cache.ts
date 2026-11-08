export type CacheTag =
  | 'roster'
  | 'schedule'
  | `schedule:${string}`
  | 'absences'
  | 'concerts'
  | 'tickettailor_events'
  | 'youtube_media'
  | 'instagram_shortcodes'
  | 'instagram_media'
  | 'media'
  | 'config'
  | 'board'
  | 'leadership'
  | 'giving_tiers'
  | 'subscribers'
  | 'subscribers_with_warnings'
  | 'music'
  | 'seating_charts'
  | `repertoire-doc:${string}`
  | 'handbook'
  | 'strategic-plan';

interface MemoryCacheEntry {
  expiresAt: number;
  json: string;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const persistentMemoryCache = new Map<string, string>();

function buildCacheUrl(tag: CacheTag): string {
  // Use a canonical URL matching the production zone domain so Cloudflare Cache API (caches.default) accepts it
  return `https://kantorei.net/__kantorei_cache__/v4/${encodeURIComponent(tag)}`;
}

function getEdgeCache(): Cache | null {
  try {
    if (typeof caches !== 'undefined' && 'default' in caches) {
      return (caches as unknown as { default: Cache }).default;
    }
  } catch {
    // Fallback to memory cache in non-worker environments
  }
  return null;
}

export async function cachedFetchJson<T>(
  tag: CacheTag,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = buildCacheUrl(tag);
  const now = Date.now();
  const effectiveTtl = import.meta.env.DEV ? Math.min(ttlSeconds, 10) : ttlSeconds;

  const memHit = memoryCache.get(key);
  if (memHit && memHit.expiresAt > now) {
    return JSON.parse(memHit.json) as T;
  }

  const edgeCache = getEdgeCache();
  if (edgeCache) {
    try {
      const cachedRes = await edgeCache.match(key);
      if (cachedRes) {
        const json = await cachedRes.text();
        memoryCache.set(key, { expiresAt: now + effectiveTtl * 1000, json });
        persistentMemoryCache.set(key, json);
        return JSON.parse(json) as T;
      }
    } catch {
      // Ignore cache read error and fetch live
    }
  }

  let freshData: T;
  try {
    freshData = await fetcher();
  } catch (err) {
    // Resilience: Fall back to stale memory cache or edge cache on transient network/API failures
    if (memHit) {
      console.warn(
        `[Cache Resilience] Fetch failed for tag "${tag}". Serving stale memory-cached data. Reason:`,
        err instanceof Error ? err.message : err
      );
      return JSON.parse(memHit.json) as T;
    }

    const persistent = persistentMemoryCache.get(key);
    if (persistent) {
      console.warn(
        `[Cache Resilience] Fetch failed for tag "${tag}". Serving persistent memory-cached fallback. Reason:`,
        err instanceof Error ? err.message : err
      );
      return JSON.parse(persistent) as T;
    }

    if (edgeCache) {
      try {
        const cachedRes = await edgeCache.match(key);
        if (cachedRes) {
          const json = await cachedRes.text();
          console.warn(
            `[Cache Resilience] Fetch failed for tag "${tag}". Serving stale edge-cached data. Reason:`,
            err instanceof Error ? err.message : err
          );
          memoryCache.set(key, { expiresAt: now + 30 * 1000, json });
          persistentMemoryCache.set(key, json);
          return JSON.parse(json) as T;
        }
      } catch {
        // Ignore edge cache read error
      }
    }

    throw err;
  }

  const serialized = JSON.stringify(freshData);

  memoryCache.set(key, {
    expiresAt: now + effectiveTtl * 1000,
    json: serialized,
  });
  persistentMemoryCache.set(key, serialized);

  if (edgeCache) {
    try {
      await edgeCache.put(
        key,
        new Response(serialized, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${effectiveTtl}, stale-while-revalidate=86400, stale-if-error=604800`,
          },
        })
      );
    } catch {
      // Ignore cache write error
    }
  }

  return freshData;
}

export async function invalidateCacheTag(tag: CacheTag): Promise<void> {
  const key = buildCacheUrl(tag);
  memoryCache.delete(key);
  persistentMemoryCache.delete(key);

  const edgeCache = getEdgeCache();
  if (edgeCache) {
    try {
      await edgeCache.delete(key);
    } catch {
      // Ignore delete error
    }
  }
}

