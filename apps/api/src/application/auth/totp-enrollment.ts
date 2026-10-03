import type { SecretCipher } from '../ports/secret-cipher.port';

/** How long a generated QR code and setup key can be confirmed. */
export const ENROLLMENT_LIFETIME_MS = 5 * 60_000;
/** Binds enrollment tokens so they cannot be swapped with other ciphertexts. */
const ENROLLMENT_TOKEN_CONTEXT = 'totp-enrollment';

/**
 * A pending sign-up. It lives only inside an encrypted token held by the
 * client, so abandoned enrollments leave nothing in the database.
 */
export interface TotpEnrollment {
  email: string;
  name: string;
  totpSecret: string;
  expiresAt: number;
}

export function sealEnrollment(
  secretCipher: SecretCipher,
  enrollment: TotpEnrollment,
): string {
  return secretCipher.encrypt(
    JSON.stringify(enrollment),
    ENROLLMENT_TOKEN_CONTEXT,
  );
}

/** Returns null when the token is malformed or was tampered with. */
export function openEnrollment(
  secretCipher: SecretCipher,
  enrollmentToken: string,
): TotpEnrollment | null {
  try {
    return JSON.parse(
      secretCipher.decrypt(enrollmentToken, ENROLLMENT_TOKEN_CONTEXT),
    ) as TotpEnrollment;
  } catch {
    return null;
  }
}
