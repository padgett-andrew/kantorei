import { useState, type SyntheticEvent } from 'react';
import type { ConcertEvent, SeatingChart, SeatingRow, SeatingSeat } from '../../../types/choir';
import { Layers, X, Copy } from 'lucide-react';

interface Props {
  concerts: ConcertEvent[];
  currentSeason: string;
  sourceChart?: SeatingChart; // if duplicating
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
  sourceChart,
  onClose,
  onSubmit,
}: Props) {
  const isDuplicate = Boolean(sourceChart);

  const [title, setTitle] = useState(
    sourceChart ? `${sourceChart.title} (Copy)` : ''
  );
  const [season, setSeason] = useState(sourceChart?.season || currentSeason);
  const [concertSlug, setConcertSlug] = useState(sourceChart?.concertSlug || '');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [rowCount, setRowCount] = useState(sourceChart ? sourceChart.rows.length : 3);
  const [seatsPerRow, setSeatsPerRow] = useState(17);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this seating chart.');
      return;
    }
    if (!season.trim()) {
      setError('Season is required.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      let rows: SeatingRow[] = [];

      if (sourceChart) {
        // Clone source chart rows
        rows = JSON.parse(JSON.stringify(sourceChart.rows));
      } else {
        // Generate blank rows and seats with center aisle
        for (let r = 1; r <= rowCount; r++) {
          const rowSeats: SeatingSeat[] = [];
          const halfSeats = Math.floor(seatsPerRow / 2);

          for (let s = 1; s <= seatsPerRow; s++) {
            rowSeats.push({ seatIndex: s });
            // Add center aisle in the middle
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ivory-100 text-gold-600">
              {isDuplicate ? <Copy className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            </span>
            <div>
              <h2 className="font-editorial text-xl font-bold text-navy-950">
                {isDuplicate ? 'Duplicate Seating Chart' : 'Create New Seating Chart'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isDuplicate
                  ? 'Clone layout into a new draft chart'
                  : 'Configure rows, season, and initial capacity'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Chart Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advent with Kantorei — Shoreview Sanctuary"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-navy-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Concert Season <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2026–2027"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-navy-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Concert Cycle (Optional)
              </label>
              <select
                value={concertSlug}
                onChange={(e) => setConcertSlug(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-navy-900 focus:outline-hidden"
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

          {!sourceChart && (
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Initial Rows
                </label>
                <select
                  value={rowCount}
                  onChange={(e) => setRowCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-navy-900 focus:outline-hidden"
                >
                  <option value={2}>2 Rows</option>
                  <option value={3}>3 Rows (Kantorei 50-Member Standard)</option>
                  <option value={4}>4 Rows</option>
                  <option value={5}>5 Rows</option>
                  <option value={6}>6 Rows</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Seats Per Row
                </label>
                <select
                  value={seatsPerRow}
                  onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-navy-900 focus:outline-hidden"
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Initial Visibility
            </label>
            <div className="mt-1.5 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700">
                <input
                  type="radio"
                  name="status"
                  value="Draft"
                  checked={status === 'Draft'}
                  onChange={() => setStatus('Draft')}
                  className="text-navy-900"
                />
                <span>Draft (Admins & Section Leaders only)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700">
                <input
                  type="radio"
                  name="status"
                  value="Published"
                  checked={status === 'Published'}
                  onChange={() => setStatus('Published')}
                  className="text-navy-900"
                />
                <span>Published (Visible to all singers)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-navy-900 disabled:opacity-50"
            >
              {busy ? 'Creating...' : isDuplicate ? 'Create Duplicate' : 'Create Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
