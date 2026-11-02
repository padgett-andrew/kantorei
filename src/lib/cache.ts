export type CacheTag =
  | 'roster'
  | 'schedule'
  | 'absences'
  | 'concerts'
  | 'media'
  | 'config'
  | 'music'
  | `repertoire-doc:${string}`
  | 'handbook'
  | 'strategic-plan';

interface MemoryCacheEntry {
  expiresAt: number;
  json: string;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

function buildCacheUrl(tag: CacheTag): string {
  return `https://kantorei-internal.cache/v4/${encodeURIComponent(tag)}`;
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
        memoryCache.set(key, { expiresAt: now + Math.min(ttlSeconds, 15) * 1000, json });
        return JSON.parse(json) as T;
      }
    } catch {
      // Ignore cache read error and fetch live
    }
  }

  const freshData = await fetcher();
  const serialized = JSON.stringify(freshData);

  memoryCache.set(key, {
    expiresAt: now + ttlSeconds * 1000,
    json: serialized,
  });

  if (edgeCache) {
    try {
      await edgeCache.put(
        key,
        new Response(serialized, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${ttlSeconds}`,
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

  const edgeCache = getEdgeCache();
  if (edgeCache) {
    try {
      await edgeCache.delete(key);
    } catch {
      // Ignore delete error
    }
  }
}

