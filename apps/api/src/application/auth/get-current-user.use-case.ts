import { SessionExpiredError } from '../../domain/auth/auth.errors';
import type { User } from '../../domain/users/user';
import type { UserRepository } from '../../domain/users/user.repository';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new SessionExpiredError();
    return user;
  }
}
