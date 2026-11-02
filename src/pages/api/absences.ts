import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hasRole } from '../../lib/auth';
import { sendAbsenceAlertEmail } from '../../lib/email';
import {
  clearAbsenceRecord,
  getAbsences,
  getPortalConfig,
  getRoster,
  getSchedule,
  NotFoundError,
  upsertAbsenceRecord,
} from '../../lib/google';

const PostAbsenceSchema = z.object({
  eventId: z.string().trim().min(1, 'Please select a rehearsal or concert.'),
  reason: z.string().trim().max(500).default(''),
  targetEmail: z.string().trim().email().optional(),
});

const DeleteAbsenceSchema = z.object({
  eventId: z.string().trim().min(1),
  targetEmail: z.string().trim().email().optional(),
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

    const requestedEmail = parsed.data.targetEmail?.toLowerCase();
    const isSelf = !requestedEmail || requestedEmail === caller.email;

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

    const submittedBy = isSelf ? 'Self' : `${caller.name} (Roll Call)`;
    const absence = await upsertAbsenceRecord({
      eventId: event.eventId,
      date: event.date,
      targetSinger,
      reason: parsed.data.reason || (isSelf ? 'Personal conflict' : 'Marked absent at roll call'),
      submittedBy,
      locals,
    });

    // Compute updated active absence count for this section & event
    const allAbsences = await getAbsences(locals);
    const sectionEmails = new Set(
      roster
        .filter((s) => s.sectionGroup === targetSinger.sectionGroup)
        .map((s) => s.email)
    );
    const sectionAbsenceCount = allAbsences.filter(
      (a) =>
        a.eventId === event.eventId &&
        a.status === 'Absent' &&
        (sectionEmails.has(a.singerEmail) ||
          a.voicePart[0] === targetSinger.voicePart[0])
    ).length;

    const sectionLeaders = roster.filter(
      (s) =>
        s.active &&
        s.role === 'Section_Leader' &&
        s.sectionGroup === targetSinger.sectionGroup
    );

    const admins = roster.filter((s) => s.active && s.role === 'Admin');

    const emailResult = await sendAbsenceAlertEmail({
      absence,
      event,
      sectionGroup: targetSinger.sectionGroup,
      sectionLeaders,
      admins,
      config,
      sectionAbsenceCount,
      locals,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        absence,
        sectionAbsenceCount,
        emailResult,
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

    const requestedEmail = parsed.data.targetEmail?.toLowerCase();
    const isSelf = !requestedEmail || requestedEmail === caller.email;
    if (!isSelf && !hasRole(caller, ['Section_Leader', 'Admin'])) {
      return new Response(
        JSON.stringify({ error: 'Only Section Leaders or Admins can clear another singer.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await clearAbsenceRecord({
      eventId: parsed.data.eventId,
      singerEmail: isSelf ? caller.email : requestedEmail!,
      clearedBy: isSelf ? 'Self (Cleared)' : `${caller.name} (Cleared)`,
      locals,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

