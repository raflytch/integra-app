const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}

export function formatDate(dateOnly: string): string {
  return dateFormatter.format(new Date(dateOnly));
}

export function formatDateTime(timestamp: string): string {
  return dateTimeFormatter.format(new Date(timestamp));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function countDaysBetween(startDate: string, endDate: string): number {
  const elapsedMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round(elapsedMs / MILLISECONDS_PER_DAY);
}

export function calculateAgeInYears(birthDate: string, onDate: string): number {
  const birth = new Date(birthDate);
  const reference = new Date(onDate);
  const hasHadBirthdayThisYear =
    reference.getUTCMonth() > birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() >= birth.getUTCDate());
  const yearDifference = reference.getUTCFullYear() - birth.getUTCFullYear();
  return hasHadBirthdayThisYear ? yearDifference : yearDifference - 1;
}

const compactNumberFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

/** Short rupiah for chart axes, e.g. "Rp 12,5 jt". */
export function formatCompactRupiah(amount: number): string {
  return `Rp ${compactNumberFormatter.format(amount)}`;
}

/** Month label for a date-only string, e.g. "Sep 26". */
export function formatMonth(dateOnly: string): string {
  return monthFormatter.format(new Date(dateOnly));
}
