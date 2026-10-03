import type { NewUser, User, UserCredentials } from './user';

export abstract class UserRepository {
  abstract findCredentialsByEmail(
    normalizedEmail: string,
  ): Promise<UserCredentials | null>;
  abstract findById(userId: string): Promise<User | null>;
  abstract recordTotpStep(userId: string, timeStep: number): Promise<boolean>;
  abstract existsByEmail(normalizedEmail: string): Promise<boolean>;

  /**
   * Creates the user with its encrypted TOTP secret in one transaction. The
   * secret is bound to the new user id, so it is encrypted by the callback.
   * Returns null when the email is already registered.
   */
  abstract createWithTotp(
    newUser: NewUser,
    encryptTotpSecret: (userId: string) => string,
    totpLastStep: number,
  ): Promise<User | null>;
}
