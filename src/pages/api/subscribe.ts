import type { APIRoute } from 'astro';
import { recordSubscriber } from '../../lib/google';
import { addSubscriberToMailerLite } from '../../lib/mailerlite';
import { SubscribeRequestSchema } from '../../lib/schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown> = {};

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Expected JSON or form payload' }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Malformed request payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Silent honeypot rejection for automated bot submissions
  if (typeof body.website_hp === 'string' && body.website_hp.trim().length > 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Thank you for joining Friends of Kantorei!",
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Validate request parameters
  const parsed = SubscribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid subscription details';
    return new Response(
      JSON.stringify({ ok: false, error: firstError }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { email, name, source } = parsed.data;

  // 3. Concurrently record into Choir Google Sheet and sync to MailerLite
  try {
    const [sheetRes, mlRes] = await Promise.allSettled([
      recordSubscriber({
        email,
        name,
        source: source || 'Website',
        locals,
      }),
      addSubscriberToMailerLite(
        {
          email,
          name,
          source: source || 'Website',
        },
        locals
      ),
    ]);

    if (sheetRes.status === 'rejected') {
      console.error('[Subscribe Error] Failed to write to Google Sheet:', sheetRes.reason);
    }
    if (mlRes.status === 'rejected') {
      console.error('[Subscribe Error] Failed to write to MailerLite:', mlRes.reason);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Thank you for joining Friends of Kantorei! You're on the list to receive concert announcements, listening guides, and recordings.",
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Subscription error';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
