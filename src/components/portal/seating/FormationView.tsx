import { Minus, Plus, Trash2 } from 'lucide-react';
import type { AbsenceRecord, SeatingRow, SeatingSeat, SectionGroup, Singer } from '../../../types/choir';
import { inferSectionGroup } from '../../../types/choir';
import type { SeatingDensity, SeatingMode, SeatingPerspective } from './types';
import SeatCard from './SeatCard';

interface Props {
  currentDisplayRows: SeatingRow[];
  perspective: SeatingPerspective;
  mode: SeatingMode;
  density: SeatingDensity;
  caller: Singer;
  rosterMap: Map<string, Singer>;
  attendanceMap: Map<string, AbsenceRecord>;
  sectionFilter: 'All' | SectionGroup;
  selectedSeatForSwap: { seat: SeatingSeat; row: SeatingRow } | null;
  draggingSeat: { seat: SeatingSeat; row: SeatingRow } | null;
  dragOverRowNumber: number | null;
  setDragOverRowNumber: (n: number | null) => void;
  onDropOnRow: (row: SeatingRow, e: React.DragEvent, wing?: 'left' | 'right') => void;
  onAddSeatToRow: (rowNumber: number, position: 'left' | 'right' | 'auto') => void;
  onRemoveSeatFromRow: (rowNumber: number) => void;
  onRemoveRow: (rowNumber: number) => void;
  onAddRow: () => void;
  onSeatClick: (seat: SeatingSeat, row: SeatingRow) => void;
  onClearSeat?: (seat: SeatingSeat, row: SeatingRow) => void;
  onDeleteSpecificSeat?: (seat: SeatingSeat, row: SeatingRow) => void;
  onDragStartSeat: (seat: SeatingSeat, row: SeatingRow, e: React.DragEvent) => void;
  onDragEndSeat: () => void;
  onDropOnSeat: (targetSeat: SeatingSeat, targetRow: SeatingRow, e: React.DragEvent) => void;
}

export default function FormationView({
  currentDisplayRows,
  perspective,
  mode,
  density,
  caller,
  rosterMap,
  attendanceMap,
  sectionFilter,
  selectedSeatForSwap,
  draggingSeat,
  dragOverRowNumber,
  setDragOverRowNumber,
  onDropOnRow,
  onAddSeatToRow,
  onRemoveSeatFromRow,
  onRemoveRow,
  onAddRow,
  onSeatClick,
  onClearSeat,
  onDeleteSpecificSeat,
  onDragStartSeat,
  onDragEndSeat,
  onDropOnSeat,
}: Props) {
  return (
    <div className="relative overflow-x-auto rounded-3xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-8 shadow-inner">
      {/* Stage Orientation Marker */}
      <div className="mb-6 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-2xs">
          <span>
            {perspective === 'conductor'
              ? '← Choir Left (Stage Right) · [Choir Formation] · Choir Right (Stage Left) →'
              : '← Your Left (Stage Left) · [Choir Formation] · Your Right (Stage Right) →'}
          </span>
        </div>
      </div>

      {/* Rows Rendered in Physical Order (Back Row to Front Row) */}
      <div className="flex flex-col-reverse gap-4 sm:gap-6 min-w-max pb-4">
        {currentDisplayRows.map((row) => {
          // Apply perspective flip if singer stage view selected
          const orderedSeats =
            perspective === 'singer' ? [...row.seats].reverse() : row.seats;
          const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
          const filledSeatsCount = row.seats.filter((s) => s.singerEmail || s.singerName).length;
          const isDragOverRow = dragOverRowNumber === row.rowNumber;

          return (
            <div
              key={row.rowNumber}
              id={`seating-row-${row.rowNumber}`}
              onDragOver={(e) => {
                if (mode === 'edit') {
                  e.preventDefault();
                  if (dragOverRowNumber !== row.rowNumber) {
                    setDragOverRowNumber(row.rowNumber);
                  }
                }
              }}
              onDragLeave={() => {
                if (dragOverRowNumber === row.rowNumber) {
                  setDragOverRowNumber(null);
                }
              }}
              onDrop={(e) => onDropOnRow(row, e)}
              className={`relative rounded-2xl border transition-all p-3 sm:p-4 shadow-2xs ${
                isDragOverRow
                  ? 'border-gold-500 bg-amber-50/70 ring-2 ring-gold-400'
                  : 'border-zinc-200/80 bg-white/90 hover:shadow-xs'
              }`}
            >
              {/* Row Header & Controls */}
              <div className="mb-2.5 flex items-center justify-between border-b border-zinc-100 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">
                    R{row.rowNumber}
                  </span>
                  <span className="text-xs font-bold text-navy-950">{row.name}</span>
                  <span className="text-[11px] text-zinc-400">
                    ({nonAisleSeats.length} seats · {filledSeatsCount} filled)
                  </span>
                  {isDragOverRow && (
                    <span className="rounded-md bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                      Drop to place in {row.name}
                    </span>
                  )}
                </div>

                {mode === 'edit' && (
                  <div className="flex items-center gap-2">
                    {/* Seat Count Stepper for this specific row */}
                    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                      <span className="text-zinc-500">Seats:</span>
                      <button
                        type="button"
                        onClick={() => onRemoveSeatFromRow(row.rowNumber)}
                        disabled={nonAisleSeats.length <= 1}
                        className="cursor-pointer flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30"
                        title={`Remove seat from ${row.name} (keeps midpoint balanced)`}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="min-w-4 text-center font-bold text-navy-950">
                        {nonAisleSeats.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddSeatToRow(row.rowNumber, 'auto')}
                        disabled={nonAisleSeats.length >= 25}
                        className="cursor-pointer flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30"
                        title={`Add seat to ${row.name} (symmetrically balances midpoint)`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.rowNumber)}
                      className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                      title={`Delete ${row.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Seat Cards in this Row */}
              <div
                className={`flex items-center justify-center ${
                  density === 'compact' ? 'gap-1 sm:gap-1.5' : 'gap-2 sm:gap-3'
                }`}
              >
                {/* Drop-to-Add Seat Pill at Left Wing in Edit Mode */}
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'right' : 'left')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => onDropOnRow(row, e, perspective === 'singer' ? 'right' : 'left')}
                    className={`cursor-pointer group flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 hover:border-gold-500 hover:bg-amber-50 transition text-zinc-400 hover:text-gold-700 ${
                      density === 'compact' ? 'w-10 sm:w-12 min-h-[66px]' : 'w-20 min-h-[82px]'
                    }`}
                    title={`Add seat to ${perspective === 'singer' ? 'Stage Right' : 'Stage Left'} wing (updates midpoint)`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">+ Wing</span>
                    </div>
                  </button>
                )}

                {orderedSeats.map((seat, seatIdx) => {
                  const assignedSinger = seat.singerEmail
                    ? rosterMap.get(seat.singerEmail.toLowerCase())
                    : undefined;
                  const absenceRecord = seat.singerEmail
                    ? attendanceMap.get(seat.singerEmail.toLowerCase())
                    : undefined;

                  const isCurrentUser = Boolean(
                    caller.email &&
                      seat.singerEmail &&
                      seat.singerEmail.toLowerCase() === caller.email.toLowerCase()
                  );

                  const voicePart = seat.voicePart || assignedSinger?.voicePart;
                  const sectionGroup = voicePart ? inferSectionGroup(voicePart) : undefined;

                  const isHighlightedSection =
                    sectionFilter === 'All' || (Boolean(sectionGroup) && sectionGroup === sectionFilter);

                  const isDimmed = !isHighlightedSection && !seat.isAisle;

                  const isSelectedInEdit = Boolean(
                    selectedSeatForSwap &&
                      selectedSeatForSwap.row.rowNumber === row.rowNumber &&
                      selectedSeatForSwap.seat.seatIndex === seat.seatIndex
                  );

                  const isBeingDragged = Boolean(
                    draggingSeat &&
                      draggingSeat.row.rowNumber === row.rowNumber &&
                      draggingSeat.seat.seatIndex === seat.seatIndex
                  );

                  return (
                    <SeatCard
                      key={`${row.rowNumber}-${seat.seatIndex}-${seatIdx}`}
                      seat={seat}
                      row={row}
                      mode={mode}
                      density={density}
                      isCurrentUser={isCurrentUser}
                      isDimmed={isDimmed}
                      isSelectedInEdit={isSelectedInEdit}
                      isBeingDragged={isBeingDragged}
                      absenceRecord={absenceRecord}
                      assignedSinger={assignedSinger}
                      onClick={onSeatClick}
                      onClearSeat={mode === 'edit' ? onClearSeat : undefined}
                      onDeleteSeat={mode === 'edit' ? onDeleteSpecificSeat : undefined}
                      onDragStartSeat={onDragStartSeat}
                      onDragEndSeat={onDragEndSeat}
                      onDropOnSeat={onDropOnSeat}
                    />
                  );
                })}

                {/* Drop-to-Add Seat Pill at Right Wing in Edit Mode */}
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'left' : 'right')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => onDropOnRow(row, e, perspective === 'singer' ? 'left' : 'right')}
                    className={`cursor-pointer group flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 hover:border-gold-500 hover:bg-amber-50 transition text-zinc-400 hover:text-gold-700 ${
                      density === 'compact' ? 'w-10 sm:w-12 min-h-[66px]' : 'w-20 min-h-[82px]'
                    }`}
                    title={`Add seat to ${perspective === 'singer' ? 'Stage Left' : 'Stage Right'} wing (updates midpoint)`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">+ Wing</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Row Button (in Edit Mode) */}
      {mode === 'edit' && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onAddRow}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-5 py-2 text-xs font-bold text-zinc-700 hover:border-navy-900 hover:text-navy-900"
          >
            <Plus className="h-4 w-4" />
            <span>Add Row</span>
          </button>
        </div>
      )}

      {/* Podium / Conductor Marker (at the front) */}
      <div className="mt-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-6 py-2 text-xs font-bold text-navy-950 shadow-sm">
          <span>🎼</span>
          <span>Director Podium &amp; Sanctuary Altar</span>
          <span>🎼</span>
        </div>
      </div>
    </div>
  );
}

