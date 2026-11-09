import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMutationQueue,
  enqueueOfflineMutation,
  flushOfflineQueue,
  getPendingMutations,
  removeMutation,
} from '../src/lib/offline-queue';

describe('offline-queue', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] || null,
    };

    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    });
  });

  it('enqueues an offline mutation and retrieves it', () => {
    const item = enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1', reason: 'Running 10m late', status: 'Late' },
      label: 'Late notice for Rehearsal 1',
    });

    expect(item.id).toMatch(/^mut-/);
    expect(item.url).toBe('/api/absences');
    expect(item.label).toBe('Late notice for Rehearsal 1');

    const pending = getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(item.id);
  });

  it('deduplicates mutations for the same event and target', () => {
    enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1', reason: 'Running 10m late', status: 'Late' },
      label: 'Initial 10m late notice',
    });

    // Singer updates their notice to 30m late
    enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1', reason: 'Running 30m late', status: 'Late' },
      label: 'Updated 30m late notice',
    });

    const pending = getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].label).toBe('Updated 30m late notice');
    expect(pending[0].body.reason).toBe('Running 30m late');
  });

  it('removes specific mutations by id', () => {
    const a = enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1' },
      label: 'Notice A',
    });
    const b = enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-2' },
      label: 'Notice B',
    });

    expect(getPendingMutations()).toHaveLength(2);
    removeMutation(a.id);

    const remaining = getPendingMutations();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it('clears all mutations', () => {
    enqueueOfflineMutation({
      url: '/api/absences',
      body: { eventId: 'reh-1' },
      label: 'Notice 1',
    });
    clearMutationQueue();
    expect(getPendingMutations()).toHaveLength(0);
  });

  it('flushes pending mutations with custom fetch', async () => {
    enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1' },
      label: 'Notice 1',
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await flushOfflineQueue(mockFetch as unknown as typeof fetch);
    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getPendingMutations()).toHaveLength(0);
  });

  it('retains mutations if fetch fails with a network error', async () => {
    enqueueOfflineMutation({
      url: '/api/absences',
      method: 'POST',
      body: { eventId: 'reh-1' },
      label: 'Notice 1',
    });

    const failingFetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const result = await flushOfflineQueue(failingFetch as unknown as typeof fetch);
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(1);

    const pending = getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].attempts).toBe(1);
  });
});
