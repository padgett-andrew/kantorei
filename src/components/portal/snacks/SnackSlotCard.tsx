import {
  Coffee,
  Edit2,
  PackageCheck,
  Plus,
  Ticket,
  Truck,
  UserCheck,
  Utensils,
  Wrench,
  X,
} from 'lucide-react';
import { parseSnackEntry, type ScheduleEvent, type Singer } from '../../../types/choir';
import type { SlotNumber } from './SnackClaimModal';

interface Props {
  ev: ScheduleEvent;
  slot: SlotNumber;
  raw: string;
  singer: Singer;
  myNormalizedName: string;
  isBusy: boolean;
  onOpenClaim: (ev: ScheduleEvent, slot: SlotNumber) => void;
  onRelease: (eventId: string, slot: SlotNumber) => void;
}

function getDefaultSlotLabel(ev: ScheduleEvent, slot: SlotNumber): string {
  const isConcertCall = ev.type === 'Concert' || ev.type === 'Dress';
  if (isConcertCall) {
    if (slot === 1) return 'Concert Setup & Risers';
    if (slot === 2) return 'Concert Strike & Teardown';
    if (slot === 3) return 'Box Office & Will-Call';
    return 'Patron Reception';
  }
  if (slot === 3) return 'Room Setup & Welcome';
  return `Hospitality Slot ${slot}`;
}

function getDutyIcon(dutyText: string) {
  const lower = dutyText.toLowerCase();
  if (lower.includes('setup') || lower.includes('riser')) return <Wrench className="h-3 w-3 shrink-0 text-amber-600" />;
  if (lower.includes('strike') || lower.includes('teardown') || lower.includes('clean')) return <PackageCheck className="h-3 w-3 shrink-0 text-indigo-600" />;
  if (lower.includes('box office') || lower.includes('ticket') || lower.includes('door') || lower.includes('usher')) return <Ticket className="h-3 w-3 shrink-0 text-sky-600" />;
  if (lower.includes('transport') || lower.includes('truck') || lower.includes('banner')) return <Truck className="h-3 w-3 shrink-0 text-emerald-600" />;
  if (lower.includes('reception') || lower.includes('drink') || lower.includes('wine') || lower.includes('coffee')) return <Coffee className="h-3 w-3 shrink-0 text-gold-600" />;
  return <Utensils className="h-3 w-3 shrink-0 text-gold-500" />;
}

export default function SnackSlotCard({
  ev,
  slot,
  raw,
  singer,
  myNormalizedName,
  isBusy,
  onOpenClaim,
  onRelease,
}: Props) {
  const { name: holderName, item } = parseSnackEntry(raw);
  const isMine = holderName.toLowerCase() === myNormalizedName;
  const canRelease = isMine || (Boolean(holderName) && singer.role === 'Admin');
  const defaultLabel = getDefaultSlotLabel(ev, slot);

  // Vacant Slot -> Claim Button
  if (!holderName) {
    return (
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onOpenClaim(ev, slot)}
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
          <span className="text-xs font-semibold text-navy-950 group-hover:text-navy-900 block truncate">
            + {defaultLabel}
          </span>
          <p className="mt-0.5 text-[11px] text-zinc-400">Tap to claim this duty</p>
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
              onClick={() => onOpenClaim(ev, slot)}
              title="Edit your duty or food item"
              className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-white hover:text-navy-900"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          )}
          {canRelease && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRelease(ev.eventId, slot)}
              title="Release slot"
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

        {/* Optional item / duty description */}
        {item ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-navy-900">
            {getDutyIcon(item)}
            <span className="truncate">{item}</span>
          </div>
        ) : isMine ? (
          <button
            type="button"
            onClick={() => onOpenClaim(ev, slot)}
            className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            <Plus className="h-3 w-3" />
            Specify your duty or item
          </button>
        ) : (
          <p className="mt-1 text-[11px] text-zinc-400 italic">{defaultLabel}</p>
        )}
      </div>
    </div>
  );
}
