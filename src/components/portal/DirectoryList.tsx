import { useState } from 'react';
import { Mail, Phone, Search, ShieldCheck } from 'lucide-react';
import { SECTION_GROUPS, type SectionGroup, type Singer } from '../../types/choir';
import { voicePartBadgeColor } from '../../lib/utils';

interface Props {
  members: Singer[];
}

export default function DirectoryList({ members }: Props) {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'All' | SectionGroup>('All');

  const q = query.trim().toLowerCase();
  const filtered = members.filter((m) => {
    if (!m.active) return false;
    if (section !== 'All' && m.sectionGroup !== section) return false;
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.voicePart.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by singer name, email, or voice part…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 py-2 pr-4 pl-10 text-sm text-zinc-900 focus:border-navy-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['All', ...SECTION_GROUPS] as const).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setSection(group)}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                section === group
                  ? 'bg-navy-900 text-white'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div
            key={m.email}
            className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-zinc-900">{m.name}</h3>
                  <p className="text-xs text-zinc-500">{m.sectionGroup} Section</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${voicePartBadgeColor(
                    m.voicePart
                  )}`}
                >
                  {m.voicePart}
                </span>
              </div>

              {m.role !== 'Singer' && (
                <div className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-ivory-100 px-2 py-0.5 text-[11px] font-semibold text-navy-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-500" />
                  {m.role.replace('_', ' ')}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
              <a
                href={`mailto:${m.email}`}
                className="flex items-center gap-2 truncate hover:text-navy-900"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="truncate">{m.email}</span>
              </a>
              {m.phone && (
                <a
                  href={`tel:${m.phone}`}
                  className="flex items-center gap-2 hover:text-navy-900"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span>{m.phone}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

