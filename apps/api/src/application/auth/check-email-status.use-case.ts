import type { UserRepository } from '../../domain/users/user.repository';
import { normalizeEmail } from './normalize-email';

export interface EmailStatus {
  registered: boolean;
}

export class CheckEmailStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<EmailStatus> {
    return {
      registered: await this.userRepository.existsByEmail(
        normalizeEmail(email),
      ),
    };
  }
}
