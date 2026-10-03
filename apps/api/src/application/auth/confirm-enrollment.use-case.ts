import {
  EmailAlreadyRegisteredError,
  EnrollmentExpiredError,
  InvalidEnrollmentCodeError,
} from '../../domain/auth/auth.errors';
import type { UserRepository } from '../../domain/users/user.repository';
import type { SecretCipher } from '../ports/secret-cipher.port';
import type { SessionTokenService } from '../ports/session-token.port';
import type { TotpVerifier } from '../ports/totp-verifier.port';
import type { LogInResult } from './log-in.use-case';
import { openEnrollment } from './totp-enrollment';

export interface ConfirmEnrollmentInput {
  enrollmentToken: string;
  code: string;
}

/**
 * Creates the account once the user proves the authenticator works, so a
 * skipped or failed setup never leaves an account nobody can sign in to.
 * New accounts are always verifiers and are signed in right away.
 */
export class ConfirmEnrollmentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly secretCipher: SecretCipher,
    private readonly totpVerifier: TotpVerifier,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  async execute({
    enrollmentToken,
    code,
  }: ConfirmEnrollmentInput): Promise<LogInResult> {
    const enrollment = openEnrollment(this.secretCipher, enrollmentToken);
    if (!enrollment || enrollment.expiresAt <= Date.now()) {
      throw new EnrollmentExpiredError();
    }

    const acceptedTimeStep = await this.totpVerifier.verify(
      enrollment.totpSecret,
      code,
      null,
    );
    if (acceptedTimeStep === null) throw new InvalidEnrollmentCodeError();

    const user = await this.userRepository.createWithTotp(
      { email: enrollment.email, name: enrollment.name, role: 'VERIFIER' },
      (userId) => this.secretCipher.encrypt(enrollment.totpSecret, userId),
      // The confirmation code is spent, so it cannot also be used to log in.
      acceptedTimeStep,
    );
    if (!user) throw new EmailAlreadyRegisteredError();

    const sessionToken = this.sessionTokenService.issue({
      userId: user.id,
      role: user.role,
    });
    return { user, sessionToken };
  }
}
