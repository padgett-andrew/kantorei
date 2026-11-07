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

  const rowLinkClass = (active = false) =>
    `flex items-center justify-between px-3 py-2.5 text-sm transition ${
      active
        ? 'bg-[#f5efe8] text-navy-950 font-medium border-l-2 border-copper-500'
        : 'text-stone-700 hover:bg-[#f5efe8] hover:text-navy-950'
    }`;

  return (
    <>
      {/* Unified Slide-Up Mobile Sheet in Warm Cotton-Ivory */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setShowMoreMenu(false)}
            className="fixed inset-0 bg-navy-950/55 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Singer Navigation & Account Menu"
            className="fixed right-0 bottom-0 left-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-xl border-t border-stone-200 bg-[#FAF7F2] p-5 text-stone-800 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Grab Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-300" aria-hidden="true" />

            {/* Identity Header */}
            <div className="flex items-start justify-between border-b border-stone-200/90 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={singerDisplayName}
                    referrerPolicy="no-referrer"
                    className="block h-11 w-11 shrink-0 rounded-full object-cover object-center ring-1 ring-stone-200"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f9efe8] text-sm font-semibold text-copper-600 ring-1 ring-copper-200">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-editorial text-xl font-semibold leading-tight text-navy-950">
                      {singerDisplayName}
                    </p>
                    {isAdmin && (
                      <span className="shrink-0 rounded-xs border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-copper-600">
                        Admin
                      </span>
                    )}
                  </div>
                  {singer?.email && (
                    <p className="mt-0.5 max-w-[220px] truncate text-xs text-stone-500">
                      {singer.email}
                    </p>
                  )}
                  {singerStatus === 'On_Leave' && (
                    <div className="mt-1.5">
                      <span className="border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-copper-600">
                        Season Leave
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-sm p-2 text-stone-400 transition hover:bg-[#f5efe8] hover:text-navy-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Singer Portal Workspaces */}
            <div className="mt-4">
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-copper-600">
                Ensemble Workspaces
              </div>

              <div className="divide-y divide-stone-200/70 border-y border-stone-200/80">
                <a
                  href="/portal/seating"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isSeatingActive)}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Seating &amp; Stage Formation</p>
                      <p className="text-xs text-stone-500">Stage placement &amp; seating chart</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/directory"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(currentPath.startsWith('/portal/directory'))}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Roster &amp; Member Directory</p>
                      <p className="text-xs text-stone-500">Contact info &amp; section cohorts</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/handbook"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(currentPath.startsWith('/portal/handbook'))}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Handbook &amp; Ensemble Documents</p>
                      <p className="text-xs text-stone-500">Policies, governance &amp; bylaws</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Section 2: Leadership & Workspace (Conditional) */}
            {isLeaderOrAdmin && (
              <div className="mt-5">
                <div className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-copper-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Leadership &amp; Workspace</span>
                </div>

                <div className="divide-y divide-stone-200/70 border-y border-stone-200/80">
                  {masterSheetUrl && (
                    <a
                      href={masterSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowLinkClass()}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-copper-600" />
                        <div>
                          <p className="font-medium text-navy-950">Master Google Sheet</p>
                          <p className="text-xs text-stone-500">Roster, schedule &amp; configuration</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                    </a>
                  )}

                  {repertoireDriveUrl && (
                    <a
                      href={repertoireDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowLinkClass()}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="h-4 w-4 shrink-0 text-copper-600" />
                        <div>
                          <p className="font-medium text-navy-950">Repertoire Google Drive</p>
                          <p className="text-xs text-stone-500">PDF scores &amp; audio storage</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                    </a>
                  )}

                  {calendarUrl && (
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowLinkClass()}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 shrink-0 text-copper-600" />
                        <div>
                          <p className="font-medium text-navy-950">Google Calendar</p>
                          <p className="text-xs text-stone-500">Rehearsal calls &amp; locations</p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                    </a>
                  )}

                  {isAdmin && (
                    <a
                      href="/portal/handbook?doc=admin-guide"
                      onClick={() => setShowMoreMenu(false)}
                      className={rowLinkClass()}
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 shrink-0 text-copper-600" />
                        <div>
                          <p className="font-medium text-navy-950">Admin Operations Guide</p>
                          <p className="text-xs text-stone-500">Maintenance &amp; permissions protocols</p>
                        </div>
                      </div>
                    </a>
                  )}

                  <a
                    href="/portal/seating?mode=attendance"
                    onClick={() => setShowMoreMenu(false)}
                    className={rowLinkClass()}
                  >
                    <div className="flex items-center gap-3">
                      <CheckSquare className="h-4 w-4 shrink-0 text-copper-600" />
                      <div>
                        <p className="font-medium text-navy-950">Take Roll Call</p>
                        <p className="text-xs text-stone-500">Visual chart attendance check</p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Section 3: Public Website & Box Office */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Public Website &amp; Season
                </p>
                <Globe className="h-3.5 w-3.5 text-stone-400" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/concerts"
                  className="flex items-center gap-2 rounded-sm border border-stone-200/90 bg-white/80 p-2.5 text-xs font-medium text-stone-700 transition hover:border-copper-300 hover:text-navy-950"
                >
                  <Ticket className="h-3.5 w-3.5 shrink-0 text-copper-600" />
                  <span className="truncate">Concerts</span>
                </a>
                <a
                  href="/media"
                  className="flex items-center gap-2 rounded-sm border border-stone-200/90 bg-white/80 p-2.5 text-xs font-medium text-stone-700 transition hover:border-copper-300 hover:text-navy-950"
                >
                  <Music className="h-3.5 w-3.5 shrink-0 text-copper-600" />
                  <span className="truncate">Media &amp; Recordings</span>
                </a>
                <a
                  href="/about"
                  className="flex items-center gap-2 rounded-sm border border-stone-200/90 bg-white/80 p-2.5 text-xs font-medium text-stone-700 transition hover:border-copper-300 hover:text-navy-950"
                >
                  <Users className="h-3.5 w-3.5 shrink-0 text-copper-600" />
                  <span className="truncate">About Kantorei</span>
                </a>
                <a
                  href="/support"
                  className="flex items-center gap-2 rounded-sm border border-stone-200/90 bg-white/80 p-2.5 text-xs font-medium text-stone-700 transition hover:border-copper-300 hover:text-navy-950"
                >
                  <Heart className="h-3.5 w-3.5 shrink-0 text-copper-600" />
                  <span className="truncate">Support</span>
                </a>
              </div>

              <a
                href="/"
                className="mt-2 flex items-center justify-between rounded-sm border border-stone-200/90 bg-white/80 px-3 py-2.5 text-xs font-medium text-stone-700 transition hover:border-copper-300 hover:text-navy-950"
              >
                <span>Visit Public Home Page</span>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
              </a>
            </div>

            {/* Section 4: Sign Out */}
            <div className="mt-5 border-t border-stone-200/90 pt-3">
              <form method="POST" action="/api/auth/logout">
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-rose-50 hover:text-rose-800"
                >
                  <LogOut className="h-4 w-4 text-stone-500" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar on Mobile Phones — Cohesive Warm Cotton-Ivory */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-stone-200/90 bg-[#FAF7F2]/96 px-2 pt-1 shadow-[0_-4px_20px_rgba(13,24,38,0.05)] backdrop-blur-md sm:hidden pb-[calc(0.45rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around">
          {[
            { href: '/portal', label: 'Schedule', active: isScheduleActive, Icon: Calendar },
            { href: '/portal/music', label: 'Music', active: isMusicActive, Icon: Music },
            { href: '/portal/absences', label: 'Absences', active: isAbsencesActive, Icon: UserX },
            { href: '/portal/snacks', label: 'Sign-Ups', active: isSnacksActive, Icon: CheckSquare },
          ].map(({ href, label, active, Icon }) => (
            <a
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[10px] transition"
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 right-2 left-2 h-[1.5px] bg-copper-500"
                />
              )}
              <Icon
                className={`h-4 w-4 transition-colors ${
                  active ? 'text-copper-600' : 'text-stone-400'
                }`}
              />
              <span
                className={`tracking-[0.04em] transition-colors ${
                  active ? 'font-semibold text-navy-950' : 'font-medium text-stone-500'
                }`}
              >
                {label}
              </span>
            </a>
          ))}

          {/* More / Menu */}
          <button
            type="button"
            aria-label="More navigation options and account"
            aria-expanded={showMoreMenu}
            aria-haspopup="dialog"
            onClick={() => setShowMoreMenu(true)}
            className="relative flex cursor-pointer flex-col items-center gap-0.5 px-2.5 py-1.5 text-[10px] transition"
          >
            {isMoreActive && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-2 left-2 h-[1.5px] bg-copper-500"
              />
            )}
            <MoreHorizontal
              className={`h-4 w-4 transition-colors ${
                isMoreActive ? 'text-copper-600' : 'text-stone-400'
              }`}
            />
            <span
              className={`tracking-[0.04em] transition-colors ${
                isMoreActive ? 'font-semibold text-navy-950' : 'font-medium text-stone-500'
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
