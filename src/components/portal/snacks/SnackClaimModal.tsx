import { formatEventDate } from '../../../lib/utils';
import type { Singer } from '../../../types/choir';
import { X } from 'lucide-react';

export type SlotNumber = 1 | 2 | 3 | 4;

export interface ClaimModalState {
  eventId: string;
  slot: SlotNumber;
  action: 'claim' | 'update_item';
  eventTitle: string;
  eventDate: string;
  initialItem: string;
}

export const SNACK_SUGGESTIONS = [
  '🍇 Fresh fruit (grapes, clementines, berries)',
  '🍪 Cookies or brownies (nut-free)',
  '🧀 Cheese & crackers',
  '💧 Sparkling water or juice',
  '🥨 Pretzels, chips & salsa',
  '🥕 Veggies & hummus dip',
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
              {modalState.action === 'claim' ? 'Hospitality Signup' : 'Edit Your Item'} · Slot{' '}
              {modalState.slot}
            </span>
            <h3 className="font-editorial text-lg font-bold text-navy-950">
              {formatEventDate(modalState.eventDate)}
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
              htmlFor="snack-item"
              className="flex items-center justify-between text-xs font-semibold text-zinc-700"
            >
              <span>What do you plan to bring?</span>
              <span className="text-zinc-400 font-normal">Optional</span>
            </label>
            <input
              id="snack-item"
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
              placeholder="e.g. Clementines & cheese, cookies (nut-free), sparkling water…"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Entering this lets fellow singers know what&apos;s already covered so we have a great variety!
            </p>
          </div>

          {/* Quick suggestion chips */}
          <div>
            <span className="text-[11px] font-semibold text-zinc-400">Quick Ideas:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SNACK_SUGGESTIONS.map((suggestion) => {
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
            {modalState.action === 'claim' ? 'Confirm Slot Signup' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
