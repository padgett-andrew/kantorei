import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hasRole } from '../../lib/auth';
import { invalidateCacheTag } from '../../lib/cache';
import {
  ConflictError,
  NotFoundError,
  getSchedule,
  upsertScheduleEvent,
  deleteScheduleEvent,
} from '../../lib/google';
import { EVENT_TYPES, type ScheduleEvent } from '../../types/choir';

export const GET: APIRoute = async ({ locals, url }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.searchParams.get('action') === 'sync' || url.searchParams.get('sync') === '1') {
    if (!hasRole(caller, ['Admin'])) {
      return new Response(
        JSON.stringify({ error: 'Only Admins may trigger a calendar sync.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    await invalidateCacheTag('schedule');
    const schedule = await getSchedule(locals);
    return new Response(
      JSON.stringify({ ok: true, syncedAt: new Date().toISOString(), schedule }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const schedule = await getSchedule(locals);
  return new Response(JSON.stringify({ schedule }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const SchedulePayloadSchema = z.object({
  eventId: z.string().trim().optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  time: z.string().trim().min(1, 'Time is required.'),
  type: z.enum(EVENT_TYPES).default('Rehearsal'),
  title: z.string().trim().min(1, 'Title is required.'),
  location: z.string().trim().default('TBD'),
  notes: z.string().trim().default(''),
  description: z.string().trim().optional(),
  snack1Name: z.string().trim().optional(),
  snack2Name: z.string().trim().optional(),
  snack3Name: z.string().trim().optional(),
  snack4Name: z.string().trim().optional(),
});

async function handleScheduleMutation(
  request: Request,
  locals: App.Locals,
  mode: 'create' | 'update'
): Promise<Response> {
  const caller = locals.singer;
  if (!hasRole(caller, ['Admin'])) {
    return new Response(
      JSON.stringify({ error: 'Only Admins may add or edit calendar events.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const parsed = SchedulePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid event data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = parsed.data;
    const finalDescription = (data.description || data.notes || '').trim();

    const eventToSave: ScheduleEvent = {
      eventId: data.eventId || '',
      date: data.date,
      time: data.time,
      type: data.type,
      title: data.title,
      location: data.location || 'TBD',
      snack1Name: data.snack1Name || '',
      snack2Name: data.snack2Name || '',
      snack3Name: data.snack3Name || '',
      snack4Name: data.snack4Name || '',
      notes: finalDescription,
      description: finalDescription,
    };

    const saved = await upsertScheduleEvent({
      event: eventToSave,
      mode,
      locals,
    });

    return new Response(JSON.stringify({ ok: true, event: saved }), {
      status: mode === 'create' ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (err instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[Schedule API Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to save calendar event.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const POST: APIRoute = ({ request, locals }) =>
  handleScheduleMutation(request, locals, 'create');

export const PUT: APIRoute = ({ request, locals }) =>
  handleScheduleMutation(request, locals, 'update');

export const DELETE: APIRoute = async ({ request, locals, url }) => {
  const caller = locals.singer;
  if (!hasRole(caller, ['Admin'])) {
    return new Response(
      JSON.stringify({ error: 'Only Admins may remove calendar events.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let eventId = url.searchParams.get('eventId');
    if (!eventId) {
      try {
        const body = await request.json();
        eventId = body?.eventId;
      } catch {
        // No json body
      }
    }

    if (!eventId || typeof eventId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required eventId parameter.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await deleteScheduleEvent({
      eventId: eventId.trim(),
      locals,
    });

    return new Response(JSON.stringify(result), {
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
    console.error('[Schedule Delete Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to delete calendar event.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

