import {
  formatSnackEntry,
  inferSectionGroup,
  parseSnackEntry,
  type AbsenceRecord,
  type AbsenceStatus,
  type ScheduleEvent,
  type SeatingChart,
  type Singer,
} from '../../types/choir';
import { invalidateCacheTag } from '../cache';
import { isSandboxSheetMode } from '../env';
import { AbsenceRowSchema, ScheduleRowSchema } from '../schemas';
import {
  ConflictError,
  NotFoundError,
  appendSheetValues,
  padRow,
  readSheetValues,
  writeSheetValues,
} from './client';
import { demoStore } from './demo-store';
import { getScheduleWithWarnings } from './sheets';

export type SnackSlotNumber = 1 | 2 | 3 | 4;

function setEventSlotValue(ev: ScheduleEvent, slot: SnackSlotNumber, value: string) {
  if (slot === 1) ev.snack1Name = value;
  else if (slot === 2) ev.snack2Name = value;
  else if (slot === 3) ev.snack3Name = value;
  else ev.snack4Name = value;
}

export async function mutateSnackSlot(params: {
  eventId: string;
  slot: SnackSlotNumber;
  action: 'claim' | 'release' | 'update_item';
  item?: string;
  caller: Singer;
  locals?: App.Locals;
}): Promise<ScheduleEvent> {
  const { eventId, slot, action, item, caller, locals } = params;

  if (isSandboxSheetMode(locals)) {
    const existingIdx = demoStore.snacks.findIndex(
      (s) => s.eventId === eventId && s.slot === slot
    );
    const existing = existingIdx >= 0 ? demoStore.snacks[existingIdx] : null;

    if (action === 'claim') {
      if (existing && existing.singerName.trim() !== '') {
        throw new ConflictError(`Hospitality Slot ${slot} was just claimed by ${existing.singerName}.`);
      }
      if (existing) {
        existing.singerName = caller.name;
        existing.item = item;
        existing.updatedAt = new Date().toISOString();
      } else {
        demoStore.snacks.push({
          eventId,
          slot,
          singerName: caller.name,
          item,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (action === 'update_item') {
      const canUpdate =
        caller.role === 'Admin' ||
        (existing && existing.singerName.toLowerCase() === caller.name.toLowerCase());
      if (!canUpdate) {
        throw new ConflictError(
          `Only ${existing?.singerName || 'the slot owner'} or an Admin can edit what they are bringing.`
        );
      }
      if (existing) {
        existing.item = item;
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      const canRelease =
        caller.role === 'Admin' ||
        (existing && existing.singerName.toLowerCase() === caller.name.toLowerCase());
      if (!canRelease) {
        throw new ConflictError(`Only ${existing?.singerName || 'the slot owner'} or an Admin can release this slot.`);
      }
      if (existingIdx >= 0) {
        demoStore.snacks.splice(existingIdx, 1);
      }
    }

    const ev = demoStore.schedule.find((e) => e.eventId === eventId);
    if (ev) {
      setEventSlotValue(ev, slot, action === 'release' ? '' : formatSnackEntry(caller.name, item));
    }
    await invalidateCacheTag('schedule');
    const { schedule } = await getScheduleWithWarnings(locals);
    return schedule.find((e) => e.eventId === eventId) || ev!;
  }

  // Uncached live lookup of Schedule!A1:K to find exact current row by Event_ID
  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const headerRow = allRows[0] || [];
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === eventId);
  if (matchIdx === -1) {
    throw new NotFoundError(`Rehearsal event "${eventId}" not found in Schedule sheet.`);
  }

  // Check if legacy 9-column sheet has Notes in Column I (index 8)
  const isLegacyNineCol = (headerRow[8] || '').trim().toLowerCase().includes('note');
  if (isLegacyNineCol) {
    // Automatically modernize headers: Column I -> Snack_3, Column J -> Snack_4, Column K -> Notes
    await writeSheetValues('Schedule!I1:K1', [['Snack_3', 'Snack_4', 'Notes']], locals);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][8] && !rows[i][10]) {
        await writeSheetValues(`Schedule!I${i + 2}:K${i + 2}`, [['', '', rows[i][8]]], locals);
        rows[i][10] = rows[i][8];
        rows[i][8] = '';
      }
    }
  }

  const freshRowIndex = matchIdx + 2;
  const row = padRow(rows[matchIdx], 11);
  const colIndex = 5 + slot;
  const colLetter = ['G', 'H', 'I', 'J'][slot - 1];
  const currentRaw = row[colIndex]?.trim() || '';
  const parsed = parseSnackEntry(currentRaw);

  if (action === 'claim') {
    if (parsed.name.trim() !== '') {
      throw new ConflictError(`Hospitality Slot ${slot} was just claimed by ${parsed.name}.`);
    }
    const formatted = formatSnackEntry(caller.name, item);
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [[formatted]], locals);
    row[colIndex] = formatted;
  } else if (action === 'update_item') {
    const canUpdate =
      caller.role === 'Admin' ||
      parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
    if (!canUpdate) {
      throw new ConflictError(
        `Only ${parsed.name || 'the slot owner'} or an Admin can edit what they are bringing.`
      );
    }
    const formatted = formatSnackEntry(parsed.name || caller.name, item);
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [[formatted]], locals);
    row[colIndex] = formatted;
  } else {
    const canRelease =
      caller.role === 'Admin' ||
      parsed.name.trim().toLowerCase() === caller.name.trim().toLowerCase();
    if (!canRelease) {
      throw new ConflictError(`Only ${parsed.name || 'the slot owner'} or an Admin can release this slot.`);
    }
    await writeSheetValues(`Schedule!${colLetter}${freshRowIndex}`, [['']], locals);
    row[colIndex] = '';
  }

  await invalidateCacheTag('schedule');
  return ScheduleRowSchema.parse(row);
}

export async function upsertAbsenceRecord(params: {
  eventId: string;
  date: string;
  targetSinger: Singer;
  reason: string;
  submittedBy: string;
  status?: AbsenceStatus;
  locals?: App.Locals;
}): Promise<AbsenceRecord> {
  const { eventId, date, targetSinger, reason, submittedBy, status = 'Absent', locals } = params;
  const normalizedEmail = targetSinger.email.trim().toLowerCase();
  const timestamp = new Date().toISOString();

  const record: AbsenceRecord = {
    timestamp,
    eventId,
    date,
    singerName: targetSinger.name,
    singerEmail: normalizedEmail,
    voicePart: targetSinger.voicePart,
    reason: reason.trim(),
    submittedBy,
    status,
  };

  if (isSandboxSheetMode(locals)) {
    const existingIdx = demoStore.absences.findIndex(
      (a) => a.eventId === eventId && a.singerEmail === normalizedEmail
    );
    if (existingIdx >= 0) {
      demoStore.absences[existingIdx] = record;
    } else {
      demoStore.absences.unshift(record);
    }
    return record;
  }

  const rows = await readSheetValues('Absences!A2:I', locals);
  const existingIdx = rows.findIndex(
    (r) =>
      (r[1] ?? '').trim() === eventId &&
      (r[4] ?? '').trim().toLowerCase() === normalizedEmail
  );

  const rowValues = [
    record.timestamp,
    record.eventId,
    record.date,
    record.singerName,
    record.singerEmail,
    record.voicePart,
    record.reason,
    record.submittedBy,
    record.status,
  ];

  if (existingIdx >= 0) {
    const freshRowIndex = existingIdx + 2;
    await writeSheetValues(`Absences!A${freshRowIndex}:I${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Absences!A:I', [rowValues], locals);
  }

  await invalidateCacheTag('absences');
  return record;
}

export async function clearAbsenceRecord(params: {
  eventId: string;
  singerEmail: string;
  clearedBy: string;
  locals?: App.Locals;
}): Promise<AbsenceRecord> {
  const { eventId, singerEmail, clearedBy, locals } = params;
  const normalizedEmail = singerEmail.trim().toLowerCase();

  if (isSandboxSheetMode(locals)) {
    const existing = demoStore.absences.find(
      (a) => a.eventId === eventId && a.singerEmail === normalizedEmail
    );
    if (!existing) {
      throw new NotFoundError('No matching absence record found.');
    }
    const priorRecord: AbsenceRecord = { ...existing };
    existing.status = 'Cleared';
    existing.timestamp = new Date().toISOString();
    existing.submittedBy = clearedBy;
    return priorRecord;
  }

  const rows = await readSheetValues('Absences!A2:I', locals);
  const existingIdx = rows.findIndex(
    (r) =>
      (r[1] ?? '').trim() === eventId &&
      (r[4] ?? '').trim().toLowerCase() === normalizedEmail
  );

  if (existingIdx === -1) {
    throw new NotFoundError('No matching absence record found.');
  }

  const freshRowIndex = existingIdx + 2;
  const rawRow = padRow(rows[existingIdx], 9);
  const priorRecord = AbsenceRowSchema.parse(rawRow);

  const updatedRow = [...rawRow];
  updatedRow[0] = new Date().toISOString();
  updatedRow[7] = clearedBy;
  updatedRow[8] = 'Cleared';

  await writeSheetValues(`Absences!A${freshRowIndex}:I${freshRowIndex}`, [updatedRow], locals);
  await invalidateCacheTag('absences');
  return priorRecord;
}

export async function upsertRosterSinger(params: {
  singer: Singer;
  mode: 'create' | 'update';
  locals?: App.Locals;
}): Promise<Singer> {
  const { singer, mode, locals } = params;
  const resolvedStatus = singer.status ?? (singer.active ? 'Active' : 'Inactive');
  const normalized: Singer = {
    ...singer,
    email: singer.email.trim().toLowerCase(),
    name: singer.name.trim(),
    sectionGroup: singer.sectionGroup || inferSectionGroup(singer.voicePart),
    phone: singer.phone.trim(),
    status: resolvedStatus,
    active: resolvedStatus === 'Active',
  };

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.roster.findIndex((s) => s.email === normalized.email);
    if (mode === 'create' && idx >= 0) {
      throw new ConflictError(`A singer with email ${normalized.email} already exists.`);
    }
    if (idx >= 0) {
      demoStore.roster[idx] = normalized;
    } else {
      demoStore.roster.push(normalized);
    }
    return normalized;
  }

  const rows = await readSheetValues('Roster!A2:G', locals);
  const matchIdx = rows.findIndex(
    (r) => (r[0] ?? '').trim().toLowerCase() === normalized.email
  );

  if (mode === 'create' && matchIdx >= 0) {
    throw new ConflictError(`A singer with email ${normalized.email} already exists on the Roster.`);
  }

  const sheetStatusCell =
    normalized.status === 'On_Leave'
      ? 'ON_LEAVE'
      : normalized.status === 'Active'
        ? 'TRUE'
        : 'FALSE';

  const rowValues = [
    normalized.email,
    normalized.name,
    normalized.voicePart,
    normalized.sectionGroup,
    normalized.role,
    normalized.phone,
    sheetStatusCell,
  ];

  if (matchIdx >= 0) {
    const freshRowIndex = matchIdx + 2;
    await writeSheetValues(`Roster!A${freshRowIndex}:G${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Roster!A:G', [rowValues], locals);
  }

  await invalidateCacheTag('roster');
  return normalized;
}

export async function upsertScheduleEvent(params: {
  event: ScheduleEvent;
  mode: 'create' | 'update';
  locals?: App.Locals;
}): Promise<ScheduleEvent> {
  const { event, mode, locals } = params;

  const resolvedEventId =
    event.eventId?.trim() ||
    `${(event.type || 'reh').toLowerCase().slice(0, 3)}-${event.date}-${Date.now().toString(36).slice(-4)}`;

  const notesText = (event.notes || event.description || '').trim();

  const normalized: ScheduleEvent = {
    ...event,
    eventId: resolvedEventId,
    title: event.title.trim(),
    date: event.date.trim(),
    time: event.time.trim() || '7:00 PM - 9:30 PM',
    type: event.type || 'Rehearsal',
    location: event.location.trim() || 'TBD',
    snack1Name: event.snack1Name || '',
    snack2Name: event.snack2Name || '',
    snack3Name: event.snack3Name || '',
    snack4Name: event.snack4Name || '',
    notes: notesText,
    description: notesText,
  };

  if (isSandboxSheetMode(locals)) {
    const matchIdx = demoStore.schedule.findIndex((e) => e.eventId === normalized.eventId);
    if (mode === 'create' && matchIdx >= 0) {
      throw new ConflictError(`An event with ID "${normalized.eventId}" already exists.`);
    }
    if (mode === 'update' && matchIdx === -1) {
      throw new NotFoundError(`Event with ID "${normalized.eventId}" not found.`);
    }

    if (matchIdx >= 0) {
      demoStore.schedule[matchIdx] = {
        ...demoStore.schedule[matchIdx],
        ...normalized,
      };
    } else {
      demoStore.schedule.push(normalized);
    }
    demoStore.schedule.sort((a, b) => a.date.localeCompare(b.date));
    return { ...normalized };
  }

  // Uncached live lookup of Schedule!A1:K
  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === normalized.eventId);

  if (mode === 'create' && matchIdx >= 0) {
    throw new ConflictError(`An event with ID "${normalized.eventId}" already exists in the Schedule.`);
  }
  if (mode === 'update' && matchIdx === -1) {
    throw new NotFoundError(`Event with ID "${normalized.eventId}" not found in Schedule.`);
  }

  // Preserve existing snack signups when editing an event
  let s1 = normalized.snack1Name;
  let s2 = normalized.snack2Name;
  let s3 = normalized.snack3Name;
  let s4 = normalized.snack4Name;
  if (matchIdx >= 0) {
    const existingRow = rows[matchIdx];
    if (!s1 && existingRow[6]) s1 = existingRow[6];
    if (!s2 && existingRow[7]) s2 = existingRow[7];
    if (!s3 && existingRow[8]) s3 = existingRow[8];
    if (!s4 && existingRow[9]) s4 = existingRow[9];
  }

  const rowValues = [
    normalized.eventId,
    normalized.date,
    normalized.time,
    normalized.type,
    normalized.title,
    normalized.location,
    s1,
    s2,
    s3,
    s4,
    notesText,
  ];

  if (matchIdx >= 0) {
    const freshRowIndex = matchIdx + 2;
    await writeSheetValues(`Schedule!A${freshRowIndex}:K${freshRowIndex}`, [rowValues], locals);
  } else {
    await appendSheetValues('Schedule!A:K', [rowValues], locals);
  }

  await invalidateCacheTag('schedule');
  return normalized;
}

export async function deleteScheduleEvent(params: {
  eventId: string;
  locals?: App.Locals;
}): Promise<{ ok: boolean; eventId: string }> {
  const { eventId, locals } = params;

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.schedule.findIndex((e) => e.eventId === eventId);
    if (idx === -1) throw new NotFoundError(`Event with ID "${eventId}" not found.`);
    demoStore.schedule.splice(idx, 1);
    return { ok: true, eventId };
  }

  const allRows = await readSheetValues('Schedule!A1:K', locals);
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === eventId);
  if (matchIdx === -1) {
    throw new NotFoundError(`Event with ID "${eventId}" not found in Schedule.`);
  }

  const freshRowIndex = matchIdx + 2;
  await writeSheetValues(
    `Schedule!A${freshRowIndex}:K${freshRowIndex}`,
    [['', '', '', '', '', '', '', '', '', '', '']],
    locals
  );

  await invalidateCacheTag('schedule');
  return { ok: true, eventId };
}

export async function upsertSeatingChart(params: {
  chart: Partial<SeatingChart> & { title: string; season: string };
  mode?: 'create' | 'update';
  locals?: App.Locals;
}): Promise<SeatingChart> {
  const { chart, mode, locals } = params;
  const now = new Date().toISOString();
  const resolvedId =
    chart.id?.trim() ||
    `chart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const normalized: SeatingChart = {
    id: resolvedId,
    season: chart.season.trim(),
    concertSlug: chart.concertSlug?.trim() || undefined,
    concertTitle: chart.concertTitle?.trim() || undefined,
    title: chart.title.trim(),
    description: chart.description?.trim() || undefined,
    status: chart.status || 'Draft',
    rows: chart.rows || [],
    createdAt: chart.createdAt || now,
    updatedAt: now,
  };

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.seatingCharts.findIndex((c) => c.id === normalized.id);
    if (mode === 'create' && idx >= 0) {
      throw new ConflictError(`A seating chart with ID "${normalized.id}" already exists.`);
    }
    if (idx >= 0) {
      normalized.createdAt = demoStore.seatingCharts[idx].createdAt;
      demoStore.seatingCharts[idx] = normalized;
    } else {
      demoStore.seatingCharts.unshift(normalized);
    }
    await invalidateCacheTag('seating_charts');
    return normalized;
  }

  // Google Sheets live mode
  try {
    const allRows = await readSheetValues('Seating_Charts!A1:I', locals);
    const headerRow = allRows[0] || [];
    const rows = allRows.slice(1);
    const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === normalized.id);

    if (mode === 'create' && matchIdx >= 0) {
      throw new ConflictError(`A seating chart with ID "${normalized.id}" already exists.`);
    }

    const layoutJson = JSON.stringify(normalized.rows);
    const rowValues = [
      normalized.id,
      normalized.season,
      normalized.concertSlug || '',
      normalized.title,
      normalized.description || '',
      normalized.status,
      layoutJson,
      matchIdx >= 0 ? rows[matchIdx][7] || normalized.createdAt : normalized.createdAt,
      normalized.updatedAt,
    ];

    if (matchIdx >= 0) {
      const freshRowIndex = matchIdx + 2;
      await writeSheetValues(`Seating_Charts!A${freshRowIndex}:I${freshRowIndex}`, [rowValues], locals);
    } else {
      if (allRows.length === 0 || headerRow.length === 0) {
        await writeSheetValues('Seating_Charts!A1:I1', [
          ['Chart_ID', 'Season', 'Concert_Slug', 'Title', 'Description', 'Status', 'Layout_JSON', 'Created_At', 'Updated_At'],
        ], locals);
      }
      await appendSheetValues('Seating_Charts!A:I', [rowValues], locals);
    }
  } catch (err) {
    try {
      const layoutJson = JSON.stringify(normalized.rows);
      await writeSheetValues('Seating_Charts!A1:I2', [
        ['Chart_ID', 'Season', 'Concert_Slug', 'Title', 'Description', 'Status', 'Layout_JSON', 'Created_At', 'Updated_At'],
        [
          normalized.id,
          normalized.season,
          normalized.concertSlug || '',
          normalized.title,
          normalized.description || '',
          normalized.status,
          layoutJson,
          normalized.createdAt,
          normalized.updatedAt,
        ],
      ], locals);
    } catch {
      throw err;
    }
  }

  await invalidateCacheTag('seating_charts');
  return normalized;
}

export async function deleteSeatingChart(params: {
  chartId: string;
  locals?: App.Locals;
}): Promise<{ ok: boolean; chartId: string }> {
  const { chartId, locals } = params;

  if (isSandboxSheetMode(locals)) {
    const idx = demoStore.seatingCharts.findIndex((c) => c.id === chartId);
    if (idx === -1) throw new NotFoundError(`Seating chart with ID "${chartId}" not found.`);
    demoStore.seatingCharts.splice(idx, 1);
    await invalidateCacheTag('seating_charts');
    return { ok: true, chartId };
  }

  const allRows = await readSheetValues('Seating_Charts!A1:I', locals);
  const rows = allRows.slice(1);
  const matchIdx = rows.findIndex((r) => (r[0] ?? '').trim() === chartId);
  if (matchIdx === -1) {
    throw new NotFoundError(`Seating chart with ID "${chartId}" not found.`);
  }

  const freshRowIndex = matchIdx + 2;
  await writeSheetValues(
    `Seating_Charts!A${freshRowIndex}:I${freshRowIndex}`,
    [['', '', '', '', '', '', '', '', '']],
    locals
  );

  await invalidateCacheTag('seating_charts');
  return { ok: true, chartId };
}


