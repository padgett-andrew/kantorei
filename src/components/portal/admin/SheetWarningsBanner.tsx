import { AlertTriangle } from 'lucide-react';
import type { SheetWarning } from '../../../types/choir';

interface Props {
  warnings: SheetWarning[];
}

export default function SheetWarningsBanner({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        Google Sheet Data-Health Warnings ({warnings.length})
      </div>
      <p className="mt-1 text-xs text-amber-900">
        These rows had formatting issues and were safely skipped so the website stayed online:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-950">
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

