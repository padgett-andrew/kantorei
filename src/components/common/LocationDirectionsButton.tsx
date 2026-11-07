import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { getAppleMapsUrl, getGoogleMapsUrl, isNavigableLocation } from '../../lib/maps';

interface Props {
  location: string;
  venueName?: string;
  label?: string;
  variant?: 'badge' | 'pill' | 'inline' | 'dark';
  align?: 'left' | 'right';
  className?: string;
}

export default function LocationDirectionsButton({
  location,
  venueName,
  label,
  variant = 'badge',
  align = 'left',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isNavigable = isNavigableLocation(location);

  function handleToggle() {
    if (!isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 264;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 220 && spaceAbove > 180) {
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
    setIsOpen((prev) => !prev);
  }

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

  const displayText =
    label ||
    (variant === 'inline'
      ? venueName || location
      : venueName
      ? `${venueName} (${location})`
      : location);

  if (!isNavigable) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-stone-600 ${
          variant === 'inline' ? 'text-sm sm:text-base font-medium' : 'text-xs'
        } ${className}`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-stone-500" />
        <span>{displayText || 'Location TBD'}</span>
      </span>
    );
  }

  const googleMapsUrl = getGoogleMapsUrl(location);
  const appleMapsUrl = getAppleMapsUrl(location);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  // Variant styles
  const isDark = variant === 'dark';
  const isInline = variant === 'inline';

  return (
    <div ref={menuRef} className={`relative inline-flex max-w-full ${isInline ? 'items-start' : 'items-center'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`group inline-flex max-w-full cursor-pointer ${isInline ? 'items-start' : 'items-center'} gap-1.5 transition text-left focus:outline-none focus:ring-1 focus:ring-copper-400 rounded-sm ${
          isDark
            ? 'rounded-sm border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-stone-200 hover:border-copper-300/50 hover:bg-white/10 hover:text-white'
            : variant === 'pill'
            ? 'rounded-sm border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-copper-400 hover:text-navy-950'
            : isInline
            ? 'text-sm sm:text-base font-medium text-stone-700 hover:text-navy-950 py-0.5'
            : 'rounded-sm border border-stone-200/90 bg-white/70 px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-navy-950 hover:bg-white hover:text-navy-950'
        }`}
        title="Get directions via Google Maps or Apple Maps"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MapPin
          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
            isDark
              ? 'text-copper-300'
              : isInline
              ? 'h-4 w-4 text-copper-600 group-hover:text-copper-700 mt-0.5'
              : 'text-copper-600 group-hover:text-copper-700'
          }`}
        />
        <span
          className={
            isInline
              ? 'underline decoration-stone-300 underline-offset-4 transition-colors group-hover:decoration-copper-600 group-hover:text-navy-950 font-normal leading-snug break-words'
              : 'truncate max-w-[240px] sm:max-w-xs'
          }
        >
          {displayText}
        </span>
        {!isInline && (
          <Navigation
            className={`h-3 w-3 shrink-0 transition-transform ${
              isOpen ? 'rotate-90' : ''
            } ${isDark ? 'text-stone-400' : 'text-stone-400'}`}
          />
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="menu"
          style={menuStyle}
          className={`absolute ${
            placement === 'top'
              ? 'bottom-full mb-1.5 origin-bottom'
              : 'top-full mt-1.5 origin-top'
          } z-50 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-sm border border-stone-200 bg-[#FAF7F2] p-1.5 shadow-xl shadow-navy-950/10 animate-in fade-in-50 zoom-in-95`}
        >
          <div className="border-b border-stone-200/80 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-copper-600">
              Directions
            </span>
            <p className="mt-0.5 truncate font-editorial text-base font-semibold text-navy-950">
              {venueName || location}
            </p>
          </div>

          <div className="divide-y divide-stone-200/60 p-1">
            {/* Google Maps Option */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-[#f5efe8] hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Navigation className="h-3.5 w-3.5 text-copper-600" />
                <span>Google Maps</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>

            {/* Apple Maps Option */}
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-[#f5efe8] hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                <Navigation className="h-3.5 w-3.5 text-copper-600" />
                <span>Apple Maps</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>

            {/* Copy Address Option */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-[#f5efe8] hover:text-navy-950"
            >
              <div className="flex items-center gap-2.5">
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-copper-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-copper-600" />
                )}
                <span>{copied ? 'Address Copied' : 'Copy Address'}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

