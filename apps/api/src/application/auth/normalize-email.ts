/** Emails are stored lowercase; normalize before every read and write. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
