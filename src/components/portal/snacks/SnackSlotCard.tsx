import { Edit2, Plus, UserCheck, Utensils, X } from 'lucide-react';
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
              onClick={() => onOpenClaim(ev, slot)}
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
              onClick={() => onRelease(ev.eventId, slot)}
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
            onClick={() => onOpenClaim(ev, slot)}
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

