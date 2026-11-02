import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Coffee,
  Edit3,
  ExternalLink,
  FileText,
  MapPin,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  EVENT_TYPES,
  inferSectionGroup,
  MEMBER_ROLES,
  parseSnackEntry,
  SECTION_GROUPS,
  VOICE_PARTS,
  type AbsenceRecord,
  type EventType,
  type MemberRole,
  type ScheduleEvent,
  type SectionGroup,
  type SheetWarning,
  type Singer,
  type SingerStatus,
  type VoicePart,
} from '../../types/choir';
import {
  eventTypeBadgeColor,
  formatEventDate,
  formatShortMonthDay,
  voicePartBadgeColor,
} from '../../lib/utils';

interface Props {
  caller: Singer;
  calendarId?: string;
  initialRoster: Singer[];
  upcomingEvents: ScheduleEvent[];
  allScheduleEvents?: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
  sheetWarnings: SheetWarning[];
}

export default function AdminRollCall({
  caller,
  calendarId,
  initialRoster,
  upcomingEvents,
  allScheduleEvents,
  initialAbsences,
  sheetWarnings,
}: Props) {
  const [roster, setRoster] = useState<Singer[]>(initialRoster);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);
  const [scheduleList, setScheduleList] = useState<ScheduleEvent[]>(
    allScheduleEvents && allScheduleEvents.length > 0
      ? allScheduleEvents
      : upcomingEvents
  );
  const [selectedEventId, setSelectedEventId] = useState<string>(
    upcomingEvents[0]?.eventId ?? scheduleList[0]?.eventId ?? ''
  );
  const [sectionFilter, setSectionFilter] = useState<'All' | SectionGroup>(
    caller.role === 'Section_Leader' ? caller.sectionGroup : 'All'
  );
  const [rosterStatusFilter, setRosterStatusFilter] = useState<
    'All' | SingerStatus
  >('All');
  const [activeTab, setActiveTab] = useState<'rollcall' | 'schedule' | 'roster'>('rollcall');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Schedule filtering & search state
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<'All' | EventType>('All');
  const [scheduleTimeframe, setScheduleTimeframe] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Add / Edit Calendar Event Modal state
  const [eventModalMode, setEventModalMode] = useState<'create' | 'update' | null>(null);
  const [eventFormState, setEventFormState] = useState<{
    eventId: string;
    date: string;
    time: string;
    type: EventType;
    title: string;
    location: string;
    description: string;
  }>({
    eventId: '',
    date: '',
    time: '7:00 PM - 9:30 PM',
    type: 'Rehearsal',
    title: '',
    location: 'Main Sanctuary',
    description: '',
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // Delete Calendar Event Confirmation state
  const [eventToDelete, setEventToDelete] = useState<ScheduleEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  async function syncGoogleCalendar() {
    setSyncingCalendar(true);
    setBanner(null);
    try {
      const res = await fetch('/api/schedule?action=sync');
      const data = (await res.json()) as { ok?: boolean; schedule?: ScheduleEvent[]; error?: string };
      if (!res.ok || !data.schedule) {
        throw new Error(data.error || 'Failed to sync calendar.');
      }
      setScheduleList(data.schedule);
      setBanner({
        type: 'ok',
        text: `Refreshed ${data.schedule.length} calls from calendar!`,
      });
    } catch {
      setBanner({
        type: 'err',
        text: 'Error syncing with calendar. Please retry in a moment.',
      });
    } finally {
      setSyncingCalendar(false);
    }
  }

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'schedule' || tab === 'roster' || tab === 'rollcall') {
        setActiveTab(tab);
      }
      const editEventId = params.get('edit');
      if (editEventId) {
        const target = scheduleList.find((e) => e.eventId === editEventId);
        if (target) {
          openEditEventModal(target);
          setActiveTab('schedule');
        }
      }
    }
  }, []);

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
            singerEmail: target.email,
          }),
        });
        if (!res.ok) throw new Error('Failed to clear absence.');
        setAbsences((prev) =>
          prev.map((a) =>
            a.eventId === selectedEventId && a.singerEmail === target.email
              ? { ...a, status: 'Cleared' as const }
              : a
          )
        );
        setBanner({
          type: 'ok',
          text: `Marked ${target.name} present for this rehearsal.`,
        });
      } else {
        const targetEv = scheduleList.find((e) => e.eventId === selectedEventId);
        const res = await fetch('/api/absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEventId,
            date: targetEv?.date ?? new Date().toISOString().slice(0, 10),
            reason: `Marked absent during roll call by ${caller.name}`,
            voicePart: target.voicePart,
            targetSingerEmail: target.email,
            targetSingerName: target.name,
          }),
        });
        if (!res.ok) throw new Error('Failed to mark absence.');
        const data = (await res.json()) as { record: AbsenceRecord };
        setAbsences((prev) => {
          const filtered = prev.filter(
            (a) => !(a.eventId === selectedEventId && a.singerEmail === target.email)
          );
          return [...filtered, data.record];
        });
        setBanner({
          type: 'ok',
          text: `Marked ${target.name} absent for this rehearsal.`,
        });
      }
    } catch {
      setBanner({ type: 'err', text: 'Error updating attendance. Please retry.' });
    } finally {
      setBusyEmail(null);
    }
  }

  async function toggleSeasonLeave(member: Singer) {
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
          active: nextStatus === 'Active',
        }),
      });

      const data = (await res.json()) as { singer?: Singer; error?: string };
      if (!res.ok || !data.singer) {
        setBanner({
          type: 'err',
          text: data.error ?? 'Failed to update singer status.',
        });
        return;
      }

      const updated = data.singer;
      setRoster((prev) =>
        prev.map((s) => (s.email === updated.email ? updated : s))
      );
      setBanner({
        type: 'ok',
        text:
          nextStatus === 'On_Leave'
            ? `${member.name} paused on Season Leave (off roll call & season alerts; retains portal access).`
            : `${member.name} reactivated for this concert season!`,
      });
    } catch {
      setBanner({ type: 'err', text: 'Network error updating status.' });
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

  // Schedule Modal and Actions
  function openCreateEventModal() {
    const today = new Date().toISOString().slice(0, 10);
    setEventFormState({
      eventId: '',
      date: today,
      time: '7:00 PM - 9:30 PM',
      type: 'Rehearsal',
      title: '',
      location: 'Main Sanctuary',
      description: '',
    });
    setEventModalMode('create');
  }

  function openEditEventModal(event: ScheduleEvent) {
    setEventFormState({
      eventId: event.eventId,
      date: event.date,
      time: event.time,
      type: event.type,
      title: event.title,
      location: event.location,
      description: event.description || event.notes || '',
    });
    setEventModalMode('update');
  }

  function insertDescriptionSnippet(snippet: string) {
    setEventFormState((prev) => {
      const trimmed = prev.description.trim();
      const nextDesc = trimmed ? `${trimmed}\n${snippet}` : snippet;
      return {
        ...prev,
        description: nextDesc,
      };
    });
  }

  async function saveScheduleEvent(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!eventModalMode) return;
    setSavingEvent(true);
    setBanner(null);

    try {
      const res = await fetch('/api/schedule', {
        method: eventModalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventFormState),
      });
      const data = (await res.json()) as { ok?: boolean; event?: ScheduleEvent; error?: string };
      if (!res.ok || !data.event) {
        setBanner({ type: 'err', text: data.error ?? 'Failed to save calendar event.' });
        return;
      }

      const saved = data.event;
      setScheduleList((prev) => {
        const exists = prev.some((ev) => ev.eventId === saved.eventId);
        const nextList = exists
          ? prev.map((ev) => (ev.eventId === saved.eventId ? saved : ev))
          : [...prev, saved];
        return nextList.sort((a, b) => a.date.localeCompare(b.date));
      });
      setEventModalMode(null);
      setBanner({
        type: 'ok',
        text: `Calendar event "${saved.title}" on ${saved.date} saved successfully.`,
      });
    } catch {
      setBanner({ type: 'err', text: 'Network error saving calendar event.' });
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(event: ScheduleEvent) {
    setDeletingEvent(true);
    setBanner(null);

    try {
      const res = await fetch(`/api/schedule?eventId=${encodeURIComponent(event.eventId)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBanner({ type: 'err', text: data.error ?? 'Failed to delete event.' });
        return;
      }

      setScheduleList((prev) => prev.filter((ev) => ev.eventId !== event.eventId));
      setEventToDelete(null);
      setBanner({
        type: 'ok',
        text: `Removed "${event.title}" on ${event.date} from the calendar.`,
      });
    } catch {
      setBanner({ type: 'err', text: 'Network error deleting calendar event.' });
    } finally {
      setDeletingEvent(false);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingCallsCount = scheduleList.filter((ev) => ev.date >= todayIso).length;
  const rehearsalsCount = scheduleList.filter((ev) => ev.type === 'Rehearsal').length;
  const concertsCount = scheduleList.filter((ev) => ev.type === 'Concert').length;

  const filteredSchedule = scheduleList.filter((ev) => {
    if (scheduleTimeframe === 'upcoming' && ev.date < todayIso) return false;
    if (scheduleTimeframe === 'past' && ev.date >= todayIso) return false;

    if (scheduleTypeFilter !== 'All' && ev.type !== scheduleTypeFilter) return false;

    if (scheduleSearch.trim()) {
      const q = scheduleSearch.toLowerCase();
      const matchesTitle = ev.title.toLowerCase().includes(q);
      const matchesLocation = ev.location.toLowerCase().includes(q);
      const matchesDate = ev.date.toLowerCase().includes(q);
      const matchesType = ev.type.toLowerCase().includes(q);
      const matchesNotes = (ev.description || ev.notes || '').toLowerCase().includes(q);
      if (!matchesTitle && !matchesLocation && !matchesDate && !matchesType && !matchesNotes) {
        return false;
      }
    }

    return true;
  });

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
            onClick={() => setActiveTab('schedule')}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'schedule'
                ? 'bg-navy-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Calendar & Schedule ({scheduleList.length})
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

          {isAdmin && activeTab === 'schedule' && (
            <button
              type="button"
              onClick={openCreateEventModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4 text-gold-400" />
              Add Calendar Call
            </button>
          )}

          {isAdmin && activeTab === 'roster' && (
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

      {activeTab === 'rollcall' && (
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

              {/* Section Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['All', ...SECTION_GROUPS] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSectionFilter(sec)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                      sectionFilter === sec
                        ? 'bg-navy-900 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendance Metrics by Section */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SECTION_GROUPS.map((sec) => {
                const sectionSingers = activeSingers.filter((s) => s.sectionGroup === sec);
                const absentCount = sectionSingers.filter((s) =>
                  absentForSelectedEvent.has(s.email)
                ).length;
                const presentCount = sectionSingers.length - absentCount;
                return (
                  <div
                    key={sec}
                    className="rounded-2xl border border-zinc-200/80 bg-ivory-50/60 p-3.5"
                  >
                    <span className="text-xs font-bold text-navy-950">{sec}</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-editorial text-2xl font-bold text-navy-950">
                        {presentCount}
                      </span>
                      <span className="text-xs text-zinc-500">
                        / {sectionSingers.length} present
                      </span>
                    </div>
                    {absentCount > 0 && (
                      <span className="mt-1 block text-[11px] font-medium text-amber-700">
                        {absentCount} reported absent
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roll Call Singer Checklist */}
          <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
            <div className="border-b border-zinc-100 bg-ivory-50/80 px-5 py-3.5 sm:px-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Active Singers ({visibleRollCallSingers.length})
              </span>
            </div>

            <ul className="divide-y divide-zinc-100">
              {visibleRollCallSingers.map((s) => {
                const isAbsent = absentForSelectedEvent.has(s.email);
                const absenceInfo = absentForSelectedEvent.get(s.email);
                const isBusy = busyEmail === s.email;

                return (
                  <li
                    key={s.email}
                    className={`flex flex-col gap-3 px-5 py-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                      isAbsent ? 'bg-amber-50/40' : 'hover:bg-ivory-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${voicePartBadgeColor(
                          s.voicePart
                        )}`}
                      >
                        {s.voicePart}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm font-bold text-navy-950">
                            {s.name}
                          </span>
                          {s.role !== 'Singer' && (
                            <span className="rounded-md bg-gold-100 px-1.5 py-0.5 text-[10px] font-semibold text-gold-900">
                              {s.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">{s.email}</span>
                        {isAbsent && absenceInfo?.reason && (
                          <p className="mt-0.5 text-xs font-medium text-amber-800">
                            Note: {absenceInfo.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
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
      )}

      {/* Schedule / Calendar Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-5">
          {/* Google Calendar Master Sync Card */}
          <div className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white to-ivory-50/70 p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-gold-400">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <h3 className="font-editorial text-xl font-bold text-navy-950 sm:text-2xl">
                    Google Calendar Integration
                  </h3>
                  {calendarId && calendarId !== 'DEMO' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Live Sync ({calendarId})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Demo Calendar Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
                  Manage calls, recurring rehearsals, concert times, and locations directly in your official ensemble Google Calendar.
                  The portal automatically syncs changes and updates singer subscriptions on Apple Calendar, Outlook, and Google Calendar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={
                    calendarId && calendarId !== 'DEMO'
                      ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`
                      : 'https://calendar.google.com/calendar/u/0/r'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
                >
                  <ExternalLink className="h-4 w-4 text-gold-400" />
                  Open Google Calendar
                </a>

                <button
                  type="button"
                  disabled={syncingCalendar}
                  onClick={syncGoogleCalendar}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-navy-900 hover:text-navy-950 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 text-zinc-500 ${syncingCalendar ? 'animate-spin' : ''}`} />
                  {syncingCalendar ? 'Syncing…' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
          {/* Top Filter and Search Bar */}
          <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-2xs sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search calls by title, notes, location, or date..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-12 py-2 text-sm text-navy-950 placeholder:text-zinc-400 focus:border-navy-900 focus:outline-none"
                />
                {scheduleSearch && (
                  <button
                    type="button"
                    onClick={() => setScheduleSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Timeframe selector */}
              <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  type="button"
                  onClick={() => setScheduleTimeframe('upcoming')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    scheduleTimeframe === 'upcoming'
                      ? 'bg-white text-navy-950 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Upcoming Calls ({upcomingCallsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleTimeframe('all')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    scheduleTimeframe === 'all'
                      ? 'bg-white text-navy-950 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  All Calls ({scheduleList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleTimeframe('past')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    scheduleTimeframe === 'past'
                      ? 'bg-white text-navy-950 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Past
                </button>
              </div>
            </div>

            {/* Event Type Filter Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Call Type:
              </span>
              {(['All', ...EVENT_TYPES] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setScheduleTypeFilter(t)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                    scheduleTypeFilter === t
                      ? 'bg-navy-900 text-white'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Upcoming Calls
              </span>
              <p className="mt-1 font-editorial text-2xl font-bold text-navy-950">
                {upcomingCallsCount}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Concerts
              </span>
              <p className="mt-1 font-editorial text-2xl font-bold text-amber-700">
                {concertsCount}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Rehearsals
              </span>
              <p className="mt-1 font-editorial text-2xl font-bold text-navy-900">
                {rehearsalsCount}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Total Season Events
              </span>
              <p className="mt-1 font-editorial text-2xl font-bold text-zinc-800">
                {scheduleList.length}
              </p>
            </div>
          </div>

          {/* Event Cards List */}
          <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-ivory-50/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-navy-900" />
                <h2 className="font-sans text-sm font-bold text-navy-950 sm:text-base">
                  Choir Calendar Calls ({filteredSchedule.length})
                </h2>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openCreateEventModal}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
                >
                  <Plus className="h-3.5 w-3.5 text-gold-400" />
                  Add Event
                </button>
              )}
            </div>

            {filteredSchedule.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-sm font-semibold text-navy-950">No events matched your filters.</p>
                <p className="mt-1 text-xs text-zinc-500">Try adjusting your search query, type filter, or timeframe.</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreateEventModal}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
                  >
                    <Plus className="h-3.5 w-3.5 text-gold-400" />
                    Create First Event
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filteredSchedule.map((ev) => {
                  const { weekday, month, day } = formatShortMonthDay(ev.date);
                  const isToday = ev.date === todayIso;
                  const isPast = ev.date < todayIso;
                  const claimedSnacks = [ev.snack1Name, ev.snack2Name, ev.snack3Name, ev.snack4Name]
                    .filter(Boolean)
                    .map((s) => parseSnackEntry(s).name);
                  const hasCallTimeInText =
                    ev.time.toLowerCase().includes('call') || ev.time.includes('/');

                  return (
                    <li
                      key={ev.eventId}
                      className={`flex flex-col gap-4 p-5 transition sm:p-6 ${
                        isPast ? 'bg-zinc-50/50 opacity-80 hover:opacity-100' : 'hover:bg-ivory-50/50'
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        {/* Left: Date Block & Info */}
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-ivory-50 text-center shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                              {month}
                            </span>
                            <span className="text-xl font-bold leading-tight text-navy-950">{day}</span>
                            <span className="text-[10px] font-medium text-zinc-400">{weekday}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-sans text-base font-bold text-navy-950">
                                {ev.title}
                              </h3>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${eventTypeBadgeColor(
                                  ev.type
                                )}`}
                              >
                                {ev.type}
                              </span>
                              {isToday && (
                                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                                  Today
                                </span>
                              )}
                              {isPast && (
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                                  Past
                                </span>
                              )}
                            </div>

                            {/* Time & Location */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600">
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  hasCallTimeInText
                                    ? 'rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-900 border border-amber-200'
                                    : 'font-medium'
                                }`}
                              >
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                {ev.time}
                              </span>
                              <span className="inline-flex items-center gap-1 font-medium text-zinc-600">
                                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                {ev.location}
                              </span>
                            </div>

                            {/* Description / Rehearsal Notes */}
                            {(ev.description || ev.notes) && (
                              <div className="mt-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-3.5 text-xs text-zinc-700">
                                <span className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-gold-600">
                                  <FileText className="h-3 w-3" />
                                  Call Details & Rehearsal Focus
                                </span>
                                <p className="whitespace-pre-line leading-relaxed">
                                  {ev.description || ev.notes}
                                </p>
                              </div>
                            )}

                            {/* Hospitality Signups */}
                            {claimedSnacks.length > 0 && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-600">
                                <Coffee className="h-3.5 w-3.5 text-gold-600" />
                                <span className="font-semibold text-zinc-500">Hospitality:</span>
                                <span>{claimedSnacks.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        {isAdmin && (
                          <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => openEditEventModal(ev)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-navy-900 hover:text-navy-950"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventToDelete(ev)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Master Roster Management Table with 1-Click Season Leave ("Asleep") */}
      {activeTab === 'roster' && (
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
                                onClick={() => toggleSeasonLeave(m)}
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

      {/* Add / Edit Schedule Event Modal */}
      {eventModalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs overflow-y-auto"
          onClick={() => setEventModalMode(null)}
        >
          <div
            className="my-8 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-editorial text-2xl font-bold text-navy-950">
                  {eventModalMode === 'create' ? 'Add Calendar Call' : 'Edit Calendar Call'}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Set date, call times, location, and rehearsal focus notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEventModalMode(null)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveScheduleEvent} className="mt-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuesday Rehearsal or Winter Concert - Performance 1"
                  value={eventFormState.title}
                  onChange={(e) =>
                    setEventFormState({ ...eventFormState, title: e.target.value })
                  }
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
                    value={eventFormState.date}
                    onChange={(e) =>
                      setEventFormState({ ...eventFormState, date: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    Call Type
                  </label>
                  <select
                    value={eventFormState.type}
                    onChange={(e) =>
                      setEventFormState({
                        ...eventFormState,
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
                  value={eventFormState.time}
                  onChange={(e) =>
                    setEventFormState({ ...eventFormState, time: e.target.value })
                  }
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
                      onClick={() => setEventFormState({ ...eventFormState, time: preset })}
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
                  value={eventFormState.location}
                  onChange={(e) =>
                    setEventFormState({ ...eventFormState, location: e.target.value })
                  }
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
                        onClick={() =>
                          setEventFormState({ ...eventFormState, location: loc })
                        }
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
                  value={eventFormState.description}
                  onChange={(e) =>
                    setEventFormState({ ...eventFormState, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
                />
                {/* Snippet chips */}
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
                  onClick={() => setEventModalMode(null)}
                  className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {savingEvent ? 'Saving…' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Schedule Event Confirmation Modal */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs"
          onClick={() => setEventToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="font-editorial text-xl font-bold text-navy-950">
                Delete Calendar Call?
              </h3>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Are you sure you want to remove{' '}
              <strong className="text-navy-950">{eventToDelete.title}</strong> on{' '}
              <span className="font-semibold text-navy-950">{eventToDelete.date}</span>?
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              This will remove the event from the portal schedule, clear any claimed break hospitality slots, and update all subscribed calendar feeds.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="cursor-pointer rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingEvent}
                onClick={() => handleDeleteEvent(eventToDelete)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-rose-700 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deletingEvent ? 'Deleting…' : 'Delete Call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
