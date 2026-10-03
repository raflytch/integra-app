import { EmailAlreadyRegisteredError } from '../../domain/auth/auth.errors';
import type { UserRepository } from '../../domain/users/user.repository';
import type { QrCodeRenderer } from '../ports/qr-code-renderer.port';
import type { SecretCipher } from '../ports/secret-cipher.port';
import type { TotpVerifier } from '../ports/totp-verifier.port';
import { normalizeEmail } from './normalize-email';
import { ENROLLMENT_LIFETIME_MS, sealEnrollment } from './totp-enrollment';

export interface StartEnrollmentInput {
  email: string;
  name: string;
}

export interface EnrollmentChallenge {
  enrollmentToken: string;
  setupKey: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  /** Lets clients count down without trusting their own clock against `expiresAt`. */
  expiresInSeconds: number;
}

/** Generates a TOTP secret for a new account; the user is created on confirmation. */
export class StartEnrollmentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly secretCipher: SecretCipher,
    private readonly totpVerifier: TotpVerifier,
    private readonly qrCodeRenderer: QrCodeRenderer,
  ) {}

  async execute({
    email,
    name,
  }: StartEnrollmentInput): Promise<EnrollmentChallenge> {
    const normalizedEmail = normalizeEmail(email);
    if (await this.userRepository.existsByEmail(normalizedEmail)) {
      throw new EmailAlreadyRegisteredError();
    }

    const totpSecret = this.totpVerifier.generateSecret();
    const expiresAt = Date.now() + ENROLLMENT_LIFETIME_MS;
    const enrollmentUri = this.totpVerifier.buildEnrollmentUri(
      normalizedEmail,
      totpSecret,
    );
    return {
      enrollmentToken: sealEnrollment(this.secretCipher, {
        email: normalizedEmail,
        name: name.trim(),
        totpSecret,
        expiresAt,
      }),
      setupKey: totpSecret,
      qrCodeDataUrl: await this.qrCodeRenderer.toDataUrl(enrollmentUri),
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: ENROLLMENT_LIFETIME_MS / 1000,
    };
  }
}
