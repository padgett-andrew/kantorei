import { describe, expect, it } from 'vitest';
import { getTodayIso } from '../src/lib/utils';

describe('Absence withdrawal past-date suppression logic', () => {
  const timezone = 'America/Chicago';

  function shouldSuppressWithdrawalEmail(eventDate: string, todayIso: string): boolean {
    return Boolean(eventDate && eventDate < todayIso);
  }

  it('suppresses withdrawal notification email when withdrawal occurs after the call date', () => {
    const today = '2026-11-10';
    const pastCallDate = '2026-11-09';
    const olderCallDate = '2026-10-15';

    expect(shouldSuppressWithdrawalEmail(pastCallDate, today)).toBe(true);
    expect(shouldSuppressWithdrawalEmail(olderCallDate, today)).toBe(true);
  });

  it('does NOT suppress email when withdrawal occurs on the same day as the call', () => {
    const today = '2026-11-10';
    const sameDayCallDate = '2026-11-10';

    expect(shouldSuppressWithdrawalEmail(sameDayCallDate, today)).toBe(false);
  });

  it('does NOT suppress email when withdrawal occurs for an upcoming future call', () => {
    const today = '2026-11-10';
    const tomorrowCallDate = '2026-11-11';
    const nextMonthCallDate = '2026-12-05';

    expect(shouldSuppressWithdrawalEmail(tomorrowCallDate, today)).toBe(false);
    expect(shouldSuppressWithdrawalEmail(nextMonthCallDate, today)).toBe(false);
  });

  it('works accurately with getTodayIso helper', () => {
    const todayIso = getTodayIso(timezone);
    expect(todayIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Call from yesterday
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayIso = yesterdayDate.toISOString().slice(0, 10);

    expect(shouldSuppressWithdrawalEmail(yesterdayIso, todayIso)).toBe(true);
  });
});
