import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import type { AbsenceRecord, ScheduleEvent, SectionGroup, Singer } from '../../types/choir';
import { SECTION_GROUPS } from '../../types/choir';
import { formatEventDate } from '../../lib/utils';

interface Props {
  singer: Singer;
  upcomingEvents: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
  allAbsences?: AbsenceRecord[];
  activeRoster?: Singer[];
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
  allAbsences,
  activeRoster = [],
}: Props) {
  const isLeaderOrAdmin =
    (singer.role === 'Section_Leader' || singer.role === 'Admin') &&
    Boolean(allAbsences && activeRoster.length > 0);
  const isAdmin = singer.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'my' | 'rollcall'>('my');
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);
  const [rosterAbsences, setRosterAbsences] = useState<AbsenceRecord[]>(allAbsences || []);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? ''
  );
  const [rollCallEventId, setRollCallEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? ''
  );
  const [rollCallSection, setRollCallSection] = useState<'All' | SectionGroup>(
    isAdmin ? 'All' : singer.sectionGroup
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

      setRosterAbsences((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.eventId === saved.eventId &&
              a.singerEmail.toLowerCase() === saved.singerEmail.toLowerCase()
            )
        );
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

      setRosterAbsences((prev) =>
        prev.map((a) =>
          a.eventId === eventId && a.singerEmail.toLowerCase() === singer.email.toLowerCase()
            ? { ...a, status: 'Cleared' }
            : a
        )
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

  // Roll call calculations for Section Leaders & Admins
  const selectedRollCallEvent = useMemo(() => {
    return (
      upcomingEvents.find((e) => e.eventId === rollCallEventId) || upcomingEvents[0] || null
    );
  }, [upcomingEvents, rollCallEventId]);

  const activeCohortSingers = useMemo(() => {
    return activeRoster.filter((s) => {
      if (rollCallSection === 'All') return true;
      return s.sectionGroup === rollCallSection;
    });
  }, [activeRoster, rollCallSection]);

  const eventCohortRecords = useMemo(() => {
    if (!selectedRollCallEvent) return [];
    return rosterAbsences.filter((rec) => {
      if (rec.eventId !== selectedRollCallEvent.eventId) return false;
      if (rec.status === 'Cleared') return false;
      if (rollCallSection === 'All') return true;
      const matchedSinger = activeRoster.find(
        (s) => s.email.toLowerCase() === rec.singerEmail.toLowerCase()
      );
      return matchedSinger?.sectionGroup === rollCallSection;
    });
  }, [rosterAbsences, selectedRollCallEvent, rollCallSection, activeRoster]);

  const absentCohortList = useMemo(() => {
    return eventCohortRecords.filter((r) => r.status === 'Absent');
  }, [eventCohortRecords]);

  const lateCohortList = useMemo(() => {
    return eventCohortRecords.filter((r) => r.status === 'Late');
  }, [eventCohortRecords]);

  const attendingCohortSingers = useMemo(() => {
    const absentEmails = new Set(
      absentCohortList.map((a) => a.singerEmail.toLowerCase())
    );
    return activeCohortSingers.filter((s) => !absentEmails.has(s.email.toLowerCase()));
  }, [activeCohortSingers, absentCohortList]);

  return (
    <div className="space-y-6">
      {/* Role-Adaptive Navigation Tabs for Section Leaders & Admins */}
      {isLeaderOrAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-2 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                activeTab === 'my'
                  ? 'bg-navy-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-navy-950 hover:bg-stone-50'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>My Attendance</span>
              {absences.filter((a) => a.status !== 'Cleared').length > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
                  {absences.filter((a) => a.status !== 'Cleared').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rollcall')}
              className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
                activeTab === 'rollcall'
                  ? 'bg-navy-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-navy-950 hover:bg-stone-50'
              }`}
            >
              <Users className="h-4 w-4 text-gold-400" />
              <span>
                {isAdmin
                  ? 'Ensemble Roll Call'
                  : `${singer.sectionGroup} Section Roll Call`}
              </span>
              {eventCohortRecords.length > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-bold text-navy-950">
                  {eventCohortRecords.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden pr-3 text-xs text-stone-500 sm:flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {isAdmin
                ? 'Full Choir Attendance Overview'
                : `Section Leader: ${singer.sectionGroup} Section`}
            </span>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 1: PERSONAL ATTENDANCE (Submit form & personal notices)
          =================================================================== */}
      {(!isLeaderOrAdmin || activeTab === 'my') && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Submit / Update Absence Form */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
              <h2 className="font-editorial text-2xl font-bold text-navy-950">
                Report Absence or Running Late
              </h2>
              <p className="mt-1 text-sm text-stone-600">
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    Notice Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-stone-100 p-1">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('Absent')}
                      className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                        statusType === 'Absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-navy-950'
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
                          : 'text-stone-600 hover:text-navy-950'
                      }`}
                    >
                      🟡 Running Late
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="absence-event"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-600"
                  >
                    Rehearsal or Performance Date
                  </label>
                  <select
                    id="absence-event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-900 focus:outline-none"
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
                      className="block text-xs font-semibold uppercase tracking-wider text-stone-600"
                    >
                      {statusType === 'Late' ? 'Estimated Arrival / Note' : 'Note / Reason'}{' '}
                      <span className="font-normal lowercase text-stone-400">(optional)</span>
                    </label>
                    <span className="text-[10px] text-stone-400">1-Tap Quick Select</span>
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
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
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
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-900 focus:outline-none"
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
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
              <h2 className="font-editorial text-2xl font-bold text-navy-950">
                Your Logged Absences &amp; Late Notices
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Plans changed? Withdraw a notice below so your section’s seating count stays accurate.
              </p>

              {absences.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-500">
                  You have perfect attendance on file—no absences or late notices logged this season!
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-stone-200">
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
                              <span className="font-semibold text-stone-900">
                                {formatEventDate(item.date)}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                  isCleared
                                    ? 'bg-stone-100 text-stone-500 line-through'
                                    : isLate
                                    ? 'border border-amber-300 bg-amber-50 text-amber-900'
                                    : 'border border-rose-200 bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isCleared ? 'Cleared' : isLate ? '🟡 Running Late' : '🔴 Absent'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-stone-600">{item.reason}</p>
                            <p className="mt-0.5 text-xs text-stone-400">
                              Logged via {item.submittedBy}
                            </p>
                          </div>

                          {!isCleared && (
                            <button
                              type="button"
                              disabled={clearingId === item.eventId}
                              onClick={() => handleWithdraw(item.eventId, item.date)}
                              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 sm:self-center"
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
      )}

      {/* ===================================================================
          TAB 2: SECTION LEADER & ADMIN ROLL CALL OVERVIEW
          =================================================================== */}
      {isLeaderOrAdmin && activeTab === 'rollcall' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Controls Bar: Rehearsal Call Selector & Section Filter */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Event Selector */}
              <div className="flex-1 max-w-md">
                <label
                  htmlFor="rollcall-event-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1"
                >
                  Select Upcoming Rehearsal or Call
                </label>
                <div className="relative">
                  <select
                    id="rollcall-event-select"
                    value={rollCallEventId}
                    onChange={(e) => setRollCallEventId(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-950 focus:border-navy-900 focus:outline-none"
                  >
                    {upcomingEvents.map((ev) => (
                      <option key={ev.eventId} value={ev.eventId}>
                        {formatEventDate(ev.date)} — {ev.title} ({ev.time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Filter Pills (Admin can switch all, Section leader defaults to their section) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Section Filter
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(isAdmin ? (['All', ...SECTION_GROUPS] as const) : [singer.sectionGroup]).map(
                    (sec) => {
                      const isSelected = rollCallSection === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setRollCallSection(sec)}
                          className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            isSelected
                              ? 'bg-navy-900 text-white shadow-2xs'
                              : 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {sec}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Status Metrics Banner */}
            {selectedRollCallEvent && (
              <div className="pt-4 border-t border-stone-100">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Expected Present
                    </span>
                    <span className="mt-1 block text-2xl font-bold text-emerald-950">
                      {attendingCohortSingers.length}
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      of {activeCohortSingers.length} active {rollCallSection === 'All' ? 'singers' : `${rollCallSection}s`}
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 sm:p-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-rose-800">
                      Reported Absences
                    </span>
                    <span className="mt-1 block text-2xl font-bold text-rose-950">
                      {absentCohortList.length}
                    </span>
                    <span className="text-[11px] text-rose-700">
                      {absentCohortList.length === 1 ? '1 singer absent' : `${absentCohortList.length} singers absent`}
                    </span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 sm:p-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-amber-800">
                      Running Late
                    </span>
                    <span className="mt-1 block text-2xl font-bold text-amber-950">
                      {lateCohortList.length}
                    </span>
                    <span className="text-[11px] text-amber-700">
                      {lateCohortList.length === 1 ? '1 late notice' : `${lateCohortList.length} late notices`}
                    </span>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4">
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                      Total Roster
                    </span>
                    <span className="mt-1 block text-2xl font-bold text-navy-950">
                      {activeCohortSingers.length}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Active this cycle
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Attendance List */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Active Notices for This Event (Absences & Late ETAs) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-editorial text-xl font-bold text-navy-950">
                    Notices on File for this Call ({eventCohortRecords.length})
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">
                    {selectedRollCallEvent ? formatEventDate(selectedRollCallEvent.date) : ''}
                  </span>
                </div>

                {eventCohortRecords.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                    <h4 className="mt-2 text-base font-bold text-emerald-950">
                      100% Attendance on File!
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-emerald-800 max-w-md mx-auto">
                      All {activeCohortSingers.length} {rollCallSection === 'All' ? 'choir members' : `${rollCallSection} singers`} are currently marked present for this rehearsal call.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-stone-100">
                    {eventCohortRecords.map((item) => {
                      const isLate = item.status === 'Late';
                      return (
                        <li key={item.singerEmail} className="py-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-navy-950 text-base">
                                  {item.singerName}
                                </span>
                                <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700 border border-stone-200">
                                  {item.voicePart}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    isLate
                                      ? 'border border-amber-300 bg-amber-50 text-amber-900'
                                      : 'border border-rose-200 bg-rose-50 text-rose-800'
                                  }`}
                                >
                                  {isLate ? '🟡 Running Late' : '🔴 Full Absence'}
                                </span>
                              </div>

                              <p className="mt-1.5 text-sm text-stone-700 bg-stone-50/80 rounded-xl p-3 border border-stone-100">
                                <span className="font-medium text-stone-500 text-xs block mb-0.5">
                                  {isLate ? 'Estimated ETA / Reason:' : 'Absence Reason:'}
                                </span>
                                {item.reason || (isLate ? 'Running late' : 'Absence recorded')}
                              </p>
                            </div>

                            <a
                              href={`mailto:${item.singerEmail}?subject=Kantorei%20Rehearsal%20Check-In`}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 hover:text-navy-950 hover:bg-stone-50 transition"
                              title={`Email ${item.singerName}`}
                            >
                              <Mail className="h-3 w-3" />
                              <span>Email</span>
                            </a>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Right: Attending Roster Cohort */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-editorial text-xl font-bold text-navy-950">
                    Attending ({attendingCohortSingers.length})
                  </h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Present
                  </span>
                </div>

                <ul className="mt-3 max-h-[460px] overflow-y-auto divide-y divide-stone-100 pr-1">
                  {attendingCohortSingers.map((member) => (
                    <li
                      key={member.email}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                          ✓
                        </span>
                        <span className="font-medium text-navy-950">{member.name}</span>
                      </div>
                      <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
                        {member.voicePart}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
