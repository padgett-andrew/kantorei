import type { SeatingRow, SeatingSeat } from '../../../types/choir';

/**
 * Re-indexes seats within a row and maintains dynamic center aisle positioning.
 */
export function reindexRowSeats(row: SeatingRow): void {
  const nonAisleSeats = row.seats.filter((s) => !s.isAisle);
  const hasAisle = row.seats.some((s) => s.isAisle) || nonAisleSeats.length >= 6;

  if (!hasAisle || nonAisleSeats.length < 2) {
    row.seats = nonAisleSeats.map((s, i) => {
      s.seatIndex = i + 1;
      return s;
    });
    return;
  }

  // Dynamic midpoint: for N seats, place center aisle after Math.floor(N / 2) seats
  const midPoint = Math.floor(nonAisleSeats.length / 2);

  const leftSeats: SeatingSeat[] = [];
  const rightSeats: SeatingSeat[] = [];

  nonAisleSeats.forEach((s, i) => {
    s.seatIndex = i + 1;
    if (i < midPoint) {
      leftSeats.push(s);
    } else {
      rightSeats.push(s);
    }
  });

  row.seats = [
    ...leftSeats,
    { seatIndex: 0, isAisle: true },
    ...rightSeats,
  ];
}

/**
 * Creates a standard row with 17 seats and center aisle (Kantorei 50-member choir standard).
 */
export function createDefaultRow(rowNumber: number, seatCount: number = 17): SeatingRow {
  const defaultSeats: SeatingSeat[] = [];
  for (let s = 1; s <= seatCount; s++) {
    defaultSeats.push({ seatIndex: s });
  }
  const newRow: SeatingRow = {
    rowNumber,
    name: `Row ${rowNumber}`,
    seats: defaultSeats,
  };
  reindexRowSeats(newRow);
  return newRow;
}

/**
 * Deep clone array of seating rows.
 */
export function cloneRows(rows: SeatingRow[]): SeatingRow[] {
  return JSON.parse(JSON.stringify(rows));
}

