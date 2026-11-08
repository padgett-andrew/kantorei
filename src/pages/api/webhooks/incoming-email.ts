import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { appendBulletinMessage, getRoster } from '../../../lib/google';
import { inferBulletinCategory } from '../../../lib/schemas';
import type { BulletinCategory } from '../../../types/choir';

/**
 * Parses an RFC 5322 "From" header such as `"Adam Reinwald" <adam.reinwald@kantorei.net>`
 * or `adam.reinwald@kantorei.net` into clean `{ name, email }` strings.
 */
function parseFromHeader(rawFrom: string): { name: string; email: string } {
  const trimmed = (rawFrom || '').trim();
  const angleMatch = /^"?([^"<]*)"?\s*<([^>]+)>$/.exec(trimmed);
  if (angleMatch) {
    const rawName = angleMatch[1].trim().replace(/^["']|["']$/g, '');
    const email = angleMatch[2].trim().toLowerCase();
    return {
      name: rawName || email.split('@')[0],
      email,
    };
  }
  if (trimmed.includes('@')) {
    const email = trimmed.replace(/[<>]/g, '').trim().toLowerCase();
    return {
      name: email.split('@')[0],
      email,
    };
  }
  return {
    name: trimmed || 'Kantorei Mailing List',
    email: 'singers@kantorei.net',
  };
}

/**
 * Strips mailing-list subject prefixes like `[Kantorei Singers]`, `[singers]`,
 * and normalizes whitespace while preserving `Re:` thread indicators if present.
 */
function cleanListSubject(rawSubject: string, bodyFallback: string): string {
  const cleaned = (rawSubject || '')
    .replace(/^\s*\[(?:kantorei|singers|choir)[^\]]*\]\s*/i, '')
    .trim();

  if (cleaned.length > 0) return cleaned;

  const firstMeaningfulLine = bodyFallback
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 3 && !/^(hello|hi|dear|hey)\b/i.test(l));

  return firstMeaningfulLine
    ? firstMeaningfulLine.replace(/[:.]+$/, '').slice(0, 110)
    : 'Ensemble Dispatch from singers@kantorei.net';
}

/**
 * Strips trailing Google Groups / mailing-list unsubscribe footers so the portal
 * bulletin reads like a clean editorial dispatch.
 */
function cleanEmailBody(rawBody: string): string {
  const normalized = (rawBody || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const trimmedLines: string[] = [];

  for (const line of lines) {
    if (
      /^--\s*$/.test(line) ||
      /^You received this message because you are subscribed to/i.test(line.trim()) ||
      /^To unsubscribe from this group and stop receiving emails/i.test(line.trim())
    ) {
      break;
    }
    trimmedLines.push(line);
  }

  return trimmedLines.join('\n').trim();
}

export const POST: APIRoute = async ({ request, locals }) => {
  const webhookSecret = getEnv('EMAIL_BOT_WEBHOOK_SECRET', locals);

  // Verify webhook secret if configured in production/staging
  if (webhookSecret && webhookSecret !== 'DEMO') {
    const providedSecret =
      request.headers.get('x-kantorei-bot-secret') ||
      request.headers.get('x-webhook-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!providedSecret || providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized email bot webhook signature.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Loop & bounce protection: ignore auto-submitted or bounce notifications
  const headers = (payload.headers as Record<string, string>) || {};
  const autoSubmitted = String(
    headers['auto-submitted'] || payload.autoSubmitted || ''
  ).toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') {
    return new Response(
      JSON.stringify({ received: true, ignored: true, reason: 'Auto-submitted message ignored' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawFrom = String(
    payload.from || payload.sender || payload.fromEmail || 'singers@kantorei.net'
  );
  const parsedFrom = parseFromHeader(rawFrom);
  const explicitFromName = typeof payload.fromName === 'string' ? payload.fromName.trim() : '';

  const rawBody = String(
    payload.text || payload.bodyText || payload.body || payload.plain || ''
  );
  const bodyText = cleanEmailBody(rawBody);

  if (!bodyText) {
    return new Response(
      JSON.stringify({ error: 'Email body text is empty.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawSubject = String(payload.subject || '');
  const subject = cleanListSubject(rawSubject, bodyText);

  // Match sender against the live Roster to use their canonical display name if available
  let resolvedFromName = explicitFromName || parsedFrom.name;
  try {
    const roster = await getRoster(locals);
    const matchedSinger = roster.find(
      (s) => s.email.toLowerCase() === parsedFrom.email.toLowerCase()
    );
    if (matchedSinger) {
      resolvedFromName = matchedSinger.name;
    }
  } catch {
    // Non-fatal if roster lookup fails
  }

  const category =
    (payload.category as BulletinCategory | undefined) ||
    inferBulletinCategory(subject, bodyText);

  const pinned = Boolean(payload.pinned);
  const messageId =
    typeof payload.messageId === 'string' && payload.messageId.trim()
      ? payload.messageId.trim()
      : undefined;
  const threadId =
    typeof payload.threadId === 'string' && payload.threadId.trim()
      ? payload.threadId.trim()
      : undefined;

  try {
    const saved = await appendBulletinMessage({
      id: messageId,
      timestamp: typeof payload.timestamp === 'string' ? payload.timestamp : undefined,
      fromName: resolvedFromName,
      fromEmail: parsedFrom.email,
      subject,
      bodyText,
      category,
      pinned,
      threadId,
      locals,
    });

    return new Response(
      JSON.stringify({
        received: true,
        ingested: true,
        message: saved,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to store incoming email.';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
