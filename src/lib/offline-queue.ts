/**
 * Offline Mutation Outbox & Background Sync Queue
 * Allows singers and section leaders to submit quick late notices, absence reports,
 * snack sign-ups, and roll call checkmarks even with zero bars of cellular service.
 * Actions are persisted to localStorage and automatically flushed when connectivity is restored.
 */

export interface QueuedMutation {
  id: string;
  url: string;
  method: 'POST' | 'DELETE';
  body: Record<string, unknown>;
  label: string;
  createdAt: number;
  attempts: number;
}

const STORAGE_KEY = 'kantorei_offline_outbox_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function notifySubscribers(items: QueuedMutation[]): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent('kantorei:outbox-updated', {
        detail: { count: items.length, items },
      })
    );
  } catch {
    // Ignore environments where CustomEvent might be restricted
  }
}

export function getPendingMutations(): QueuedMutation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
  } catch (err) {
    console.warn('[Offline Queue] Error reading pending mutations:', err);
    return [];
  }
}

export function enqueueOfflineMutation(params: {
  url: string;
  method?: 'POST' | 'DELETE';
  body: Record<string, unknown>;
  label: string;
}): QueuedMutation {
  const item: QueuedMutation = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: params.url,
    method: params.method || 'POST',
    body: params.body,
    label: params.label,
    createdAt: Date.now(),
    attempts: 0,
  };

  if (isBrowser()) {
    try {
      const current = getPendingMutations();
      // Deduplicate by URL + eventId + targetEmail if applicable
      const filtered = current.filter((existing) => {
        const sameUrl = existing.url === item.url && existing.method === item.method;
        const sameEvent =
          existing.body.eventId && existing.body.eventId === item.body.eventId;
        const sameSinger =
          existing.body.targetEmail && existing.body.targetEmail === item.body.targetEmail;
        return !(sameUrl && sameEvent && (sameSinger || (!existing.body.targetEmail && !item.body.targetEmail)));
      });

      filtered.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      notifySubscribers(filtered);
    } catch (err) {
      console.error('[Offline Queue] Failed to enqueue mutation:', err);
    }
  }

  return item;
}

export function removeMutation(id: string): void {
  if (!isBrowser()) return;
  try {
    const current = getPendingMutations();
    const updated = current.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifySubscribers(updated);
  } catch (err) {
    console.error('[Offline Queue] Error removing mutation:', err);
  }
}

export function clearMutationQueue(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifySubscribers([]);
  } catch (err) {
    console.error('[Offline Queue] Error clearing queue:', err);
  }
}

let isFlushing = false;

export async function flushOfflineQueue(
  fetchFn: typeof fetch = fetch
): Promise<{ sent: number; remaining: number }> {
  if (!isBrowser() || isFlushing) {
    return { sent: 0, remaining: getPendingMutations().length };
  }

  // If navigator is explicitly offline, skip flushing
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    return { sent: 0, remaining: getPendingMutations().length };
  }

  const items = getPendingMutations();
  if (items.length === 0) {
    return { sent: 0, remaining: 0 };
  }

  isFlushing = true;
  let sentCount = 0;
  const remainingItems: QueuedMutation[] = [];

  try {
    for (const item of items) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const res = await fetchFn(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          sentCount++;
          try {
            window.dispatchEvent(
              new CustomEvent('kantorei:outbox-synced', {
                detail: { item },
              })
            );
          } catch {}
        } else if (res.status >= 400 && res.status < 500 && res.status !== 408) {
          // Client error (e.g. 400 Bad Request or 404) — discarding corrupt mutation to prevent poison pill
          console.warn(`[Offline Queue] Discarding non-retryable mutation ${item.id} (${res.status})`);
        } else {
          // Server error (500, 502, 503) or 408 Timeout — retain for retry
          item.attempts += 1;
          remainingItems.push(item);
        }
      } catch (networkErr) {
        // Network drop or timeout during individual item fetch — stop queue processing and retain remaining
        item.attempts += 1;
        remainingItems.push(item);
        break;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingItems));
    notifySubscribers(remainingItems);
  } finally {
    isFlushing = false;
  }

  return { sent: sentCount, remaining: remainingItems.length };
}

// Attach automatic listener when running in the browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });

  // Attempt initial sync when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void flushOfflineQueue();
    }
  });
}
