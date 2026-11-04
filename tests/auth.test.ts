import { describe, expect, it } from 'vitest';
import {
  createOtpChallengeToken,
  generateRandomUrlSafeString,
  generateSixDigitCode,
  verifyOtpChallengeToken,
} from '../src/lib/auth';

describe('auth utilities', () => {
  describe('generateSixDigitCode', () => {
    it('generates a 6-digit numeric string', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateSixDigitCode();
        expect(code).toMatch(/^\d{6}$/);
      }
    });
  });

  describe('generateRandomUrlSafeString', () => {
    it('generates url-safe base64 strings without padding', () => {
      const str = generateRandomUrlSafeString(32);
      expect(str).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('OTP challenge lifecycle', () => {
    it('creates and verifies a valid OTP token', async () => {
      const email = 'singer@kantorei.net';
      const code = '123456';
      const token = await createOtpChallengeToken(email, code);

      expect(typeof token).toBe('string');

      const isValid = await verifyOtpChallengeToken({
        challengeToken: token,
        email,
        code,
      });

      expect(isValid).toBe(true);
    });

    it('rejects an incorrect OTP code', async () => {
      const email = 'singer@kantorei.net';
      const code = '123456';
      const token = await createOtpChallengeToken(email, code);

      const isValid = await verifyOtpChallengeToken({
        challengeToken: token,
        email,
        code: '654321', // wrong code
      });

      expect(isValid).toBe(false);
    });

    it('rejects a mismatched email', async () => {
      const email = 'singer@kantorei.net';
      const code = '123456';
      const token = await createOtpChallengeToken(email, code);

      const isValid = await verifyOtpChallengeToken({
        challengeToken: token,
        email: 'other@kantorei.net',
        code,
      });

      expect(isValid).toBe(false);
    });
  });
});

