import { getEnv } from './env';
import { getPortalConfig } from './google';

export interface MailerLiteSubscriberInput {
  email: string;
  name?: string;
  source?: string;
  groupId?: string;
}

export interface MailerLiteResult {
  success: boolean;
  mode: 'live' | 'demo' | 'disabled';
  subscriberId?: string;
  error?: string;
  message?: string;
}

/**
 * Creates or updates a subscriber in MailerLite via their v2 REST API (https://connect.mailerlite.com/api/subscribers).
 * Gracefully handles missing API keys during sandbox development or CI.
 */
export async function addSubscriberToMailerLite(
  input: MailerLiteSubscriberInput,
  locals?: App.Locals
): Promise<MailerLiteResult> {
  const normEmail = (input.email || '').trim().toLowerCase();
  const normName = (input.name || '').trim();
  let apiKey = getEnv('MAILERLITE_API_KEY', locals).trim();
  let targetGroup = (input.groupId || getEnv('MAILERLITE_GROUP_ID', locals)).trim();

  if (locals) {
    try {
      const config = await getPortalConfig(locals);
      if (!apiKey || apiKey === 'DEMO') {
        const sheetKey =
          (config as any).MailerLite_API_Key ||
          (config as any).MailerLite_Key ||
          (config as any).Mailerlite_Token ||
          (config as any).MAILERLITE_API_KEY;
        if (typeof sheetKey === 'string' && sheetKey.trim()) {
          apiKey = sheetKey.trim();
        }
      }
      if (!targetGroup || targetGroup === 'DEMO') {
        const isTicket = (input.source || '').toLowerCase().includes('ticket');
        const ttEnvGroup = isTicket ? getEnv('MAILERLITE_TT_GROUP_ID', locals).trim() : '';
        const sheetGroup = isTicket
          ? (config as any).MailerLite_TT_Group_ID ||
            (config as any).Ticket_Tailor_Group_ID ||
            (config as any).TT_Group_ID ||
            ttEnvGroup ||
            config.MailerLite_Group_ID ||
            (config as any).MailerLite_Group ||
            (config as any).MAILERLITE_GROUP_ID
          : config.MailerLite_Group_ID ||
            (config as any).MailerLite_Group ||
            (config as any).MAILERLITE_GROUP_ID;
        if (typeof sheetGroup === 'string' && sheetGroup.trim()) {
          targetGroup = sheetGroup.trim();
        }
      }
    } catch {
      // Gracefully fall back if sheet config is inaccessible
    }
  }

  if (!normEmail) {
    return {
      success: false,
      mode: 'disabled',
      error: 'Missing required email address',
    };
  }

  // 1. Sandbox / Demo Mode fallback
  if (!apiKey || apiKey === 'DEMO' || apiKey.startsWith('demo_')) {
    if (import.meta.env.DEV) {
      console.log(
        `[MailerLite Sandbox] Added subscriber: "${normEmail}" (${normName || 'No Name'}) via source "${input.source || 'Website'}"`
      );
    }
    return {
      success: true,
      mode: 'demo',
      subscriberId: `demo_sub_${Date.now()}`,
      message: 'Demo subscriber simulated successfully (No MAILERLITE_API_KEY set)',
    };
  }

  // Auto-resolve group name to ID if targetGroup is a name, empty, or not numeric
  if (!targetGroup || (!/^\d{8,}$/.test(targetGroup) && targetGroup !== 'DEMO')) {
    try {
      const groupsRes = await fetch('https://connect.mailerlite.com/api/groups?limit=50', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });
      if (groupsRes.ok) {
        const groupsJson = (await groupsRes.json()) as { data?: { id: string; name: string }[] };
        const groups = groupsJson.data || [];
        const normTarget = (targetGroup || '').toLowerCase();
        const found =
          (normTarget && groups.find((g) => g.name.toLowerCase() === normTarget)) ||
          groups.find((g) => g.name.toLowerCase().includes('friend')) ||
          groups.find((g) => g.name.toLowerCase().includes('newsletter')) ||
          groups.find((g) => g.name.toLowerCase().includes('kantorei')) ||
          groups[0];
        if (found) {
          targetGroup = String(found.id);
        }
      }
    } catch {
      // Ignore group lookup network error
    }
  }

  // 2. Live API Call
  try {
    const payload: Record<string, unknown> = {
      email: normEmail,
      status: 'active',
    };

    const fields: Record<string, string> = {
      source: input.source || 'Website',
    };

    if (normName) {
      const parts = normName.split(/\s+/);
      const lastName = parts.slice(1).join(' ');
      fields.name = normName;
      if (lastName) {
        fields.last_name = lastName;
      }
    }

    payload.fields = fields;

    if (targetGroup && targetGroup !== 'DEMO') {
      const parsedGroups = targetGroup
        .split(/[,;\s]+/)
        .map((g) => g.trim())
        .filter(Boolean);
      if (parsedGroups.length > 0) {
        payload.groups = parsedGroups;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as { data?: { id?: string } };
      return {
        success: true,
        mode: 'live',
        subscriberId: data?.data?.id,
        message: 'Successfully subscribed to MailerLite',
      };
    }

    // Classic MailerLite fallback if 401 on connect.mailerlite.com
    if (res.status === 401 && !apiKey.startsWith('ml_') && apiKey.length <= 40) {
      try {
        const classicUrl =
          targetGroup && /^\d+$/.test(targetGroup)
            ? `https://api.mailerlite.com/api/v2/groups/${targetGroup}/subscribers`
            : 'https://api.mailerlite.com/api/v2/subscribers';
        const classicRes = await fetch(classicUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-MailerLite-ApiKey': apiKey,
          },
          body: JSON.stringify({
            email: normEmail,
            name: normName,
            fields: payload.fields,
          }),
        });
        if (classicRes.ok) {
          return {
            success: true,
            mode: 'live',
            message: 'Successfully subscribed to MailerLite (Classic)',
          };
        }
      } catch {
        // Fall back to original error handling
      }
    }

    // Handle 422 (e.g. subscriber already in list, unconfirmed, or validation issue)
    const errorJson = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };

    // If MailerLite reports that fields.source does not exist, automatically create it and retry!
    if (
      res.status === 422 &&
      errorJson.errors &&
      Object.keys(errorJson.errors).some((k) => k.toLowerCase().includes('source'))
    ) {
      try {
        const createFieldRes = await fetch('https://connect.mailerlite.com/api/fields', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            name: 'source',
            type: 'text',
          }),
        });

        if (createFieldRes.ok) {
          const retryRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (retryRes.ok) {
            const retryData = (await retryRes.json()) as { data?: { id?: string } };
            return {
              success: true,
              mode: 'live',
              subscriberId: retryData?.data?.id,
              message: 'Successfully subscribed to MailerLite',
            };
          }
        }
      } catch {
        // Fall back to retrying without custom source field
      }

      // Retry without custom source field so subscriber creation never fails
      const fallbackFields = { ...fields };
      delete fallbackFields.source;
      const fallbackPayload = { ...payload, fields: fallbackFields };
      try {
        const fallbackRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(fallbackPayload),
        });
        if (fallbackRes.ok) {
          const fbData = (await fallbackRes.json()) as { data?: { id?: string } };
          return {
            success: true,
            mode: 'live',
            subscriberId: fbData?.data?.id,
            message: 'Successfully subscribed to MailerLite',
          };
        }
      } catch {
        // Fall back to standard error handling below
      }
    }

    const errorMsg =
      errorJson.message ||
      (errorJson.errors ? Object.values(errorJson.errors).flat().join(', ') : `HTTP ${res.status}`);

    // If already subscribed, MailerLite frequently returns a 200 on create-or-update,
    // but if it returned 422 or 409 with an existing subscriber notice, treat it gently
    if (
      (res.status === 422 || res.status === 409) &&
      /(already.*(exists|subscribed|taken|added)|email.*taken|member.*already)/i.test(errorMsg)
    ) {
      return {
        success: true,
        mode: 'live',
        message: 'Subscriber already in MailerLite audience',
      };
    }

    console.warn(`[MailerLite Warning] HTTP ${res.status}: ${errorMsg}`);
    return {
      success: false,
      mode: 'live',
      error: errorMsg,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[MailerLite Error] Connection error: ${message}`);
    return {
      success: false,
      mode: 'live',
      error: message,
    };
  }
}
