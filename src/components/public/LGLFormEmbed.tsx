import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import type { GivingTier } from '../../types/choir';

interface Props {
  lglFormUrl: string;
  choirName?: string;
  givingTiers?: GivingTier[];
}

export default function LGLFormEmbed({
  lglFormUrl,
  choirName = 'Kantorei',
  givingTiers = [],
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [iframeHeight, setIframeHeight] = useState<number>(880);

  // Measure container width to handle mobile responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Listen for LGL's cross-domain postMessage height resize events (both iFrameResizer format and plain numeric format)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string' && event.origin.includes('lglforms.com')) {
        const raw = event.data;
        if (raw.startsWith('[iFrameSizer]')) {
          const parts = raw.split(':');
          const h = parseInt(parts[1], 10);
          if (!isNaN(h) && h > 300) {
            setIframeHeight(h + 20);
          }
        } else {
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed > 300) {
            setIframeHeight(parsed + 20);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const cleanUrl =
    (lglFormUrl || '').trim() ||
    'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA';

  // LGL form content has an intrinsic header logo width of ~567px plus padding/margins.
  // On screens narrower than 600px, proportionally scale the iframe so the form
  // fits mobile screens edge-to-edge without horizontal clipping or scrollbars.
  const baseWidth = 600;
  const isMobile = containerWidth > 0 && containerWidth < baseWidth;
  const scale = isMobile ? containerWidth / baseWidth : 1;
  const scaledHeight = isMobile ? Math.round(iframeHeight * scale) : iframeHeight;

  return (
    <div className="space-y-8">
      {/* Outer Card */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
        {/* Sleek Top Bar (Donor-Facing & Minimal) */}
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
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-navy-950 transition"
            title="Open donation form in a separate window"
          >
            <span>Open in new window</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Scaled Responsive Iframe Container */}
        <div ref={containerRef} className="relative w-full overflow-hidden bg-white">
          <div
            style={{
              width: '100%',
              height: `${scaledHeight}px`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Subtle background placeholder (visible only until iframe paints) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-50/50 p-6 text-center -z-10 pointer-events-none">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-950 border-t-transparent" />
              <span className="text-xs font-medium text-stone-500">Loading donation form…</span>
            </div>

            <iframe
              src={cleanUrl}
              title={`Donate to ${choirName}`}
              loading="eager"
              style={{
                width: isMobile ? `${baseWidth}px` : '100%',
                height: `${iframeHeight}px`,
                transform: isMobile ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
                border: 0,
                display: 'block',
                backgroundColor: '#ffffff',
              }}
              allow="payment"
            />
          </div>
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
