import { Copy, Save, Share2, Trash2 } from 'lucide-react';

interface Props {
  chartTitle?: string;
  chartStatus?: 'Draft' | 'Published';
  rowCount: number;
  hasUnsavedChanges: boolean;
  savingChart: boolean;
  onSetRowCount: (count: number) => void;
  onSaveChart: (publishStatus?: 'Draft' | 'Published') => void;
  onDuplicateChart: () => void;
  onDeleteChart: () => void;
}

export default function EditChartActionBar({
  chartTitle,
  chartStatus,
  rowCount,
  hasUnsavedChanges,
  savingChart,
  onSetRowCount,
  onSaveChart,
  onDuplicateChart,
  onDeleteChart,
}: Props) {
  return (
    <div className="rounded-sm border border-stone-200/90 border-l-2 border-l-copper-500 bg-[#FAF7F2] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
            Formation Layout Editor
          </p>
          <h3 className="mt-0.5 font-editorial text-xl font-normal text-navy-950">
            {chartTitle}
          </h3>
          <p className="mt-0.5 text-xs text-stone-600">
            Drag singers between seats or from the unassigned pool below. Click an empty seat to assign, or click two seats to swap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Row Count Stepper */}
          <div className="flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-2.5 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rows</span>
            <button
              type="button"
              onClick={() => onSetRowCount(rowCount - 1)}
              disabled={rowCount <= 1}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm border border-stone-200 bg-[#FAF7F2] text-xs font-bold text-stone-700 hover:bg-stone-200/70 disabled:opacity-40"
              title="Decrease rows"
            >
              -
            </button>
            <span className="min-w-5 text-center text-xs font-semibold tabular-nums text-navy-950">
              {rowCount}
            </span>
            <button
              type="button"
              onClick={() => onSetRowCount(rowCount + 1)}
              disabled={rowCount >= 12}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm border border-stone-200 bg-[#FAF7F2] text-xs font-bold text-stone-700 hover:bg-stone-200/70 disabled:opacity-40"
              title="Increase rows"
            >
              +
            </button>
          </div>

          {hasUnsavedChanges && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-copper-700">
              · Unsaved Changes
            </span>
          )}

          <button
            type="button"
            disabled={savingChart}
            onClick={() => onSaveChart()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-950 transition hover:border-navy-950 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 text-copper-600" />
            <span>Save</span>
          </button>

          {chartStatus === 'Draft' ? (
            <button
              type="button"
              disabled={savingChart}
              onClick={() => onSaveChart('Published')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-navy-900 disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5 text-copper-400" />
              <span>Publish</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={savingChart}
              onClick={() => onSaveChart('Draft')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-[#e6d5bc] bg-[#f8efe2] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7d5220] transition hover:border-copper-500 disabled:opacity-50"
            >
              <span>Revert to Draft</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDuplicateChart}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
            title="Duplicate Chart"
          >
            <Copy className="h-3.5 w-3.5 text-stone-500" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={onDeleteChart}
            className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-[#e4c4bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#84372d] transition hover:bg-[#f7ebe8]"
            title="Delete Chart"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
