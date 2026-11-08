import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  LogOut,
  FileSpreadsheet,
  Folder,
  CheckSquare,
  Users,
  Globe,
  ExternalLink,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import type { Singer } from '../../types/choir';

interface Props {
  singer: Singer;
  masterSheetUrl?: string;
  isSheetAdmin?: boolean;
  repertoireDriveUrl?: string;
  calendarUrl?: string;
}

export default function UserProfileMenu({
  singer,
  masterSheetUrl = 'https://docs.google.com/spreadsheets',
  isSheetAdmin = singer.role === 'Admin',
  repertoireDriveUrl,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOnLeave = singer.status === 'On_Leave';
  const avatarUrl = singer.picture || singer.photoUrl;
  const showImage = Boolean(avatarUrl && !imgError);
  const hasLeadershipAccess = isSheetAdmin || singer.role !== 'Singer';

  const initials =
    singer.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'K';

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleResize() {
      if (typeof window !== 'undefined' && window.innerWidth < 1280 && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  function handleTriggerClick() {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1279px)').matches
    ) {
      window.dispatchEvent(new CustomEvent('kantorei:open-mobile-drawer'));
      setIsOpen(false);
    } else {
      setIsOpen((previous) => !previous);
    }
  }

  const closeMenu = () => setIsOpen(false);
  const linkClass =
    'group flex min-h-10 items-center gap-3 px-4 py-2.5 text-sm text-stone-700 transition hover:bg-[#f5efe8] hover:text-navy-950 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-copper-600';
  const iconClass = 'h-4 w-4 shrink-0 text-copper-600';
  const descriptionClass = 'mt-0.5 text-xs leading-snug text-stone-500';

  return (
    <div className="relative ml-auto shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Singer profile and account menu"
        className={`group flex max-w-[min(16rem,45vw)] cursor-pointer items-center gap-2.5 rounded-sm border py-1 pl-1.5 pr-2.5 text-navy-950 transition hover:border-stone-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-600 ${
          isOpen ? 'border-copper-400 bg-white' : 'border-stone-200/90 bg-white/60'
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ivory-100 ring-1 ring-stone-200">
          {showImage ? (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="block h-full w-full object-cover object-center"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[#f9efe8] text-[11px] font-semibold text-copper-600">
              {initials}
            </span>
          )}
        </span>
        <span className="hidden min-w-0 truncate text-xs font-medium text-stone-800 sm:block">
          {singer.name}
        </span>
        {singer.role === 'Admin' && (
          <span className="hidden rounded-xs border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-copper-600 md:inline">
            Admin
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`hidden h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform sm:block ${
            isOpen ? 'rotate-180 text-copper-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Singer account menu"
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(80vh,42rem)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-sm border border-stone-200 bg-[#FAF7F2] text-stone-800 shadow-xl shadow-navy-950/10"
        >
          <div className="flex items-start gap-3 border-b border-stone-200/90 px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ivory-100 ring-1 ring-stone-200">
              {showImage ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="block h-full w-full object-cover object-center"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#f9efe8] text-sm font-semibold text-copper-600">
                  {initials}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-editorial text-xl font-semibold leading-tight text-navy-950">
                  {singer.name}
                </p>
                {singer.role === 'Admin' && (
                  <span className="shrink-0 rounded-xs border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-copper-600">
                    Admin
                  </span>
                )}
                {isOnLeave && (
                  <span className="shrink-0 border border-copper-300/80 bg-[#f9efe8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-copper-600">
                    Season Leave
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-stone-500">{singer.email}</p>
            </div>
          </div>

          {hasLeadershipAccess && (
            <section className="border-b border-stone-200/90 py-2" aria-label="Leadership tools">
              <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-copper-600">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Leadership &amp; Workspace</span>
              </div>
              <div className="divide-y divide-stone-200/60">
                <a role="menuitem" href={masterSheetUrl} target="_blank" rel="noopener noreferrer" onClick={closeMenu} className={linkClass}>
                  <FileSpreadsheet className={iconClass} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Master Google Sheet</span>
                    <span className={descriptionClass}>Roster, schedule, and configuration</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
                </a>
                {repertoireDriveUrl && (
                  <a role="menuitem" href={repertoireDriveUrl} target="_blank" rel="noopener noreferrer" onClick={closeMenu} className={linkClass}>
                    <Folder className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Repertoire Drive</span>
                      <span className={descriptionClass}>Scores and audio files</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
                  </a>
                )}
                <a role="menuitem" href="/portal/seating?mode=attendance" onClick={closeMenu} className={linkClass}>
                  <CheckSquare className={iconClass} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Take Attendance</span>
                    <span className={descriptionClass}>Visual roll call</span>
                  </span>
                </a>
                <a role="menuitem" href="/portal/directory" onClick={closeMenu} className={linkClass}>
                  <Users className={iconClass} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Manage Roster</span>
                    <span className={descriptionClass}>Singers and contact details</span>
                  </span>
                </a>
              </div>
            </section>
          )}

  <section className="border-b border-stone-200/90 py-2" aria-label="Quick links">
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Ensemble Resources
            </div>
            <div className="divide-y divide-stone-200/60">
              <a role="menuitem" href="/portal/messages" onClick={closeMenu} className={linkClass}>
                <BookOpen className={iconClass} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Ensemble Bulletin Board</span>
                  <span className={descriptionClass}>Dispatches &amp; singers@kantorei.net archive</span>
                </span>
              </a>
              <a role="menuitem" href="/portal/handbook" onClick={closeMenu} className={linkClass}>
                <BookOpen className={iconClass} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Choir Handbook</span>
                  <span className={descriptionClass}>Policies, governance, and bylaws</span>
                </span>
              </a>
              <a role="menuitem" href="/" target="_blank" rel="noopener noreferrer" onClick={closeMenu} className={linkClass}>
                <Globe className={iconClass} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Public Website</span>
                  <span className={descriptionClass}>Concerts, tickets, and Kantorei news</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
              </a>
            </div>
          </section>

          <form method="POST" action="/api/auth/logout" className="p-2">
            <button
              role="menuitem"
              type="submit"
              className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm text-stone-600 transition hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-700"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
