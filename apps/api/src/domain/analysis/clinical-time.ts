import type { DocumentType } from '../claims/claim-detail';

const JAKARTA_OFFSET = '+07:00';
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
/** Only full ISO-like dates are trusted; clock-only or prose times fall back to the document time. */
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
const EXPLICIT_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/;

/** Indonesian document labels for verifier-facing summaries. */
export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  MEDICAL_RESUME: 'resume medis',
  EXAM_NOTE: 'catatan pemeriksaan',
  DAILY_NOTE: 'catatan harian',
  PRESCRIPTION: 'resep',
  PROCEDURE: 'catatan tindakan',
};

export interface StayPeriod {
  start: Date;
  /** Exclusive: midnight after the discharge day. */
  end: Date;
}

/** Date-only columns are stored as UTC midnight; the stay runs in Jakarta time. */
export function toStayPeriod(admittedAt: Date, dischargedAt: Date): StayPeriod {
  const startOfJakartaDay = (date: Date) =>
    new Date(`${date.toISOString().slice(0, 10)}T00:00:00${JAKARTA_OFFSET}`);
  return {
    start: startOfJakartaDay(admittedAt),
    end: new Date(startOfJakartaDay(dischargedAt).getTime() + DAY_MS),
  };
}

export function isWithinStay(time: Date, stay: StayPeriod): boolean {
  return time >= stay.start && time < stay.end;
}

/** Parses an extracted item time, assuming Jakarta time when no offset is written. */
export function parseItemTime(itemTime: string | null): Date | null {
  const trimmedTime = itemTime?.trim();
  if (!trimmedTime || !ISO_DATE_TIME_PATTERN.test(trimmedTime)) return null;
  const isDateOnly = trimmedTime.length === 10;
  const zonedTime = EXPLICIT_OFFSET_PATTERN.test(trimmedTime)
    ? trimmedTime
    : `${isDateOnly ? `${trimmedTime}T00:00` : trimmedTime.replace(' ', 'T')}${JAKARTA_OFFSET}`;
  const parsedTime = new Date(zonedTime);
  return Number.isNaN(parsedTime.getTime()) ? null : parsedTime;
}

/** "3 Sep" in Jakarta time. */
export function formatJakartaDay(date: Date): string {
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return `${jakartaDate.getUTCDate()} ${MONTH_ABBREVIATIONS[jakartaDate.getUTCMonth()]}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
