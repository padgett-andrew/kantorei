import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getEnv } from '../../../lib/env';
import { getPortalConfig } from '../../../lib/google';
import { voicePartSchema } from '../../../lib/schemas';
import { formatVoicePartLabel } from '../../../types/choir';

const AuditionSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  voicePart: voicePartSchema,
  preparedSelection: z.string().min(1, 'Prepared selection is required'),
  experience: z.string().min(1, 'Choral experience is required'),
  website_hp: z.string().optional(),
});

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;

    // Silent honeypot rejection for automated bot submissions
    if (typeof rawBody.website_hp === 'string' && rawBody.website_hp.trim().length > 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'Thank you for your audition submission!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const parsed = AuditionSubmissionSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, email, phone, voicePart, preparedSelection, experience } = parsed.data;
    const config = await getPortalConfig(locals);
    const choirName = config.Choir_Name || 'Kantorei';
    const conductorEmail = config.Conductor_Email || config.Contact_Email || 'adam.reinwald@kantorei.net';

    // Dispatch notification via Resend REST API
    const resendApiKey = getEnv('RESEND_API_KEY', locals);
    const fromEmail = getEnv('PORTAL_FROM_EMAIL', locals) || 'Kantorei Portal <onboarding@resend.dev>';
    const sandboxOverride = getEnv('SANDBOX_OVERRIDE_EMAIL', locals);
    const isOnboardingFrom = fromEmail.toLowerCase().includes('onboarding@resend.dev');

    const destination = isOnboardingFrom
      ? sandboxOverride || 'delivered@resend.dev'
      : conductorEmail;

    if (resendApiKey) {
      try {
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safePhone = escapeHtml(phone);
        const safeVoicePart = escapeHtml(formatVoicePartLabel(voicePart));
        const safePreparedSelection = escapeHtml(preparedSelection);
        const safeExperience = escapeHtml(experience);
        const safeChoirName = escapeHtml(choirName);

        const sandboxNotice = isOnboardingFrom
          ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:12px;color:#92400e;">
              <strong>Sandbox Routing Active:</strong> Intended recipient: <code>${escapeHtml(conductorEmail)}</code>
             </div>`
          : '';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [destination],
            reply_to: email,
            subject: `[${choirName} Audition] ${name} (${voicePart})`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                ${sandboxNotice}
                <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                  New Audition Inquiry for ${safeChoirName}
                </h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                  <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Applicant:</td><td>${safeName}</td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold;">Phone:</td><td>${safePhone}</td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold;">Voice Part:</td><td><strong style="color: #b45309;">${safeVoicePart}</strong></td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold;">Prepared Solo:</td><td>${safePreparedSelection}</td></tr>
                </table>
                <div style="margin-top: 20px; padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <strong style="display: block; margin-bottom: 6px;">Choral Background & Experience:</strong>
                  <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${safeExperience}</p>
                </div>
                <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
                  Submitted online via the ${safeChoirName} Audition form. You can reply directly to this email to contact the applicant.
                </p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.warn('Failed to send audition notification email:', e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Audition submission successfully received',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

