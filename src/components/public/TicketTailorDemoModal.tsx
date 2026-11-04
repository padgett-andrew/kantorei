import { useState } from 'react';
import { CheckCircle2, Heart, KeyRound } from 'lucide-react';

export default function TicketTailorDemoModal() {
  const [showPassInput, setShowPassInput] = useState(false);
  const [passCode, setPassCode] = useState('');
  const [passUnlocked, setPassUnlocked] = useState(false);
  const [gaQty, setGaQty] = useState(1);
  const [addOnDonation, setAddOnDonation] = useState<number>(0);
  const [completedOrder, setCompletedOrder] = useState<string | null>(null);

  function unlockPass(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passCode.trim()) return;
    setPassUnlocked(true);
    setGaQty(0);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
          Interactive Box Office Preview (Sandbox)
        </span>
        <button
          type="button"
          onClick={() => setShowPassInput((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs sm:text-sm font-semibold text-navy-900 underline decoration-copper-500 underline-offset-4"
        >
          <KeyRound className="h-3.5 w-3.5 text-copper-600" />
          {passUnlocked ? 'Season Pass Applied ✓' : 'Have a Pass? Enter Code'}
        </button>
      </div>

      {completedOrder ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Tickets Confirmed! (Demo Mode)
          </div>
          <p className="mt-1 text-xs text-emerald-800">
            Order confirmation sent to your email. Tickets will be held at will-call.
          </p>
          <button
            type="button"
            onClick={() => setCompletedOrder(null)}
            className="mt-3 cursor-pointer text-xs font-semibold text-emerald-900 underline"
          >
            Book more tickets
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {showPassInput && (
            <form
              onSubmit={unlockPass}
              className="flex gap-2 rounded-xl border border-gold-300 bg-gold-50/50 p-3"
            >
              <input
                type="text"
                placeholder="Enter Season Pass Code"
                value={passCode}
                onChange={(e) => setPassCode(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-mono uppercase"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Apply
              </button>
            </form>
          )}

          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5">
            <div>
              <p className="font-semibold text-navy-950 text-sm">General Admission</p>
              <p className="text-xs text-stone-500">Open sanctuary seating</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-navy-950 text-sm">$25</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGaQty(Math.max(0, gaQty - 1))}
                  className="h-7 w-7 rounded-md border border-stone-300 text-stone-700 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="w-4 text-center text-sm font-semibold">{gaQty}</span>
                <button
                  type="button"
                  onClick={() => setGaQty(gaQty + 1)}
                  className="h-7 w-7 rounded-md border border-stone-300 text-stone-700 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <Heart className="h-3.5 w-3.5 text-rose-600" />
              Add an ensemble donation:
            </span>
            <div className="flex gap-1.5">
              {[0, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAddOnDonation(amt)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    addOnDonation === amt
                      ? 'bg-navy-950 text-white'
                      : 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {amt === 0 ? 'None' : `+$${amt}`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCompletedOrder(`ORD-${Math.floor(100000 + Math.random() * 900000)}`)
            }
            className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-xs transition"
          >
            Complete Order — ${(gaQty * 25 + addOnDonation).toFixed(2)} (Demo)
          </button>
        </div>
      )}
    </div>
  );
}

