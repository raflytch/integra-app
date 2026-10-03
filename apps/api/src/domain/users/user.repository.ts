import type { User, UserCredentials } from './user';

export abstract class UserRepository {
  abstract findCredentialsByEmail(
    normalizedEmail: string,
  ): Promise<UserCredentials | null>;
  abstract findById(userId: string): Promise<User | null>;
  abstract recordTotpStep(userId: string, timeStep: number): Promise<boolean>;
}
