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
import { voicePartBadgeColor } from '../../lib/utils';
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
  const badgeClass = voicePartBadgeColor(singer.voicePart);
  const avatarUrl = singer.picture || singer.photoUrl;
  const showImage = Boolean(avatarUrl && !imgError);

  // Compute initials for avatar (e.g. "Andrew Padgett" -> "AP")
  const initials =
    singer.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'K';

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button: User Avatar + Name + Chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Singer profile and account menu"
        className={`group flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-2 pr-2.5 transition ${
          isOpen
            ? 'border-copper-400/60 bg-white/15 text-white ring-2 ring-copper-400/25'
            : 'border-white/15 bg-white/5 text-stone-200 hover:border-white/25 hover:bg-white/10 hover:text-white'
        }`}
      >
        {/* Avatar: Google profile picture if available, fallback to initials */}
        {showImage ? (
          <img
            src={avatarUrl}
            alt={singer.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/20 shadow-2xs"
          />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-copper-500 to-amber-600 text-[10px] font-bold text-white shadow-2xs">
            {initials}
          </span>
        )}

        {/* Singer display name */}
        <span className="max-w-[120px] truncate text-xs font-semibold text-stone-100 sm:max-w-[160px]">
          {singer.name}
        </span>

        {/* Dropdown Chevron */}
        <ChevronDown
          className={`h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:text-stone-200'
          }`}
        />
      </button>

      {/* Profile Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#0e1726]/95 backdrop-blur-md p-2.5 text-stone-200 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Identity Header Card */}
          <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
            {showImage ? (
              <img
                src={avatarUrl}
                alt={singer.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/20 shadow-xs"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-copper-500 to-amber-600 text-sm font-bold text-white shadow-xs">
                {initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-sm font-bold text-white">{singer.name}</p>
                {isOnLeave && (
                  <span className="rounded-sm border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300">
                    On Leave
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-stone-400">{singer.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}>
                  {singer.voicePart}
                </span>
                <span className="text-[11px] text-stone-300">
                  {singer.sectionGroup} Section
                </span>
                {singer.role !== 'Singer' && (
                  <span className="rounded-sm border border-gold-400/30 bg-gold-400/20 px-1.5 py-0.2 text-[10px] font-semibold text-gold-300">
                    {singer.role.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin & Leadership Tools (Visible if Admin or Section Leader) */}
          {(isSheetAdmin || singer.role !== 'Singer') && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400">
                <span>Admin &amp; Leadership</span>
                <ShieldCheck className="h-3 w-3" />
              </div>

              <div className="space-y-0.5">
                <a
                  href={masterSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-stone-100 group-hover:text-white">Master Google Sheet</p>
                      <p className="text-[10px] text-stone-400">Live roster, schedule, &amp; config</p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-gold-300" />
                </a>

                {repertoireDriveUrl && (
                  <a
                    href={repertoireDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                        <Folder className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-semibold text-stone-100 group-hover:text-white">Repertoire Drive</p>
                        <p className="text-[10px] text-stone-400">PDF scores &amp; audio storage</p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-gold-300" />
                  </a>
                )}

                <a
                  href="/portal/seating?mode=attendance"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-sky-400">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-stone-100 group-hover:text-white">Take Attendance</p>
                      <p className="text-[10px] text-stone-400">Visual riser roll call</p>
                    </div>
                  </div>
                </a>

                <a
                  href="/portal/directory"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-stone-100 group-hover:text-white">Manage Roster</p>
                      <p className="text-[10px] text-stone-400">Singers, voice parts &amp; contact</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Quick Ensemble Links */}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Quick Links
            </div>

            <div className="space-y-0.5">
              <a
                href="/portal/handbook"
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-stone-300">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-stone-100 group-hover:text-white">Choir Handbook</p>
                  <p className="text-[10px] text-stone-400">Policies, governance &amp; bylaws</p>
                </div>
              </a>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-stone-300">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-semibold text-stone-100 group-hover:text-white">Public Website</p>
                    <p className="text-[10px] text-stone-400">kantorei.net box office &amp; info</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Log Out Button */}
          <div className="mt-2 border-t border-white/10 pt-2">
            <form method="POST" action="/api/auth/logout">
              <button
                type="submit"
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 hover:text-rose-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 group-hover:bg-rose-500/25">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <div className="text-left">
                  <p className="font-semibold">Sign Out</p>
                  <p className="text-[10px] text-stone-400 group-hover:text-rose-300/80">Log out of singer portal</p>
                </div>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
