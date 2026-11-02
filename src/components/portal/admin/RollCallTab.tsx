import { Clock, UserCheck, UserMinus } from 'lucide-react';
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
  attendanceForSelectedEvent: Map<string, AbsenceRecord>;
  busyEmail: string | null;
  onSetAttendance: (singer: Singer, status: 'Present' | 'Late' | 'Absent') => void;
}

export default function RollCallTab({
  selectedEventId,
  onSelectEventId,
  upcomingEvents,
  sectionFilter,
  onSectionFilterChange,
  activeSingers,
  attendanceForSelectedEvent,
  busyEmail,
  onSetAttendance,
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
            const lateCount = sectionSingers.filter(
              (s) => attendanceForSelectedEvent.get(s.email)?.status === 'Late'
            ).length;
            const absentCount = sectionSingers.filter(
              (s) => attendanceForSelectedEvent.get(s.email)?.status === 'Absent'
            ).length;
            const presentCount = sectionSingers.length - (lateCount + absentCount);
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
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-semibold">
                  {lateCount > 0 && (
                    <span className="text-amber-700">
                      🟡 {lateCount} late
                    </span>
                  )}
                  {absentCount > 0 && (
                    <span className="text-rose-700">
                      🔴 {absentCount} absent
                    </span>
                  )}
                  {lateCount === 0 && absentCount === 0 && (
                    <span className="text-emerald-700">
                      ✓ Full section
                    </span>
                  )}
                </div>
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
            const record = attendanceForSelectedEvent.get(s.email);
            const currentStatus: 'Present' | 'Late' | 'Absent' =
              record?.status === 'Late' ? 'Late' : record?.status === 'Absent' ? 'Absent' : 'Present';
            const isBusy = busyEmail === s.email;

            return (
              <li
                key={s.email}
                className={`flex flex-col gap-3 px-5 py-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                  currentStatus === 'Absent'
                    ? 'bg-rose-50/30'
                    : currentStatus === 'Late'
                    ? 'bg-amber-50/40'
                    : 'hover:bg-ivory-50/50'
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
                      {currentStatus === 'Late' && (
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          🟡 Running Late
                        </span>
                      )}
                      {currentStatus === 'Absent' && (
                        <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          🔴 Absent
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{s.email}</span>
                    {record?.reason && (
                      <p
                        className={`mt-0.5 text-xs font-medium ${
                          currentStatus === 'Late' ? 'text-amber-800' : 'text-rose-800'
                        }`}
                      >
                        {currentStatus === 'Late' ? 'ETA / Note: ' : 'Reason: '}
                        {record.reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3-way Segmented Roll Call Control */}
                <div className="flex items-center self-end sm:self-auto">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50/80 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetAttendance(s, 'Present')}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        currentStatus === 'Present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Mark Present"
                    >
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        <span>Present</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetAttendance(s, 'Late')}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        currentStatus === 'Late'
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Mark Running Late"
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Late</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetAttendance(s, 'Absent')}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                        currentStatus === 'Absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Mark Absent"
                    >
                      <span className="flex items-center gap-1">
                        <UserMinus className="h-3 w-3" />
                        <span>Absent</span>
                      </span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

