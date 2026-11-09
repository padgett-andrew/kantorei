import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Send, X } from 'lucide-react';
import { formatEventDate } from '../../lib/utils';

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  sectionGroup: string;
  buttonLabel?: string;
  buttonVariant?: 'hero' | 'nocturne' | 'pill' | 'danger' | 'ghost';
  className?: string;
}

const LATE_OPTIONS = [
  { label: '10–15 min Late', text: 'Running 10–15 minutes late (traffic / commute)' },
  { label: '~30 min Late', text: 'Running ~30 minutes late, arriving during rehearsal' },
  { label: 'Arriving by 7:30 PM', text: 'Delayed, arriving by 7:30 PM' },
  { label: 'Work Running Over', text: 'Work call running late, on my way shortly' },
  { label: 'Weather / Transit', text: 'Delayed due to weather or transit delay' },
];

const ABSENCE_OPTIONS = [
  { label: 'Illness / Vocal Rest', text: 'Feeling unwell / resting voice' },
  { label: 'Work / Family Conflict', text: 'Work or family conflict' },
  { label: 'Out of Town', text: 'Out of town / travel conflict' },
  { label: 'Medical Appointment', text: 'Medical appointment conflict' },
];

export default function QuickLateNoticeModal({
  eventId,
  eventTitle,
  eventDate,
  sectionGroup,
  buttonLabel = 'Report Conflict / Late',
  buttonVariant = 'hero',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [statusType, setStatusType] = useState<'Late' | 'Absent'>('Late');
  const [reason, setReason] = useState(LATE_OPTIONS[0].text);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleTypeChange(nextType: 'Late' | 'Absent') {
    setStatusType(nextType);
    setReason(nextType === 'Late' ? LATE_OPTIONS[0].text : ABSENCE_OPTIONS[0].text);
  }

  async function handleSubmit(e?: React.SyntheticEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          reason,
          status: statusType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit notice.');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending notice.');
    } finally {
      setSubmitting(false);
    }
  }

  const variantClasses =
    buttonVariant === 'nocturne'
      ? 'inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-stone-200 transition hover:border-copper-300/60 hover:bg-white/10 hover:text-white'
      : buttonVariant === 'hero'
      ? 'inline-flex cursor-pointer items-center gap-2 rounded-sm border border-stone-300 bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700 transition hover:border-navy-950 hover:bg-white hover:text-navy-950'
      : buttonVariant === 'ghost'
      ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-stone-200/90 bg-transparent px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500 transition hover:border-stone-400 hover:bg-white hover:text-navy-950'
      : buttonVariant === 'pill'
      ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-copper-300/80 bg-[#f9efe8] px-3 py-1.5 text-xs font-semibold text-copper-600 transition hover:bg-[#f4cfbb]/50'
      : 'inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setSuccess(false);
          setError('');
        }}
        className={className || variantClasses}
      >
        <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-sm border border-stone-200 bg-[#FAF7F2] p-6 text-stone-900 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200/90 pb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
                  Attendance Notice
                </span>
                <h3 className="mt-1 font-editorial text-2xl font-semibold leading-tight text-navy-950">
                  {eventTitle}
                </h3>
                <p className="mt-0.5 text-xs text-stone-500">{formatEventDate(eventDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close modal"
                className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-[#f5efe8] hover:text-navy-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="my-6 border-l-2 border-copper-500 bg-[#f5efe8] p-5">
                <div className="flex items-center gap-2 text-navy-950">
                  <CheckCircle2 className="h-5 w-5 text-copper-600" />
                  <h4 className="font-editorial text-xl font-semibold">
                    {statusType === 'Late' ? 'Late Notice Recorded' : 'Absence Notice Recorded'}
                  </h4>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                  {statusType === 'Late'
                    ? `Travel safely—${sectionGroup ? `your ${sectionGroup} Section Leader and ` : ''}ensemble leadership have been notified.`
                    : `${sectionGroup ? `Your ${sectionGroup} Section Leader and ensemble` : 'Ensemble'} leadership have been notified.`}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                {error && (
                  <div className="flex items-center gap-2 border-l-2 border-rose-600 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 2-way Mode Toggle */}
                <div>
                  <div className="grid grid-cols-2 border border-stone-300/90 bg-white p-0.5 rounded-sm">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('Late')}
                      className={`cursor-pointer rounded-xs py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        statusType === 'Late'
                          ? 'bg-navy-950 text-white'
                          : 'text-stone-600 hover:text-navy-950'
                      }`}
                    >
                      Running Late
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('Absent')}
                      className={`cursor-pointer rounded-xs py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                        statusType === 'Absent'
                          ? 'bg-copper-600 text-white'
                          : 'text-stone-600 hover:text-navy-950'
                      }`}
                    >
                      Full Absence
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Common Reasons
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(statusType === 'Late' ? LATE_OPTIONS : ABSENCE_OPTIONS).map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setReason(opt.text)}
                        className={`cursor-pointer rounded-sm border px-2.5 py-1.5 text-xs font-medium transition ${
                          reason === opt.text
                            ? 'border-navy-950 bg-navy-950 text-white'
                            : 'border-stone-200/90 bg-white text-stone-700 hover:border-stone-400 hover:text-navy-950'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="custom-reason"
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500"
                  >
                    {statusType === 'Late' ? 'Estimated Arrival / Note' : 'Reason / Note'}
                  </label>
                  <textarea
                    id="custom-reason"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-sm border border-stone-300 bg-white p-3 text-xs text-stone-900 focus:border-navy-950 focus:outline-none"
                    placeholder={
                      statusType === 'Late'
                        ? 'e.g. ETA 7:20 PM, delayed on I-35W'
                        : 'e.g. Work travel conflict'
                    }
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-stone-200/90 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="cursor-pointer rounded-sm px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600 transition hover:bg-[#f5efe8] hover:text-navy-950"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-copper-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-copper-600 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {submitting
                        ? 'Sending…'
                        : statusType === 'Late'
                        ? 'Send Late Notice'
                        : 'Submit Absence'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
