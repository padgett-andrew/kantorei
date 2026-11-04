import { describe, expect, it } from 'vitest';
import { buildCleanLocationQuery } from '../src/lib/maps';

describe('maps utility', () => {
  describe('buildCleanLocationQuery', () => {
    it('returns empty string when venue and address are empty', () => {
      expect(buildCleanLocationQuery('', '')).toBe('');
    });

    it('strips sanctuary room prefixes', () => {
      expect(
        buildCleanLocationQuery('Main Sanctuary, Shepherd of the Hills', 'Shoreview, MN')
      ).toBe('Shepherd of the Hills, Shoreview, MN');
    });

    it('prevents multi-city pollution in address string', () => {
      expect(
        buildCleanLocationQuery(
          'Shepherd of the Hills, Shoreview',
          'Shoreview & Edina, MN'
        )
      ).toBe('Shepherd of the Hills, Shoreview, MN');
    });

    it('ensures state is appended if missing and prevents city duplication', () => {
      expect(buildCleanLocationQuery('Saint Paul Cathedral', 'Saint Paul')).toBe(
        'Saint Paul Cathedral, MN'
      );
    });

    it('does not duplicate address if venueName already contains address', () => {
      expect(
        buildCleanLocationQuery(
          'Central Presbyterian Church, 500 Cedar St, Saint Paul, MN',
          'Saint Paul, MN'
        )
      ).toBe('Central Presbyterian Church, 500 Cedar St, Saint Paul, MN');
    });
  });
});
