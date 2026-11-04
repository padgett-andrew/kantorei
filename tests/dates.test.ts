import { describe, expect, it } from 'vitest';
import {
  extractDateOnly,
  isConcertPastByDate,
  MONTHS,
  processConcertDates,
  parseSingleNaturalDate,
  resolveConcertStatus,
} from '../src/lib/dates';

describe('dates utility', () => {
  describe('MONTHS mapping', () => {
    it('maps standard short and long month names to 0-11 indices', () => {
      expect(MONTHS.jan).toBe(0);
      expect(MONTHS.january).toBe(0);
      expect(MONTHS.dec).toBe(11);
      expect(MONTHS.december).toBe(11);
    });
  });

  describe('parseSingleNaturalDate', () => {
    it('parses formatted date with time and parenthetical venue hint', () => {
      const parsed = parseSingleNaturalDate('12/19/2026 3:00 PM (Shoreview)');
      expect(parsed).not.toBeNull();
      expect(parsed?.isoDate).toBe('2026-12-19');
      expect(parsed?.hasTime).toBe(true);
      expect(parsed?.venueHint).toBe('Shoreview');
      expect(parsed?.date.getFullYear()).toBe(2026);
      expect(parsed?.date.getMonth()).toBe(11); // December
      expect(parsed?.date.getDate()).toBe(19);
    });

    it('parses hyphenated venue hint and 2-digit year', () => {
      const parsed = parseSingleNaturalDate('12/20/26 3pm - Edina');
      expect(parsed).not.toBeNull();
      expect(parsed?.isoDate).toBe('2026-12-20');
      expect(parsed?.hasTime).toBe(true);
      expect(parsed?.venueHint).toBe('Edina');
    });

    it('parses ISO date format YYYY-MM-DD', () => {
      const parsed = parseSingleNaturalDate('2027-03-20 7:30 PM');
      expect(parsed).not.toBeNull();
      expect(parsed?.isoDate).toBe('2027-03-20');
      expect(parsed?.hasTime).toBe(true);
      expect(parsed?.date.getFullYear()).toBe(2027);
    });

    it('returns null for empty strings', () => {
      expect(parseSingleNaturalDate('')).toBeNull();
      expect(parseSingleNaturalDate('   ')).toBeNull();
    });
  });

  describe('processConcertDates', () => {
    it('splits delimited multi-performance dates and extracts venue hints', () => {
      const input = '12/19/2026 3:00 PM (Shoreview)\n12/20/2026 3:00 PM (Edina)';
      const result = processConcertDates(input, 'Default Venue', 'Default Addr');
      expect(result.performances.length).toBe(2);
      expect(result.performances[0].isoDate).toBe('2026-12-19');
      expect(result.performances[0].label).toBe('Shoreview');
      expect(result.performances[1].isoDate).toBe('2026-12-20');
      expect(result.performances[1].label).toBe('Edina');
    });
  });

  describe('isConcertPastByDate', () => {
    it('returns true when concert latest performance date is strictly before today', () => {
      expect(isConcertPastByDate({ datesDisplay: '2026-01-01' }, '2026-05-01')).toBe(true);
    });

    it('returns false when concert date is today or in the future', () => {
      expect(isConcertPastByDate({ datesDisplay: '2026-05-01' }, '2026-05-01')).toBe(false);
      expect(isConcertPastByDate({ datesDisplay: '2026-12-01' }, '2026-05-01')).toBe(false);
    });
  });

  describe('resolveConcertStatus', () => {
    it('preserves Draft status regardless of date', () => {
      expect(resolveConcertStatus('Draft', { datesDisplay: '2026-01-01' }, '2026-05-01')).toBe('Draft');
      expect(resolveConcertStatus('Draft', { datesDisplay: '2027-01-01' }, '2026-05-01')).toBe('Draft');
    });

    it('automatically transitions past On_Sale concert to Past', () => {
      expect(resolveConcertStatus('On_Sale', { datesDisplay: '2026-01-01' }, '2026-05-01')).toBe('Past');
    });

    it('keeps upcoming concert On_Sale when date is >= today', () => {
      expect(resolveConcertStatus('On_Sale', { datesDisplay: '2026-12-01' }, '2026-05-01')).toBe('On_Sale');
    });
  });

  describe('extractDateOnly', () => {
    it('extracts YYYY-MM-DD from ISO strings', () => {
      expect(extractDateOnly('2026-11-10T19:30:00Z')).toBe('2026-11-10');
      expect(extractDateOnly('2026-11-10')).toBe('2026-11-10');
    });
  });
});
