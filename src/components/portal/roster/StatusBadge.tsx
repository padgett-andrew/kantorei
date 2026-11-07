import type { SingerStatus } from '../../../types/choir';

interface Props {
  status: SingerStatus;
}

export default function StatusBadge({ status }: Props) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4a7c5d]" aria-hidden="true" />
        Active
      </span>
    );
  }
  if (status === 'On_Leave') {
    return (
      <span className="inline-flex items-center rounded-sm border border-[#e6d5bc] bg-[#f8efe2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d5220]">
        Season Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-sm border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
      Inactive
    </span>
  );
}
