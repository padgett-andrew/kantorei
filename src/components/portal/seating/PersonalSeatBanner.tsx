import { Compass, Crosshair } from 'lucide-react';
import { voicePartBadgeColor } from '../../../lib/utils';
import type { SeatingPerspective } from './types';
import type { Singer, VoicePart } from '../../../types/choir';

interface Props {
  caller: Singer;
  mySeatLocation: {
    chartTitle: string;
    rowName: string;
    rowNumber: number;
    seatIndex: number;
    voicePart?: string;
  };
  myNeighbors?: {
    leftSinger?: string;
    rightSinger?: string;
  } | null;
  perspective: SeatingPerspective;
  onTogglePerspective: () => void;
  onFocusSeat: () => void;
}

export default function PersonalSeatBanner({
  caller,
  mySeatLocation,
  myNeighbors,
  perspective,
  onTogglePerspective,
  onFocusSeat,
}: Props) {
  const voicePart = (mySeatLocation.voicePart || caller.voicePart) as VoicePart;

  let neighborSummary = '';
  if (myNeighbors?.leftSinger && myNeighbors?.rightSinger) {
    neighborSummary = `Between ${myNeighbors.leftSinger} & ${myNeighbors.rightSinger}`;
  } else if (myNeighbors?.leftSinger) {
    neighborSummary = `Next to ${myNeighbors.leftSinger} · Stage Edge`;
  } else if (myNeighbors?.rightSinger) {
    neighborSummary = `Stage Edge · Next to ${myNeighbors.rightSinger}`;
  }

  return (
    <div className="rounded-sm border border-stone-200/90 border-l-2 border-l-copper-500 bg-white px-5 py-4 sm:px-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              Your Assigned Riser Position
            </span>
            <span className="text-stone-300" aria-hidden="true">·</span>
            <span className="text-xs text-stone-500">{mySeatLocation.chartTitle}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-editorial text-2xl font-normal text-navy-950 sm:text-[26px]">
              {mySeatLocation.rowName}, Seat #{mySeatLocation.seatIndex}
            </h2>
            <span
              className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${voicePartBadgeColor(
                voicePart
              )}`}
            >
              {voicePart}
            </span>
            {neighborSummary && (
              <span className="text-xs text-stone-500">{neighborSummary}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePerspective}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-300 bg-[#FAF7F2] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-navy-950 transition hover:border-navy-950 hover:bg-white"
          >
            <Compass className="h-3.5 w-3.5 text-copper-600" />
            <span>
              {perspective === 'conductor' ? "Flip to Singer's View" : "Flip to Conductor's View"}
            </span>
          </button>

          <button
            type="button"
            onClick={onFocusSeat}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-navy-900"
          >
            <Crosshair className="h-3.5 w-3.5 text-copper-400" />
            <span>Locate Seat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
