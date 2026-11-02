import { useState } from 'react';
import { Calendar, Check, Copy, Download, ExternalLink, X } from 'lucide-react';

interface Props {
  httpsFeedUrl: string;
  webcalFeedUrl: string;
}

export default function CalendarSubscribeModal({ httpsFeedUrl, webcalFeedUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(httpsFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:border-navy-900 hover:text-navy-950"
      >
        <Calendar className="h-4 w-4 text-gold-500" />
        Sync to Apple / Google Calendar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gold-500">
                  Live Auto-Updating Feed
                </span>
                <h3 className="mt-1 font-editorial text-2xl font-bold text-navy-950">
                  Subscribe to Rehearsal & Concert Dates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-zinc-600">
              Subscribing keeps your phone and computer calendar automatically synced whenever call times, rooms, or repertoire notes are updated in the Master Schedule.
            </p>

            <div className="mt-5 space-y-3">
              <a
                href={webcalFeedUrl}
                className="flex w-full items-center justify-between rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                <span>1-Tap Subscribe in Apple Calendar / Outlook</span>
                <ExternalLink className="h-4 w-4 text-gold-400" />
              </a>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Google Calendar URL (Settings → Add Calendar → From URL):
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={httpsFeedUrl}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-mono text-xs text-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
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

              <a
                href={httpsFeedUrl}
                download="kantorei-rehearsals.ics"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-navy-900"
              >
                <Download className="h-3.5 w-3.5" />
                Or download static .ics file snapshot
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

