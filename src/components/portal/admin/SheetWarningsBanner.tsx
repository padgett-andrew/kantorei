import { AlertTriangle } from 'lucide-react';
import type { SheetWarning } from '../../../types/choir';

interface Props {
  warnings: SheetWarning[];
}

export default function SheetWarningsBanner({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="rounded-sm border border-[#e6d5bc] border-l-2 border-l-copper-600 bg-[#f8efe2]/70 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7d5220]">
        <AlertTriangle className="h-4 w-4 text-copper-700" />
        Sheet Formatting Notices ({warnings.length})
      </div>
      <p className="mt-1 text-xs text-stone-700">
        The following rows had formatting issues and were safely skipped:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-navy-950">
        {warnings.map((w, idx) => (
          <li key={idx}>
            <strong>
              {w.tab} Row {w.rowNumber}:
            </strong>{' '}
            {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
