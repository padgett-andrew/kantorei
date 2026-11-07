import { useState, useMemo, type SyntheticEvent } from 'react';
import type { ConcertEvent, SeatingChart, SeatingRow, SeatingSeat } from '../../../types/choir';
import { Layers, X, Copy, Users } from 'lucide-react';

interface Props {
  concerts: ConcertEvent[];
  currentSeason: string;
  existingCharts?: SeatingChart[];
  sourceChart?: SeatingChart;
  onClose: () => void;
  onSubmit: (chartData: {
    title: string;
    season: string;
    concertSlug?: string;
    concertTitle?: string;
    description?: string;
    status: 'Draft' | 'Published';
    rows: SeatingRow[];
  }) => Promise<void>;
}

export default function NewChartModal({
  concerts,
  currentSeason,
  existingCharts = [],
  sourceChart,
  onClose,
  onSubmit,
}: Props) {
  const availableCharts = useMemo(() => {
    const list = [...existingCharts];
    if (sourceChart && !list.some((c) => c.id === sourceChart.id)) {
      list.unshift(sourceChart);
    }
    return list;
  }, [existingCharts, sourceChart]);

  const hasExistingCharts = availableCharts.length > 0;

  const [creationMode, setCreationMode] = useState<'scratch' | 'duplicate'>(
    sourceChart ? 'duplicate' : 'scratch'
  );

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    sourceChart?.id || availableCharts[0]?.id || ''
  );

  const selectedSourceChart = useMemo(() => {
    return availableCharts.find((c) => c.id === selectedSourceId) || sourceChart || null;
  }, [availableCharts, selectedSourceId, sourceChart]);

  const sourceStats = useMemo(() => {
    if (!selectedSourceChart) return null;
    let totalSeats = 0;
    let assignedSingers = 0;
    for (const r of selectedSourceChart.rows) {
      for (const s of r.seats) {
        if (!s.isAisle) {
          totalSeats++;
          if (s.singerEmail || s.singerName) {
            assignedSingers++;
          }
        }
      }
    }
    return {
      rowCount: selectedSourceChart.rows.length,
      totalSeats,
      assignedSingers,
    };
  }, [selectedSourceChart]);

  const [title, setTitle] = useState(
    sourceChart ? `${sourceChart.title} (Copy)` : ''
  );
  const [season, setSeason] = useState(sourceChart?.season || currentSeason);
  const [concertSlug, setConcertSlug] = useState(sourceChart?.concertSlug || '');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [rowCount, setRowCount] = useState(3);
  const [seatsPerRow, setSeatsPerRow] = useState(17);
  const [copySingers, setCopySingers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleModeChange(newMode: 'scratch' | 'duplicate') {
    setCreationMode(newMode);
    setError(null);
    if (newMode === 'duplicate') {
      const source = selectedSourceChart || availableCharts[0];
      if (source) {
        if (!title.trim() || title === 'New Seating Chart') {
          setTitle(`${source.title} (Copy)`);
        }
        setSeason(source.season || currentSeason);
        if (source.concertSlug) {
          setConcertSlug(source.concertSlug);
        }
      }
    }
  }

  function handleSourceSelect(sourceId: string) {
    setSelectedSourceId(sourceId);
    const newSource = availableCharts.find((c) => c.id === sourceId);
    if (newSource) {
      setTitle(`${newSource.title} (Copy)`);
      setSeason(newSource.season || currentSeason);
      if (newSource.concertSlug) {
        setConcertSlug(newSource.concertSlug);
      }
    }
  }

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this seating chart.');
      return;
    }
    if (!season.trim()) {
      setError('Season is required (e.g. 2026–2027).');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      let rows: SeatingRow[] = [];

      if (creationMode === 'duplicate') {
        const source = selectedSourceChart;
        if (!source) {
          setError('Please select an existing seating chart to duplicate.');
          setBusy(false);
          return;
        }

        const cloned: SeatingRow[] = JSON.parse(JSON.stringify(source.rows));

        if (!copySingers) {
          rows = cloned.map((r) => ({
            ...r,
            seats: r.seats.map((s) => {
              if (s.isAisle) {
                return { seatIndex: 0, isAisle: true };
              }
              return {
                seatIndex: s.seatIndex,
                customLabel: s.customLabel,
              };
            }),
          }));
        } else {
          rows = cloned;
        }
      } else {
        for (let r = 1; r <= rowCount; r++) {
          const rowSeats: SeatingSeat[] = [];
          const halfSeats = Math.floor(seatsPerRow / 2);

          for (let s = 1; s <= seatsPerRow; s++) {
            rowSeats.push({ seatIndex: s });
            if (s === halfSeats && seatsPerRow >= 6) {
              rowSeats.push({ seatIndex: 0, isAisle: true });
            }
          }

          rows.push({
            rowNumber: r,
            name: `Row ${r}`,
            seats: rowSeats,
          });
        }
      }

      const selectedConcert = concerts.find((c) => c.slug === concertSlug);

      await onSubmit({
        title: title.trim(),
        season: season.trim(),
        concertSlug: concertSlug || undefined,
        concertTitle: selectedConcert?.title,
        status,
        rows,
      });

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create seating chart.');
    } finally {
      setBusy(false);
    }
  }

  const isDuplicateMode = creationMode === 'duplicate';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-sm border border-stone-300 bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-200/90 bg-white px-6 py-5">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-copper-600">
              Stage Formation
            </span>
            <h2 className="mt-0.5 font-editorial text-2xl font-normal text-navy-950">
              {isDuplicateMode ? 'Duplicate Formation Chart' : 'Create Formation Chart'}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {isDuplicateMode
                ? 'Clone an existing riser arrangement into a new editable draft.'
                : 'Configure riser rows, concert cycle, and initial seat capacity.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-sm p-1 text-stone-400 hover:bg-stone-100 hover:text-navy-950"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-sm border border-[#e4c4bc] bg-[#f7ebe8] p-3 text-xs text-[#84372d]">
              {error}
            </div>
          )}

          {/* Starting Point Toggle */}
          {hasExistingCharts && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                Starting Template
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-sm border border-stone-300/90 bg-white p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('scratch')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    creationMode === 'scratch'
                      ? 'bg-navy-950 text-white'
                      : 'text-stone-600 hover:text-navy-950'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Blank Risers</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('duplicate')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    creationMode === 'duplicate'
                      ? 'bg-navy-950 text-white'
                      : 'text-stone-600 hover:text-navy-950'
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate Existing</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isDuplicateMode && (
              <div className="space-y-3 rounded-sm border border-stone-200/90 bg-white p-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                    Source Chart <span className="text-[#84372d]">*</span>
                  </label>
                  <select
                    value={selectedSourceId}
                    onChange={(e) => handleSourceSelect(e.target.value)}
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                  >
                    {availableCharts.map((c) => {
                      const nonAisleCount = c.rows.reduce(
                        (sum, r) => sum + r.seats.filter((s) => !s.isAisle).length,
                        0
                      );
                      return (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.season} · {c.rows.length} rows, {nonAisleCount} seats)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {sourceStats && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-600">
                    <span className="inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-stone-700">
                      <Layers className="h-3 w-3 text-copper-600" />
                      {sourceStats.rowCount} Riser Rows
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-stone-700">
                      {sourceStats.totalSeats} Seats
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-[#FAF7F2] px-2 py-0.5 text-[11px] font-medium text-stone-700">
                      <Users className="h-3 w-3 text-copper-600" />
                      {sourceStats.assignedSingers} Assigned
                    </span>
                  </div>
                )}

                <div className="border-t border-stone-200/80 pt-3">
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs text-navy-950">
                    <input
                      type="checkbox"
                      checked={copySingers}
                      onChange={(e) => setCopySingers(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-stone-300 text-navy-950 focus:ring-navy-950"
                    />
                    <div>
                      <span className="font-semibold">
                        Retain singer seat assignments
                      </span>
                      <p className="text-[11px] text-stone-500">
                        {copySingers
                          ? 'Singers remain in identical positions in the duplicated chart.'
                          : 'Riser geometry and aisles are preserved, with all seats cleared.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                Chart Title <span className="text-[#84372d]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advent with Kantorei — Shoreview Sanctuary"
                className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                  Concert Season <span className="text-[#84372d]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="2026–2027"
                  className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                  Concert Cycle (Optional)
                </label>
                <select
                  value={concertSlug}
                  onChange={(e) => setConcertSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3.5 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                >
                  <option value="">General / All Season</option>
                  {concerts.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!isDuplicateMode && (
              <div className="grid grid-cols-2 gap-3 border-t border-stone-200/80 pt-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                    Initial Rows
                  </label>
                  <select
                    value={rowCount}
                    onChange={(e) => setRowCount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                  >
                    <option value={2}>2 Rows</option>
                    <option value={3}>3 Rows (Standard)</option>
                    <option value={4}>4 Rows</option>
                    <option value={5}>5 Rows</option>
                    <option value={6}>6 Rows</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                    Seats Per Row
                  </label>
                  <select
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-navy-950 focus:border-navy-950 focus:outline-none"
                  >
                    <option value={17}>17 Seats (~51 total)</option>
                    <option value={16}>16 Seats (~48 total)</option>
                    <option value={18}>18 Seats (~54 total)</option>
                    <option value={20}>20 Seats (~60 total)</option>
                    <option value={14}>14 Seats (~42 total)</option>
                    <option value={12}>12 Seats (~36 total)</option>
                    <option value={10}>10 Seats</option>
                    <option value={8}>8 Seats</option>
                  </select>
                </div>
              </div>
            )}

            <div className="border-t border-stone-200/80 pt-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600">
                Initial Visibility
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-navy-950">
                  <input
                    type="radio"
                    name="status"
                    value="Draft"
                    checked={status === 'Draft'}
                    onChange={() => setStatus('Draft')}
                    className="text-navy-950"
                  />
                  <span>Draft (Admins &amp; Section Leaders only)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-navy-950">
                  <input
                    type="radio"
                    name="status"
                    value="Published"
                    checked={status === 'Published'}
                    onChange={() => setStatus('Published')}
                    className="text-navy-950"
                  />
                  <span>Published (Visible to all singers)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-stone-200/80 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-sm border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700 hover:border-navy-950 hover:text-navy-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-navy-900 disabled:opacity-50"
              >
                {busy
                  ? 'Creating…'
                  : isDuplicateMode
                    ? 'Create Duplicate'
                    : 'Create Chart'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
