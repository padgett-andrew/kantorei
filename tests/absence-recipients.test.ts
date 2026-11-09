import { describe, expect, it } from 'vitest';
import { formatAbsenceRecipients } from '../src/lib/absence-recipients';

describe('formatAbsenceRecipients', () => {
  it('formats recipients with section group and section leaders', () => {
    const result = formatAbsenceRecipients({
      sectionGroup: 'Soprano',
      sectionLeaders: ['Maryanne Poliseno', 'Molly Tengwall'],
      conductorName: 'Adam Reinwald',
    });

    expect(result.sectionLeaderNames).toEqual(['Maryanne Poliseno', 'Molly Tengwall']);
    expect(result.formattedList).toEqual([
      'Maryanne Poliseno & Molly Tengwall (Soprano Section Leaders)',
      'Adam Reinwald (Artistic Director)',
      'Attendance administration & artistic staff',
    ]);
    expect(result.summaryText).toBe(
      'Maryanne Poliseno & Molly Tengwall (Soprano Section Leaders), Adam Reinwald (Artistic Director), and Attendance administration & artistic staff'
    );
  });

  it('formats single section leader correctly', () => {
    const result = formatAbsenceRecipients({
      sectionGroup: 'Bass',
      sectionLeaders: ['Marcus Vance'],
      conductorName: 'Adam Reinwald',
    });

    expect(result.formattedList[0]).toBe('Marcus Vance (Bass Section Leader)');
  });

  it('falls back to generic section leader when names are not provided', () => {
    const result = formatAbsenceRecipients({
      sectionGroup: 'Alto',
      sectionLeaders: [],
      conductorName: 'Adam Reinwald',
    });

    expect(result.formattedList[0]).toBe('your Alto Section Leader');
    expect(result.summaryText).toBe(
      'your Alto Section Leader, Adam Reinwald (Artistic Director), and Attendance administration & artistic staff'
    );
  });

  it('handles empty section group gracefully', () => {
    const result = formatAbsenceRecipients({
      conductorName: 'Adam Reinwald',
    });

    expect(result.formattedList).toEqual([
      'Adam Reinwald (Artistic Director)',
      'Attendance administration & artistic staff',
    ]);
    expect(result.summaryText).toBe(
      'Adam Reinwald (Artistic Director) and Attendance administration & artistic staff'
    );
  });
});
