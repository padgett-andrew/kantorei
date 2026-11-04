import { ExternalLink, FileSpreadsheet, Grid, List, Moon, Plus, Search } from 'lucide-react';
import type { SectionGroup } from '../../../types/choir';
import { SECTION_GROUPS } from '../../../types/choir';

interface Props {
  query: string;
  setQuery: (q: string) => void;
  viewMode: 'cards' | 'table';
  setViewMode: (mode: 'cards' | 'table') => void;
  canManageRoster: boolean;
  onOpenCreateMember: () => void;
  masterSheetUrl?: string;
  isAdmin: boolean;
  section: 'All' | SectionGroup;
  setSection: (section: 'All' | SectionGroup) => void;
  statusFilter: 'All' | 'Active' | 'On_Leave' | 'Inactive';
  setStatusFilter: (status: 'All' | 'Active' | 'On_Leave' | 'Inactive') => void;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
  totalCount: number;
}

export default function RosterToolbar({
  query,
  setQuery,
  viewMode,
  setViewMode,
  canManageRoster,
  onOpenCreateMember,
  masterSheetUrl,
  isAdmin,
  section,
  setSection,
  statusFilter,
  setStatusFilter,
  activeCount,
  onLeaveCount,
  inactiveCount,
  totalCount,
}: Props) {
  return (
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
              onClick={onOpenCreateMember}
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
                All ({totalCount})
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
  );
}

