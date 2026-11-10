import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { getPortalConfig } from '../../../lib/google';
import { addSubscriberToMailerLite } from '../../../lib/mailerlite';

export interface QuestionItem {
  question?: unknown;
  name?: string;
  label?: string;
  title?: string;
  question_text?: string;
  question_title?: string;
  answer?: unknown;
  value?: unknown;
  response?: unknown;
  selected_options?: unknown;
}

const MARKETING_QUESTION_REGEX =
  /(friends?|newsletter|subscribe|mailing|marketing|email.*list|email.*update|receive.*(email|update|info|news)|keep.*in.*touch|announcement|tune|future.*concert)/i;

export function extractQuestionText(q: QuestionItem): string {
  if (typeof q.question === 'string') return q.question;
  if (q.question && typeof q.question === 'object') {
    const qObj = q.question as Record<string, unknown>;
    return String(qObj.title || qObj.name || qObj.label || qObj.question || '');
  }
  return String(
    q.title ||
      q.label ||
      q.name ||
      q.question_text ||
      q.question_title ||
      ''
  );
}

export function isMarketingQuestion(questionText: string): boolean {
  return MARKETING_QUESTION_REGEX.test(questionText || '');
}

export function isAffirmativeAnswer(rawAnswer: unknown): boolean {
  if (typeof rawAnswer === 'boolean') return rawAnswer;
  if (typeof rawAnswer === 'number') return rawAnswer === 1;
  if (Array.isArray(rawAnswer)) {
    return rawAnswer.some(isAffirmativeAnswer);
  }
  if (!rawAnswer) return false;
  if (typeof rawAnswer === 'object') {
    const obj = rawAnswer as Record<string, unknown>;
    return (
      isAffirmativeAnswer(obj.value) ||
      isAffirmativeAnswer(obj.label) ||
      isAffirmativeAnswer(obj.text) ||
      isAffirmativeAnswer(obj.answer)
    );
  }
  const str = String(rawAnswer).trim().toLowerCase();
  if (['no', 'false', '0', 'off', 'unchecked'].includes(str)) return false;
  return (
    ['true', '1', 'on', 'yes', 'checked', 'opt-in', 'opted in', 'y'].includes(str) ||
    str.startsWith('yes') ||
    str.includes('agree') ||
    str.includes('sign me up') ||
    str.includes('subscribe') ||
    str.includes('opt in') ||
    str.includes('please')
  );
}

export async function verifyTicketTailorSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = signatureHeader.split(',').map((p) => p.trim());
  let timestamp = '';
  let expectedSignature = '';

  for (const part of parts) {
    if (part.startsWith('t=')) {
      timestamp = part.slice(2);
    } else if (part.startsWith('v1=') || part.startsWith('s=')) {
      expectedSignature = part.split('=')[1] ?? '';
    }
  }

  if (!expectedSignature) {
    expectedSignature = signatureHeader.trim();
  }

  if (timestamp) {
    const tsNumber = Number.parseInt(timestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    // Allow up to 5 minutes tolerance (300 seconds)
    if (Number.isNaN(tsNumber) || Math.abs(nowSec - tsNumber) > 300) {
      console.warn('[Ticket Tailor Webhook] Webhook timestamp out of tolerance (5 min).');
      return false;
    }
  }

  const payloadToSign = timestamp ? `${timestamp}${rawBody}` : rawBody;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadToSign));
  const hexSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hexSignature.toLowerCase() === expectedSignature.toLowerCase();
}

export const POST: APIRoute = async ({ request, locals }) => {
  let webhookSecret = getEnv('TICKET_TAILOR_WEBHOOK_SECRET', locals).trim();

  // Read webhook secret from Choir Google Sheet Config tab if not in environment
  if (!webhookSecret || webhookSecret === 'DEMO') {
    try {
      const config = await getPortalConfig(locals);
      const sheetSecret =
        (config as any).TT_Webhook_Secret ||
        (config as any).Ticket_Tailor_Webhook_Secret ||
        (config as any).TICKET_TAILOR_WEBHOOK_SECRET ||
        (config as any).TicketTailor_Webhook_Secret ||
        (config as any).TT_Secret ||
        (config as any).Webhook_Secret;
      if (typeof sheetSecret === 'string' && sheetSecret.trim()) {
        webhookSecret = sheetSecret.trim();
      }
    } catch {
      // Gracefully fall back if sheet config is inaccessible
    }
  }

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify signature if secret is configured
  if (webhookSecret && webhookSecret !== 'DEMO') {
    const signature =
      request.headers.get('tickettailor-webhook-signature') ||
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

    const isValid = await verifyTicketTailorSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn('[Ticket Tailor Webhook] Invalid HMAC-SHA256 signature.');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eventName = String(body.event || body.type || body.action || 'order.created');

  // We are primarily interested in order completion / creation / ticket issuance events
  if (
    !eventName.startsWith('order.') &&
    !eventName.startsWith('issued_ticket.') &&
    !eventName.startsWith('ticket.')
  ) {
    return new Response(
      JSON.stringify({ received: true, ignored: true, reason: `Ignored event: ${eventName}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const payload =
    (body.payload as Record<string, unknown>) ||
    (body.data as Record<string, unknown>) ||
    body;

  const buyer =
    (payload.buyer as Record<string, unknown>) ||
    (payload.customer as Record<string, unknown>) ||
    {};

  const buyerEmail = String(buyer.email || payload.buyer_email || payload.email || '')
    .trim()
    .toLowerCase();

  const buyerName = String(
    buyer.name ||
      [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') ||
      payload.buyer_name ||
      payload.name ||
      ''
  ).trim();

  if (!buyerEmail || !buyerEmail.includes('@')) {
    return new Response(
      JSON.stringify({ received: true, ignored: true, reason: 'No buyer email found' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Collect questions from all potential order & buyer paths
  const questionSources: QuestionItem[] = [
    ...((payload.custom_questions as QuestionItem[]) || []),
    ...((payload.questions as QuestionItem[]) || []),
    ...((payload.buyer_questions as QuestionItem[]) || []),
    ...((buyer.questions as QuestionItem[]) || []),
    ...((buyer.custom_questions as QuestionItem[]) || []),
  ];

  let askedOptIn = false;
  let optedIn = false;

  for (const q of questionSources) {
    const questionText = extractQuestionText(q).toLowerCase();

    if (isMarketingQuestion(questionText)) {
      askedOptIn = true;
      const rawAns = q.answer ?? q.value ?? q.response ?? q.selected_options;
      if (isAffirmativeAnswer(rawAns)) {
        optedIn = true;
      }
    }
  }

  // Subscribers to record: map by lowercase email to deduplicate
  const subscribersToSync = new Map<string, { email: string; name: string }>();

  // If question was asked and answered affirmatively, or if no explicit question was asked
  const shouldSubscribeBuyer = optedIn || (!askedOptIn && Boolean(buyerEmail));
  if (shouldSubscribeBuyer) {
    subscribersToSync.set(buyerEmail, { email: buyerEmail, name: buyerName });
  }

  // Also check per-ticket attendee opt-ins (e.g. issued_tickets or line_items)
  const tickets = (
    (payload.issued_tickets as unknown[]) ||
    (payload.line_items as unknown[]) ||
    (payload.tickets as unknown[]) ||
    []
  ) as Record<string, unknown>[];

  for (const ticket of tickets) {
    const holder =
      (ticket.attendee as Record<string, unknown>) ||
      (ticket.holder as Record<string, unknown>) ||
      ticket;

    const attendeeEmail = String(holder.email || ticket.email || '').trim().toLowerCase();
    const attendeeName = String(
      holder.name ||
        [holder.first_name, holder.last_name].filter(Boolean).join(' ') ||
        ticket.name ||
        ''
    ).trim();

    if (!attendeeEmail || !attendeeEmail.includes('@')) continue;

    const ticketQuestions: QuestionItem[] = [
      ...((ticket.custom_questions as QuestionItem[]) || []),
      ...((ticket.questions as QuestionItem[]) || []),
      ...((holder.questions as QuestionItem[]) || []),
      ...((holder.custom_questions as QuestionItem[]) || []),
    ];

    let attendeeAsked = false;
    let attendeeOptedIn = false;

    for (const tq of ticketQuestions) {
      const qText = extractQuestionText(tq).toLowerCase();
      if (isMarketingQuestion(qText)) {
        attendeeAsked = true;
        if (isAffirmativeAnswer(tq.answer ?? tq.value ?? tq.response ?? tq.selected_options)) {
          attendeeOptedIn = true;
        }
      }
    }

    if (attendeeOptedIn || (!attendeeAsked && shouldSubscribeBuyer)) {
      if (!subscribersToSync.has(attendeeEmail)) {
        subscribersToSync.set(attendeeEmail, {
          email: attendeeEmail,
          name: attendeeName || buyerName,
        });
      }
    }
  }

  // Dispatch subscriptions directly to MailerLite
  const results = await Promise.allSettled(
    Array.from(subscribersToSync.values()).map(async (sub) => {
      const mlRes = await addSubscriberToMailerLite(
        {
          email: sub.email,
          name: sub.name,
          source: 'Ticket_Tailor',
        },
        locals
      );

      return {
        email: sub.email,
        mailerLiteSaved: mlRes.success,
      };
    })
  );

  return new Response(
    JSON.stringify({
      received: true,
      event: eventName,
      buyerEmail,
      subscribedCount: subscribersToSync.size,
      subscribers: Array.from(subscribersToSync.keys()),
      details: results,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
