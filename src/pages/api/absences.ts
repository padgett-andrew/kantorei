import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hasRole } from '../../lib/auth';
import { sendAbsenceAlertEmail, sendAbsenceRescindedEmail } from '../../lib/email';
import {
  clearAbsenceRecord,
  getAbsences,
  getPortalConfig,
  getRoster,
  getSchedule,
  NotFoundError,
  upsertAbsenceRecord,
} from '../../lib/google';
import { getTodayIso } from '../../lib/utils';
import { formatAbsenceRecipients } from '../../lib/absence-recipients';

const PostAbsenceSchema = z.object({
  eventId: z.string().trim().min(1, 'Please select a rehearsal or concert.'),
  reason: z.string().trim().max(500).default(''),
  targetEmail: z.string().trim().email().optional(),
  targetSingerEmail: z.string().trim().email().optional(),
  status: z.enum(['Absent', 'Late']).default('Absent'),
  source: z.string().optional(),
});

const DeleteAbsenceSchema = z.object({
  eventId: z.string().trim().min(1),
  targetEmail: z.string().trim().email().optional(),
  targetSingerEmail: z.string().trim().email().optional(),
  source: z.string().optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = PostAbsenceSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid submission.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestedEmail = (parsed.data.targetEmail || parsed.data.targetSingerEmail)?.toLowerCase();
    const isSelf = !requestedEmail || requestedEmail === caller.email;
    const isRollCall = parsed.data.source === 'roll_call' || !isSelf;

    if (!isSelf && !hasRole(caller, ['Section_Leader', 'Admin'])) {
      return new Response(
        JSON.stringify({ error: 'Only Section Leaders or Admins can log roll-call absences.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [roster, schedule, config] = await Promise.all([
      getRoster(locals),
      getSchedule(locals),
      getPortalConfig(locals),
    ]);

    const event = schedule.find((e) => e.eventId === parsed.data.eventId);
    if (!event) {
      return new Response(JSON.stringify({ error: 'Selected rehearsal event not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetSinger = isSelf
      ? caller
      : roster.find((s) => s.email === requestedEmail);

    if (!targetSinger) {
      return new Response(JSON.stringify({ error: 'Target singer not found on Roster.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestedStatus = parsed.data.status ?? 'Absent';
    const submittedBy = isSelf ? 'Self' : `${caller.name} (Roll Call)`;
    const fallbackReason = isSelf
      ? requestedStatus === 'Late'
        ? 'Running late'
        : 'Personal conflict'
      : requestedStatus === 'Late'
      ? 'Marked late at roll call'
      : 'Marked absent at roll call';

    const absence = await upsertAbsenceRecord({
      eventId: event.eventId,
      date: event.date,
      targetSinger,
      reason: parsed.data.reason || fallbackReason,
      submittedBy,
      status: requestedStatus,
      locals,
    });

    // Compute updated active absence and late counts for this section & event
    const allAbsences = await getAbsences(locals);
    const sectionEmails = new Set(
      roster
        .filter((s) => Boolean(targetSinger.sectionGroup) && s.sectionGroup === targetSinger.sectionGroup)
        .map((s) => s.email)
    );
    const sectionRecords = allAbsences.filter(
      (a) =>
        a.eventId === event.eventId &&
        (sectionEmails.has(a.singerEmail) ||
          Boolean(targetSinger.voicePart && a.voicePart && a.voicePart[0] === targetSinger.voicePart[0]))
    );
    const sectionAbsenceCount = sectionRecords.filter((a) => a.status === 'Absent').length;
    const sectionLateCount = sectionRecords.filter((a) => a.status === 'Late').length;

    let emailResult = null;
    let recipientsInfo = null;

    // Only send the absence notification when a singer creates one, NOT during roll call.
    if (!isRollCall) {
      const sectionLeaders = targetSinger.sectionGroup
        ? roster.filter(
            (s) =>
              s.active &&
              s.role === 'Section_Leader' &&
              s.sectionGroup === targetSinger.sectionGroup
          )
        : [];

      const admins = roster.filter((s) => s.active && s.role === 'Admin');

      recipientsInfo = formatAbsenceRecipients({
        sectionGroup: targetSinger.sectionGroup || '',
        sectionLeaders: sectionLeaders.map((s) => s.name),
        conductorName: config.Conductor_Name || 'Adam Reinwald',
      });

      emailResult = await sendAbsenceAlertEmail({
        absence,
        event,
        sectionGroup: targetSinger.sectionGroup || '',
        sectionLeaders,
        admins,
        config,
        sectionAbsenceCount,
        sectionLateCount,
        locals,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        absence,
        record: absence,
        sectionAbsenceCount,
        sectionLateCount,
        emailResult,
        recipients: recipientsInfo,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Absence POST Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to record absence.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = DeleteAbsenceSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid clear request.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestedEmail = (parsed.data.targetEmail || parsed.data.targetSingerEmail)?.toLowerCase();
    const isSelf = !requestedEmail || requestedEmail === caller.email;
    const isRollCall = parsed.data.source === 'roll_call' || !isSelf;

    if (!isSelf && !hasRole(caller, ['Section_Leader', 'Admin'])) {
      return new Response(
        JSON.stringify({ error: 'Only Section Leaders or Admins can clear another singer.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetEmail = isSelf ? caller.email : requestedEmail!;
    const clearedBy = isSelf ? 'Self (Withdrawn)' : `${caller.name} (Cleared)`;

    const clearedRecord = await clearAbsenceRecord({
      eventId: parsed.data.eventId,
      singerEmail: targetEmail,
      clearedBy,
      locals,
    });

    let emailResult = null;
    // Only send the notification if an absence is rescinded by the singer, NOT during roll call.
    if (!isRollCall) {
      const [roster, schedule, config] = await Promise.all([
        getRoster(locals),
        getSchedule(locals),
        getPortalConfig(locals),
      ]);

      const targetSinger = isSelf
        ? caller
        : roster.find((s) => s.email === targetEmail);

      if (targetSinger) {
        const event = schedule.find((e) => e.eventId === parsed.data.eventId);
        const eventDate = event?.date || clearedRecord.date;
        const today = getTodayIso(config.Calendar_Timezone || 'America/Chicago');
        const isAfterCallDate = Boolean(eventDate && eventDate < today);

        if (!isAfterCallDate) {
          const allAbsences = await getAbsences(locals);
          const sectionEmails = new Set(
            roster
              .filter((s) => Boolean(targetSinger.sectionGroup) && s.sectionGroup === targetSinger.sectionGroup)
              .map((s) => s.email)
          );
          const sectionRecords = allAbsences.filter(
            (a) =>
              a.eventId === parsed.data.eventId &&
              (sectionEmails.has(a.singerEmail) ||
                Boolean(targetSinger.voicePart && a.voicePart && a.voicePart[0] === targetSinger.voicePart[0]))
          );
          const sectionAbsenceCount = sectionRecords.filter((a) => a.status === 'Absent').length;
          const sectionLateCount = sectionRecords.filter((a) => a.status === 'Late').length;

          const sectionLeaders = targetSinger.sectionGroup
            ? roster.filter(
                (s) =>
                  s.active &&
                  s.role === 'Section_Leader' &&
                  s.sectionGroup === targetSinger.sectionGroup
              )
            : [];
          const admins = roster.filter((s) => s.active && s.role === 'Admin');

          emailResult = await sendAbsenceRescindedEmail({
            absence: clearedRecord,
            event,
            sectionGroup: targetSinger.sectionGroup || '',
            sectionLeaders,
            admins,
            config,
            sectionAbsenceCount,
            sectionLateCount,
            rescindedBy: clearedBy,
            locals,
          });
        } else {
          emailResult = {
            delivered: false,
            sandboxMode: false,
            recipients: [],
            note: `Absence withdrawn after the day of the call time (${eventDate} < ${today}); email alert skipped.`,
          };
        }
      }
    }

    const skippedEmailBecausePastDate =
      emailResult?.delivered === false &&
      Boolean(emailResult?.note?.includes('after the day of the call time'));

    return new Response(
      JSON.stringify({
        ok: true,
        rescinded: true,
        clearedRecord,
        emailResult,
        skippedEmailBecausePastDate,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    if (err instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[Absence DELETE Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to clear absence.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

