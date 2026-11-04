import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  createOtpChallengeToken,
  generateSixDigitCode,
  matchRosterEmail,
  OTP_CHALLENGE_COOKIE,
} from '../../../../lib/auth';
import { sendLoginOtpEmail } from '../../../../lib/email';
import { canAccessPortal } from '../../../../types/choir';
import { getPortalConfig, getRoster } from '../../../../lib/google';

const RequestSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const POST: APIRoute = async ({ request, url, cookies, locals }) => {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid email.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const [roster, config] = await Promise.all([
      getRoster(locals),
      getPortalConfig(locals),
    ]);

    const singer = roster.find(
      (s) => matchRosterEmail(s.email, normalizedEmail) && canAccessPortal(s)
    );

    // Return identical generic message if email isn't on active roster to prevent enumeration
    if (!singer) {
      return new Response(
        JSON.stringify({
          ok: true,
          message:
            'If your email is on the active Kantorei roster, a 6-digit login code has been sent.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const code = generateSixDigitCode();
    const challengeJwt = await createOtpChallengeToken(normalizedEmail, code, locals);

    cookies.set(OTP_CHALLENGE_COOKIE, challengeJwt, {
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    const emailResult = await sendLoginOtpEmail({
      toEmail: normalizedEmail,
      singerName: singer.name,
      code,
      choirName: config.Choir_Name || 'Kantorei',
      locals,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          'If your email is on the active Kantorei roster, a 6-digit login code has been sent.',
        devPreviewCode: emailResult.devPreviewCode,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[OTP Send Error]', err);
    return new Response(JSON.stringify({ error: 'Unable to send login code right now.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

