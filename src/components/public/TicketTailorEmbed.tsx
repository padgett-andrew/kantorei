import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ExternalLink,
  Heart,
  Info,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import type { ConcertPerformance } from '../../types/choir';
import type { ResolvedTicketTailorEntry } from '../../lib/tickettailor';
import { buildCleanLocationQuery } from '../../lib/maps';
import AddToCalendarButton from '../common/AddToCalendarButton';
import LocationDirectionsButton from '../common/LocationDirectionsButton';
import TicketTailorDemoModal from './TicketTailorDemoModal';

interface Props {
  mode: 'season-pass' | 'concert';
  resolvedEntries?: ResolvedTicketTailorEntry[];
  concertTitle?: string;
  datesDisplay?: string;
  venueName?: string;
  venueAddress?: string;
  boxOfficeNote?: string;
  performances?: ConcertPerformance[];
  concertDescription?: string;
}

export default function TicketTailorEmbed({
  mode,
  resolvedEntries = [],
  concertTitle = 'Concert Program',
  datesDisplay = 'Sat (7:30 PM) & Sun (3:00 PM)',
  venueName,
  venueAddress,
  boxOfficeNote,
  performances,
  concertDescription,
}: Props) {
  const isDemo = resolvedEntries.length === 0;

  // Active modal state: null when closed, or index of the performance being viewed
  const [activeModalIdx, setActiveModalIdx] = useState<number | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sandbox Season Pass State
  const [passTierQty, setPassTierQty] = useState(1);
  const [addOnDonation, setAddOnDonation] = useState<number>(0);
  const [completedOrder, setCompletedOrder] = useState<string | null>(null);

  // Lock body scroll and handle ESC key when modal is open
  useEffect(() => {
    if (activeModalIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalIdx(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeModalIdx]);

  // Construct normalized performance list
  const performancesList: ConcertPerformance[] =
    performances && performances.length > 0
      ? performances
      : datesDisplay.includes('&')
        ? datesDisplay.split('&').map((d) => ({
            dateDisplay: d.trim(),
            venueName: venueName || '',
            venueAddress: venueAddress || '',
          }))
        : [
            {
              dateDisplay: datesDisplay,
              venueName: venueName || '',
              venueAddress: venueAddress || '',
            },
          ];

  // =========================================================================
  // 1. Season Pass Standalone Mode (Sandbox Preview)
  // =========================================================================
  if (mode === 'season-pass') {
    const passSubtotal = passTierQty * 65 + addOnDonation;
    return (
      <div className="rounded-2xl border border-gold-400/50 bg-white p-6 text-zinc-900 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
              Ticket Tailor Flex-Pass Box Office (Sandbox Preview)
            </span>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
            50% Nonprofit Fee Discount Active
          </span>
        </div>

        {completedOrder ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Season Pass Issued!
            </div>
            <p className="mt-1.5 text-sm text-emerald-800">
              Your personal Pass Code is{' '}
              <code className="rounded bg-white px-2 py-0.5 font-mono font-bold text-navy-950 border border-emerald-200">
                {completedOrder}
              </code>
              . Copy it and try unlocking a <strong>$0.00 Season Pass VIP</strong> seat on any concert card below!
            </p>
            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              className="mt-3 cursor-pointer text-xs font-semibold text-emerald-900 underline"
            >
              Reset preview
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-ivory-50 px-4 py-3.5">
              <div>
                <p className="font-semibold text-navy-950">
                  2026–2027 All-Season Flex Pass (3 Concerts)
                </p>
                <p className="text-xs text-zinc-600">
                  Includes 1 reserved VIP admission per concert cycle + priority sanctuary seating
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-navy-950">$65</span>
                <select
                  aria-label="Season Pass Quantity"
                  value={passTierQty}
                  onChange={(e) => setPassTierQty(Number(e.target.value))}
                  className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-semibold"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                <Heart className="h-3.5 w-3.5 text-rose-600" />
                Add a tax-deductible season gift:
              </span>
              <div className="flex gap-1.5">
                {[0, 15, 35, 75].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddOnDonation(amt)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      addOnDonation === amt
                        ? 'bg-navy-900 text-white'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {amt === 0 ? 'None' : `+$${amt}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompletedOrder('KANTOREI-VIP-2026')}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              <Ticket className="h-4 w-4 text-gold-400" />
              Purchase Flex Season Pass — ${passSubtotal.toFixed(2)} (Demo)
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. Active Entry for Modal
  // =========================================================================
  const activeEntry =
    activeModalIdx !== null
      ? resolvedEntries[activeModalIdx] || resolvedEntries[0]
      : null;
  const activePerf =
    activeModalIdx !== null ? performancesList[activeModalIdx] : null;

  // =========================================================================
  // 3. Pattern A: Unified Performance Cards
  // =========================================================================
  return (
    <div className="space-y-3.5">
      {performancesList.map((perf, idx) => {
          const entry = resolvedEntries[idx] || resolvedEntries[0];
          const isExternal = Boolean(entry?.isExternal);
          const isFree = Boolean(
            entry?.isFree ||
              /free|open seating|goodwill|admission/i.test(entry?.label || '')
          );
          const providerName =
            entry?.externalProvider ||
            (() => {
              try {
                return entry?.publicUrl
                  ? new URL(entry.publicUrl).hostname.replace(/^www\./, '')
                  : 'Partner Box Office';
              } catch {
                return 'Partner Box Office';
              }
            })();

          const cleanLoc = buildCleanLocationQuery(
            perf.venueName,
            perf.venueAddress
          );

          return (
            <div
              key={`${perf.dateDisplay}-${idx}`}
              className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 sm:p-5 transition hover:border-stone-300 hover:bg-stone-50/80 shadow-2xs"
            >
              {/* Header: Full-width Date, Calendar Button & Free Admission Badge */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-navy-950 leading-snug">
                  {perf.dateDisplay}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {isFree && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                      <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                      Free Admission
                    </span>
                  )}
                  <AddToCalendarButton
                    title={concertTitle}
                    description={concertDescription}
                    dateStr={perf.dateDisplay}
                    location={cleanLoc}
                    venueName={perf.venueName}
                    venueAddress={perf.venueAddress}
                    iconOnly={true}
                    align="right"
                  />
                </div>
              </div>

              {perf.venueName && (
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {perf.venueName}
                  {perf.venueAddress && (
                    <span className="text-stone-500 font-normal">
                      {' '}
                      · {perf.venueAddress}
                    </span>
                  )}
                </p>
              )}

              {cleanLoc && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <LocationDirectionsButton
                    location={cleanLoc}
                    venueName={perf.venueName}
                    variant="inline"
                  />
                </div>
              )}

              {/* Informational Sub-Cards for Free or Partner Concerts */}
              {isFree && (
                <div className="mt-3.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3 text-sm leading-relaxed text-emerald-950">
                  <strong className="font-semibold text-emerald-900">
                    Open Seating · No Advance Ticket Required.
                  </strong>{' '}
                  Doors open 30 minutes prior to concert time. Goodwill offerings
                  supporting Kantorei&apos;s artistic and community programs are
                  gratefully accepted at the door.
                </div>
              )}

              {isExternal && (
                <div className="mt-3.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-sm leading-relaxed text-amber-950">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-amber-950">
                        Tickets Managed by {providerName}.
                      </strong>{' '}
                      {boxOfficeNote || (
                        <span>
                          Kantorei is performing as a featured guest ensemble.
                          All ticket purchases, seating, and box office policies
                          are administered directly by {providerName}.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Action Footer for Ticket Tailor & Partner Presenters */}
              {!isFree && (
                <div className="mt-4 pt-3.5 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-3">
                  {isExternal ? (
                    <a
                      href={entry?.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xs transition active:scale-[0.99]"
                    >
                      Tickets via {providerName}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalIdx(idx);
                        setIframeLoading(true);
                      }}
                      className="cursor-pointer inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xs transition active:scale-[0.99]"
                    >
                      <Ticket className="h-4 w-4" />
                      Select Tickets
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {/* =====================================================================
          4. High-Breathability Mobile & Desktop Checkout Modal Sheet
          ===================================================================== */}
      {mounted && activeModalIdx !== null && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center sm:items-center bg-navy-950/80 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Tickets for ${concertTitle}`}
        >
          {/* Backdrop click dismiss */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setActiveModalIdx(null)}
          />

          {/* Modal Container: Full-width on mobile, centered card on desktop */}
          <div className="relative flex flex-col w-full h-[94vh] sm:h-[88vh] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 sm:px-6 sm:py-3.5 bg-stone-50/90 shrink-0">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold uppercase tracking-wider text-copper-600 truncate">
                  {concertTitle}
                </p>
                <h4 className="text-sm sm:text-base font-bold text-navy-950 truncate">
                  {activePerf?.dateDisplay}
                  {activePerf?.venueName ? ` · ${activePerf.venueName}` : ''}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeEntry?.publicUrl && (
                  <a
                    href={activeEntry.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-navy-950 px-2 py-1 rounded-md hover:bg-stone-200/50 transition"
                    title="Open box office in new tab"
                  >
                    <span className="hidden sm:inline">New Tab</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModalIdx(null)}
                  className="cursor-pointer rounded-full p-1.5 text-stone-500 hover:bg-stone-200 hover:text-navy-950 transition"
                  aria-label="Close ticket checkout"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe or Demo Preview */}
            <div className="relative flex-1 w-full bg-stone-50 overflow-y-auto">
              {!isDemo && activeEntry?.widgetUrl ? (
                <>
                  {iframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 text-stone-500">
                      <div className="h-8 w-8 animate-spin rounded-full border-3 border-stone-200 border-t-copper-500" />
                      <span className="mt-3 text-sm font-medium">
                        Connecting to secure Ticket Tailor box office…
                      </span>
                    </div>
                  )}

                  <iframe
                    src={activeEntry.widgetUrl}
                    title={`Tickets for ${concertTitle}`}
                    onLoad={() => setIframeLoading(false)}
                    className="w-full h-full border-0 min-h-[500px]"
                    allow="payment; fullscreen"
                  />
                </>
              ) : (
                /* Sandbox Demo Checkout Preview inside Modal */
                <TicketTailorDemoModal />
              )}
            </div>

            {/* Modal Footer reassurance */}
            <div className="flex items-center justify-between border-t border-stone-200/80 bg-white px-4 py-2.5 sm:px-6 text-xs text-stone-600 shrink-0">
              <span>🔒 256-bit SSL Secure Checkout</span>
              <button
                type="button"
                onClick={() => setActiveModalIdx(null)}
                className="text-xs sm:text-sm font-semibold text-stone-600 hover:text-navy-950 underline cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
