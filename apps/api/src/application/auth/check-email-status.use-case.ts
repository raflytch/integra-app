import type { UserRepository } from '../../domain/users/user.repository';
import type { DemoLoginPolicy } from './demo-login-policy';
import { normalizeEmail } from './normalize-email';

export interface EmailStatus {
  registered: boolean;
  /** False for demo accounts that may sign in without an authenticator code. */
  requiresCode: boolean;
}

export class CheckEmailStatusUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly demoLoginPolicy: DemoLoginPolicy,
  ) {}

  async execute(email: string): Promise<EmailStatus> {
    const normalizedEmail = normalizeEmail(email);
    const registered = await this.userRepository.existsByEmail(normalizedEmail);
    return {
      registered,
      requiresCode:
        !registered ||
        !this.demoLoginPolicy.allowsLoginWithoutCode(normalizedEmail),
    };
  }
}
