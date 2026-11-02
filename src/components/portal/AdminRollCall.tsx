import { useEffect, useState, type SyntheticEvent } from 'react';
import { Moon, Plus } from 'lucide-react';
import {
  inferSectionGroup,
  type AbsenceRecord,
  type EventType,
  type ScheduleEvent,
  type SectionGroup,
  type SheetWarning,
  type Singer,
  type SingerStatus,
} from '../../types/choir';
import DeleteEventModal from './admin/DeleteEventModal';
import EventModal, { type EventFormState } from './admin/EventModal';
import MemberModal, { type MemberFormState } from './admin/MemberModal';
import RollCallTab from './admin/RollCallTab';
import RosterTab from './admin/RosterTab';
import ScheduleTab from './admin/ScheduleTab';
import SheetWarningsBanner from './admin/SheetWarningsBanner';

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
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'All' | SingerStatus>('All');
  const [activeTab, setActiveTab] = useState<'rollcall' | 'schedule' | 'roster'>('rollcall');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Schedule filtering & search state
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<'All' | EventType>('All');
  const [scheduleTimeframe, setScheduleTimeframe] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Add / Edit Calendar Event Modal state
  const [eventModalMode, setEventModalMode] = useState<'create' | 'update' | null>(null);
  const [eventFormState, setEventFormState] = useState<EventFormState>({
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

  // Add / Edit Roster Modal state
  const [modalMode, setModalMode] = useState<'create' | 'update' | null>(null);
  const [memberFormState, setMemberFormState] = useState<MemberFormState>({
    email: '',
    name: '',
    voicePart: 'S1',
    sectionGroup: 'Soprano',
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

  function openCreateMemberModal() {
    setMemberFormState({
      email: '',
      name: '',
      voicePart: 'S1',
      sectionGroup: 'Soprano',
      role: 'Singer',
      phone: '',
      status: 'Active',
    });
    setModalMode('create');
  }

  function openEditMemberModal(member: Singer) {
    setMemberFormState({
      email: member.email,
      name: member.name,
      voicePart: member.voicePart,
      sectionGroup: member.sectionGroup,
      role: member.role,
      phone: member.phone,
      status: member.status,
    });
    setModalMode('update');
  }

  async function saveRosterMember(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalMode) return;
    setSavingMember(true);
    setBanner(null);

    try {
      const res = await fetch('/api/roster', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...memberFormState,
          sectionGroup: inferSectionGroup(memberFormState.voicePart),
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

  async function saveScheduleEvent(e: SyntheticEvent<HTMLFormElement>) {
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

  return (
    <div className="space-y-6">
      {/* Sheet Data-Health Diagnostics */}
      <SheetWarningsBanner warnings={sheetWarnings} />

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
              onClick={openCreateMemberModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4 text-gold-400" />
              Add Singer
            </button>
          )}
        </div>
      </div>

      {activeTab === 'rollcall' && (
        <RollCallTab
          selectedEventId={selectedEventId}
          onSelectEventId={setSelectedEventId}
          upcomingEvents={upcomingEvents}
          sectionFilter={sectionFilter}
          onSectionFilterChange={setSectionFilter}
          activeSingers={activeSingers}
          absentForSelectedEvent={absentForSelectedEvent}
          busyEmail={busyEmail}
          onToggleAttendance={toggleAttendance}
        />
      )}

      {activeTab === 'schedule' && (
        <ScheduleTab
          scheduleList={scheduleList}
          todayIso={todayIso}
          isAdmin={isAdmin}
          calendarId={calendarId}
          syncingCalendar={syncingCalendar}
          scheduleSearch={scheduleSearch}
          onSearchChange={setScheduleSearch}
          scheduleTypeFilter={scheduleTypeFilter}
          onTypeFilterChange={setScheduleTypeFilter}
          scheduleTimeframe={scheduleTimeframe}
          onTimeframeChange={setScheduleTimeframe}
          onSyncCalendar={syncGoogleCalendar}
          onOpenCreateEvent={openCreateEventModal}
          onOpenEditEvent={openEditEventModal}
          onOpenDeleteEvent={setEventToDelete}
        />
      )}

      {activeTab === 'roster' && (
        <RosterTab
          roster={roster}
          activeSingers={activeSingers}
          onLeaveSingers={onLeaveSingers}
          inactiveSingers={inactiveSingers}
          rosterStatusFilter={rosterStatusFilter}
          onStatusFilterChange={setRosterStatusFilter}
          isAdmin={isAdmin}
          busyEmail={busyEmail}
          onToggleSeasonLeave={toggleSeasonLeave}
          onOpenEditModal={openEditMemberModal}
        />
      )}

      {/* Add / Edit Roster Modal */}
      <MemberModal
        mode={modalMode}
        formState={memberFormState}
        onChange={setMemberFormState}
        saving={savingMember}
        onClose={() => setModalMode(null)}
        onSave={saveRosterMember}
      />

      {/* Add / Edit Schedule Event Modal */}
      <EventModal
        mode={eventModalMode}
        formState={eventFormState}
        onChange={setEventFormState}
        saving={savingEvent}
        onClose={() => setEventModalMode(null)}
        onSave={saveScheduleEvent}
      />

      {/* Delete Schedule Event Confirmation Modal */}
      <DeleteEventModal
        event={eventToDelete}
        deleting={deletingEvent}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleDeleteEvent}
      />
    </div>
  );
}
