import { useState } from 'react';
import { Calendar, Check, Copy, Download, ExternalLink, Sparkles, X } from 'lucide-react';

interface Props {
  httpsFeedUrl: string;
  webcalFeedUrl: string;
}

export default function CalendarSubscribeModal({ httpsFeedUrl, webcalFeedUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(httpsFeedUrl);
  const calendarName = 'Kantorei Rehearsals & Concerts';

  // Official 1-click subscription deep links across Google, Apple, and Microsoft Outlook
  const googleCalSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
    webcalFeedUrl
  )}`;
  const outlookPersonalUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(
    httpsFeedUrl
  )}&name=${encodeURIComponent(calendarName)}`;
  const outlookWorkUrl = `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(
    httpsFeedUrl
  )}&name=${encodeURIComponent(calendarName)}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(httpsFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-sm border border-stone-200/80 bg-white px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-navy-950 shadow-xs transition hover:border-copper-500/60 hover:bg-stone-50"
      >
        <Calendar className="h-4 w-4 shrink-0 text-copper-600" />
        <span className="truncate">Sync Calendar</span>
        <span className="hidden rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 sm:inline">
          Google · Apple · Outlook
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-copper-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-500">
                  <Sparkles className="h-3 w-3" />
                  Live Auto-Updating Feed
                </span>
                <h3 className="mt-2 font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
                  Sync Rehearsals & Concerts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Subscribe once and your calendar updates automatically whenever rehearsal times, venues, or call notes change in the Master Schedule.
            </p>

            {isLocalhost && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                <strong>Local Dev Note:</strong> Google Calendar and Outlook Web fetch feeds from the cloud, so test 1-click cloud subscriptions on your live{' '}
                <code className="font-mono">https://</code> site (Apple Calendar works locally too).
              </div>
            )}

            <div className="mt-5 space-y-2.5">
              {/* 1. Google Calendar */}
              <a
                href={googleCalSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-navy-900 hover:bg-ivory-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 ring-1 ring-blue-200/70">
                    G
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-navy-950">
                      Google Calendar
                    </span>
                    <span className="block text-xs text-zinc-500">
                      1-click subscribe (syncs to Android, iOS & Web)
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-navy-900" />
              </a>

              {/* 2. Apple Calendar */}
              <a
                href={webcalFeedUrl}
                className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 transition hover:border-navy-900 hover:bg-ivory-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                    
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-navy-950">
                      Apple Calendar
                    </span>
                    <span className="block text-xs text-zinc-500">
                      1-tap subscribe on iPhone, iPad, or Mac
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-navy-900" />
              </a>

              {/* 3. Microsoft Outlook (Personal + Work/M365 + Classic Desktop) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm font-bold text-sky-700 ring-1 ring-sky-200/70">
                    O
                  </span>
                  <div>
                    <span className="block text-sm font-semibold text-navy-950">
                      Microsoft Outlook
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Choose your Outlook account type:
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <a
                    href={outlookPersonalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-navy-900 hover:bg-white"
                  >
                    Outlook.com
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                  <a
                    href={outlookWorkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-navy-900 hover:bg-white"
                  >
                    Work / M365
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                  <a
                    href={webcalFeedUrl}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-navy-900 hover:bg-white"
                  >
                    Desktop App
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Manual Feed URL Copy & Static Download */}
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-ivory-50/80 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-zinc-700">
                  Direct iCal Feed URL (for manual paste):
                </label>
                <a
                  href={httpsFeedUrl}
                  download="kantorei-rehearsals.ics"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-500 hover:text-navy-900"
                >
                  <Download className="h-3 w-3" />
                  Download .ics snapshot
                </a>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={httpsFeedUrl}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-600"
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
