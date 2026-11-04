import { useState } from 'react';
import { GripVertical, Plus, Search } from 'lucide-react';
import type { SeatingRow, SeatingSeat, SectionGroup, Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';

interface Props {
  unassignedSingers: Singer[];
  draggingSinger: Singer | null;
  selectedSeatForSwap: { seat: SeatingSeat; row: SeatingRow } | null;
  isPoolDragOver: boolean;
  setIsPoolDragOver: (over: boolean) => void;
  onDropOnPool: (e: React.DragEvent) => void;
  onDragStartSinger: (singer: Singer, e: React.DragEvent) => void;
  onDragEndSinger: () => void;
  onAssignSingerToSelectedSeat: (singer: Singer) => void;
  onSingerClick: (singer: Singer) => void;
}

export default function UnassignedPool({
  unassignedSingers,
  draggingSinger,
  selectedSeatForSwap,
  isPoolDragOver,
  setIsPoolDragOver,
  onDropOnPool,
  onDragStartSinger,
  onDragEndSinger,
  onAssignSingerToSelectedSeat,
  onSingerClick,
}: Props) {
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSection, setPickerSection] = useState<'All' | SectionGroup>('All');

  const filteredSingers = unassignedSingers.filter((s) => {
    if (pickerSection !== 'All' && s.sectionGroup !== pickerSection) return false;
    if (pickerSearch && !s.name.toLowerCase().includes(pickerSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsPoolDragOver(true);
      }}
      onDragLeave={() => setIsPoolDragOver(false)}
      onDrop={onDropOnPool}
      className={`rounded-2xl border transition p-5 shadow-2xs ${
        isPoolDragOver
          ? 'border-dashed border-gold-500 bg-amber-50/70 ring-2 ring-gold-400'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-editorial text-lg font-bold text-navy-950">
              Unassigned Singers Pool ({unassignedSingers.length})
            </h3>
            {isPoolDragOver && (
              <span className="rounded-md bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-white animate-pulse">
                Drop here to unassign
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Drag a singer onto any seat, or drag an assigned seat here to unassign.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter pool by name..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="rounded-xl border border-zinc-200 py-1 pl-8 pr-3 text-xs text-zinc-800 focus:outline-hidden"
            />
          </div>

          <select
            value={pickerSection}
            onChange={(e) => setPickerSection(e.target.value as any)}
            className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 focus:outline-hidden"
          >
            <option value="All">All Sections</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
        {filteredSingers.map((singer) => {
          const badgeClass = voicePartBadgeColor(singer.voicePart);
          const isThisSingerDragging = draggingSinger?.email === singer.email;

          return (
            <button
              key={singer.email}
              type="button"
              draggable
              onDragStart={(e) => onDragStartSinger(singer, e)}
              onDragEnd={onDragEndSinger}
              onClick={() => {
                if (selectedSeatForSwap) {
                  onAssignSingerToSelectedSeat(singer);
                } else {
                  onSingerClick(singer);
                }
              }}
              className={`cursor-grab active:cursor-grabbing inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs text-zinc-800 shadow-2xs hover:border-gold-500 hover:bg-amber-50 select-none transition ${
                isThisSingerDragging
                  ? 'opacity-40 border-gold-400 bg-gold-50 scale-95'
                  : 'border-zinc-200 bg-zinc-50/80'
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 text-zinc-400 cursor-grab" />
              <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}>
                {singer.voicePart}
              </span>
              <span className="font-semibold">{singer.name}</span>
              <Plus className="h-3 w-3 text-zinc-400 ml-0.5" />
            </button>
          );
        })}

        {unassignedSingers.length === 0 && (
          <p className="text-xs text-zinc-400 italic">
            All active choir members have been placed on this chart!
          </p>
        )}
      </div>
    </div>
  );
}

