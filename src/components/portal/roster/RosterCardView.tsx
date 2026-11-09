import { Check, Copy, Edit3, Mail, Moon, Phone, Sun } from 'lucide-react';
import type { Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import StatusBadge from './StatusBadge';

interface Props {
  singers: Singer[];
  caller: Singer;
  canManageRoster: boolean;
  busyEmail: string | null;
  copiedEmail: string | null;
  onCopyEmail: (email: string) => void;
  onToggleSeasonLeave: (singer: Singer) => void;
  onEditMember: (singer: Singer) => void;
}

export default function RosterCardView({
  singers,
  caller,
  canManageRoster,
  busyEmail,
  copiedEmail,
  onCopyEmail,
  onToggleSeasonLeave,
  onEditMember,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {singers.map((m) => {
        const isSelf = caller.email.toLowerCase() === m.email.toLowerCase();
        const badgeClass = m.voicePart ? voicePartBadgeColor(m.voicePart) : '';
        const isBusy = busyEmail === m.email;

        return (
          <article
            key={m.email}
            className={`flex flex-col justify-between rounded-sm border p-5 transition ${
              m.status === 'On_Leave'
                ? 'border-[#e6d5bc] bg-[#FAF7F2]'
                : isSelf
                  ? 'border-copper-500 bg-white border-l-2 border-l-copper-600'
                  : 'border-stone-200/90 bg-white hover:border-stone-300'
            }`}
          >
            <div>
              {/* Top Row: Name, Voice Badge & Section */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-editorial text-2xl font-normal leading-tight text-navy-950">
                      {m.name}
                    </h3>
                    {isSelf && (
                      <span className="rounded-sm bg-copper-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">
                    {m.sectionGroup
                      ? `${m.sectionGroup} Section`
                      : m.role === 'Admin'
                        ? 'Artistic Staff / Admin'
                        : m.role.replace('_', ' ')}
                  </p>
                </div>

                {m.voicePart ? (
                  <span
                    className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${badgeClass}`}
                  >
                    {m.voicePart}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-sm border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                    {m.role === 'Admin' ? 'Staff' : '—'}
                  </span>
                )}
              </div>

              {/* Status & Leadership Role */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 border-b border-stone-200/70 pb-3">
                <StatusBadge status={m.status} />
                {m.role !== 'Singer' && (
                  <>
                    <span className="text-stone-300" aria-hidden="true">·</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-copper-700">
                      {m.role.replace('_', ' ')}
                    </span>
                  </>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-3.5 space-y-2 text-xs text-stone-600">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${m.email}`}
                    className="flex min-w-0 items-center gap-2 hover:text-navy-950 hover:underline"
                    title={m.email}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span className="truncate">{m.email}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onCopyEmail(m.email)}
                    className="cursor-pointer rounded-sm p-1 text-stone-400 hover:bg-stone-100 hover:text-navy-950"
                    title="Copy email address"
                  >
                    {copiedEmail === m.email ? (
                      <Check className="h-3.5 w-3.5 text-copper-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {m.phone ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium text-stone-700">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      <span>{m.phone}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${m.phone}`}
                        className="cursor-pointer rounded-sm border border-stone-200/90 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-950 transition hover:border-navy-950"
                        title="Call"
                      >
                        Call
                      </a>
                      <a
                        href={`sms:${m.phone}`}
                        className="cursor-pointer rounded-sm border border-stone-200/90 bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-950 transition hover:border-navy-950"
                        title="Text"
                      >
                        Text
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] italic text-stone-400">No telephone listed</p>
                )}
              </div>
            </div>

            {/* Admin Actions Footer */}
            {canManageRoster && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-200/80 pt-3">
                <button
                  type="button"
                  onClick={() => onToggleSeasonLeave(m)}
                  disabled={isBusy}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                    m.status === 'On_Leave'
                      ? 'border-stone-300 bg-white text-navy-950 hover:border-navy-950'
                      : 'border-[#e6d5bc] bg-[#f8efe2]/70 text-[#7d5220] hover:border-copper-500'
                  }`}
                  title={m.status === 'On_Leave' ? 'Reactivate for season' : 'Pause for season'}
                >
                  {m.status === 'On_Leave' ? (
                    <>
                      <Sun className="h-3 w-3 text-copper-600" />
                      <span>Reactivate</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-3 w-3" />
                      <span>Season Leave</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onEditMember(m)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                  title="Edit member details"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
