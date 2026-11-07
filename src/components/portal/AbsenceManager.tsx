import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Mail,
  RotateCcw,
  Send,
} from 'lucide-react';
import type { AbsenceRecord, ScheduleEvent, SectionGroup, Singer } from '../../types/choir';
import { SECTION_GROUPS } from '../../types/choir';
import { formatEventDate, voicePartBadgeColor } from '../../lib/utils';

interface Props {
  singer: Singer;
  upcomingEvents: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
  allAbsences?: AbsenceRecord[];
  activeRoster?: Singer[];
}

const LATE_OPTIONS = [
  { label: '10–15 min late', text: 'Running 10–15 minutes late (traffic / commute)' },
  { label: '~30 min late', text: 'Running ~30 minutes late, arriving during rehearsal' },
  { label: 'Arriving by 7:30 PM', text: 'Delayed, arriving by 7:30 PM' },
  { label: 'Work running late', text: 'Work call running late, on my way shortly' },
  { label: 'Weather / Transit', text: 'Delayed due to weather or transit delay' },
];

const ABSENCE_OPTIONS = [
  { label: 'Illness / Vocal rest', text: 'Feeling unwell / resting voice' },
  { label: 'Travel / Out of town', text: 'Out of town / travel conflict' },
  { label: 'Work / Family conflict', text: 'Work or family commitment' },
  { label: 'Medical appointment', text: 'Medical appointment conflict' },
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
          ? `Late notice recorded for ${formatEventDate(saved.date)}. Your ${singer.sectionGroup} Section Leader and leadership team have been notified.`
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
          ? `Your running-late notice for ${formatEventDate(date)} has been withdrawn. Section leadership has been updated.`
          : `Your absence notice for ${formatEventDate(date)} has been withdrawn. Section leadership has been updated.`,
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

  const activePersonalCount = absences.filter((a) => a.status !== 'Cleared').length;

  return (
    <div className="space-y-8">
      {/* Role-Adaptive Editorial Underline Tabs */}
      {isLeaderOrAdmin && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200/90">
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`relative cursor-pointer pb-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                activeTab === 'my'
                  ? 'text-navy-950'
                  : 'text-stone-500 hover:text-navy-950'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>My Attendance</span>
                {activePersonalCount > 0 && (
                  <span className="rounded-sm bg-[#f7ebe8] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#84372d]">
                    {activePersonalCount}
                  </span>
                )}
              </span>
              {activeTab === 'my' && (
                <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-copper-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rollcall')}
              className={`relative cursor-pointer pb-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                activeTab === 'rollcall'
                  ? 'text-navy-950'
                  : 'text-stone-500 hover:text-navy-950'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>
                  {isAdmin
                    ? 'Ensemble Roll Call'
                    : `${singer.sectionGroup} Section Roll Call`}
                </span>
                {eventCohortRecords.length > 0 && (
                  <span className="rounded-sm bg-[#f8efe2] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#7d5220]">
                    {eventCohortRecords.length}
                  </span>
                )}
              </span>
              {activeTab === 'rollcall' && (
                <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-copper-600" />
              )}
            </button>
          </div>

          <p className="hidden pb-3 text-[11px] font-medium uppercase tracking-[0.15em] text-stone-400 sm:block">
            {isAdmin
              ? 'Full Ensemble Overview'
              : `${singer.sectionGroup} Section Roster`}
          </p>
        </div>
      )}

      {/* ===================================================================
          TAB 1: PERSONAL ATTENDANCE (Submit form & personal notices)
          =================================================================== */}
      {(!isLeaderOrAdmin || activeTab === 'my') && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Submit / Update Absence Form */}
          <div className="lg:col-span-6">
            <div className="rounded-sm border border-stone-200/90 bg-white p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
                Attendance Notice
              </p>
              <h2 className="mt-1 font-editorial text-2xl font-normal text-navy-950 sm:text-3xl">
                Report Absence or Late Arrival
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                Submitting notifies the Artistic Director, attendance administration, and your{' '}
                <strong className="font-semibold text-navy-950">{singer.sectionGroup}</strong> Section Leader automatically.
              </p>

              {feedback && (
                <div
                  className={`mt-5 flex items-start gap-2.5 rounded-sm border p-3.5 text-sm ${
                    feedback.type === 'success'
                      ? 'border-stone-300 bg-[#FAF7F2] text-navy-950'
                      : 'border-[#e4c4bc] bg-[#f7ebe8] text-[#84372d]'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-copper-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#84372d]" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {/* 2-mode toggle: Full Absence vs Running Late */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                    Notice Type
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-sm border border-stone-300/90 bg-[#FAF7F2] p-1">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('Absent')}
                      className={`cursor-pointer rounded-sm py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        statusType === 'Absent'
                          ? 'bg-navy-950 text-white'
                          : 'text-stone-600 hover:text-navy-950'
                      }`}
                    >
                      Full Absence
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('Late')}
                      className={`cursor-pointer rounded-sm py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        statusType === 'Late'
                          ? 'bg-copper-600 text-white'
                          : 'text-stone-600 hover:text-navy-950'
                      }`}
                    >
                      Running Late
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="absence-event"
                    className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"
                  >
                    Rehearsal or Performance Call
                  </label>
                  <select
                    id="absence-event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                  >
                    {upcomingEvents.map((ev) => {
                      const existingRecord = activeRecordMap.get(ev.eventId);
                      return (
                        <option key={ev.eventId} value={ev.eventId}>
                          {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                          {existingRecord
                            ? existingRecord.status === 'Late'
                              ? ' · Marked Running Late'
                              : ' · Marked Absent'
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {existingForSelected && (
                  <div className="rounded-sm border border-copper-300/80 bg-[#f9efe8]/60 px-3.5 py-2.5 text-xs leading-relaxed text-navy-950">
                    You currently have a {existingForSelected.status === 'Late' ? 'running-late' : 'absence'} notice on file for this date (
                    <em className="text-stone-700">&ldquo;{existingForSelected.reason}&rdquo;</em>). Submitting below will update your existing entry.
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="absence-reason"
                      className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"
                    >
                      {statusType === 'Late' ? 'Estimated Arrival / Note' : 'Reason / Note'}{' '}
                      <span className="font-normal lowercase tracking-normal text-stone-400">(optional)</span>
                    </label>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-stone-400">Quick Select</span>
                  </div>

                  {/* Quick Reason Chips */}
                  <div className="mt-2 mb-2.5 flex flex-wrap gap-1.5">
                    {(statusType === 'Late' ? LATE_OPTIONS : ABSENCE_OPTIONS).map((chip) => {
                      const isSelected = reason === chip.text;
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setReason(chip.text)}
                          className={`cursor-pointer rounded-sm border px-2.5 py-1 text-xs transition ${
                            isSelected
                              ? 'border-navy-950 bg-navy-950 font-medium text-white'
                              : 'border-stone-200/90 bg-[#FAF7F2] text-stone-700 hover:border-stone-400 hover:text-navy-950'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    id="absence-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      statusType === 'Late'
                        ? 'e.g. ETA 7:25 PM, traffic delay on I-94'
                        : 'Select a quick note above or enter details…'
                    }
                    className="w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || upcomingEvents.length === 0}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition disabled:opacity-60 ${
                    statusType === 'Late'
                      ? 'bg-copper-600 hover:bg-copper-700'
                      : 'bg-navy-950 hover:bg-navy-900'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting
                    ? 'Recording Notice…'
                    : existingForSelected
                      ? statusType === 'Late'
                        ? 'Update Late Notice'
                        : 'Update Absence Notice'
                      : statusType === 'Late'
                        ? 'Submit Late Notice'
                        : 'Submit Absence Notice'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Singer's Personal Absence History */}
          <div className="lg:col-span-6">
            <div className="rounded-sm border border-stone-200/90 bg-white p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Season Record
              </p>
              <h2 className="mt-1 font-editorial text-2xl font-normal text-navy-950 sm:text-3xl">
                Logged Notices
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                If your schedule clears, withdraw a notice below so your section&apos;s stage formation count stays accurate.
              </p>

              {absences.length === 0 ? (
                <div className="mt-6 rounded-sm border border-stone-200/80 bg-[#FAF7F2] px-6 py-10 text-center">
                  <p className="font-editorial text-xl text-navy-950">
                    Full Attendance on File
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    No absences or late arrival notices have been recorded this season.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-stone-200/80 border-t border-stone-200/80">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-editorial text-lg font-medium text-navy-950">
                                {formatEventDate(item.date)}
                              </span>
                              <span
                                className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                  isCleared
                                    ? 'border-stone-200 bg-stone-100 text-stone-500 line-through'
                                    : isLate
                                      ? 'border-[#e6d5bc] bg-[#f8efe2] text-[#7d5220]'
                                      : 'border-[#e4c4bc] bg-[#f7ebe8] text-[#84372d]'
                                }`}
                              >
                                {isCleared ? 'Withdrawn' : isLate ? 'Running Late' : 'Absent'}
                              </span>
                            </div>
                            {item.reason && (
                              <p className="mt-1 text-sm text-stone-600">{item.reason}</p>
                            )}
                            <p className="mt-0.5 text-[11px] text-stone-400">
                              Recorded via {item.submittedBy}
                            </p>
                          </div>

                          {!isCleared && (
                            <button
                              type="button"
                              disabled={clearingId === item.eventId}
                              onClick={() => handleWithdraw(item.eventId, item.date)}
                              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950 sm:self-center"
                            >
                              <RotateCcw className="h-3 w-3" />
                              {clearingId === item.eventId
                                ? 'Withdrawing…'
                                : 'Withdraw'}
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
        <div className="space-y-6">
          {/* Controls & Ledger Strip */}
          <div className="rounded-sm border border-stone-200/90 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              {/* Event Selector */}
              <div className="max-w-md flex-1">
                <label
                  htmlFor="rollcall-event-select"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"
                >
                  Rehearsal or Performance Call
                </label>
                <select
                  id="rollcall-event-select"
                  value={rollCallEventId}
                  onChange={(e) => setRollCallEventId(e.target.value)}
                  className="w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-navy-950 focus:border-navy-950 focus:outline-none"
                >
                  {upcomingEvents.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {formatEventDate(ev.date)} — {ev.title} ({ev.time})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                  Section Cohort
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {(isAdmin ? (['All', ...SECTION_GROUPS] as const) : [singer.sectionGroup]).map(
                    (sec) => {
                      const isSelected = rollCallSection === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setRollCallSection(sec)}
                          className={`cursor-pointer rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            isSelected
                              ? 'border-navy-950 bg-navy-950 text-white'
                              : 'border-stone-200/90 bg-[#FAF7F2] text-stone-700 hover:border-stone-400 hover:text-navy-950'
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

            {/* 4-Column Hairline Numerical Ledger */}
            {selectedRollCallEvent && (
              <div className="mt-6 grid grid-cols-2 divide-y divide-stone-200/80 border-t border-stone-200/90 pt-5 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="pb-3 sm:pr-5 sm:pb-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Expected Present
                  </span>
                  <span className="mt-1 block font-editorial text-3xl font-normal tabular-nums text-navy-950">
                    {attendingCohortSingers.length}
                  </span>
                  <span className="text-xs text-stone-500">
                    of {activeCohortSingers.length} active {rollCallSection === 'All' ? 'singers' : `${rollCallSection}s`}
                  </span>
                </div>

                <div className="pb-3 sm:px-5 sm:pb-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Reported Absences
                  </span>
                  <span
                    className={`mt-1 block font-editorial text-3xl font-normal tabular-nums ${
                      absentCohortList.length > 0 ? 'text-[#84372d]' : 'text-navy-950'
                    }`}
                  >
                    {absentCohortList.length}
                  </span>
                  <span className="text-xs text-stone-500">
                    {absentCohortList.length === 1 ? '1 singer absent' : `${absentCohortList.length} singers absent`}
                  </span>
                </div>

                <div className="pt-3 sm:px-5 sm:pt-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Running Late
                  </span>
                  <span
                    className={`mt-1 block font-editorial text-3xl font-normal tabular-nums ${
                      lateCohortList.length > 0 ? 'text-copper-600' : 'text-navy-950'
                    }`}
                  >
                    {lateCohortList.length}
                  </span>
                  <span className="text-xs text-stone-500">
                    {lateCohortList.length === 1 ? '1 late arrival' : `${lateCohortList.length} late arrivals`}
                  </span>
                </div>

                <div className="pt-3 sm:pl-5 sm:pt-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Active Roster
                  </span>
                  <span className="mt-1 block font-editorial text-3xl font-normal tabular-nums text-navy-950">
                    {activeCohortSingers.length}
                  </span>
                  <span className="text-xs text-stone-500">
                    Current concert cycle
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section Attendance Split */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Active Notices for This Event */}
            <div className="lg:col-span-7">
              <div className="rounded-sm border border-stone-200/90 bg-white p-6">
                <div className="flex items-baseline justify-between border-b border-stone-200/80 pb-3">
                  <h3 className="font-editorial text-2xl font-normal text-navy-950">
                    Notices on File ({eventCohortRecords.length})
                  </h3>
                  <span className="text-xs text-stone-500">
                    {selectedRollCallEvent ? formatEventDate(selectedRollCallEvent.date) : ''}
                  </span>
                </div>

                {eventCohortRecords.length === 0 ? (
                  <div className="mt-6 rounded-sm border border-stone-200/80 bg-[#FAF7F2] px-6 py-10 text-center">
                    <p className="font-editorial text-2xl text-navy-950">
                      Full Attendance on File
                    </p>
                    <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-stone-600">
                      All {activeCohortSingers.length} {rollCallSection === 'All' ? 'ensemble members' : `${rollCallSection} singers`} are expected on time for this call.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-200/80">
                    {eventCohortRecords.map((item) => {
                      const isLate = item.status === 'Late';
                      return (
                        <li key={item.singerEmail} className="py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-editorial text-lg font-medium text-navy-950">
                                  {item.singerName}
                                </span>
                                <span
                                  className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${voicePartBadgeColor(
                                    item.voicePart
                                  )}`}
                                >
                                  {item.voicePart}
                                </span>
                                <span
                                  className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                    isLate
                                      ? 'border-[#e6d5bc] bg-[#f8efe2] text-[#7d5220]'
                                      : 'border-[#e4c4bc] bg-[#f7ebe8] text-[#84372d]'
                                  }`}
                                >
                                  {isLate ? 'Running Late' : 'Absent'}
                                </span>
                              </div>

                              <p className="mt-2 border-l-2 border-stone-300 pl-3 text-sm text-stone-700">
                                {item.reason || (isLate ? 'Running late' : 'Absence recorded')}
                              </p>
                            </div>

                            <a
                              href={`mailto:${item.singerEmail}?subject=Kantorei%20Rehearsal%20Check-In`}
                              className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600 transition hover:border-navy-950 hover:text-navy-950"
                              title={`Email ${item.singerName}`}
                            >
                              <Mail className="h-3 w-3 text-copper-600" />
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
              <div className="rounded-sm border border-stone-200/90 bg-white p-6">
                <div className="flex items-baseline justify-between border-b border-stone-200/80 pb-3">
                  <h3 className="font-editorial text-2xl font-normal text-navy-950">
                    Expected Present ({attendingCohortSingers.length})
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Roll Sheet
                  </span>
                </div>

                <ul className="mt-2 max-h-[460px] divide-y divide-stone-100 overflow-y-auto pr-1">
                  {attendingCohortSingers.map((member) => (
                    <li
                      key={member.email}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Check className="h-3.5 w-3.5 shrink-0 text-copper-600" />
                        <span className="text-navy-950">{member.name}</span>
                      </div>
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${voicePartBadgeColor(
                          member.voicePart
                        )}`}
                      >
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
