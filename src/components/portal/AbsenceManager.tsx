import { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import type { AbsenceRecord, ScheduleEvent, Singer } from '../../types/choir';
import { formatEventDate } from '../../lib/utils';

interface Props {
  singer: Singer;
  upcomingEvents: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
}

export default function AbsenceManager({
  singer,
  upcomingEvents,
  initialAbsences,
}: Props) {
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? ''
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeAbsenceMap = new Map(
    absences
      .filter((a) => a.status === 'Absent')
      .map((a) => [a.eventId, a])
  );

  const existingForSelected = activeAbsenceMap.get(selectedEventId);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEventId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventId,
          reason,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        absence?: AbsenceRecord;
        sectionAbsenceCount?: number;
      };

      if (!res.ok || !data.absence) {
        setFeedback({
          type: 'error',
          text: data.error ?? 'Unable to submit absence right now.',
        });
        return;
      }

      const saved = data.absence;
      setAbsences((prev) => {
        const filtered = prev.filter((a) => a.eventId !== saved.eventId);
        return [saved, ...filtered];
      });
      setReason('');
      setFeedback({
        type: 'success',
        text: `Absence recorded for ${formatEventDate(saved.date)}. Your ${singer.sectionGroup} Section Leader and leadership team have been notified.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Network error submitting absence.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(eventId: string, date: string) {
    setClearingId(eventId);
    setFeedback(null);
    try {
      const res = await fetch('/api/absences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setFeedback({ type: 'error', text: data.error ?? 'Failed to withdraw absence.' });
        return;
      }

      setAbsences((prev) =>
        prev.map((a) => (a.eventId === eventId ? { ...a, status: 'Cleared' } : a))
      );
      setFeedback({
        type: 'success',
        text: `Welcome back! Your absence for ${formatEventDate(date)} has been marked Cleared.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Network error clearing absence.' });
    } finally {
      setClearingId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left: Submit / Update Absence Form */}
      <div className="lg:col-span-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h2 className="font-editorial text-2xl font-bold text-navy-950">
            Report an Upcoming Absence
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Submitting notifies the Artistic Director, attendance administration, and your{' '}
            <strong>{singer.sectionGroup}</strong> Section Leader automatically.
          </p>

          {feedback && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="absence-event"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
              >
                Rehearsal or Performance Date
              </label>
              <select
                id="absence-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
              >
                {upcomingEvents.map((ev) => {
                  const alreadyAbsent = activeAbsenceMap.has(ev.eventId);
                  return (
                    <option key={ev.eventId} value={ev.eventId}>
                      {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                      {alreadyAbsent ? ' [Already Marked Absent]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {existingForSelected && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                You are already marked absent for this date (
                <em>"{existingForSelected.reason}"</em>). Submitting below will update your note without creating a duplicate entry.
              </div>
            )}

            <div>
              <label
                htmlFor="absence-reason"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
              >
                Note / Reason <span className="font-normal lowercase text-zinc-400">(optional)</span>
              </label>
              <textarea
                id="absence-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || upcomingEvents.length === 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting
                ? 'Sending Notification…'
                : existingForSelected
                  ? 'Update Absence Note'
                  : 'Submit Absence Notification'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Singer's Personal Absence History */}
      <div className="lg:col-span-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h2 className="font-editorial text-2xl font-bold text-navy-950">
            Your Logged Absences
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Plans changed? Withdraw an absence below so your section’s seating count stays accurate.
          </p>

          {absences.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              You have perfect attendance on file—no absences logged this season!
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-zinc-200">
              {absences
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => {
                  const isCleared = item.status === 'Cleared';
                  return (
                    <li
                      key={`${item.eventId}-${item.timestamp}`}
                      className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {formatEventDate(item.date)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isCleared
                                ? 'bg-zinc-100 text-zinc-500 line-through'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-600">{item.reason}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Logged via {item.submittedBy}
                        </p>
                      </div>

                      {!isCleared && (
                        <button
                          type="button"
                          disabled={clearingId === item.eventId}
                          onClick={() => handleWithdraw(item.eventId, item.date)}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 sm:self-center"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {clearingId === item.eventId ? 'Clearing…' : 'Withdraw Absence'}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
