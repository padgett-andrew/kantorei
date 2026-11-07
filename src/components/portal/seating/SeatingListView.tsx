import { Check, Clock, MessageSquare, Phone, X } from 'lucide-react';
import type { AbsenceRecord, SeatingRow, SeatingSeat, Singer, VoicePart } from '../../../types/choir';
import { inferSectionGroup } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import type { SeatingMode } from './types';

interface Props {
  currentDisplayRows: SeatingRow[];
  mode: SeatingMode;
  caller: Singer;
  rosterMap: Map<string, Singer>;
  attendanceMap: Map<string, AbsenceRecord>;
  selectedSeatForSwap: { seat: SeatingSeat; row: SeatingRow } | null;
  onRemoveSeatFromRow: (rowNumber: number) => void;
  onAddSeatToRow: (rowNumber: number, position: 'left' | 'right' | 'auto') => void;
  onClearSeat: (seat: SeatingSeat, row: SeatingRow) => void;
  onSeatClick: (seat: SeatingSeat, row: SeatingRow) => void;
  onUpdateAttendance: (singer: Singer, status: 'Present' | 'Late' | 'Absent') => void;
}

export default function SeatingListView({
  currentDisplayRows,
  mode,
  caller,
  rosterMap,
  attendanceMap,
  selectedSeatForSwap,
  onRemoveSeatFromRow,
  onAddSeatToRow,
  onClearSeat,
  onSeatClick,
  onUpdateAttendance,
}: Props) {
  return (
    <div className="space-y-5">
      {currentDisplayRows.map((row) => {
        const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
        const filledCount = nonAisleSeats.filter((s) => s.singerEmail || s.singerName).length;

        return (
          <section
            key={row.rowNumber}
            className="rounded-sm border border-stone-200/90 bg-white p-5"
          >
            <div className="mb-3.5 flex items-center justify-between border-b border-stone-200/80 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="font-editorial text-sm font-medium text-copper-600">
                  0{row.rowNumber}
                </span>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-950">
                  {row.name}
                </h4>
                <span className="text-xs tabular-nums text-stone-400">
                  · {filledCount} / {nonAisleSeats.length} seated
                </span>
              </div>

              {mode === 'edit' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRemoveSeatFromRow(row.rowNumber)}
                    disabled={nonAisleSeats.length <= 1}
                    className="cursor-pointer rounded-sm border border-stone-300 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-700 hover:bg-stone-200/60 disabled:opacity-40"
                  >
                    - Seat
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, 'auto')}
                    className="cursor-pointer rounded-sm border border-stone-300 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-700 hover:bg-stone-200/60"
                    title={`Add seat to ${row.name} (balances midpoint)`}
                  >
                    + Seat
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {nonAisleSeats.map((seat) => {
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
                const voicePart = seat.voicePart || assignedSinger?.voicePart || 'B1';
                const badgeClass = voicePartBadgeColor(voicePart);
                const isOccupied = Boolean(seat.singerEmail || seat.singerName);

                const attendanceStatus: 'Present' | 'Late' | 'Absent' =
                  absenceRecord?.status === 'Absent'
                    ? 'Absent'
                    : absenceRecord?.status === 'Late'
                      ? 'Late'
                      : 'Present';

                return (
                  <div
                    key={seat.seatIndex}
                    className={`flex flex-col justify-between rounded-sm border p-3 transition ${
                      isCurrentUser
                        ? 'border-copper-600 bg-[#f9efe8]/55 ring-1 ring-copper-600'
                        : isOccupied
                          ? 'border-stone-200/90 bg-[#FAF7F2]/50'
                          : 'border-dashed border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                          #{seat.seatIndex}
                        </span>
                        {isOccupied && (
                          <span
                            className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                          >
                            {voicePart}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isCurrentUser && (
                          <span className="rounded-sm bg-copper-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                            You
                          </span>
                        )}
                        {mode === 'edit' && isOccupied && (
                          <button
                            type="button"
                            onClick={() => onClearSeat(seat, row)}
                            className="cursor-pointer p-0.5 text-stone-400 hover:text-[#84372d]"
                            title="Unassign singer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="my-1.5">
                      {isOccupied ? (
                        <p className="line-clamp-2 break-words font-editorial text-lg font-medium leading-snug text-navy-950">
                          {seat.singerName || assignedSinger?.name || 'Singer'}
                        </p>
                      ) : (
                        <p className="text-xs italic text-stone-400">Vacant Seat</p>
                      )}
                    </div>

                    {/* Attendance Mode 1-Tap Mobile Actions */}
                    {mode === 'attendance' && isOccupied && (
                      <div className="mt-1 space-y-1.5 border-t border-stone-200/80 pt-2">
                        {(() => {
                          const targetSinger: Singer = assignedSinger || {
                            email: seat.singerEmail!,
                            name: seat.singerName || 'Singer',
                            voicePart: voicePart as VoicePart,
                            sectionGroup: inferSectionGroup(voicePart as VoicePart),
                            role: 'Singer',
                            phone: '',
                            active: true,
                            status: 'Active',
                          };

                          return (
                            <>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(targetSinger, 'Present')}
                                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-sm border py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                                    attendanceStatus === 'Present'
                                      ? 'border-navy-950 bg-navy-950 text-white'
                                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Present</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(targetSinger, 'Late')}
                                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-sm border py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                                    attendanceStatus === 'Late'
                                      ? 'border-copper-600 bg-copper-600 text-white'
                                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>Late</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(targetSinger, 'Absent')}
                                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-sm border py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                                    attendanceStatus === 'Absent'
                                      ? 'border-[#84372d] bg-[#84372d] text-white'
                                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                                  }`}
                                >
                                  <X className="h-3 w-3" />
                                  <span>Absent</span>
                                </button>
                              </div>

                              {(attendanceStatus === 'Absent' || attendanceStatus === 'Late') &&
                                assignedSinger?.phone && (
                                  <div className="flex items-center justify-between rounded-sm border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600">
                                    <span>{assignedSinger.phone}</span>
                                    <div className="flex items-center gap-2.5">
                                      <a
                                        href={`tel:${assignedSinger.phone}`}
                                        className="inline-flex items-center gap-1 font-medium text-navy-950 hover:text-copper-700"
                                        title="Call"
                                      >
                                        <Phone className="h-3 w-3 text-copper-600" />
                                        <span>Call</span>
                                      </a>
                                      <a
                                        href={`sms:${assignedSinger.phone}`}
                                        className="inline-flex items-center gap-1 font-medium text-navy-950 hover:text-copper-700"
                                        title="SMS"
                                      >
                                        <MessageSquare className="h-3 w-3 text-copper-600" />
                                        <span>Text</span>
                                      </a>
                                    </div>
                                  </div>
                                )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Edit Mode Quick Action */}
                    {mode === 'edit' && (
                      <div className="mt-1 flex justify-end border-t border-stone-200/80 pt-1.5">
                        {isOccupied ? (
                          <button
                            type="button"
                            onClick={() => onSeatClick(seat, row)}
                            className={`cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              selectedSeatForSwap?.seat.seatIndex === seat.seatIndex &&
                              selectedSeatForSwap?.row.rowNumber === row.rowNumber
                                ? 'border-copper-600 bg-copper-600 text-white'
                                : 'border-stone-300 bg-white text-stone-700 hover:border-navy-950'
                            }`}
                          >
                            {selectedSeatForSwap?.seat.seatIndex === seat.seatIndex &&
                            selectedSeatForSwap?.row.rowNumber === row.rowNumber
                              ? 'Selected'
                              : 'Swap / Move'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSeatClick(seat, row)}
                            className="cursor-pointer rounded-sm border border-copper-400 bg-[#f9efe8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-950 hover:bg-[#f3e3d6]"
                          >
                            + Assign
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
