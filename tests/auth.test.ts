import { describe, expect, it, vi } from 'vitest';
import {
  createOtpChallengeToken,
  createSessionToken,
  generateRandomUrlSafeString,
  generateSixDigitCode,
  SESSION_COOKIE,
  setSessionCookie,
  verifyOtpChallengeToken,
  verifySessionToken,
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

  describe('Session token lifecycle & claims', () => {
    it('creates and verifies a session token with embedded singer claims', async () => {
      const singer = {
        email: 'tenor@kantorei.net',
        name: 'Julian Vance',
        voicePart: 'T1' as const,
        sectionGroup: 'Tenor' as const,
        role: 'Singer' as const,
        phone: '612-555-0199',
        active: true,
        status: 'Active' as const,
        picture: 'https://example.com/julian.jpg',
      };

      const token = await createSessionToken(singer);
      expect(typeof token).toBe('string');

      const claims = await verifySessionToken(token);
      expect(claims).not.toBeNull();
      expect(claims?.email).toBe('tenor@kantorei.net');
      expect(claims?.name).toBe('Julian Vance');
      expect(claims?.voicePart).toBe('T1');
      expect(claims?.sectionGroup).toBe('Tenor');
      expect(claims?.role).toBe('Singer');
      expect(claims?.phone).toBe('612-555-0199');
      expect(claims?.active).toBe(true);
      expect(claims?.picture).toBe('https://example.com/julian.jpg');
    });

    it('creates and verifies a legacy session token with string email', async () => {
      const token = await createSessionToken('soprano@kantorei.net', undefined, 'https://example.com/pic.jpg');
      const claims = await verifySessionToken(token);
      expect(claims).not.toBeNull();
      expect(claims?.email).toBe('soprano@kantorei.net');
      expect(claims?.picture).toBe('https://example.com/pic.jpg');
    });

    it('rejects a tampered or invalid session token', async () => {
      const claims = await verifySessionToken('invalid.jwt.token');
      expect(claims).toBeNull();
    });
  });

  describe('Session cookie attributes', () => {
    it('sets both maxAge and expires on the session cookie to prevent Safari session drops', () => {
      const mockSet = vi.fn();
      const mockDelete = vi.fn();
      const mockCookies = {
        set: mockSet,
        delete: mockDelete,
      } as unknown as Parameters<typeof setSessionCookie>[0];

      setSessionCookie(mockCookies, 'valid-token', new URL('https://kantorei.net'));

      expect(mockSet).toHaveBeenCalledTimes(1);
      const [cookieName, token, opts] = mockSet.mock.calls[0];
      expect(cookieName).toBe(SESSION_COOKIE);
      expect(token).toBe('valid-token');
      expect(opts.path).toBe('/');
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('lax');
      expect(opts.maxAge).toBe(60 * 60 * 24 * 180);
      expect(opts.expires).toBeInstanceOf(Date);
      expect(opts.expires.getTime()).toBeGreaterThan(Date.now() + 1000 * 60 * 60 * 24 * 179);
    });
  });
});

