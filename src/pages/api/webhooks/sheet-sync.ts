import type { APIRoute } from 'astro';
import { invalidateCacheTag, type CacheTag } from '../../../lib/cache';
import { getAuthSecret, getEnv } from '../../../lib/env';

function normalizeTabToTag(tabName: string): CacheTag[] {
  const clean = tabName.trim().toLowerCase().replace(/[\s_-]+/g, '');
  switch (clean) {
    case 'roster':
      return ['roster'];
    case 'schedule':
      return ['schedule'];
    case 'absences':
    case 'absence':
      return ['absences'];
    case 'concerts':
    case 'concert':
      return ['concerts'];
    case 'config':
    case 'settings':
      return ['config'];
    case 'media':
      return ['media'];
    case 'seatingcharts':
    case 'seating':
      return ['seating_charts'];
    case 'snacks':
    case 'snack':
      return ['schedule'];
    case 'handbook':
      return ['handbook'];
    case 'strategicplan':
      return ['strategic-plan'];
    case 'music':
    case 'repertoire':
      return ['music'];
    case 'all':
      return [
        'roster',
        'schedule',
        'absences',
        'concerts',
        'config',
        'media',
        'seating_charts',
        'handbook',
        'strategic-plan',
        'music',
      ];
    default:
      return ['schedule', 'roster'];
  }
}

async function verifyWebhookSecret(
  providedSecret: string | null,
  locals?: App.Locals
): Promise<boolean> {
  if (!providedSecret) return false;

  const configured = getEnv('SHEET_WEBHOOK_SECRET', locals).trim();
  if (configured && providedSecret === configured) {
    return true;
  }

  // Fallback: Default to verifying against the first 16 chars of the SHA-256 HMAC of AUTH_SECRET
  const authSecret = getAuthSecret(locals);
  const digestBuf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`sheet-webhook:${authSecret}`)
  );
  const expectedDefault = Array.from(new Uint8Array(digestBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);

  return providedSecret === expectedDefault || (configured ? false : providedSecret === authSecret);
}

export const POST: APIRoute = async ({ request, locals }) => {
  let providedSecret = request.headers.get('x-sheet-webhook-secret');
  let requestedTab = 'all';

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.secret) providedSecret = String(body.secret);
      if (body.tab) requestedTab = String(body.tab);
    } else {
      const formData = await request.formData();
      if (formData.get('secret')) providedSecret = String(formData.get('secret'));
      if (formData.get('tab')) requestedTab = String(formData.get('tab'));
    }
  } catch {
    // Body parsing error; proceed to check headers/query
  }

  const isValid = await verifyWebhookSecret(providedSecret, locals);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook request.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tagsToInvalidate = normalizeTabToTag(requestedTab);
  await Promise.all(tagsToInvalidate.map((t) => invalidateCacheTag(t)));

  console.log(`[Push Webhook] Google Sheet onEdit triggered edge cache purge for:`, tagsToInvalidate);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Invalidated ${tagsToInvalidate.length} cache tag(s).`,
      invalidatedTags: tagsToInvalidate,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const GET: APIRoute = async ({ url, locals }) => {
  const secret = url.searchParams.get('secret');
  const tab = url.searchParams.get('tab') || 'all';

  const isValid = await verifyWebhookSecret(secret, locals);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook request.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tagsToInvalidate = normalizeTabToTag(tab);
  await Promise.all(tagsToInvalidate.map((t) => invalidateCacheTag(t)));

  return new Response(
    JSON.stringify({
      success: true,
      message: `Cache tag(s) purged on-demand: ${tagsToInvalidate.join(', ')}`,
      invalidatedTags: tagsToInvalidate,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

