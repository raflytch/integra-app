export abstract class TotpVerifier {
  /** New Base32 secret for authenticator enrollment. */
  abstract generateSecret(): string;

  /** `otpauth://` URI to render as a QR code. */
  abstract buildEnrollmentUri(accountEmail: string, secret: string): string;

  /**
   * Returns the matched time step, or null when the code is wrong or its step
   * is not newer than `lastUsedStep`. Callers must persist the step with a
   * conditional update (`WHERE last_step < step`) to close the race between
   * two concurrent logins.
   */
  abstract verify(
    secret: string,
    code: string,
    lastUsedStep: number | null,
  ): Promise<number | null>;
}
