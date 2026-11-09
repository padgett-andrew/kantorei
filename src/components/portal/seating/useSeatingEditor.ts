import { useEffect, useState } from 'react';
import type { SeatingChart, SeatingRow, SeatingSeat, Singer, VoicePart } from '../../../types/choir';
import type { SeatingMode } from './types';
import { cloneRows, createDefaultRow, reindexRowSeats } from './seatingLayoutUtils';

interface UseSeatingEditorParams {
  activeChart: SeatingChart | null;
  charts: SeatingChart[];
  setCharts: React.Dispatch<React.SetStateAction<SeatingChart[]>>;
  setActiveChartId: (id: string) => void;
  setMode: (mode: SeatingMode) => void;
  roster: Singer[];
  setBanner: (banner: { type: 'ok' | 'err'; text: string } | null) => void;
}

export function useSeatingEditor({
  activeChart,
  charts,
  setCharts,
  setActiveChartId,
  setMode,
  roster,
  setBanner,
}: UseSeatingEditorParams) {
  const [editableRows, setEditableRows] = useState<SeatingRow[]>([]);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [singerPickerTarget, setSingerPickerTarget] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [savingChart, setSavingChart] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [draggingSeat, setDraggingSeat] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);
  const [draggingSinger, setDraggingSinger] = useState<Singer | null>(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);
  const [dragOverRowNumber, setDragOverRowNumber] = useState<number | null>(null);

  // Sync editableRows whenever activeChart changes
  useEffect(() => {
    if (activeChart) {
      setEditableRows(cloneRows(activeChart.rows));
      setSelectedSeatForSwap(null);
      setSingerPickerTarget(null);
      setHasUnsavedChanges(false);
    }
  }, [activeChart?.id]);

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

  function assignSingerToSeat(singer: Singer, target: { seat: SeatingSeat; row: SeatingRow }) {
    const nextRows = [...editableRows];
    const row = nextRows.find((r) => r.rowNumber === target.row.rowNumber);
    if (!row) return;

    const seat = row.seats.find((s) => s.seatIndex === target.seat.seatIndex);
    if (!seat) return;

    seat.singerEmail = singer.email.toLowerCase();
    seat.singerName = singer.name;
    seat.voicePart = (singer.voicePart || undefined) as VoicePart | undefined;

    setEditableRows(nextRows);
    setHasUnsavedChanges(true);
    setSingerPickerTarget(null);
    setBanner({ type: 'ok', text: `Assigned ${singer.name} to ${row.name}, Seat #${seat.seatIndex}.` });
  }

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

  function handleSetRowCount(targetCount: number) {
    if (targetCount < 1 || targetCount > 12) return;
    if (targetCount === editableRows.length) return;

    if (targetCount > editableRows.length) {
      const nextRows = [...editableRows];
      while (nextRows.length < targetCount) {
        const newRowNum = nextRows.length + 1;
        nextRows.push(createDefaultRow(newRowNum, 17));
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

  function handleAddRow() {
    handleSetRowCount(editableRows.length + 1);
  }

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
    const addToLeft = position === 'left' || (position === 'auto' && leftCount < rightCount);

    if (addToLeft) {
      row.seats.unshift({ seatIndex: 0 });
    } else {
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
    const rightOuter = rightSeats[rightSeats.length - 1];
    const isRightOuterVacant = rightOuter && !rightOuter.singerEmail && !rightOuter.singerName;
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

  function handleDragStartSeat(seat: SeatingSeat, row: SeatingRow, e: React.DragEvent) {
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
    e.preventDefault();

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
      if (singer) {
        assignSingerToSeat(singer, { seat: targetSeat, row: targetRow });
      }
      setDraggingSinger(null);
      return;
    }

    if (isFromSeat) {
      const sourceRowNumber = data?.rowNumber ?? draggingSeat?.row.rowNumber;
      const sourceSeatIndex = data?.seatIndex ?? draggingSeat?.seat.seatIndex;
      if (sourceRowNumber !== undefined && sourceSeatIndex !== undefined) {
        const sourceRow = editableRows.find((r) => r.rowNumber === sourceRowNumber);
        const sourceSeat = sourceRow?.seats.find((s) => s.seatIndex === sourceSeatIndex);
        if (sourceSeat && sourceRow) {
          if (sourceSeat.seatIndex === targetSeat.seatIndex && sourceRow.rowNumber === targetRow.rowNumber) {
            setDraggingSeat(null);
            return;
          }
          swapSeats({ seat: sourceSeat, row: sourceRow }, { seat: targetSeat, row: targetRow });
        }
      }
      setDraggingSeat(null);
    }
  }

  function handleDropOnPool(e: React.DragEvent) {
    e.preventDefault();
    setIsPoolDragOver(false);

    let data: any = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {}

    const sourceRowNumber = data?.rowNumber ?? draggingSeat?.row.rowNumber;
    const sourceSeatIndex = data?.seatIndex ?? draggingSeat?.seat.seatIndex;
    if (sourceRowNumber === undefined || sourceSeatIndex === undefined) return;

    const sourceRow = editableRows.find((r) => r.rowNumber === sourceRowNumber);
    const sourceSeat = sourceRow?.seats.find((s) => s.seatIndex === sourceSeatIndex);
    if (sourceSeat && sourceRow) {
      handleClearSeat(sourceSeat, sourceRow);
    }
    setDraggingSeat(null);
  }

  function handleDropOnRow(
    targetRow: SeatingRow,
    e: React.DragEvent,
    position: 'left' | 'right' | 'auto' = 'auto'
  ) {
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
        emptySeat.voicePart = (singer.voicePart || undefined) as VoicePart | undefined;
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
          voicePart: (singer.voicePart || undefined) as VoicePart | undefined,
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
    }
  }

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
    setEditableRows(cloneRows(data.chart.rows));
    setMode('edit');
    setBanner({ type: 'ok', text: `Created "${data.chart.title}"!` });
  }

  return {
    editableRows,
    setEditableRows,
    selectedSeatForSwap,
    setSelectedSeatForSwap,
    singerPickerTarget,
    setSingerPickerTarget,
    savingChart,
    hasUnsavedChanges,
    draggingSeat,
    draggingSinger,
    setDraggingSinger,
    isPoolDragOver,
    setIsPoolDragOver,
    dragOverRowNumber,
    setDragOverRowNumber,
    swapSeats,
    assignSingerToSeat,
    handleClearSeat,
    handleDeleteSpecificSeat,
    handleSetRowCount,
    handleAddRow,
    handleRemoveRow,
    handleAddSeatToRow,
    handleRemoveSeatFromRow,
    handleDragStartSeat,
    handleDragEndSeat,
    handleDragStartSinger,
    handleDropOnSeat,
    handleDropOnPool,
    handleDropOnRow,
    handleSaveChart,
    handleDeleteChart,
    handleCreateChart,
  };
}

