import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ScheduleEvent } from '../../../types/choir';

interface Props {
  event: ScheduleEvent | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: (event: ScheduleEvent) => void;
}

export default function DeleteEventModal({
  event,
  deleting,
  onClose,
  onConfirm,
}: Props) {
  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-rose-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <h3 className="font-editorial text-xl font-bold text-navy-950">
            Delete Calendar Call?
          </h3>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Are you sure you want to remove{' '}
          <strong className="text-navy-950">{event.title}</strong> on{' '}
          <span className="font-semibold text-navy-950">{event.date}</span>?
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          This will remove the event from the portal schedule, clear any claimed break hospitality slots, and update all subscribed calendar feeds.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onConfirm(event)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-rose-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete Call'}
          </button>
        </div>
      </div>
    </div>
  );
}

