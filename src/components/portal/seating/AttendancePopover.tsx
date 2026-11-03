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
  'No show / unexcused',
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
      // Create minimal target singer object if not in active roster
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-md border px-1.5 py-0.2 text-[11px] font-bold ${badgeClass}`}>
                {voicePart}
              </span>
              <h3 className="text-base font-bold text-navy-950">{displayName}</h3>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {row.name} · Seat #{seat.seatIndex} · {event.title} ({event.date})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Absence Notice */}
        {absenceRecord && absenceRecord.status !== 'Cleared' && (
          <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
            <div className="flex items-center justify-between font-bold">
              <span>Current Status: {absenceRecord.status}</span>
              <span className="text-[10px] font-normal text-amber-700">
                Logged by {absenceRecord.submittedBy}
              </span>
            </div>
            {absenceRecord.reason && (
              <p className="mt-1 text-amber-800 italic">“{absenceRecord.reason}”</p>
            )}
          </div>
        )}

        {/* Attendance Action Buttons */}
        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Update Roll Call Status
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleAction('Present')}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer ${
                currentStatus === 'Present'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-bold'
                  : 'border-zinc-200 bg-zinc-50 hover:border-emerald-300 hover:bg-emerald-50/50 text-zinc-700'
              }`}
            >
              <Check className="h-4 w-4 text-emerald-600 mb-0.5" />
              <span className="text-xs font-semibold">Present</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => handleAction('Late')}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer ${
                currentStatus === 'Late'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500 font-bold'
                  : 'border-zinc-200 bg-zinc-50 hover:border-amber-300 hover:bg-amber-50/50 text-zinc-700'
              }`}
            >
              <Clock className="h-4 w-4 text-amber-600 mb-0.5" />
              <span className="text-xs font-semibold">Late</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => handleAction('Absent')}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition cursor-pointer ${
                currentStatus === 'Absent'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500 font-bold'
                  : 'border-zinc-200 bg-zinc-50 hover:border-rose-300 hover:bg-rose-50/50 text-zinc-700'
              }`}
            >
              <UserX className="h-4 w-4 text-rose-600 mb-0.5" />
              <span className="text-xs font-semibold">Absent</span>
            </button>
          </div>
        </div>

        {/* Reason / Notes Input */}
        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Note / Reason (Optional)
          </label>
          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="e.g. Flight delayed, ill, etc."
            className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:border-navy-900 focus:outline-hidden"
          />

          {/* Quick preset chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setCustomReason(reason)}
                className="cursor-pointer rounded-lg bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Contact Links if singer is missing */}
        {singer && (singer.phone || singer.email) && (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Quick Contact
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {singer.phone && (
                <>
                  <a
                    href={`tel:${singer.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    <Phone className="h-3 w-3 text-zinc-500" />
                    Call {singer.phone}
                  </a>
                  <a
                    href={`sms:${singer.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    <MessageSquare className="h-3 w-3 text-zinc-500" />
                    Text
                  </a>
                </>
              )}
              {singer.email && (
                <a
                  href={`mailto:${singer.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  <Mail className="h-3 w-3 text-zinc-500" />
                  Email
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
