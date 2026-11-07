import { useState } from 'react';
import {
  type AbsenceRecord,
  inferSectionGroup,
  type ScheduleEvent,
  type SeatingRow,
  type SeatingSeat,
  type Singer,
} from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import {
  Check,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  UserX,
  X,
} from 'lucide-react';

interface Props {
  seat: SeatingSeat;
  row: SeatingRow;
  event: ScheduleEvent;
  singer?: Singer;
  absenceRecord?: AbsenceRecord;
  onClose: () => void;
  onUpdateStatus: (
    target: Singer,
    status: 'Present' | 'Late' | 'Absent',
    reason?: string
  ) => Promise<void>;
}

const PRESET_REASONS = [
  'Marked at roll call',
  'Running late (traffic / transit)',
  'Illness / vocal rest',
  'Work conflict',
  'Family obligation',
  'Unexcused',
];

export default function AttendancePopover({
  seat,
  row,
  event,
  singer,
  absenceRecord,
  onClose,
  onUpdateStatus,
}: Props) {
  const [customReason, setCustomReason] = useState(absenceRecord?.reason || '');
  const [busy, setBusy] = useState(false);

  const displayName = seat.singerName || singer?.name || seat.singerEmail || 'Singer';
  const voicePart = seat.voicePart || singer?.voicePart || 'B1';
  const badgeClass = voicePartBadgeColor(voicePart);

  const currentStatus: 'Present' | 'Late' | 'Absent' =
    absenceRecord?.status === 'Absent'
      ? 'Absent'
      : absenceRecord?.status === 'Late'
        ? 'Late'
        : 'Present';

  async function handleAction(status: 'Present' | 'Late' | 'Absent') {
    if (!singer && seat.singerEmail) {
      const minimalSinger: Singer = {
        email: seat.singerEmail,
        name: displayName,
        voicePart,
        sectionGroup: inferSectionGroup(voicePart),
        role: 'Singer',
        phone: '',
        active: true,
        status: 'Active',
      };
      setBusy(true);
      try {
        await onUpdateStatus(minimalSinger, status, customReason);
        onClose();
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!singer) return;
    setBusy(true);
    try {
      await onUpdateStatus(singer, status, customReason);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-sm border border-stone-300 bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200/90 bg-white px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                {voicePart}
              </span>
              <h3 className="font-editorial text-2xl font-normal text-navy-950">{displayName}</h3>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">
              {row.name}, Seat #{seat.seatIndex} · {event.title} ({event.date})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-sm p-1 text-stone-400 hover:bg-stone-100 hover:text-navy-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Existing Absence Notice */}
          {absenceRecord && absenceRecord.status !== 'Cleared' && (
            <div className="rounded-sm border border-copper-300/80 bg-[#f9efe8]/70 p-3 text-xs text-navy-950">
              <div className="flex items-center justify-between font-semibold">
                <span>Current Status: {absenceRecord.status}</span>
                <span className="text-[10px] font-normal text-stone-500">
                  Recorded by {absenceRecord.submittedBy}
                </span>
              </div>
              {absenceRecord.reason && (
                <p className="mt-1 italic text-stone-700">&ldquo;{absenceRecord.reason}&rdquo;</p>
              )}
            </div>
          )}

          {/* Attendance Action Buttons */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Roll Call Status
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('Present')}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border p-2.5 text-center transition ${
                  currentStatus === 'Present'
                    ? 'border-navy-950 bg-navy-950 text-white'
                    : 'border-stone-200/90 bg-white text-stone-700 hover:border-navy-950'
                }`}
              >
                <Check className="mb-1 h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Present</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('Late')}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border p-2.5 text-center transition ${
                  currentStatus === 'Late'
                    ? 'border-copper-600 bg-copper-600 text-white'
                    : 'border-stone-200/90 bg-white text-stone-700 hover:border-copper-600'
                }`}
              >
                <Clock className="mb-1 h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Late</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('Absent')}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-sm border p-2.5 text-center transition ${
                  currentStatus === 'Absent'
                    ? 'border-[#84372d] bg-[#84372d] text-white'
                    : 'border-stone-200/90 bg-white text-stone-700 hover:border-[#84372d]'
                }`}
              >
                <UserX className="mb-1 h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Absent</span>
              </button>
            </div>
          </div>

          {/* Reason / Notes Input */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Note / Reason (Optional)
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Transit delay, vocal rest…"
              className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-xs text-navy-950 focus:border-navy-950 focus:outline-none"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCustomReason(reason)}
                  className="cursor-pointer rounded-sm border border-stone-200/90 bg-white px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400 hover:text-navy-950"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Contact Links */}
          {singer && (singer.phone || singer.email) && (
            <div className="border-t border-stone-200/80 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Direct Contact
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {singer.phone && (
                  <>
                    <a
                      href={`tel:${singer.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-2.5 py-1 text-xs font-medium text-navy-950 hover:border-navy-950"
                    >
                      <Phone className="h-3 w-3 text-copper-600" />
                      Call {singer.phone}
                    </a>
                    <a
                      href={`sms:${singer.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-2.5 py-1 text-xs font-medium text-navy-950 hover:border-navy-950"
                    >
                      <MessageSquare className="h-3 w-3 text-copper-600" />
                      Text
                    </a>
                  </>
                )}
                {singer.email && (
                  <a
                    href={`mailto:${singer.email}`}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300/90 bg-white px-2.5 py-1 text-xs font-medium text-navy-950 hover:border-navy-950"
                  >
                    <Mail className="h-3 w-3 text-copper-600" />
                    Email
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
