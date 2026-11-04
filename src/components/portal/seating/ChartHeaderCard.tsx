import { Edit, Eye, Plus, UserCheck } from 'lucide-react';
import type { SeatingChart } from '../../../types/choir';
import type { SeatingMode } from './types';

interface Props {
  charts: SeatingChart[];
  activeChartId: string;
  setActiveChartId: (id: string) => void;
  activeChart: SeatingChart | null;
  mode: SeatingMode;
  setMode: (mode: SeatingMode) => void;
  canTakeAttendance: boolean;
  canManageCharts: boolean;
  onNewChart: () => void;
}

export default function ChartHeaderCard({
  charts,
  activeChartId,
  setActiveChartId,
  activeChart,
  mode,
  setMode,
  canTakeAttendance,
  canManageCharts,
  onNewChart,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Chart Selection & Season */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-56">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Select Seating Chart
            </label>
            <select
              value={activeChartId}
              onChange={(e) => setActiveChartId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-sm font-bold text-navy-950 focus:border-navy-900 focus:outline-hidden"
            >
              {charts.map((chart) => (
                <option key={chart.id} value={chart.id}>
                  {chart.title} ({chart.season}) {chart.status === 'Draft' ? '— [Draft]' : ''}
                </option>
              ))}
            </select>
          </div>

          {activeChart && (
            <div className="flex items-center gap-1.5 self-end pb-0.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  activeChart.status === 'Published'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {activeChart.status}
              </span>

              {activeChart.concertSlug && (
                <span className="hidden sm:inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                  {activeChart.concertTitle || activeChart.concertSlug}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Mode Switcher & Admin Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View / Attendance / Edit Mode Toggle Pills */}
          <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('view')}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                mode === 'view'
                  ? 'bg-white text-navy-950 shadow-2xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>

            {canTakeAttendance && (
              <button
                type="button"
                onClick={() => setMode('attendance')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  mode === 'attendance'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Attendance</span>
              </button>
            )}

            {canManageCharts && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  mode === 'edit'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Edit className="h-3.5 w-3.5 text-gold-600" />
                <span>Edit Layout</span>
              </button>
            )}
          </div>

          {/* Create New Chart Button (Admin only) */}
          {canManageCharts && (
            <button
              type="button"
              onClick={onNewChart}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-navy-900"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Chart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

