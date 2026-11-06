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
  iconOnly?: boolean;
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
  iconOnly = false,
  align = 'right',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [downloaded, setDownloaded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function handleToggle() {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 264; // w-64 is 256px + borders/padding

      // Vertical placement
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 270 && spaceAbove > 220) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }

      // Horizontal placement: dynamically ensure the menu NEVER overflows the viewport on mobile
      const style: React.CSSProperties = {};

      if (
        viewportWidth < 340 ||
        (rect.left + menuWidth > viewportWidth - 12 && rect.right - menuWidth < 12)
      ) {
        // Center relative to viewport on tiny screens
        const targetScreenLeft = Math.max(
          12,
          Math.floor((viewportWidth - Math.min(menuWidth, viewportWidth - 24)) / 2)
        );
        style.left = `${targetScreenLeft - rect.left}px`;
      } else if (align === 'right' || rect.left + menuWidth > viewportWidth - 12) {
        if (rect.right - menuWidth >= 12) {
          style.right = 0;
        } else {
          const offset = 12 - (rect.right - menuWidth);
          style.right = `-${offset}px`;
        }
      } else {
        if (rect.left >= 12) {
          style.left = 0;
        } else {
          style.left = `${12 - rect.left}px`;
        }
      }

      setMenuStyle(style);
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
    pill: 'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-stone-700 shadow-2xs transition hover:border-gold-400 hover:text-navy-950',
    badge:
      'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs sm:text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-navy-950',
    inline:
      'group inline-flex max-w-full cursor-pointer items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 transition hover:text-navy-950 focus:outline-none focus:ring-1 focus:ring-copper-400 rounded-md py-0.5 px-1 -mx-1',
    dark: 'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-navy-900/80 px-3 py-1 text-xs sm:text-sm font-semibold text-ivory-50 shadow-2xs transition hover:border-gold-400 hover:text-gold-300',
  }[variant];

  return (
    <div ref={menuRef} className={`relative inline-block max-w-full text-left ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Add to calendar: ${fullTitle}`}
        title="Add to calendar"
        className={
          iconOnly
            ? 'group inline-flex cursor-pointer items-center justify-center rounded-lg border border-stone-200/90 bg-white p-2 text-stone-600 shadow-2xs transition hover:border-copper-400 hover:bg-stone-50 hover:text-copper-600 focus:outline-none focus:ring-2 focus:ring-copper-400/40 min-h-[36px] min-w-[36px]'
            : triggerClasses
        }
      >
        {downloaded ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <CalendarPlus
            className={`h-4 w-4 shrink-0 transition-colors ${
              variant === 'inline' || iconOnly
                ? 'text-copper-600 group-hover:text-copper-700'
                : 'text-gold-500'
            }`}
          />
        )}
        {!iconOnly && (
          <span
            className={
              variant === 'inline'
                ? 'underline decoration-stone-300 underline-offset-4 transition-colors group-hover:decoration-copper-500 font-medium'
                : ''
            }
          >
            {label}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          style={menuStyle}
          className={`absolute ${
            placement === 'top'
              ? 'bottom-full mb-1.5 origin-bottom'
              : 'top-full mt-1.5 origin-top'
          } z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Add to Calendar
            </p>
            <p className="line-clamp-1 text-sm font-semibold text-navy-950">
              {fullTitle}
            </p>
          </div>

          <div className="py-1 space-y-1">
            {/* Apple Calendar & iCal Download */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              role="menuitem"
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-800 transition hover:bg-stone-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-stone-500" />
                <span>Apple Calendar / iCal</span>
              </div>
              {downloaded ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Added
                </span>
              ) : (
                <Download className="h-4 w-4 text-stone-400" />
              )}
            </button>

            {/* Google Calendar Web */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Google Calendar</span>
              </div>
              <ExternalLink className="h-4 w-4 text-stone-400" />
            </a>

            {/* Outlook.com Web */}
            <a
              href={outlookLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Outlook.com</span>
              </div>
              <ExternalLink className="h-4 w-4 text-stone-400" />
            </a>

            {/* Microsoft 365 Web */}
            <a
              href={office365Url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-sky-600" />
                <span>Microsoft 365</span>
              </div>
              <ExternalLink className="h-4 w-4 text-stone-400" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

