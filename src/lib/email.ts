import type { AbsenceRecord, PortalConfig, ScheduleEvent, Singer } from '../types/choir';
import { getEnv } from './env';
import { formatEventDate } from './utils';

export interface EmailSendResult {
  delivered: boolean;
  sandboxMode: boolean;
  recipients: string[];
  note?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractEmails(...sources: (string | undefined | null)[]): string[] {
  const result: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    const items = src.split(/[,;\s\n]+/);
    for (const item of items) {
      const trimmed = item.trim().toLowerCase();
      if (trimmed.includes('@') && !result.includes(trimmed)) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

function resolveAbsenceRecipients(params: {
  sectionLeaders: Singer[];
  admins?: Singer[];
  config: PortalConfig;
  locals?: App.Locals;
}): {
  intendedRecipients: string[];
  finalTo: string[];
  fromEmail: string;
  apiKey?: string;
  useSandboxRouting: boolean;
} {
  const { sectionLeaders, admins = [], config, locals } = params;
  const apiKey = getEnv('RESEND_API_KEY', locals);
  const fromEmail =
    getEnv('PORTAL_FROM_EMAIL', locals) || 'Kantorei Portal <onboarding@resend.dev>';
  const sandboxOverride = getEnv('SANDBOX_OVERRIDE_EMAIL', locals);
  const envAdminEmails = getEnv('ABSENCE_NOTIFICATION_EMAILS', locals);

  // Collect configured admin emails across config tab and env
  const configAdminSources = [
    config.Conductor_Email,
    config.Associate_Director_Email,
    config.Associate_Conductor_Email,
    config.Manager_Email,
    config.Attendance_Admin_Emails,
    config.Absence_Notification_Emails,
    config.Additional_Admin_Emails,
    envAdminEmails,
  ];

  // Also collect any custom email keys added to the Google Sheet Config tab
  for (const [key, val] of Object.entries(config)) {
    if (
      typeof val === 'string' &&
      /(admin|director|conductor|attendance|absence).*email/i.test(key)
    ) {
      configAdminSources.push(val);
    }
  }

  // If configured to notify all active Roster Admins
  const notifyAllAdmins = /^(true|1|yes)$/i.test(config.Notify_All_Admins_On_Absence || '');
  const rosterAdminEmails = notifyAllAdmins ? admins.map((a) => a.email) : [];

  const intendedRecipients = Array.from(
    new Set([
      ...sectionLeaders.map((s) => s.email.trim().toLowerCase()),
      ...extractEmails(...configAdminSources),
      ...extractEmails(...rosterAdminEmails),
    ])
  ).filter(Boolean);

  const isOnboardingFrom = fromEmail.toLowerCase().includes('onboarding@resend.dev');
  const useSandboxRouting = Boolean(sandboxOverride) || isOnboardingFrom;
  const finalTo = useSandboxRouting
    ? [sandboxOverride || intendedRecipients[0] || 'delivered@resend.dev']
    : intendedRecipients;

  return { intendedRecipients, finalTo, fromEmail, apiKey, useSandboxRouting };
}

async function sendResendMail(params: {
  apiKey?: string;
  fromEmail: string;
  finalTo: string[];
  intendedRecipients: string[];
  useSandboxRouting: boolean;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const { apiKey, fromEmail, finalTo, intendedRecipients, useSandboxRouting, subject, html } = params;

  if (!apiKey || apiKey === 're_123456789') {
    console.info(
      `[Email Sandbox Preview] To: ${intendedRecipients.join(', ')} | Subject: ${subject}`
    );
    return {
      delivered: false,
      sandboxMode: true,
      recipients: intendedRecipients,
      note: 'RESEND_API_KEY not configured; logged notification in sandbox mode.',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: finalTo,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Resend Error]', res.status, errText);
      return {
        delivered: false,
        sandboxMode: useSandboxRouting,
        recipients: intendedRecipients,
        note: `Resend HTTP ${res.status}`,
      };
    }

    return {
      delivered: true,
      sandboxMode: useSandboxRouting,
      recipients: intendedRecipients,
    };
  } catch (err) {
    console.error('[Resend Fetch Error]', err);
    return {
      delivered: false,
      sandboxMode: useSandboxRouting,
      recipients: intendedRecipients,
      note: 'Network error contacting Resend',
    };
  }
}

export async function sendAbsenceAlertEmail(params: {
  absence: AbsenceRecord;
  event?: ScheduleEvent;
  sectionGroup: string;
  sectionLeaders: Singer[];
  admins?: Singer[];
  config: PortalConfig;
  sectionAbsenceCount: number;
  sectionLateCount?: number;
  locals?: App.Locals;
}): Promise<EmailSendResult> {
  const {
    absence,
    event,
    sectionGroup,
    sectionLeaders,
    admins = [],
    config,
    sectionAbsenceCount,
    sectionLateCount = 0,
    locals,
  } = params;

  const { intendedRecipients, finalTo, fromEmail, apiKey, useSandboxRouting } =
    resolveAbsenceRecipients({ sectionLeaders, admins, config, locals });

  const isLate = absence.status === 'Late';
  const pluralSection = !sectionGroup ? 'Ensemble' : sectionGroup === 'Bass' ? 'Basses' : `${sectionGroup}s`;
  const formattedDate = formatEventDate(absence.date);
  const eventTitle = event ? `${event.title} (${event.time})` : formattedDate;
  const partTag = absence.voicePart ? ` (${absence.voicePart})` : '';

  const subject = isLate
    ? `[${config.Choir_Name || 'Kantorei'} Running Late] ${absence.singerName}${partTag} — ${formattedDate}`
    : `[${config.Choir_Name || 'Kantorei'} Absence] ${absence.singerName}${partTag} — ${formattedDate}`;

  const headerBannerLabel = isLate ? 'Running Late Notification' : 'Rehearsal Absence Notification';
  const headerSubtitleColor = isLate ? '#fcd34d' : '#dbb46e';
  const statusLabel = isLate ? 'Running Late' : 'Absent';
  const reasonLabel = isLate ? 'ETA / Note' : 'Reason';

  const headcountText = isLate
    ? `${sectionAbsenceCount} absent, ${sectionLateCount} running late (${escapeHtml(pluralSection)}) for ${escapeHtml(absence.date)}.`
    : `${sectionAbsenceCount} ${escapeHtml(pluralSection)} now marked absent${sectionLateCount > 0 ? ` (${sectionLateCount} running late)` : ''} for ${escapeHtml(absence.date)}.`;

  const sandboxBannerHtml = useSandboxRouting
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:13px;color:#92400e;">
        <strong>Sandbox Routing Safeguard Active:</strong> Intended recipients:
        <code>${escapeHtml(intendedRecipients.join(', ') || 'None configured')}</code>
      </div>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#18181b;">
      ${sandboxBannerHtml}
      <div style="background:#101b33;color:#fcfbf8;padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${headerSubtitleColor};">${headerBannerLabel}</p>
        <h2 style="margin:6px 0 0;font-size:20px;">${escapeHtml(absence.singerName)} (${escapeHtml(absence.voicePart)})</h2>
      </div>
      <div style="border:1px solid #e4e4e7;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <p style="margin:0 0 12px;"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
        <p style="margin:0 0 12px;"><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
        <p style="margin:0 0 12px;"><strong>Status:</strong> ${escapeHtml(statusLabel)}</p>
        <p style="margin:0 0 12px;"><strong>${reasonLabel}:</strong> ${escapeHtml(absence.reason || (isLate ? 'Running late' : 'No reason provided'))}</p>
        <p style="margin:0 0 16px;"><strong>Submitted By:</strong> ${escapeHtml(absence.submittedBy)}</p>
        <div style="background:#f4f4f5;padding:12px 16px;border-radius:8px;font-size:14px;">
          <strong>Section Headcount Alert:</strong> ${headcountText}
        </div>
      </div>
    </div>
  `;

  return sendResendMail({
    apiKey,
    fromEmail,
    finalTo,
    intendedRecipients,
    useSandboxRouting,
    subject,
    html,
  });
}

export async function sendAbsenceRescindedEmail(params: {
  absence: AbsenceRecord;
  event?: ScheduleEvent;
  sectionGroup: string;
  sectionLeaders: Singer[];
  admins?: Singer[];
  config: PortalConfig;
  sectionAbsenceCount: number;
  sectionLateCount?: number;
  rescindedBy: string;
  locals?: App.Locals;
}): Promise<EmailSendResult> {
  const {
    absence,
    event,
    sectionGroup,
    sectionLeaders,
    admins = [],
    config,
    sectionAbsenceCount,
    sectionLateCount = 0,
    rescindedBy,
    locals,
  } = params;

  const { intendedRecipients, finalTo, fromEmail, apiKey, useSandboxRouting } =
    resolveAbsenceRecipients({ sectionLeaders, admins, config, locals });

  const wasLate = absence.status === 'Late';
  const pluralSection = !sectionGroup ? 'Ensemble' : sectionGroup === 'Bass' ? 'Basses' : `${sectionGroup}s`;
  const formattedDate = formatEventDate(absence.date);
  const eventTitle = event ? `${event.title} (${event.time})` : formattedDate;
  const partTag = absence.voicePart ? ` (${absence.voicePart})` : '';

  const noticeTypeLabel = wasLate ? 'Running Late Notice' : 'Absence';
  const subject = `[${config.Choir_Name || 'Kantorei'} ${noticeTypeLabel} Withdrawn] ${absence.singerName}${partTag} — ${formattedDate}`;

  const bannerText = wasLate
    ? 'Running Late Withdrawn · On Time'
    : 'Absence Withdrawn · Attending Call';

  const statusText = wasLate
    ? 'Cleared · Arriving on Time for Call'
    : 'Cleared · Attending Call';

  const sandboxBannerHtml = useSandboxRouting
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:13px;color:#92400e;">
        <strong>Sandbox Routing Safeguard Active:</strong> Intended recipients:
        <code>${escapeHtml(intendedRecipients.join(', ') || 'None configured')}</code>
      </div>`
    : '';

  const headcountText = `${sectionAbsenceCount} absent${sectionLateCount > 0 ? `, ${sectionLateCount} running late` : ''} (${escapeHtml(pluralSection)}) for ${escapeHtml(absence.date)}.`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#18181b;">
      ${sandboxBannerHtml}
      <div style="background:#064e3b;color:#fcfbf8;padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#6ee7b7;">${escapeHtml(bannerText)}</p>
        <h2 style="margin:6px 0 0;font-size:20px;">${escapeHtml(absence.singerName)} (${escapeHtml(absence.voicePart)})</h2>
      </div>
      <div style="border:1px solid #e4e4e7;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <p style="margin:0 0 12px;"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
        <p style="margin:0 0 12px;"><strong>Date:</strong> ${escapeHtml(formattedDate)}</p>
        <p style="margin:0 0 12px;"><strong>Status:</strong> <span style="color:#047857;font-weight:600;">${escapeHtml(statusText)}</span></p>
        <p style="margin:0 0 12px;"><strong>Withdrawn By:</strong> ${escapeHtml(rescindedBy)}</p>
        ${
          absence.reason
            ? `<p style="margin:0 0 16px;color:#71717a;font-size:13px;"><em>Prior notice note: ${escapeHtml(absence.reason)}</em></p>`
            : ''
        }
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px 16px;border-radius:8px;font-size:14px;color:#166534;">
          <strong>Updated Section Headcount:</strong> ${headcountText}
        </div>
      </div>
    </div>
  `;

  return sendResendMail({
    apiKey,
    fromEmail,
    finalTo,
    intendedRecipients,
    useSandboxRouting,
    subject,
    html,
  });
}

export async function sendLoginOtpEmail(params: {
  toEmail: string;
  singerName: string;
  code: string;
  choirName: string;
  locals?: App.Locals;
}): Promise<{ delivered: boolean; devPreviewCode?: string }> {
  const { toEmail, singerName, code, choirName, locals } = params;
  const apiKey = getEnv('RESEND_API_KEY', locals);
  const fromEmail =
    getEnv('PORTAL_FROM_EMAIL', locals) || 'Kantorei Portal <onboarding@resend.dev>';
  const sandboxOverride = getEnv('SANDBOX_OVERRIDE_EMAIL', locals);
  const isOnboardingFrom = fromEmail.toLowerCase().includes('onboarding@resend.dev');

  if (!apiKey || apiKey === 're_123456789') {
    console.info(`[OTP Login Code for ${toEmail}]: ${code}`);
    return {
      delivered: false,
      devPreviewCode: import.meta.env.DEV ? code : undefined,
    };
  }

  const finalTo = sandboxOverride ? sandboxOverride.trim() : toEmail;
  const isRedirected =
    Boolean(sandboxOverride) && sandboxOverride.trim().toLowerCase() !== toEmail.toLowerCase();

  const sandboxBanner = isRedirected
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#92400e;">
        <strong>Sandbox Routing Active:</strong> Login code requested for <code>${escapeHtml(toEmail)}</code>
      </div>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;color:#18181b;">
      ${sandboxBanner}
      <div style="background:#101b33;color:#fcfbf8;padding:20px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#b16437;">${escapeHtml(choirName)} Singer Portal</p>
        <h2 style="margin:6px 0 0;font-size:20px;">Your 6-Digit Sign-In Code</h2>
      </div>
      <div style="border:1px solid #e4e4e7;border-top:none;padding:24px;border-radius:0 0 12px 12px;background:#ffffff;">
        <p style="margin:0 0 16px;">Hi ${escapeHtml(singerName.split(' ')[0] || 'Singer')},</p>
        <p style="margin:0 0 16px;">Enter this code to sign in to the ${escapeHtml(choirName)} Singer Portal. It expires in 10 minutes:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:0.25em;text-align:center;background:#f5f2eb;color:#101b33;padding:16px;border-radius:10px;margin:0 0 16px;">
          ${escapeHtml(code)}
        </div>
        <p style="margin:0;font-size:13px;color:#71717a;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [finalTo],
        subject: `${code} is your ${choirName} Singer Portal code`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Resend OTP Error]', res.status, errText);
      if (isOnboardingFrom && !sandboxOverride) {
        console.warn(
          '[Resend Hint] With onboarding@resend.dev, set SANDBOX_OVERRIDE_EMAIL in .env to your Resend account email.'
        );
      }
      return {
        delivered: false,
        devPreviewCode: import.meta.env.DEV ? code : undefined,
      };
    }

    return { delivered: true };
  } catch (err) {
    console.error('[Resend OTP Fetch Error]', err);
    return {
      delivered: false,
      devPreviewCode: import.meta.env.DEV ? code : undefined,
    };
  }
}

