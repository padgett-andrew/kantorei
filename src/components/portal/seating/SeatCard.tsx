import { useState, type DragEvent } from 'react';
import type { AbsenceRecord, SeatingRow, SeatingSeat, Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import type { SeatingDensity, SeatingMode } from './types';
import { Check, Clock, GripVertical, Moon, Plus, Sparkles, Trash2, X } from 'lucide-react';

interface Props {
  seat: SeatingSeat;
  row: SeatingRow;
  mode: SeatingMode;
  density?: SeatingDensity;
  isCurrentUser: boolean;
  isDimmed: boolean;
  isSelectedInEdit?: boolean;
  isBeingDragged?: boolean;
  absenceRecord?: AbsenceRecord;
  assignedSinger?: Singer;
  onClick: (seat: SeatingSeat, row: SeatingRow) => void;
  onClearSeat?: (seat: SeatingSeat, row: SeatingRow) => void;
  onDeleteSeat?: (seat: SeatingSeat, row: SeatingRow) => void;
  onDragStartSeat?: (seat: SeatingSeat, row: SeatingRow, e: DragEvent) => void;
  onDragEndSeat?: () => void;
  onDropOnSeat?: (seat: SeatingSeat, row: SeatingRow, e: DragEvent) => void;
}


export default function SeatCard({
  seat,
  row,
  mode,
  density = 'compact',
  isCurrentUser,
  isDimmed,
  isSelectedInEdit,
  isBeingDragged,
  absenceRecord,
  assignedSinger,
  onClick,
  onClearSeat,
  onDeleteSeat,
  onDragStartSeat,
  onDragEndSeat,
  onDropOnSeat,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isCompact = density === 'compact';

  // 1. Aisle Spacer / Center Midpoint
  if (seat.isAisle) {
    return (
      <div
        className={`flex shrink-0 flex-col items-center justify-center select-none group/aisle ${
          isCompact
            ? 'w-3.5 sm:w-5 min-h-[66px] sm:min-h-[70px]'
            : 'w-7 sm:w-10 min-h-[82px] sm:min-h-[88px]'
        }`}
        title="Center Aisle / Midpoint of Choir"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 py-1">
          <div className="h-4 sm:h-5 w-0.5 rounded-full bg-zinc-300 group-hover/aisle:bg-gold-500 transition" />
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-zinc-400 group-hover/aisle:text-gold-600 transition">
            {isCompact ? '•' : 'Center'}
          </span>
          <div className="h-4 sm:h-5 w-0.5 rounded-full bg-zinc-300 group-hover/aisle:bg-gold-500 transition" />
        </div>
      </div>
    );
  }

  // 2. Empty / Vacant Seat
  if (!seat.singerEmail && !seat.singerName) {
    return (
      <div
        onDragOver={(e) => {
          if (mode === 'edit') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!isDragOver) setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          if (mode === 'edit') {
            e.preventDefault();
            setIsDragOver(false);
            onDropOnSeat?.(seat, row, e);
          }
        }}
        onClick={() => onClick(seat, row)}
        className={`group relative flex shrink-0 cursor-pointer flex-col items-center justify-between rounded-xl border border-dashed text-center transition-all ${
          isCompact ? 'w-16 sm:w-18 min-h-[66px] sm:min-h-[70px] p-1.5' : 'w-28 sm:w-34 min-h-[82px] sm:min-h-[88px] p-2'
        } ${
          isDragOver
            ? 'border-gold-500 bg-amber-100/90 ring-2 ring-gold-500 scale-105 shadow-md z-10'
            : isSelectedInEdit
            ? 'border-gold-500 bg-amber-50/70 ring-2 ring-gold-500 shadow-xs'
            : 'border-zinc-200/90 bg-white/70 hover:border-zinc-400 hover:bg-zinc-50'
        } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
        title={`Seat #${seat.seatIndex} (Vacant) — Click to assign`}
      >
        {/* Top: Seat number and delete seat button (in edit mode) */}
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-zinc-600">
            #{seat.seatIndex}
          </span>
          {mode === 'edit' && onDeleteSeat && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSeat(seat, row);
              }}
              className="cursor-pointer rounded p-0.5 text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"
              title={`Remove Seat #${seat.seatIndex}`}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {/* Center: Action / Drag-drop hint */}
        <div className="flex flex-col items-center justify-center my-auto">
          {isDragOver ? (
            <span className="text-[10px] font-bold text-gold-800 animate-pulse">Drop</span>
          ) : isCompact ? (
            <Plus className="h-3.5 w-3.5 text-zinc-300 group-hover:text-gold-600" />
          ) : (
            <>
              <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-700">
                {mode === 'edit' ? '+ Assign' : 'Vacant'}
              </span>
              {mode === 'edit' && (
                <Plus className="mt-0.5 h-3.5 w-3.5 text-zinc-400 group-hover:text-gold-600" />
              )}
            </>
          )}
        </div>

        {/* Bottom spacer for balance */}
        <div className="h-2 w-full" />
      </div>
    );
  }

  // 3. Singer Assigned
  const voicePart = seat.voicePart || assignedSinger?.voicePart || 'B1';
  const badgeClass = voicePartBadgeColor(voicePart);
  const fullDisplayName = seat.singerName || assignedSinger?.name || seat.singerEmail || 'Singer';
  const isOnLeave = assignedSinger?.status === 'On_Leave';

  // Attendance status resolution: All singers are Present by default unless marked Absent or Late
  const attendanceStatus: 'Present' | 'Late' | 'Absent' =
    absenceRecord?.status === 'Absent'
      ? 'Absent'
      : absenceRecord?.status === 'Late'
      ? 'Late'
      : 'Present';

  let attendanceBg = 'bg-white border-zinc-200/80 hover:border-zinc-300';
  if (mode === 'attendance') {
    if (attendanceStatus === 'Absent') {
      attendanceBg = 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-300 shadow-xs';
    } else if (attendanceStatus === 'Late') {
      attendanceBg = 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300 shadow-xs';
    } else {
      attendanceBg = 'bg-emerald-50/80 border-emerald-300 shadow-xs';
    }
  }

  const isDraggableInEdit = mode === 'edit';

  return (
    <div
      id={isCurrentUser ? 'my-seat-card' : undefined}
      draggable={isDraggableInEdit}
      onDragStart={(e) => {
        if (isDraggableInEdit) {
          onDragStartSeat?.(seat, row, e);
        }
      }}
      onDragEnd={() => {
        if (isDraggableInEdit) {
          onDragEndSeat?.();
        }
      }}
      onDragOver={(e) => {
        if (mode === 'edit') {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!isDragOver) setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (mode === 'edit') {
          e.preventDefault();
          setIsDragOver(false);
          onDropOnSeat?.(seat, row, e);
        }
      }}
      onClick={() => onClick(seat, row)}
      className={`group relative flex shrink-0 flex-col justify-between rounded-xl border text-left shadow-2xs transition-all select-none ${attendanceBg} ${
        isCompact ? 'w-16 sm:w-18 min-h-[66px] sm:min-h-[70px] p-1.5' : 'w-28 sm:w-34 min-h-[82px] sm:min-h-[88px] p-2'
      } ${
        isCurrentUser
          ? 'ring-2 ring-gold-500 border-gold-500 shadow-md bg-amber-50/40'
          : ''
      } ${
        isDragOver
          ? 'ring-2 ring-gold-500 bg-amber-100/90 border-gold-500 scale-105 shadow-md z-10'
          : isBeingDragged
          ? 'opacity-35 ring-2 ring-dashed ring-gold-400 scale-95'
          : isSelectedInEdit
          ? 'ring-2 ring-gold-500 bg-amber-50/60 scale-[1.02]'
          : ''
      } ${isDimmed ? 'opacity-30' : 'opacity-100'} ${
        isDraggableInEdit
          ? 'cursor-grab active:cursor-grabbing hover:border-gold-400'
          : 'cursor-pointer'
      } hover:shadow-xs`}
      title={`${fullDisplayName} (${voicePart}) · ${row.name}, Seat #${seat.seatIndex} · Status: ${attendanceStatus}`}
    >
      {/* Top Header: Voice Part & Seat Number / Badges */}
      <div className="flex items-center justify-between gap-0.5">
        <span
          className={`inline-flex items-center rounded-md border font-bold ${badgeClass} ${
            isCompact ? 'px-1 py-0 text-[9px] leading-tight' : 'px-1.5 py-0.2 text-[10px]'
          }`}
        >
          {voicePart}
        </span>

        <div className="flex items-center gap-1">
          {isDraggableInEdit && !isCompact && (
            <GripVertical className="h-3 w-3 text-zinc-300 group-hover:text-gold-500" />
          )}
          {isOnLeave && (
            <span title="On Season Leave" className="text-[10px] text-indigo-600">
              <Moon className="h-2.5 w-2.5 inline" />
            </span>
          )}
          {isCurrentUser && (
            <span
              className={`flex items-center rounded-full bg-gold-500 font-black uppercase tracking-wider text-white shadow-2xs ${
                isCompact
                  ? 'h-2 w-2 rounded-full ring-2 ring-gold-300'
                  : 'gap-0.5 px-1.5 py-0.2 text-[9px]'
              }`}
              title="You"
            >
              {!isCompact && (
                <>
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>You</span>
                </>
              )}
            </span>
          )}
          <span className="text-[10px] font-semibold text-zinc-400">
            #{seat.seatIndex}
          </span>
        </div>
      </div>

      {/* Singer Name: Formatted to flow across up to two lines */}
      <div className="my-0.5 min-w-0 h-[28px] sm:h-[32px] flex items-center">
        <p
          className={`line-clamp-2 break-words font-semibold leading-[1.12] ${
            isCompact ? 'text-[10px] sm:text-[10.5px]' : 'text-xs sm:text-[13px]'
          } ${
            isCurrentUser
              ? 'text-navy-950 font-bold'
              : attendanceStatus === 'Absent'
              ? 'text-rose-950 font-bold'
              : 'text-zinc-800'
          }`}
        >
          {fullDisplayName}
        </p>
      </div>

      {/* Bottom Footer: Mode specific indicator */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        {mode === 'attendance' ? (
          attendanceStatus === 'Absent' ? (
            <span
              className="inline-flex items-center gap-0.5 font-bold text-rose-700"
              title={absenceRecord?.reason || 'Marked absent at roll call'}
            >
              <X className="h-2.5 w-2.5 stroke-[2.5]" />
              <span className={isCompact ? 'text-[9px]' : ''}>Absent</span>
            </span>
          ) : attendanceStatus === 'Late' ? (
            <span
              className="inline-flex items-center gap-0.5 font-bold text-amber-700"
              title={absenceRecord?.reason || 'Marked late'}
            >
              <Clock className="h-2.5 w-2.5 stroke-[2.5]" />
              <span className={isCompact ? 'text-[9px]' : ''}>Late</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700">
              <Check className="h-2.5 w-2.5 stroke-[2.5]" />
              <span className={isCompact ? 'text-[9px]' : ''}>Present</span>
            </span>
          )
        ) : mode === 'edit' ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-zinc-400 group-hover:text-gold-600 font-medium text-[9px] truncate">
              {isDragOver ? 'Drop' : isSelectedInEdit ? 'Selected' : isCompact ? '' : 'Drag/Tap'}
            </span>
            {onClearSeat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSeat(seat, row);
                }}
                className="cursor-pointer rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-rose-600 ml-auto"
                title={`Unassign ${fullDisplayName} to pool`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 truncate text-[9px]">
            {isCompact ? voicePart : row.name}
          </span>
        )}
      </div>
    </div>
  );
}
