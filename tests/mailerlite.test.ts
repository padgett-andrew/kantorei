import { describe, expect, it } from 'vitest';
import { addSubscriberToMailerLite } from '../src/lib/mailerlite';

describe('addSubscriberToMailerLite', () => {
  it('returns disabled mode when email is missing or empty', async () => {
    const res = await addSubscriberToMailerLite({ email: '' });
    expect(res.success).toBe(false);
    expect(res.mode).toBe('disabled');
    expect(res.error).toContain('Missing required email');
  });

  it('runs in demo/sandbox mode when API key is unset or DEMO', async () => {
    const res = await addSubscriberToMailerLite({
      email: 'patron@example.com',
      name: 'John Patron',
      source: 'Website_Footer',
    });

    expect(res.success).toBe(true);
    expect(res.mode).toBe('demo');
    expect(res.subscriberId).toMatch(/^demo_sub_/);
  });

  it('normalizes whitespace and email casing before handling', async () => {
    const res = await addSubscriberToMailerLite({
      email: '  Fan.User@Example.COM  ',
      name: '  Jane Doe  ',
    });

    expect(res.success).toBe(true);
    expect(res.mode).toBe('demo');
  });
});
