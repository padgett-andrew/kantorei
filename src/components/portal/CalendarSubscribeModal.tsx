import { useState } from 'react';
import { Calendar, Check, Copy, Download, ExternalLink, X } from 'lucide-react';

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
        className="inline-flex max-w-full cursor-pointer items-center gap-2.5 rounded-sm border border-stone-300/90 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-950 transition hover:border-navy-950 hover:bg-white"
      >
        <Calendar className="h-3.5 w-3.5 shrink-0 text-copper-600" />
        <span className="truncate">Sync Calendar</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-stone-200 bg-[#FAF7F2] p-6 text-stone-900 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200/90 pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
                  Live Subscription Feed
                </span>
                <h3 className="mt-1 font-editorial text-2xl font-semibold text-navy-950 sm:text-3xl">
                  Sync Rehearsals &amp; Concerts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-[#f5efe8] hover:text-navy-950"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Subscribe once and your personal calendar updates automatically whenever rehearsal times, venues, or call notes change.
            </p>

            {isLocalhost && (
              <div className="mt-4 border-l-2 border-copper-500 bg-[#f5efe8] px-4 py-2.5 text-xs text-stone-700">
                <strong>Local Environment:</strong> Cloud calendar providers require a live{' '}
                <code className="font-mono">https://</code> URL to poll updates; Apple Calendar also works locally.
              </div>
            )}

            <div className="mt-5 divide-y divide-stone-200/90 border-y border-stone-200/90">
              {/* 1. Google Calendar */}
              <a
                href={googleCalSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-between py-3.5 transition hover:bg-[#f5efe8]/70 sm:px-2"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-white font-editorial text-lg font-semibold text-navy-950">
                    G
                  </span>
                  <div>
                    <span className="block text-sm font-medium text-navy-950">
                      Google Calendar
                    </span>
                    <span className="block text-xs text-stone-500">
                      One-click cloud subscription (Android, iOS &amp; Web)
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:text-copper-600" />
              </a>

              {/* 2. Apple Calendar */}
              <a
                href={webcalFeedUrl}
                className="group flex w-full items-center justify-between py-3.5 transition hover:bg-[#f5efe8]/70 sm:px-2"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-white font-editorial text-lg font-semibold text-navy-950">
                    iCal
                  </span>
                  <div>
                    <span className="block text-sm font-medium text-navy-950">
                      Apple Calendar
                    </span>
                    <span className="block text-xs text-stone-500">
                      Direct webcal subscription for iPhone, iPad &amp; Mac
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:text-copper-600" />
              </a>

              {/* 3. Microsoft Outlook */}
              <div className="py-3.5 sm:px-2">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-white font-editorial text-lg font-semibold text-navy-950">
                    O
                  </span>
                  <div>
                    <span className="block text-sm font-medium text-navy-950">
                      Microsoft Outlook
                    </span>
                    <span className="block text-xs text-stone-500">
                      Select your Outlook account environment:
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <a
                    href={outlookPersonalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-sm border border-stone-200/90 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                  >
                    Outlook.com
                    <ExternalLink className="h-3 w-3 text-stone-400" />
                  </a>
                  <a
                    href={outlookWorkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-sm border border-stone-200/90 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                  >
                    Work / M365
                    <ExternalLink className="h-3 w-3 text-stone-400" />
                  </a>
                  <a
                    href={webcalFeedUrl}
                    className="flex items-center justify-center gap-1.5 rounded-sm border border-stone-200/90 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                  >
                    Desktop App
                    <ExternalLink className="h-3 w-3 text-stone-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Manual Feed URL Copy & Static Download */}
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Direct iCal Feed URL
                </label>
                <a
                  href={httpsFeedUrl}
                  download="kantorei-rehearsals.ics"
                  className="inline-flex items-center gap-1 text-xs font-medium text-copper-600 transition hover:text-navy-950"
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
                  className="min-w-0 flex-1 rounded-sm border border-stone-300 bg-white px-3 py-2 font-mono text-xs text-stone-600"
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-copper-300" />
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
