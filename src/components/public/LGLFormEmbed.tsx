import { useState, useEffect } from 'react';
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import type { GivingTier } from '../../types/choir';

interface Props {
  lglFormUrl: string;
  siteOrigin?: string;
  choirName?: string;
  givingTiers?: GivingTier[];
}

function parseLGLHeightMessage(data: unknown): number | null {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return data;
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }
    if (trimmed.startsWith('[iFrameSizer]')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const parsed = parseInt(parts[1], 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
  }
  return null;
}

function buildEmbedUrl(baseUrl: string, origin: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  if (!origin || trimmed.includes('origin=')) return trimmed;
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}origin=${encodeURIComponent(origin)}`;
}

export default function LGLFormEmbed({
  lglFormUrl,
  siteOrigin = '',
  choirName = 'Kantorei',
  givingTiers = [],
}: Props) {
  const rawBaseUrl =
    (lglFormUrl || '').trim() ||
    'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA';

  const [currentOrigin, setCurrentOrigin] = useState<string>(siteOrigin);
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);

  // Sync client origin if not provided during SSR
  useEffect(() => {
    if (!currentOrigin && typeof window !== 'undefined' && window.location.origin) {
      setCurrentOrigin(window.location.origin);
    }
  }, [currentOrigin]);

  // Listen for LGL postMessage containing exact rendered scrollHeight
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin: accept messages from secure.lglforms.com or any lglforms.com domain
      const eventOrigin = event.origin || '';
      const isLglOrigin =
        eventOrigin === 'https://secure.lglforms.com' ||
        eventOrigin.endsWith('.lglforms.com');

      if (!isLglOrigin) return;

      const reportedHeight = parseLGLHeightMessage(event.data);
      if (reportedHeight !== null && reportedHeight >= 600 && reportedHeight <= 3500) {
        // Add 16px buffer so bottom inputs/buttons have comfortable breathing room
        const targetHeight = reportedHeight + 16;
        setIframeHeight((prev) => {
          // Guard against micro-jitter: only update if delta > 8px
          if (!prev || Math.abs(prev - targetHeight) > 8) {
            return targetHeight;
          }
          return prev;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const iframeSrc = buildEmbedUrl(rawBaseUrl, currentOrigin);

  return (
    <div className="space-y-8">
      {/* Outer Card */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/70 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-3 w-3 text-emerald-700" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Secure Online Donation
            </span>
          </div>

          <a
            href={rawBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-navy-950 transition"
            title="Open donation form in a separate window"
          >
            <span>Open in new window</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* 
          Form Viewport:
          - Dynamic height driven by LGL postMessage (XD.postMessage + iFrameResizer)
          - Safe static baseline (1240px desktop, 1280px tablet, 1340px mobile) ensures Address Line 2,
            City, State, Zip, Country, and the Submit button are never cut off even before postMessage arrives
          - scrolling="no" + overflow: hidden: Disables internal iframe scrollbars so page scrolling stays smooth and trap-free
        */}
        <div className="relative w-full overflow-hidden bg-white">
          <iframe
            src={iframeSrc}
            title={`Donate to ${choirName}`}
            loading="eager"
            {...{ scrolling: 'no' }}
            style={{
              overflow: 'hidden',
              height: iframeHeight ? `${iframeHeight}px` : undefined,
            }}
            className={clsx(
              'w-full border-0 block bg-white transition-[height] duration-200 ease-out',
              !iframeHeight && 'h-[1340px] sm:h-[1280px] lg:h-[1240px]'
            )}
            allow="payment"
          />
        </div>

        {/* Discreet Trust Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/40 px-4 py-2.5 text-xs text-stone-500 sm:px-6">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-stone-400" />
            <span>256-Bit SSL Encrypted &bull; PCI DSS Compliant</span>
          </div>
          <span>501(c)(3) Tax-Deductible</span>
        </div>
      </div>

      {/* Annual Giving Circles Directory */}
      {givingTiers.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-navy-950">
                Annual Giving Circles
              </h2>
              <p className="mt-0.5 text-sm text-stone-600">
                Choose a circle to support {choirName}’s artistic leadership and community reach.
              </p>
            </div>
            <span className="hidden sm:inline-block rounded-full bg-gold-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-900">
              Tax-Deductible
            </span>
          </div>

          <ul className="mt-4 divide-y divide-stone-100">
            {givingTiers.map((tier) => (
              <li
                key={tier.name}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mx-3 rounded-xl px-3 py-4 transition hover:bg-stone-50/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-serif font-bold text-navy-950 text-base sm:text-lg">
                      {tier.name}
                    </span>
                    <span className="rounded-full border border-copper-200/60 bg-copper-50 px-2 py-0.5 text-xs font-semibold text-copper-600">
                      {tier.range}
                    </span>
                  </div>
                  <p className="mt-1 text-sm sm:text-base leading-relaxed text-stone-700">
                    {tier.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
