import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  calendarId?: string;
}

export default function CalendarAdminControls({ calendarId }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const calendarUrl =
    calendarId && calendarId !== 'DEMO'
      ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`
      : 'https://calendar.google.com/calendar/u/0/r';

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/schedule?action=sync');
      if (res.ok) {
        setSynced(true);
        setTimeout(() => {
          window.location.reload();
        }, 350);
      }
    } catch (err) {
      console.error('[Calendar Sync Failed]', err);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs transition hover:border-navy-900 hover:bg-zinc-50"
        title="Open official ensemble Google Calendar"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gold-500" />
        <span className="hidden sm:inline">Open Google Calendar</span>
        <span className="sm:hidden">Google Cal</span>
      </a>

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-navy-900 hover:text-navy-950 disabled:opacity-60"
        title="Refresh schedule from Google Calendar"
      >
        <RefreshCw className={cn('h-3.5 w-3.5 shrink-0 text-zinc-500', syncing && 'animate-spin')} />
        <span>{syncing ? 'Syncing…' : synced ? 'Synced!' : 'Sync'}</span>
      </button>
    </div>
  );
}

