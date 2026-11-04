import { X } from 'lucide-react';
import type { SeatingRow, SeatingSeat, Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';

interface Props {
  target: { seat: SeatingSeat; row: SeatingRow } | null;
  unassignedSingers: Singer[];
  onAssign: (singer: Singer, target: { seat: SeatingSeat; row: SeatingRow }) => void;
  onClose: () => void;
}

export default function SingerPickerModal({
  target,
  unassignedSingers,
  onAssign,
  onClose,
}: Props) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="font-bold text-navy-950">
              Assign Singer to {target.row.name}, Seat #{target.seat.seatIndex}
            </h3>
            <p className="text-xs text-zinc-500">Pick from unassigned choir members:</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3.5 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {unassignedSingers.map((singer) => {
            const badgeClass = voicePartBadgeColor(singer.voicePart);
            return (
              <button
                key={singer.email}
                type="button"
                onClick={() => onAssign(singer, target)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 text-left text-xs transition hover:border-gold-500 hover:bg-amber-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}>
                    {singer.voicePart}
                  </span>
                  <span className="font-semibold text-zinc-900">{singer.name}</span>
                </div>
                <span className="text-[11px] font-semibold text-gold-600">Assign</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

