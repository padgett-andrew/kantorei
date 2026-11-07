import { useState, type DragEvent } from 'react';
import type { AbsenceRecord, SeatingRow, SeatingSeat, Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import type { SeatingDensity, SeatingMode } from './types';
import { Check, Clock, GripVertical, Moon, Plus, Trash2, X } from 'lucide-react';

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
        className={`group/aisle flex shrink-0 select-none flex-col items-center justify-center ${
          isCompact
            ? 'min-h-[66px] w-3.5 sm:min-h-[70px] sm:w-5'
            : 'min-h-[82px] w-7 sm:min-h-[88px] sm:w-10'
        }`}
        title="Center Aisle / Midpoint of Choir"
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 py-1">
          <div className="h-4 w-px bg-stone-300 transition group-hover/aisle:bg-copper-500 sm:h-5" />
          <span className="text-[7px] font-semibold uppercase tracking-widest text-stone-400 transition group-hover/aisle:text-copper-600 sm:text-[8px]">
            {isCompact ? '·' : 'Axis'}
          </span>
          <div className="h-4 w-px bg-stone-300 transition group-hover/aisle:bg-copper-500 sm:h-5" />
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
        className={`group relative flex shrink-0 cursor-pointer flex-col items-center justify-between rounded-sm border border-dashed text-center transition-all ${
          isCompact
            ? 'min-h-[66px] w-16 p-1.5 sm:min-h-[70px] sm:w-18'
            : 'min-h-[82px] w-28 p-2 sm:min-h-[88px] sm:w-34'
        } ${
          isDragOver
            ? 'z-10 scale-105 border-copper-500 bg-[#f9efe8] ring-1 ring-copper-500'
            : isSelectedInEdit
              ? 'border-copper-500 bg-[#f9efe8]/70 ring-1 ring-copper-500'
              : 'border-stone-300/80 bg-[#FAF7F2]/60 hover:border-stone-400 hover:bg-[#FAF7F2]'
        } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
        title={`Seat #${seat.seatIndex} (Vacant) — Click to assign`}
      >
        {/* Top: Seat number and delete seat button */}
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="text-[9px] font-medium tabular-nums text-stone-400 group-hover:text-stone-600">
            #{seat.seatIndex}
          </span>
          {mode === 'edit' && onDeleteSeat && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSeat(seat, row);
              }}
              className="cursor-pointer rounded-sm p-0.5 text-stone-300 opacity-0 transition hover:bg-[#f7ebe8] hover:text-[#84372d] group-hover:opacity-100"
              title={`Remove Seat #${seat.seatIndex}`}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {/* Center: Action / Drag-drop hint */}
        <div className="my-auto flex flex-col items-center justify-center">
          {isDragOver ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-copper-700">Drop</span>
          ) : isCompact ? (
            <Plus className="h-3 w-3 text-stone-300 group-hover:text-copper-600" />
          ) : (
            <span className="text-[11px] text-stone-400 group-hover:text-navy-950">
              {mode === 'edit' ? '+ Assign' : 'Vacant'}
            </span>
          )}
        </div>

        <div className="h-2 w-full" />
      </div>
    );
  }

  // 3. Singer Assigned
  const voicePart = seat.voicePart || assignedSinger?.voicePart || 'B1';
  const badgeClass = voicePartBadgeColor(voicePart);
  const fullDisplayName = seat.singerName || assignedSinger?.name || seat.singerEmail || 'Singer';
  const isOnLeave = assignedSinger?.status === 'On_Leave';

  const attendanceStatus: 'Present' | 'Late' | 'Absent' =
    absenceRecord?.status === 'Absent'
      ? 'Absent'
      : absenceRecord?.status === 'Late'
        ? 'Late'
        : 'Present';

  let attendanceBg = 'border-stone-200/90 bg-white hover:border-stone-400';
  if (mode === 'attendance') {
    if (attendanceStatus === 'Absent') {
      attendanceBg = 'border-[#e4c4bc] bg-[#f7ebe8]/85';
    } else if (attendanceStatus === 'Late') {
      attendanceBg = 'border-[#e6d5bc] bg-[#f8efe2]/85';
    } else {
      attendanceBg = 'border-[#c8d8ce] bg-[#eef3f0]/65';
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
      className={`group relative flex shrink-0 select-none flex-col justify-between rounded-sm border text-left transition-all ${attendanceBg} ${
        isCompact
          ? 'min-h-[66px] w-16 p-1.5 sm:min-h-[70px] sm:w-18'
          : 'min-h-[82px] w-28 p-2 sm:min-h-[88px] sm:w-34'
      } ${
        isCurrentUser
          ? 'border-copper-600 bg-[#f9efe8]/65 ring-1 ring-copper-600'
          : ''
      } ${
        isDragOver
          ? 'z-10 scale-105 border-copper-500 bg-[#f9efe8] ring-1 ring-copper-500'
          : isBeingDragged
            ? 'scale-95 opacity-35 ring-1 ring-dashed ring-copper-400'
            : isSelectedInEdit
              ? 'scale-[1.02] border-copper-500 bg-[#f9efe8]/80 ring-1 ring-copper-500'
              : ''
      } ${isDimmed ? 'opacity-25' : 'opacity-100'} ${
        isDraggableInEdit
          ? 'cursor-grab hover:border-copper-500 active:cursor-grabbing'
          : 'cursor-pointer'
      }`}
      title={`${fullDisplayName} (${voicePart}) · ${row.name}, Seat #${seat.seatIndex} · Status: ${attendanceStatus}`}
    >
      {/* Top Header: Voice Part & Seat Number */}
      <div className="flex items-center justify-between gap-0.5">
        <span
          className={`inline-flex items-center rounded-sm border font-semibold ${badgeClass} ${
            isCompact ? 'px-1 py-0 text-[8.5px] leading-tight' : 'px-1.5 py-0.5 text-[9.5px]'
          }`}
        >
          {voicePart}
        </span>

        <div className="flex items-center gap-1">
          {isDraggableInEdit && !isCompact && (
            <GripVertical className="h-3 w-3 text-stone-300 group-hover:text-copper-600" />
          )}
          {isOnLeave && (
            <span title="On Season Leave" className="text-[10px] text-copper-700">
              <Moon className="inline h-2.5 w-2.5" />
            </span>
          )}
          {isCurrentUser && (
            <span
              className={`flex items-center bg-copper-600 font-semibold uppercase tracking-wider text-white ${
                isCompact
                  ? 'h-1.5 w-1.5 rounded-full'
                  : 'rounded-sm px-1 py-0 text-[8px]'
              }`}
              title="Your Seat"
            >
              {!isCompact && <span>You</span>}
            </span>
          )}
          <span className="text-[9px] font-medium tabular-nums text-stone-400">
            #{seat.seatIndex}
          </span>
        </div>
      </div>

      {/* Singer Name */}
      <div className="my-0.5 flex h-[28px] min-w-0 items-center sm:h-[32px]">
        <p
          className={`line-clamp-2 break-words leading-[1.15] ${
            isCompact ? 'text-[10px] sm:text-[10.5px]' : 'text-xs sm:text-[13px]'
          } ${
            isCurrentUser
              ? 'font-semibold text-navy-950'
              : attendanceStatus === 'Absent'
                ? 'font-semibold text-[#84372d]'
                : 'font-medium text-navy-950'
          }`}
        >
          {fullDisplayName}
        </p>
      </div>

      {/* Bottom Footer: Mode indicator */}
      <div className="flex items-center justify-between gap-1 text-[10px]">
        {mode === 'attendance' ? (
          attendanceStatus === 'Absent' ? (
            <span
              className="inline-flex items-center gap-0.5 font-semibold text-[#84372d]"
              title={absenceRecord?.reason || 'Marked absent at roll call'}
            >
              <X className="h-2.5 w-2.5 stroke-[2.25]" />
              <span className={isCompact ? 'text-[8.5px]' : ''}>Absent</span>
            </span>
          ) : attendanceStatus === 'Late' ? (
            <span
              className="inline-flex items-center gap-0.5 font-semibold text-[#7d5220]"
              title={absenceRecord?.reason || 'Marked late'}
            >
              <Clock className="h-2.5 w-2.5 stroke-[2.25]" />
              <span className={isCompact ? 'text-[8.5px]' : ''}>Late</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 font-medium text-[#2d523d]">
              <Check className="h-2.5 w-2.5 stroke-[2.25]" />
              <span className={isCompact ? 'text-[8.5px]' : ''}>Present</span>
            </span>
          )
        ) : mode === 'edit' ? (
          <div className="flex w-full items-center justify-between">
            <span className="truncate text-[9px] font-medium text-stone-400 group-hover:text-copper-600">
              {isDragOver ? 'Drop' : isSelectedInEdit ? 'Selected' : isCompact ? '' : 'Drag / Swap'}
            </span>
            {onClearSeat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSeat(seat, row);
                }}
                className="ml-auto cursor-pointer rounded-sm p-0.5 text-stone-400 hover:bg-stone-200 hover:text-[#84372d]"
                title={`Unassign ${fullDisplayName} to pool`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="truncate text-[9px] text-stone-400">
            {isCompact ? voicePart : row.name}
          </span>
        )}
      </div>
    </div>
  );
}
