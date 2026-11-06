import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { GivingTier } from '../../types/choir';

interface Props {
  accountId?: string;
  campaignId?: string;
  choirName?: string;
  givingTiers?: GivingTier[];
}

const PRESET_AMOUNTS = [
  {
    amount: 35,
    label: '$35',
    tierName: 'Friends of Kantorei',
    impact: 'Covers octavo & digital scores for one singer during a concert cycle',
  },
  {
    amount: 100,
    label: '$100',
    tierName: 'Section Supporter',
    impact: 'Helps keep Kantorei membership free of mandatory singer dues and folder fees',
  },
  {
    amount: 250,
    label: '$250',
    tierName: 'Artist Circle',
    impact: 'Supports professional live concert recordings shared worldwide and community outreach',
  },
  {
    amount: 500,
    label: '$500',
    tierName: 'Composer Circle',
    impact: 'Underwrites new choral commissions from emerging and established Minnesota composers',
  },
  {
    amount: 1000,
    label: '$1,000+',
    tierName: "Conductor's Circle",
    impact: 'Directly sponsors guest soloists, instrumentalists, and venue acoustic rental fees',
  },
];

function extractAccountId(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.toUpperCase() === 'DEMO') return '';
  const acctParam = /[?&]acct=([a-zA-Z0-9_-]+)/i.exec(trimmed);
  if (acctParam) return acctParam[1];
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
}

function extractWidgetId(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.toUpperCase() === 'DEMO') return '';
  const idAttr = /id=["']([a-zA-Z0-9_-]+)["']/i.exec(trimmed);
  if (idAttr) return idAttr[1];
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
}

export default function GivebutterEmbed({
  accountId = 'DEMO',
  campaignId = 'DEMO',
  choirName = 'Kantorei',
  givingTiers = [],
}: Props) {
  const cleanAccountId = extractAccountId(accountId);
  const cleanWidgetId = extractWidgetId(campaignId);
  const isDemo = !cleanAccountId || !cleanWidgetId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [activeTierName, setActiveTierName] = useState<string>('Section Supporter');
  const [donorName, setDonorName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Lock body scroll and handle Escape key while modal is active
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

  // Load Givebutter Web Component script when live credentials are provided
  useEffect(() => {
    if (isDemo) return;
    const scriptId = 'givebutter-widget-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    const targetSrc = `https://widgets.givebutter.com/latest.umd.cjs?acct=${encodeURIComponent(
      cleanAccountId
    )}&p=other`;
    if (!existing || existing.src !== targetSrc) {
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = targetSrc;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isDemo, cleanAccountId]);

  const effectiveAmount = customAmount ? Number(customAmount) || 0 : selectedAmount;
  const activeImpact =
    PRESET_AMOUNTS.find((p) => p.amount === effectiveAmount)?.impact ??
    `Directly sustains ${choirName}'s 2026–2027 concert season, artist partnerships, and community outreach.`;

  function handleSelectPreset(amt: number, tierName?: string) {
    setSelectedAmount(amt);
    setCustomAmount('');
    if (tierName) setActiveTierName(tierName);
  }

  function handleTierClick(tierRange: string, tierName: string) {
    const parsed = /\$?([0-9,]+)/.exec(tierRange);
    const amt = parsed ? parseInt(parsed[1].replace(/,/g, ''), 10) : 100;
    setSelectedAmount(amt);
    setCustomAmount('');
    setActiveTierName(tierName);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* ===================================================================
          1. On-Page Giving Experience & Impact Calculator
          =================================================================== */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-copper-100 text-copper-700">
              <Heart className="h-4 w-4 fill-current" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-navy-950">
              Make a Tax-Deductible Contribution
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            501(c)(3) Nonprofit
          </span>
        </div>

        {/* Frequency Toggle */}
        <div className="mt-5 grid grid-cols-2 rounded-xl border border-stone-200/80 bg-stone-50 p-1">
          <button
            type="button"
            onClick={() => setFrequency('one-time')}
            className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
              frequency === 'one-time'
                ? 'bg-navy-950 text-white shadow-2xs'
                : 'text-stone-600 hover:text-navy-950'
            }`}
          >
            One-Time Gift
          </button>
          <button
            type="button"
            onClick={() => setFrequency('monthly')}
            className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
              frequency === 'monthly'
                ? 'bg-navy-950 text-white shadow-2xs'
                : 'text-stone-600 hover:text-navy-950'
            }`}
          >
            Monthly Sustainer ♥
          </button>
        </div>

        {/* Preset Amounts */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((item) => {
            const isSelected = !customAmount && selectedAmount === item.amount;
            return (
              <button
                key={item.amount}
                type="button"
                onClick={() => handleSelectPreset(item.amount, item.tierName)}
                className={`cursor-pointer rounded-xl border py-3 text-center text-sm font-bold transition ${
                  isSelected
                    ? 'border-navy-950 bg-navy-950 text-white shadow-xs'
                    : 'border-stone-300 bg-white text-stone-800 hover:border-navy-950'
                }`}
              >
                ${item.amount}
              </button>
            );
          })}
        </div>

        {/* Impact Callout */}
        <div className="mt-3.5 rounded-xl border border-stone-200/70 bg-stone-50/70 px-4 py-3 text-xs leading-relaxed text-stone-700">
          <strong className="font-semibold text-navy-950">Your Impact:</strong> {activeImpact}
        </div>

        {/* Custom Amount & Recognition */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="custom-donation-amount" className="block text-xs font-semibold text-stone-600">
              Or Custom Amount ($ USD)
            </label>
            <input
              id="custom-donation-amount"
              type="number"
              min={5}
              placeholder="Other amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-base sm:text-sm focus:border-navy-950 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="donor-recognition-name" className="block text-xs font-semibold text-stone-600">
              Program Recognition Name (Optional)
            </label>
            <input
              id="donor-recognition-name"
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-base sm:text-sm focus:border-navy-950 focus:outline-none"
            />
          </div>
        </div>

        {/* Primary Modal Launch CTA */}
        <button
          type="button"
          disabled={effectiveAmount <= 0}
          onClick={() => {
            setSubmitted(false);
            setIsModalOpen(true);
          }}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xs transition disabled:opacity-50 active:scale-[0.99]"
        >
          <Heart className="h-4 w-4 fill-current" />
          Give ${effectiveAmount.toFixed(2)} {frequency === 'monthly' ? '/ Month' : ''} via Secure Checkout
        </button>

        <p className="mt-3 text-center text-[11px] text-stone-500">
          Instant 501(c)(3) tax receipt &bull; Supports Apple Pay, Google Pay, Venmo, PayPal, ACH &amp; Cards
        </p>
      </div>

      {/* ===================================================================
          2. Interactive Giving Circles with 1-Tap Tier Triggers
          =================================================================== */}
      {givingTiers.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-navy-950">
                Annual Giving Circles
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Choose a circle to support Kantorei&apos;s artistic leadership and community reach.
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
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group hover:bg-stone-50/50 -mx-3 px-3 rounded-xl transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-serif font-bold text-navy-950 text-base sm:text-lg">
                      {tier.name}
                    </span>
                    <span className="text-xs font-semibold text-copper-600 bg-copper-50 px-2 py-0.5 rounded-full border border-copper-200/60">
                      {tier.range}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleTierClick(tier.range, tier.name)}
                    className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 hover:border-navy-950 hover:bg-navy-950 hover:text-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 transition"
                  >
                    <span>Support Circle</span>
                    <span className="text-copper-600 group-hover:text-gold-400 font-bold">&rarr;</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===================================================================
          3. High-Breathability Givebutter Modal Sheet (Mobile & Desktop)
          =================================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-navy-950/80 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Make a tax-deductible gift"
        >
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsModalOpen(false)} />

          {/* Modal Container */}
          <div className="relative flex flex-col w-full h-[94vh] sm:h-[88vh] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 sm:px-6 sm:py-3.5 bg-stone-50/90 shrink-0">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold uppercase tracking-wider text-copper-600 truncate">
                  {choirName} &bull; 501(c)(3) Giving
                </p>
                <h4 className="text-sm sm:text-base font-bold text-navy-950 truncate">
                  ${effectiveAmount.toFixed(2)} {frequency === 'monthly' ? '/ Month' : ''} &bull;{' '}
                  {activeTierName}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-stone-500 hover:bg-stone-200 hover:text-navy-950 transition"
                  aria-label="Close contribution window"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Live Givebutter Web Component OR Interactive Sandbox Simulator */}
            <div className="relative flex-1 w-full bg-stone-50 overflow-y-auto">
              {!isDemo ? (
                <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[400px]">
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{
                      __html: `<givebutter-widget id="${cleanWidgetId}"></givebutter-widget>`,
                    }}
                  />
                </div>
              ) : submitted ? (
                <div className="p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-4 font-editorial text-2xl sm:text-3xl font-bold text-navy-950">
                    Thank You for Supporting {choirName}!
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-stone-700 leading-relaxed">
                    Demo Pledge Recorded: <strong>${effectiveAmount.toFixed(2)}</strong> (
                    {frequency === 'monthly' ? 'Monthly Sustainer' : 'One-Time Tax-Deductible Gift'})
                    {donorName ? ` in honor of ${donorName}` : ''}. In production, Givebutter automatically delivers an IRS-compliant 501(c)(3) tax receipt with zero manual admin overhead.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setIsModalOpen(false);
                    }}
                    className="mt-6 cursor-pointer rounded-xl bg-navy-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-copper-600"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="p-5 sm:p-7 space-y-5">
                  <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-navy-950">
                        Pledge Details (Sandbox Preview)
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        No processing fees
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">Contribution Amount</span>
                      <span className="font-bold text-navy-950 text-base">
                        ${effectiveAmount.toFixed(2)}{' '}
                        {frequency === 'monthly' ? (
                          <span className="text-xs font-normal text-stone-500">/ month</span>
                        ) : (
                          ''
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">Designated Giving Circle</span>
                      <span className="font-semibold text-copper-600">{activeTierName}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">Tax Deductibility</span>
                      <span className="font-semibold text-emerald-700">100% Tax-Deductible</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-1">
                    <p className="font-semibold">Your Gift at Work:</p>
                    <p className="leading-relaxed text-amber-900">{activeImpact}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSubmitted(true)}
                    className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xs transition active:scale-[0.99]"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                    Complete ${effectiveAmount.toFixed(2)} Pledge (Demo)
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer reassurance */}
            <div className="flex items-center justify-between border-t border-stone-200/80 bg-white px-4 py-2.5 sm:px-6 text-[11px] text-stone-500 shrink-0">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-600" />
                256-bit SSL Secure Donation
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold text-stone-600 hover:text-navy-950 underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
