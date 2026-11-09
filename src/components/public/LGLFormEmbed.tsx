import { useState } from 'react';
import {
  ExternalLink,
  Landmark,
  ShieldCheck,
  Lock,
  Info,
} from 'lucide-react';
import type { GivingTier } from '../../types/choir';

interface Props {
  lglFormUrl: string;
  choirName?: string;
  givingTiers?: GivingTier[];
}

const PRESET_TIERS = [
  { amount: 35, label: '$35', name: 'Friends of Kantorei' },
  { amount: 100, label: '$100', name: 'Section Supporter' },
  { amount: 250, label: '$250', name: 'Artist Circle' },
  { amount: 500, label: '$500', name: 'Composer Circle' },
  { amount: 1000, label: '$1,000+', name: "Conductor's Circle" },
];

export default function LGLFormEmbed({
  lglFormUrl,
  choirName = 'Kantorei',
  givingTiers = [],
}: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100);

  const cleanUrl = (lglFormUrl || '').trim() || 'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-950 text-gold-400 shadow-2xs">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-navy-950">
                Little Green Light Constituent Giving
              </h2>
              <p className="text-xs text-stone-500">
                Direct entry into {choirName}’s official constituent donor database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              LGL CRM Direct
            </span>
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 transition"
              title="Open full form in a new tab"
            >
              <span>Full Screen</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Giving Tier Quick-Select Aid */}
        <div className="mt-5 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Suggested Giving Levels:
            </span>
            <span className="text-[11px] text-stone-500">
              Select an amount below to match in the form
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESET_TIERS.map((tier) => {
              const isSelected = selectedPreset === tier.amount;
              return (
                <button
                  key={tier.amount}
                  type="button"
                  onClick={() => setSelectedPreset(tier.amount)}
                  className={`cursor-pointer rounded-lg border py-2 text-center text-xs font-bold transition ${
                    isSelected
                      ? 'border-navy-950 bg-navy-950 text-white shadow-2xs'
                      : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <div>{tier.label}</div>
                  <div
                    className={`text-[10px] font-normal truncate px-1 ${
                      isSelected ? 'text-gold-300' : 'text-stone-500'
                    }`}
                  >
                    {tier.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live LGL Form Iframe */}
        <div className="relative mt-6 overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          {iframeLoading && (
            <div className="flex min-h-[380px] w-full flex-col items-center justify-center gap-3 bg-stone-50/70 p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-950 border-t-transparent" />
              <div className="text-xs sm:text-sm font-semibold text-navy-950">
                Loading Little Green Light constituent form…
              </div>
              <p className="max-w-xs text-xs text-stone-500">
                Connecting directly to Kantorei&apos;s secure donor management database.
              </p>
            </div>
          )}

          <iframe
            src={cleanUrl}
            title={`${choirName} Donation Form via Little Green Light`}
            onLoad={() => setIframeLoading(false)}
            className={`w-full border-0 transition-opacity duration-300 ${
              iframeLoading ? 'h-0 opacity-0' : 'min-h-[820px] opacity-100'
            }`}
            allow="payment"
          />
        </div>

        {/* Form Trust & Info Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100 pt-3">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-stone-400" />
            <span>256-Bit SSL Encrypted &bull; PCI DSS Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-stone-400" />
            <span>With Stripe Enhanced Checkout, Apple Pay appears on step 2</span>
          </div>
        </div>
      </div>

      {/* Giving Circles Directory */}
      {givingTiers.length > 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-navy-950">
                Annual Giving Circles
              </h2>
              <p className="text-sm text-stone-600 mt-0.5">
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
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mx-3 px-3 rounded-xl transition hover:bg-stone-50/50"
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
                  <p className="mt-1 text-sm sm:text-base text-stone-700 leading-relaxed">
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
