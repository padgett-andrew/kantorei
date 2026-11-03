import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Music, Send, Sparkles } from 'lucide-react';
import {
  formatVoicePartLabel,
  type SectionGroup,
  type VoicePart,
} from '../../types/choir';

interface Props {
  choirName?: string;
  contactEmail?: string;
  googleFormUrl?: string;
}

const VOICE_SECTIONS: {
  section: SectionGroup;
  general: VoicePart;
  splits: VoicePart[];
}[] = [
  { section: 'Soprano', general: 'S', splits: ['S1', 'S2'] },
  { section: 'Alto', general: 'A', splits: ['A1', 'A2'] },
  { section: 'Tenor', general: 'T', splits: ['T1', 'T2'] },
  { section: 'Bass', general: 'B', splits: ['B1', 'B2'] },
];

export default function AuditionForm({
  choirName = 'Kantorei',
  contactEmail = 'info@kantorei.net',
  googleFormUrl,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [voicePart, setVoicePart] = useState<VoicePart>('S');
  const [preparedSelection, setPreparedSelection] = useState('');
  const [experience, setExperience] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (submitted) {
    return (
      <div className="rounded-3xl border border-gold-300 bg-ivory-50 p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-editorial text-3xl font-bold text-navy-950 sm:text-4xl">
          Audition Inquiry Received!
        </h3>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-700 sm:text-base">
          Thank you, <strong>{name}</strong>. Artistic Director Adam Reinwald and our section leaders have received your audition information. We will review your materials and be in touch regarding upcoming audition calls!
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2 text-xs font-semibold text-zinc-600">
          <Sparkles className="h-4 w-4 text-gold-500" />
          <span>A confirmation note has been dispatched to {email}.</span>
        </div>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setName('');
              setEmail('');
              setPhone('');
              setPreparedSelection('');
              setExperience('');
            }}
            className="text-xs font-bold uppercase tracking-wider text-navy-900 underline decoration-gold-500 underline-offset-4 hover:text-gold-600"
          >
            Submit Another Inquiry &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-sm">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-700">
            Online Audition Form
          </span>
          {googleFormUrl && (
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 underline decoration-gold-500 hover:text-gold-600"
            >
              Open Google Form in new tab &nearr;
            </a>
          )}
        </div>
        <h3 className="mt-2 font-editorial text-2xl font-bold text-navy-950 sm:text-3xl">
          {choirName} Singer Audition Application
        </h3>
        <p className="mt-1 text-xs text-zinc-600 sm:text-sm">
          Complete this form to submit your audition information directly to Artistic Director Adam Reinwald and section leaders.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 sm:text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Submission Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div>
            <label htmlFor="audition-name" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="audition-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Johnson"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-navy-900 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
            />
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="audition-email" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="audition-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="singer@example.com"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-navy-900 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Phone Number */}
          <div>
            <label htmlFor="audition-phone" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="audition-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="612-555-0100"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-navy-900 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
            />
          </div>

          {/* Voice Part Selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-950">
                Voice Part <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-navy-900 font-semibold">
                Selected: <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900 font-bold">{formatVoicePartLabel(voicePart)}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Select a general voice section (SATB) or specify your split (S1, S2, etc.):
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VOICE_SECTIONS.map(({ section, general, splits }) => {
                const isGeneralActive = voicePart === general;
                return (
                  <div
                    key={section}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2 text-center"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                      {section}
                    </span>
                    {/* General Section Button */}
                    <button
                      type="button"
                      onClick={() => setVoicePart(general)}
                      className={`w-full rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                        isGeneralActive
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-navy-950'
                      }`}
                      title={`${section} (General)`}
                    >
                      {general} <span className="text-[10px] font-normal opacity-80">(General)</span>
                    </button>
                    {/* Split Buttons */}
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      {splits.map((split) => {
                        const isSplitActive = voicePart === split;
                        return (
                          <button
                            key={split}
                            type="button"
                            onClick={() => setVoicePart(split)}
                            className={`rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                              isSplitActive
                                ? 'bg-navy-900 text-white shadow-xs'
                                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-navy-950'
                            }`}
                            title={formatVoicePartLabel(split)}
                          >
                            {split}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Prepared Selection */}
        <div>
          <label htmlFor="audition-piece" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
            Prepared a Cappella Selection <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id="audition-piece"
              type="text"
              required
              value={preparedSelection}
              onChange={(e) => setPreparedSelection(e.target.value)}
              placeholder="e.g. If Music Be the Food of Love (Purcell) or folk song / art song of your choice"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-navy-900 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
            />
            <Music className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Singers sing a short solo selection of their choice unaccompanied.
          </p>
        </div>

        {/* Choral Experience & Musicianship Background */}
        <div>
          <label htmlFor="audition-experience" className="block text-xs font-bold uppercase tracking-wider text-navy-950">
            Choral Background &amp; Musicianship Experience <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="audition-experience"
            required
            rows={4}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Tell us briefly about previous choral ensembles, college or community singing, vocal training, or sight-reading comfort..."
            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition focus:border-navy-900 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
          />
        </div>

        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-copper-600 disabled:opacity-50"
          >
            {loading ? (
              <span>Submitting Application...</span>
            ) : (
              <>
                <span>Submit Audition Application</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          <span className="text-xs text-zinc-500">
            Or email directly to{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-navy-950 underline decoration-gold-500"
            >
              {contactEmail}
            </a>
          </span>
        </div>
      </form>
    </div>
  );
}
