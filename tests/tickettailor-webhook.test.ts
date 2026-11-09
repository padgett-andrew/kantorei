import { describe, expect, it } from 'vitest';
import {
  isAffirmativeAnswer,
  isMarketingQuestion,
  verifyTicketTailorSignature,
} from '../src/pages/api/webhooks/tickettailor';

describe('Ticket Tailor Webhook Utilities', () => {
  describe('isMarketingQuestion', () => {
    it('detects friends of kantorei questions', () => {
      expect(isMarketingQuestion('Join Friends of Kantorei?')).toBe(true);
      expect(isMarketingQuestion('Would you like to become a Friend of Kantorei?')).toBe(true);
    });

    it('detects email list and newsletter questions', () => {
      expect(isMarketingQuestion('Join our email list')).toBe(true);
      expect(isMarketingQuestion('Subscribe to the Kantorei Newsletter')).toBe(true);
      expect(isMarketingQuestion('Receive concert announcements and updates')).toBe(true);
      expect(isMarketingQuestion('Keep in touch with Kantorei')).toBe(true);
      expect(isMarketingQuestion('Marketing permissions')).toBe(true);
    });

    it('rejects unrelated checkout questions', () => {
      expect(isMarketingQuestion('How did you hear about this concert?')).toBe(false);
      expect(isMarketingQuestion('Do you require wheelchair accessible seating?')).toBe(false);
      expect(isMarketingQuestion('Dietary restrictions')).toBe(false);
    });
  });

  describe('isAffirmativeAnswer', () => {
    it('recognizes various affirmative formats', () => {
      expect(isAffirmativeAnswer(true)).toBe(true);
      expect(isAffirmativeAnswer(1)).toBe(true);
      expect(isAffirmativeAnswer('true')).toBe(true);
      expect(isAffirmativeAnswer('yes')).toBe(true);
      expect(isAffirmativeAnswer('Yes, please sign me up')).toBe(true);
      expect(isAffirmativeAnswer('I agree')).toBe(true);
      expect(isAffirmativeAnswer('on')).toBe(true);
      expect(isAffirmativeAnswer('checked')).toBe(true);
      expect(isAffirmativeAnswer('opt-in')).toBe(true);
      expect(isAffirmativeAnswer(['Yes'])).toBe(true);
    });

    it('recognizes negative or empty responses', () => {
      expect(isAffirmativeAnswer(false)).toBe(false);
      expect(isAffirmativeAnswer(0)).toBe(false);
      expect(isAffirmativeAnswer('false')).toBe(false);
      expect(isAffirmativeAnswer('no')).toBe(false);
      expect(isAffirmativeAnswer('off')).toBe(false);
      expect(isAffirmativeAnswer('unchecked')).toBe(false);
      expect(isAffirmativeAnswer('')).toBe(false);
      expect(isAffirmativeAnswer(null)).toBe(false);
      expect(isAffirmativeAnswer(undefined)).toBe(false);
    });
  });

  describe('verifyTicketTailorSignature', () => {
    const secret = 'tt_sec_secret_12345';
    const rawBody = JSON.stringify({ event: 'order.created', id: 'ord_123' });

    async function computeHmac(secretKey: string, data: string): Promise<string> {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
      return Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    it('verifies valid HMAC with timestamp header format', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const payloadToSign = `${nowSec}${rawBody}`;
      const hash = await computeHmac(secret, payloadToSign);
      const header = `t=${nowSec},v1=${hash}`;

      const isValid = await verifyTicketTailorSignature(rawBody, header, secret);
      expect(isValid).toBe(true);
    });

    it('rejects signature with wrong secret', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const payloadToSign = `${nowSec}${rawBody}`;
      const hash = await computeHmac('wrong_secret', payloadToSign);
      const header = `t=${nowSec},v1=${hash}`;

      const isValid = await verifyTicketTailorSignature(rawBody, header, secret);
      expect(isValid).toBe(false);
    });

    it('rejects webhook with expired timestamp (> 5 min)', async () => {
      const oldSec = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const payloadToSign = `${oldSec}${rawBody}`;
      const hash = await computeHmac(secret, payloadToSign);
      const header = `t=${oldSec},v1=${hash}`;

      const isValid = await verifyTicketTailorSignature(rawBody, header, secret);
      expect(isValid).toBe(false);
    });
  });
});
