import { useState, useEffect, useRef, useCallback } from 'react';
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
  Mail,
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
  sheetUrl?: string;
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
  sheetUrl,
  masterSheetUrl,
  isSheetAdmin = isAdmin,
  calendarUrl,
}: Props) {
  const resolvedSheetUrl = sheetUrl || masterSheetUrl;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragSourceRef = useRef<'handle' | 'header' | 'content'>('handle');
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeWithAnimation = useCallback(() => {
    setIsClosing(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setShowMoreMenu(false);
      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
    }, 220);
  }, []);

  const openMenu = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsClosing(false);
    setDragY(0);
    setIsDragging(false);
    setShowMoreMenu(true);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Harmonized active tab detection
  const isScheduleActive = currentPath === '/portal' || currentPath === '/portal/';
  const isMessagesActive = currentPath.startsWith('/portal/messages');
  const isMusicActive = currentPath.startsWith('/portal/music');
  const isAbsencesActive = currentPath.startsWith('/portal/absences');
  const isSnacksActive = currentPath.startsWith('/portal/snacks');
  const isSeatingActive = currentPath.startsWith('/portal/seating');
  const isMoreActive =
    showMoreMenu ||
    isMessagesActive ||
    currentPath.startsWith('/portal/directory') ||
    currentPath.startsWith('/portal/handbook') ||
    isSeatingActive;

  // Listen for unified mobile drawer trigger from top header avatar
  useEffect(() => {
    function handleOpen() {
      openMenu();
    }
    function handleClose() {
      closeWithAnimation();
    }

    window.addEventListener('kantorei:open-mobile-drawer', handleOpen);
    window.addEventListener('kantorei:close-mobile-drawer', handleClose);

    return () => {
      window.removeEventListener('kantorei:open-mobile-drawer', handleOpen);
      window.removeEventListener('kantorei:close-mobile-drawer', handleClose);
    };
  }, [openMenu, closeWithAnimation]);

  // Dismiss drawer automatically if viewport expands to desktop size (>= 1280px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1280) {
        setShowMoreMenu(false);
        setIsClosing(false);
        setDragY(0);
        setIsDragging(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape key dismissal & background body scroll lock
  useEffect(() => {
    if (!showMoreMenu) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeWithAnimation();
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreMenu, closeWithAnimation]);

  // Pointer event handlers for Grab Handle and Header
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    source: 'handle' | 'header'
  ) => {
    if (e.button !== 0) return;
    dragSourceRef.current = source;
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = Date.now();
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      // Rubber band resistance when pulling up
      setDragY(deltaY * 0.15);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const deltaY = e.clientY - dragStartYRef.current;
    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = deltaY / elapsed;
    const isHandle = dragSourceRef.current === 'handle';

    if (deltaY > 80 || velocity > 0.45) {
      closeWithAnimation();
    } else if (isHandle && Math.abs(deltaY) < 5 && elapsed < 250) {
      // Tap on the handle closes it
      closeWithAnimation();
    } else {
      setDragY(0);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setDragY(0);
  };

  // Content touch drag interception when scrolled to top
  useEffect(() => {
    if (!showMoreMenu) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let isTrackingContent = false;
    let startTime = 0;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      if (sheet && sheet.scrollTop <= 0) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        startTime = Date.now();
        isTrackingContent = true;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isTrackingContent || !sheet) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY;
      const deltaX = currentX - touchStartX;

      // Only engage if pulling DOWN and vertical movement is greater than horizontal
      if (deltaY > 6 && Math.abs(deltaY) > Math.abs(deltaX) && sheet.scrollTop <= 0) {
        if (e.cancelable) e.preventDefault();
        dragSourceRef.current = 'content';
        isDraggingRef.current = true;
        setIsDragging(true);
        setDragY(deltaY);
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!isTrackingContent) return;
      isTrackingContent = false;
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        const touchEndY = e.changedTouches[0]?.clientY ?? touchStartY;
        const totalDeltaY = touchEndY - touchStartY;
        const elapsed = Math.max(1, Date.now() - startTime);
        const velocity = totalDeltaY / elapsed;

        if (totalDeltaY > 80 || velocity > 0.45) {
          closeWithAnimation();
        } else {
          setDragY(0);
        }
      }
    }

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheet.addEventListener('touchend', handleTouchEnd, { passive: true });
    sheet.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
      sheet.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [showMoreMenu, closeWithAnimation]);

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

  const sheetTransform = isClosing
    ? 'translateY(120%)'
    : isDragging
    ? `translateY(${Math.max(0, dragY)}px)`
    : dragY > 0
    ? `translateY(${dragY}px)`
    : undefined;

  const sheetTransition = isDragging
    ? 'none'
    : 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease';

  const backdropOpacity = isClosing
    ? 0
    : isDragging
    ? Math.max(0.1, 1 - Math.max(0, dragY) / 320)
    : 1;

  return (
    <>
      {/* Unified Slide-Up Mobile & Tablet Sheet in Warm Cotton-Ivory */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            onClick={closeWithAnimation}
            className="fixed inset-0 bg-navy-950/55 backdrop-blur-xs transition-opacity duration-200"
            style={{
              opacity: backdropOpacity,
              transition: isDragging ? 'none' : 'opacity 200ms ease',
            }}
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Singer Navigation & Account Menu"
            style={{
              transform: sheetTransform,
              transition: sheetTransition,
              animation: isDragging || isClosing || dragY > 0 ? 'none' : undefined,
            }}
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto overscroll-y-contain rounded-t-xl border-t border-stone-200 bg-[#FAF7F2] p-5 text-stone-800 shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:inset-x-4 sm:bottom-6 sm:mx-auto sm:max-w-xl sm:rounded-2xl sm:border sm:border-stone-200/90 sm:pb-6 ${
              !isDragging && !isClosing && dragY === 0 ? 'animate-in slide-in-from-bottom duration-200' : ''
            }`}
          >
            {/* Grab Handle (Draggable Target) */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'handle')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="group -mt-2 -mx-5 mb-2 flex cursor-grab touch-none items-center justify-center py-3 select-none active:cursor-grabbing"
              aria-label="Swipe down to close menu"
              title="Swipe down to close"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  closeWithAnimation();
                }
              }}
            >
              <div
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  isDragging ? 'bg-copper-500' : 'bg-stone-300 group-hover:bg-stone-400'
                }`}
                aria-hidden="true"
              />
            </div>

            {/* Identity Header (Also Draggable) */}
            <div
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
                handlePointerDown(e, 'header');
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className="flex items-start justify-between border-b border-stone-200/90 pb-4 select-none touch-none cursor-grab active:cursor-grabbing"
            >
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
                onClick={closeWithAnimation}
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
                  href="/portal"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isScheduleActive)}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Schedule &amp; Rehearsals</p>
                      <p className="text-xs text-stone-500">Calls, times &amp; calendar feed</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/messages"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isMessagesActive)}
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Ensemble Bulletin Board</p>
                      <p className="text-xs text-stone-500">Dispatches &amp; singers@kantorei.net</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/music"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isMusicActive)}
                >
                  <div className="flex items-center gap-3">
                    <Music className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Music Library &amp; Audio</p>
                      <p className="text-xs text-stone-500">Score PDFs &amp; practice tracks</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/absences"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isAbsencesActive)}
                >
                  <div className="flex items-center gap-3">
                    <UserX className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Absence Reporting</p>
                      <p className="text-xs text-stone-500">Submit requests &amp; check standing</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/snacks"
                  onClick={() => setShowMoreMenu(false)}
                  className={rowLinkClass(isSnacksActive)}
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-4 w-4 shrink-0 text-copper-600" />
                    <div>
                      <p className="font-medium text-navy-950">Sign-Ups &amp; Duties</p>
                      <p className="text-xs text-stone-500">Hospitality snacks &amp; concert crew</p>
                    </div>
                  </div>
                </a>

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
                  {resolvedSheetUrl && (
                    <a
                      href={resolvedSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowLinkClass()}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-copper-600" />
                        <div>
                          <p className="font-medium text-navy-950">Choir Google Sheet</p>
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

      {/* Fixed Bottom Bar on Mobile & Tablet — Cohesive Warm Cotton-Ivory */}
      <nav
        aria-label="Portal Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-stone-200/90 bg-[#FAF7F2]/96 px-2 pt-1 shadow-[0_-4px_20px_rgba(13,24,38,0.05)] backdrop-blur-md xl:hidden pb-[calc(0.45rem+env(safe-area-inset-bottom,0px))] sm:py-1.5"
      >
        <div className="mx-auto flex max-w-xl items-center justify-around sm:px-4">
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
              className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[10px] transition sm:px-4 sm:py-2 sm:text-[11px]"
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 right-2 left-2 h-[1.5px] bg-copper-500 sm:right-3 sm:left-3"
                />
              )}
              <Icon
                className={`h-4 w-4 transition-colors sm:h-5 sm:w-5 ${
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
            onClick={openMenu}
            className="relative flex cursor-pointer flex-col items-center gap-0.5 px-2.5 py-1.5 text-[10px] transition sm:px-4 sm:py-2 sm:text-[11px]"
          >
            {isMoreActive && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-2 left-2 h-[1.5px] bg-copper-500 sm:right-3 sm:left-3"
              />
            )}
            <MoreHorizontal
              className={`h-4 w-4 transition-colors sm:h-5 sm:w-5 ${
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
