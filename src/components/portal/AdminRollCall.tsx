import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit3,
  Plus,
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
    active: boolean;
  }>({
    email: '',
    name: '',
    voicePart: 'S1',
    role: 'Singer',
    phone: '',
    active: true,
  });
  const [savingMember, setSavingMember] = useState(false);

  const isAdmin = caller.role === 'Admin';
  const activeSingers = roster.filter((s) => s.active);

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

  function openCreateModal() {
    setFormState({
      email: '',
      name: '',
      voicePart: 'S1',
      role: 'Singer',
      phone: '',
      active: true,
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
      active: member.active,
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
        text: `${saved.name} (${saved.voicePart}) saved to Master Roster.`,
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

  return (
    <div className="space-y-6">
      {/* Sheet Data-Health Diagnostics (from Zod row-level validation) */}
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
          className={`rounded-xl border px-4 py-3 text-sm ${
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
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('rollcall')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'rollcall'
                ? 'bg-navy-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Rehearsal Roll Call Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'roster'
                ? 'bg-navy-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Master Roster ({roster.length})
          </button>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-800"
          >
            <Plus className="h-4 w-4 text-gold-400" />
            Add Singer to Roster
          </button>
        )}
      </div>

      {activeTab === 'rollcall' ? (
        <div className="space-y-6">
          {/* Event Selector + Section Headcount Cards */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
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
                  className="mt-1.5 w-full max-w-lg rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:border-navy-900 focus:outline-none"
                >
                  {upcomingEvents.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {formatEventDate(ev.date)} — {ev.title} ({ev.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['All', ...SECTION_GROUPS] as const).map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSectionFilter(group)}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      sectionFilter === group
                        ? 'bg-navy-900 text-white'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
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
                    className="rounded-xl border border-zinc-200 bg-ivory-50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {sec}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xl font-bold text-navy-950">
                        {presentInSec}/{totalInSec}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          absentInSec > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {absentInSec > 0 ? `${absentInSec} absent` : 'Full section'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roll Call Singer List */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs">
            <ul className="divide-y divide-zinc-100">
              {visibleRollCallSingers.map((s) => {
                const absence = absentForSelectedEvent.get(s.email);
                const isAbsent = Boolean(absence);
                const isBusy = busyEmail === s.email;

                return (
                  <li
                    key={s.email}
                    className={`flex flex-col justify-between gap-3 px-5 py-3.5 sm:flex-row sm:items-center ${
                      isAbsent ? 'bg-rose-50/50' : ''
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
                          {isBusy ? 'Updating…' : 'Mark Present (Clear)'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => toggleAttendance(s, false)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-60"
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
        /* Master Roster Management Table */
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-ivory-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-navy-900" />
              <h2 className="font-semibold text-navy-950">Master Choir Roster</h2>
            </div>
            {!isAdmin && (
              <span className="text-xs text-zinc-500">
                Read-only for Section Leaders (Admins can add/edit members)
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Part</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {roster.map((m) => (
                  <tr key={m.email} className={!m.active ? 'opacity-55 bg-zinc-50' : ''}>
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{m.name}</td>
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
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          m.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {m.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
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
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-2xl font-bold text-navy-950">
                {modalMode === 'create' ? 'Add Singer to Roster' : 'Edit Roster Member'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveRosterMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Email Address (Primary Key)
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

              <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(e) => setFormState({ ...formState, active: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Active Roster Member (can sign in to /portal)
              </label>

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
