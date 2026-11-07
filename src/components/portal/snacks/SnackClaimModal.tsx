import { formatEventDate } from '../../../lib/utils';
import type { EventType, Singer } from '../../../types/choir';
import { X } from 'lucide-react';

export type SlotNumber = 1 | 2 | 3 | 4;

export interface ClaimModalState {
  eventId: string;
  slot: SlotNumber;
  action: 'claim' | 'update_item';
  eventTitle: string;
  eventDate: string;
  eventType: EventType;
  initialItem: string;
}

export const CONCERT_DUTY_SUGGESTIONS = [
  'Concert Setup & Stage (Early Call)',
  'Concert Strike & Teardown',
  'Box Office & Will-Call Check-in',
  'Patron Reception & Greeting',
  'Program Usher & Greeter',
  'Transport Equipment & Banners',
];

export const REHEARSAL_SNACK_SUGGESTIONS = [
  'Fresh fruit (grapes, clementines, berries)',
  'Cookies or brownies (nut-free)',
  'Cheese & crackers',
  'Sparkling water or juice',
  'Pretzels, chips & salsa',
  'Room & Chair Setup (early call)',
  'End-of-Rehearsal Cleanup',
];

interface Props {
  modalState: ClaimModalState | null;
  singer: Singer;
  itemInput: string;
  onItemInputChange: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function SnackClaimModal({
  modalState,
  singer,
  itemInput,
  onItemInputChange,
  onSubmit,
  onClose,
}: Props) {
  if (!modalState) return null;

  const isConcertCall = modalState.eventType === 'Concert' || modalState.eventType === 'Dress';
  const suggestions = isConcertCall ? CONCERT_DUTY_SUGGESTIONS : REHEARSAL_SNACK_SUGGESTIONS;

  const inputLabel = isConcertCall
    ? 'Duty or Crew Role'
    : 'Task or Refreshment';

  const placeholderText = isConcertCall
    ? 'e.g. Stage Setup, Box Office Check-in, Strike…'
    : 'e.g. Refreshments, room setup, end cleanup…';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-sm border border-stone-300 bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-200/90 bg-white px-6 py-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              {modalState.action === 'claim'
                ? isConcertCall
                  ? 'Concert Crew Signup'
                  : 'Rehearsal Duty Signup'
                : 'Update Commitment'}{' '}
              · Slot 0{modalState.slot}
            </span>
            <h3 className="mt-1 font-editorial text-2xl font-normal text-navy-950">
              {formatEventDate(modalState.eventDate)} — {modalState.eventTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-sm p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-navy-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 p-6">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-500">
              Member
            </label>
            <div className="mt-1.5 rounded-sm border border-stone-200/90 bg-white px-3.5 py-2 text-sm font-medium text-navy-950">
              {singer.name} <span className="text-stone-500">· {singer.voicePart}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="duty-item"
              className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"
            >
              <span>{inputLabel}</span>
              <span className="font-normal lowercase tracking-normal text-stone-400">Custom text welcome</span>
            </label>
            <input
              id="duty-item"
              type="text"
              maxLength={100}
              value={itemInput}
              onChange={(e) => onItemInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder={placeholderText}
              className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-stone-500">
              {isConcertCall
                ? 'Helps concert managers and section leaders coordinate stage setup, doors, and strike.'
                : 'Helps fellow singers coordinate rehearsal duties and refreshments.'}
            </p>
          </div>

          {/* Quick suggestion chips */}
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {isConcertCall ? 'Suggested Crew Roles' : 'Suggested Duties & Refreshments'}
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => {
                const isSelected = itemInput === suggestion;
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onItemInputChange(suggestion)}
                    className={`cursor-pointer rounded-sm border px-2.5 py-1 text-xs transition ${
                      isSelected
                        ? 'border-navy-950 bg-navy-950 font-medium text-white'
                        : 'border-stone-200/90 bg-white text-stone-700 hover:border-copper-500 hover:text-navy-950'
                    }`}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-stone-200/90 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-sm border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="cursor-pointer rounded-sm bg-navy-950 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-navy-900"
          >
            {modalState.action === 'claim' ? 'Confirm Signup' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
