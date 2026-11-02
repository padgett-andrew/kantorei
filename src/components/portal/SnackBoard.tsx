import { useState } from 'react';
import { AlertTriangle, Coffee, Plus, UserCheck, X } from 'lucide-react';
import type { ScheduleEvent, Singer } from '../../types/choir';
import { formatEventDate } from '../../lib/utils';

interface Props {
  singer: Singer;
  initialEvents: ScheduleEvent[];
}

export default function SnackBoard({ singer, initialEvents }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function toggleSlot(eventId: string, slot: 1 | 2, action: 'claim' | 'release') {
    const key = `${eventId}-${slot}`;
    setBusyKey(key);
    setErrorBanner(null);

    // Snapshot for instant rollback if 409 Conflict occurs
    const previous = events;

    // Optimistic UI update
    setEvents((curr) =>
      curr.map((ev) => {
        if (ev.eventId !== eventId) return ev;
        const nextName = action === 'claim' ? singer.name : '';
        return slot === 1 ? { ...ev, snack1Name: nextName } : { ...ev, snack2Name: nextName };
      })
    );

    try {
      const res = await fetch('/api/snacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, slot, action }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        event?: ScheduleEvent;
        error?: string;
      };

      if (!res.ok || !data.event) {
        setEvents(previous);
        setErrorBanner(
          data.error ??
            'Someone else just updated that snack slot—refreshing to show the latest signup.'
        );
        return;
      }

      setEvents((curr) =>
        curr.map((ev) => (ev.eventId === eventId ? data.event! : ev))
      );
    } catch {
      setEvents(previous);
      setErrorBanner('Network error saving snack signup. Please try again.');
    } finally {
      setBusyKey(null);
    }
  }

  function renderSlotCard(ev: ScheduleEvent, slot: 1 | 2) {
    const holder = (slot === 1 ? ev.snack1Name : ev.snack2Name).trim();
    const isMine = holder.toLowerCase() === singer.name.trim().toLowerCase();
    const canRelease = isMine || (Boolean(holder) && singer.role === 'Admin');
    const isBusy = busyKey === `${ev.eventId}-${slot}`;

    if (!holder) {
      return (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => toggleSlot(ev.eventId, slot, 'claim')}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-3 text-left transition hover:border-navy-900 hover:bg-ivory-100/60 disabled:opacity-60"
        >
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Snack Slot {slot}
            </span>
            <span className="text-sm font-semibold text-navy-900">
              + Claim Hospitality Slot
            </span>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-zinc-200 text-navy-900">
            <Plus className="h-4 w-4" />
          </span>
        </button>
      );
    }

    return (
      <div
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 ${
          isMine
            ? 'border-emerald-300 bg-emerald-50/70'
            : 'border-zinc-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <UserCheck
            className={`h-4 w-4 shrink-0 ${
              isMine ? 'text-emerald-700' : 'text-gold-500'
            }`}
          />
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Snack Slot {slot} {isMine ? '· You!' : ''}
            </span>
            <span className="text-sm font-semibold text-zinc-900">{holder}</span>
          </div>
        </div>

        {canRelease && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => toggleSlot(ev.eventId, slot, 'release')}
            title="Release snack slot"
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            Release
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {errorBanner && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{errorBanner}</span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
          No upcoming rehearsal snack dates scheduled right now.
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((ev) => (
            <div
              key={ev.eventId}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs sm:p-6"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="max-w-md">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-gold-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {ev.type} · {ev.time}
                    </span>
                  </div>
                  <h3 className="mt-1 font-editorial text-xl font-bold text-navy-950">
                    {formatEventDate(ev.date)} — {ev.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{ev.location}</p>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
                  {renderSlotCard(ev, 1)}
                  {renderSlotCard(ev, 2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

