import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Heart, KeyRound, Sparkles, Ticket } from 'lucide-react';
import type { ResolvedTicketTailorEntry } from '../../lib/tickettailor';

interface Props {
  mode: 'season-pass' | 'concert';
  resolvedEntries?: ResolvedTicketTailorEntry[];
  concertTitle?: string;
  datesDisplay?: string;
}

export default function TicketTailorEmbed({
  mode,
  resolvedEntries = [],
  concertTitle = 'Concert Program',
  datesDisplay = 'Sat (7:30 PM) & Sun (3:00 PM)',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const performanceOptions = datesDisplay.includes('&')
    ? datesDisplay.split('&').map((s) => s.trim())
    : ['Saturday Performance', 'Sunday Performance'];

  const [selectedPerf, setSelectedPerf] = useState(0);

  const isDemo = resolvedEntries.length === 0;
  const activeLiveEntry =
    resolvedEntries[Math.min(selectedPerf, Math.max(0, resolvedEntries.length - 1))];
  const resolvedUrl = activeLiveEntry?.widgetUrl || '';

  const [showPassInput, setShowPassInput] = useState(false);
  const [passCode, setPassCode] = useState('');
  const [passUnlocked, setPassUnlocked] = useState(false);
  const [gaQty, setGaQty] = useState(mode === 'concert' ? 1 : 0);
  const [vipQty, setVipQty] = useState(0);
  const [passTierQty, setPassTierQty] = useState(1);
  const [addOnDonation, setAddOnDonation] = useState<number>(0);
  const [completedOrder, setCompletedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo || !containerRef.current || !resolvedUrl) return;
    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tt-widget';

    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'tt-widget-fallback';
    const link = document.createElement('a');
    link.href = activeLiveEntry?.publicUrl || resolvedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'text-xs font-medium text-zinc-500 underline';
    link.textContent = 'Loading Ticket Tailor box office…';
    fallbackDiv.appendChild(link);
    widgetDiv.appendChild(fallbackDiv);

    const script = document.createElement('script');
    script.src = 'https://cdn.tickettailor.com/js/widgets/min/widget.js';
    script.setAttribute('data-url', resolvedUrl);
    script.setAttribute('data-type', 'inline');
    script.setAttribute('data-inline-minimal', 'true');
    script.setAttribute('data-inline-show-logo', 'false');
    script.setAttribute('data-inline-bg-fill', 'false');
    script.async = true;

    widgetDiv.appendChild(script);
    containerRef.current.appendChild(widgetDiv);
  }, [isDemo, resolvedUrl, activeLiveEntry?.publicUrl]);

  if (!isDemo && activeLiveEntry) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900">
            {resolvedEntries.length > 1 ? '1. Choose Performance & Venue' : 'Select Tickets'}
          </span>
          <a
            href={activeLiveEntry.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-500 hover:text-navy-950"
          >
            Open Box Office in New Tab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {resolvedEntries.length > 1 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {resolvedEntries.map((entry, idx) => (
              <button
                key={entry.widgetUrl}
                type="button"
                onClick={() => setSelectedPerf(idx)}
                className={`cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                  selectedPerf === idx
                    ? 'border-navy-900 bg-navy-900 text-white shadow-2xs'
                    : 'border-zinc-300 bg-ivory-50 text-zinc-700 hover:border-navy-900'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

        <div ref={containerRef} className="min-h-[260px]" />
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
    <div className="rounded-2xl border border-zinc-200 bg-ivory-50/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Interactive Box Office Preview
        </span>
        <button
          type="button"
          onClick={() => setShowPassInput((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-navy-900 underline decoration-gold-500 underline-offset-4"
        >
          <KeyRound className="h-3.5 w-3.5 text-gold-500" />
          {passUnlocked ? 'Season Pass Code Applied ✓' : 'Have a Season Pass? Enter Pass Code'}
        </button>
      </div>

      {completedOrder ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Reservation Confirmed for {concertTitle}!
          </div>
          <p className="mt-1 text-xs text-emerald-800">
            Performance: <strong>{performanceOptions[selectedPerf]}</strong> · {completedOrder}
          </p>
          <button
            type="button"
            onClick={() => setCompletedOrder(null)}
            className="mt-2.5 cursor-pointer text-xs font-semibold underline"
          >
            Modify demo order
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3.5">
          {/* Step A: Pick Performance Night (Capacity Management) */}
          <div>
            <span className="block text-xs font-semibold text-zinc-600">
              1. Choose Performance Night:
            </span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {performanceOptions.map((perf, idx) => (
                <button
                  key={perf}
                  type="button"
                  onClick={() => setSelectedPerf(idx)}
                  className={`cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                    selectedPerf === idx
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
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
              className="flex flex-col gap-2 rounded-xl border border-gold-400 bg-amber-50/70 p-3 sm:flex-row"
            >
              <input
                type="text"
                placeholder="Enter Pass Code (try KANTOREI-VIP-2026)"
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-mono text-xs uppercase"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-navy-900 px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                Unlock $0.00 VIP Seat
              </button>
            </form>
          )}

          {/* Ticket Tiers */}
          <div className="space-y-2">
            {passUnlocked && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2.5">
                <div>
                  <span className="text-xs font-bold text-emerald-950">
                    Season Pass Holder VIP ($0.00)
                  </span>
                  <span className="block text-[11px] text-emerald-800">
                    0% Ticket Tailor fee on $0 pass redemptions
                  </span>
                </div>
                <select
                  aria-label="Season Pass VIP Quantity"
                  value={vipQty}
                  onChange={(e) => setVipQty(Number(e.target.value))}
                  className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold"
                >
                  {[0, 1, 2].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
              <div>
                <span className="text-xs font-semibold text-zinc-900">
                  General Admission ($25.00)
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Open sanctuary seating
                </span>
              </div>
              <select
                aria-label="General Admission Quantity"
                value={gaQty}
                onChange={(e) => setGaQty(Number(e.target.value))}
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold"
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
              <Heart className="h-3.5 w-3.5 text-rose-600" />
              Add a tax-deductible donation:
            </span>
            <div className="flex gap-1.5">
              {[0, 10, 25, 50].map((amt) => (
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
            disabled={totalTickets === 0 && addOnDonation === 0}
            onClick={() =>
              setCompletedOrder(
                `${totalTickets} ticket(s) — Total charged: $${totalAmount.toFixed(2)}`
              )
            }
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-navy-800 disabled:opacity-50"
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
