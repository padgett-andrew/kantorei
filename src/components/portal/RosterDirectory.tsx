import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type {
  SectionGroup,
  SheetWarning,
  Singer,
  SingerStatus,
} from '../../types/choir';
import MemberModal, { type MemberFormState } from './admin/MemberModal';
import SheetWarningsBanner from './admin/SheetWarningsBanner';
import RosterCardView from './roster/RosterCardView';
import RosterTableView from './roster/RosterTableView';
import RosterToolbar from './roster/RosterToolbar';

interface Props {
  caller: Singer;
  initialRoster: Singer[];
  masterSheetUrl?: string;
  sheetWarnings?: SheetWarning[];
  initialViewMode?: 'cards' | 'table' | string;
}

export default function RosterDirectory({
  caller,
  initialRoster,
  masterSheetUrl,
  sheetWarnings = [],
  initialViewMode = 'cards',
}: Props) {
  const isAdmin = caller.role === 'Admin';
  const canManageRoster = isAdmin;

  const [roster, setRoster] = useState<Singer[]>(initialRoster);
  const [modalMode, setModalMode] = useState<'create' | 'update' | null>(null);
  const [editingOriginalEmail, setEditingOriginalEmail] = useState<string | null>(null);
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
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Filters & View State
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'All' | SectionGroup>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On_Leave' | 'Inactive'>('Active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(
    initialViewMode === 'table' ? 'table' : 'cards'
  );

  // Counts for status pills
  const activeCount = useMemo(() => roster.filter((s) => s.status === 'Active').length, [roster]);
  const onLeaveCount = useMemo(() => roster.filter((s) => s.status === 'On_Leave').length, [roster]);
  const inactiveCount = useMemo(() => roster.filter((s) => s.status === 'Inactive').length, [roster]);

  // Filtered singers list
  const filteredSingers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return roster.filter((singer) => {
      // 1. Status Filter
      if (statusFilter !== 'All' && singer.status !== statusFilter) {
        return false;
      }

      // 2. Section Filter
      if (section !== 'All' && singer.sectionGroup !== section) {
        return false;
      }

      // 3. Search query
      if (q) {
        const matchesName = singer.name.toLowerCase().includes(q);
        const matchesEmail = singer.email.toLowerCase().includes(q);
        const matchesPhone = (singer.phone || '').toLowerCase().includes(q);
        const matchesVoice = singer.voicePart.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesVoice;
      }

      return true;
    });
  }, [roster, query, section, statusFilter]);

  function handleCopyEmail(email: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  }

  // Toggle Season Leave
  async function handleToggleSeasonLeave(member: Singer) {
    if (!canManageRoster) return;
    const isCurrentlyOnLeave = member.status === 'On_Leave';
    const nextStatus: SingerStatus = isCurrentlyOnLeave ? 'Active' : 'On_Leave';

    setBusyEmail(member.email);
    setBanner(null);

    try {
      const res = await fetch('/api/roster', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail: member.email,
          email: member.email,
          name: member.name,
          voicePart: member.voicePart,
          sectionGroup: member.sectionGroup,
          role: member.role,
          phone: member.phone || '',
          status: nextStatus,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; singer?: Singer; error?: string };

      if (!res.ok || !data.singer) {
        throw new Error(data.error || 'Failed to update leave status.');
      }

      setRoster((prev) => prev.map((s) => (s.email.toLowerCase() === member.email.toLowerCase() ? data.singer! : s)));
      setBanner({
        type: 'ok',
        text: isCurrentlyOnLeave
          ? `${member.name} has been reactivated for the season.`
          : `${member.name} has been placed on leave for this season. Portal login preserved.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.message || 'Error updating member status.',
      });
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
    setEditingOriginalEmail(null);
    setModalMode('create');
  }

  function openEditMemberModal(member: Singer) {
    setMemberFormState({
      email: member.email,
      name: member.name,
      voicePart: member.voicePart,
      sectionGroup: member.sectionGroup,
      role: member.role,
      phone: member.phone || '',
      status: member.status,
    });
    setEditingOriginalEmail(member.email);
    setModalMode('update');
  }

  async function saveRosterMember() {
    setSavingMember(true);
    setBanner(null);

    const isEdit = modalMode === 'update';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const payload = isEdit
        ? { ...memberFormState, originalEmail: editingOriginalEmail || memberFormState.email }
        : memberFormState;

      const res = await fetch('/api/roster', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok?: boolean; singer?: Singer; error?: string };

      if (!res.ok || !data.singer) {
        throw new Error(data.error || 'Failed to save member.');
      }

      if (isEdit) {
        const origEmail = (editingOriginalEmail || memberFormState.email).toLowerCase();
        setRoster((prev) =>
          prev.map((s) => (s.email.toLowerCase() === origEmail ? data.singer! : s))
        );
        setBanner({ type: 'ok', text: `Updated ${data.singer.name} in Master Google Sheet.` });
      } else {
        setRoster((prev) => [data.singer!, ...prev]);
        setBanner({ type: 'ok', text: `Added ${data.singer.name} to Master Google Sheet.` });
      }

      setModalMode(null);
      setEditingOriginalEmail(null);
    } catch (err: any) {
      setBanner({ type: 'err', text: err?.message || 'Error saving member.' });
    } finally {
      setSavingMember(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Notifications Banner */}
      {banner && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-semibold shadow-2xs ${
            banner.type === 'ok'
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border border-rose-300 bg-rose-50 text-rose-950'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="cursor-pointer text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sheet Warnings Diagnostics (Admin Only) */}
      {isAdmin && sheetWarnings.length > 0 && (
        <SheetWarningsBanner warnings={sheetWarnings} />
      )}

      {/* Control Bar: Search, Filters, View Switcher & Admin Actions */}
      <RosterToolbar
        query={query}
        setQuery={setQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        canManageRoster={canManageRoster}
        onOpenCreateMember={openCreateMemberModal}
        masterSheetUrl={masterSheetUrl}
        isAdmin={isAdmin}
        section={section}
        setSection={setSection}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        activeCount={activeCount}
        onLeaveCount={onLeaveCount}
        inactiveCount={inactiveCount}
        totalCount={roster.length}
      />

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Showing <strong>{filteredSingers.length}</strong> {filteredSingers.length === 1 ? 'member' : 'members'}
          {section !== 'All' && ` in ${section}`}
          {statusFilter !== 'All' && ` (${statusFilter.replace('_', ' ')})`}
        </span>
        {canManageRoster && (
          <span className="text-[11px] text-zinc-400">
            Admins have full edit access to voice parts, roles, and status
          </span>
        )}
      </div>

      {/* VIEW 1: Cards View */}
      {viewMode === 'cards' && (
        <RosterCardView
          singers={filteredSingers}
          caller={caller}
          canManageRoster={canManageRoster}
          busyEmail={busyEmail}
          copiedEmail={copiedEmail}
          onCopyEmail={handleCopyEmail}
          onToggleSeasonLeave={handleToggleSeasonLeave}
          onEditMember={openEditMemberModal}
        />
      )}

      {/* VIEW 2: Table View */}
      {viewMode === 'table' && (
        <RosterTableView
          singers={filteredSingers}
          canManageRoster={canManageRoster}
          busyEmail={busyEmail}
          onToggleSeasonLeave={handleToggleSeasonLeave}
          onEditMember={openEditMemberModal}
        />
      )}

      {/* Empty State */}
      {filteredSingers.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-400" />
          <h3 className="mt-2 text-sm font-bold text-navy-950">No Members Match Search</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Try adjusting your search query, section filter, or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSection('All');
              setStatusFilter('Active');
            }}
            className="mt-4 cursor-pointer rounded-xl bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-950"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      <MemberModal
        mode={modalMode}
        formState={memberFormState}
        onChange={setMemberFormState}
        saving={savingMember}
        onClose={() => setModalMode(null)}
        onSave={(e) => {
          e?.preventDefault?.();
          saveRosterMember();
        }}
      />
    </div>
  );
}
