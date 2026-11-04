import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';

interface Props {
  variant?: 'compact' | 'card' | 'banner' | 'spotlight';
  source?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
}

export default function NewsletterForm({
  variant = 'compact',
  source = 'Website_Footer',
  title,
  description,
  buttonText = 'Join Friends of Kantorei',
  className = '',
}: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim(),
          source,
          website_hp: honeypot,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };

      if (!res.ok || data.ok === false) {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again or email info@kantorei.net.');
        return;
      }

      setStatus('success');
      setEmail('');
      setName('');
    } catch {
      setStatus('error');
      setErrorMessage('Network connection error. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Compact Variant (Optimized for Footer & Sidebar)
  // ---------------------------------------------------------------------------
  if (variant === 'compact') {
    if (status === 'success') {
      return (
        <div
          className={`space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-4 text-ivory-100 backdrop-blur-xs ${className}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Welcome to Friends of Kantorei!
              </p>
              <p className="mt-0.5 text-xs text-zinc-300 leading-relaxed">
                Thank you for subscribing. You’ll receive concert announcements and recordings directly in your inbox.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setEmail('');
                  setName('');
                }}
                className="mt-2 cursor-pointer text-[11px] font-semibold text-gold-300 hover:text-white underline underline-offset-4 transition"
              >
                Sign up another email
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className={`space-y-2.5 ${className}`}>
        {/* Anti-spam honeypot */}
        <div className="hidden" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              aria-label="Email address for Friends of Kantorei newsletter"
              disabled={status === 'submitting'}
              className="w-full rounded-full border border-zinc-700 bg-navy-900/90 py-2.5 pl-10 pr-4 text-xs text-ivory-100 placeholder-zinc-400 shadow-inner outline-hidden transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gold-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-copper-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Joining…</span>
              </>
            ) : (
              <span>{buttonText}</span>
            )}
          </button>
        </div>

        {status === 'error' && (
          <p className="flex items-center gap-1.5 text-xs text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </p>
        )}
      </form>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Banner Variant (Optimized for Home Page Full-Width Editorial Block)
  // ---------------------------------------------------------------------------
  if (variant === 'banner') {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 p-7 sm:p-10 text-ivory-100 shadow-xl ${className}`}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(circle, #d9822b 0%, transparent 70%)' }}
        />

        <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              <Sparkles className="h-3 w-3" />
              <span>Patron Community</span>
            </div>
            <h3 className="mt-3 font-editorial text-2xl font-bold text-white sm:text-3xl">
              {title || 'Stay in Tune with Friends of Kantorei'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              {description ||
                'Join our circle of patrons, alumni, and choral enthusiasts. Get early box office access, conductor Adam Reinwald’s listening guides, and recordings delivered directly to your inbox.'}
            </p>
          </div>

          <div className="lg:col-span-6">
            {status === 'success' ? (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-xs">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-editorial text-xl font-bold text-white">
                      Welcome to Friends of Kantorei!
                    </h4>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-zinc-300">
                      Thank you for joining our community. You’ll receive early box office access, conductor Adam Reinwald’s listening guides, and recordings delivered directly to your inbox.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle');
                        setEmail('');
                        setName('');
                      }}
                      className="mt-3.5 cursor-pointer text-xs font-semibold text-gold-300 hover:text-white underline underline-offset-4 transition"
                    >
                      Sign up another email &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Anti-spam honeypot */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name (optional)"
                    aria-label="Your Name"
                    disabled={status === 'submitting'}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-zinc-400 outline-hidden transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 disabled:opacity-50"
                  />
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email address"
                      aria-label="Email address"
                      disabled={status === 'submitting'}
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-400 outline-hidden transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full rounded-xl bg-gold-500 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-copper-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === 'submitting' ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Joining the Circle…</span>
                    </span>
                  ) : (
                    <span>{buttonText}</span>
                  )}
                </button>

                {status === 'error' && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </p>
                )}

                <p className="text-center text-[11px] text-zinc-400">
                  Zero spam. You can unsubscribe at any time with one click.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Spotlight Variant (Optimized for Home Page Spotlight Fallback)
  // ---------------------------------------------------------------------------
  if (variant === 'spotlight') {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-stone-200/90 bg-[#FAF7F2] p-6 sm:p-8 md:p-9 shadow-sm ${className}`}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-copper-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-copper-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Friends of Kantorei</span>
        </div>
        <h2 className="mt-2 font-editorial text-2xl sm:text-3xl lg:text-4xl font-medium leading-snug tracking-tight text-navy-950">
          {title || 'Stay in Touch with Kantorei'}
        </h2>
        <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-stone-700 max-w-2xl">
          {description ||
            "We don't have any upcoming concerts scheduled right now. Join Friends of Kantorei to receive season announcements, recording releases, and priority ticket access."}
        </p>

        {status === 'success' ? (
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 max-w-2xl shadow-xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-editorial text-xl font-bold text-navy-950">
                You’re on the list!
              </h4>
              <p className="mt-1 text-sm text-stone-700 leading-relaxed">
                Thank you for joining Friends of Kantorei. You’ll receive season announcements, recording releases, and priority ticket access directly in your inbox.
              </p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setEmail('');
                    setName('');
                  }}
                  className="cursor-pointer text-xs font-semibold text-copper-600 hover:text-navy-950 underline underline-offset-4 transition"
                >
                  Sign up another email
                </button>
                <a
                  href="/media"
                  className="text-xs font-medium uppercase tracking-[0.14em] text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-navy-950 hover:decoration-copper-500 transition-colors"
                >
                  Explore Media Library &rarr;
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 max-w-2xl">
            {/* Anti-spam honeypot */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name (optional)"
                aria-label="Your Name"
                disabled={status === 'submitting'}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base sm:text-sm text-navy-950 placeholder-stone-400 outline-hidden transition focus:border-copper-500 focus:bg-white focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
              />
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your Email address"
                  aria-label="Email address"
                  disabled={status === 'submitting'}
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-base sm:text-sm text-navy-950 placeholder-stone-400 outline-hidden transition focus:border-copper-500 focus:bg-white focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="cursor-pointer rounded-sm bg-copper-500 py-3 px-6 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-xs transition hover:bg-copper-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Joining…</span>
                  </span>
                ) : (
                  <span>{buttonText}</span>
                )}
              </button>
              <a
                href="/media"
                className="inline-flex items-center justify-center text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-navy-950 hover:decoration-copper-500 transition-colors"
              >
                Explore Media Library &rarr;
              </a>
            </div>

            {status === 'error' && (
              <p className="flex items-center gap-1.5 text-xs sm:text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            <p className="text-xs text-stone-500">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Card Variant (Optimized for Concerts Page & About Page)
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-6 sm:p-9 shadow-sm ${className}`}
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-copper-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-copper-700">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Friends of Kantorei</span>
      </div>
      <h3 className="mt-3 font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
        {status === 'success'
          ? 'Welcome to Friends of Kantorei!'
          : (title || 'Never Miss a Concert Announcement')}
      </h3>
      <p className="mt-2 text-sm sm:text-base leading-relaxed text-stone-700">
        {status === 'success'
          ? 'Thank you for joining our patron circle. You’ll receive early box office announcements, artistic director listening guides, and recordings directly in your inbox.'
          : (description ||
            'Be the first to hear about upcoming season programs, early-access ticket sales, and guest artist appearances.')}
      </p>

      {status === 'success' ? (
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-xs">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy-950">
              You’re officially on the list!
            </p>
            <p className="mt-0.5 text-xs sm:text-sm text-stone-600 leading-relaxed">
              We respect your privacy—instant 1-click unsubscribe anytime.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setEmail('');
                setName('');
              }}
              className="mt-3 cursor-pointer text-xs font-semibold text-copper-600 hover:text-navy-950 underline underline-offset-4 transition"
            >
              Sign up another email &rarr;
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          {/* Anti-spam honeypot */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name (optional)"
              aria-label="Your Name"
              disabled={status === 'submitting'}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-4 py-3 text-base sm:text-sm text-navy-950 placeholder-stone-400 outline-hidden transition focus:border-copper-500 focus:bg-white focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
            />
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your Email address"
                aria-label="Email address"
                disabled={status === 'submitting'}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 py-3 pl-11 pr-4 text-base sm:text-sm text-navy-950 placeholder-stone-400 outline-hidden transition focus:border-copper-500 focus:bg-white focus:ring-1 focus:ring-copper-500 disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full cursor-pointer rounded-xl bg-navy-950 py-3.5 px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-copper-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Joining…</span>
              </span>
            ) : (
              <span>{buttonText}</span>
            )}
          </button>

          {status === 'error' && (
            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          <p className="text-center text-xs text-stone-600">
            We respect your privacy. Instant 1-click unsubscribe anytime.
          </p>
        </form>
      )}
    </div>
  );
}
