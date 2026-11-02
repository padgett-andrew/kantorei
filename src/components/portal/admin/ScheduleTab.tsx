import {
  Calendar,
  Clock,
  Coffee,
  Edit3,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import LocationDirectionsButton from '../../common/LocationDirectionsButton';
import { EVENT_TYPES, parseSnackEntry, type EventType, type ScheduleEvent } from '../../../types/choir';
import { eventTypeBadgeColor, formatShortMonthDay } from '../../../lib/utils';

interface Props {
  scheduleList: ScheduleEvent[];
  todayIso: string;
  isAdmin: boolean;
  calendarId?: string;
  syncingCalendar: boolean;
  scheduleSearch: string;
  onSearchChange: (q: string) => void;
  scheduleTypeFilter: 'All' | EventType;
  onTypeFilterChange: (t: 'All' | EventType) => void;
  scheduleTimeframe: 'all' | 'upcoming' | 'past';
  onTimeframeChange: (tf: 'all' | 'upcoming' | 'past') => void;
  onSyncCalendar: () => void;
  onOpenCreateEvent: () => void;
  onOpenEditEvent: (ev: ScheduleEvent) => void;
  onOpenDeleteEvent: (ev: ScheduleEvent) => void;
}

export default function ScheduleTab({
  scheduleList,
  todayIso,
  isAdmin,
  calendarId,
  syncingCalendar,
  scheduleSearch,
  onSearchChange,
  scheduleTypeFilter,
  onTypeFilterChange,
  scheduleTimeframe,
  onTimeframeChange,
  onSyncCalendar,
  onOpenCreateEvent,
  onOpenEditEvent,
  onOpenDeleteEvent,
}: Props) {
  const upcomingCallsCount = scheduleList.filter((ev) => ev.date >= todayIso).length;
  const rehearsalsCount = scheduleList.filter((ev) => ev.type === 'Rehearsal').length;
  const concertsCount = scheduleList.filter((ev) => ev.type === 'Concert').length;

  const filteredSchedule = scheduleList.filter((ev) => {
    if (scheduleTimeframe === 'upcoming' && ev.date < todayIso) return false;
    if (scheduleTimeframe === 'past' && ev.date >= todayIso) return false;

    if (scheduleTypeFilter !== 'All' && ev.type !== scheduleTypeFilter) return false;

    if (scheduleSearch.trim()) {
      const q = scheduleSearch.toLowerCase();
      const matchesTitle = ev.title.toLowerCase().includes(q);
      const matchesLocation = ev.location.toLowerCase().includes(q);
      const matchesDate = ev.date.toLowerCase().includes(q);
      const matchesType = ev.type.toLowerCase().includes(q);
      const matchesNotes = (ev.description || ev.notes || '').toLowerCase().includes(q);
      if (!matchesTitle && !matchesLocation && !matchesDate && !matchesType && !matchesNotes) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Google Calendar Master Sync Card */}
      <div className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white to-ivory-50/70 p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-gold-400">
                <Calendar className="h-4 w-4" />
              </span>
              <h3 className="font-editorial text-xl font-bold text-navy-950 sm:text-2xl">
                Google Calendar Integration
              </h3>
              {calendarId && calendarId !== 'DEMO' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live Sync ({calendarId})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Demo Calendar Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
              Manage calls, recurring rehearsals, concert times, and locations directly in your official ensemble Google Calendar.
              The portal automatically syncs changes and updates singer subscriptions on Apple Calendar, Outlook, and Google Calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={
                calendarId && calendarId !== 'DEMO'
                  ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`
                  : 'https://calendar.google.com/calendar/u/0/r'
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
            >
              <ExternalLink className="h-4 w-4 text-gold-400" />
              Open Google Calendar
            </a>

            <button
              type="button"
              disabled={syncingCalendar}
              onClick={onSyncCalendar}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-navy-900 hover:text-navy-950 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 text-zinc-500 ${syncingCalendar ? 'animate-spin' : ''}`} />
              {syncingCalendar ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Filter and Search Bar */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search calls by title, notes, location, or date..."
              value={scheduleSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-12 py-2 text-sm text-navy-950 placeholder:text-zinc-400 focus:border-navy-900 focus:outline-none"
            />
            {scheduleSearch && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Timeframe selector */}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => onTimeframeChange('upcoming')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scheduleTimeframe === 'upcoming'
                  ? 'bg-white text-navy-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Upcoming Calls ({upcomingCallsCount})
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange('all')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scheduleTimeframe === 'all'
                  ? 'bg-white text-navy-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Calls ({scheduleList.length})
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange('past')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                scheduleTimeframe === 'past'
                  ? 'bg-white text-navy-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Event Type Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Call Type:
          </span>
          {(['All', ...EVENT_TYPES] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeFilterChange(t)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                scheduleTypeFilter === t
                  ? 'bg-navy-900 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Upcoming Calls
          </span>
          <p className="mt-1 font-editorial text-2xl font-bold text-navy-950">
            {upcomingCallsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Concerts
          </span>
          <p className="mt-1 font-editorial text-2xl font-bold text-amber-700">
            {concertsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Rehearsals
          </span>
          <p className="mt-1 font-editorial text-2xl font-bold text-navy-900">
            {rehearsalsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Total Season Events
          </span>
          <p className="mt-1 font-editorial text-2xl font-bold text-zinc-800">
            {scheduleList.length}
          </p>
        </div>
      </div>

      {/* Event Cards List */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-ivory-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-navy-900" />
            <h2 className="font-sans text-sm font-bold text-navy-950 sm:text-base">
              Choir Calendar Calls ({filteredSchedule.length})
            </h2>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-navy-800"
            >
              <Plus className="h-3.5 w-3.5 text-gold-400" />
              Add Event
            </button>
          )}
        </div>

        {filteredSchedule.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm font-semibold text-navy-950">No events matched your filters.</p>
            <p className="mt-1 text-xs text-zinc-500">Try adjusting your search query, type filter, or timeframe.</p>
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800"
              >
                <Plus className="h-3.5 w-3.5 text-gold-400" />
                Create First Event
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {filteredSchedule.map((ev) => {
              const { weekday, month, day } = formatShortMonthDay(ev.date);
              const isToday = ev.date === todayIso;
              const isPast = ev.date < todayIso;
              const claimedSnacks = [ev.snack1Name, ev.snack2Name, ev.snack3Name, ev.snack4Name]
                .filter(Boolean)
                .map((s) => parseSnackEntry(s).name);
              const hasCallTimeInText =
                ev.time.toLowerCase().includes('call') || ev.time.includes('/');

              return (
                <li
                  key={ev.eventId}
                  className={`flex flex-col gap-4 p-5 transition sm:p-6 ${
                    isPast ? 'bg-zinc-50/50 opacity-80 hover:opacity-100' : 'hover:bg-ivory-50/50'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    {/* Left: Date Block & Info */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-ivory-50 text-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                          {month}
                        </span>
                        <span className="text-xl font-bold leading-tight text-navy-950">{day}</span>
                        <span className="text-[10px] font-medium text-zinc-400">{weekday}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-sans text-base font-bold text-navy-950">
                            {ev.title}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${eventTypeBadgeColor(
                              ev.type
                            )}`}
                          >
                            {ev.type}
                          </span>
                          {isToday && (
                            <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                              Today
                            </span>
                          )}
                          {isPast && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                              Past
                            </span>
                          )}
                        </div>

                        {/* Time & Location */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600">
                          <span
                            className={`inline-flex items-center gap-1.5 ${
                              hasCallTimeInText
                                ? 'rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-900 border border-amber-200'
                                : 'font-medium'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            {ev.time}
                          </span>
                          <LocationDirectionsButton location={ev.location} />
                        </div>

                        {/* Description / Rehearsal Notes */}
                        {(ev.description || ev.notes) && (
                          <div className="mt-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-3.5 text-xs text-zinc-700">
                            <span className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-gold-600">
                              <FileText className="h-3 w-3" />
                              Call Details & Rehearsal Focus
                            </span>
                            <p className="whitespace-pre-line leading-relaxed">
                              {ev.description || ev.notes}
                            </p>
                          </div>
                        )}

                        {/* Hospitality Signups */}
                        {claimedSnacks.length > 0 && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-600">
                            <Coffee className="h-3.5 w-3.5 text-gold-600" />
                            <span className="font-semibold text-zinc-500">Hospitality:</span>
                            <span>{claimedSnacks.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => onOpenEditEvent(ev)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-navy-900 hover:text-navy-950"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeleteEvent(ev)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

