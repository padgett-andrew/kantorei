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
  const cleanUrl =
    (lglFormUrl || '').trim() ||
    'https://secure.lglforms.com/form_engine/s/BM1h-KN91G0MJHiPSzPbsA';

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

        {/* Form Viewport: 1:1 Scale, Zero-Flicker, Full Touch Target Accuracy */}
        <div className="relative w-full overflow-hidden bg-white">
          <iframe
            src={cleanUrl}
            title={`Donate to ${choirName}`}
            loading="eager"
            className="w-full border-0 block bg-white min-h-[1100px] sm:min-h-[1000px] h-[1250px] sm:h-[1150px] lg:h-[1100px]"
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
