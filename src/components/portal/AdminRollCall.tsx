import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit3,
  Moon,
  Plus,
  Sun,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  inferSectionGroup,
  MEMBER_ROLES,
  SECTION_GROUPS,
  VOICE_PARTS,
  type AbsenceRecord,
  type MemberRole,
  type ScheduleEvent,
  type SectionGroup,
  type SheetWarning,
  type Singer,
  type SingerStatus,
  type VoicePart,
} from '../../types/choir';
import { formatEventDate, voicePartBadgeColor } from '../../lib/utils';

interface Props {
  caller: Singer;
  initialRoster: Singer[];
  upcomingEvents: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
  sheetWarnings: SheetWarning[];
}

export default function AdminRollCall({
  caller,
  initialRoster,
  upcomingEvents,
  initialAbsences,
  sheetWarnings,
}: Props) {
  const [roster, setRoster] = useState<Singer[]>(initialRoster);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? ''
  );
  const [sectionFilter, setSectionFilter] = useState<'All' | SectionGroup>(
    caller.role === 'Section_Leader' ? caller.sectionGroup : 'All'
  );
  const [rosterStatusFilter, setRosterStatusFilter] = useState<
    'All' | SingerStatus
  >('All');
  const [activeTab, setActiveTab] = useState<'rollcall' | 'roster'>('rollcall');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Add / Edit Roster Modal state
  const [modalMode, setModalMode] = useState<'create' | 'update' | null>(null);
  const [formState, setFormState] = useState<{
    email: string;
    name: string;
    voicePart: VoicePart;
    role: MemberRole;
    phone: string;
    status: SingerStatus;
  }>({
    email: '',
    name: '',
    voicePart: 'S1',
    role: 'Singer',
    phone: '',
    status: 'Active',
  });
  const [savingMember, setSavingMember] = useState(false);

  const isAdmin = caller.role === 'Admin';
  const activeSingers = roster.filter((s) => s.status === 'Active');
  const onLeaveSingers = roster.filter((s) => s.status === 'On_Leave');
  const inactiveSingers = roster.filter((s) => s.status === 'Inactive');

  const absentForSelectedEvent = new Map(
    absences
      .filter((a) => a.eventId === selectedEventId && a.status === 'Absent')
      .map((a) => [a.singerEmail, a])
  );

  async function toggleAttendance(target: Singer, currentlyAbsent: boolean) {
    if (!selectedEventId) return;
    setBusyEmail(target.email);
    setBanner(null);

    try {
      if (currentlyAbsent) {
        const res = await fetch('/api/absences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEventId,
            targetEmail: target.email,
          }),
        });
        if (!res.ok) throw new Error('Failed to clear absence');
        setAbsences((prev) =>
          prev.map((a) =>
            a.eventId === selectedEventId && a.singerEmail === target.email
              ? { ...a, status: 'Cleared' }
              : a
          )
        );
      } else {
        const res = await fetch('/api/absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEventId,
            targetEmail: target.email,
            reason: 'Marked absent during roll call',
          }),
        });
        const data = (await res.json()) as { absence?: AbsenceRecord; error?: string };
        if (!res.ok || !data.absence) throw new Error(data.error ?? 'Failed to mark absent');
        const created = data.absence;
        setAbsences((prev) => [
          created,
          ...prev.filter(
            (a) => !(a.eventId === selectedEventId && a.singerEmail === target.email)
          ),
        ]);
      }
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Attendance update failed.',
      });
    } finally {
      setBusyEmail(null);
    }
  }

  async function quickToggleSeasonLeave(member: Singer) {
    const nextStatus: SingerStatus =
      member.status === 'Active' ? 'On_Leave' : 'Active';
    setBusyEmail(member.email);
    setBanner(null);

    try {
      const res = await fetch('/api/roster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: member.email,
          name: member.name,
          voicePart: member.voicePart,
          sectionGroup: member.sectionGroup,
          role: member.role,
          phone: member.phone,
          status: nextStatus,
        }),
      });
      const data = (await res.json()) as { singer?: Singer; error?: string };
      if (!res.ok || !data.singer) {
        setBanner({ type: 'err', text: data.error ?? 'Failed to update status.' });
        return;
      }
      const saved = data.singer;
      setRoster((prev) => prev.map((s) => (s.email === saved.email ? saved : s)));
      setBanner({
        type: 'ok',
        text:
          saved.status === 'On_Leave'
            ? `${saved.name} marked on Season Leave (paused from roll call & season alerts).`
            : `${saved.name} restored to Active for the current season.`,
      });
    } catch {
      setBanner({ type: 'err', text: 'Network error updating singer status.' });
    } finally {
      setBusyEmail(null);
    }
  }

  function openCreateModal() {
    setFormState({
      email: '',
      name: '',
      voicePart: 'S1',
      role: 'Singer',
      phone: '',
      status: 'Active',
    });
    setModalMode('create');
  }

  function openEditModal(member: Singer) {
    setFormState({
      email: member.email,
      name: member.name,
      voicePart: member.voicePart,
      role: member.role,
      phone: member.phone,
      status: member.status,
    });
    setModalMode('update');
  }

  async function saveRosterMember(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalMode) return;
    setSavingMember(true);
    setBanner(null);

    try {
      const res = await fetch('/api/roster', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          sectionGroup: inferSectionGroup(formState.voicePart),
        }),
      });
      const data = (await res.json()) as { singer?: Singer; error?: string };
      if (!res.ok || !data.singer) {
        setBanner({ type: 'err', text: data.error ?? 'Failed to save member.' });
        return;
      }

      const saved = data.singer;
      setRoster((prev) => {
        const exists = prev.some((s) => s.email === saved.email);
        if (exists) return prev.map((s) => (s.email === saved.email ? saved : s));
        return [...prev, saved];
      });
      setModalMode(null);
      setBanner({
        type: 'ok',
        text: `${saved.name} (${saved.voicePart}) saved as ${
          saved.status === 'On_Leave' ? 'Season Leave' : saved.status
        }.`,
      });
    } catch {
      setBanner({ type: 'err', text: 'Network error saving singer.' });
    } finally {
      setSavingMember(false);
    }
  }

  const visibleRollCallSingers = activeSingers.filter(
    (s) => sectionFilter === 'All' || s.sectionGroup === sectionFilter
  );

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
    <div className="space-y-6">
      {/* Sheet Data-Health Diagnostics */}
      {sheetWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            Google Sheet Data-Health Warnings ({sheetWarnings.length})
          </div>
          <p className="mt-1 text-xs text-amber-900">
            These rows had formatting issues and were safely skipped so the website stayed online:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-950">
            {sheetWarnings.map((w, idx) => (
              <li key={idx}>
                <strong>
                  {w.tab} Row {w.rowNumber}:
                </strong>{' '}
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            banner.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('rollcall')}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'rollcall'
                ? 'bg-navy-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Roll Call ({activeSingers.length} Active)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-navy-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Master Roster ({roster.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onLeaveSingers.length > 0 && activeTab === 'rollcall' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('roster');
                setRosterStatusFilter('On_Leave');
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
            >
              <Moon className="h-3.5 w-3.5 text-indigo-600" />
              {onLeaveSingers.length} on Season Leave (paused)
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4 text-gold-400" />
              Add Singer
            </button>
          )}
        </div>
      </div>

      {activeTab === 'rollcall' ? (
        <div className="space-y-5">
          {/* Event Selector + Section Headcount Cards */}
          <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="rollcall-event"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Select Rehearsal or Performance
                </label>
                <select
                  id="rollcall-event"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="mt-1.5 w-full max-w-lg rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:border-navy-900 focus:bg-white focus:outline-none"
                >
                  {upcomingEvents.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-xl bg-zinc-100/80 p-1">
                {(['All', ...SECTION_GROUPS] as const).map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSectionFilter(group)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      sectionFilter === group
                        ? 'bg-white text-navy-950 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Summary Strip */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SECTION_GROUPS.map((sec) => {
                const totalInSec = activeSingers.filter((s) => s.sectionGroup === sec).length;
                const absentInSec = activeSingers.filter(
                  (s) => s.sectionGroup === sec && absentForSelectedEvent.has(s.email)
                ).length;
                const presentInSec = totalInSec - absentInSec;

                return (
                  <div
                    key={sec}
                    className="rounded-2xl border border-zinc-200/80 bg-ivory-50/80 px-4 py-3.5"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      {sec}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-xl font-bold text-navy-950">
                        {presentInSec}/{totalInSec}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          absentInSec > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {absentInSec > 0 ? `${absentInSec} absent` : 'Full'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roll Call Singer List */}
          <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
            <ul className="divide-y divide-zinc-100">
              {visibleRollCallSingers.map((s) => {
                const absence = absentForSelectedEvent.get(s.email);
                const isAbsent = Boolean(absence);
                const isBusy = busyEmail === s.email;

                return (
                  <li
                    key={s.email}
                    className={`flex flex-col justify-between gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:px-6 ${
                      isAbsent ? 'bg-rose-50/50' : 'hover:bg-ivory-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${voicePartBadgeColor(
                          s.voicePart
                        )}`}
                      >
                        {s.voicePart}
                      </span>
                      <div>
                        <span className="font-semibold text-zinc-900">{s.name}</span>
                        {absence && (
                          <p className="text-xs text-rose-700">
                            Absent: {absence.reason} ({absence.submittedBy})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAbsent ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleAttendance(s, true)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {isBusy ? 'Updating…' : 'Mark Present'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleAttendance(s, false)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-60"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          {isBusy ? 'Saving…' : 'Mark Absent'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        /* Master Roster Management Table with 1-Click Season Leave ("Asleep") */
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
                  onClick={() => setRosterStatusFilter(f.id)}
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
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Part</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Season Status</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibleRoster.map((m) => {
                  const isBusy = busyEmail === m.email;
                  return (
                    <tr
                      key={m.email}
                      className={
                        m.status === 'Inactive'
                          ? 'bg-zinc-50/80 opacity-60'
                          : m.status === 'On_Leave'
                            ? 'bg-indigo-50/25'
                            : 'hover:bg-ivory-50/40'
                      }
                    >
                      <td className="px-5 py-3.5 font-semibold text-zinc-900">{m.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">{m.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-bold ${voicePartBadgeColor(
                            m.voicePart
                          )}`}
                        >
                          {m.voicePart}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-zinc-700">
                        {m.role.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3.5">{renderStatusBadge(m.status)}</td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {m.status !== 'Inactive' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => quickToggleSeasonLeave(m)}
                                title={
                                  m.status === 'Active'
                                    ? 'Pause singer for this season (skipping cycle)'
                                    : 'Wake singer back to Active for this season'
                                }
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                  m.status === 'Active'
                                    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800'
                                    : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
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
                              onClick={() => openEditModal(m)}
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
      )}

      {/* Add / Edit Roster Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
          onClick={() => setModalMode(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-bold text-navy-950">
                {modalMode === 'create' ? 'Add Singer to Roster' : 'Edit Roster Member'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveRosterMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={modalMode === 'update'}
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
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
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
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
                      setFormState({ ...formState, voicePart: e.target.value as VoicePart })
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
                      setFormState({ ...formState, role: e.target.value as MemberRole })
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
                  onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
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
                        onChange={() => setFormState({ ...formState, status: opt.value })}
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
                  onClick={() => setModalMode(null)}
                  className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {savingMember ? 'Saving…' : 'Save to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
