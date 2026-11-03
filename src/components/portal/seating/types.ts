export type SeatingMode = 'view' | 'attendance' | 'edit';
export type SeatingPerspective = 'conductor' | 'singer';
export type SeatingDensity = 'compact' | 'comfortable';

export interface AttendanceStatusSummary {
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  totalSeats: number;
  filledSeats: number;
}

