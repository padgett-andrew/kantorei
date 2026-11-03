import { useState, useMemo, type SyntheticEvent } from 'react';
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  Grid,
  List,
  Mail,
  Moon,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import {
  SECTION_GROUPS,
  inferSectionGroup,
  type SectionGroup,
  type SheetWarning,
  type Singer,
  type SingerStatus,
} from '../../types/choir';
import { voicePartBadgeColor } from '../../lib/utils';
import MemberModal, { type MemberFormState } from './admin/MemberModal';
import SheetWarningsBanner from './admin/SheetWarningsBanner';

interface Props {
  caller: Singer;
  initialRoster: Singer[];
  sheetWarnings: SheetWarning[];
  masterSheetUrl?: string;
  initialViewMode?: 'cards' | 'table';
}

export default function RosterDirectory({
  caller,
  initialRoster,
  sheetWarnings,
  masterSheetUrl,
  initialViewMode = 'cards',
}: Props) {
  const isAdmin = caller.role === 'Admin';
  const canManageRoster = isAdmin;

  const [roster, setRoster] = useState<Singer[]>(initialRoster);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'All' | SectionGroup>(
    caller.role === 'Section_Leader' ? caller.sectionGroup : 'All'
  );
  const [statusFilter, setStatusFilter] = useState<'All' | SingerStatus>('Active');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(initialViewMode);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Add / Edit Member Modal state
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

  // Status counts
  const activeCount = useMemo(() => roster.filter((s) => s.status === 'Active').length, [roster]);
  const onLeaveCount = useMemo(() => roster.filter((s) => s.status === 'On_Leave').length, [roster]);
  const inactiveCount = useMemo(() => roster.filter((s) => s.status === 'Inactive').length, [roster]);

  // Filtered members list
  const filteredSingers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((m) => {
      // Status filter
      if (statusFilter !== 'All' && m.status !== statusFilter) return false;

      // Section filter
      if (section !== 'All' && m.sectionGroup !== section) return false;

      // Search query filter
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.voicePart.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q))
      );
    });
  }, [roster, query, section, statusFilter]);

  // Copy email helper
  function handleCopyEmail(email: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  }

  // Toggle Season Leave
  async function handleToggleSeasonLeave(member: Singer) {
    if (!canManageRoster) return;
    const nextStatus: SingerStatus = member.status === 'On_Leave' ? 'Active' : 'On_Leave';
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
      setRoster((prev) => prev.map((s) => (s.email.toLowerCase() === updated.email.toLowerCase() ? updated : s)));
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

  // Open Create Member Modal
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

  // Open Edit Member Modal
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

  // Save Member
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
      if (modalMode === 'create') {
        setRoster((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        setBanner({ type: 'ok', text: `Added ${saved.name} to the roster!` });
      } else {
        setRoster((prev) =>
          prev.map((s) => (s.email.toLowerCase() === saved.email.toLowerCase() ? saved : s))
        );
        setBanner({ type: 'ok', text: `Updated ${saved.name}'s roster record.` });
      }
      setModalMode(null);
    } catch {
      setBanner({ type: 'err', text: 'Network error saving member.' });
    } finally {
      setSavingMember(false);
    }
  }

  // Status Badge Component
  function renderStatusBadge(status: SingerStatus) {
    if (status === 'Active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    }
    if (status === 'On_Leave') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 ring-1 ring-indigo-200/80">
          <Moon className="h-3 w-3 text-indigo-600" />
          Season Leave
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 ring-1 ring-zinc-200">
        Inactive
      </span>
    );
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
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Search by singer name, email, phone, or voice part…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 pr-4 pl-10 text-xs sm:text-sm text-zinc-900 focus:border-navy-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* View Switcher & Admin Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-navy-950'
                }`}
                title="View member contact cards"
              >
                <Grid className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === 'table'
                    ? 'bg-white text-navy-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-navy-950'
                }`}
                title="View roster table"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Table</span>
              </button>
            </div>

            {/* Admin Add Singer Button */}
            {canManageRoster && (
              <button
                type="button"
                onClick={openCreateMemberModal}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-navy-950 transition"
              >
                <Plus className="h-3.5 w-3.5 text-gold-400" />
                <span>Add Singer</span>
              </button>
            )}

            {/* Master Sheet Link (Desktop) */}
            {masterSheetUrl && (
              <a
                href={masterSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:border-zinc-300 hover:bg-zinc-50 transition"
                title={isAdmin ? 'Open Master Google Sheet (Edit Access)' : 'Open Master Google Sheet (View Access)'}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Sheet</span>
                <ExternalLink className="h-3 w-3 text-zinc-400" />
              </a>
            )}
          </div>
        </div>

        {/* Filters Row: Sections & Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-zinc-100">
          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', ...SECTION_GROUPS] as const).map((group) => {
              const isSelected = section === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSection(group)}
                  className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-bold transition ${
                    isSelected
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`cursor-pointer rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === 'Active'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Active ({activeCount})
            </button>

            {onLeaveCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'On_Leave' ? 'Active' : 'On_Leave')}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                  statusFilter === 'On_Leave'
                    ? 'bg-indigo-700 text-white shadow-2xs'
                    : 'border border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100'
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>Season Leave ({onLeaveCount})</span>
              </button>
            )}

            {canManageRoster && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className={`cursor-pointer rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === 'All'
                      ? 'bg-navy-900 text-white shadow-2xs'
                      : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  All ({roster.length})
                </button>

                {inactiveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Inactive')}
                    className={`cursor-pointer rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      statusFilter === 'Inactive'
                        ? 'bg-zinc-800 text-white shadow-2xs'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    Inactive ({inactiveCount})
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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

      {/* VIEW 1: Directory Cards Grid */}
      {viewMode === 'cards' && (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSingers.map((m) => {
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
                    {renderStatusBadge(m.status)}
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
                        onClick={() => handleCopyEmail(m.email)}
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
                      onClick={() => handleToggleSeasonLeave(m)}
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
                      onClick={() => openEditMemberModal(m)}
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
      )}

      {/* VIEW 2: Roster Table View */}
      {viewMode === 'table' && (
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
                {filteredSingers.map((m) => {
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
                        {renderStatusBadge(m.status)}
                      </td>

                      {/* Admin Actions */}
                      {canManageRoster && (
                        <td className="px-4 py-3 sm:px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSeasonLeave(m)}
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
                              onClick={() => openEditMemberModal(m)}
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
        onSave={saveRosterMember}
      />
    </div>
  );
}
