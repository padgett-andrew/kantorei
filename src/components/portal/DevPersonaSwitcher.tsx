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
  { email: 'andrew@kantorei.net', label: 'Andrew Padgett (B2 · Admin)' },
  { email: 'claire.lindqvist@icloud.com', label: 'Claire Lindqvist (S1 · Section Leader)' },
  { email: 'rachel.kim@outlook.com', label: 'Rachel Kim (A2 · Singer)' },
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
    <div className="border-b border-amber-300/70 bg-amber-50 px-4 py-1.5 text-xs text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-amber-700" />
          <span>Dev Preview Mode Active — Test portal permissions as:</span>
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
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-navy-900 text-white'
                    : 'bg-white text-zinc-700 border border-amber-300 hover:bg-amber-100'
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

