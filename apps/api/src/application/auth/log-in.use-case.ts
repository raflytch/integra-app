import { InvalidLoginError } from '../../domain/auth/auth.errors';
import type { User } from '../../domain/users/user';
import type { UserRepository } from '../../domain/users/user.repository';
import type { SecretCipher } from '../ports/secret-cipher.port';
import type { SessionTokenService } from '../ports/session-token.port';
import type { TotpVerifier } from '../ports/totp-verifier.port';
import type { DemoLoginPolicy } from './demo-login-policy';
import { normalizeEmail } from './normalize-email';

export interface LogInInput {
  email: string;
  /** Omitted only for demo accounts that `DemoLoginPolicy` lets in without one. */
  code?: string;
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
    private readonly demoLoginPolicy: DemoLoginPolicy,
  ) {}

  async execute({ email, code }: LogInInput): Promise<LogInResult> {
    const credentials = await this.userRepository.findCredentialsByEmail(
      normalizeEmail(email),
    );
    if (!credentials) throw new InvalidLoginError();

    if (code === undefined) {
      if (!this.demoLoginPolicy.allowsLoginWithoutCode(credentials.email)) {
        throw new InvalidLoginError();
      }
      return this.startSession(credentials);
    }

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

    return this.startSession(credentials);
  }

  private startSession(credentials: User): LogInResult {
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
