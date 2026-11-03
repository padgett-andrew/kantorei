import { useEffect, useMemo, useState } from 'react';
import type {
  AbsenceRecord,
  ConcertEvent,
  ScheduleEvent,
  SectionGroup,
  SeatingChart,
  SeatingRow,
  SeatingSeat,
  Singer,
  VoicePart,
} from '../../../types/choir';
import { findSingerSeatInChart, inferSectionGroup } from '../../../types/choir';
import { voicePartBadgeColor } from '../../../lib/utils';
import type { SeatingDensity, SeatingMode, SeatingPerspective } from './types';
import SeatCard from './SeatCard';
import AttendancePopover from './AttendancePopover';
import NewChartModal from './NewChartModal';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Compass,
  Copy,
  Edit,
  Eye,
  GripVertical,
  LayoutGrid,
  List,
  MapPin,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  UserCheck,
  UserX,
  X,
  Sparkles,
} from 'lucide-react';

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
  allScheduleEvents,
  initialAbsences,
  concerts,
  currentSeason,
  initialMode = 'view',
  initialChartId,
  initialEventId,
}: Props) {
  const isAdmin = caller.role === 'Admin';
  const isSectionLeader = caller.role === 'Section_Leader';
  const canManageCharts = isAdmin;
  const canTakeAttendance = isAdmin || isSectionLeader;

  // Chart List & Active Chart State
  const [charts, setCharts] = useState<SeatingChart[]>(initialCharts);
  const [activeChartId, setActiveChartId] = useState<string>(
    initialChartId || initialCharts[0]?.id || ''
  );

  // Active chart lookup
  const activeChart = useMemo(() => {
    return charts.find((c) => c.id === activeChartId) || charts[0] || null;
  }, [charts, activeChartId]);

  // Mode, Perspective, Density & Layout View State
  const [mode, setMode] = useState<SeatingMode>(initialMode);
  const [perspective, setPerspective] = useState<SeatingPerspective>('conductor');
  const [density, setDensity] = useState<SeatingDensity>('compact');
  const [layoutView, setLayoutView] = useState<'formation' | 'list'>('formation');
  const [sectionFilter, setSectionFilter] = useState<'All' | SectionGroup>('All');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dragOverRowNumber, setDragOverRowNumber] = useState<number | null>(null);

  // Schedule & Attendance State
  const scheduleList = useMemo(() => {
    return allScheduleEvents && allScheduleEvents.length > 0
      ? allScheduleEvents
      : upcomingEvents;
  }, [allScheduleEvents, upcomingEvents]);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || upcomingEvents[0]?.eventId || scheduleList[0]?.eventId || ''
  );
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);

  // Selected schedule event lookup
  const selectedEvent = useMemo(() => {
    return scheduleList.find((e) => e.eventId === selectedEventId) || scheduleList[0];
  }, [scheduleList, selectedEventId]);

  // Active attendance records for selected event
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AbsenceRecord>();
    if (!selectedEventId) return map;
    for (const a of absences) {
      if (a.eventId === selectedEventId) {
        map.set(a.singerEmail.toLowerCase(), a);
      }
    }
    return map;
  }, [absences, selectedEventId]);

  // Popovers & Modals State
  const [attendanceTarget, setAttendanceTarget] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);

  const [showNewChartModal, setShowNewChartModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<SeatingChart | null>(null);

  // Edit Mode Specific State
  const [editableRows, setEditableRows] = useState<SeatingRow[]>([]);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [singerPickerTarget, setSingerPickerTarget] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSection, setPickerSection] = useState<'All' | SectionGroup>('All');
  const [savingChart, setSavingChart] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag and drop state
  const [draggingSeat, setDraggingSeat] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [draggingSinger, setDraggingSinger] = useState<Singer | null>(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);

  // Roster lookup map by normalized email
  const rosterMap = useMemo(() => {
    const map = new Map<string, Singer>();
    for (const s of roster) {
      map.set(s.email.toLowerCase(), s);
    }
    return map;
  }, [roster]);

  // When active chart changes, sync editableRows if not dirty
  useEffect(() => {
    if (activeChart) {
      const clonedRows: SeatingRow[] = JSON.parse(JSON.stringify(activeChart.rows));
      clonedRows.forEach((r) => reindexRowSeats(r));
      setEditableRows(clonedRows);
      setHasUnsavedChanges(false);
      setSelectedSeatForSwap(null);
    }
  }, [activeChart]);

  // Find current user's seat position
  const mySeatLocation = useMemo(() => {
    if (!activeChart) return null;
    return findSingerSeatInChart(activeChart, caller.email);
  }, [activeChart, caller.email]);

  // Find neighbor singers for mobile context (who is on my left and right)
  const myNeighbors = useMemo(() => {
    if (!mySeatLocation || !activeChart) return null;
    const targetRow = activeChart.rows.find((r) => r.rowNumber === mySeatLocation.rowNumber);
    if (!targetRow) return null;
    const nonAisleSeats = targetRow.seats.filter((s) => !s.isAisle);
    const myIdx = nonAisleSeats.findIndex((s) => s.seatIndex === mySeatLocation.seatIndex);
    if (myIdx === -1) return null;
    const leftSeat = myIdx > 0 ? nonAisleSeats[myIdx - 1] : null;
    const rightSeat = myIdx < nonAisleSeats.length - 1 ? nonAisleSeats[myIdx + 1] : null;
    return {
      leftSinger: leftSeat?.singerName,
      rightSinger: rightSeat?.singerName,
    };
  }, [mySeatLocation, activeChart]);

  // Calculate unassigned active singers for edit mode
  const assignedEmailSet = useMemo(() => {
    const set = new Set<string>();
    const rowsToInspect = mode === 'edit' ? editableRows : activeChart?.rows || [];
    for (const r of rowsToInspect) {
      for (const s of r.seats) {
        if (s.singerEmail) {
          set.add(s.singerEmail.toLowerCase());
        }
      }
    }
    return set;
  }, [editableRows, activeChart, mode]);

  const unassignedSingers = useMemo(() => {
    return roster.filter((s) => s.active && !assignedEmailSet.has(s.email.toLowerCase()));
  }, [roster, assignedEmailSet]);

  // Rows to render (either editableRows in edit mode, or activeChart.rows)
  const currentDisplayRows = mode === 'edit' ? editableRows : activeChart?.rows || [];

  // Statistics for the current chart & attendance
  const chartStats = useMemo(() => {
    let totalSeats = 0;
    let filledSeats = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    const missingSingers: { singerName: string; voicePart: string; status: string; reason?: string }[] = [];

    for (const row of currentDisplayRows) {
      for (const seat of row.seats) {
        if (!seat.isAisle) {
          totalSeats++;
          if (seat.singerEmail || seat.singerName) {
            filledSeats++;
            const normEmail = (seat.singerEmail || '').toLowerCase();
            const record = attendanceMap.get(normEmail);

            if (record?.status === 'Absent') {
              absentCount++;
              missingSingers.push({
                singerName: seat.singerName || normEmail,
                voicePart: seat.voicePart || 'B1',
                status: 'Absent',
                reason: record.reason,
              });
            } else if (record?.status === 'Late') {
              lateCount++;
              missingSingers.push({
                singerName: seat.singerName || normEmail,
                voicePart: seat.voicePart || 'B1',
                status: 'Late',
                reason: record.reason,
              });
            } else if (record?.status === 'Cleared') {
              presentCount++;
            }
          }
        }
      }
    }

    const unmarkedCount = Math.max(0, filledSeats - (presentCount + absentCount + lateCount));

    return {
      totalSeats,
      filledSeats,
      presentCount,
      absentCount,
      lateCount,
      unmarkedCount,
      missingSingers,
    };
  }, [currentDisplayRows, attendanceMap]);

  // Section-by-section attendance headcounts for the selected event
  const sectionHeadcounts = useMemo(() => {
    return (['Soprano', 'Alto', 'Tenor', 'Bass'] as const).map((sec) => {
      const sectionSingers = roster.filter((s) => s.active && s.sectionGroup === sec);
      const lateCount = sectionSingers.filter(
        (s) => attendanceMap.get(s.email.toLowerCase())?.status === 'Late'
      ).length;
      const absentCount = sectionSingers.filter(
        (s) => attendanceMap.get(s.email.toLowerCase())?.status === 'Absent'
      ).length;
      const presentCount = sectionSingers.filter(
        (s) => attendanceMap.get(s.email.toLowerCase())?.status === 'Cleared'
      ).length;

      return {
        section: sec,
        total: sectionSingers.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
      };
    });
  }, [roster, attendanceMap]);

  // Attendance update handler
  async function handleUpdateAttendance(
    targetSinger: Singer,
    newStatus: 'Present' | 'Late' | 'Absent',
    reason?: string
  ) {
    if (!selectedEvent) return;
    const normEmail = targetSinger.email.toLowerCase();

    try {
      if (newStatus === 'Present') {
        const res = await fetch('/api/absences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEvent.eventId,
            targetEmail: normEmail,
            source: 'roll_call',
          }),
        });
        if (!res.ok) throw new Error('Failed to mark present.');

        setAbsences((prev) =>
          prev.map((a) =>
            a.eventId === selectedEvent.eventId && a.singerEmail.toLowerCase() === normEmail
              ? { ...a, status: 'Cleared' as const }
              : a
          )
        );
        setBanner({ type: 'ok', text: `Marked ${targetSinger.name} present for this rehearsal.` });
      } else {
        const actionLabel = newStatus === 'Late' ? 'running late' : 'absent';
        const res = await fetch('/api/absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEvent.eventId,
            targetEmail: normEmail,
            status: newStatus,
            reason: reason || `Marked ${actionLabel} during roll call by ${caller.name}`,
            source: 'roll_call',
          }),
        });
        if (!res.ok) throw new Error(`Failed to mark ${actionLabel}.`);

        const data = (await res.json()) as { absence?: AbsenceRecord; record?: AbsenceRecord };
        const savedRecord = data.absence || data.record;
        if (savedRecord) {
          setAbsences((prev) => {
            const filtered = prev.filter(
              (a) => !(a.eventId === selectedEvent.eventId && a.singerEmail.toLowerCase() === normEmail)
            );
            return [...filtered, savedRecord];
          });
        }
        setBanner({ type: 'ok', text: `Marked ${targetSinger.name} ${actionLabel}.` });
      }
    } catch {
      setBanner({ type: 'err', text: 'Error updating attendance. Please retry.' });
    }
  }

  // Seat click handler
  function handleSeatClick(seat: SeatingSeat, row: SeatingRow) {
    if (seat.isAisle) return;

    if (mode === 'attendance') {
      if (seat.singerEmail || seat.singerName) {
        setAttendanceTarget({ seat, row });
      }
      return;
    }

    if (mode === 'edit') {
      if (selectedSeatForSwap) {
        // We have a seat selected to swap with
        if (
          selectedSeatForSwap.row.rowNumber === row.rowNumber &&
          selectedSeatForSwap.seat.seatIndex === seat.seatIndex
        ) {
          // Deselect
          setSelectedSeatForSwap(null);
          return;
        }

        // Perform swap
        swapSeats(selectedSeatForSwap, { seat, row });
        setSelectedSeatForSwap(null);
      } else {
        // If empty seat, open picker
        if (!seat.singerEmail && !seat.singerName) {
          setSingerPickerTarget({ seat, row });
        } else {
          // Select for swap or edit
          setSelectedSeatForSwap({ seat, row });
        }
      }
    }
  }

  // Swap two seats
  function swapSeats(
    a: { seat: SeatingSeat; row: SeatingRow },
    b: { seat: SeatingSeat; row: SeatingRow }
  ) {
    const nextRows = [...editableRows];
    const rowA = nextRows.find((r) => r.rowNumber === a.row.rowNumber);
    const rowB = nextRows.find((r) => r.rowNumber === b.row.rowNumber);
    if (!rowA || !rowB) return;

    const seatA = rowA.seats.find((s) => s.seatIndex === a.seat.seatIndex);
    const seatB = rowB.seats.find((s) => s.seatIndex === b.seat.seatIndex);
    if (!seatA || !seatB) return;

    const tempEmail = seatA.singerEmail;
    const tempName = seatA.singerName;
    const tempVoicePart = seatA.voicePart;

    seatA.singerEmail = seatB.singerEmail;
    seatA.singerName = seatB.singerName;
    seatA.voicePart = seatB.voicePart;

    seatB.singerEmail = tempEmail;
    seatB.singerName = tempName;
    seatB.voicePart = tempVoicePart;

    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setBanner({ type: 'ok', text: 'Swapped seat positions.' });
  }

  // Assign a singer from pool into a seat
  function assignSingerToSeat(singer: Singer, target: { seat: SeatingSeat; row: SeatingRow }) {
    const nextRows = [...editableRows];
    const row = nextRows.find((r) => r.rowNumber === target.row.rowNumber);
    if (!row) return;

    const seat = row.seats.find((s) => s.seatIndex === target.seat.seatIndex);
    if (!seat) return;

    seat.singerEmail = singer.email.toLowerCase();
    seat.singerName = singer.name;
    seat.voicePart = singer.voicePart;

    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setSingerPickerTarget(null);
    setBanner({ type: 'ok', text: `Assigned ${singer.name} to ${row.name}, Seat #${seat.seatIndex}.` });
  }

  // Unassign singer from seat
  function handleClearSeat(seat: SeatingSeat, row: SeatingRow) {
    const nextRows = [...editableRows];
    const targetRow = nextRows.find((r) => r.rowNumber === row.rowNumber);
    if (!targetRow) return;

    const targetSeat = targetRow.seats.find((s) => s.seatIndex === seat.seatIndex);
    if (!targetSeat) return;

    const priorName = targetSeat.singerName || 'Singer';
    delete targetSeat.singerEmail;
    delete targetSeat.singerName;
    delete targetSeat.voicePart;

    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    if (selectedSeatForSwap?.seat.seatIndex === seat.seatIndex && selectedSeatForSwap?.row.rowNumber === row.rowNumber) {
      setSelectedSeatForSwap(null);
    }
    setBanner({ type: 'ok', text: `Unassigned ${priorName}.` });
  }

  // Drag and Drop handlers
  function handleDragStartSeat(seat: SeatingSeat, row: SeatingRow, e: React.DragEvent) {
    if (mode !== 'edit') return;
    setDraggingSeat({ seat, row });
    setDraggingSinger(null);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'seat', rowNumber: row.rowNumber, seatIndex: seat.seatIndex })
    );
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEndSeat() {
    setDraggingSeat(null);
    setDraggingSinger(null);
  }

  function handleDragStartSinger(singer: Singer, e: React.DragEvent) {
    if (mode !== 'edit') return;
    setDraggingSinger(singer);
    setDraggingSeat(null);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'pool', email: singer.email })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  function handleDropOnSeat(
    targetSeat: SeatingSeat,
    targetRow: SeatingRow,
    e: React.DragEvent
  ) {
    if (mode !== 'edit') return;
    e.preventDefault();

    let data: any = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {
      // fallback
    }

    const isFromPool = data?.type === 'pool' || Boolean(draggingSinger);
    const isFromSeat = data?.type === 'seat' || Boolean(draggingSeat);

    if (isFromPool) {
      const singerEmail = data?.email || draggingSinger?.email;
      const singer = roster.find((s) => s.email.toLowerCase() === (singerEmail || '').toLowerCase());
      if (singer) {
        assignSingerToSeat(singer, { seat: targetSeat, row: targetRow });
      }
      setDraggingSinger(null);
      return;
    }

    if (isFromSeat) {
      const sourceRowNumber = data?.rowNumber ?? draggingSeat?.row.rowNumber;
      const sourceSeatIndex = data?.seatIndex ?? draggingSeat?.seat.seatIndex;

      if (sourceRowNumber === targetRow.rowNumber && sourceSeatIndex === targetSeat.seatIndex) {
        setDraggingSeat(null);
        return;
      }

      const nextRows = [...editableRows];
      const sourceRow = nextRows.find((r) => r.rowNumber === sourceRowNumber);
      const targetR = nextRows.find((r) => r.rowNumber === targetRow.rowNumber);
      if (!sourceRow || !targetR) {
        setDraggingSeat(null);
        return;
      }

      const sourceSeat = sourceRow.seats.find((s) => s.seatIndex === sourceSeatIndex);
      const targetS = targetR.seats.find((s) => s.seatIndex === targetSeat.seatIndex);
      if (!sourceSeat || !targetS) {
        setDraggingSeat(null);
        return;
      }

      const sourceSingerName = sourceSeat.singerName || 'Singer';
      const targetSingerName = targetS.singerName;

      // Swap or move
      const tempEmail = sourceSeat.singerEmail;
      const tempName = sourceSeat.singerName;
      const tempVoicePart = sourceSeat.voicePart;

      sourceSeat.singerEmail = targetS.singerEmail;
      sourceSeat.singerName = targetS.singerName;
      sourceSeat.voicePart = targetS.voicePart;

      targetS.singerEmail = tempEmail;
      targetS.singerName = tempName;
      targetS.voicePart = tempVoicePart;

      setEditableRows(nextRows);
      setHasUnsavedChanges(true);
      setDraggingSeat(null);
      setSelectedSeatForSwap(null);

      if (targetSingerName) {
        setBanner({ type: 'ok', text: `Swapped ${sourceSingerName} and ${targetSingerName}.` });
      } else {
        setBanner({ type: 'ok', text: `Moved ${sourceSingerName} to ${targetR.name}, Seat #${targetS.seatIndex}.` });
      }
      return;
    }
  }

  function handleDropOnPool(e: React.DragEvent) {
    if (mode !== 'edit') return;
    e.preventDefault();
    setIsPoolDragOver(false);

    let data: any = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {
      // fallback
    }

    const sourceRowNumber = data?.rowNumber ?? draggingSeat?.row.rowNumber;
    const sourceSeatIndex = data?.seatIndex ?? draggingSeat?.seat.seatIndex;

    if (sourceRowNumber !== undefined && sourceSeatIndex !== undefined) {
      const row = editableRows.find((r) => r.rowNumber === sourceRowNumber);
      const seat = row?.seats.find((s) => s.seatIndex === sourceSeatIndex);
      if (row && seat) {
        handleClearSeat(seat, row);
      }
    }
    setDraggingSeat(null);
  }

  // Reindex seats in a row so indices stay clean 1, 2, 3... and aisle is dynamically placed at the true midpoint
  function reindexRowSeats(row: SeatingRow) {
    const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
    const hasAisle = row.seats.some((s) => s.isAisle) || nonAisleSeats.length >= 6;

    if (!hasAisle || nonAisleSeats.length < 2) {
      row.seats = nonAisleSeats.map((s, i) => {
        s.seatIndex = i + 1;
        return s;
      });
      return;
    }

    // Dynamic midpoint: for N seats, place center aisle after Math.floor(N / 2) seats
    // e.g. 16 seats -> 8 left, AISLE, 8 right
    // e.g. 17 seats -> 8 left, AISLE, 9 right
    // e.g. 18 seats -> 9 left, AISLE, 9 right
    // e.g. 20 seats -> 10 left, AISLE, 10 right
    const midPoint = Math.floor(nonAisleSeats.length / 2);

    const leftSeats: SeatingSeat[] = [];
    const rightSeats: SeatingSeat[] = [];

    nonAisleSeats.forEach((s, i) => {
      s.seatIndex = i + 1;
      if (i < midPoint) {
        leftSeats.push(s);
      } else {
        rightSeats.push(s);
      }
    });

    row.seats = [
      ...leftSeats,
      { seatIndex: 0, isAisle: true },
      ...rightSeats,
    ];
  }

  // Adjust row count
  function handleSetRowCount(targetCount: number) {
    if (targetCount < 1 || targetCount > 12) return;
    if (targetCount === editableRows.length) return;

    if (targetCount > editableRows.length) {
      const nextRows = [...editableRows];
      while (nextRows.length < targetCount) {
        const newRowNum = nextRows.length + 1;
        const defaultSeats: SeatingSeat[] = [];
        // Default 17 seats with center aisle (Kantorei 50-member choir standard: 3 rows × ~17 seats)
        for (let s = 1; s <= 17; s++) {
          defaultSeats.push({ seatIndex: s });
        }
        const newRow: SeatingRow = {
          rowNumber: newRowNum,
          name: `Row ${newRowNum}`,
          seats: defaultSeats,
        };
        reindexRowSeats(newRow);
        nextRows.push(newRow);
      }
      setEditableRows(nextRows);
      setHasUnsavedChanges(true);
      setBanner({ type: 'ok', text: `Updated chart to ${targetCount} rows.` });
    } else {
      const rowsToRemove = editableRows.slice(targetCount);
      const assignedInRemoved = rowsToRemove.flatMap((r) =>
        r.seats.filter((s) => s.singerEmail || s.singerName)
      );

      if (assignedInRemoved.length > 0) {
        const confirmMsg = `Reducing from ${editableRows.length} to ${targetCount} row${
          targetCount === 1 ? '' : 's'
        } will remove ${assignedInRemoved.length} assigned singer${
          assignedInRemoved.length === 1 ? '' : 's'
        } and return them to the unassigned pool. Continue?`;
        if (!window.confirm(confirmMsg)) return;
      }

      const nextRows = editableRows.slice(0, targetCount).map((r, idx) => ({
        ...r,
        rowNumber: idx + 1,
        name: `Row ${idx + 1}`,
      }));
      setEditableRows(nextRows);
      setHasUnsavedChanges(true);
      setBanner({ type: 'ok', text: `Updated chart to ${targetCount} rows.` });
    }
  }

  // Add row
  function handleAddRow() {
    handleSetRowCount(editableRows.length + 1);
  }

  // Remove row
  function handleRemoveRow(rowNumber: number) {
    if (editableRows.length <= 1) {
      setBanner({ type: 'err', text: 'Seating chart must have at least one row.' });
      return;
    }

    const targetRow = editableRows.find((r) => r.rowNumber === rowNumber);
    const assignedInRow = targetRow?.seats.filter((s) => s.singerEmail || s.singerName) || [];
    if (assignedInRow.length > 0) {
      if (
        !window.confirm(
          `Row ${rowNumber} has ${assignedInRow.length} assigned singer${
            assignedInRow.length === 1 ? '' : 's'
          }. Removing this row will return them to the unassigned pool. Continue?`
        )
      ) {
        return;
      }
    }

    const nextRows = editableRows
      .filter((r) => r.rowNumber !== rowNumber)
      .map((r, idx) => ({
        ...r,
        rowNumber: idx + 1,
        name: `Row ${idx + 1}`,
      }));

    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setBanner({ type: 'ok', text: `Removed Row ${rowNumber}. Chart now has ${nextRows.length} rows.` });
  }

  // Add seat to row (balanced symmetrically around the center aisle or directed to specific wing)
  function handleAddSeatToRow(rowNumber: number, position: 'left' | 'right' | 'auto' = 'auto') {
    const nextRows = [...editableRows];
    const row = nextRows.find((r) => r.rowNumber === rowNumber);
    if (!row) return;

    const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
    if (nonAisleSeats.length >= 25) {
      setBanner({ type: 'err', text: 'Maximum 25 seats per row.' });
      return;
    }

    const aisleIdx = row.seats.findIndex((s) => s.isAisle);
    const leftCount = aisleIdx !== -1 ? aisleIdx : Math.floor(nonAisleSeats.length / 2);
    const rightCount = nonAisleSeats.length - leftCount;

    // Symmetrically balance: if left has fewer than right, add to left wing; otherwise right wing
    const addToLeft = position === 'left' || (position === 'auto' && leftCount < rightCount);

    if (addToLeft) {
      // Add vacant seat to outer left wing
      row.seats.unshift({ seatIndex: 0 });
    } else {
      // Add vacant seat to outer right wing
      row.seats.push({ seatIndex: 0 });
    }

    reindexRowSeats(row);
    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setBanner({
      type: 'ok',
      text: `Added seat to ${row.name}. Row now has ${nonAisleSeats.length + 1} seats with updated midpoint.`,
    });
  }

  // Remove seat from row (preferring vacant outer seats and keeping midpoint balanced)
  function handleRemoveSeatFromRow(rowNumber: number) {
    const nextRows = [...editableRows];
    const row = nextRows.find((r) => r.rowNumber === rowNumber);
    if (!row) return;

    const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
    if (nonAisleSeats.length <= 1) {
      setBanner({ type: 'err', text: 'A row must have at least one seat.' });
      return;
    }

    const aisleIdx = row.seats.findIndex((s) => s.isAisle);
    const leftSeats = aisleIdx !== -1 ? row.seats.slice(0, aisleIdx) : nonAisleSeats.slice(0, Math.floor(nonAisleSeats.length / 2));
    const rightSeats = aisleIdx !== -1 ? row.seats.slice(aisleIdx + 1) : nonAisleSeats.slice(Math.floor(nonAisleSeats.length / 2));

    let targetIndex = -1;

    // Check if right wing outer seat is vacant
    const rightOuter = rightSeats[rightSeats.length - 1];
    const isRightOuterVacant = rightOuter && !rightOuter.singerEmail && !rightOuter.singerName;

    // Check if left wing outer seat is vacant
    const leftOuter = leftSeats[0];
    const isLeftOuterVacant = leftOuter && !leftOuter.singerEmail && !leftOuter.singerName;

    if (rightSeats.length >= leftSeats.length && isRightOuterVacant) {
      targetIndex = row.seats.lastIndexOf(rightOuter);
    } else if (leftSeats.length > rightSeats.length && isLeftOuterVacant) {
      targetIndex = row.seats.indexOf(leftOuter);
    } else if (isRightOuterVacant) {
      targetIndex = row.seats.lastIndexOf(rightOuter);
    } else if (isLeftOuterVacant) {
      targetIndex = row.seats.indexOf(leftOuter);
    } else {
      // Neither wing outer seat is vacant: remove from the longer wing (or right wing if equal)
      const targetSeat = rightSeats.length >= leftSeats.length ? rightOuter : leftOuter;
      if (targetSeat) {
        targetIndex = row.seats.indexOf(targetSeat);
        const singerName = targetSeat.singerName || 'Singer';
        if (!window.confirm(`Seat #${targetSeat.seatIndex} is assigned to ${singerName}. Remove this seat and return them to the unassigned pool?`)) {
          return;
        }
      }
    }

    if (targetIndex === -1) {
      for (let i = row.seats.length - 1; i >= 0; i--) {
        if (!row.seats[i]!.isAisle) {
          targetIndex = i;
          break;
        }
      }
    }
    if (targetIndex === -1) return;

    row.seats.splice(targetIndex, 1);
    reindexRowSeats(row);
    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setBanner({
      type: 'ok',
      text: `Removed seat from ${row.name}. Row now has ${row.seats.filter((s) => !s.isAisle).length} seats with updated midpoint.`,
    });
  }

  // Delete a specific seat by index
  function handleDeleteSpecificSeat(seat: SeatingSeat, row: SeatingRow) {
    const nextRows = [...editableRows];
    const targetRow = nextRows.find((r) => r.rowNumber === row.rowNumber);
    if (!targetRow) return;

    const nonAisleSeats = targetRow.seats.filter((s) => !s.isAisle);
    if (nonAisleSeats.length <= 1) {
      setBanner({ type: 'err', text: 'A row must have at least one seat.' });
      return;
    }

    const seatPos = targetRow.seats.findIndex((s) => s.seatIndex === seat.seatIndex && !s.isAisle);
    if (seatPos === -1) return;

    const targetSeat = targetRow.seats[seatPos]!;
    if (targetSeat.singerEmail || targetSeat.singerName) {
      const singerName = targetSeat.singerName || 'Singer';
      if (!window.confirm(`Seat #${seat.seatIndex} is assigned to ${singerName}. Remove this seat and return them to the unassigned pool?`)) {
        return;
      }
    }

    targetRow.seats.splice(seatPos, 1);
    reindexRowSeats(targetRow);
    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setBanner({ type: 'ok', text: `Removed Seat #${seat.seatIndex} from ${targetRow.name}.` });
  }

  // Handle dropping anywhere on a row (dynamically assigns or appends seat)
  function handleDropOnRow(
    targetRow: SeatingRow,
    e: React.DragEvent,
    position: 'left' | 'right' | 'auto' = 'auto'
  ) {
    if (mode !== 'edit') return;
    e.preventDefault();
    setDragOverRowNumber(null);

    let data: any = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {}

    const isFromPool = data?.type === 'pool' || Boolean(draggingSinger);
    const isFromSeat = data?.type === 'seat' || Boolean(draggingSeat);

    if (isFromPool) {
      const singerEmail = data?.email || draggingSinger?.email;
      const singer = roster.find((s) => s.email.toLowerCase() === (singerEmail || '').toLowerCase());
      if (!singer) return;

      const nextRows = [...editableRows];
      const r = nextRows.find((row) => row.rowNumber === targetRow.rowNumber);
      if (!r) return;

      const emptySeat = r.seats.find((s) => !s.isAisle && !s.singerEmail && !s.singerName);
      if (emptySeat) {
        emptySeat.singerEmail = singer.email;
        emptySeat.singerName = singer.name;
        emptySeat.voicePart = singer.voicePart;
        setEditableRows(nextRows);
        setHasUnsavedChanges(true);
        setBanner({
          type: 'ok',
          text: `Placed ${singer.name} into ${r.name}, Seat #${emptySeat.seatIndex}.`,
        });
      } else {
        const nonAisle = r.seats.filter((s) => !s.isAisle);
        const aisleIdx = r.seats.findIndex((s) => s.isAisle);
        const leftCount = aisleIdx !== -1 ? aisleIdx : Math.floor(nonAisle.length / 2);
        const rightCount = nonAisle.length - leftCount;
        const addToLeft = position === 'left' || (position === 'auto' && leftCount < rightCount);

        const newSeat: SeatingSeat = {
          seatIndex: 0,
          singerEmail: singer.email,
          singerName: singer.name,
          voicePart: singer.voicePart,
        };

        if (addToLeft) {
          r.seats.unshift(newSeat);
        } else {
          r.seats.push(newSeat);
        }
        reindexRowSeats(r);
        setEditableRows(nextRows);
        setHasUnsavedChanges(true);
        setBanner({
          type: 'ok',
          text: `Added seat to ${r.name} and placed ${singer.name}! Midpoint updated.`,
        });
      }
      setDraggingSinger(null);
      return;
    }

    if (isFromSeat) {
      const sourceRowNumber = data?.rowNumber ?? draggingSeat?.row.rowNumber;
      const sourceSeatIndex = data?.seatIndex ?? draggingSeat?.seat.seatIndex;
      if (sourceRowNumber === undefined || sourceSeatIndex === undefined) return;

      if (sourceRowNumber === targetRow.rowNumber) {
        setDraggingSeat(null);
        return;
      }

      const nextRows = [...editableRows];
      const sourceRow = nextRows.find((r) => r.rowNumber === sourceRowNumber);
      const destRow = nextRows.find((r) => r.rowNumber === targetRow.rowNumber);
      if (!sourceRow || !destRow) {
        setDraggingSeat(null);
        return;
      }

      const sourceSeat = sourceRow.seats.find((s) => s.seatIndex === sourceSeatIndex);
      if (!sourceSeat) {
        setDraggingSeat(null);
        return;
      }

      const movingSingerEmail = sourceSeat.singerEmail;
      const movingSingerName = sourceSeat.singerName || 'Singer';
      const movingVoicePart = sourceSeat.voicePart;

      const destEmptySeat = destRow.seats.find((s) => !s.isAisle && !s.singerEmail && !s.singerName);
      if (destEmptySeat) {
        destEmptySeat.singerEmail = movingSingerEmail;
        destEmptySeat.singerName = movingSingerName;
        destEmptySeat.voicePart = movingVoicePart;

        delete sourceSeat.singerEmail;
        delete sourceSeat.singerName;
        delete sourceSeat.voicePart;

        setEditableRows(nextRows);
        setHasUnsavedChanges(true);
        setBanner({
          type: 'ok',
          text: `Moved ${movingSingerName} from ${sourceRow.name} to ${destRow.name}, Seat #${destEmptySeat.seatIndex}.`,
        });
      } else {
        const nonAisle = destRow.seats.filter((s) => !s.isAisle);
        const aisleIdx = destRow.seats.findIndex((s) => s.isAisle);
        const leftCount = aisleIdx !== -1 ? aisleIdx : Math.floor(nonAisle.length / 2);
        const rightCount = nonAisle.length - leftCount;
        const addToLeft = position === 'left' || (position === 'auto' && leftCount < rightCount);

        const newSeat: SeatingSeat = {
          seatIndex: 0,
          singerEmail: movingSingerEmail,
          singerName: movingSingerName,
          voicePart: movingVoicePart,
        };

        if (addToLeft) {
          destRow.seats.unshift(newSeat);
        } else {
          destRow.seats.push(newSeat);
        }
        reindexRowSeats(destRow);

        delete sourceSeat.singerEmail;
        delete sourceSeat.singerName;
        delete sourceSeat.voicePart;

        setEditableRows(nextRows);
        setHasUnsavedChanges(true);
        setBanner({
          type: 'ok',
          text: `Added seat to ${destRow.name} and moved ${movingSingerName}! Midpoint updated.`,
        });
      }

      setDraggingSeat(null);
      return;
    }
  }

  // Save current chart edits
  async function handleSaveChart(publishStatus?: 'Draft' | 'Published') {
    if (!activeChart) return;
    setSavingChart(true);
    setBanner(null);

    const updatedChart: SeatingChart = {
      ...activeChart,
      status: publishStatus || activeChart.status,
      rows: editableRows,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/seating', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChart),
      });

      const data = (await res.json()) as { ok?: boolean; chart?: SeatingChart; error?: string };
      if (!res.ok || !data.chart) {
        throw new Error(data.error || 'Failed to save chart.');
      }

      setCharts((prev) => prev.map((c) => (c.id === data.chart!.id ? data.chart! : c)));
      setHasUnsavedChanges(false);
      setBanner({
        type: 'ok',
        text: publishStatus
          ? `Seating chart ${publishStatus === 'Published' ? 'published to all singers' : 'saved as draft'}!`
          : 'Seating chart changes saved!',
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err?.message || 'Error saving chart.' });
    } finally {
      setSavingChart(false);
    }
  }

  // Delete chart
  async function handleDeleteChart() {
    if (!activeChart) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${activeChart.title}"?`)) return;

    try {
      const res = await fetch('/api/seating', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartId: activeChart.id }),
      });

      if (!res.ok) throw new Error('Failed to delete chart.');

      const remaining = charts.filter((c) => c.id !== activeChart.id);
      setCharts(remaining);
      setActiveChartId(remaining[0]?.id || '');
      setMode('view');
      setBanner({ type: 'ok', text: `Deleted "${activeChart.title}".` });
    } catch {
      setBanner({ type: 'err', text: 'Error deleting seating chart.' });
    }
  }

  // Create chart handler
  async function handleCreateChart(chartData: {
    title: string;
    season: string;
    concertSlug?: string;
    concertTitle?: string;
    description?: string;
    status: 'Draft' | 'Published';
    rows: SeatingRow[];
  }) {
    const res = await fetch('/api/seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chartData),
    });

    const data = (await res.json()) as { ok?: boolean; chart?: SeatingChart; error?: string };
    if (!res.ok || !data.chart) {
      throw new Error(data.error || 'Failed to create seating chart.');
    }

    setCharts((prev) => [data.chart!, ...prev]);
    setActiveChartId(data.chart.id);
    setEditableRows(JSON.parse(JSON.stringify(data.chart.rows)));
    setMode('edit');
    setBanner({ type: 'ok', text: `Created "${data.chart.title}"!` });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert (if any) */}
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

      {/* "Find My Seat" Notification Banner (for regular singers) */}
      {mySeatLocation && mode !== 'edit' && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/95 via-amber-100/50 to-orange-50/80 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-600">
                  Your Assigned Position
                </p>
                <h3 className="text-sm sm:text-base font-bold text-navy-950">
                  {caller.name} · {mySeatLocation.rowName}, Seat #{mySeatLocation.seatIndex} (
                  {mySeatLocation.voicePart || caller.voicePart})
                </h3>
                <p className="text-xs text-zinc-600">
                  Chart: <span className="font-semibold">{mySeatLocation.chartTitle}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPerspective((prev) => (prev === 'conductor' ? 'singer' : 'conductor'));
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs hover:bg-white"
              >
                <Compass className="h-3.5 w-3.5 text-gold-600" />
                <span>Flip to {perspective === 'conductor' ? "Singer's View" : "Conductor's View"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card: Chart Selectors, Mode Switcher, and Actions */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Chart Selection & Season */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-56">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Select Seating Chart
              </label>
              <select
                value={activeChartId}
                onChange={(e) => setActiveChartId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-sm font-bold text-navy-950 focus:border-navy-900 focus:outline-hidden"
              >
                {charts.map((chart) => (
                  <option key={chart.id} value={chart.id}>
                    {chart.title} ({chart.season}) {chart.status === 'Draft' ? '— [Draft]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {activeChart && (
              <div className="flex items-center gap-1.5 self-end pb-0.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activeChart.status === 'Published'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {activeChart.status}
                </span>

                {activeChart.concertSlug && (
                  <span className="hidden sm:inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                    {activeChart.concertTitle || activeChart.concertSlug}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Mode Switcher & Admin Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View / Attendance / Edit Mode Toggle Pills */}
            <div className="flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('view')}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  mode === 'view'
                    ? 'bg-white text-navy-950 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View</span>
              </button>

              {canTakeAttendance && (
                <button
                  type="button"
                  onClick={() => setMode('attendance')}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                    mode === 'attendance'
                      ? 'bg-white text-navy-950 shadow-2xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Attendance</span>
                </button>
              )}

              {canManageCharts && (
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                    mode === 'edit'
                      ? 'bg-white text-navy-950 shadow-2xs font-bold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Edit className="h-3.5 w-3.5 text-gold-600" />
                  <span>Edit Layout</span>
                </button>
              )}
            </div>

            {/* Create New Chart Button (Admin only) */}
            {canManageCharts && (
              <button
                type="button"
                onClick={() => {
                  setDuplicateSource(null);
                  setShowNewChartModal(true);
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-navy-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chart</span>
              </button>
            )}
          </div>
        </div>

        {/* Description / Venue Notes */}
        {activeChart?.description && (
          <p className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
            <strong>Venue Notes:</strong> {activeChart.description}
          </p>
        )}
      </div>

      {/* Personal Singer Placement Banner (Mobile & Desktop Quick Locator) */}
      {mySeatLocation && (
        <div className="rounded-2xl border border-gold-300 bg-amber-50/70 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-white shadow-2xs">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-900">
                  Your Seat Location
                </span>
                <span className="rounded-md bg-gold-200/90 px-1.5 py-0.2 text-[10px] font-bold text-gold-950">
                  {mySeatLocation.voicePart || caller.voicePart}
                </span>
              </div>
              <p className="text-sm font-bold text-navy-950 leading-snug">
                {mySeatLocation.rowName} · Seat #{mySeatLocation.seatIndex}
                {myNeighbors?.leftSinger && myNeighbors?.rightSinger && (
                  <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                    (Between {myNeighbors.leftSinger} &amp; {myNeighbors.rightSinger})
                  </span>
                )}
                {myNeighbors?.leftSinger && !myNeighbors?.rightSinger && (
                  <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                    (Next to {myNeighbors.leftSinger} · Stage Edge)
                  </span>
                )}
                {!myNeighbors?.leftSinger && myNeighbors?.rightSinger && (
                  <span className="text-xs font-normal text-zinc-600 block sm:inline sm:ml-2">
                    (Stage Edge · Next to {myNeighbors.rightSinger})
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
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
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-gold-600 active:scale-95 transition self-start sm:self-auto"
          >
            <span>🎯 Focus My Seat</span>
          </button>
        </div>
      )}

      {/* Sub-Header Bar Depending on Mode */}
      {mode === 'attendance' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Event Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Rehearsal / Concert Call
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="rounded-xl border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-950 focus:outline-hidden"
                >
                  {scheduleList.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {ev.date} — {ev.title} ({ev.time})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance Stats Counter Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">
                <Check className="h-3.5 w-3.5" />
                Present: {chartStats.presentCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 text-rose-800">
                <UserX className="h-3.5 w-3.5" />
                Absent: {chartStats.absentCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-amber-800">
                <Clock className="h-3.5 w-3.5" />
                Late: {chartStats.lateCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-zinc-200 px-2.5 py-1 text-zinc-600">
                Unmarked: {chartStats.unmarkedCount}
              </span>
            </div>
          </div>

          {/* Section Attendance Headcounts */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sectionHeadcounts.map((sec) => {
              const isSelected = sectionFilter === sec.section;
              return (
                <button
                  key={sec.section}
                  type="button"
                  onClick={() => setSectionFilter(isSelected ? 'All' : sec.section)}
                  className={`cursor-pointer rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-navy-900 bg-navy-900 text-white shadow-xs'
                      : 'border-emerald-200/90 bg-white/90 hover:border-emerald-400'
                  }`}
                  title={`Filter seating & attendance to ${sec.section}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-navy-950'}`}>
                      {sec.section}
                    </span>
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {sec.total} active
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className={isSelected ? 'font-bold text-emerald-300' : 'font-semibold text-emerald-700'}>
                      {sec.present} here
                    </span>
                    {(sec.late > 0 || sec.absent > 0) && (
                      <span className={isSelected ? 'text-zinc-300' : 'text-zinc-500'}>
                        {sec.late > 0 && <span className={isSelected ? 'text-amber-300' : 'text-amber-700'}>{sec.late} late</span>}
                        {sec.late > 0 && sec.absent > 0 && ' · '}
                        {sec.absent > 0 && <span className={isSelected ? 'text-rose-300' : 'text-rose-700'}>{sec.absent} out</span>}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Missing List (if any absences/lates logged) */}
          {chartStats.missingSingers.length > 0 && (
            <div className="mt-3.5 border-t border-emerald-200/80 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
                Reported Absent or Late for this Call:
              </p>
              <div className="flex flex-wrap gap-2">
                {chartStats.missingSingers.map((m, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                      m.status === 'Absent'
                        ? 'border-rose-300 bg-rose-50 text-rose-900'
                        : 'border-amber-300 bg-amber-50 text-amber-900'
                    }`}
                    title={m.reason}
                  >
                    <span>{m.singerName} ({m.voicePart})</span>
                    <span className="text-[10px] uppercase font-bold opacity-75">
                      · {m.status}
                    </span>
                    {m.reason && <span className="text-[10px] italic">({m.reason})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div className="rounded-2xl border border-gold-300 bg-amber-50/40 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-950">
                Layout Editor: {activeChart?.title}
              </h3>
              <p className="text-xs text-zinc-600">
                Drag and drop singers between seats or to/from the pool below. Click an empty seat to assign from the roster, or click two seats to swap.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Row Count Stepper */}
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-2.5 py-1 shadow-2xs">
                <span className="text-xs font-semibold text-zinc-600">Rows:</span>
                <button
                  type="button"
                  onClick={() => handleSetRowCount(editableRows.length - 1)}
                  disabled={editableRows.length <= 1}
                  className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  title="Decrease rows"
                >
                  -
                </button>
                <span className="min-w-5 text-center text-xs font-bold text-navy-950">
                  {editableRows.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleSetRowCount(editableRows.length + 1)}
                  disabled={editableRows.length >= 12}
                  className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  title="Increase rows"
                >
                  +
                </button>
              </div>

              {hasUnsavedChanges && (
                <span className="text-xs font-bold text-amber-700 animate-pulse">
                  ● Unsaved changes
                </span>
              )}

              <button
                type="button"
                disabled={savingChart}
                onClick={() => handleSaveChart()}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-950 shadow-2xs hover:bg-zinc-50 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Layout</span>
              </button>

              {activeChart?.status === 'Draft' ? (
                <button
                  type="button"
                  disabled={savingChart}
                  onClick={() => handleSaveChart('Published')}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Publish to Singers</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingChart}
                  onClick={() => handleSaveChart('Draft')}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-200 disabled:opacity-50"
                >
                  <span>Revert to Draft</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setDuplicateSource(activeChart);
                  setShowNewChartModal(true);
                }}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                title="Duplicate Chart"
              >
                <Copy className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteChart}
                className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                title="Delete Chart"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar: Perspective, Density & Section Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Perspective toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500">Perspective:</span>
            <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPerspective('conductor')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                  perspective === 'conductor'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Conductor
              </button>
              <button
                type="button"
                onClick={() => setPerspective('singer')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                  perspective === 'singer'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Singer View
              </button>
            </div>
          </div>

          {/* Density toggle (designed for 50-member choir / up to 20 seats per row) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500">View:</span>
            <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                  density === 'compact'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Compact mode: Fits 16–20 singers per row on screen without horizontal scroll"
              >
                Compact (50 Choir)
              </button>
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition ${
                  density === 'comfortable'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Comfortable mode: Expanded cards with full names"
              >
                Comfortable
              </button>
            </div>
          </div>

          {/* Layout toggle (Formation vs Mobile Row List) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500">Layout:</span>
            <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLayoutView('formation')}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                  layoutView === 'formation'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Formation: Visual stage riser layout"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Formation</span>
                <span className="sm:hidden">Stage</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutView('list')}
                className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                  layoutView === 'list'
                    ? 'bg-navy-950 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Row List: Mobile attendance and quick list"
              >
                <List className="h-3 w-3" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-zinc-500 mr-1">Section:</span>
          {(['All', 'Soprano', 'Alto', 'Tenor', 'Bass'] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSectionFilter(sec)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                sectionFilter === sec
                  ? 'bg-navy-950 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Seat for Swap Banner */}
      {selectedSeatForSwap && mode === 'edit' && (
        <div className="flex items-center justify-between rounded-xl border border-gold-400 bg-amber-50 p-3 text-xs text-amber-950 animate-in fade-in">
          <span>
            Selected <strong>{selectedSeatForSwap.seat.singerName || 'Seat'}</strong> in {selectedSeatForSwap.row.name}. Click another seat to swap, or select an unassigned singer from the pool below.
          </span>
          <button
            type="button"
            onClick={() => setSelectedSeatForSwap(null)}
            className="cursor-pointer text-amber-800 hover:text-amber-950 font-bold ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mobile Row Quick Jump Bar (when in Formation view) */}
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

      {/* Formation Grid Container (Visual Choir Risers) */}
      {layoutView === 'formation' && (
        <div className="relative overflow-x-auto rounded-3xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-8 shadow-inner">
          {/* Stage Orientation Marker */}
          <div className="mb-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-2xs">
              <span>
                {perspective === 'conductor'
                  ? '← Choir Left (Stage Right) · [Choir Formation] · Choir Right (Stage Left) →'
                  : '← Your Left (Stage Left) · [Choir Formation] · Your Right (Stage Right) →'}
              </span>
            </div>
          </div>

          {/* Rows Rendered in Physical Order (Back Row to Front Row) */}
          <div className="flex flex-col-reverse gap-4 sm:gap-6 min-w-max pb-4">
            {currentDisplayRows.map((row) => {
              // Apply perspective flip if singer stage view selected
              const orderedSeats =
                perspective === 'singer' ? [...row.seats].reverse() : row.seats;
              const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
              const filledSeatsCount = row.seats.filter((s) => s.singerEmail || s.singerName).length;
              const isDragOverRow = dragOverRowNumber === row.rowNumber;

              return (
                <div
                  key={row.rowNumber}
                  id={`seating-row-${row.rowNumber}`}
                  onDragOver={(e) => {
                    if (mode === 'edit') {
                      e.preventDefault();
                      if (dragOverRowNumber !== row.rowNumber) {
                        setDragOverRowNumber(row.rowNumber);
                      }
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverRowNumber === row.rowNumber) {
                      setDragOverRowNumber(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnRow(row, e)}
                  className={`relative rounded-2xl border transition-all p-3 sm:p-4 shadow-2xs ${
                    isDragOverRow
                      ? 'border-gold-500 bg-amber-50/70 ring-2 ring-gold-400'
                      : 'border-zinc-200/80 bg-white/90 hover:shadow-xs'
                  }`}
                >
                  {/* Row Header & Controls */}
                  <div className="mb-2.5 flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">
                        R{row.rowNumber}
                      </span>
                      <span className="text-xs font-bold text-navy-950">{row.name}</span>
                      <span className="text-[11px] text-zinc-400">
                        ({nonAisleSeats.length} seats · {filledSeatsCount} filled)
                      </span>
                      {isDragOverRow && (
                        <span className="rounded-md bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          Drop to place in {row.name}
                        </span>
                      )}
                    </div>

                    {mode === 'edit' && (
                      <div className="flex items-center gap-2">
                        {/* Seat Count Stepper for this specific row */}
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                          <span className="text-zinc-500">Seats:</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSeatFromRow(row.rowNumber)}
                            disabled={nonAisleSeats.length <= 1}
                            className="cursor-pointer flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30"
                            title={`Remove seat from ${row.name} (keeps midpoint balanced)`}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-4 text-center font-bold text-navy-950">
                            {nonAisleSeats.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddSeatToRow(row.rowNumber, 'auto')}
                            disabled={nonAisleSeats.length >= 25}
                            className="cursor-pointer flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:bg-zinc-200 disabled:opacity-30"
                            title={`Add seat to ${row.name} (symmetrically balances midpoint)`}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowNumber)}
                          className="cursor-pointer rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                          title={`Delete ${row.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Seat Cards in this Row */}
                  <div
                    className={`flex items-center justify-center ${
                      density === 'compact' ? 'gap-1 sm:gap-1.5' : 'gap-2 sm:gap-3'
                    }`}
                  >
                    {/* Drop-to-Add Seat Pill at Left Wing in Edit Mode */}
                    {mode === 'edit' && (
                      <button
                        type="button"
                        onClick={() => handleAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'right' : 'left')}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleDropOnRow(row, e, perspective === 'singer' ? 'right' : 'left')}
                        className={`cursor-pointer group flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 hover:border-gold-500 hover:bg-amber-50 transition text-zinc-400 hover:text-gold-700 ${
                          density === 'compact' ? 'w-10 sm:w-12 min-h-[66px]' : 'w-20 min-h-[82px]'
                        }`}
                        title={`Add seat to ${perspective === 'singer' ? 'Stage Right' : 'Stage Left'} wing (updates midpoint)`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">+ Wing</span>
                        </div>
                      </button>
                    )}

                    {orderedSeats.map((seat, seatIdx) => {
                      const assignedSinger = seat.singerEmail
                        ? rosterMap.get(seat.singerEmail.toLowerCase())
                        : undefined;
                      const absenceRecord = seat.singerEmail
                        ? attendanceMap.get(seat.singerEmail.toLowerCase())
                        : undefined;

                      const isCurrentUser = Boolean(
                        caller.email &&
                          seat.singerEmail &&
                          seat.singerEmail.toLowerCase() === caller.email.toLowerCase()
                      );

                      const voicePart = seat.voicePart || assignedSinger?.voicePart;
                      const sectionGroup = voicePart ? inferSectionGroup(voicePart) : undefined;

                      const isHighlightedSection =
                        sectionFilter === 'All' || (Boolean(sectionGroup) && sectionGroup === sectionFilter);

                      const isDimmed = !isHighlightedSection && !seat.isAisle;

                      const isSelectedInEdit = Boolean(
                        selectedSeatForSwap &&
                          selectedSeatForSwap.row.rowNumber === row.rowNumber &&
                          selectedSeatForSwap.seat.seatIndex === seat.seatIndex
                      );

                      const isBeingDragged = Boolean(
                        draggingSeat &&
                          draggingSeat.row.rowNumber === row.rowNumber &&
                          draggingSeat.seat.seatIndex === seat.seatIndex
                      );

                      return (
                        <SeatCard
                          key={`${row.rowNumber}-${seat.seatIndex}-${seatIdx}`}
                          seat={seat}
                          row={row}
                          mode={mode}
                          density={density}
                          isCurrentUser={isCurrentUser}
                          isDimmed={isDimmed}
                          isSelectedInEdit={isSelectedInEdit}
                          isBeingDragged={isBeingDragged}
                          absenceRecord={absenceRecord}
                          assignedSinger={assignedSinger}
                          onClick={handleSeatClick}
                          onClearSeat={mode === 'edit' ? handleClearSeat : undefined}
                          onDeleteSeat={mode === 'edit' ? handleDeleteSpecificSeat : undefined}
                          onDragStartSeat={handleDragStartSeat}
                          onDragEndSeat={handleDragEndSeat}
                          onDropOnSeat={handleDropOnSeat}
                        />
                      );
                    })}

                    {/* Drop-to-Add Seat Pill at Right Wing in Edit Mode */}
                    {mode === 'edit' && (
                      <button
                        type="button"
                        onClick={() => handleAddSeatToRow(row.rowNumber, perspective === 'singer' ? 'left' : 'right')}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleDropOnRow(row, e, perspective === 'singer' ? 'left' : 'right')}
                        className={`cursor-pointer group flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/70 hover:border-gold-500 hover:bg-amber-50 transition text-zinc-400 hover:text-gold-700 ${
                          density === 'compact' ? 'w-10 sm:w-12 min-h-[66px]' : 'w-20 min-h-[82px]'
                        }`}
                        title={`Add seat to ${perspective === 'singer' ? 'Stage Left' : 'Stage Right'} wing (updates midpoint)`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">+ Wing</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Row Button (in Edit Mode) */}
          {mode === 'edit' && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleAddRow}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-5 py-2 text-xs font-bold text-zinc-700 hover:border-navy-900 hover:text-navy-900"
              >
                <Plus className="h-4 w-4" />
                <span>Add Row</span>
              </button>
            </div>
          )}

          {/* Podium / Conductor Marker (at the front) */}
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-6 py-2 text-xs font-bold text-navy-950 shadow-sm">
              <span>🎼</span>
              <span>Director Podium &amp; Sanctuary Altar</span>
              <span>🎼</span>
            </div>
          </div>
        </div>
      )}

      {/* Row List View (Mobile-Optimized Fast Attendance & Layout Browser) */}
      {layoutView === 'list' && (
        <div className="space-y-4 animate-in fade-in">
          {currentDisplayRows.map((row) => {
            const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
            const filledCount = nonAisleSeats.filter((s) => s.singerEmail || s.singerName).length;

            return (
              <div
                key={row.rowNumber}
                className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">
                      R{row.rowNumber}
                    </span>
                    <h4 className="text-sm font-bold text-navy-950">{row.name}</h4>
                    <span className="text-xs text-zinc-400">
                      ({filledCount} of {nonAisleSeats.length} filled)
                    </span>
                  </div>

                  {mode === 'edit' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRemoveSeatFromRow(row.rowNumber)}
                        disabled={nonAisleSeats.length <= 1}
                        className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                      >
                        - Seat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSeatToRow(row.rowNumber, 'auto')}
                        className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                        title={`Add seat to ${row.name} (balances midpoint)`}
                      >
                        + Seat
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {nonAisleSeats.map((seat) => {
                    const assignedSinger = seat.singerEmail
                      ? rosterMap.get(seat.singerEmail.toLowerCase())
                      : undefined;
                    const absenceRecord = seat.singerEmail
                      ? attendanceMap.get(seat.singerEmail.toLowerCase())
                      : undefined;
                    const isCurrentUser = Boolean(
                      caller.email &&
                        seat.singerEmail &&
                        seat.singerEmail.toLowerCase() === caller.email.toLowerCase()
                    );
                    const voicePart = seat.voicePart || assignedSinger?.voicePart || 'B1';
                    const badgeClass = voicePartBadgeColor(voicePart);
                    const isOccupied = Boolean(seat.singerEmail || seat.singerName);

                    const attendanceStatus =
                      absenceRecord?.status === 'Absent'
                        ? 'Absent'
                        : absenceRecord?.status === 'Late'
                        ? 'Late'
                        : mode === 'attendance' && absenceRecord?.status === 'Cleared'
                        ? 'Present'
                        : 'Unmarked';

                    return (
                      <div
                        key={seat.seatIndex}
                        className={`rounded-xl border p-2.5 transition flex flex-col justify-between ${
                          isCurrentUser
                            ? 'border-gold-400 bg-amber-50/40 ring-1 ring-gold-400'
                            : isOccupied
                            ? 'border-zinc-200 bg-zinc-50/50'
                            : 'border-dashed border-zinc-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white border border-zinc-200 text-[10px] font-bold text-zinc-600">
                              #{seat.seatIndex}
                            </span>
                            {isOccupied && (
                              <span
                                className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}
                              >
                                {voicePart}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isCurrentUser && (
                              <span className="rounded-full bg-gold-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-white shadow-2xs">
                                You
                              </span>
                            )}
                            {mode === 'edit' && isOccupied && (
                              <button
                                type="button"
                                onClick={() => handleClearSeat(seat, row)}
                                className="cursor-pointer text-zinc-400 hover:text-rose-600 p-0.5"
                                title="Unassign singer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Name formatted across 2 lines */}
                        <div className="my-1.5">
                          {isOccupied ? (
                            <p className="line-clamp-2 break-words text-xs font-bold text-navy-950 leading-tight">
                              {seat.singerName || assignedSinger?.name || 'Singer'}
                            </p>
                          ) : (
                            <p className="text-xs italic text-zinc-400">Vacant Seat</p>
                          )}
                        </div>

                        {/* Attendance Mode 1-Tap Mobile Actions */}
                        {mode === 'attendance' && isOccupied && (
                          <div className="pt-2 border-t border-zinc-200/60 mt-1 space-y-1.5">
                            {(() => {
                              const targetSinger: Singer = assignedSinger || {
                                email: seat.singerEmail!,
                                name: seat.singerName || 'Singer',
                                voicePart: voicePart as VoicePart,
                                sectionGroup: (voicePart.startsWith('S')
                                  ? 'Soprano'
                                  : voicePart.startsWith('A')
                                  ? 'Alto'
                                  : voicePart.startsWith('T')
                                  ? 'Tenor'
                                  : 'Bass'),
                                role: 'Singer',
                                phone: '',
                                active: true,
                                status: 'Active',
                              };

                              return (
                                <>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendance(targetSinger, 'Present')}
                                      className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        attendanceStatus === 'Present'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                      }`}
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Present</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendance(targetSinger, 'Late')}
                                      className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        attendanceStatus === 'Late'
                                          ? 'bg-amber-500 text-white shadow-2xs'
                                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                      }`}
                                    >
                                      <Clock className="h-3 w-3" />
                                      <span>Late</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendance(targetSinger, 'Absent')}
                                      className={`cursor-pointer flex-1 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                        attendanceStatus === 'Absent'
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                      }`}
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Absent</span>
                                    </button>
                                  </div>

                                  {/* Contact Action for missing singers */}
                                  {(attendanceStatus === 'Absent' || attendanceStatus === 'Late') &&
                                    assignedSinger?.phone && (
                                      <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-50 rounded-lg p-1 px-2">
                                        <span>{assignedSinger.phone}</span>
                                        <div className="flex items-center gap-2">
                                          <a
                                            href={`tel:${assignedSinger.phone}`}
                                            className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                                            title="Call"
                                          >
                                            <Phone className="h-3 w-3" />
                                            <span>Call</span>
                                          </a>
                                          <a
                                            href={`sms:${assignedSinger.phone}`}
                                            className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                                            title="SMS"
                                          >
                                            <MessageSquare className="h-3 w-3" />
                                            <span>Text</span>
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Edit Mode Quick Action */}
                        {mode === 'edit' && (
                          <div className="pt-1.5 border-t border-zinc-200/60 mt-1 flex justify-end">
                            {isOccupied ? (
                              <button
                                type="button"
                                onClick={() => handleSeatClick(seat, row)}
                                className={`cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                  selectedSeatForSwap?.seat.seatIndex === seat.seatIndex &&
                                  selectedSeatForSwap?.row.rowNumber === row.rowNumber
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                }`}
                              >
                                {selectedSeatForSwap?.seat.seatIndex === seat.seatIndex &&
                                selectedSeatForSwap?.row.rowNumber === row.rowNumber
                                  ? 'Selected'
                                  : 'Swap / Move'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSeatClick(seat, row)}
                                className="cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-50 border border-gold-300 text-gold-900 hover:bg-gold-100"
                              >
                                + Assign
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned Singers Pool Drawer (visible in Edit Mode) */}
      {mode === 'edit' && (
        <div
          onDragOver={(e) => {
            if (mode === 'edit') {
              e.preventDefault();
              setIsPoolDragOver(true);
            }
          }}
          onDragLeave={() => setIsPoolDragOver(false)}
          onDrop={handleDropOnPool}
          className={`rounded-2xl border transition p-5 shadow-2xs ${
            isPoolDragOver
              ? 'border-dashed border-gold-500 bg-amber-50/70 ring-2 ring-gold-400'
              : 'border-zinc-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-lg font-bold text-navy-950">
                  Unassigned Singers Pool ({unassignedSingers.length})
                </h3>
                {isPoolDragOver && (
                  <span className="rounded-md bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-white animate-pulse">
                    Drop here to unassign
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Drag a singer onto any seat, or drag an assigned seat here to unassign.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter pool by name..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="rounded-xl border border-zinc-200 py-1 pl-8 pr-3 text-xs text-zinc-800 focus:outline-hidden"
                />
              </div>

              <select
                value={pickerSection}
                onChange={(e) => setPickerSection(e.target.value as any)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 focus:outline-hidden"
              >
                <option value="All">All Sections</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 max-h-56 overflow-y-auto">
            {unassignedSingers
              .filter((s) => {
                if (pickerSection !== 'All' && s.sectionGroup !== pickerSection) return false;
                if (pickerSearch && !s.name.toLowerCase().includes(pickerSearch.toLowerCase())) {
                  return false;
                }
                return true;
              })
              .map((singer) => {
                const badgeClass = voicePartBadgeColor(singer.voicePart);
                const isThisSingerDragging = draggingSinger?.email === singer.email;
                return (
                  <button
                    key={singer.email}
                    type="button"
                    draggable={mode === 'edit'}
                    onDragStart={(e) => handleDragStartSinger(singer, e)}
                    onDragEnd={() => setDraggingSinger(null)}
                    onClick={() => {
                      if (selectedSeatForSwap) {
                        assignSingerToSeat(singer, selectedSeatForSwap);
                        setSelectedSeatForSwap(null);
                      } else {
                        setBanner({
                          type: 'ok',
                          text: `Selected ${singer.name}. Now click any empty seat above to place them, or drag onto a seat!`,
                        });
                      }
                    }}
                    className={`cursor-grab active:cursor-grabbing inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs text-zinc-800 shadow-2xs hover:border-gold-500 hover:bg-amber-50 select-none transition ${
                      isThisSingerDragging
                        ? 'opacity-40 border-gold-400 bg-gold-50 scale-95'
                        : 'border-zinc-200 bg-zinc-50/80'
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-zinc-400 cursor-grab" />
                    <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}>
                      {singer.voicePart}
                    </span>
                    <span className="font-semibold">{singer.name}</span>
                    <Plus className="h-3 w-3 text-zinc-400 ml-0.5" />
                  </button>
                );
              })}

            {unassignedSingers.length === 0 && (
              <p className="text-xs text-zinc-400 italic">
                All active choir members have been placed on this chart!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Attendance Detail Popover (when tapping a seat in Attendance Mode) */}
      {attendanceTarget && selectedEvent && (
        <AttendancePopover
          seat={attendanceTarget.seat}
          row={attendanceTarget.row}
          event={selectedEvent}
          singer={
            attendanceTarget.seat.singerEmail
              ? rosterMap.get(attendanceTarget.seat.singerEmail.toLowerCase())
              : undefined
          }
          absenceRecord={
            attendanceTarget.seat.singerEmail
              ? attendanceMap.get(attendanceTarget.seat.singerEmail.toLowerCase())
              : undefined
          }
          onClose={() => setAttendanceTarget(null)}
          onUpdateStatus={handleUpdateAttendance}
        />
      )}

      {/* Singer Picker Modal (when clicking an empty seat in Edit Mode) */}
      {singerPickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-navy-950">
                  Assign Singer to {singerPickerTarget.row.name}, Seat #{singerPickerTarget.seat.seatIndex}
                </h3>
                <p className="text-xs text-zinc-500">Pick from unassigned choir members:</p>
              </div>
              <button
                type="button"
                onClick={() => setSingerPickerTarget(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3.5 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {unassignedSingers.map((singer) => {
                const badgeClass = voicePartBadgeColor(singer.voicePart);
                return (
                  <button
                    key={singer.email}
                    type="button"
                    onClick={() => assignSingerToSeat(singer, singerPickerTarget)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white p-2.5 text-left text-xs transition hover:border-gold-500 hover:bg-amber-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${badgeClass}`}>
                        {singer.voicePart}
                      </span>
                      <span className="font-semibold text-zinc-900">{singer.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gold-600">Assign</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New / Duplicate Chart Modal */}
      {showNewChartModal && (
        <NewChartModal
          concerts={concerts}
          currentSeason={currentSeason}
          sourceChart={duplicateSource || undefined}
          onClose={() => {
            setShowNewChartModal(false);
            setDuplicateSource(null);
          }}
          onSubmit={handleCreateChart}
        />
      )}
    </div>
  );
}
