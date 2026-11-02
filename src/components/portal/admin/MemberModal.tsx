import type { SyntheticEvent } from 'react';
import { Check, X } from 'lucide-react';
import {
  MEMBER_ROLES,
  VOICE_PARTS,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h3 className="font-editorial text-2xl font-bold text-navy-950">
              {mode === 'create' ? 'Add Singer' : 'Edit Member'}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Manage vocal part, attendance status, and admin privileges.
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

        <form onSubmit={onSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={mode === 'update'}
              value={formState.email}
              onChange={(e) => onChange({ ...formState, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => onChange({ ...formState, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Voice Part
              </label>
              <select
                value={formState.voicePart}
                onChange={(e) =>
                  onChange({ ...formState, voicePart: e.target.value as VoicePart })
                }
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {VOICE_PARTS.map((vp) => (
                  <option key={vp} value={vp}>
                    {vp} ({inferSectionGroup(vp)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Portal Role
              </label>
              <select
                value={formState.role}
                onChange={(e) =>
                  onChange({ ...formState, role: e.target.value as MemberRole })
                }
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="612-555-0100"
              value={formState.phone}
              onChange={(e) => onChange({ ...formState, phone: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Season Participation Status
            </span>
            <div className="mt-1.5 space-y-2">
              {(
                [
                  {
                    value: 'Active',
                    title: 'Active This Season',
                    desc: 'Singing in current cycle · included in roll call & alerts',
                  },
                  {
                    value: 'On_Leave',
                    title: 'Season Leave / Asleep (Skipping Cycle)',
                    desc: 'Paused from roll call & season alerts · keeps portal access',
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
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                    formState.status === opt.value
                      ? 'border-navy-900 bg-ivory-50'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="singer-status"
                    checked={formState.status === opt.value}
                    onChange={() => onChange({ ...formState, status: opt.value })}
                    className="mt-0.5 h-4 w-4 accent-navy-900"
                  />
                  <div>
                    <span className="block text-xs font-bold text-navy-950">
                      {opt.title}
                    </span>
                    <span className="block text-[11px] text-zinc-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save to Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
