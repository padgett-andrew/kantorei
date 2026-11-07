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
    <div className="relative overflow-x-auto rounded-sm border border-stone-300/80 bg-[#f5efe8]/60 p-4 sm:p-7">
      {/* Stage Orientation Rule */}
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-stone-300/70 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        <span>
          {perspective === 'conductor' ? '← Choir Left (Stage Right)' : '← Your Left (Stage Left)'}
        </span>
        <span className="hidden text-copper-600 sm:inline">Upstage Formation</span>
        <span>
          {perspective === 'conductor' ? 'Choir Right (Stage Left) →' : 'Your Right (Stage Right) →'}
        </span>
      </div>

      {/* Rows Rendered in Physical Order (Back Row to Front Row) */}
      <div className="flex min-w-max flex-col-reverse gap-4 pb-4 sm:gap-5">
        {currentDisplayRows.map((row) => {
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
              className={`relative rounded-sm border p-3 transition-all sm:p-4 ${
                isDragOverRow
                  ? 'border-copper-500 bg-[#f9efe8]/80 ring-1 ring-copper-500'
                  : 'border-stone-200/90 bg-white'
              }`}
            >
              {/* Row Header & Controls */}
              <div className="mb-3 flex items-center justify-between border-b border-stone-200/80 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-editorial text-sm font-medium text-copper-600">
                    0{row.rowNumber}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-950">
                    {row.name}
                  </span>
                  <span className="text-[11px] tabular-nums text-stone-400">
                    · {filledSeatsCount} / {nonAisleSeats.length} seated
                  </span>
                  {isDragOverRow && (
                    <span className="rounded-sm bg-copper-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Drop to place in {row.name}
                    </span>
                  )}
                </div>

                {mode === 'edit' && (
                  <div className="flex items-center gap-2">
                    {/* Seat Count Stepper */}
                    <div className="flex items-center gap-1 rounded-sm border border-stone-200 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                      <span className="uppercase tracking-wider text-stone-500">Seats</span>
                      <button
                        type="button"
                        onClick={() => onRemoveSeatFromRow(row.rowNumber)}
                        disabled={nonAisleSeats.length <= 1}
                        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm text-stone-600 hover:bg-stone-200 disabled:opacity-30"
                        title={`Remove seat from ${row.name} (keeps midpoint balanced)`}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="min-w-4 text-center font-bold tabular-nums text-navy-950">
                        {nonAisleSeats.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddSeatToRow(row.rowNumber, 'auto')}
                        disabled={nonAisleSeats.length >= 25}
                        className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm text-stone-600 hover:bg-stone-200 disabled:opacity-30"
                        title={`Add seat to ${row.name} (symmetrically balances midpoint)`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.rowNumber)}
                      className="cursor-pointer rounded-sm p-1 text-stone-400 transition hover:bg-[#f7ebe8] hover:text-[#84372d]"
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
                {/* Drop-to-Add Seat at Left Wing in Edit Mode */}
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'right' : 'left')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => onDropOnRow(row, e, perspective === 'singer' ? 'right' : 'left')}
                    className={`group flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-stone-300 bg-[#FAF7F2] text-stone-400 transition hover:border-copper-500 hover:bg-[#f9efe8] hover:text-copper-700 ${
                      density === 'compact' ? 'min-h-[66px] w-10 sm:w-12' : 'min-h-[82px] w-20'
                    }`}
                    title={`Add seat to ${perspective === 'singer' ? 'Stage Right' : 'Stage Left'} wing`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Wing</span>
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

                {/* Drop-to-Add Seat at Right Wing in Edit Mode */}
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'left' : 'right')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => onDropOnRow(row, e, perspective === 'singer' ? 'left' : 'right')}
                    className={`group flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-stone-300 bg-[#FAF7F2] text-stone-400 transition hover:border-copper-500 hover:bg-[#f9efe8] hover:text-copper-700 ${
                      density === 'compact' ? 'min-h-[66px] w-10 sm:w-12' : 'min-h-[82px] w-20'
                    }`}
                    title={`Add seat to ${perspective === 'singer' ? 'Stage Left' : 'Stage Right'} wing`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Wing</span>
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-dashed border-stone-400 bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      )}

      {/* Architectural Conductor Podium Marker (Downstage) */}
      <div className="mt-6 flex flex-col items-center justify-center">
        <div className="rounded-sm border border-stone-300 border-t-2 border-t-navy-950 bg-[#f5efe8] px-8 py-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-navy-950">
            Conductor Podium · Downstage Center
          </span>
        </div>
      </div>
    </div>
  );
}
