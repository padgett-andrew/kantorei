import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Singer } from '../../types/choir';

interface PersonaOption {
  email: string;
  label: string;
}

interface Props {
  currentSinger: Singer;
  personas?: PersonaOption[];
}

const FALLBACK_PERSONAS: PersonaOption[] = [
  { email: 'apadgettski@gmail.com', label: 'Andrew Padgett (B2 · Admin)' },
  { email: 'polim0501@gmail.com', label: 'Maryanne Poliseno (S1 · Section Leader)' },
  { email: 'karin.almjeld@kantorei.net', label: 'Karin Almjeld (S1 · Singer)' },
];

export default function DevPersonaSwitcher({ currentSinger, personas }: Props) {
  const [switching, setSwitching] = useState(false);
  const options = personas && personas.length > 0 ? personas : FALLBACK_PERSONAS;

  async function switchRole(email: string) {
    if (email === currentSinger.email) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/dev-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="border-b border-stone-300/80 bg-[#f5efe8] px-4 py-1.5 text-[11px] text-stone-700 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-copper-600" />
          <span className="font-semibold uppercase tracking-[0.14em] text-copper-600">Preview</span>
          <span className="text-stone-400" aria-hidden="true">·</span>
          <span className="text-stone-600">Switch ensemble persona:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {options.map((p) => {
            const active = p.email === currentSinger.email;
            return (
              <button
                key={p.email}
                type="button"
                disabled={switching}
                onClick={() => switchRole(p.email)}
                className={`cursor-pointer rounded-sm px-2.5 py-0.5 text-[11px] font-medium transition ${
                  active
                    ? 'bg-navy-950 text-white'
                    : 'border border-stone-300/80 bg-white/80 text-stone-700 hover:border-navy-950 hover:text-navy-950'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

