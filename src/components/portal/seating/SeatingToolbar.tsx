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
    <div className="flex flex-col gap-3 border-b border-stone-200/90 pb-3.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        {/* Perspective toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Perspective
          </span>
          <div className="flex rounded-sm border border-stone-300/90 bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setPerspective('conductor')}
              className={`cursor-pointer rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                perspective === 'conductor'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
            >
              Conductor
            </button>
            <button
              type="button"
              onClick={() => setPerspective('singer')}
              className={`cursor-pointer rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                perspective === 'singer'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
            >
              Singer
            </button>
          </div>
        </div>

        {/* Density toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Scale
          </span>
          <div className="flex rounded-sm border border-stone-300/90 bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={`cursor-pointer rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                density === 'compact'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
              title="Compact mode: Fits 16–20 singers per row on screen"
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={`cursor-pointer rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                density === 'comfortable'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
              title="Comfortable mode: Expanded cards with full names"
            >
              Expanded
            </button>
          </div>
        </div>

        {/* Layout toggle (Formation vs Row List) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            Layout
          </span>
          <div className="flex rounded-sm border border-stone-300/90 bg-white p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setLayoutView('formation')}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                layoutView === 'formation'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
              }`}
              title="Formation: Visual stage layout"
            >
              <LayoutGrid className="h-3 w-3" />
              <span className="hidden sm:inline">Formation</span>
              <span className="sm:hidden">Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutView('list')}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-sm px-2.5 py-1 font-semibold uppercase tracking-[0.1em] transition ${
                layoutView === 'list'
                  ? 'bg-navy-950 text-white'
                  : 'text-stone-600 hover:text-navy-950'
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none lg:pb-0">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Section
        </span>
        {(['All', 'Soprano', 'Alto', 'Tenor', 'Bass'] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSectionFilter(sec)}
            className={`cursor-pointer rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              sectionFilter === sec
                ? 'border-navy-950 bg-navy-950 text-white'
                : 'border-stone-200/90 bg-white text-stone-600 hover:border-stone-400 hover:text-navy-950'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>
    </div>
  );
}
