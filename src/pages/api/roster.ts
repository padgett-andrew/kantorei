import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hasRole } from '../../lib/auth';
import { ConflictError, upsertRosterSinger } from '../../lib/google';
import { inferSectionGroup, MEMBER_ROLES, SECTION_GROUPS, VOICE_PARTS } from '../../types/choir';

const RosterPayloadSchema = z.object({
  email: z.string().trim().email('Valid email address is required.'),
  name: z.string().trim().min(1, 'Full name is required.'),
  voicePart: z.enum(VOICE_PARTS),
  sectionGroup: z.enum(SECTION_GROUPS).optional(),
  role: z.enum(MEMBER_ROLES).default('Singer'),
  phone: z.string().trim().default(''),
  active: z.boolean().default(true),
});

async function handleRosterMutation(
  request: Request,
  locals: App.Locals,
  mode: 'create' | 'update'
): Promise<Response> {
  const caller = locals.singer;
  if (!hasRole(caller, ['Admin'])) {
    return new Response(
      JSON.stringify({ error: 'Only Admins may add or edit Roster members.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const parsed = RosterPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid singer data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = parsed.data;
    const saved = await upsertRosterSinger({
      singer: {
        email: data.email.toLowerCase(),
        name: data.name,
        voicePart: data.voicePart,
        sectionGroup: data.sectionGroup ?? inferSectionGroup(data.voicePart),
        role: data.role,
        phone: data.phone,
        active: data.active,
      },
      mode,
      locals,
    });

    return new Response(JSON.stringify({ ok: true, singer: saved }), {
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
    console.error('[Roster API Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to save roster member.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const POST: APIRoute = ({ request, locals }) =>
  handleRosterMutation(request, locals, 'create');

export const PUT: APIRoute = ({ request, locals }) =>
  handleRosterMutation(request, locals, 'update');

