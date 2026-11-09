import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
} from 'lucide-react';
import type { ScheduleEvent, Singer } from '../../types/choir';
import { formatSnackEntry, parseSnackEntry } from '../../types/choir';
import { eventTypeBadgeColor, formatEventDate } from '../../lib/utils';
import LocationDirectionsButton from '../common/LocationDirectionsButton';
import SnackClaimModal, { type ClaimModalState, type SlotNumber } from './snacks/SnackClaimModal';
import SnackSlotCard from './snacks/SnackSlotCard';
import { enqueueOfflineMutation } from '../../lib/offline-queue';
import { fetchWithTimeout } from '../../lib/fetch-with-timeout';

interface Props {
  singer: Singer;
  initialEvents: ScheduleEvent[];
}

export default function SnackBoard({ singer, initialEvents }: Props) {
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'concerts' | 'rehearsals' | 'mine' | 'open'>('all');

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
    if (filterMode === 'concerts') {
      return events.filter((ev) => ev.type === 'Concert' || ev.type === 'Dress');
    }
    if (filterMode === 'rehearsals') {
      return events.filter((ev) => ev.type !== 'Concert' && ev.type !== 'Dress');
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

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const targetEv = events.find((ev) => ev.eventId === eventId);
    const actionLabel = action === 'release' ? 'Release slot' : 'Claim slot';

    if (isOffline) {
      enqueueOfflineMutation({
        url: '/api/snacks',
        method: 'POST',
        body: { eventId, slot, action, item },
        label: `${actionLabel} (${targetEv?.title || eventId})`,
      });
      setBusyKey(null);
      return;
    }

    try {
      const res = await fetchWithTimeout(
        '/api/snacks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, slot, action, item }),
        },
        3500
      );

      const data = (await res.json()) as {
        event?: ScheduleEvent;
        schedule?: ScheduleEvent[];
        error?: string;
      };

      if (!res.ok || !data.event) {
        setEvents(previous);
        setErrorBanner(data.error ?? 'Unable to update duty slot. Please refresh.');
        return;
      }

      const updated = data.event;
      setEvents((current) =>
        current.map((ev) => (ev.eventId === updated.eventId ? updated : ev))
      );
    } catch (err) {
      const isNetworkDrop =
        err instanceof TypeError ||
        (err instanceof Error && err.name === 'TimeoutError') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isNetworkDrop) {
        enqueueOfflineMutation({
          url: '/api/snacks',
          method: 'POST',
          body: { eventId, slot, action, item },
          label: `${actionLabel} (${targetEv?.title || eventId})`,
        });
        // Retain optimistic UI state
      } else {
        setEvents(previous);
        setErrorBanner('Network error saving your signup. Please check your connection.');
      }
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
      eventType: ev.type,
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

  const filterTabs: { id: typeof filterMode; label: string }[] = [
    { id: 'all', label: `All Calls (${events.length})` },
    { id: 'concerts', label: 'Concert Crew' },
    { id: 'rehearsals', label: 'Rehearsal Duties' },
    { id: 'open', label: 'Open Slots' },
    { id: 'mine', label: `My Commitments (${mySignupsCount})` },
  ];

  return (
    <div className="space-y-8">
      {/* Hairline Numerical Summary Ledger */}
      <div className="grid grid-cols-3 divide-x divide-stone-200/90 border-y border-stone-200/90 py-4">
        <div className="pr-4 sm:pr-8">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            My Commitments
          </span>
          <p className="mt-1 font-editorial text-3xl font-normal tabular-nums text-navy-950">
            {mySignupsCount}
          </p>
        </div>

        <div className="px-4 sm:px-8">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Open Slots
          </span>
          <p className="mt-1 font-editorial text-3xl font-normal tabular-nums text-copper-600">
            {totalOpenSlots}
          </p>
        </div>

        <div className="pl-4 sm:pl-8">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Upcoming Calls
          </span>
          <p className="mt-1 font-editorial text-3xl font-normal tabular-nums text-navy-950">
            {events.length}
          </p>
        </div>
      </div>

      {/* Editorial Underline Filter Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200/90">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {filterTabs.map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`relative cursor-pointer pb-3 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                  isActive
                    ? 'text-navy-950'
                    : 'text-stone-500 hover:text-navy-950'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-copper-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorBanner && (
        <div className="flex items-center gap-2.5 rounded-sm border border-[#e4c4bc] bg-[#f7ebe8] p-4 text-sm text-[#84372d]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#84372d]" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Event Call Sheets */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-sm border border-stone-200/90 bg-white px-6 py-12 text-center">
          {filterMode === 'mine' ? (
            <div className="space-y-2">
              <p className="font-editorial text-2xl text-navy-950">
                No sign-up or crew commitments claimed yet
              </p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-stone-500">
                Select any open slot on an upcoming rehearsal or concert call to volunteer.
              </p>
              <button
                type="button"
                onClick={() => setFilterMode('open')}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-navy-950 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-navy-900"
              >
                Browse Open Slots
              </button>
            </div>
          ) : (
            <p className="font-editorial text-xl text-navy-950">
              No ensemble calls match this filter.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredEvents.map((ev) => {
            const filledCount = [1, 2, 3, 4].filter((s) => {
              const r = getSlotRaw(ev, s as SlotNumber);
              return r && r.trim() !== '';
            }).length;

            const isConcertCall = ev.type === 'Concert' || ev.type === 'Dress';

            return (
              <section
                key={ev.eventId}
                className={`rounded-sm border border-stone-200/90 bg-white p-5 sm:p-6 ${
                  isConcertCall ? 'border-l-2 border-l-copper-500' : ''
                }`}
              >
                <div className="flex flex-col justify-between gap-3 border-b border-stone-200/80 pb-4 sm:flex-row sm:items-baseline">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${eventTypeBadgeColor(
                          ev.type
                        )}`}
                      >
                        {ev.type}
                      </span>
                      <span className="text-xs text-stone-300" aria-hidden="true">·</span>
                      <span className="text-xs font-medium text-stone-600">{ev.time}</span>
                      <span className="text-xs text-stone-300" aria-hidden="true">·</span>
                      <LocationDirectionsButton location={ev.location} />
                    </div>
                    <h3 className="mt-2 font-editorial text-2xl font-normal text-navy-950 sm:text-[26px]">
                      {formatEventDate(ev.date)} — {ev.title}
                    </h3>
                    {ev.notes && <p className="mt-1 text-xs text-stone-500">{ev.notes}</p>}
                  </div>

                  {/* Understated Tabular Slot Count */}
                  <div className="shrink-0">
                    {filledCount === 4 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#c8d8ce] bg-[#eef3f0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2d523d]">
                        <Check className="h-3 w-3" />
                        All 4 Filled
                      </span>
                    ) : (
                      <span className="text-xs font-medium tabular-nums text-stone-500">
                        <strong className="font-semibold text-navy-950">{filledCount} / 4</strong> claimed ·{' '}
                        <span className="text-copper-600">{4 - filledCount} open</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Duties / Sign-Up Slots Grid */}
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
              </section>
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
