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
    <div className="rounded-sm border border-stone-200/90 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Event Selector */}
        <div className="min-w-64">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
            Roll Call Rehearsal / Performance
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => onSelectEvent(e.target.value)}
            className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-navy-950 focus:border-navy-950 focus:outline-none"
          >
            {scheduleList.map((ev) => (
              <option key={ev.eventId} value={ev.eventId}>
                {ev.date} — {ev.title} ({ev.time})
              </option>
            ))}
          </select>
        </div>

        {/* Tabular Attendance Totals */}
        <div className="flex flex-wrap items-center gap-5 border-t border-stone-200/80 pt-3 sm:border-t-0 sm:pt-0">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Present
            </span>
            <span className="font-editorial text-2xl font-normal tabular-nums text-navy-950">
              {presentCount}
            </span>
          </div>
          <div className="h-7 w-px bg-stone-200" aria-hidden="true" />
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Late
            </span>
            <span className="font-editorial text-2xl font-normal tabular-nums text-copper-600">
              {lateCount}
            </span>
          </div>
          <div className="h-7 w-px bg-stone-200" aria-hidden="true" />
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Absent
            </span>
            <span className="font-editorial text-2xl font-normal tabular-nums text-[#84372d]">
              {absentCount}
            </span>
          </div>
        </div>
      </div>

      {/* Section Attendance Headcounts */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-stone-200/80 pt-4 sm:grid-cols-4">
        {sectionHeadcounts.map((sec) => {
          const isSelected = sectionFilter === sec.section;
          return (
            <button
              key={sec.section}
              type="button"
              onClick={() => onToggleSectionFilter(sec.section)}
              className={`cursor-pointer rounded-sm border p-3 text-left transition ${
                isSelected
                  ? 'border-navy-950 bg-navy-950 text-white'
                  : 'border-stone-200/90 bg-[#FAF7F2] hover:border-stone-400'
              }`}
              title={`Filter seating & attendance to ${sec.section}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${isSelected ? 'text-white' : 'text-navy-950'}`}>
                  {sec.section}
                </span>
                <span className={`text-[10px] tabular-nums ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {sec.total} total
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-xs tabular-nums">
                <span className={isSelected ? 'font-medium text-copper-300' : 'font-medium text-navy-950'}>
                  {sec.present} present
                </span>
                {(sec.late > 0 || sec.absent > 0) && (
                  <span className={`text-[11px] ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                    {sec.late > 0 && <span>{sec.late} late</span>}
                    {sec.late > 0 && sec.absent > 0 && ' · '}
                    {sec.absent > 0 && <span>{sec.absent} out</span>}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Missing List */}
      {missingSingers.length > 0 && (
        <div className="mt-4 border-t border-stone-200/80 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Notices Recorded for This Call
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingSingers.map((m, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-xs ${
                  m.status === 'Absent'
                    ? 'border-[#e4c4bc] bg-[#f7ebe8] text-[#84372d]'
                    : 'border-[#e6d5bc] bg-[#f8efe2] text-[#7d5220]'
                }`}
                title={m.reason}
              >
                <span className="font-medium">{m.singerName} ({m.voicePart})</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  · {m.status}
                </span>
                {m.reason && <span className="text-[11px] italic opacity-90">({m.reason})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
