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
        className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-950 transition hover:border-navy-950 hover:bg-white"
        title="Open official ensemble Google Calendar"
      >
        <ExternalLink className="h-3 w-3 shrink-0 text-copper-600" />
        <span className="hidden sm:inline">Google Calendar</span>
        <span className="sm:hidden">Calendar</span>
      </a>

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:bg-white hover:text-navy-950 disabled:opacity-60"
        title="Refresh schedule from Google Calendar"
      >
        <RefreshCw className={cn('h-3 w-3 shrink-0 text-stone-500', syncing && 'animate-spin')} />
        <span>{syncing ? 'Syncing…' : synced ? 'Synced' : 'Refresh'}</span>
      </button>
    </div>
  );
}

