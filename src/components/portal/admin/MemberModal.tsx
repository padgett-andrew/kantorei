import type { SyntheticEvent } from 'react';
import { Check, X } from 'lucide-react';
import {
  MEMBER_ROLES,
  inferSectionGroup,
  type MemberRole,
  type SectionGroup,
  type SingerStatus,
  type VoicePart,
} from '../../../types/choir';

export interface MemberFormState {
  email: string;
  name: string;
  voicePart: VoicePart;
  sectionGroup: SectionGroup;
  role: MemberRole;
  phone: string;
  status: SingerStatus;
}

interface Props {
  mode: 'create' | 'update' | null;
  formState: MemberFormState;
  onChange: (state: MemberFormState) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (e: SyntheticEvent<HTMLFormElement>) => void;
}

export default function MemberModal({
  mode,
  formState,
  onChange,
  saving,
  onClose,
  onSave,
}: Props) {
  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-sm border border-stone-300 bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-stone-200/90 bg-white px-6 py-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              Ensemble Roster
            </span>
            <h3 className="mt-0.5 font-editorial text-2xl font-normal text-navy-950">
              {mode === 'create' ? 'Add Ensemble Member' : 'Edit Member Record'}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Configure vocal part, season participation status, and portal permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-sm p-1.5 text-stone-400 hover:bg-stone-100 hover:text-navy-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 p-6">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={mode === 'update'}
              value={formState.email}
              onChange={(e) => onChange({ ...formState, email: e.target.value })}
              className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => onChange({ ...formState, name: e.target.value })}
              className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                Voice Part
              </label>
              <select
                value={formState.voicePart}
                onChange={(e) => {
                  const vp = e.target.value as VoicePart;
                  onChange({
                    ...formState,
                    voicePart: vp,
                    sectionGroup: inferSectionGroup(vp),
                  });
                }}
                className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
              >
                <optgroup label="Soprano">
                  <option value="S">S — Soprano (General)</option>
                  <option value="S1">S1 — Soprano 1</option>
                  <option value="S2">S2 — Soprano 2</option>
                </optgroup>
                <optgroup label="Alto">
                  <option value="A">A — Alto (General)</option>
                  <option value="A1">A1 — Alto 1</option>
                  <option value="A2">A2 — Alto 2</option>
                </optgroup>
                <optgroup label="Tenor">
                  <option value="T">T — Tenor (General)</option>
                  <option value="T1">T1 — Tenor 1</option>
                  <option value="T2">T2 — Tenor 2</option>
                </optgroup>
                <optgroup label="Bass">
                  <option value="B">B — Bass (General)</option>
                  <option value="B1">B1 — Bass 1</option>
                  <option value="B2">B2 — Bass 2</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                Portal Role
              </label>
              <select
                value={formState.role}
                onChange={(e) =>
                  onChange({ ...formState, role: e.target.value as MemberRole })
                }
                className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
              >
                {MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="612-555-0100"
              value={formState.phone}
              onChange={(e) => onChange({ ...formState, phone: e.target.value })}
              className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
              Season Participation Status
            </span>
            <div className="mt-2 space-y-2">
              {(
                [
                  {
                    value: 'Active',
                    title: 'Active This Season',
                    desc: 'Singing in current cycle · included in roll call & alerts',
                  },
                  {
                    value: 'On_Leave',
                    title: 'Season Leave (Skipping Cycle)',
                    desc: 'Paused from roll call & season alerts · retains portal access',
                  },
                  {
                    value: 'Inactive',
                    title: 'Inactive / Former Member',
                    desc: 'Portal sign-in disabled',
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition ${
                    formState.status === opt.value
                      ? 'border-navy-950 bg-white'
                      : 'border-stone-200/90 bg-white/70 hover:border-stone-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="singer-status"
                    checked={formState.status === opt.value}
                    onChange={() => onChange({ ...formState, status: opt.value })}
                    className="mt-0.5 h-4 w-4 accent-navy-950"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-navy-950">
                      {opt.title}
                    </span>
                    <span className="block text-[11px] text-stone-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-200/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-sm border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700 hover:border-navy-950 hover:text-navy-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-navy-900 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5 text-copper-400" />
              {saving ? 'Saving…' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
