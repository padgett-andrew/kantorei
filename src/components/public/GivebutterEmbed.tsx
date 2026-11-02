import { useEffect, useState } from 'react';
import { CheckCircle2, Heart, ShieldCheck } from 'lucide-react';

interface Props {
  accountId?: string;
  campaignId?: string;
  choirName?: string;
}

const PRESET_AMOUNTS = [
  { amount: 35, impact: 'Covers digital & octavo sheet music for one singer for a concert cycle' },
  { amount: 75, impact: 'Supports youth & student $10 accessible ticket underwriting' },
  { amount: 150, impact: 'Funds acoustic sanctuary venue & organ preparation for dress week' },
  { amount: 500, impact: 'Underwrites guest baroque strings & living composer commissions' },
];

export default function GivebutterEmbed({
  accountId = 'DEMO',
  campaignId = 'DEMO',
  choirName = 'Kantorei',
}: Props) {
  const isDemo = !accountId || accountId === 'DEMO' || !campaignId || campaignId === 'DEMO';

  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [selectedAmount, setSelectedAmount] = useState<number>(75);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    const scriptId = 'givebutter-widget-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://widgets.givebutter.com/latest.umd.cjs?acct=${encodeURIComponent(
        accountId
      )}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isDemo, accountId]);

  if (!isDemo) {
    // Render Givebutter custom web component when live account + campaign IDs are configured
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        dangerouslySetInnerHTML={{
          __html: `<givebutter-widget id="${campaignId.replace(/[^a-zA-Z0-9_-]/g, '')}"></givebutter-widget>`,
        }}
      />
    );
  }

  const effectiveAmount = customAmount ? Number(customAmount) || 0 : selectedAmount;
  const activeImpact =
    PRESET_AMOUNTS.find((p) => p.amount === effectiveAmount)?.impact ??
    `Directly sustains ${choirName}'s 2026–2027 concert season and community outreach.`;

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-emerald-950 shadow-sm">
        <div className="flex items-center gap-2.5 font-editorial text-2xl font-bold">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          Thank You for Supporting {choirName}!
        </div>
        <p className="mt-2 text-sm text-emerald-900">
          Demo Pledge Recorded: <strong>${effectiveAmount.toFixed(2)}</strong> (
          {frequency === 'monthly' ? 'Monthly Sustainer' : 'One-Time Tax-Deductible Gift'})
          {donorName ? ` in honor of ${donorName}` : ''}. In production, Givebutter automatically emails an IRS-compliant 501(c)(3) tax receipt via Apple Pay, Venmo, ACH, or card.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 cursor-pointer text-xs font-semibold underline"
        >
          Make another demo gift
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-md sm:p-8">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
          Givebutter 501(c)(3) Contribution (Sandbox Preview)
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Tax-Deductible
        </span>
      </div>

      {/* Frequency Toggle */}
      <div className="mt-5 grid grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => setFrequency('one-time')}
          className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
            frequency === 'one-time'
              ? 'bg-navy-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          One-Time Gift
        </button>
        <button
          type="button"
          onClick={() => setFrequency('monthly')}
          className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
            frequency === 'monthly'
              ? 'bg-navy-900 text-white shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Monthly Sustainer ♥
        </button>
      </div>

      {/* Preset Amounts */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PRESET_AMOUNTS.map((item) => {
          const isSelected = !customAmount && selectedAmount === item.amount;
          return (
            <button
              key={item.amount}
              type="button"
              onClick={() => {
                setSelectedAmount(item.amount);
                setCustomAmount('');
              }}
              className={`cursor-pointer rounded-xl border py-3 text-center text-sm font-bold transition ${
                isSelected
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:border-navy-900'
              }`}
            >
              ${item.amount}
            </button>
          );
        })}
      </div>

      <p className="mt-3 rounded-xl bg-ivory-100 px-4 py-2.5 text-xs text-zinc-700">
        <strong>Your Impact:</strong> {activeImpact}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-600">
            Or Custom Amount ($ USD)
          </label>
          <input
            type="number"
            min={5}
            placeholder="Other amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600">
            Program Recognition Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., Elena & Marc Rostova"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={effectiveAmount <= 0}
        onClick={() => setSubmitted(true)}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-copper-600 disabled:opacity-50"
      >
        <Heart className="h-4 w-4 fill-current" />
        Donate ${effectiveAmount.toFixed(2)} {frequency === 'monthly' ? '/ Month' : ''} (Demo)
      </button>

      <p className="mt-3 text-center text-[11px] text-zinc-400">
        Supports Apple Pay · Google Pay · Venmo · PayPal · ACH · Credit/Debit Cards via Givebutter
      </p>
    </div>
  );
}

