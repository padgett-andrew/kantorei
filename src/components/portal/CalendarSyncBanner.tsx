import { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import CalendarSubscribeModal from './CalendarSubscribeModal';

interface Props {
  httpsFeedUrl: string;
  webcalFeedUrl: string;
}

export default function CalendarSyncBanner({ httpsFeedUrl, webcalFeedUrl }: Props) {
  const [dismissed, setDismissed] = useState(true); // default true to avoid SSR flash

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem('kantorei_calendar_banner_dismissed') === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem('kantorei_calendar_banner_dismissed', 'true');
    } catch {}
  }

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-300/60 bg-gradient-to-r from-amber-50 via-white to-ivory-100 p-4 shadow-2xs sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-300 shadow-2xs">
            <Calendar className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                10-Second Setup
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Recommended
              </span>
            </div>
            <h3 className="mt-0.5 font-editorial text-lg font-bold text-navy-950 sm:text-xl">
              Sync Rehearsals &amp; Concerts to Your Phone Calendar
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600 sm:text-sm">
              Venue changes, dress rehearsal calls, and concert times sync to your Apple Calendar, Google Calendar, or Outlook automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <CalendarSubscribeModal
            httpsFeedUrl={httpsFeedUrl}
            webcalFeedUrl={webcalFeedUrl}
          />
          <button
            type="button"
            onClick={handleDismiss}
            className="cursor-pointer rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            title="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
