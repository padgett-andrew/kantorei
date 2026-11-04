import { getEnv } from './env';

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
  const apiKey = getEnv('MAILERLITE_API_KEY', locals);
  const configuredGroup = getEnv('MAILERLITE_GROUP_ID', locals);
  const targetGroup = input.groupId || configuredGroup;

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
      message: 'Demo subscriber simulated successfully',
    };
  }

  // 2. Live API Call
  try {
    const payload: Record<string, unknown> = {
      email: normEmail,
      status: 'active',
    };

    if (normName) {
      payload.fields = {
        name: normName,
      };
    }

    if (targetGroup && targetGroup !== 'DEMO') {
      payload.groups = [targetGroup];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
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

    // Handle 422 (e.g. subscriber already in list, unconfirmed, or validation issue)
    const errorJson = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };

    const errorMsg =
      errorJson.message ||
      (errorJson.errors ? Object.values(errorJson.errors).flat().join(', ') : `HTTP ${res.status}`);

    // If already subscribed, MailerLite frequently returns a 200 on create-or-update,
    // but if it returned 422 with an existing subscriber notice, treat it gently
    if (res.status === 422 && /already.*(exists|subscribed)/i.test(errorMsg)) {
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
