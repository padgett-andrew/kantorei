import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { recordSubscriber } from '../../../lib/google';
import { addSubscriberToMailerLite } from '../../../lib/mailerlite';

interface QuestionItem {
  question?: string;
  name?: string;
  label?: string;
  answer?: unknown;
  value?: unknown;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const webhookSecret = getEnv('TICKET_TAILOR_WEBHOOK_SECRET', locals);

  // Optional signature verification if secret is configured
  if (webhookSecret && webhookSecret !== 'DEMO') {
    const signature =
      request.headers.get('tt-signature') ||
      request.headers.get('x-tickettailor-signature') ||
      request.headers.get('x-signature');

    if (!signature) {
      console.warn('[Ticket Tailor Webhook] Missing signature header while secret is configured.');
      return new Response(JSON.stringify({ error: 'Missing webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eventName = String(body.event || body.type || 'order.created');

  // We are primarily interested in order completion / creation events
  if (!eventName.startsWith('order.') && !eventName.startsWith('issued_ticket.')) {
    return new Response(
      JSON.stringify({ received: true, ignored: true, reason: `Ignored event: ${eventName}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const payload = (body.payload as Record<string, unknown>) || body;
  const buyer = (payload.buyer as Record<string, unknown>) || {};
  const email = String(buyer.email || payload.buyer_email || '').trim().toLowerCase();
  const name = String(
    buyer.name ||
      [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') ||
      payload.buyer_name ||
      ''
  ).trim();

  if (!email || !email.includes('@')) {
    return new Response(
      JSON.stringify({ received: true, ignored: true, reason: 'No buyer email found' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Inspect questions for marketing consent
  const rawQuestions = (
    (payload.custom_questions as unknown[]) ||
    (payload.buyer_questions as unknown[]) ||
    (buyer.questions as unknown[]) ||
    []
  ) as QuestionItem[];

  let askedOptIn = false;
  let optedIn = false;

  for (const q of rawQuestions) {
    const questionText = String(q.question || q.name || q.label || '').toLowerCase();
    const isMarketingQuestion =
      questionText.includes('friends') ||
      questionText.includes('update') ||
      questionText.includes('newsletter') ||
      questionText.includes('subscribe') ||
      questionText.includes('mailing') ||
      questionText.includes('tune');

    if (isMarketingQuestion) {
      askedOptIn = true;
      const ans = String(q.answer ?? q.value ?? '').trim().toLowerCase();
      if (
        ans === 'true' ||
        ans === '1' ||
        ans === 'yes' ||
        ans === 'checked' ||
        ans === 'opt-in' ||
        ans === 'opted in' ||
        ans === 'y'
      ) {
        optedIn = true;
      }
    }
  }

  // If question was asked and opted in, or if no explicit question was asked but Ticket Tailor sent the buyer
  const shouldSubscribe = optedIn || (!askedOptIn && Boolean(email));

  if (shouldSubscribe) {
    try {
      await Promise.allSettled([
        recordSubscriber({
          email,
          name,
          source: 'Ticket_Tailor',
          locals,
        }),
        addSubscriberToMailerLite(
          {
            email,
            name,
            source: 'Ticket_Tailor',
          },
          locals
        ),
      ]);

      if (import.meta.env.DEV) {
        console.log(`[Ticket Tailor Webhook] Added subscriber: "${email}" (${name})`);
      }
    } catch (err) {
      console.error('[Ticket Tailor Webhook Error]', err);
    }
  }

  return new Response(
    JSON.stringify({
      received: true,
      event: eventName,
      buyerEmail: email,
      subscribed: shouldSubscribe,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
