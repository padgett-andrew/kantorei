import { Check, Copy, Edit3, Mail, Moon, Phone, ShieldCheck, Sun } from 'lucide-react';
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
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {singers.map((m) => {
        const isSelf = caller.email.toLowerCase() === m.email.toLowerCase();
        const badgeClass = voicePartBadgeColor(m.voicePart);
        const isBusy = busyEmail === m.email;

        return (
          <div
            key={m.email}
            className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-2xs transition ${
              m.status === 'On_Leave'
                ? 'border-indigo-200/80 bg-indigo-50/20'
                : isSelf
                ? 'border-gold-400 bg-amber-50/30 ring-1 ring-gold-400'
                : 'border-zinc-200/90 bg-white hover:border-zinc-300'
            }`}
          >
            <div>
              {/* Top Row: Name, Voice Badge & Role */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 leading-tight">
                      {m.name}
                    </h3>
                    {isSelf && (
                      <span className="rounded-full bg-gold-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-white shadow-2xs">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{m.sectionGroup} Section</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                    {m.voicePart}
                  </span>
                </div>
              </div>

              {/* Status & Role Badges */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <StatusBadge status={m.status} />
                {m.role !== 'Singer' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                    <ShieldCheck className="h-3 w-3" />
                    {m.role.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-3.5 space-y-1.5 text-xs text-zinc-600">
                <div className="flex items-center justify-between">
                  <a
                    href={`mailto:${m.email}`}
                    className="truncate hover:text-navy-950 hover:underline flex items-center gap-1.5"
                    title={m.email}
                  >
                    <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onCopyEmail(m.email)}
                    className="cursor-pointer text-zinc-400 hover:text-navy-950 p-1"
                    title="Copy email address"
                  >
                    {copiedEmail === m.email ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {m.phone ? (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
                      <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span>{m.phone}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${m.phone}`}
                        className="cursor-pointer rounded-lg bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 transition"
                        title="Call"
                      >
                        Call
                      </a>
                      <a
                        href={`sms:${m.phone}`}
                        className="cursor-pointer rounded-lg bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 transition"
                        title="Text"
                      >
                        Text
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400 italic">No phone listed</p>
                )}
              </div>
            </div>

            {/* Admin Actions Footer on Card */}
            {canManageRoster && (
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSeasonLeave(m)}
                  disabled={isBusy}
                  className={`cursor-pointer inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    m.status === 'On_Leave'
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                  title={m.status === 'On_Leave' ? 'Reactivate for season' : 'Pause for season'}
                >
                  {m.status === 'On_Leave' ? (
                    <>
                      <Sun className="h-3 w-3" />
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
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition"
                  title="Edit member details"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

