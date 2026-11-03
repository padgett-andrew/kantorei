import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ExternalLink,
  FileSpreadsheet,
  Layers,
  LogOut,
  MoreHorizontal,
  Music,
  UserX,
  Users,
  X,
} from 'lucide-react';

interface Props {
  currentPath: string;
  isAdmin: boolean;
  singerName: string;
  voicePart: string;
  repertoireDriveUrl?: string;
  masterSheetUrl?: string;
  isSheetAdmin?: boolean;
  calendarUrl?: string;
}

export default function MobileBottomNav({
  currentPath,
  isAdmin,
  singerName,
  voicePart,
  masterSheetUrl,
  isSheetAdmin = isAdmin,
  calendarUrl,
}: Props) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isTodayActive = currentPath === '/portal' || currentPath === '/portal/';
  const isMusicActive = currentPath.startsWith('/portal/music');
  const isSnacksActive = currentPath.startsWith('/portal/snacks');
  const isAbsencesActive = currentPath.startsWith('/portal/absences');
  const isSeatingActive = currentPath.startsWith('/portal/seating');
  const isMoreActive =
    currentPath.startsWith('/portal/directory') ||
    currentPath.startsWith('/portal/handbook') ||
    isSeatingActive;

  return (
    <>
      {/* Slide-Up "More" Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setShowMoreMenu(false)}
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs animate-in fade-in"
          />

          {/* Sheet */}
          <div className="fixed right-0 bottom-0 left-0 z-50 rounded-t-3xl border-t border-zinc-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <p className="text-xs font-bold text-navy-950">{singerName}</p>
                <p className="text-[11px] text-zinc-500">{voicePart} · Singer Portal</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              <a
                href="/portal/seating"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
                  <Layers className="h-4 w-4" />
                </span>
                <span>Seating &amp; Attendance</span>
              </a>

              <a
                href="/portal/directory"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
                  <Users className="h-4 w-4" />
                </span>
                <span>Roster &amp; Member Directory</span>
              </a>

              <a
                href="/portal/handbook"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span>Documents</span>
              </a>

              {isAdmin && (
                <a
                  href="/portal/handbook?doc=admin-guide"
                  className="flex items-center justify-between rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-amber-50/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span>Admin Guide</span>
                  </div>
                  <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-900">
                    Leader
                  </span>
                </a>
              )}

              {isAdmin && calendarUrl && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <span>Google Calendar</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                </a>
              )}

              {isSheetAdmin && masterSheetUrl && (
                <a
                  href={masterSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                    <div>
                      <span>Master Google Sheet</span>
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                        Edit
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                </a>
              )}

              <a
                href="/"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  🌐
                </span>
                <span>Public Box Office Site</span>
              </a>

              <form method="POST" action="/api/auth/logout" className="pt-2">
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar on Mobile Phones */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-zinc-200/90 bg-white/95 px-2 pt-1.5 shadow-lg backdrop-blur-md sm:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-center justify-around">
          {/* 1. Today / Schedule */}
          <a
            href="/portal"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
              isTodayActive
                ? 'text-navy-950 font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                isTodayActive ? 'bg-navy-900 text-gold-300 shadow-2xs' : ''
              }`}
            >
              <Calendar className="h-4 w-4" />
            </span>
            <span>Today</span>
          </a>

          {/* 2. Music */}
          <a
            href="/portal/music"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
              isMusicActive
                ? 'text-navy-950 font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                isMusicActive ? 'bg-navy-900 text-gold-300 shadow-2xs' : ''
              }`}
            >
              <Music className="h-4 w-4" />
            </span>
            <span>Music</span>
          </a>

          {/* 3. Duties & Hospitality */}
          <a
            href="/portal/snacks"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
              isSnacksActive
                ? 'text-navy-950 font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                isSnacksActive ? 'bg-navy-900 text-gold-300 shadow-2xs' : ''
              }`}
            >
              <CheckSquare className="h-4 w-4" />
            </span>
            <span>Signups</span>
          </a>

          {/* 4. Absences */}
          <a
            href="/portal/absences"
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
              isAbsencesActive
                ? 'text-navy-950 font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                isAbsencesActive ? 'bg-navy-900 text-gold-300 shadow-2xs' : ''
              }`}
            >
              <UserX className="h-4 w-4" />
            </span>
            <span>Absence</span>
          </a>

          {/* 5. More Menu Button */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
              isMoreActive
                ? 'text-navy-950 font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${
                isMoreActive ? 'bg-navy-900 text-gold-300 shadow-2xs' : ''
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

