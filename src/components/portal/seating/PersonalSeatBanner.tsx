import { Compass, MapPin, Sparkles } from 'lucide-react';
import type { SeatingPerspective } from './types';
import type { Singer } from '../../../types/choir';

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
  return (
    <div className="space-y-3">
      {/* Perspective Flip Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/95 via-amber-100/50 to-orange-50/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-600">
                Your Assigned Position
              </p>
              <h3 className="text-sm sm:text-base font-bold text-navy-950">
                {caller.name} · {mySeatLocation.rowName}, Seat #{mySeatLocation.seatIndex} (
                {mySeatLocation.voicePart || caller.voicePart})
              </h3>
              <p className="text-xs text-zinc-600">
                Chart: <span className="font-semibold">{mySeatLocation.chartTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePerspective}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs hover:bg-white"
            >
              <Compass className="h-3.5 w-3.5 text-gold-600" />
              <span>Flip to {perspective === 'conductor' ? "Singer's View" : "Conductor's View"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Locator / Focus Seat Card */}
      <div className="rounded-2xl border border-gold-300 bg-amber-50/70 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-2xs">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-900">
                Your Seat Location
              </span>
              <span className="rounded-md bg-gold-200/90 px-1.5 py-0.2 text-[10px] font-bold text-gold-950">
                {mySeatLocation.voicePart || caller.voicePart}
              </span>
            </div>
            <p className="text-sm font-bold text-navy-950 leading-snug">
              {mySeatLocation.rowName} · Seat #{mySeatLocation.seatIndex}
              {myNeighbors?.leftSinger && myNeighbors?.rightSinger && (
                <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                  (Between {myNeighbors.leftSinger} &amp; {myNeighbors.rightSinger})
                </span>
              )}
              {myNeighbors?.leftSinger && !myNeighbors?.rightSinger && (
                <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                  (Next to {myNeighbors.leftSinger} · Stage Edge)
                </span>
              )}
              {!myNeighbors?.leftSinger && myNeighbors?.rightSinger && (
                <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                  (Stage Edge · Next to {myNeighbors.rightSinger})
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onFocusSeat}
          className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-gold-600 active:scale-95 transition self-start sm:self-auto"
        >
          <span>🎯 Focus My Seat</span>
        </button>
      </div>
    </div>
  );
}

