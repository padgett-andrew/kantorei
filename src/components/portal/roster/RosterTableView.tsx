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
    <div className="overflow-hidden rounded-sm border border-stone-200/90 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200/90 bg-[#FAF7F2] text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            <tr>
              <th className="px-4 py-3.5 sm:px-6">Member</th>
              <th className="px-3 py-3.5">Voice</th>
              <th className="px-3 py-3.5">Section</th>
              <th className="px-3 py-3.5">Role</th>
              <th className="px-3 py-3.5">Contact</th>
              <th className="px-3 py-3.5">Status</th>
              {canManageRoster && <th className="px-4 py-3.5 text-right sm:px-6">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80">
            {singers.map((m) => {
              const badgeClass = m.voicePart ? voicePartBadgeColor(m.voicePart) : '';
              const isBusy = busyEmail === m.email;
              const initials = m.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2);

              return (
                <tr
                  key={m.email}
                  className={`transition hover:bg-[#FAF7F2]/65 ${
                    m.status === 'On_Leave' ? 'bg-[#FAF7F2]/50' : ''
                  }`}
                >
                  {/* Member Name */}
                  <td className="px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-[#FAF7F2] font-editorial text-sm font-medium text-navy-950">
                        {initials}
                      </span>
                      <div>
                        <p className="font-editorial text-lg font-medium leading-tight text-navy-950">
                          {m.name}
                        </p>
                        <p className="max-w-[180px] truncate text-[11px] text-stone-500 sm:max-w-none">
                          {m.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Voice Part */}
                  <td className="whitespace-nowrap px-3 py-3.5">
                    {m.voicePart ? (
                      <span
                        className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
                      >
                        {m.voicePart}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>

                  {/* Section */}
                  <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                    {m.sectionGroup || '—'}
                  </td>

                  {/* Role */}
                  <td className="whitespace-nowrap px-3 py-3.5">
                    {m.role !== 'Singer' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-copper-700">
                        {m.role.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-stone-500">Singer</span>
                    )}
                  </td>

                  {/* Phone & Contact */}
                  <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                    {m.phone ? (
                      <div className="flex items-center gap-2.5">
                        <span>{m.phone}</span>
                        <a
                          href={`tel:${m.phone}`}
                          className="text-[10px] font-semibold uppercase tracking-wider text-navy-950 hover:text-copper-700 hover:underline"
                        >
                          Call
                        </a>
                        <a
                          href={`sms:${m.phone}`}
                          className="text-[10px] font-semibold uppercase tracking-wider text-navy-950 hover:text-copper-700 hover:underline"
                        >
                          SMS
                        </a>
                      </div>
                    ) : (
                      <span className="italic text-stone-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <StatusBadge status={m.status} />
                  </td>

                  {/* Admin Actions */}
                  {canManageRoster && (
                    <td className="whitespace-nowrap px-4 py-3.5 text-right sm:px-6">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleSeasonLeave(m)}
                          disabled={isBusy}
                          className={`cursor-pointer rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition ${
                            m.status === 'On_Leave'
                              ? 'border-stone-300 bg-white text-navy-950 hover:border-navy-950'
                              : 'border-[#e6d5bc] bg-[#f8efe2]/70 text-[#7d5220] hover:border-copper-500'
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
                          className="cursor-pointer rounded-sm border border-stone-300 bg-white p-1 text-stone-600 transition hover:border-navy-950 hover:text-navy-950"
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
