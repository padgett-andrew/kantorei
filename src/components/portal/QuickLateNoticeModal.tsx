import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Send, X } from 'lucide-react';
import { formatEventDate } from '../../lib/utils';

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  sectionGroup: string;
  buttonLabel?: string;
  buttonVariant?: 'hero' | 'pill' | 'danger' | 'ghost';
  className?: string;
}

const QUICK_OPTIONS = [
  { label: '🚗 Running 10–15m Late', text: 'Running 10–15 minutes late (traffic / work)' },
  { label: '🚗 Running 30m Late', text: 'Running ~30 minutes late, arriving during rehearsal' },
  { label: '🤒 Sick / Vocal Rest', text: 'Feeling sick / resting voice' },
  { label: '💼 Work / Family Conflict', text: 'Work or family emergency' },
  { label: '✈️ Out of Town', text: 'Out of town / travel conflict' },
];

export default function QuickLateNoticeModal({
  eventId,
  eventTitle,
  eventDate,
  sectionGroup,
  buttonLabel = 'Report Running Late / Conflict',
  buttonVariant = 'hero',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(QUICK_OPTIONS[0].text);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e?: React.SyntheticEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit notice.');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending notice.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSuccess(false);
          setError('');
        }}
        className={
          className ||
          (buttonVariant === 'hero'
            ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-ivory-50 transition hover:bg-white/20'
            : buttonVariant === 'pill'
            ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100'
            : 'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100')
        }
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  Quick Attendance Update
                </span>
                <h3 className="font-editorial text-xl font-bold text-navy-950">
                  {eventTitle}
                </h3>
                <p className="text-xs text-zinc-500">{formatEventDate(eventDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="my-6 rounded-2xl bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <h4 className="mt-2 text-sm font-bold text-emerald-950">
                  Attendance Update Sent!
                </h4>
                <p className="mt-1 text-xs text-emerald-800">
                  Your {sectionGroup} Section Leader and leadership team have been alerted.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    1-Tap Quick Select
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setReason(opt.text)}
                        className={`cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                          reason === opt.text
                            ? 'bg-navy-900 text-white shadow-2xs font-semibold'
                            : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="custom-reason"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1"
                  >
                    Custom Note to Section Leader &amp; Director
                  </label>
                  <textarea
                    id="custom-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-navy-900 focus:outline-none"
                    placeholder="e.g. ETA 7:15 PM, stuck in traffic on I-35W"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-navy-800 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? 'Sending…' : 'Send Update'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
