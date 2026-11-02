import { formatEventDate } from '../../../lib/utils';
import type { EventType, Singer } from '../../../types/choir';
import { Sparkles, X } from 'lucide-react';

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
  '🎪 Concert Setup & Risers (Early Call)',
  '📦 Concert Strike & Teardown',
  '🎟️ Box Office & Will-Call Check-in',
  '🍷 Patron Reception & Hospitality',
  '🚪 Program Usher & Greeter',
  '🚚 Transport Equipment & Banners',
];

export const REHEARSAL_SNACK_SUGGESTIONS = [
  '🍇 Fresh fruit (grapes, clementines, berries)',
  '🍪 Cookies or brownies (nut-free)',
  '🧀 Cheese & crackers',
  '💧 Sparkling water or juice',
  '🥨 Pretzels, chips & salsa',
  '🪑 Room & Chair Setup (early call)',
  '🧹 End-of-Rehearsal Cleanup',
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
    ? 'What duty or task are you claiming?'
    : 'What do you plan to bring or assist with?';

  const placeholderText = isConcertCall
    ? 'e.g. Concert Setup & Risers, Box Office Check-in, Strike…'
    : 'e.g. Clementines & cheese, cookies (nut-free), sparkling water, room setup…';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-ivory-50 px-6 py-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
              {modalState.action === 'claim'
                ? isConcertCall
                  ? 'Concert Duty Signup'
                  : 'Hospitality Signup'
                : 'Edit Your Commitment'}{' '}
              · Slot {modalState.slot}
            </span>
            <h3 className="font-editorial text-lg font-bold text-navy-950">
              {formatEventDate(modalState.eventDate)} — {modalState.eventTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200/70 hover:text-navy-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-500">Signing Up As</label>
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-semibold text-navy-950">
              {singer.name} ({singer.voicePart})
            </div>
          </div>

          <div>
            <label
              htmlFor="duty-item"
              className="flex items-center justify-between text-xs font-semibold text-zinc-700"
            >
              <span>{inputLabel}</span>
              <span className="text-zinc-400 font-normal">Custom text allowed</span>
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
              className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              {isConcertCall
                ? 'Lets concert managers & section leaders know who is handling risers, doors, or strike.'
                : 'Entering this lets fellow singers know what’s already covered so we have a great variety!'}
            </p>
          </div>

          {/* Quick suggestion chips */}
          <div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
              <Sparkles className="h-3 w-3 text-gold-500" />
              {isConcertCall ? 'Recommended Concert Tasks:' : 'Quick Ideas:'}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => {
                const cleanText = suggestion.replace(/^[^\s]+\s*/, '');
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onItemInputChange(cleanText)}
                    className="cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 transition hover:border-gold-500 hover:bg-ivory-50 hover:text-navy-900"
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-zinc-200/80 bg-zinc-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="cursor-pointer rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-navy-800"
          >
            {modalState.action === 'claim' ? 'Confirm Slot Signup' : 'Save Duty / Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
