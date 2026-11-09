import { useState } from 'react';
import {
  Sparkles,
  Landmark,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { GivingTier } from '../../types/choir';
import GivebutterEmbed from './GivebutterEmbed';
import LGLFormEmbed from './LGLFormEmbed';

interface Props {
  accountId?: string;
  campaignId?: string;
  choirName?: string;
  givingTiers?: GivingTier[];
  lglFormUrl?: string;
  initialPlatform?: 'givebutter' | 'lgl' | 'both';
  allowToggle?: boolean;
}

export default function SupportDonationManager({
  accountId = 'DEMO',
  campaignId = 'DEMO',
  choirName = 'Kantorei',
  givingTiers = [],
  lglFormUrl = 'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA',
  initialPlatform = 'both',
  allowToggle = true,
}: Props) {
  // Determine effective starting platform
  const [activePlatform, setActivePlatform] = useState<'givebutter' | 'lgl'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlPlatform = (params.get('platform') || params.get('provider') || '').toLowerCase();
      if (urlPlatform === 'lgl') return 'lgl';
      if (urlPlatform === 'givebutter') return 'givebutter';
    }
    return initialPlatform === 'lgl' ? 'lgl' : 'givebutter';
  });

  const [showComparison, setShowComparison] = useState(false);

  // Sync with URL query parameter so directors/board members can bookmark or link directly
  const handleSelectPlatform = (platform: 'givebutter' | 'lgl') => {
    setActivePlatform(platform);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('platform', platform);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const showSwitcher = allowToggle || initialPlatform === 'both';

  return (
    <div className="space-y-6">
      {/* ===================================================================
          1. Presentation Mode / Feature Flag Switcher
          =================================================================== */}
      {showSwitcher && (
        <div className="overflow-hidden rounded-2xl border border-stone-300/80 bg-white shadow-xs">
          <div className="border-b border-stone-200/80 bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold-500/20 text-gold-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-navy-950">
                  Leadership Giving Demo &bull; Platform Switcher
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-stone-600 hover:text-navy-950"
              >
                <span>{showComparison ? 'Hide Strategic Comparison' : 'Compare Options for Board'}</span>
                {showComparison ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Switcher Tabs */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPlatform('givebutter')}
                className={`cursor-pointer flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  activePlatform === 'givebutter'
                    ? 'border-navy-950 bg-white text-navy-950 shadow-xs ring-2 ring-navy-950/10'
                    : 'border-stone-200 bg-white/60 text-stone-600 hover:border-stone-300 hover:bg-white'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    activePlatform === 'givebutter'
                      ? 'bg-copper-500 text-white'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  <Zap className="h-4 w-4 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-editorial text-sm font-bold text-navy-950">
                      Option A: Givebutter
                    </span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold uppercase text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">
                    1-Tap Apple Pay, Google Pay &amp; Venmo &bull; Donors cover fees
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlatform('lgl')}
                className={`cursor-pointer flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  activePlatform === 'lgl'
                    ? 'border-navy-950 bg-white text-navy-950 shadow-xs ring-2 ring-navy-950/10'
                    : 'border-stone-200 bg-white/60 text-stone-600 hover:border-stone-300 hover:bg-white'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    activePlatform === 'lgl'
                      ? 'bg-navy-950 text-gold-400'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-editorial text-sm font-bold text-navy-950">
                      Option B: Little Green Light
                    </span>
                    <span className="rounded-full bg-stone-100 px-1.5 py-0.2 text-[10px] font-bold uppercase text-stone-700">
                      Current CRM
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">
                    Embedded constituent form &bull; Direct CRM database sync
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Strategic Comparison Drawer (Expandable) */}
          {showComparison && (
            <div className="border-t border-stone-200/80 bg-stone-50/50 p-5 sm:p-6 text-xs text-stone-700">
              <h4 className="font-editorial text-sm font-bold text-navy-950">
                Strategic Summary for Artistic Director &amp; Board
              </h4>
              <p className="mt-1 text-stone-600">
                You do not have to give up Little Green Light to adopt Givebutter. The two platforms can work together seamlessly:
              </p>

              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2 pr-4">Dimension</th>
                      <th className="py-2 px-4 text-copper-700 bg-copper-50/60 rounded-t-lg">
                        Givebutter (Front-End)
                      </th>
                      <th className="py-2 pl-4 text-navy-900 bg-navy-50/40 rounded-t-lg">
                        Little Green Light (Current)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60">
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-navy-950">Mobile Donor Experience</td>
                      <td className="py-2.5 px-4 bg-copper-50/30 font-medium text-emerald-800">
                        15-second 1-tap Apple Pay, Google Pay, Venmo
                      </td>
                      <td className="py-2.5 pl-4 bg-navy-50/20 text-stone-600">
                        2-step form; requires manual typing of address &amp; card
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-navy-950">Payment Fee Coverage</td>
                      <td className="py-2.5 px-4 bg-copper-50/30 text-stone-700">
                        95%+ donors voluntarily cover all processing fees
                      </td>
                      <td className="py-2.5 pl-4 bg-navy-50/20 text-stone-600">
                        Optional 3% checkbox (lower donor opt-in rate)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-navy-950">Constituent Database (LGL)</td>
                      <td className="py-2.5 px-4 bg-copper-50/30 text-stone-700">
                        Synced into LGL via Zapier, Webhook, or 1-click CSV
                      </td>
                      <td className="py-2.5 pl-4 bg-navy-50/20 text-emerald-800 font-medium">
                        100% native direct entry into LGL
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-semibold text-navy-950">Donor Address Capture</td>
                      <td className="py-2.5 px-4 bg-copper-50/30 text-stone-700">
                        Apple/Google Pay transmits full billing address automatically
                      </td>
                      <td className="py-2.5 pl-4 bg-navy-50/20 text-stone-600">
                        Donor must type street address manually
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          2. Active Platform Renderer
          =================================================================== */}
      {activePlatform === 'givebutter' ? (
        <GivebutterEmbed
          accountId={accountId}
          campaignId={campaignId}
          choirName={choirName}
          givingTiers={givingTiers}
        />
      ) : (
        <LGLFormEmbed
          lglFormUrl={lglFormUrl}
          choirName={choirName}
          givingTiers={givingTiers}
        />
      )}
    </div>
  );
}
