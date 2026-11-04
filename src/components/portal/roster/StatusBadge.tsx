import type { SingerStatus } from '../../../types/choir';

interface Props {
  status: SingerStatus;
}

export default function StatusBadge({ status }: Props) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        Active
      </span>
    );
  }
  if (status === 'On_Leave') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-900 ring-1 ring-indigo-200">
        Season Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 ring-1 ring-zinc-200">
      Inactive
    </span>
  );
}

