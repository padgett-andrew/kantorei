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
    <div className="rounded-sm border border-stone-200/90 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Left: Chart Selection & Season */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-60">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Formation Chart
            </label>
            <select
              value={activeChartId}
              onChange={(e) => setActiveChartId(e.target.value)}
              className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-navy-950 focus:border-navy-950 focus:outline-none"
            >
              {charts.map((chart) => (
                <option key={chart.id} value={chart.id}>
                  {chart.title} ({chart.season}) {chart.status === 'Draft' ? '· Draft' : ''}
                </option>
              ))}
            </select>
          </div>

          {activeChart && (
            <div className="flex items-center gap-2 self-end pb-1">
              <span
                className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  activeChart.status === 'Published'
                    ? 'border-[#c8d8ce] bg-[#eef3f0] text-[#2d523d]'
                    : 'border-[#e6d5bc] bg-[#f8efe2] text-[#7d5220]'
                }`}
              >
                {activeChart.status}
              </span>

              {activeChart.concertSlug && (
                <span className="hidden rounded-sm border border-stone-200 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-600 sm:inline-block">
                  {activeChart.concertTitle || activeChart.concertSlug}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Mode Switcher & Admin Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View / Attendance / Edit Mode Toggle */}
          <div className="flex rounded-sm border border-stone-300/90 bg-[#FAF7F2] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode('view')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${
                mode === 'view'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View</span>
            </button>

            {canTakeAttendance && (
              <button
                type="button"
                onClick={() => setMode('attendance')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${
                  mode === 'attendance'
                    ? 'bg-navy-950 text-white'
                    : 'text-stone-600 hover:text-navy-950'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Roll Call</span>
              </button>
            )}

            {canManageCharts && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${
                  mode === 'edit'
                    ? 'bg-navy-950 text-white'
                    : 'text-stone-600 hover:text-navy-950'
                }`}
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Layout</span>
              </button>
            )}
          </div>

          {/* Create New Chart Button (Admin only) */}
          {canManageCharts && (
            <button
              type="button"
              onClick={onNewChart}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-navy-950 bg-navy-950 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-navy-900"
            >
              <Plus className="h-3.5 w-3.5 text-copper-400" />
              <span>New Chart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
