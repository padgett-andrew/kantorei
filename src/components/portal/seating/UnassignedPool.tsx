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
      className={`rounded-sm border p-5 transition ${
        isPoolDragOver
          ? 'border-dashed border-copper-500 bg-[#f9efe8]/70 ring-1 ring-copper-500'
          : 'border-stone-200/90 bg-white'
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-stone-200/80 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-editorial text-xl font-normal text-navy-950">
              Unassigned Singers ({unassignedSingers.length})
            </h3>
            {isPoolDragOver && (
              <span className="rounded-sm bg-copper-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Drop here to unassign
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Drag a singer onto any seat or position above, or drag an assigned seat here to return them to the pool.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Filter by name…"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              className="rounded-sm border border-stone-300 bg-white py-1 pl-8 pr-3 text-xs text-navy-950 focus:border-navy-950 focus:outline-none"
            />
          </div>

          <select
            value={pickerSection}
            onChange={(e) => setPickerSection(e.target.value as 'All' | SectionGroup)}
            className="rounded-sm border border-stone-300 bg-white px-2.5 py-1 text-xs text-navy-950 focus:border-navy-950 focus:outline-none"
          >
            <option value="All">All Sections</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
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
              className={`inline-flex select-none cursor-grab items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs text-navy-950 transition hover:border-copper-500 hover:bg-[#FAF7F2] active:cursor-grabbing ${
                isThisSingerDragging
                  ? 'scale-95 border-copper-500 bg-[#f9efe8] opacity-40'
                  : 'border-stone-200/90 bg-[#FAF7F2]/70'
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 cursor-grab text-stone-400" />
              <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                {singer.voicePart}
              </span>
              <span className="font-medium">{singer.name}</span>
              <Plus className="ml-0.5 h-3 w-3 text-stone-400" />
            </button>
          );
        })}

        {unassignedSingers.length === 0 && (
          <p className="text-xs italic text-stone-500">
            All active ensemble members have been placed on this formation chart.
          </p>
        )}
      </div>
    </div>
  );
}
