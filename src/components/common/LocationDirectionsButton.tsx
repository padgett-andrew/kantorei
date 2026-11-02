import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { getAppleMapsUrl, getGoogleMapsUrl, isNavigableLocation } from '../../lib/maps';

interface Props {
  location: string;
  venueName?: string;
  label?: string;
  variant?: 'badge' | 'pill' | 'inline' | 'dark';
  className?: string;
}

export default function LocationDirectionsButton({
  location,
  venueName,
  label,
  variant = 'badge',
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isNavigable = isNavigableLocation(location);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isNavigable) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-zinc-500 ${className}`}>
        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
        <span>{location || 'Location TBD'}</span>
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

  const displayText = label || (venueName ? `${venueName} (${location})` : location);

  // Variant styles
  const isDark = variant === 'dark';

  return (
    <div ref={menuRef} className={`relative inline-flex items-center ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-xl transition ${
          isDark
            ? 'border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-ivory-50 hover:bg-white/20'
            : variant === 'pill'
            ? 'rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:border-gold-400 hover:text-navy-950'
            : 'border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-navy-900 hover:bg-white hover:text-navy-950'
        }`}
        title="Get directions via Google Maps or Apple Maps"
        aria-expanded={isOpen}
      >
        <MapPin
          className={`h-3.5 w-3.5 shrink-0 ${
            isDark ? 'text-gold-300' : 'text-gold-600 group-hover:text-gold-500'
          }`}
        />
        <span className="truncate max-w-[220px] sm:max-w-xs">{displayText}</span>
        <Navigation
          className={`h-3 w-3 shrink-0 transition-transform ${
            isOpen ? 'rotate-90' : ''
          } ${isDark ? 'text-zinc-300' : 'text-zinc-400'}`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          <div className="border-b border-zinc-100 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Get Directions
            </span>
            <p className="truncate text-xs font-semibold text-navy-950">{location}</p>
          </div>

          <div className="p-1 space-y-1">
            {/* Google Maps Option */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Navigation className="h-3.5 w-3.5" />
                </span>
                <span>Google Maps</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>

            {/* Apple Maps Option */}
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <Navigation className="h-3.5 w-3.5" />
                </span>
                <span>Apple Maps</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>

            {/* Copy Address Option */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-navy-950"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </span>
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Location'}</span>
              </div>
              {copied && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

