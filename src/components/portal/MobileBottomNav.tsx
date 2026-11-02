import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  LogOut,
  MoreHorizontal,
  Music,
  ShieldCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';

interface Props {
  currentPath: string;
  isAdmin: boolean;
  singerName: string;
  voicePart: string;
}

export default function MobileBottomNav({
  currentPath,
  isAdmin,
  singerName,
  voicePart,
}: Props) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isTodayActive = currentPath === '/portal' || currentPath === '/portal/';
  const isMusicActive = currentPath.startsWith('/portal/music');
  const isSnacksActive = currentPath.startsWith('/portal/snacks');
  const isAbsencesActive = currentPath.startsWith('/portal/absences');
  const isMoreActive =
    currentPath.startsWith('/portal/directory') ||
    currentPath.startsWith('/portal/handbook') ||
    currentPath.startsWith('/portal/admin');

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
                href="/portal/directory"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
                  <Users className="h-4 w-4" />
                </span>
                <span>Member Contact Directory</span>
              </a>

              <a
                href="/portal/handbook"
                className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
                  <BookOpen className="h-4 w-4" />
                </span>
                <span>Choir Handbook &amp; Vision</span>
              </a>

              {isAdmin && (
                <a
                  href="/portal/admin"
                  className="flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold text-navy-950 transition hover:bg-amber-50/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span>Roll Call &amp; Roster Admin</span>
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

