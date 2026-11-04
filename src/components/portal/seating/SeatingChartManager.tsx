import { useMemo, useState } from 'react';
import type {
  AbsenceRecord,
  ConcertEvent,
  ScheduleEvent,
  SectionGroup,
  SeatingChart,
  SeatingRow,
  SeatingSeat,
  Singer,
} from '../../../types/choir';
import { findSingerSeatInChart } from '../../../types/choir';
import type { SeatingDensity, SeatingMode, SeatingPerspective } from './types';
import AttendancePopover from './AttendancePopover';
import AttendanceStatsBar from './AttendanceStatsBar';
import ChartHeaderCard from './ChartHeaderCard';
import EditChartActionBar from './EditChartActionBar';
import FormationView from './FormationView';
import NewChartModal from './NewChartModal';
import PersonalSeatBanner from './PersonalSeatBanner';
import SeatingListView from './SeatingListView';
import SeatingToolbar from './SeatingToolbar';
import SingerPickerModal from './SingerPickerModal';
import UnassignedPool from './UnassignedPool';
import { useAttendanceManager } from './useAttendanceManager';
import { useSeatingEditor } from './useSeatingEditor';
import { AlertCircle, Check, X } from 'lucide-react';

interface Props {
  caller: Singer;
  initialCharts: SeatingChart[];
  roster: Singer[];
  upcomingEvents: ScheduleEvent[];
  allScheduleEvents?: ScheduleEvent[];
  initialAbsences: AbsenceRecord[];
  concerts: ConcertEvent[];
  currentSeason: string;
  initialMode?: SeatingMode;
  initialChartId?: string;
  initialEventId?: string;
}

export default function SeatingChartManager({
  caller,
  initialCharts,
  roster,
  upcomingEvents,
  allScheduleEvents = [],
  initialAbsences,
  concerts,
  currentSeason,
  initialMode = 'view',
  initialChartId,
  initialEventId,
}: Props) {
  // Permission checks
  const isAdmin = caller.role === 'Admin';
  const isSectionLeader = caller.role === 'Section_Leader';
  const canManageCharts = isAdmin;
  const canTakeAttendance = isAdmin || isSectionLeader;

  // Active chart state
  const [charts, setCharts] = useState<SeatingChart[]>(initialCharts);
  const [activeChartId, setActiveChartId] = useState<string>(
    initialChartId || charts[0]?.id || ''
  );

  const activeChart = useMemo(() => {
    return charts.find((c) => c.id === activeChartId) || charts[0] || null;
  }, [charts, activeChartId]);

  // View presentation state
  const [mode, setMode] = useState<SeatingMode>(initialMode);
  const [perspective, setPerspective] = useState<SeatingPerspective>('conductor');
  const [density, setDensity] = useState<SeatingDensity>('compact');
  const [layoutView, setLayoutView] = useState<'formation' | 'list'>('formation');
  const [sectionFilter, setSectionFilter] = useState<'All' | SectionGroup>('All');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // New chart modal state
  const [showNewChartModal, setShowNewChartModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<SeatingChart | null>(null);

  // Roster lookup map
  const rosterMap = useMemo(() => {
    const map = new Map<string, Singer>();
    for (const s of roster) {
      map.set(s.email.toLowerCase(), s);
    }
    return map;
  }, [roster]);

  // Seating editor hook (handles row geometry, seat swaps, and drag-and-drop)
  const editor = useSeatingEditor({
    activeChart,
    charts,
    setCharts,
    setActiveChartId,
    setMode,
    roster,
    setBanner,
  });

  const currentDisplayRows = mode === 'edit' ? editor.editableRows : activeChart?.rows || [];

  // Attendance manager hook (handles headcounts, event selector, and roll-call updates)
  const attendance = useAttendanceManager({
    allScheduleEvents,
    upcomingEvents,
    initialEventId,
    initialAbsences,
    currentDisplayRows,
    roster,
    caller,
    setBanner,
  });

  // Personal seat location for the logged-in singer
  const mySeatLocation = useMemo(() => {
    if (!activeChart) return null;
    return findSingerSeatInChart(activeChart, caller.email);
  }, [activeChart, caller.email]);

  const myNeighbors = useMemo(() => {
    if (!mySeatLocation || !activeChart) return null;
    const targetRow = activeChart.rows.find((r) => r.rowNumber === mySeatLocation.rowNumber);
    if (!targetRow) return null;

    const nonAisle = targetRow.seats.filter((s) => !s.isAisle);
    const myIdx = nonAisle.findIndex((s) => s.seatIndex === mySeatLocation.seatIndex);
    if (myIdx === -1) return null;

    return {
      leftSinger: myIdx > 0 ? nonAisle[myIdx - 1]?.singerName : undefined,
      rightSinger: myIdx < nonAisle.length - 1 ? nonAisle[myIdx + 1]?.singerName : undefined,
    };
  }, [mySeatLocation, activeChart]);

  // Assigned vs unassigned singer pools
  const assignedEmailSet = useMemo(() => {
    const set = new Set<string>();
    for (const row of currentDisplayRows) {
      for (const seat of row.seats) {
        if (seat.singerEmail) {
          set.add(seat.singerEmail.toLowerCase());
        }
      }
    }
    return set;
  }, [currentDisplayRows]);

  const unassignedSingers = useMemo(() => {
    return roster.filter((s) => s.active && !assignedEmailSet.has(s.email.toLowerCase()));
  }, [roster, assignedEmailSet]);

  // Seat click handler: routes between attendance popover, swap pairing, or singer assignment
  function handleSeatClick(seat: SeatingSeat, row: SeatingRow) {
    if (seat.isAisle) return;

    if (mode === 'attendance') {
      if (seat.singerEmail || seat.singerName) {
        attendance.setAttendanceTarget({ seat, row });
      }
      return;
    }

    if (mode === 'edit') {
      if (editor.selectedSeatForSwap) {
        if (
          editor.selectedSeatForSwap.row.rowNumber === row.rowNumber &&
          editor.selectedSeatForSwap.seat.seatIndex === seat.seatIndex
        ) {
          editor.setSelectedSeatForSwap(null);
          return;
        }
        editor.swapSeats(editor.selectedSeatForSwap, { seat, row });
        editor.setSelectedSeatForSwap(null);
      } else {
        if (!seat.singerEmail && !seat.singerName) {
          editor.setSingerPickerTarget({ seat, row });
        } else {
          editor.setSelectedSeatForSwap({ seat, row });
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs shadow-2xs animate-in fade-in ${
            banner.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
              : 'border-rose-200 bg-rose-50/90 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'ok' ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="cursor-pointer text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* "Find My Seat" Locator Banner for logged-in singers */}
      {mySeatLocation && mode !== 'edit' && (
        <PersonalSeatBanner
          caller={caller}
          mySeatLocation={mySeatLocation}
          myNeighbors={myNeighbors}
          perspective={perspective}
          onTogglePerspective={() =>
            setPerspective((prev) => (prev === 'conductor' ? 'singer' : 'conductor'))
          }
          onFocusSeat={() => {
            setLayoutView('formation');
            setTimeout(() => {
              const el = document.getElementById('my-seat-card');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                el.classList.add('ring-4', 'ring-gold-400', 'scale-105');
                setTimeout(() => {
                  el.classList.remove('ring-4', 'ring-gold-400', 'scale-105');
                }, 1800);
              }
            }, 50);
          }}
        />
      )}

      {/* Top Header Card: Chart Selectors, Mode Switcher, and Actions */}
      <ChartHeaderCard
        charts={charts}
        activeChartId={activeChartId}
        setActiveChartId={setActiveChartId}
        activeChart={activeChart}
        mode={mode}
        setMode={setMode}
        canTakeAttendance={canTakeAttendance}
        canManageCharts={canManageCharts}
        onNewChart={() => {
          setDuplicateSource(null);
          setShowNewChartModal(true);
        }}
      />

      {/* Mode Sub-Headers */}
      {mode === 'attendance' && (
        <AttendanceStatsBar
          scheduleList={attendance.scheduleList}
          selectedEventId={attendance.selectedEventId}
          onSelectEvent={attendance.setSelectedEventId}
          presentCount={attendance.chartStats.presentCount}
          absentCount={attendance.chartStats.absentCount}
          lateCount={attendance.chartStats.lateCount}
          missingSingers={attendance.chartStats.missingSingers}
          sectionHeadcounts={attendance.sectionHeadcounts}
          sectionFilter={sectionFilter}
          onToggleSectionFilter={(sec) => setSectionFilter(sectionFilter === sec ? 'All' : sec)}
        />
      )}

      {mode === 'edit' && (
        <EditChartActionBar
          chartTitle={activeChart?.title}
          chartStatus={activeChart?.status}
          rowCount={editor.editableRows.length}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          savingChart={editor.savingChart}
          onSetRowCount={editor.handleSetRowCount}
          onSaveChart={editor.handleSaveChart}
          onDuplicateChart={() => {
            setDuplicateSource(activeChart);
            setShowNewChartModal(true);
          }}
          onDeleteChart={editor.handleDeleteChart}
        />
      )}

      {/* Controls Bar: Perspective, Density & Section Filter */}
      <SeatingToolbar
        perspective={perspective}
        setPerspective={setPerspective}
        density={density}
        setDensity={setDensity}
        layoutView={layoutView}
        setLayoutView={setLayoutView}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
      />

      {/* Selected Seat for Swap Banner */}
      {editor.selectedSeatForSwap && mode === 'edit' && (
        <div className="flex items-center justify-between rounded-xl border border-gold-400 bg-amber-50 p-3 text-xs text-amber-950 animate-in fade-in">
          <span>
            Selected <strong>{editor.selectedSeatForSwap.seat.singerName || 'Seat'}</strong> in {editor.selectedSeatForSwap.row.name}. Click another seat to swap, or select an unassigned singer from the pool below.
          </span>
          <button
            type="button"
            onClick={() => editor.setSelectedSeatForSwap(null)}
            className="cursor-pointer text-amber-800 hover:text-amber-950 font-bold ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mobile Row Quick Jump Bar */}
      {layoutView === 'formation' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
          <span className="text-[11px] font-semibold text-zinc-400 mr-0.5">Jump:</span>
          {currentDisplayRows.map((r) => (
            <button
              key={r.rowNumber}
              type="button"
              onClick={() => {
                const rowEl = document.getElementById(`seating-row-${r.rowNumber}`);
                rowEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 shadow-2xs active:bg-zinc-100 shrink-0"
            >
              R{r.rowNumber} ({r.seats.filter((s) => !s.isAisle).length})
            </button>
          ))}
          <span className="text-[10px] text-zinc-400 italic ml-auto pl-2">
            Swipe rows ← →
          </span>
        </div>
      )}

      {/* Formation Grid View */}
      {layoutView === 'formation' && (
        <FormationView
          currentDisplayRows={currentDisplayRows}
          perspective={perspective}
          mode={mode}
          density={density}
          caller={caller}
          rosterMap={rosterMap}
          attendanceMap={attendance.attendanceMap}
          sectionFilter={sectionFilter}
          selectedSeatForSwap={editor.selectedSeatForSwap}
          draggingSeat={editor.draggingSeat}
          dragOverRowNumber={editor.dragOverRowNumber}
          setDragOverRowNumber={editor.setDragOverRowNumber}
          onDropOnRow={editor.handleDropOnRow}
          onAddSeatToRow={editor.handleAddSeatToRow}
          onRemoveSeatFromRow={editor.handleRemoveSeatFromRow}
          onRemoveRow={editor.handleRemoveRow}
          onAddRow={editor.handleAddRow}
          onSeatClick={handleSeatClick}
          onClearSeat={mode === 'edit' ? editor.handleClearSeat : undefined}
          onDeleteSpecificSeat={mode === 'edit' ? editor.handleDeleteSpecificSeat : undefined}
          onDragStartSeat={editor.handleDragStartSeat}
          onDragEndSeat={editor.handleDragEndSeat}
          onDropOnSeat={editor.handleDropOnSeat}
        />
      )}

      {/* Row List View */}
      {layoutView === 'list' && (
        <SeatingListView
          currentDisplayRows={currentDisplayRows}
          mode={mode}
          caller={caller}
          rosterMap={rosterMap}
          attendanceMap={attendance.attendanceMap}
          selectedSeatForSwap={editor.selectedSeatForSwap}
          onRemoveSeatFromRow={editor.handleRemoveSeatFromRow}
          onAddSeatToRow={editor.handleAddSeatToRow}
          onClearSeat={editor.handleClearSeat}
          onSeatClick={handleSeatClick}
          onUpdateAttendance={attendance.handleUpdateAttendance}
        />
      )}

      {/* Unassigned Singers Pool Drawer */}
      {mode === 'edit' && (
        <UnassignedPool
          unassignedSingers={unassignedSingers}
          draggingSinger={editor.draggingSinger}
          selectedSeatForSwap={editor.selectedSeatForSwap}
          isPoolDragOver={editor.isPoolDragOver}
          setIsPoolDragOver={editor.setIsPoolDragOver}
          onDropOnPool={editor.handleDropOnPool}
          onDragStartSinger={editor.handleDragStartSinger}
          onDragEndSinger={() => editor.setDraggingSinger(null)}
          onAssignSingerToSelectedSeat={(singer) => {
            if (editor.selectedSeatForSwap) {
              editor.assignSingerToSeat(singer, editor.selectedSeatForSwap);
              editor.setSelectedSeatForSwap(null);
            }
          }}
          onSingerClick={(singer) => {
            setBanner({
              type: 'ok',
              text: `Selected ${singer.name}. Now click any empty seat above to place them, or drag onto a seat!`,
            });
          }}
        />
      )}

      {/* Attendance Detail Popover */}
      {attendance.attendanceTarget && attendance.selectedEvent && (
        <AttendancePopover
          seat={attendance.attendanceTarget.seat}
          row={attendance.attendanceTarget.row}
          event={attendance.selectedEvent}
          singer={
            attendance.attendanceTarget.seat.singerEmail
              ? rosterMap.get(attendance.attendanceTarget.seat.singerEmail.toLowerCase())
              : undefined
          }
          absenceRecord={
            attendance.attendanceTarget.seat.singerEmail
              ? attendance.attendanceMap.get(attendance.attendanceTarget.seat.singerEmail.toLowerCase())
              : undefined
          }
          onClose={() => attendance.setAttendanceTarget(null)}
          onUpdateStatus={attendance.handleUpdateAttendance}
        />
      )}

      {/* Singer Picker Modal */}
      <SingerPickerModal
        target={editor.singerPickerTarget}
        unassignedSingers={unassignedSingers}
        onAssign={(singer, target) => {
          editor.assignSingerToSeat(singer, target);
          editor.setSingerPickerTarget(null);
        }}
        onClose={() => editor.setSingerPickerTarget(null)}
      />

      {/* New / Duplicate Chart Modal */}
      {showNewChartModal && (
        <NewChartModal
          concerts={concerts}
          currentSeason={currentSeason}
          existingCharts={charts}
          sourceChart={duplicateSource || undefined}
          onClose={() => {
            setShowNewChartModal(false);
            setDuplicateSource(null);
          }}
          onSubmit={editor.handleCreateChart}
        />
      )}
    </div>
  );
}
