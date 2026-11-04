import { Calendar, Check, Clock, UserX } from 'lucide-react';
import type { ScheduleEvent, SectionGroup } from '../../../types/choir';

export interface MissingSingerItem {
  singerName: string;
  voicePart: string;
  status: 'Absent' | 'Late';
  reason?: string;
}

export interface SectionHeadcountItem {
  section: SectionGroup;
  total: number;
  present: number;
  absent: number;
  late: number;
}

interface Props {
  scheduleList: ScheduleEvent[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  missingSingers: MissingSingerItem[];
  sectionHeadcounts: SectionHeadcountItem[];
  sectionFilter: 'All' | SectionGroup;
  onToggleSectionFilter: (section: SectionGroup) => void;
}

export default function AttendanceStatsBar({
  scheduleList,
  selectedEventId,
  onSelectEvent,
  presentCount,
  absentCount,
  lateCount,
  missingSingers,
  sectionHeadcounts,
  sectionFilter,
  onToggleSectionFilter,
}: Props) {
  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Event Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Rehearsal / Concert Call
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-950 focus:outline-hidden"
            >
              {scheduleList.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.date} — {ev.title} ({ev.time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Attendance Stats Counter Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            Present: {presentCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-rose-800">
            <UserX className="h-3.5 w-3.5" />
            Absent: {absentCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            Late: {lateCount}
          </span>
        </div>
      </div>

      {/* Section Attendance Headcounts */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sectionHeadcounts.map((sec) => {
          const isSelected = sectionFilter === sec.section;
          return (
            <button
              key={sec.section}
              type="button"
              onClick={() => onToggleSectionFilter(sec.section)}
              className={`cursor-pointer rounded-xl border p-2.5 text-left transition ${
                isSelected
                  ? 'border-navy-900 bg-navy-900 text-white shadow-xs'
                  : 'border-emerald-200/90 bg-white/90 hover:border-emerald-400'
              }`}
              title={`Filter seating & attendance to ${sec.section}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-navy-950'}`}>
                  {sec.section}
                </span>
                <span className={`text-[10px] font-semibold ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {sec.total} active
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={isSelected ? 'font-bold text-emerald-300' : 'font-semibold text-emerald-700'}>
                  {sec.present} here
                </span>
                {(sec.late > 0 || sec.absent > 0) && (
                  <span className={isSelected ? 'text-zinc-300' : 'text-zinc-500'}>
                    {sec.late > 0 && <span className={isSelected ? 'text-amber-300' : 'text-amber-700'}>{sec.late} late</span>}
                    {sec.late > 0 && sec.absent > 0 && ' · '}
                    {sec.absent > 0 && <span className={isSelected ? 'text-rose-300' : 'text-rose-700'}>{sec.absent} out</span>}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Missing List (if any absences/lates logged) */}
      {missingSingers.length > 0 && (
        <div className="mt-3.5 border-t border-emerald-200/80 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
            Reported Absent or Late for this Call:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingSingers.map((m, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                  m.status === 'Absent'
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}
                title={m.reason}
              >
                <span>{m.singerName} ({m.voicePart})</span>
                <span className="text-[10px] uppercase font-bold opacity-75">
                  · {m.status}
                </span>
                {m.reason && <span className="text-[10px] italic">({m.reason})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

