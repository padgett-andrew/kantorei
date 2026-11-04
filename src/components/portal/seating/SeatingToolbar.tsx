import { LayoutGrid, List } from 'lucide-react';
import type { SectionGroup } from '../../../types/choir';
import type { SeatingDensity, SeatingPerspective } from './types';

interface Props {
  perspective: SeatingPerspective;
  setPerspective: (p: SeatingPerspective) => void;
  density: SeatingDensity;
  setDensity: (d: SeatingDensity) => void;
  layoutView: 'formation' | 'list';
  setLayoutView: (v: 'formation' | 'list') => void;
  sectionFilter: 'All' | SectionGroup;
  setSectionFilter: (s: 'All' | SectionGroup) => void;
}

export default function SeatingToolbar({
  perspective,
  setPerspective,
  density,
  setDensity,
  layoutView,
  setLayoutView,
  sectionFilter,
  setSectionFilter,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Perspective toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">Perspective:</span>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPerspective('conductor')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                perspective === 'conductor'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Conductor
            </button>
            <button
              type="button"
              onClick={() => setPerspective('singer')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                perspective === 'singer'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Singer View
            </button>
          </div>
        </div>

        {/* Density toggle (designed for 50-member choir / up to 20 seats per row) */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">View:</span>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                density === 'compact'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Compact mode: Fits 16–20 singers per row on screen without horizontal scroll"
            >
              Compact (50 Choir)
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                density === 'comfortable'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Comfortable mode: Expanded cards with full names"
            >
              Comfortable
            </button>
          </div>
        </div>

        {/* Layout toggle (Formation vs Mobile Row List) */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-500">Layout:</span>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLayoutView('formation')}
              className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                layoutView === 'formation'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Formation: Visual stage riser layout"
            >
              <LayoutGrid className="h-3 w-3" />
              <span className="hidden sm:inline">Formation</span>
              <span className="sm:hidden">Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutView('list')}
              className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                layoutView === 'list'
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Row List: Mobile attendance and quick list"
            >
              <List className="h-3 w-3" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <span className="text-xs font-semibold text-zinc-500 mr-1">Section:</span>
        {(['All', 'Soprano', 'Alto', 'Tenor', 'Bass'] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSectionFilter(sec)}
            className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              sectionFilter === sec
                ? 'bg-navy-950 text-white shadow-2xs'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>
    </div>
  );
}

