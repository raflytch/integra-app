import { isDemoAccount } from '../../domain/users/demo-accounts';
import type { UserRepository } from '../../domain/users/user.repository';
import { normalizeEmail } from './normalize-email';

export interface EmailStatus {
  registered: boolean;
  /** False for demo accounts that may sign in without an authenticator code. */
  requiresCode: boolean;
}

export class CheckEmailStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<EmailStatus> {
    const normalizedEmail = normalizeEmail(email);
    const registered = await this.userRepository.existsByEmail(normalizedEmail);
    return {
      registered,
      requiresCode: !registered || !isDemoAccount(normalizedEmail),
    };
  }
}
