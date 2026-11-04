import { useState, useMemo, type SyntheticEvent } from 'react';
import type { ConcertEvent, SeatingChart, SeatingRow, SeatingSeat } from '../../../types/choir';
import { Layers, X, Copy, Sparkles, Users } from 'lucide-react';

interface Props {
  concerts: ConcertEvent[];
  currentSeason: string;
  existingCharts?: SeatingChart[];
  sourceChart?: SeatingChart; // if opened directly via "Duplicate" button on a specific chart
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
  // Combine existing charts and ensure sourceChart is included if present
  const availableCharts = useMemo(() => {
    const list = [...existingCharts];
    if (sourceChart && !list.some((c) => c.id === sourceChart.id)) {
      list.unshift(sourceChart);
    }
    return list;
  }, [existingCharts, sourceChart]);

  const hasExistingCharts = availableCharts.length > 0;

  // 'duplicate' if opened from a specific chart's duplicate button, else 'scratch'
  const [creationMode, setCreationMode] = useState<'scratch' | 'duplicate'>(
    sourceChart ? 'duplicate' : 'scratch'
  );

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    sourceChart?.id || availableCharts[0]?.id || ''
  );

  const selectedSourceChart = useMemo(() => {
    return availableCharts.find((c) => c.id === selectedSourceId) || sourceChart || null;
  }, [availableCharts, selectedSourceId, sourceChart]);

  // Compute stats for selected source chart
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

        // Deep clone rows
        const cloned: SeatingRow[] = JSON.parse(JSON.stringify(source.rows));

        if (!copySingers) {
          // Clear singer assignments but preserve physical formation & aisles
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
        // Generate blank rows and seats with center aisle
        for (let r = 1; r <= rowCount; r++) {
          const rowSeats: SeatingSeat[] = [];
          const halfSeats = Math.floor(seatsPerRow / 2);

          for (let s = 1; s <= seatsPerRow; s++) {
            rowSeats.push({ seatIndex: s });
            // Add center aisle in the middle if row has at least 6 seats
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
    } catch (err: any) {
      setError(err?.message || 'Failed to create seating chart.');
    } finally {
      setBusy(false);
    }
  }

  const isDuplicateMode = creationMode === 'duplicate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-[#B85D19]">
              {isDuplicateMode ? <Copy className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            </span>
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-navy-950">
                {isDuplicateMode ? 'Duplicate Seating Chart' : 'Create New Seating Chart'}
              </h2>
              <p className="text-xs text-stone-500">
                {isDuplicateMode
                  ? 'Clone layout into a new editable draft chart'
                  : 'Configure rows, season, and initial capacity'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Starting Point Toggle (Blank vs Duplicate) */}
        {hasExistingCharts && (
          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Starting Template
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => handleModeChange('scratch')}
                className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all ${creationMode === 'scratch'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#B85D19]" />
                <span>Blank Template</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('duplicate')}
                className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all ${creationMode === 'duplicate'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                <Copy className="h-3.5 w-3.5 text-[#B85D19]" />
                <span>Duplicate Existing</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Duplicate Mode: Chart Picker & Singer Placement Option */}
          {isDuplicateMode && (
            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Source Chart to Duplicate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => handleSourceSelect(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
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

              {/* Source Chart Quick Summary */}
              {sourceStats && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-600">
                  <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-2 py-0.5 font-medium text-stone-700">
                    <Layers className="h-3 w-3 text-stone-500" />
                    {sourceStats.rowCount} Riser Rows
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-2 py-0.5 font-medium text-stone-700">
                    {sourceStats.totalSeats} Singer Seats
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-2 py-0.5 font-medium text-stone-700">
                    <Users className="h-3 w-3 text-stone-500" />
                    {sourceStats.assignedSingers} Assigned Singers
                  </span>
                </div>
              )}

              {/* Keep Singers Option */}
              <div className="pt-2 border-t border-stone-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                  <input
                    type="checkbox"
                    checked={copySingers}
                    onChange={(e) => setCopySingers(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-stone-300 text-navy-950 focus:ring-navy-950"
                  />
                  <div>
                    <span className="font-semibold text-stone-900">
                      Keep singer seat assignments
                    </span>
                    <p className="text-[11px] text-stone-500">
                      {copySingers
                        ? 'Singers will remain in identical positions in the new chart.'
                        : 'Formation and aisles are preserved, but all seats start empty for fresh singer placement.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Chart Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              New Chart Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advent with Kantorei — Shoreview Sanctuary"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
            />
          </div>

          {/* Season & Concert Cycle */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Concert Season <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2026–2027"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Concert Cycle (Optional)
              </label>
              <select
                value={concertSlug}
                onChange={(e) => setConcertSlug(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
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

          {/* Blank Template Controls (Only in scratch mode) */}
          {!isDuplicateMode && (
            <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Initial Rows
                </label>
                <select
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
                >
                  <option value={2}>2 Rows</option>
                  <option value={3}>3 Rows (Kantorei 50-Member Standard)</option>
                  <option value={4}>4 Rows</option>
                  <option value={5}>5 Rows</option>
                  <option value={6}>6 Rows</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Seats Per Row
                </label>
                <select
                  value={seatsPerRow}
                  onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-navy-950 focus:outline-hidden"
                >
                  <option value={17}>17 Seats (~51 total — Standard)</option>
                  <option value={16}>16 Seats (~48 total)</option>
                  <option value={18}>18 Seats (~54 total)</option>
                  <option value={20}>20 Seats (Long Row — ~60 total)</option>
                  <option value={14}>14 Seats (~42 total)</option>
                  <option value={12}>12 Seats (~36 total)</option>
                  <option value={10}>10 Seats</option>
                  <option value={8}>8 Seats</option>
                </select>
              </div>
            </div>
          )}

          {/* Visibility Controls */}
          <div className="border-t border-stone-100 pt-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Initial Visibility
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-800">
                <input
                  type="radio"
                  name="status"
                  value="Draft"
                  checked={status === 'Draft'}
                  onChange={() => setStatus('Draft')}
                  className="text-navy-950"
                />
                <span>Draft (Admins & Section Leaders only)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-800">
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-navy-900 disabled:opacity-50"
            >
              {busy ? (
                'Creating...'
              ) : isDuplicateMode ? (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Create Duplicate</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create Chart</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
