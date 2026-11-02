import { Edit3, Moon, Sun, Users } from 'lucide-react';
import type { Singer, SingerStatus } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';

interface Props {
  roster: Singer[];
  activeSingers: Singer[];
  onLeaveSingers: Singer[];
  inactiveSingers: Singer[];
  rosterStatusFilter: 'All' | SingerStatus;
  onStatusFilterChange: (status: 'All' | SingerStatus) => void;
  isAdmin: boolean;
  busyEmail: string | null;
  onToggleSeasonLeave: (singer: Singer) => void;
  onOpenEditModal: (singer: Singer) => void;
}

export default function RosterTab({
  roster,
  activeSingers,
  onLeaveSingers,
  inactiveSingers,
  rosterStatusFilter,
  onStatusFilterChange,
  isAdmin,
  busyEmail,
  onToggleSeasonLeave,
  onOpenEditModal,
}: Props) {
  const visibleRoster = roster.filter(
    (m) => rosterStatusFilter === 'All' || m.status === rosterStatusFilter
  );

  function renderStatusBadge(status: SingerStatus) {
    if (status === 'Active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    }
    if (status === 'On_Leave') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200/80">
          <Moon className="h-3 w-3 text-indigo-600" />
          Season Leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
        Inactive
      </span>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
      <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 bg-ivory-50/80 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-navy-900" />
          <div>
            <h2 className="font-sans text-sm font-bold text-navy-950 sm:text-base">
              Master Choir Roster
            </h2>
            <p className="text-xs text-zinc-500">
              Pause singers on <strong>Season Leave</strong> when skipping a concert cycle so they stay off roll call & alerts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-200/60 p-1">
          {(
            [
              { id: 'All', label: `All (${roster.length})` },
              { id: 'Active', label: `Active (${activeSingers.length})` },
              { id: 'On_Leave', label: `Season Leave (${onLeaveSingers.length})` },
              { id: 'Inactive', label: `Inactive (${inactiveSingers.length})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onStatusFilterChange(f.id)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                rosterStatusFilter === f.id
                  ? 'bg-white text-navy-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-100 bg-zinc-50/60 font-semibold text-zinc-500">
            <tr>
              <th className="px-5 py-3 sm:px-6">Singer</th>
              <th className="px-3 py-3">Section</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Status</th>
              {isAdmin && <th className="px-5 py-3 text-right sm:px-6">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleRoster.map((m) => {
              const isBusy = busyEmail === m.email;
              return (
                <tr
                  key={m.email}
                  className={`transition ${
                    m.status === 'On_Leave'
                      ? 'bg-indigo-50/20'
                      : m.status === 'Inactive'
                      ? 'bg-zinc-50/40 opacity-70'
                      : 'hover:bg-ivory-50/40'
                  }`}
                >
                  <td className="px-5 py-3.5 sm:px-6">
                    <div className="font-sans font-bold text-navy-950">{m.name}</div>
                    <div className="text-[11px] text-zinc-500">{m.email}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${voicePartBadgeColor(
                        m.voicePart
                      )}`}
                    >
                      {m.voicePart}
                    </span>
                    <span className="ml-1 text-[11px] text-zinc-400">
                      {m.sectionGroup}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 font-medium text-zinc-700">
                    {m.role.replace('_', ' ')}
                  </td>
                  <td className="px-3 py-3.5 text-zinc-600">
                    {m.phone || <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-3 py-3.5">{renderStatusBadge(m.status)}</td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-right sm:px-6">
                      <div className="inline-flex items-center gap-1.5">
                        {m.status !== 'Inactive' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onToggleSeasonLeave(m)}
                            title={
                              m.status === 'Active'
                                ? 'Pause from roll call & alerts for this concert cycle'
                                : 'Reactivate for this concert cycle'
                            }
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                              m.status === 'Active'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {m.status === 'Active' ? (
                              <>
                                <Moon className="h-3.5 w-3.5" />
                                Pause Season
                              </>
                            ) : (
                              <>
                                <Sun className="h-3.5 w-3.5" />
                                Wake Up
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(m)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
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

