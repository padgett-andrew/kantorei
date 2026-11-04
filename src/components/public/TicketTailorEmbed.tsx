import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Heart,
  Info,
  KeyRound,
  Sparkles,
  Ticket,
} from 'lucide-react';
import type { ResolvedTicketTailorEntry } from '../../lib/tickettailor';

interface Props {
  mode: 'season-pass' | 'concert';
  resolvedEntries?: ResolvedTicketTailorEntry[];
  concertTitle?: string;
  datesDisplay?: string;
  venueName?: string;
  boxOfficeNote?: string;
}

export default function TicketTailorEmbed({
  mode,
  resolvedEntries = [],
  concertTitle = 'Concert Program',
  datesDisplay = 'Sat (7:30 PM) & Sun (3:00 PM)',
  venueName,
  boxOfficeNote,
}: Props) {
  const containersRef = useRef<(HTMLDivElement | null)[]>([]);
  const initializedIndicesRef = useRef<Set<number>>(new Set());

  const performanceOptions = datesDisplay.includes('&')
    ? datesDisplay.split('&').map((s) => s.trim())
    : ['Saturday Performance', 'Sunday Performance'];

  const [selectedPerf, setSelectedPerf] = useState(0);

  const isDemo = resolvedEntries.length === 0;
  const activeLiveEntry =
    resolvedEntries[Math.min(selectedPerf, Math.max(0, resolvedEntries.length - 1))];

  const prevUrlsKey = resolvedEntries.map((e) => e.widgetUrl).join('|');
  const lastUrlsKeyRef = useRef(prevUrlsKey);
  if (lastUrlsKeyRef.current !== prevUrlsKey) {
    lastUrlsKeyRef.current = prevUrlsKey;
    initializedIndicesRef.current.clear();
  }

  const [showPassInput, setShowPassInput] = useState(false);
  const [passCode, setPassCode] = useState('');
  const [passUnlocked, setPassUnlocked] = useState(false);
  const [gaQty, setGaQty] = useState(mode === 'concert' ? 1 : 0);
  const [vipQty, setVipQty] = useState(0);
  const [passTierQty, setPassTierQty] = useState(1);
  const [addOnDonation, setAddOnDonation] = useState<number>(0);
  const [completedOrder, setCompletedOrder] = useState<string | null>(null);

  const handleSelectPerf = (idx: number) => {
    setSelectedPerf(idx);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  };

  useEffect(() => {
    if (isDemo || resolvedEntries.length === 0) return;

    const initWidget = (idx: number) => {
      const entry = resolvedEntries[idx];
      if (!entry?.widgetUrl || entry.isExternal || entry.isFree) return;
      if (initializedIndicesRef.current.has(idx)) return;

      const container = containersRef.current[idx];
      if (!container) return;

      initializedIndicesRef.current.add(idx);
      container.innerHTML = '';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tt-widget';

      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'tt-widget-fallback py-10 text-center';
      const link = document.createElement('a');
      link.href = entry.publicUrl || entry.widgetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'text-xs font-medium text-zinc-500 hover:text-navy-950 underline';
      link.textContent = 'Loading Ticket Tailor box office…';
      fallbackDiv.appendChild(link);
      widgetDiv.appendChild(fallbackDiv);

      const script = document.createElement('script');
      script.src = 'https://cdn.tickettailor.com/js/widgets/min/widget.js';
      script.setAttribute('data-url', entry.widgetUrl);
      script.setAttribute('data-type', 'inline');
      script.setAttribute('data-inline-minimal', 'true');
      script.setAttribute('data-inline-show-logo', 'false');
      script.setAttribute('data-inline-bg-fill', 'false');
      script.async = true;

      widgetDiv.appendChild(script);
      container.appendChild(widgetDiv);
    };

    // 1. Immediately initialize the currently selected day
    initWidget(selectedPerf);

    // 2. Pre-load remaining performance days in the background so day switching is instant
    const timer = setTimeout(() => {
      resolvedEntries.forEach((_, idx) => {
        if (idx !== selectedPerf) {
          initWidget(idx);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [isDemo, resolvedEntries, selectedPerf]);

  if (!isDemo && activeLiveEntry?.isFree) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-emerald-300/80 bg-emerald-50/50 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
            Free Admission
          </span>
          <span className="text-xs sm:text-sm font-semibold text-emerald-900">
            No Advance Ticket Required
          </span>
        </div>

        <h3 className="mt-4 font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
          Open Seating · Goodwill Offering
        </h3>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-stone-700">
          This performance is free and open to the public. Advance reservations are not needed—doors open 30 minutes prior to concert time. Goodwill offerings supporting Kantorei’s artistic and community programs are gratefully accepted at the door.
        </p>

        {resolvedEntries.length > 1 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {resolvedEntries.map((entry, idx) => (
              <button
                key={entry.label || idx}
                type="button"
                onClick={() => handleSelectPerf(idx)}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition ${
                  selectedPerf === idx
                    ? 'border-emerald-800 bg-emerald-800 text-white shadow-2xs'
                    : 'border-emerald-200 bg-white text-emerald-950 hover:border-emerald-700'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!isDemo && activeLiveEntry?.isExternal) {
    const providerName =
      activeLiveEntry.externalProvider ||
      (() => {
        try {
          return new URL(activeLiveEntry.publicUrl).hostname.replace(/^www\./, '');
        } catch {
          return venueName || 'Partner Box Office';
        }
      })();

    let displayDomain = '';
    try {
      displayDomain = new URL(activeLiveEntry.publicUrl).hostname.replace(/^www\./, '');
    } catch {
      displayDomain = 'partner box office';
    }

    const isFree = Boolean(
      activeLiveEntry.isFree ||
      /free|rsvp|admission/i.test(activeLiveEntry.label || '')
    );
    const actionVerb = isFree ? 'Reserve Tickets' : 'Purchase Tickets';
    const buttonText = `${actionVerb} via ${providerName}`;

    return (
      <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs">
        {resolvedEntries.length > 1 && (
          <div className="mb-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Select Performance:
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {resolvedEntries.map((entry, idx) => (
                <button
                  key={entry.publicUrl || idx}
                  type="button"
                  onClick={() => handleSelectPerf(idx)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition ${
                    selectedPerf === idx
                      ? 'border-navy-900 bg-navy-900 text-white shadow-2xs'
                      : 'border-stone-300 bg-stone-50 text-stone-800 hover:border-navy-900'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="text-xs sm:text-sm leading-relaxed text-amber-950">
              <strong className="font-semibold text-amber-950">
                {isFree ? 'Registration' : 'Tickets'} Managed by {providerName}
              </strong>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-amber-900">
                {boxOfficeNote || (
                  <>
                    Kantorei is performing as a featured guest ensemble for this concert. All{' '}
                    {isFree
                      ? 'reservations, seating, and admission policies'
                      : 'ticket sales, seat selections, subscriber discounts, and box office policies'}{' '}
                    are administered directly by {providerName}.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <a
            href={activeLiveEntry.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-copper-500 px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-copper-600"
          >
            {buttonText}
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-2 text-center text-xs text-stone-600">
            Secure checkout opens in a new tab on <span className="font-mono font-medium">{displayDomain}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!isDemo && activeLiveEntry) {
    return (
      <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
            {resolvedEntries.length > 1 ? '1. Choose Performance & Venue' : 'Select Tickets'}
          </span>
          <a
            href={activeLiveEntry.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-copper-600 hover:text-navy-950"
          >
            Open Box Office in New Tab
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {resolvedEntries.length > 1 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {resolvedEntries.map((entry, idx) => (
              <button
                key={entry.widgetUrl || idx}
                type="button"
                onClick={() => handleSelectPerf(idx)}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition ${
                  selectedPerf === idx
                    ? 'border-navy-900 bg-navy-900 text-white shadow-2xs'
                    : 'border-stone-300 bg-stone-50 text-stone-800 hover:border-navy-900'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative min-h-[300px]">
          {resolvedEntries.map((entry, idx) => {
            const isSelected = selectedPerf === idx;
            return (
              <div
                key={entry.widgetUrl || idx}
                ref={(el) => {
                  containersRef.current[idx] = el;
                }}
                className={
                  isSelected
                    ? 'block w-full transition-opacity duration-150'
                    : 'pointer-events-none absolute inset-0 -z-10 opacity-0 overflow-hidden'
                }
                aria-hidden={!isSelected}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Sandbox Interactive Season Pass Purchase Widget
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

  // Sandbox Interactive Individual Concert Checkout Card
  const totalAmount = gaQty * 25 + addOnDonation;
  const totalTickets = gaQty + vipQty;

  function unlockPass(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passCode.trim()) return;
    setPassUnlocked(true);
    setVipQty(1);
    setGaQty(0);
  }

  return (
    <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
          Interactive Box Office Preview
        </span>
        <button
          type="button"
          onClick={() => setShowPassInput((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs sm:text-sm font-semibold text-navy-900 underline decoration-copper-500 underline-offset-4"
        >
          <KeyRound className="h-3.5 w-3.5 text-copper-600" />
          {passUnlocked ? 'Season Pass Code Applied ✓' : 'Have a Season Pass? Enter Pass Code'}
        </button>
      </div>

      {completedOrder ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Reservation Confirmed for {concertTitle}!
          </div>
          <p className="mt-1 text-sm text-emerald-800">
            Performance: <strong>{performanceOptions[selectedPerf]}</strong> · {completedOrder}
          </p>
          <button
            type="button"
            onClick={() => setCompletedOrder(null)}
            className="mt-2.5 cursor-pointer text-xs sm:text-sm font-semibold underline"
          >
            Modify demo order
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Step A: Pick Performance Night (Capacity Management) */}
          <div>
            <span className="block text-xs sm:text-sm font-semibold text-stone-700">
              1. Choose Performance Night:
            </span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {performanceOptions.map((perf, idx) => (
                <button
                  key={perf}
                  type="button"
                  onClick={() => setSelectedPerf(idx)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left text-xs sm:text-sm font-semibold transition ${
                    selectedPerf === idx
                      ? 'border-navy-900 bg-navy-900 text-white shadow-2xs'
                      : 'border-stone-300 bg-stone-50 text-stone-800 hover:border-zinc-400'
                  }`}
                >
                  {perf}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Pass Code Unlock Box */}
          {showPassInput && !passUnlocked && (
            <form
              onSubmit={unlockPass}
              className="flex flex-col gap-2 rounded-xl border border-copper-400/80 bg-amber-50/70 p-3 sm:flex-row"
            >
              <input
                type="text"
                placeholder="Enter Pass Code (try KANTOREI-VIP-2026)"
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm uppercase"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-navy-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white"
              >
                Unlock $0.00 VIP Seat
              </button>
            </form>
          )}

          {/* Ticket Tiers */}
          <div className="space-y-2.5">
            {passUnlocked && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 px-4 py-3">
                <div>
                  <span className="text-sm font-bold text-emerald-950">
                    Season Pass Holder VIP ($0.00)
                  </span>
                  <span className="block text-xs text-emerald-800">
                    0% Ticket Tailor fee on $0 pass redemptions
                  </span>
                </div>
                <select
                  aria-label="Season Pass VIP Quantity"
                  value={vipQty}
                  onChange={(e) => setVipQty(Number(e.target.value))}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold"
                >
                  {[0, 1, 2].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-stone-900">
                  General Admission ($25.00)
                </span>
                <span className="block text-xs text-stone-600">
                  Open sanctuary seating
                </span>
              </div>
              <select
                aria-label="General Admission Quantity"
                value={gaQty}
                onChange={(e) => setGaQty(Number(e.target.value))}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Native In-Cart Tax-Deductible Add-on Donation */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-700">
              <Heart className="h-3.5 w-3.5 text-rose-600" />
              Add a tax-deductible donation:
            </span>
            <div className="flex gap-1.5">
              {[0, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAddOnDonation(amt)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition ${
                    addOnDonation === amt
                      ? 'bg-navy-900 text-white'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {amt === 0 ? 'None' : `+$${amt}`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={totalTickets === 0 && addOnDonation === 0}
            onClick={() =>
              setCompletedOrder(
                `${totalTickets} ticket(s) — Total charged: $${totalAmount.toFixed(2)}`
              )
            }
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            <Ticket className="h-4 w-4 text-gold-400" />
            {totalAmount === 0 && vipQty > 0
              ? 'Reserve $0.00 Pass Holder Seat (Demo)'
              : `Checkout — $${totalAmount.toFixed(2)} (Demo)`}
          </button>
        </div>
      )}
    </div>
  );
}
