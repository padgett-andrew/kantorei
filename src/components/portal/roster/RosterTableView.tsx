import { Edit3 } from 'lucide-react';
import type { Singer } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import StatusBadge from './StatusBadge';

interface Props {
  singers: Singer[];
  canManageRoster: boolean;
  busyEmail: string | null;
  onToggleSeasonLeave: (singer: Singer) => void;
  onEditMember: (singer: Singer) => void;
}

export default function RosterTableView({
  singers,
  canManageRoster,
  busyEmail,
  onToggleSeasonLeave,
  onEditMember,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3 sm:px-6">Member</th>
              <th className="px-3 py-3">Voice</th>
              <th className="px-3 py-3">Section</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Status</th>
              {canManageRoster && <th className="px-4 py-3 sm:px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {singers.map((m) => {
              const badgeClass = voicePartBadgeColor(m.voicePart);
              const isBusy = busyEmail === m.email;

              return (
                <tr
                  key={m.email}
                  className={`hover:bg-zinc-50/60 transition ${
                    m.status === 'On_Leave' ? 'bg-indigo-50/15' : ''
                  }`}
                >
                  {/* Member Name */}
                  <td className="px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-300">
                        {m.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900">{m.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate max-w-[160px] sm:max-w-none">
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Voice Part */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`rounded-full border px-2 py-0.5 font-bold ${badgeClass}`}>
                      {m.voicePart}
                    </span>
                  </td>

                  {/* Section */}
                  <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">
                    {m.sectionGroup}
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {m.role !== 'Singer' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                        {m.role.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-zinc-500">Singer</span>
                    )}
                  </td>

                  {/* Phone & Contact */}
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
                    {m.phone ? (
                      <div className="flex items-center gap-2">
                        <span>{m.phone}</span>
                        <a
                          href={`tel:${m.phone}`}
                          className="text-emerald-700 hover:underline font-semibold text-[11px]"
                        >
                          Call
                        </a>
                        <a
                          href={`sms:${m.phone}`}
                          className="text-blue-700 hover:underline font-semibold text-[11px]"
                        >
                          SMS
                        </a>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic">None</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusBadge status={m.status} />
                  </td>

                  {/* Admin Actions */}
                  {canManageRoster && (
                    <td className="px-4 py-3 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleSeasonLeave(m)}
                          disabled={isBusy}
                          className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                            m.status === 'On_Leave'
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                          }`}
                          title={
                            m.status === 'On_Leave'
                              ? 'Reactivate for season'
                              : 'Pause for season (keep portal access)'
                          }
                        >
                          {m.status === 'On_Leave' ? 'Reactivate' : 'Leave'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditMember(m)}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:border-zinc-300 hover:text-navy-950 transition"
                          title="Edit Member"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

