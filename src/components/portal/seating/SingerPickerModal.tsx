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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-sm border border-stone-300 bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-stone-200/90 bg-white px-5 py-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              Seat Assignment
            </span>
            <h3 className="mt-0.5 font-editorial text-2xl font-normal text-navy-950">
              {target.row.name}, Seat #{target.seat.seatIndex}
            </h3>
            <p className="text-xs text-stone-500">Select an unassigned ensemble member:</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-sm p-1 text-stone-400 hover:bg-stone-100 hover:text-navy-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto p-5">
          {unassignedSingers.length === 0 ? (
            <p className="py-4 text-center text-xs italic text-stone-500">
              All active members are currently assigned to a seat.
            </p>
          ) : (
            unassignedSingers.map((singer) => {
              const badgeClass = singer.voicePart ? voicePartBadgeColor(singer.voicePart) : '';
              return (
                <button
                  key={singer.email}
                  type="button"
                  onClick={() => onAssign(singer, target)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-sm border border-stone-200/90 bg-white px-3 py-2.5 text-left text-xs transition hover:border-copper-500 hover:bg-[#f9efe8]/40"
                >
                  <div className="flex items-center gap-2.5">
                    {singer.voicePart ? (
                      <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                        {singer.voicePart}
                      </span>
                    ) : (
                      <span className="rounded-sm border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                        Staff
                      </span>
                    )}
                    <span className="font-medium text-navy-950">{singer.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-copper-600">
                    Assign
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
