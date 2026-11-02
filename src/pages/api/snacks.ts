import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ConflictError, mutateSnackSlot, NotFoundError } from '../../lib/google';

const SnackSchema = z.object({
  eventId: z.string().trim().min(1),
  slot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  action: z.enum(['claim', 'release', 'update_item']),
  item: z.string().trim().max(100).optional(),
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
    const parsed = SnackSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid snack request payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedEvent = await mutateSnackSlot({
      eventId: parsed.data.eventId,
      slot: parsed.data.slot,
      action: parsed.data.action,
      item: parsed.data.item,
      caller,
      locals,
    });

    return new Response(JSON.stringify({ ok: true, event: updatedEvent }), {
      status: 200,
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
    console.error('[Snack API Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to update snack signup.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

