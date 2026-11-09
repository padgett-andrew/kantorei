import { useMemo, useState } from 'react';
import type { AbsenceRecord, ScheduleEvent, SectionGroup, SeatingRow, SeatingSeat, Singer } from '../../../types/choir';
import type { MissingSingerItem, SectionHeadcountItem } from './AttendanceStatsBar';
import { enqueueOfflineMutation } from '../../../lib/offline-queue';
import { fetchWithTimeout } from '../../../lib/fetch-with-timeout';

interface UseAttendanceManagerParams {
  allScheduleEvents?: ScheduleEvent[];
  upcomingEvents: ScheduleEvent[];
  initialEventId?: string;
  initialAbsences: AbsenceRecord[];
  currentDisplayRows: SeatingRow[];
  roster: Singer[];
  caller: Singer;
  setBanner: (b: { type: 'ok' | 'err'; text: string } | null) => void;
}

export function useAttendanceManager({
  allScheduleEvents = [],
  upcomingEvents,
  initialEventId,
  initialAbsences,
  currentDisplayRows,
  roster,
  caller,
  setBanner,
}: UseAttendanceManagerParams) {
  const scheduleList = useMemo(() => {
    if (allScheduleEvents && allScheduleEvents.length > 0) return allScheduleEvents;
    return upcomingEvents;
  }, [allScheduleEvents, upcomingEvents]);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || upcomingEvents[0]?.eventId || scheduleList[0]?.eventId || ''
  );
  const [absences, setAbsences] = useState<AbsenceRecord[]>(initialAbsences);

  const selectedEvent = useMemo(() => {
    return scheduleList.find((ev) => ev.eventId === selectedEventId) || scheduleList[0];
  }, [scheduleList, selectedEventId]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AbsenceRecord>();
    if (!selectedEventId) return map;
    for (const a of absences) {
      if (a.eventId === selectedEventId && a.status !== 'Cleared') {
        map.set(a.singerEmail.toLowerCase(), a);
      }
    }
    return map;
  }, [absences, selectedEventId]);

  const [attendanceTarget, setAttendanceTarget] = useState<{
    seat: SeatingSeat;
    row: SeatingRow;
  } | null>(null);

  // Statistics for current chart & attendance
  const chartStats = useMemo(() => {
    let totalSeats = 0;
    let filledSeats = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    const missingSingers: MissingSingerItem[] = [];

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
            } else {
              presentCount++;
            }
          }
        }
      }
    }

    return { totalSeats, filledSeats, presentCount, absentCount, lateCount, missingSingers };
  }, [currentDisplayRows, attendanceMap]);

  // Section-by-section attendance headcounts
  const sectionHeadcounts = useMemo<SectionHeadcountItem[]>(() => {
    return (['Soprano', 'Alto', 'Tenor', 'Bass'] as const).map((sec: SectionGroup) => {
      const sectionSingers = roster.filter((s) => s.active && s.sectionGroup === sec);
      const lateCount = sectionSingers.filter(
        (s) => attendanceMap.get(s.email.toLowerCase())?.status === 'Late'
      ).length;
      const absentCount = sectionSingers.filter(
        (s) => attendanceMap.get(s.email.toLowerCase())?.status === 'Absent'
      ).length;
      const presentCount = Math.max(0, sectionSingers.length - (absentCount + lateCount));

      return {
        section: sec,
        total: sectionSingers.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
      };
    });
  }, [roster, attendanceMap]);

  async function handleUpdateAttendance(
    targetSinger: Singer,
    newStatus: 'Present' | 'Late' | 'Absent',
    reason?: string
  ) {
    if (!selectedEvent) return;
    const normEmail = targetSinger.email.toLowerCase();
    const actionLabel = newStatus === 'Present' ? 'present' : newStatus === 'Late' ? 'running late' : 'absent';
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // 1. Optimistic UI update: Flip attendance state in local React state immediately
    if (newStatus === 'Present') {
      setAbsences((prev) =>
        prev.map((a) =>
          a.eventId === selectedEvent.eventId && a.singerEmail.toLowerCase() === normEmail
            ? { ...a, status: 'Cleared' as const }
            : a
        )
      );
    } else {
      const optimisticRecord: AbsenceRecord = {
        timestamp: new Date().toISOString(),
        eventId: selectedEvent.eventId,
        date: selectedEvent.date,
        singerName: targetSinger.name,
        singerEmail: normEmail,
        voicePart: targetSinger.voicePart || '',
        reason: reason || `Marked ${actionLabel} during roll call by ${caller.name}`,
        submittedBy: caller.name,
        status: newStatus,
      };

      setAbsences((prev) => {
        const filtered = prev.filter(
          (a) => !(a.eventId === selectedEvent.eventId && a.singerEmail.toLowerCase() === normEmail)
        );
        return [...filtered, optimisticRecord];
      });
    }

    // 2. Offline check: if phone is in a dead zone, queue immediately without throwing errors
    if (isOffline) {
      if (newStatus === 'Present') {
        enqueueOfflineMutation({
          url: '/api/absences',
          method: 'DELETE',
          body: {
            eventId: selectedEvent.eventId,
            targetEmail: normEmail,
            source: 'roll_call',
          },
          label: `Mark ${targetSinger.name} present (${selectedEvent.date})`,
        });
      } else {
        enqueueOfflineMutation({
          url: '/api/absences',
          method: 'POST',
          body: {
            eventId: selectedEvent.eventId,
            targetEmail: normEmail,
            status: newStatus,
            reason: reason || `Marked ${actionLabel} during roll call by ${caller.name}`,
            source: 'roll_call',
          },
          label: `Mark ${targetSinger.name} ${actionLabel} (${selectedEvent.date})`,
        });
      }
      setBanner({
        type: 'ok',
        text: `Marked ${targetSinger.name} ${actionLabel} (saved offline · will sync when connected).`,
      });
      return;
    }

    // 3. Online fetch with fast timeout
    try {
      if (newStatus === 'Present') {
        const res = await fetchWithTimeout(
          '/api/absences',
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: selectedEvent.eventId,
              targetEmail: normEmail,
              source: 'roll_call',
            }),
          },
          3500
        );
        if (!res.ok) throw new Error('Failed to mark present.');
        setBanner({ type: 'ok', text: `Marked ${targetSinger.name} present for this rehearsal.` });
      } else {
        const res = await fetchWithTimeout(
          '/api/absences',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: selectedEvent.eventId,
              targetEmail: normEmail,
              status: newStatus,
              reason: reason || `Marked ${actionLabel} during roll call by ${caller.name}`,
              source: 'roll_call',
            }),
          },
          3500
        );
        if (!res.ok) throw new Error(`Failed to mark ${actionLabel}.`);
        setBanner({ type: 'ok', text: `Marked ${targetSinger.name} ${actionLabel}.` });
      }
    } catch (err) {
      const isNetworkDrop =
        err instanceof TypeError ||
        (err instanceof Error && err.name === 'TimeoutError') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isNetworkDrop) {
        if (newStatus === 'Present') {
          enqueueOfflineMutation({
            url: '/api/absences',
            method: 'DELETE',
            body: {
              eventId: selectedEvent.eventId,
              targetEmail: normEmail,
              source: 'roll_call',
            },
            label: `Mark ${targetSinger.name} present (${selectedEvent.date})`,
          });
        } else {
          enqueueOfflineMutation({
            url: '/api/absences',
            method: 'POST',
            body: {
              eventId: selectedEvent.eventId,
              targetEmail: normEmail,
              status: newStatus,
              reason: reason || `Marked ${actionLabel} during roll call by ${caller.name}`,
              source: 'roll_call',
            },
            label: `Mark ${targetSinger.name} ${actionLabel} (${selectedEvent.date})`,
          });
        }
        setBanner({
          type: 'ok',
          text: `Marked ${targetSinger.name} ${actionLabel} (saved offline · will sync when connected).`,
        });
      } else {
        setBanner({ type: 'err', text: 'Error updating attendance. Please retry.' });
      }
    }
  }

  return {
    scheduleList,
    selectedEventId,
    setSelectedEventId,
    selectedEvent,
    absences,
    attendanceMap,
    attendanceTarget,
    setAttendanceTarget,
    chartStats,
    sectionHeadcounts,
    handleUpdateAttendance,
  };
}

