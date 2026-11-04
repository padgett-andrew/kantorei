import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  Check,
  Download,
  ExternalLink,
} from 'lucide-react';
import { parseSingleNaturalDate } from '../../lib/dates';

interface Props {
  title: string;
  description?: string;
  location?: string;
  venueName?: string;
  venueAddress?: string;
  dateStr: string;
  durationHours?: number;
  label?: string;
  variant?: 'pill' | 'badge' | 'inline' | 'dark';
  align?: 'left' | 'right';
  className?: string;
}

function formatUtcCompact(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function escapeIcsText(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export default function AddToCalendarButton({
  title,
  description = 'Concert performance by Kantorei choral ensemble. Details & tickets: https://kantorei.net/concerts',
  location,
  venueName,
  venueAddress,
  dateStr,
  durationHours = 2,
  label = 'Add to Calendar',
  variant = 'pill',
  align = 'right',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [downloaded, setDownloaded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function handleToggle() {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 260 && spaceAbove > 220) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
    setIsOpen((v) => !v);
  }

  const fullLocation =
    location ||
    [venueName, venueAddress].filter(Boolean).join(', ') ||
    'Twin Cities Sanctuary';

  const fullTitle = title.includes('Kantorei') ? title : `${title} — Kantorei`;

  const parsed = parseSingleNaturalDate(dateStr);
  const startDate = parsed ? parsed.date : new Date();
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 1. Google Calendar Web URL
  const googleUrl = (() => {
    const u = new URL('https://calendar.google.com/calendar/render');
    u.searchParams.set('action', 'TEMPLATE');
    u.searchParams.set('text', fullTitle);
    u.searchParams.set(
      'dates',
      `${formatUtcCompact(startDate)}/${formatUtcCompact(endDate)}`
    );
    u.searchParams.set('details', description);
    u.searchParams.set('location', fullLocation);
    return u.toString();
  })();

  // 2. Outlook.com Web URL
  const outlookLiveUrl = (() => {
    const u = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    u.searchParams.set('path', '/calendar/action/compose');
    u.searchParams.set('rru', 'addevent');
    u.searchParams.set('subject', fullTitle);
    u.searchParams.set('startdt', formatLocalIso(startDate));
    u.searchParams.set('enddt', formatLocalIso(endDate));
    u.searchParams.set('body', description);
    u.searchParams.set('location', fullLocation);
    return u.toString();
  })();

  // 3. Microsoft 365 (Office 365) Web URL
  const office365Url = (() => {
    const u = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
    u.searchParams.set('path', '/calendar/action/compose');
    u.searchParams.set('rru', 'addevent');
    u.searchParams.set('subject', fullTitle);
    u.searchParams.set('startdt', formatLocalIso(startDate));
    u.searchParams.set('enddt', formatLocalIso(endDate));
    u.searchParams.set('body', description);
    u.searchParams.set('location', fullLocation);
    return u.toString();
  })();

  // 4. Apple Calendar / iCal / Outlook Desktop (.ics file download)
  function handleDownloadIcs() {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kantorei Choral Ensemble//Concert Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:kantorei-concert-${startDate.getTime()}@kantorei.net`,
      `DTSTAMP:${formatUtcCompact(new Date())}`,
      `DTSTART:${formatUtcCompact(startDate)}`,
      `DTEND:${formatUtcCompact(endDate)}`,
      `SUMMARY:${escapeIcsText(fullTitle)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(fullLocation)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const slug = fullTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    link.setAttribute('download', `${slug}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      setIsOpen(false);
    }, 1500);
  }

  const triggerClasses = {
    pill: 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-gold-400 hover:text-navy-950',
    badge:
      'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-navy-950',
    inline:
      'group inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-500 transition hover:text-navy-950 focus:outline-none focus:ring-1 focus:ring-copper-400 rounded-sm',
    dark: 'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-navy-900/80 px-3 py-1 text-xs font-semibold text-ivory-50 shadow-2xs transition hover:border-gold-400 hover:text-gold-300',
  }[variant];

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`${label} for ${fullTitle}`}
        className={triggerClasses}
      >
        <CalendarPlus
          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
            variant === 'inline'
              ? 'text-copper-600 group-hover:text-copper-700'
              : 'text-gold-500'
          }`}
        />
        <span
          className={
            variant === 'inline'
              ? 'underline decoration-stone-300 underline-offset-4 transition-colors group-hover:decoration-copper-500'
              : ''
          }
        >
          {label}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === 'left'
              ? placement === 'top'
                ? 'left-0 bottom-full mb-1.5 origin-bottom-left'
                : 'left-0 top-full mt-1.5 origin-top-left'
              : placement === 'top'
              ? 'right-0 bottom-full mb-1.5 origin-bottom-right'
              : 'right-0 top-full mt-1.5 origin-top-right'
          } z-50 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Add to Calendar
            </p>
            <p className="line-clamp-1 text-xs font-semibold text-navy-950">
              {fullTitle}
            </p>
          </div>

          <div className="py-1">
            {/* Apple Calendar & iCal Download */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              role="menuitem"
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-zinc-700 transition hover:bg-ivory-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span>Apple Calendar / iCal</span>
              </div>
              {downloaded ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <Check className="h-3 w-3" /> Added
                </span>
              ) : (
                <Download className="h-3 w-3 text-zinc-400" />
              )}
            </button>

            {/* Google Calendar Web */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-ivory-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-red-500 text-xs">G</span>
                <span>Google Calendar</span>
              </div>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>

            {/* Outlook.com Web */}
            <a
              href={outlookLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-ivory-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-blue-600 text-xs">O</span>
                <span>Outlook.com</span>
              </div>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>

            {/* Microsoft 365 Web */}
            <a
              href={office365Url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-ivory-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-blue-500 text-xs">M</span>
                <span>Microsoft 365</span>
              </div>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </div>

          <div className="border-t border-zinc-100 px-3 py-1.5 text-[10px] text-zinc-400">
            Includes venue location &amp; call time
          </div>
        </div>
      )}
    </div>
  );
}

