import { UserCheck, UserMinus } from 'lucide-react';
import {
  SECTION_GROUPS,
  type AbsenceRecord,
  type ScheduleEvent,
  type SectionGroup,
  type Singer,
} from '../../../types/choir';
import { formatEventDate, voicePartBadgeColor } from '../../../lib/utils';

interface Props {
  selectedEventId: string;
  onSelectEventId: (eventId: string) => void;
  upcomingEvents: ScheduleEvent[];
  sectionFilter: 'All' | SectionGroup;
  onSectionFilterChange: (section: 'All' | SectionGroup) => void;
  activeSingers: Singer[];
  absentForSelectedEvent: Map<string, AbsenceRecord>;
  busyEmail: string | null;
  onToggleAttendance: (singer: Singer, wasAbsent: boolean) => void;
}

export default function RollCallTab({
  selectedEventId,
  onSelectEventId,
  upcomingEvents,
  sectionFilter,
  onSectionFilterChange,
  activeSingers,
  absentForSelectedEvent,
  busyEmail,
  onToggleAttendance,
}: Props) {
  const visibleRollCallSingers = activeSingers.filter(
    (s) => sectionFilter === 'All' || s.sectionGroup === sectionFilter
  );

  return (
    <div className="space-y-5">
      {/* Event Selector + Section Headcount Cards */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label
              htmlFor="rollcall-event"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Select Rehearsal or Performance
            </label>
            <select
              id="rollcall-event"
              value={selectedEventId}
              onChange={(e) => onSelectEventId(e.target.value)}
              className="mt-1.5 w-full max-w-lg rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:border-navy-900 focus:bg-white focus:outline-none"
            >
              {upcomingEvents.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', ...SECTION_GROUPS] as const).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onSectionFilterChange(sec)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                  sectionFilter === sec
                    ? 'bg-navy-900 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Metrics by Section */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTION_GROUPS.map((sec) => {
            const sectionSingers = activeSingers.filter((s) => s.sectionGroup === sec);
            const absentCount = sectionSingers.filter((s) =>
              absentForSelectedEvent.has(s.email)
            ).length;
            const presentCount = sectionSingers.length - absentCount;
            return (
              <div
                key={sec}
                className="rounded-2xl border border-zinc-200/80 bg-ivory-50/60 p-3.5"
              >
                <span className="text-xs font-bold text-navy-950">{sec}</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-editorial text-2xl font-bold text-navy-950">
                    {presentCount}
                  </span>
                  <span className="text-xs text-zinc-500">
                    / {sectionSingers.length} present
                  </span>
                </div>
                {absentCount > 0 && (
                  <span className="mt-1 block text-[11px] font-medium text-amber-700">
                    {absentCount} reported absent
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Roll Call Singer Checklist */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
        <div className="border-b border-zinc-100 bg-ivory-50/80 px-5 py-3.5 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Active Singers ({visibleRollCallSingers.length})
          </span>
        </div>

        <ul className="divide-y divide-zinc-100">
          {visibleRollCallSingers.map((s) => {
            const isAbsent = absentForSelectedEvent.has(s.email);
            const absenceInfo = absentForSelectedEvent.get(s.email);
            const isBusy = busyEmail === s.email;

            return (
              <li
                key={s.email}
                className={`flex flex-col gap-3 px-5 py-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                  isAbsent ? 'bg-amber-50/40' : 'hover:bg-ivory-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${voicePartBadgeColor(
                      s.voicePart
                    )}`}
                  >
                    {s.voicePart}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm font-bold text-navy-950">
                        {s.name}
                      </span>
                      {s.role !== 'Singer' && (
                        <span className="rounded-md bg-gold-100 px-1.5 py-0.5 text-[10px] font-semibold text-gold-900">
                          {s.role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{s.email}</span>
                    {isAbsent && absenceInfo?.reason && (
                      <p className="mt-0.5 text-xs font-medium text-amber-800">
                        Note: {absenceInfo.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isAbsent ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onToggleAttendance(s, true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {isBusy ? 'Updating…' : 'Mark Present'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onToggleAttendance(s, false)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-60"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {isBusy ? 'Saving…' : 'Mark Absent'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

