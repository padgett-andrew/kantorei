import { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles } from 'lucide-react';

interface Props {
  oauthError?: string;
  nextPath?: string;
  isDevPreviewAvailable?: boolean;
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
}: Props) {
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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-8">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Option 1: Google OAuth */}
      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-50"
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

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Or any roster email (iCloud, Outlook, Yahoo)
        </span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {/* Option 2: Stateless 6-Digit Email OTP */}
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label
              htmlFor="singer-email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Roster Email Address
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
              <input
                id="singer-email"
                type="email"
                required
                placeholder="claire.lindqvist@icloud.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 py-2.5 pr-4 pl-10 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {loading ? 'Sending 6-Digit Code…' : 'Email Me a 6-Digit Login Code'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {statusMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
              {devPreviewCode && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-emerald-200">
                  <span className="font-medium text-zinc-700">
                    Sandbox Code: <strong className="font-mono text-sm">{devPreviewCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(devPreviewCode)}
                    className="cursor-pointer rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200"
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
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              6-Digit Code for {email}
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
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
                className="w-full rounded-xl border border-zinc-300 py-2.5 pr-4 pl-10 font-mono text-base tracking-[0.3em] text-zinc-900 focus:border-navy-900 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
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
            className="w-full cursor-pointer text-center text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            ← Use a different email address
          </button>
        </form>
      )}

      {isDevPreviewAvailable && (
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>Local Dev Quick Entry</span>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Jump straight into the portal as any sample Kantorei roster role:
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => enterDevPreview('andrew@kantorei.net')}
              className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-amber-100"
            >
              Admin (B2)
            </button>
            <button
              type="button"
              onClick={() => enterDevPreview('claire.lindqvist@icloud.com')}
              className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-amber-100"
            >
              Sec. Leader (S1)
            </button>
            <button
              type="button"
              onClick={() => enterDevPreview('rachel.kim@outlook.com')}
              className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-amber-100"
            >
              Singer (A2)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
