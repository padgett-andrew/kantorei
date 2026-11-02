import type { SyntheticEvent } from 'react';
import { Check, X } from 'lucide-react';
import { EVENT_TYPES, type EventType } from '../../../types/choir';

export interface EventFormState {
  eventId?: string;
  title: string;
  date: string;
  time: string;
  type: EventType;
  location: string;
  description: string;
}

interface Props {
  mode: 'create' | 'update' | null;
  formState: EventFormState;
  onChange: (state: EventFormState) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (e: SyntheticEvent<HTMLFormElement>) => void;
}

export default function EventModal({
  mode,
  formState,
  onChange,
  saving,
  onClose,
  onSave,
}: Props) {
  if (!mode) return null;

  function insertDescriptionSnippet(snippet: string) {
    const current = formState.description ? `${formState.description}\n\n` : '';
    onChange({ ...formState, description: `${current}${snippet}` });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="my-8 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h3 className="font-editorial text-2xl font-bold text-navy-950">
              {mode === 'create' ? 'Add Calendar Call' : 'Edit Calendar Call'}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Set date, call times, location, and rehearsal focus notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Event Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tuesday Rehearsal or Winter Concert - Performance 1"
              value={formState.title}
              onChange={(e) => onChange({ ...formState, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
            />
          </div>

          {/* Date & Type */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Date
              </label>
              <input
                type="date"
                required
                value={formState.date}
                onChange={(e) => onChange({ ...formState, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Call Type
              </label>
              <select
                value={formState.type}
                onChange={(e) =>
                  onChange({
                    ...formState,
                    type: e.target.value as EventType,
                  })
                }
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Time (Call vs Performance)
              </label>
              <span className="text-[11px] text-zinc-400">
                Include call times if applicable
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. 6:15 PM Call / 7:30 PM Concert or 7:00 PM - 9:30 PM"
              value={formState.time}
              onChange={(e) => onChange({ ...formState, time: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Presets:
              </span>
              {[
                '7:00 PM - 9:30 PM',
                '6:15 PM Call / 7:30 PM Concert',
                '6:00 PM - 10:00 PM (Dress)',
                '9:00 AM - 3:00 PM (Retreat)',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ ...formState, time: preset })}
                  className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600 transition hover:bg-zinc-100"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Location / Venue
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Main Sanctuary"
              value={formState.location}
              onChange={(e) => onChange({ ...formState, location: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Presets:
              </span>
              {['Main Sanctuary', 'Fellowship Hall', 'Choir Room', 'Ordway Concert Hall'].map(
                (loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => onChange({ ...formState, location: loc })}
                    className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600 transition hover:bg-zinc-100"
                  >
                    {loc}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Description & Focus */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Call Details, Rehearsal Focus & Notes
              </label>
              <span className="text-[11px] text-zinc-400">Multi-line supported</span>
            </div>
            <textarea
              rows={4}
              placeholder="Add details about call times vs concert times, rehearsal focus, attire, or volunteers needed..."
              value={formState.description}
              onChange={(e) => onChange({ ...formState, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Insert:
              </span>
              <button
                type="button"
                onClick={() =>
                  insertDescriptionSnippet(
                    'Call Time: 6:15 PM\nPerformance Time: 7:30 PM'
                  )
                }
                className="cursor-pointer rounded-lg border border-gold-300 bg-amber-50/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100"
              >
                + Call vs Concert
              </button>
              <button
                type="button"
                onClick={() =>
                  insertDescriptionSnippet(
                    'Rehearsal Focus: Movements 1-3, balance & dynamics'
                  )
                }
                className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                + Focus
              </button>
              <button
                type="button"
                onClick={() =>
                  insertDescriptionSnippet(
                    'Attire: Concert Black (Formal floor-length dress or black suit & tie)'
                  )
                }
                className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                + Attire
              </button>
              <button
                type="button"
                onClick={() =>
                  insertDescriptionSnippet(
                    'Volunteers Needed: 2 singers for set up at 5:45 PM'
                  )
                }
                className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                + Volunteers
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
