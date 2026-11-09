import { describe, expect, it } from 'vitest';
import {
  SingerRowSchema,
  ScheduleRowSchema,
  ConcertRowSchema,
  voicePartSchema,
  SubscribeRequestSchema,
} from '../src/lib/schemas';

describe('schemas validation', () => {
  describe('voicePartSchema', () => {
    it('normalizes lowercase voice parts', () => {
      expect(voicePartSchema.parse('s1')).toBe('S1');
      expect(voicePartSchema.parse('b2')).toBe('B2');
      expect(voicePartSchema.parse('a')).toBe('A');
      expect(voicePartSchema.parse('t')).toBe('T');
    });

    it('rejects invalid voice parts', () => {
      expect(() => voicePartSchema.parse('X1')).toThrow();
    });
  });

  describe('SingerRowSchema', () => {
    it('parses canonical singer row and infers SectionGroup from VoicePart', () => {
      const row = [
        'SINGER@EXAMPLE.COM ',
        'Andrew Padgett',
        'B2',
        '', // Empty section group in sheet
        'Singer',
        '612-555-0100',
        'Active',
      ];

      const parsed = SingerRowSchema.parse(row);
      expect(parsed.email).toBe('singer@example.com');
      expect(parsed.name).toBe('Andrew Padgett');
      expect(parsed.voicePart).toBe('B2');
      expect(parsed.sectionGroup).toBe('Bass'); // inferred
      expect(parsed.role).toBe('Singer');
      expect(parsed.active).toBe(true);
      expect(parsed.status).toBe('Active');
    });

    it('parses director/admin row with no voice part or section group', () => {
      const row = [
        'adam.reinwald@kantorei.net',
        'Adam Reinwald',
        '', // No voice part
        '', // No section group
        'Admin',
        '',
        'Active',
      ];

      const parsed = SingerRowSchema.parse(row);
      expect(parsed.email).toBe('adam.reinwald@kantorei.net');
      expect(parsed.name).toBe('Adam Reinwald');
      expect(parsed.voicePart).toBe('');
      expect(parsed.sectionGroup).toBe('');
      expect(parsed.role).toBe('Admin');
      expect(parsed.active).toBe(true);
      expect(parsed.status).toBe('Active');
    });

    it('handles On_Leave / sabbatical status', () => {
      const row = [
        'singer@example.com',
        'Elena Rostova',
        'S1',
        'Soprano',
        'Singer',
        '',
        'On_Leave',
      ];

      const parsed = SingerRowSchema.parse(row);
      expect(parsed.status).toBe('On_Leave');
      expect(parsed.active).toBe(false);
    });

    it('handles legacy boolean FALSE for inactive status', () => {
      const row = [
        'singer@example.com',
        'Former Member',
        'A1',
        'Alto',
        'Singer',
        '',
        'FALSE',
      ];

      const parsed = SingerRowSchema.parse(row);
      expect(parsed.status).toBe('Inactive');
      expect(parsed.active).toBe(false);
    });
  });

  describe('ScheduleRowSchema', () => {
    it('parses valid schedule row', () => {
      const row = [
        'reh-2026-11-10',
        '2026-11-10',
        '7:00 PM - 9:30 PM',
        'Rehearsal',
        'Tuesday Call',
        'Sanctuary',
        'Alice',
        'Bob',
        '',
        '',
        'Focus on movements 1-3',
      ];

      const parsed = ScheduleRowSchema.parse(row);
      expect(parsed.eventId).toBe('reh-2026-11-10');
      expect(parsed.date).toBe('2026-11-10');
      expect(parsed.type).toBe('Rehearsal');
      expect(parsed.title).toBe('Tuesday Call');
      expect(parsed.notes).toBe('Focus on movements 1-3');
    });
  });

  describe('ConcertRowSchema', () => {
    it('parses concert row and resolves dual artwork fallbacks', () => {
      const row = [
        'winter-2026',
        'Light in the Winter Dark',
        '12/19/2026 3:00 PM',
        'Cathedral Sanctuary',
        'Minneapolis, MN',
        'A festival of choral illumination',
        'DEMO_SERIES_ID',
        'On_Sale',
        'https://example.com/banner.jpg',
        'Box office note',
        '', // No portrait poster provided
      ];

      const parsed = ConcertRowSchema.parse(row);
      expect(parsed.slug).toBe('winter-2026');
      expect(parsed.title).toBe('Light in the Winter Dark');
      expect(parsed.heroImageUrl).toBe('https://example.com/banner.jpg');
      // Gracefully falls back to hero image for poster
      expect(parsed.posterImageUrl).toBe('https://example.com/banner.jpg');
    });
  });

  describe('SubscribeRequestSchema', () => {
    it('normalizes email and accepts valid subscriber inputs', () => {
      const parsed = SubscribeRequestSchema.parse({
        email: '  Patron@Example.Com  ',
        name: '  Eleanor Vance  ',
        source: 'Concerts_Page',
      });
      expect(parsed.email).toBe('patron@example.com');
      expect(parsed.name).toBe('Eleanor Vance');
      expect(parsed.source).toBe('Concerts_Page');
      expect(parsed.website_hp).toBe('');
    });

    it('rejects invalid email addresses', () => {
      expect(() =>
        SubscribeRequestSchema.parse({
          email: 'not-an-email',
        })
      ).toThrow();
    });
  });
});
