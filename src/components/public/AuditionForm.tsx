import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Music,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  formatVoicePartLabel,
  type VoicePart,
} from '../../types/choir';

interface Props {
  choirName?: string;
  contactEmail?: string;
  googleFormUrl?: string;
  defaultOpen?: boolean;
}

export default function AuditionForm({
  choirName = 'Kantorei',
  contactEmail = 'info@kantorei.net',
  googleFormUrl,
  defaultOpen = false,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(defaultOpen);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [voicePart, setVoicePart] = useState<VoicePart>('S');
  const [preparedSelection, setPreparedSelection] = useState('');
  const [experience, setExperience] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock & ESC key listener for modal
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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auditions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          voicePart,
          preparedSelection,
          experience,
          website_hp: honeypot,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to submit audition inquiry.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error submitting form.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ===================================================================
          1. On-Page Launch Card (Clean, Editorial, High Affordance)
          =================================================================== */}
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-10 shadow-sm text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-gold-900 border border-gold-300/60">
          <Sparkles className="h-3.5 w-3.5 text-gold-600" />
          Twin Cities Choral Auditions
        </span>

        <h3 className="mt-3 font-editorial text-3xl font-bold text-navy-950 sm:text-4xl">
          Ready to Sing with {choirName}?
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Auditions are heard by Artistic Director Adam Reinwald and section leaders. We welcome inquiries year-round across all voice parts (SATB · general sections and split parts).
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setIsModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-7 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-xs transition active:scale-[0.99]"
          >
            <Music className="h-4 w-4" />
            Start Audition Inquiry
          </button>

          {googleFormUrl && (
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-navy-950 underline decoration-stone-300 underline-offset-4"
            >
              Open Google Form in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Questions before applying? Email{' '}
          <a href={`mailto:${contactEmail}`} className="font-semibold text-navy-950 underline decoration-copper-500">
            {contactEmail}
          </a>
        </p>
      </div>

      {/* Sticky Mobile Floating Pill */}
      <div className="fixed bottom-5 inset-x-4 z-30 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setIsModalOpen(true);
          }}
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-full bg-navy-950 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-xl border border-gold-400/30 active:scale-95 transition"
        >
          <Music className="h-4 w-4 text-gold-400" />
          Apply to Audition
        </button>
      </div>

      {/* ===================================================================
          2. High-Breathability Audition Modal Sheet
          =================================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-navy-950/80 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`${choirName} Audition Application`}
        >
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsModalOpen(false)} />

          {/* Modal Container */}
          <div className="relative flex flex-col w-full h-[94vh] sm:h-[90vh] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 sm:px-6 sm:py-3.5 bg-stone-50/90 shrink-0">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold uppercase tracking-wider text-copper-600 truncate">
                  {choirName} &bull; Vocal Audition Application
                </p>
                <h4 className="text-sm sm:text-base font-bold text-navy-950 truncate">
                  2026–2027 Season &bull; Artistic Director Adam Reinwald
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {googleFormUrl && (
                  <a
                    href={googleFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-navy-950 px-2 py-1 rounded-md hover:bg-stone-200/50 transition"
                    title="Open in new window"
                  >
                    <span>New Tab</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-full p-1.5 text-stone-500 hover:bg-stone-200 hover:text-navy-950 transition"
                  aria-label="Close audition window"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="relative flex-1 w-full bg-stone-50 overflow-y-auto">
              {googleFormUrl ? (
                /* Google Form Iframe within Modal */
                <div className="h-full w-full">
                  <iframe
                    src={googleFormUrl}
                    width="100%"
                    height="100%"
                    className="w-full h-full border-0 min-h-[600px]"
                    title={`${choirName} Audition Form`}
                  >
                    Loading audition form...
                  </iframe>
                </div>
              ) : submitted ? (
                /* Success Screen */
                <div className="p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 font-editorial text-3xl font-bold text-navy-950 sm:text-4xl">
                    Audition Inquiry Received!
                  </h3>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-700 sm:text-base">
                    Thank you, <strong>{name}</strong>. Artistic Director Adam Reinwald and our section leaders have received your audition information. We will review your materials and be in touch regarding upcoming audition calls!
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2 text-xs font-semibold text-stone-600">
                    <Sparkles className="h-4 w-4 text-gold-500" />
                    <span>A confirmation note has been dispatched to {email}.</span>
                  </div>
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="cursor-pointer rounded-xl bg-navy-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-copper-600"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                /* Native Audition Form */
                <div className="p-5 sm:p-8 space-y-6">
                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 sm:text-sm">
                      <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                      <div>
                        <p className="font-semibold">Submission Notice</p>
                        <p className="mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
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
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="modal-audition-name" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="modal-audition-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Maria Johnson"
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="modal-audition-email" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="modal-audition-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="singer@example.com"
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-950 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="modal-audition-phone" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="modal-audition-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="612-555-0100"
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                          Voice Part: <span className="text-copper-600 font-bold">{formatVoicePartLabel(voicePart)}</span>
                        </label>
                        <div className="mt-1 grid grid-cols-4 gap-1.5">
                          {(['S', 'A', 'T', 'B'] as VoicePart[]).map((vp) => (
                            <button
                              key={vp}
                              type="button"
                              onClick={() => setVoicePart(vp)}
                              className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                                voicePart.startsWith(vp)
                                  ? 'bg-navy-950 text-white'
                                  : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              {vp}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Split Voice Part refinement */}
                    <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        Specify Voice Part Split (Optional):
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {(['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'] as VoicePart[]).map((split) => (
                          <button
                            key={split}
                            type="button"
                            onClick={() => setVoicePart(split)}
                            className={`cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition ${
                              voicePart === split
                                ? 'bg-copper-600 text-white shadow-2xs'
                                : 'border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            {split}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="modal-prepared-piece" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                        Prepared Solo Selection <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="modal-prepared-piece"
                        type="text"
                        required
                        value={preparedSelection}
                        onChange={(e) => setPreparedSelection(e.target.value)}
                        placeholder="e.g. Faure - Pie Jesu, or Bach aria, or traditional hymn/folk song"
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-950 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="modal-experience" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                        Choral &amp; Vocal Background <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="modal-experience"
                        required
                        rows={3}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Please share recent collegiate, professional, or community ensemble experience, sight-reading background, and vocal study."
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-navy-950 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl bg-copper-500 hover:bg-copper-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-xs transition disabled:opacity-50 active:scale-[0.99]"
                    >
                      {loading ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit Audition Interest Form</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer reassurance */}
            <div className="flex items-center justify-between border-t border-stone-200/80 bg-white px-4 py-2.5 sm:px-6 text-[11px] text-stone-500 shrink-0">
              <span>Auditions heard by Adam Reinwald &bull; No singer dues or folder fees</span>
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
    </>
  );
}
