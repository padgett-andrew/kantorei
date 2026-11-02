import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  createSessionToken,
  OTP_CHALLENGE_COOKIE,
  setSessionCookie,
  verifyOtpChallengeToken,
} from '../../../../lib/auth';
import { getRoster } from '../../../../lib/google';

const VerifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const POST: APIRoute = async ({ request, url, cookies, locals }) => {
  try {
    const body = await request.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid code format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const challengeToken = cookies.get(OTP_CHALLENGE_COOKIE)?.value;
    if (!challengeToken) {
      return new Response(
        JSON.stringify({
          error: 'Code expired or not requested in this browser. Please request a new code.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const valid = await verifyOtpChallengeToken({
      challengeToken,
      email: normalizedEmail,
      code: parsed.data.code,
      locals,
    });

    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Incorrect or expired 6-digit code.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const roster = await getRoster(locals);
    const singer = roster.find((s) => s.email === normalizedEmail && s.active);
    if (!singer) {
      return new Response(
        JSON.stringify({ error: 'Your email is not currently marked Active on the choir roster.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    cookies.delete(OTP_CHALLENGE_COOKIE, { path: '/' });
    const sessionJwt = await createSessionToken(singer.email, locals);
    setSessionCookie(cookies, sessionJwt, url);

    return new Response(JSON.stringify({ ok: true, redirectTo: '/portal' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[OTP Verify Error]', err);
    return new Response(JSON.stringify({ error: 'Verification failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

