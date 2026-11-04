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
    <div className="rounded-2xl border border-gold-300 bg-amber-50/40 p-4 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-navy-950">
            Layout Editor: {chartTitle}
          </h3>
          <p className="text-xs text-zinc-600">
            Drag and drop singers between seats or to/from the pool below. Click an empty seat to assign from the roster, or click two seats to swap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Row Count Stepper */}
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-2.5 py-1 shadow-2xs">
            <span className="text-xs font-semibold text-zinc-600">Rows:</span>
            <button
              type="button"
              onClick={() => onSetRowCount(rowCount - 1)}
              disabled={rowCount <= 1}
              className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
              title="Decrease rows"
            >
              -
            </button>
            <span className="min-w-5 text-center text-xs font-bold text-navy-950">
              {rowCount}
            </span>
            <button
              type="button"
              onClick={() => onSetRowCount(rowCount + 1)}
              disabled={rowCount >= 12}
              className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
              title="Increase rows"
            >
              +
            </button>
          </div>

          {hasUnsavedChanges && (
            <span className="text-xs font-bold text-amber-700 animate-pulse">
              ● Unsaved changes
            </span>
          )}

          <button
            type="button"
            disabled={savingChart}
            onClick={() => onSaveChart()}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs hover:bg-zinc-50 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Layout</span>
          </button>

          {chartStatus === 'Draft' ? (
            <button
              type="button"
              disabled={savingChart}
              onClick={() => onSaveChart('Published')}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Publish to Singers</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={savingChart}
              onClick={() => onSaveChart('Draft')}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-200 disabled:opacity-50"
            >
              <span>Revert to Draft</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDuplicateChart}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            title="Duplicate Chart"
          >
            <Copy className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={onDeleteChart}
            className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            title="Delete Chart"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

