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
    <div className="space-y-4 animate-in fade-in">
      {currentDisplayRows.map((row) => {
        const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
        const filledCount = nonAisleSeats.filter((s) => s.singerEmail || s.singerName).length;

        return (
          <div
            key={row.rowNumber}
            className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">
                  R{row.rowNumber}
                </span>
                <h4 className="text-sm font-bold text-navy-950">{row.name}</h4>
                <span className="text-xs text-zinc-400">
                  ({filledCount} of {nonAisleSeats.length} filled)
                </span>
              </div>

              {mode === 'edit' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRemoveSeatFromRow(row.rowNumber)}
                    disabled={nonAisleSeats.length <= 1}
                    className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  >
                    - Seat
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddSeatToRow(row.rowNumber, 'auto')}
                    className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                    title={`Add seat to ${row.name} (balances midpoint)`}
                  >
                    + Seat
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                    className={`rounded-xl border p-2.5 transition flex flex-col justify-between ${
                      isCurrentUser
                        ? 'border-gold-400 bg-amber-50/40 ring-1 ring-gold-400'
                        : isOccupied
                        ? 'border-zinc-200 bg-zinc-50/50'
                        : 'border-dashed border-zinc-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white border border-zinc-200 text-[10px] font-bold text-zinc-600">
                          #{seat.seatIndex}
                        </span>
                        {isOccupied && (
                          <span
                            className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}
                          >
                            {voicePart}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isCurrentUser && (
                          <span className="rounded-full bg-gold-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-white shadow-2xs">
                            You
                          </span>
                        )}
                        {mode === 'edit' && isOccupied && (
                          <button
                            type="button"
                            onClick={() => onClearSeat(seat, row)}
                            className="cursor-pointer text-zinc-400 hover:text-rose-600 p-0.5"
                            title="Unassign singer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Name formatted across 2 lines */}
                    <div className="my-1.5">
                      {isOccupied ? (
                        <p className="line-clamp-2 break-words text-xs font-bold text-navy-950 leading-tight">
                          {seat.singerName || assignedSinger?.name || 'Singer'}
                        </p>
                      ) : (
                        <p className="text-xs italic text-zinc-400">Vacant Seat</p>
                      )}
                    </div>

                    {/* Attendance Mode 1-Tap Mobile Actions */}
                    {mode === 'attendance' && isOccupied && (
                      <div className="pt-2 border-t border-zinc-200/60 mt-1 space-y-1.5">
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
                                  className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                    attendanceStatus === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Present</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(targetSinger, 'Late')}
                                  className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                    attendanceStatus === 'Late'
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  <span>Late</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onUpdateAttendance(targetSinger, 'Absent')}
                                  className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                    attendanceStatus === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                  }`}
                                >
                                  <X className="h-3 w-3" />
                                  <span>Absent</span>
                                </button>
                              </div>

                              {/* Contact Action for missing singers */}
                              {(attendanceStatus === 'Absent' || attendanceStatus === 'Late') &&
                                assignedSinger?.phone && (
                                  <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-50 rounded-lg p-1 px-2">
                                    <span>{assignedSinger.phone}</span>
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`tel:${assignedSinger.phone}`}
                                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                                        title="Call"
                                      >
                                        <Phone className="h-3 w-3" />
                                        <span>Call</span>
                                      </a>
                                      <a
                                        href={`sms:${assignedSinger.phone}`}
                                        className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                                        title="SMS"
                                      >
                                        <MessageSquare className="h-3 w-3" />
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
                      <div className="pt-1.5 border-t border-zinc-200/60 mt-1 flex justify-end">
                        {isOccupied ? (
                          <button
                            type="button"
                            onClick={() => onSeatClick(seat, row)}
                            className={`cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              selectedSeatForSwap?.seat.seatIndex === seat.seatIndex &&
                              selectedSeatForSwap?.row.rowNumber === row.rowNumber
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
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
                            className="cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-50 border border-gold-300 text-gold-900 hover:bg-gold-100"
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
          </div>
        );
      })}
    </div>
  );
}

