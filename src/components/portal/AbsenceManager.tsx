import { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import type { AbsenceRecord, ScheduleEvent, Singer } from '../../types/choir';
import { formatEventDate } from '../../lib/utils';

interface Props {
  singer: Singer;
  upcomingEvents: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
}

const LATE_OPTIONS = [
  { label: '🚗 10–15m late', text: 'Running 10–15 minutes late (traffic / commute)' },
  { label: '🚗 ~30m late', text: 'Running ~30 minutes late, arriving during rehearsal' },
  { label: '🚗 Arriving by 7:30 PM', text: 'Delayed, arriving by 7:30 PM' },
  { label: '💼 Work running late', text: 'Work call running late, on my way shortly' },
  { label: '🌧 Weather / Transit', text: 'Delayed due to weather or transit delay' },
];

const ABSENCE_OPTIONS = [
  { label: '🤒 Sick / Vocal rest', text: 'Feeling sick / resting voice' },
  { label: '✈️ Travel / Out of town', text: 'Out of town / travel conflict' },
  { label: '💼 Work / Family conflict', text: 'Work or family emergency' },
  { label: '🩺 Medical appointment', text: 'Medical appointment conflict' },
];

export default function AbsenceManager({
  singer,
  upcomingEvents,
  initialAbsences,
}: Props) {
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? ''
  );
  const [statusType, setStatusType] = useState<'Absent' | 'Late'>('Absent');
  const [reason, setReason] = useState(ABSENCE_OPTIONS[0].text);
  const [submitting, setSubmitting] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeRecordMap = new Map(
    absences
      .filter((a) => a.status !== 'Cleared')
      .map((a) => [a.eventId, a])
  );

  const existingForSelected = activeRecordMap.get(selectedEventId);

  function handleTypeChange(nextType: 'Absent' | 'Late') {
    setStatusType(nextType);
    setReason(nextType === 'Absent' ? ABSENCE_OPTIONS[0].text : LATE_OPTIONS[0].text);
  }

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
          status: statusType,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        absence?: AbsenceRecord;
        sectionAbsenceCount?: number;
        sectionLateCount?: number;
      };

      if (!res.ok || !data.absence) {
        setFeedback({
          type: 'error',
          text: data.error ?? 'Unable to submit notice right now.',
        });
        return;
      }

      const saved = data.absence;
      setAbsences((prev) => {
        const filtered = prev.filter((a) => a.eventId !== saved.eventId);
        return [saved, ...filtered];
      });

      const isLate = saved.status === 'Late';
      setFeedback({
        type: 'success',
        text: isLate
          ? `Late notice recorded for ${formatEventDate(saved.date)}. Your ${singer.sectionGroup} Section Leader and leadership team know you are on your way!`
          : `Absence recorded for ${formatEventDate(saved.date)}. Your ${singer.sectionGroup} Section Leader and leadership team have been notified.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Network error submitting notice.' });
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
        setFeedback({ type: 'error', text: data.error ?? 'Failed to withdraw notice.' });
        return;
      }

      const prevRecord = absences.find((a) => a.eventId === eventId);
      const wasLate = prevRecord?.status === 'Late';

      setAbsences((prev) =>
        prev.map((a) => (a.eventId === eventId ? { ...a, status: 'Cleared' } : a))
      );
      setFeedback({
        type: 'success',
        text: wasLate
          ? `Welcome! Your running late notice for ${formatEventDate(date)} has been withdrawn. Section leadership has been notified that you will be on time!`
          : `Welcome back! Your absence for ${formatEventDate(date)} has been withdrawn. Section leadership has been notified that you are attending!`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Network error clearing record.' });
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
            Report Absence or Running Late
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
            {/* 2-mode toggle: Full Absence vs Running Late */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Notice Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('Absent')}
                  className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                    statusType === 'Absent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  🔴 Full Absence
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Late')}
                  className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                    statusType === 'Late'
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  🟡 Running Late
                </button>
              </div>
            </div>

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
                  const existingRecord = activeRecordMap.get(ev.eventId);
                  return (
                    <option key={ev.eventId} value={ev.eventId}>
                      {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                      {existingRecord
                        ? existingRecord.status === 'Late'
                          ? ' [Marked Running Late]'
                          : ' [Marked Absent]'
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {existingForSelected && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                You are currently marked {existingForSelected.status === 'Late' ? 'running late' : 'absent'} for this date (
                <em>"{existingForSelected.reason}"</em>). Submitting below will update your status and note without creating a duplicate entry.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="absence-reason"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
                >
                  {statusType === 'Late' ? 'Estimated Arrival / Note' : 'Note / Reason'}{' '}
                  <span className="font-normal lowercase text-zinc-400">(optional)</span>
                </label>
                <span className="text-[10px] text-zinc-400">1-Tap Quick Select</span>
              </div>

              {/* 1-Tap Quick Reason Chips */}
              <div className="mt-1.5 mb-2 flex flex-wrap gap-1.5">
                {(statusType === 'Late' ? LATE_OPTIONS : ABSENCE_OPTIONS).map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setReason(chip.text)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      reason === chip.text
                        ? statusType === 'Late'
                          ? 'border-amber-400 bg-amber-100 text-amber-950 font-semibold'
                          : 'border-rose-400 bg-rose-100 text-rose-950 font-semibold'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <textarea
                id="absence-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  statusType === 'Late'
                    ? 'e.g. ETA 7:25 PM, traffic delay on I-94'
                    : 'Select a quick chip above or type details here…'
                }
                className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || upcomingEvents.length === 0}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
                statusType === 'Late'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-navy-900 hover:bg-navy-800'
              }`}
            >
              <Send className="h-4 w-4" />
              {submitting
                ? 'Sending Notification…'
                : existingForSelected
                  ? statusType === 'Late'
                    ? 'Update Late Notice'
                    : 'Update Absence Note'
                  : statusType === 'Late'
                  ? 'Submit Late Notice'
                  : 'Submit Absence Notification'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Singer's Personal Absence History */}
      <div className="lg:col-span-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h2 className="font-editorial text-2xl font-bold text-navy-950">
            Your Logged Absences &amp; Late Notices
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Plans changed? Withdraw a notice below so your section’s seating count stays accurate.
          </p>

          {absences.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
              You have perfect attendance on file—no absences or late notices logged this season!
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-zinc-200">
              {absences
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => {
                  const isCleared = item.status === 'Cleared';
                  const isLate = item.status === 'Late';
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
                                : isLate
                                ? 'border border-amber-300 bg-amber-50 text-amber-900'
                                : 'border border-rose-200 bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCleared ? 'Cleared' : isLate ? '🟡 Running Late' : '🔴 Absent'}
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
                          {clearingId === item.eventId
                            ? 'Clearing…'
                            : isLate
                            ? 'Withdraw Late Notice'
                            : 'Withdraw Absence'}
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
