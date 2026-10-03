import { InvalidLoginError } from '../../domain/auth/auth.errors';
import type { User } from '../../domain/users/user';
import type { UserRepository } from '../../domain/users/user.repository';
import type { SecretCipher } from '../ports/secret-cipher.port';
import type { SessionTokenService } from '../ports/session-token.port';
import type { TotpVerifier } from '../ports/totp-verifier.port';
import { normalizeEmail } from './normalize-email';

export interface LogInInput {
  email: string;
  code: string;
}

export interface LogInResult {
  user: User;
  sessionToken: string;
}

export class LogInUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly secretCipher: SecretCipher,
    private readonly totpVerifier: TotpVerifier,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  async execute({ email, code }: LogInInput): Promise<LogInResult> {
    const credentials = await this.userRepository.findCredentialsByEmail(
      normalizeEmail(email),
    );
    if (!credentials) throw new InvalidLoginError();

    const totpSecret = this.secretCipher.decrypt(
      credentials.totpSecretEnc,
      credentials.id,
    );
    const acceptedTimeStep = await this.totpVerifier.verify(
      totpSecret,
      code,
      credentials.totpLastStep,
    );
    if (acceptedTimeStep === null) throw new InvalidLoginError();

    const isFirstUseOfCode = await this.userRepository.recordTotpStep(
      credentials.id,
      acceptedTimeStep,
    );
    if (!isFirstUseOfCode) throw new InvalidLoginError();

    const user: User = {
      id: credentials.id,
      name: credentials.name,
      email: credentials.email,
      role: credentials.role,
    };
    const sessionToken = this.sessionTokenService.issue({
      userId: user.id,
      role: user.role,
    });
    return { user, sessionToken };
  }
}
