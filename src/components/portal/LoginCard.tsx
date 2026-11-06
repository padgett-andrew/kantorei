import { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles } from 'lucide-react';

interface DevPersonaOption {
  email: string;
  shortLabel: string;
}

interface Props {
  oauthError?: string;
  nextPath?: string;
  isDevPreviewAvailable?: boolean;
  devPersonas?: DevPersonaOption[];
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured:
    'Google OAuth credentials are not configured yet in .env. Use the 6-digit Email Code below (or Dev Preview Mode).',
  oauth_state_mismatch: 'Your Google sign-in session expired. Please try again.',
  unverified_email: 'Your Google account email must be verified.',
  not_on_roster:
    'That Google email is not currently listed as Active on the choir Roster sheet. Try your roster email below or contact the Choir Manager.',
  oauth_exchange_failed: 'Could not complete Google sign-in. Please try again.',
};

export default function LoginCard({
  oauthError,
  nextPath = '/portal',
  isDevPreviewAvailable = false,
  devPersonas,
}: Props) {
  const quickEntryPersonas: DevPersonaOption[] =
    devPersonas && devPersonas.length > 0
      ? devPersonas
      : [
          { email: 'apadgettski@gmail.com', shortLabel: 'Admin (B2)' },
          { email: 'polim0501@gmail.com', shortLabel: 'Sec. Leader (S1)' },
          { email: 'karin.almjeld@kantorei.net', shortLabel: 'Singer (S1)' },
        ];
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    oauthError ? ERROR_MESSAGES[oauthError] ?? 'Sign-in error.' : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        devPreviewCode?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not send login code.');
        return;
      }
      setStatusMessage(data.message ?? 'Check your inbox for a 6-digit login code.');
      setDevPreviewCode(data.devPreviewCode ?? null);
      setStep('code');
    } catch {
      setError('Network error sending code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(data.error ?? 'Invalid or expired code.');
        return;
      }
      window.location.href = nextPath || data.redirectTo || '/portal';
    } catch {
      setError('Network error verifying code.');
    } finally {
      setLoading(false);
    }
  }

  async function enterDevPreview(demoEmail: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/dev-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail }),
      });
      if (res.ok) {
        window.location.href = nextPath || '/portal';
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs">
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs sm:text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Option 1: Google OAuth */}
      <a
        href="/api/auth/google"
        className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 shadow-2xs transition hover:border-stone-400 hover:bg-stone-50/80 focus:outline-none focus:ring-2 focus:ring-copper-500/20"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        Continue with Google
      </a>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Or any roster email (iCloud, Outlook, Yahoo)
        </span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      {/* Option 2: Stateless 6-Digit Email OTP */}
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-3.5">
          <div>
            <label
              htmlFor="singer-email"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-600"
            >
              Roster Email Address
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-stone-400" />
              <input
                id="singer-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/40 py-2.5 pr-4 pl-10 text-base sm:text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-copper-500 focus:bg-white focus:ring-2 focus:ring-copper-500/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-copper-500 px-4 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-copper-600 focus:outline-none focus:ring-2 focus:ring-copper-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? 'Sending 6-Digit Code…' : 'Email Me a 6-Digit Login Code'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3.5">
          {statusMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
              {devPreviewCode && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-1.5">
                  <span className="font-medium text-stone-700">
                    Sandbox Code: <strong className="font-mono text-sm text-emerald-950">{devPreviewCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(devPreviewCode)}
                    className="cursor-pointer rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-200"
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="otp-code"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-600"
            >
              6-Digit Code for {email}
            </label>
            <div className="relative mt-1">
              <KeyRound className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-stone-400" />
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/40 py-2.5 pr-4 pl-10 font-mono text-base tracking-[0.3em] text-stone-900 placeholder:text-stone-400 transition focus:border-copper-500 focus:bg-white focus:ring-2 focus:ring-copper-500/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-copper-500 px-4 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-xs transition duration-200 hover:bg-copper-600 focus:outline-none focus:ring-2 focus:ring-copper-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & Open Singer Portal'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setDevPreviewCode(null);
            }}
            className="w-full cursor-pointer text-center text-xs font-medium text-stone-500 transition hover:text-copper-600"
          >
            ← Use a different email address
          </button>
        </form>
      )}

      {isDevPreviewAvailable && (
        <div className="mt-5 rounded-xl border border-gold-300/60 bg-amber-50/50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy-950">
            <Sparkles className="h-3.5 w-3.5 text-copper-600" />
            <span>Local Dev Quick Entry</span>
          </div>
          <p className="mt-1 text-xs text-stone-600">
            Jump straight into the portal as any sample Kantorei roster role:
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {quickEntryPersonas.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => enterDevPreview(p.email)}
                className="flex-1 cursor-pointer rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 transition hover:border-copper-400 hover:bg-copper-50/30 hover:text-copper-700"
              >
                {p.shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
