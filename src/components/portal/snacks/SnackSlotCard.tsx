import {
  Coffee,
  Edit2,
  PackageCheck,
  Plus,
  Ticket,
  Truck,
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

function getDefaultSlotLabel(ev: ScheduleEvent, slot: SlotNumber, customDuty?: string): string {
  if (customDuty && customDuty.trim()) {
    return customDuty.trim();
  }
  const isConcertCall = ev.type === 'Concert' || ev.type === 'Dress';
  if (isConcertCall) {
    if (slot === 1) return 'Concert Setup & Stage';
    if (slot === 2) return 'Concert Strike & Teardown';
    if (slot === 3) return 'Box Office & Will-Call';
    return 'Patron Reception';
  }
  return `Snack Spot ${slot}`;
}

function getDutyIcon(dutyText: string) {
  const lower = dutyText.toLowerCase();
  const iconClass = 'h-3.5 w-3.5 shrink-0 text-copper-600';
  if (lower.includes('setup') || lower.includes('riser') || lower.includes('stage')) return <Wrench className={iconClass} />;
  if (lower.includes('strike') || lower.includes('teardown') || lower.includes('clean')) return <PackageCheck className={iconClass} />;
  if (lower.includes('box office') || lower.includes('ticket') || lower.includes('door') || lower.includes('usher')) return <Ticket className={iconClass} />;
  if (lower.includes('transport') || lower.includes('truck') || lower.includes('banner')) return <Truck className={iconClass} />;
  if (lower.includes('reception') || lower.includes('drink') || lower.includes('wine') || lower.includes('coffee') || lower.includes('water')) return <Coffee className={iconClass} />;
  return <Utensils className={iconClass} />;
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
  const defaultLabel = getDefaultSlotLabel(ev, slot, !holderName ? item : undefined);

  // Vacant Slot -> Claim Button
  if (!holderName) {
    return (
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onOpenClaim(ev, slot)}
        className="group relative flex w-full cursor-pointer flex-col justify-between rounded-sm border border-dashed border-stone-300/90 bg-[#FAF7F2]/60 p-3.5 text-left transition hover:border-copper-500 hover:bg-[#FAF7F2] disabled:opacity-50"
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400 group-hover:text-copper-600">
            0{slot} · Open
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-stone-300 bg-white text-stone-600 transition group-hover:border-copper-600 group-hover:bg-copper-600 group-hover:text-white">
            <Plus className="h-3 w-3" />
          </span>
        </div>

        <div className="mt-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-navy-950">
            {getDutyIcon(defaultLabel)}
            <span className="truncate">{defaultLabel}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-stone-400 group-hover:text-stone-600">
            Claim slot
          </p>
        </div>
      </button>
    );
  }

  // Claimed Slot
  return (
    <div
      className={`flex w-full flex-col justify-between rounded-sm border p-3.5 transition ${
        isMine
          ? 'border-copper-400/80 bg-[#f9efe8]/45'
          : 'border-stone-200/90 bg-white hover:border-stone-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            0{slot}
          </span>
          {isMine && (
            <span className="rounded-sm bg-copper-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
              Yours
            </span>
          )}
        </div>

        {/* Quick Actions (Edit Item / Release) */}
        <div className="flex items-center gap-0.5">
          {isMine && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onOpenClaim(ev, slot)}
              title="Edit your duty or food item"
              className="cursor-pointer rounded-sm p-1 text-stone-400 transition hover:bg-white hover:text-navy-950"
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
              className="cursor-pointer rounded-sm p-1 text-stone-400 transition hover:bg-[#f7ebe8] hover:text-[#84372d]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Singer Name */}
      <div className="mt-2 min-w-0">
        <span className="block truncate font-editorial text-lg font-medium leading-snug text-navy-950">
          {holderName}
        </span>

        {/* Optional item / duty description */}
        {item ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-700">
            {getDutyIcon(item)}
            <span className="truncate">{item}</span>
          </div>
        ) : isMine ? (
          <button
            type="button"
            onClick={() => onOpenClaim(ev, slot)}
            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-copper-700 hover:underline"
          >
            <Plus className="h-3 w-3" />
            Specify snack or duty
          </button>
        ) : (
          <p className="mt-1 text-xs italic text-stone-400">{defaultLabel}</p>
        )}
      </div>
    </div>
  );
}
