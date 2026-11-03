import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hasRole } from '../../lib/auth';
import {
  deleteSeatingChart,
  getSeatingCharts,
  upsertSeatingChart,
  NotFoundError,
  ConflictError,
} from '../../lib/google';
import { UpsertSeatingChartRequestSchema } from '../../lib/schemas';

const DeleteSeatingChartSchema = z.object({
  chartId: z.string().trim().min(1, 'Missing chartId'),
});

export const GET: APIRoute = async ({ locals, url }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const allCharts = await getSeatingCharts(locals);
    const canSeeDrafts = hasRole(caller, ['Section_Leader', 'Admin']);

    const seasonFilter = url.searchParams.get('season')?.trim();
    const concertFilter = url.searchParams.get('concertSlug')?.trim();

    let filtered = allCharts.filter((c) => {
      if (!canSeeDrafts && c.status === 'Draft') return false;
      if (seasonFilter && c.season !== seasonFilter) return false;
      if (concertFilter && c.concertSlug !== concertFilter) return false;
      return true;
    });

    return new Response(JSON.stringify({ ok: true, charts: filtered }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API /api/seating GET Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to load seating charts.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasRole(caller, ['Admin'])) {
    return new Response(JSON.stringify({ error: 'Only choir admins can create seating charts.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = UpsertSeatingChartRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid seating chart data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chart = await upsertSeatingChart({
      chart: parsed.data,
      mode: 'create',
      locals,
    });

    return new Response(JSON.stringify({ ok: true, chart }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[API /api/seating POST Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to create seating chart.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const caller = locals.singer;
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasRole(caller, ['Admin'])) {
    return new Response(JSON.stringify({ error: 'Only choir admins can update seating charts.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = UpsertSeatingChartRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid seating chart data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const chart = await upsertSeatingChart({
      chart: parsed.data,
      mode: 'update',
      locals,
    });

    return new Response(JSON.stringify({ ok: true, chart }), {
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
    console.error('[API /api/seating PUT Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to update seating chart.' }), {
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

  if (!hasRole(caller, ['Admin'])) {
    return new Response(JSON.stringify({ error: 'Only choir admins can delete seating charts.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = DeleteSeatingChartSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid delete request.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await deleteSeatingChart({ chartId: parsed.data.chartId, locals });

    return new Response(JSON.stringify({ ok: true, chartId: parsed.data.chartId }), {
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
    console.error('[API /api/seating DELETE Error]', err);
    return new Response(JSON.stringify({ error: 'Failed to delete seating chart.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

