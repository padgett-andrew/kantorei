import { useEffect, useState } from 'react';
import { ExternalLink, Lock, Maximize2, ShieldCheck, X } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lock body scroll and close on Escape key when Full Screen modal is active
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isModalOpen]);

  const cleanUrl =
    (lglFormUrl || '').trim() ||
    'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA';

  return (
    <div className="space-y-8">
      {/* ===================================================================
          1. Inline Outer Card (Zero Scroll-Trap, 100% Page Scroll Continuity)
          =================================================================== */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/70 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-3 w-3 text-emerald-700" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Secure Online Donation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-navy-950 hover:text-navy-950 transition"
              title="Expand form to full screen"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Full Screen</span>
            </button>

            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-navy-950 transition"
              title="Open donation form in a separate browser tab"
            >
              <span>New tab</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* 
          Form Viewport:
          - scrolling="no": Disables the iframe's internal scrollbar so mouse wheel & touch gestures
            pass through cleanly to the parent page rather than trapping the user.
          - Sized to fit full form height (1700px on mobile, 1480px on desktop) without clipping.
        */}
        <div className="relative w-full overflow-hidden bg-white">
          <iframe
            src={cleanUrl}
            title={`Donate to ${choirName}`}
            loading="eager"
            {...{ scrolling: 'no' }}
            style={{ overflow: 'hidden' }}
            className="w-full border-0 block bg-white h-[1700px] sm:h-[1550px] lg:h-[1480px]"
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

      {/* ===================================================================
          2. Full-Screen Modal (Dedicated, Trap-Free Checkout Experience)
          =================================================================== */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-donation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative flex h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="h-3 w-3 text-emerald-700" />
                </span>
                <span id="modal-donation-title" className="text-xs font-bold uppercase tracking-wider text-navy-950">
                  Secure Donation &bull; {choirName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-navy-950 transition mr-2"
                  title="Open in a separate browser tab"
                >
                  <span>Open tab</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close donation dialog"
                  className="cursor-pointer rounded-lg p-1.5 text-stone-500 hover:bg-stone-200/70 hover:text-navy-950 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable only inside the dedicated dialog */}
            <div className="flex-1 overflow-y-auto bg-white">
              <iframe
                src={cleanUrl}
                title={`Donate to ${choirName}`}
                className="w-full border-0 block bg-white min-h-[1400px]"
                allow="payment"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/60 px-4 py-2.5 text-xs text-stone-500 sm:px-6">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-stone-400" />
                <span>256-Bit SSL Encrypted &bull; PCI DSS Compliant</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer text-xs font-semibold text-stone-600 hover:text-navy-950"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          3. Annual Giving Circles Directory
          =================================================================== */}
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
