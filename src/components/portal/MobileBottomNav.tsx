import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ExternalLink,
  FileSpreadsheet,
  Folder,
  Globe,
  Heart,
  Layers,
  LogOut,
  MoreHorizontal,
  Music,
  ShieldCheck,
  Ticket,
  UserX,
  Users,
  X,
} from 'lucide-react';
import type { Singer } from '../../types/choir';

interface Props {
  currentPath: string;
  singer?: Singer;
  isAdmin?: boolean;
  singerName?: string;
  voicePart?: string;
  repertoireDriveUrl?: string;
  masterSheetUrl?: string;
  isSheetAdmin?: boolean;
  calendarUrl?: string;
}

export default function MobileBottomNav({
  currentPath,
  singer,
  isAdmin = false,
  singerName = '',
  voicePart: _voicePart = '',
  repertoireDriveUrl,
  masterSheetUrl,
  isSheetAdmin = isAdmin,
  calendarUrl,
}: Props) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Harmonized active tab detection
  const isScheduleActive = currentPath === '/portal' || currentPath === '/portal/';
  const isMusicActive = currentPath.startsWith('/portal/music');
  const isAbsencesActive = currentPath.startsWith('/portal/absences');
  const isSnacksActive = currentPath.startsWith('/portal/snacks');
  const isSeatingActive = currentPath.startsWith('/portal/seating');
  const isMoreActive =
    showMoreMenu ||
    currentPath.startsWith('/portal/directory') ||
    currentPath.startsWith('/portal/handbook') ||
    isSeatingActive;

  // Listen for unified mobile drawer trigger from top header avatar
  useEffect(() => {
    function handleOpen() {
      setShowMoreMenu(true);
    }
    function handleClose() {
      setShowMoreMenu(false);
    }

    window.addEventListener('kantorei:open-mobile-drawer', handleOpen);
    window.addEventListener('kantorei:close-mobile-drawer', handleClose);

    return () => {
      window.removeEventListener('kantorei:open-mobile-drawer', handleOpen);
      window.removeEventListener('kantorei:close-mobile-drawer', handleClose);
    };
  }, []);

  // Escape key dismissal & background body scroll lock
  useEffect(() => {
    if (!showMoreMenu) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreMenu]);

  // Singer identity normalization
  const singerDisplayName = singer?.name || singerName || 'Singer';
  const singerSectionGroup = singer?.sectionGroup || '';
  const singerRole = singer?.role || (isAdmin ? 'Admin' : 'Singer');
  const singerStatus = singer?.status || 'Active';
  const avatarUrl = singer?.picture || singer?.photoUrl;
  const isLeaderOrAdmin = isSheetAdmin || singerRole !== 'Singer';

  const initials =
    singerDisplayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'K';

  return (
    <>
      {/* Unified Slide-Up Mobile Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setShowMoreMenu(false)}
            className="fixed inset-0 bg-navy-950/75 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Sheet Container in Rich Dark Slate */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Singer Navigation & Account Menu"
            className="fixed right-0 bottom-0 left-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#0B131E] text-stone-200 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Grab Handle */}
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20" aria-hidden="true" />

            {/* Identity Card */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={singerDisplayName}
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/20 shadow-xs"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-copper-500 to-amber-600 text-sm font-bold text-white shadow-xs">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">
                    {singerDisplayName}
                  </p>
                  {singer?.email && (
                    <p className="text-[11px] text-stone-400 truncate max-w-[210px]">
                      {singer.email}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {singerSectionGroup && (
                      <span className="text-[11px] text-stone-300">
                        {singerSectionGroup} Section
                      </span>
                    )}
                    {singerRole !== 'Singer' && (
                      <span className="rounded-sm border border-gold-400/30 bg-gold-400/20 px-1.5 py-0.2 text-[10px] font-semibold text-gold-300">
                        {singerRole.replace('_', ' ')}
                      </span>
                    )}
                    {singerStatus === 'On_Leave' && (
                      <span className="rounded-sm border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300">
                        On Leave
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-xl p-2 text-stone-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Singer Portal Workspaces */}
            <div className="mt-4 space-y-1">
              <div className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-copper-400">
                Singer Workspace
              </div>

              <a
                href="/portal/seating"
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold transition ${
                  isSeatingActive
                    ? 'border border-copper-400/40 bg-copper-500/20 text-copper-300'
                    : 'text-stone-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-copper-300">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-stone-100">Seating &amp; Visual Riser</p>
                    <p className="text-[10px] text-stone-400">Riser layout &amp; chair assignments</p>
                  </div>
                </div>
              </a>

              <a
                href="/portal/directory"
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold transition ${
                  currentPath.startsWith('/portal/directory')
                    ? 'border border-copper-400/40 bg-copper-500/20 text-copper-300'
                    : 'text-stone-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-copper-300">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-stone-100">Roster &amp; Member Directory</p>
                    <p className="text-[10px] text-stone-400">Contact info &amp; email cohort</p>
                  </div>
                </div>
              </a>

              <a
                href="/portal/handbook"
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold transition ${
                  currentPath.startsWith('/portal/handbook')
                    ? 'border border-copper-400/40 bg-copper-500/20 text-copper-300'
                    : 'text-stone-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-copper-300">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-stone-100">Choir Handbook &amp; Documents</p>
                    <p className="text-[10px] text-stone-400">Policies, governance &amp; bylaws</p>
                  </div>
                </div>
              </a>
            </div>

            {/* Section 2: Public Website & Box Office (Seamless Bridge) */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
                  Public Box Office &amp; Info
                </p>
                <Globe className="h-3 w-3 text-gold-400/80" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/concerts"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <Ticket className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                  <span className="truncate">Concerts &amp; Tickets</span>
                </a>
                <a
                  href="/media"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <Music className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                  <span className="truncate">Media &amp; Video</span>
                </a>
                <a
                  href="/about"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <Users className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                  <span className="truncate">About Kantorei</span>
                </a>
                <a
                  href="/support"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <Heart className="h-3.5 w-3.5 text-gold-400 shrink-0" />
                  <span className="truncate">Support / Giving</span>
                </a>
              </div>

              <a
                href="/"
                className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-medium text-stone-300 hover:bg-white/10 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-stone-400" />
                  <span>Visit Public Home Page (kantorei.net)</span>
                </div>
                <ExternalLink className="h-3 w-3 text-stone-500" />
              </a>
            </div>

            {/* Section 3: Leadership & Workspace (Conditional) */}
            {isLeaderOrAdmin && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Leadership &amp; Workspace
                  </p>
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                </div>

                <div className="space-y-1">
                  {masterSheetUrl && (
                    <a
                      href={masterSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                          <FileSpreadsheet className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-stone-100">Master Google Sheet</p>
                          <p className="text-[10px] text-stone-400">Live roster, schedule &amp; config</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                    </a>
                  )}

                  {repertoireDriveUrl && (
                    <a
                      href={repertoireDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                          <Folder className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-stone-100">Repertoire Google Drive</p>
                          <p className="text-[10px] text-stone-400">PDF scores &amp; audio storage</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                    </a>
                  )}

                  {calendarUrl && (
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-sky-400">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-stone-100">Google Calendar</p>
                          <p className="text-[10px] text-stone-400">Rehearsal calls &amp; locations</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                    </a>
                  )}

                  {isAdmin && (
                    <a
                      href="/portal/handbook?doc=admin-guide"
                      onClick={() => setShowMoreMenu(false)}
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-400/30 bg-navy-900 text-gold-400">
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-stone-100">Admin Operations Guide</p>
                          <p className="text-[10px] text-stone-400">Maintenance &amp; permissions protocols</p>
                        </div>
                      </div>
                    </a>
                  )}

                  <a
                    href="/portal/seating?mode=attendance"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-sky-400">
                        <CheckSquare className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100">Take Roll Call</p>
                        <p className="text-[10px] text-stone-400">Visual riser attendance check</p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Section 4: Sign Out */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <form method="POST" action="/api/auth/logout">
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <p className="font-semibold">Sign Out</p>
                    <p className="text-[10px] text-stone-400">Log out of singer portal</p>
                  </div>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Dock on Mobile Phones */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-white/10 bg-[#0B131E]/98 px-2 pt-1.5 shadow-2xl backdrop-blur-md sm:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around">
          {/* 1. Schedule */}
          <a
            href="/portal"
            aria-current={isScheduleActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-sm transition ${
                isScheduleActive
                  ? 'bg-copper-500/30 border border-copper-300/50 text-copper-200 shadow-xs'
                  : 'text-stone-400'
              }`}
            >
              <Calendar className="h-4 w-4" />
            </span>
            <span
              className={`transition-colors ${
                isScheduleActive
                  ? 'text-copper-200 font-bold tracking-wide'
                  : 'text-stone-300 font-medium hover:text-white'
              }`}
            >
              Schedule
            </span>
          </a>

          {/* 2. Music */}
          <a
            href="/portal/music"
            aria-current={isMusicActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-sm transition ${
                isMusicActive
                  ? 'bg-copper-500/30 border border-copper-300/50 text-copper-200 shadow-xs'
                  : 'text-stone-400'
              }`}
            >
              <Music className="h-4 w-4" />
            </span>
            <span
              className={`transition-colors ${
                isMusicActive
                  ? 'text-copper-200 font-bold tracking-wide'
                  : 'text-stone-300 font-medium hover:text-white'
              }`}
            >
              Music
            </span>
          </a>

          {/* 3. Absences */}
          <a
            href="/portal/absences"
            aria-current={isAbsencesActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-sm transition ${
                isAbsencesActive
                  ? 'bg-copper-500/30 border border-copper-300/50 text-copper-200 shadow-xs'
                  : 'text-stone-400'
              }`}
            >
              <UserX className="h-4 w-4" />
            </span>
            <span
              className={`transition-colors ${
                isAbsencesActive
                  ? 'text-copper-200 font-bold tracking-wide'
                  : 'text-stone-300 font-medium hover:text-white'
              }`}
            >
              Absences
            </span>
          </a>

          {/* 4. Hospitality */}
          <a
            href="/portal/snacks"
            aria-current={isSnacksActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-sm transition ${
                isSnacksActive
                  ? 'bg-copper-500/30 border border-copper-300/50 text-copper-200 shadow-xs'
                  : 'text-stone-400'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
            </span>
            <span
              className={`transition-colors ${
                isSnacksActive
                  ? 'text-copper-200 font-bold tracking-wide'
                  : 'text-stone-300 font-medium hover:text-white'
              }`}
            >
              Hospitality
            </span>
          </a>

          {/* 5. More / Menu */}
          <button
            type="button"
            aria-label="More navigation options and account"
            aria-expanded={showMoreMenu}
            aria-haspopup="dialog"
            onClick={() => setShowMoreMenu(true)}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] transition"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-sm transition ${
                isMoreActive
                  ? 'bg-copper-500/30 border border-copper-300/50 text-copper-200 shadow-xs'
                  : 'text-stone-400'
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
            <span
              className={`transition-colors ${
                isMoreActive
                  ? 'text-copper-200 font-bold tracking-wide'
                  : 'text-stone-300 font-medium hover:text-white'
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
