import type { CareType } from './claim-detail';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function lengthOfStayDays(
  careType: CareType,
  admittedAt: Date,
  dischargedAt: Date,
): number | null {
  if (careType === 'OUTPATIENT') return null;
  return Math.round(
    (dischargedAt.getTime() - admittedAt.getTime()) / MILLISECONDS_PER_DAY,
  );
}
