import type { CareType } from './claim-detail';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Juknis SIRS Revisi 6.3 (Kemenkes, 2025): lama dirawat = tanggal keluar - tanggal masuk.
// Permenkes 26/2021 Lampiran Bab III: rawat jalan di hari yang sama dihitung satu episode, jadi tidak punya LOS.
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
