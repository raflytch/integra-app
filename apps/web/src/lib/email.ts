/**
 * Deliberately simple: one `@`, no spaces, and a dotted domain with a 2+ letter
 * ending. The API's `@IsEmail` check stays the source of truth.
 */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT.test(normalizeEmail(email));
}
