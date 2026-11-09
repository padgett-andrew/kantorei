import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import {
  flushOfflineQueue,
  getPendingMutations,
  type QueuedMutation,
} from '../../lib/offline-queue';

export default function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingItems, setPendingItems] = useState<QueuedMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }
    setPendingItems(getPendingMutations());

    function handleOnline() {
      setIsOffline(false);
      setJustReconnected(true);
      setDismissed(false);

      // Trigger automatic outbox sync
      setIsSyncing(true);
      void flushOfflineQueue().finally(() => {
        setIsSyncing(false);
        setPendingItems(getPendingMutations());
      });

      // Clear the "Just Reconnected" banner after 4 seconds
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOffline(true);
      setJustReconnected(false);
      setDismissed(false);
    }

    function handleOutboxUpdate(e: Event) {
      const custom = e as CustomEvent<{ count: number; items: QueuedMutation[] }>;
      if (custom.detail?.items) {
        setPendingItems(custom.detail.items);
      } else {
        setPendingItems(getPendingMutations());
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('kantorei:outbox-updated', handleOutboxUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('kantorei:outbox-updated', handleOutboxUpdate);
    };
  }, []);

  // If online and nothing pending, hide banner
  if (dismissed || (!isOffline && !justReconnected && pendingItems.length === 0)) {
    return null;
  }

  return (
    <aside
      aria-label="Network Connectivity & Sync Status"
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-sm transition-all sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div
        className={`flex items-center justify-between gap-3 rounded-sm border px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-colors ${
          isOffline
            ? 'border-amber-400/80 bg-amber-50/95 text-amber-950'
            : justReconnected
            ? 'border-emerald-400/80 bg-emerald-50/95 text-emerald-950'
            : 'border-copper-300/80 bg-[#FAF7F2]/95 text-stone-900'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isOffline ? (
            <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          ) : isSyncing ? (
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-copper-600" aria-hidden="true" />
          ) : justReconnected ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <Wifi className="h-4 w-4 shrink-0 text-copper-600" aria-hidden="true" />
          )}

          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight">
              {isOffline
                ? 'Offline in Rehearsal'
                : isSyncing
                ? 'Syncing notices…'
                : justReconnected
                ? 'Back Online'
                : 'Pending Sync'}
            </p>
            <p className="mt-0.5 truncate text-[11px] opacity-80">
              {isOffline
                ? pendingItems.length > 0
                  ? `${pendingItems.length} notice${pendingItems.length > 1 ? 's' : ''} queued for sync`
                  : 'Viewing cached schedule & notes'
                : isSyncing
                ? 'Sending queued notices to director'
                : justReconnected
                ? 'All rehearsal data refreshed'
                : `${pendingItems.length} notice waiting for network`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-xs p-1 opacity-60 transition hover:opacity-100"
          aria-label="Dismiss offline status banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
