import { Check, Copy, ExternalLink, Grid, List, Mail, Moon, Plus, Search } from 'lucide-react';
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
  cohortEmailCount?: number;
  cohortLabel?: string;
  copiedCohort?: boolean;
  onCopyCohortEmails?: () => void;
  mailtoCohortUrl?: string;
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
  cohortEmailCount = 0,
  cohortLabel = 'Section',
  copiedCohort = false,
  onCopyCohortEmails,
  mailtoCohortUrl,
}: Props) {
  return (
    <div className="overflow-hidden rounded-sm border border-stone-200/90 bg-white">
      <div className="space-y-4 p-4 sm:p-5">
        {/* Top Controls Row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3.5 h-4 w-4 text-stone-400" />
            <input
              type="search"
              placeholder="Search by singer name, email, phone, or vocal part…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-sm border border-stone-300 bg-[#FAF7F2]/60 py-2 pr-4 pl-10 text-xs text-navy-950 focus:border-navy-950 focus:bg-white focus:outline-none sm:text-sm"
            />
          </div>

          {/* View Switcher & Admin Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center rounded-sm border border-stone-300/90 bg-[#FAF7F2] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  viewMode === 'cards'
                    ? 'bg-navy-950 text-white'
                    : 'text-stone-600 hover:text-navy-950'
                }`}
                title="View member directory cards"
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Directory</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  viewMode === 'table'
                    ? 'bg-navy-950 text-white'
                    : 'text-stone-600 hover:text-navy-950'
                }`}
                title="View roster ledger"
              >
                <List className="h-3.5 w-3.5" />
                <span>Ledger</span>
              </button>
            </div>

            {/* Admin Add Singer Button */}
            {canManageRoster && (
              <button
                type="button"
                onClick={onOpenCreateMember}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-navy-900"
              >
                <Plus className="h-3.5 w-3.5 text-copper-400" />
                <span>Add Member</span>
              </button>
            )}

            {/* Master Sheet Link (Desktop) */}
            {masterSheetUrl && (
              <a
                href={masterSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950 sm:inline-flex"
                title={isAdmin ? 'Open Master Google Sheet (Edit Access)' : 'Open Master Google Sheet (View Access)'}
              >
                <span>Master Sheet</span>
                <ExternalLink className="h-3 w-3 text-stone-400" />
              </a>
            )}
          </div>
        </div>

        {/* Filters Row: Sections & Status */}
        <div className="flex flex-col gap-3 border-t border-stone-200/80 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Section Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', ...SECTION_GROUPS] as const).map((group) => {
              const isSelected = section === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSection(group)}
                  className={`cursor-pointer rounded-sm border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${
                    isSelected
                      ? 'border-navy-950 bg-navy-950 text-white'
                      : 'border-stone-200/90 bg-white text-stone-600 hover:border-stone-400 hover:text-navy-950'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`cursor-pointer rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                statusFilter === 'Active'
                  ? 'border-navy-950 bg-navy-950 text-white'
                  : 'border-stone-200/90 bg-[#FAF7F2] text-stone-600 hover:border-stone-400 hover:text-navy-950'
              }`}
            >
              Active ({activeCount})
            </button>

            {onLeaveCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'On_Leave' ? 'Active' : 'On_Leave')}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  statusFilter === 'On_Leave'
                    ? 'border-copper-600 bg-copper-600 text-white'
                    : 'border-[#e6d5bc] bg-[#f8efe2]/70 text-[#7d5220] hover:border-copper-500'
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
                  className={`cursor-pointer rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    statusFilter === 'All'
                      ? 'border-navy-950 bg-navy-950 text-white'
                      : 'border-stone-200/90 bg-[#FAF7F2] text-stone-600 hover:border-stone-400 hover:text-navy-950'
                  }`}
                >
                  All ({totalCount})
                </button>

                {inactiveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Inactive')}
                    className={`cursor-pointer rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                      statusFilter === 'Inactive'
                        ? 'border-stone-700 bg-stone-700 text-white'
                        : 'border-stone-200/90 bg-[#FAF7F2] text-stone-500 hover:border-stone-400 hover:text-navy-950'
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

      {/* Cohort Communication Bar */}
      {cohortEmailCount > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-stone-200/90 bg-[#FAF7F2] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-stone-600">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-950">
              {cohortLabel}
            </span>
            <span className="text-stone-300" aria-hidden="true">·</span>
            <span className="text-stone-500">
              {cohortEmailCount} {cohortEmailCount === 1 ? 'address' : 'addresses'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onCopyCohortEmails && (
              <button
                type="button"
                onClick={onCopyCohortEmails}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  copiedCohort
                    ? 'border-copper-600 bg-[#f9efe8] text-navy-950'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-navy-950 hover:text-navy-950'
                }`}
                title={`Copy all ${cohortEmailCount} email addresses for ${cohortLabel}`}
              >
                {copiedCohort ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-copper-600" />
                    <span>Copied {cohortLabel}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-400" />
                    <span>Copy Emails</span>
                  </>
                )}
              </button>
            )}

            {mailtoCohortUrl && (
              <a
                href={mailtoCohortUrl}
                className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-700 transition hover:border-navy-950 hover:text-navy-950"
                title={`Draft email to all ${cohortEmailCount} singers with addresses in Bcc`}
              >
                <Mail className="h-3.5 w-3.5 text-copper-600" />
                <span>Email {cohortLabel} (Bcc)</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
