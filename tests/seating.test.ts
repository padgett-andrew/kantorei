import { describe, expect, it } from 'vitest';
import {
  createDefaultRow,
  reindexRowSeats,
  cloneRows,
} from '../src/components/portal/seating/seatingLayoutUtils';
import type { SeatingRow } from '../src/types/choir';

describe('seatingLayoutUtils', () => {
  it('creates default row with 17 seats and center aisle', () => {
    const row = createDefaultRow(1, 17);
    expect(row.rowNumber).toBe(1);
    expect(row.name).toBe('Row 1');

    // 17 non-aisle seats + 1 aisle seat = 18 total seat entries
    expect(row.seats.length).toBe(18);

    const nonAisle = row.seats.filter((s) => !s.isAisle);
    expect(nonAisle.length).toBe(17);

    // Dynamic midpoint: Math.floor(17 / 2) = 8 left seats, aisle, 9 right seats
    const aisleIndex = row.seats.findIndex((s) => s.isAisle);
    expect(aisleIndex).toBe(8);
  });

  it('re-indexes seats correctly after seat removal', () => {
    const row: SeatingRow = {
      rowNumber: 2,
      name: 'Row 2',
      seats: [
        { seatIndex: 1, singerName: 'Singer 1' },
        { seatIndex: 2, singerName: 'Singer 2' },
        { seatIndex: 3, singerName: 'Singer 3' },
        { seatIndex: 4, singerName: 'Singer 4' },
        { seatIndex: 5, singerName: 'Singer 5' },
        { seatIndex: 6, singerName: 'Singer 6' },
      ],
    };

    reindexRowSeats(row);

    // 6 seats -> 3 left, aisle, 3 right
    const nonAisle = row.seats.filter((s) => !s.isAisle);
    expect(nonAisle.length).toBe(6);
    expect(nonAisle.map((s) => s.seatIndex)).toEqual([1, 2, 3, 4, 5, 6]);

    const aisleIdx = row.seats.findIndex((s) => s.isAisle);
    expect(aisleIdx).toBe(3);
  });

  it('deep clones rows without reference mutation', () => {
    const rows: SeatingRow[] = [
      {
        rowNumber: 1,
        name: 'Row 1',
        seats: [{ seatIndex: 1, singerName: 'Alice' }],
      },
    ];

    const cloned = cloneRows(rows);
    cloned[0]!.seats[0]!.singerName = 'Bob';

    expect(rows[0]!.seats[0]!.singerName).toBe('Alice');
    expect(cloned[0]!.seats[0]!.singerName).toBe('Bob');
  });
});

