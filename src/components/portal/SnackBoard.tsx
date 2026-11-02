import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  Coffee,
  Sparkles,
} from 'lucide-react';
import type { ScheduleEvent, Singer } from '../../types/choir';
import { formatSnackEntry, parseSnackEntry } from '../../types/choir';
import { formatEventDate } from '../../lib/utils';
import SnackClaimModal, { type ClaimModalState, type SlotNumber } from './snacks/SnackClaimModal';
import SnackSlotCard from './snacks/SnackSlotCard';

interface Props {
  singer: Singer;
  initialEvents: ScheduleEvent[];
}

export default function SnackBoard({ singer, initialEvents }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'open'>('all');

  const [modalState, setModalState] = useState<ClaimModalState | null>(null);
  const [itemInput, setItemInput] = useState('');

  const myNormalizedName = singer.name.trim().toLowerCase();

  function getSlotRaw(ev: ScheduleEvent, slot: SlotNumber): string {
    if (slot === 1) return ev.snack1Name;
    if (slot === 2) return ev.snack2Name;
    if (slot === 3) return ev.snack3Name;
    return ev.snack4Name;
  }

  const mySignupsCount = useMemo(() => {
    return events.reduce((count, ev) => {
      const isMine = [1, 2, 3, 4].some((slot) => {
        const { name } = parseSnackEntry(getSlotRaw(ev, slot as SlotNumber));
        return name.toLowerCase() === myNormalizedName;
      });
      return count + (isMine ? 1 : 0);
    }, 0);
  }, [events, myNormalizedName]);

  const totalOpenSlots = useMemo(() => {
    return events.reduce((count, ev) => {
      const openInEvent = [1, 2, 3, 4].filter((slot) => {
        const raw = getSlotRaw(ev, slot as SlotNumber);
        return !raw || raw.trim() === '';
      }).length;
      return count + openInEvent;
    }, 0);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (filterMode === 'mine') {
      return events.filter((ev) =>
        [1, 2, 3, 4].some((slot) => {
          const { name } = parseSnackEntry(getSlotRaw(ev, slot as SlotNumber));
          return name.toLowerCase() === myNormalizedName;
        })
      );
    }
    if (filterMode === 'open') {
      return events.filter((ev) =>
        [1, 2, 3, 4].some((slot) => {
          const raw = getSlotRaw(ev, slot as SlotNumber);
          return !raw || raw.trim() === '';
        })
      );
    }
    return events;
  }, [events, filterMode, myNormalizedName]);

  async function executeSlotMutation(
    eventId: string,
    slot: SlotNumber,
    action: 'claim' | 'release' | 'update_item',
    item?: string
  ) {
    const key = `${eventId}-${slot}`;
    setBusyKey(key);
    setErrorBanner(null);

    const previous = events;
    setEvents((current) =>
      current.map((ev) => {
        if (ev.eventId !== eventId) return ev;
        const currentRaw = getSlotRaw(ev, slot);
        const parsed = parseSnackEntry(currentRaw);
        const holderName = action === 'update_item' ? parsed.name || singer.name : singer.name;
        const nextVal = action === 'release' ? '' : formatSnackEntry(holderName, item);
        return {
          ...ev,
          snack1Name: slot === 1 ? nextVal : ev.snack1Name,
          snack2Name: slot === 2 ? nextVal : ev.snack2Name,
          snack3Name: slot === 3 ? nextVal : ev.snack3Name,
          snack4Name: slot === 4 ? nextVal : ev.snack4Name,
        };
      })
    );

    try {
      const res = await fetch('/api/snacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, slot, action, item }),
      });

      const data = (await res.json()) as {
        event?: ScheduleEvent;
        schedule?: ScheduleEvent[];
        error?: string;
      };

      if (!res.ok || !data.event) {
        setEvents(previous);
        setErrorBanner(data.error ?? 'Unable to update snack slot. Please refresh.');
        return;
      }

      const updated = data.event;
      setEvents((current) =>
        current.map((ev) => (ev.eventId === updated.eventId ? updated : ev))
      );
    } catch {
      setEvents(previous);
      setErrorBanner('Network error saving your signup. Please check your connection.');
    } finally {
      setBusyKey(null);
    }
  }

  function openClaimModal(ev: ScheduleEvent, slot: SlotNumber) {
    const currentRaw = getSlotRaw(ev, slot);
    const parsed = parseSnackEntry(currentRaw);
    const isMine = parsed.name.toLowerCase() === myNormalizedName;

    setModalState({
      eventId: ev.eventId,
      slot,
      action: isMine ? 'update_item' : 'claim',
      eventTitle: ev.title,
      eventDate: ev.date,
      initialItem: parsed.item || '',
    });
    setItemInput(parsed.item || '');
  }

  function handleModalSubmit() {
    if (!modalState) return;
    const { eventId, slot, action } = modalState;
    void executeSlotMutation(eventId, slot, action, itemInput);
    setModalState(null);
  }

  function handleRelease(eventId: string, slot: SlotNumber) {
    void executeSlotMutation(eventId, slot, 'release');
  }

  return (
    <div className="space-y-6">
      {/* Overview Statistics Banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                My Signups
              </span>
              <p className="font-editorial text-2xl font-bold text-navy-950">{mySignupsCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Open Slots Available
              </span>
              <p className="font-editorial text-2xl font-bold text-navy-950">{totalOpenSlots}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
              <Coffee className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Rehearsal Calls
              </span>
              <p className="font-editorial text-2xl font-bold text-navy-950">{events.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-zinc-100/80 p-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'all'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Rehearsals ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('open')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'open'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Has Open Slots
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mine')}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'mine'
                ? 'bg-white text-navy-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="h-3 w-3 text-gold-500" />
            My Signups ({mySignupsCount})
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          4 hospitality slots per rehearsal (drinks, savory, sweet, fruit)
        </p>
      </div>

      {/* Error Alert */}
      {errorBanner && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {filterMode === 'mine' ? (
            <div className="space-y-2">
              <Coffee className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="font-semibold text-navy-950">You haven&apos;t claimed any hospitality slots yet.</p>
              <p className="text-xs text-zinc-400">
                Click on any open slot below to sign up to bring a treat or drink to rehearsal!
              </p>
              <button
                type="button"
                onClick={() => setFilterMode('open')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Browse Open Slots
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Calendar className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="font-semibold text-navy-950">No rehearsal calls match this filter.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredEvents.map((ev) => {
            const filledCount = [1, 2, 3, 4].filter((s) => {
              const r = getSlotRaw(ev, s as SlotNumber);
              return r && r.trim() !== '';
            }).length;

            return (
              <div
                key={ev.eventId}
                className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-2xs sm:p-6"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gold-600">
                        <Coffee className="h-3.5 w-3.5" />
                        {ev.type}
                      </span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs font-medium text-zinc-500">{ev.time}</span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs text-zinc-500">{ev.location}</span>
                    </div>
                    <h3 className="mt-1 font-editorial text-xl font-bold text-navy-950 sm:text-2xl">
                      {formatEventDate(ev.date)} — {ev.title}
                    </h3>
                    {ev.notes && <p className="mt-0.5 text-xs text-zinc-500">{ev.notes}</p>}
                  </div>

                  {/* Slot progress pill */}
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        filledCount === 4
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : filledCount >= 2
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {filledCount === 4 ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                          All 4 slots filled!
                        </>
                      ) : (
                        `${filledCount} of 4 slots filled (${4 - filledCount} needed)`
                      )}
                    </span>
                  </div>
                </div>

                {/* 4 Hospitality Slots Grid */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([1, 2, 3, 4] as const).map((slot) => (
                    <SnackSlotCard
                      key={slot}
                      ev={ev}
                      slot={slot}
                      raw={getSlotRaw(ev, slot)}
                      singer={singer}
                      myNormalizedName={myNormalizedName}
                      isBusy={busyKey === `${ev.eventId}-${slot}`}
                      onOpenClaim={openClaimModal}
                      onRelease={handleRelease}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim / Edit Item Modal */}
      <SnackClaimModal
        modalState={modalState}
        singer={singer}
        itemInput={itemInput}
        onItemInputChange={setItemInput}
        onSubmit={handleModalSubmit}
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
