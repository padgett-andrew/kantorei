import type { APIRoute } from 'astro';
import { hasRole } from '../../lib/auth';
import {
  appendBulletinMessage,
  getBulletinMessages,
  NotFoundError,
  updateBulletinMessageStatus,
} from '../../lib/google';
import { CreateBulletinMessageRequestSchema } from '../../lib/schemas';
import { BULLETIN_MESSAGE_STATUSES, type BulletinMessageStatus } from '../../types/choir';

export const GET: APIRoute = async ({ locals }) => {
  const singer = locals.singer;
  if (!singer) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const messages = await getBulletinMessages(locals);
    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load messages.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const singer = locals.singer;
  if (!singer) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasRole(singer, ['Section_Leader', 'Admin'])) {
    return new Response(
      JSON.stringify({
        error: 'Only Section Leaders and Admins can post directly from the portal.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = CreateBulletinMessageRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues.map((i) => i.message).join(' '),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const message = await appendBulletinMessage({
      fromName: parsed.data.fromName || singer.name,
      fromEmail: parsed.data.fromEmail || singer.email,
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText,
      category: parsed.data.category,
      pinned: parsed.data.pinned,
      locals,
    });

    const messages = await getBulletinMessages(locals);
    return new Response(JSON.stringify({ ok: true, message, messages }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to post dispatch.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const singer = locals.singer;
  if (!singer) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasRole(singer, ['Section_Leader', 'Admin'])) {
    return new Response(
      JSON.stringify({ error: 'Only Section Leaders and Admins can pin or archive dispatches.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { id?: string; pinned?: boolean; status?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = (body.id || '').trim();
  if (!id) {
    return new Response(JSON.stringify({ error: 'Message ID is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validStatus =
    body.status && (BULLETIN_MESSAGE_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as BulletinMessageStatus)
      : undefined;

  try {
    const updated = await updateBulletinMessageStatus({
      id,
      pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
      status: validStatus,
      locals,
    });
    const messages = await getBulletinMessages(locals);
    return new Response(JSON.stringify({ ok: true, message: updated, messages }), {
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
    const message = err instanceof Error ? err.message : 'Failed to update dispatch.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
