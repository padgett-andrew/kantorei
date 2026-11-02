import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Coffee,
  Edit2,
  Heart,
  Plus,
  Sparkles,
  UserCheck,
  Utensils,
  X,
} from 'lucide-react';
import {
  formatSnackEntry,
  parseSnackEntry,
  type ScheduleEvent,
  type Singer,
} from '../../types/choir';
import { formatEventDate } from '../../lib/utils';

interface Props {
  singer: Singer;
  initialEvents: ScheduleEvent[];
}

type SlotNumber = 1 | 2 | 3 | 4;

interface ClaimModalState {
  eventId: string;
  slot: SlotNumber;
  action: 'claim' | 'update_item';
  eventTitle: string;
  eventDate: string;
  initialItem: string;
}

const SNACK_SUGGESTIONS = [
  '🍇 Fresh fruit (grapes, clementines, berries)',
  '🍪 Cookies or brownies (nut-free)',
  '🧀 Cheese & crackers',
  '💧 Sparkling water or juice',
  '🥨 Pretzels, chips & salsa',
  '🥕 Veggies & hummus dip',
];

export default function SnackBoard({ singer, initialEvents }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'open'>('all');

  // Modal state for claiming a slot or updating what you plan to bring
  const [modalState, setModalState] = useState<ClaimModalState | null>(null);
  const [itemInput, setItemInput] = useState('');

  const myNormalizedName = singer.name.trim().toLowerCase();

  // Helper to read slot string from event
  function getSlotRaw(ev: ScheduleEvent, slot: SlotNumber): string {
    if (slot === 1) return ev.snack1Name;
    if (slot === 2) return ev.snack2Name;
    if (slot === 3) return ev.snack3Name;
    return ev.snack4Name;
  }

  // Count my signups across all events
  const mySignupsCount = useMemo(() => {
    return events.reduce((count, ev) => {
      const isMine = [1, 2, 3, 4].some((slot) => {
        const { name } = parseSnackEntry(getSlotRaw(ev, slot as SlotNumber));
        return name.toLowerCase() === myNormalizedName;
      });
      return count + (isMine ? 1 : 0);
    }, 0);
  }, [events, myNormalizedName]);

  // Count total open slots
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

    // Optimistic UI update
    setEvents((curr) =>
      curr.map((ev) => {
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
        body: JSON.stringify({ eventId, slot, action, item: item?.trim() || undefined }),
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
            'Someone else just updated that hospitality slot—refreshing to show the latest signups.'
        );
        return;
      }

      setEvents((curr) => curr.map((ev) => (ev.eventId === eventId ? data.event! : ev)));
    } catch {
      setEvents(previous);
      setErrorBanner('Network error saving hospitality signup. Please try again.');
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

  function renderSlotCard(ev: ScheduleEvent, slot: SlotNumber) {
    const raw = getSlotRaw(ev, slot);
    const { name: holderName, item } = parseSnackEntry(raw);
    const isMine = holderName.toLowerCase() === myNormalizedName;
    const canRelease = isMine || (Boolean(holderName) && singer.role === 'Admin');
    const isBusy = busyKey === `${ev.eventId}-${slot}`;

    // Vacant Slot -> Claim Button
    if (!holderName) {
      return (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => openClaimModal(ev, slot)}
          className="group relative flex w-full cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-3.5 text-left transition hover:border-navy-900 hover:bg-ivory-50/70 disabled:opacity-50"
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-gold-600">
              Slot {slot} · Open
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-navy-900 shadow-2xs group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-gold-300 transition">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-2">
            <span className="text-xs font-semibold text-navy-950 group-hover:text-navy-900">
              + Claim Slot
            </span>
            <p className="mt-0.5 text-[11px] text-zinc-400">Add name & optional snack item</p>
          </div>
        </button>
      );
    }

    // Claimed Slot
    return (
      <div
        className={`flex w-full flex-col justify-between rounded-2xl border p-3.5 transition shadow-2xs ${
          isMine
            ? 'border-emerald-300/90 bg-emerald-50/60'
            : 'border-zinc-200/90 bg-white hover:border-zinc-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <UserCheck
              className={`h-3.5 w-3.5 shrink-0 ${
                isMine ? 'text-emerald-700' : 'text-gold-500'
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Slot {slot}
            </span>
            {isMine && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                You
              </span>
            )}
          </div>

          {/* Quick Actions (Edit Item / Release) */}
          <div className="flex items-center gap-1">
            {isMine && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => openClaimModal(ev, slot)}
                title="Edit what you are bringing"
                className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-white hover:text-navy-900"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
            {canRelease && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleRelease(ev.eventId, slot)}
                title="Release hospitality slot"
                className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Singer Name */}
        <div className="mt-2 min-w-0">
          <span className="block truncate text-xs font-bold text-navy-950 sm:text-sm">
            {holderName}
          </span>

          {/* Optional item description */}
          {item ? (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-gold-700">
              <Utensils className="h-3 w-3 shrink-0 text-gold-500" />
              <span className="truncate">{item}</span>
            </div>
          ) : isMine ? (
            <button
              type="button"
              onClick={() => openClaimModal(ev, slot)}
              className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add what you&apos;re bringing
            </button>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400 italic">No specific item noted</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Statistics Banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
              <Coffee className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-500">Upcoming Rehearsals</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-navy-950">{events.length}</p>
          <p className="text-[11px] text-zinc-400">4 volunteer slots per rehearsal</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-500">Open Volunteer Slots</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gold-600">{totalOpenSlots}</p>
          <p className="text-[11px] text-zinc-400">Open slots across this concert cycle</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-500">Your Commitments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{mySignupsCount}</p>
          <p className="text-[11px] text-zinc-400">
            {mySignupsCount > 0 ? 'Thank you for supporting break!' : 'Claim a date below!'}
          </p>
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
            Needs Volunteers ({totalOpenSlots} open)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mine')}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterMode === 'mine'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            My Signups ({mySignupsCount})
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Reminder: Kantorei maintains a <strong>nut-conscious</strong> policy for all break snacks.
        </p>
      </div>

      {errorBanner && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Rehearsal Cards List */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {filterMode === 'mine' ? (
            <div className="space-y-2">
              <p className="font-semibold text-zinc-700">You haven&apos;t signed up for any snack dates yet.</p>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="cursor-pointer font-semibold text-gold-500 underline"
              >
                View all rehearsals to claim a slot
              </button>
            </div>
          ) : filterMode === 'open' ? (
            <div className="space-y-1">
              <p className="font-semibold text-emerald-800">All hospitality slots are fully filled!</p>
              <p className="text-xs text-zinc-500">Thank you to everyone who stepped up to bring treats.</p>
            </div>
          ) : (
            'No upcoming rehearsal hospitality dates scheduled.'
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
                  {renderSlotCard(ev, 1)}
                  {renderSlotCard(ev, 2)}
                  {renderSlotCard(ev, 3)}
                  {renderSlotCard(ev, 4)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim / Edit Item Modal */}
      {modalState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs"
          onClick={() => setModalState(null)}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/80 bg-ivory-50 px-6 py-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  {modalState.action === 'claim' ? 'Hospitality Signup' : 'Edit Your Item'} · Slot{' '}
                  {modalState.slot}
                </span>
                <h3 className="font-editorial text-lg font-bold text-navy-950">
                  {formatEventDate(modalState.eventDate)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="cursor-pointer rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200/70 hover:text-navy-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-500">Signing Up As</label>
                <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm font-semibold text-navy-950">
                  {singer.name} ({singer.voicePart})
                </div>
              </div>

              <div>
                <label
                  htmlFor="snack-item"
                  className="flex items-center justify-between text-xs font-semibold text-zinc-700"
                >
                  <span>What do you plan to bring?</span>
                  <span className="text-zinc-400 font-normal">Optional</span>
                </label>
                <input
                  id="snack-item"
                  type="text"
                  maxLength={100}
                  value={itemInput}
                  onChange={(e) => setItemInput(e.target.value)}
                  placeholder="e.g. Clementines & cheese, cookies (nut-free), sparkling water…"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm text-navy-950 focus:border-navy-900 focus:outline-none"
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Entering this lets fellow singers know what&apos;s already covered so we have a great variety!
                </p>
              </div>

              {/* Quick suggestion chips */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-400">Quick Ideas:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SNACK_SUGGESTIONS.map((suggestion) => {
                    const cleanText = suggestion.replace(/^[^\s]+\s*/, '');
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setItemInput(cleanText)}
                        className="cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 transition hover:border-gold-500 hover:bg-ivory-50 hover:text-navy-900"
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-200/80 bg-zinc-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="cursor-pointer rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                className="cursor-pointer rounded-xl bg-navy-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-navy-800"
              >
                {modalState.action === 'claim' ? 'Confirm Slot Signup' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
