import { DEMO_ACCOUNTS } from '../../domain/users/demo-accounts';

const DEMO_ACCOUNT_EMAILS = new Set(
  DEMO_ACCOUNTS.map((account) => account.email),
);

/**
 * Lets the shared demo accounts sign in without an authenticator code when
 * `DEMO_LOGIN_ENABLED` is on. Every other account always needs its code.
 */
export class DemoLoginPolicy {
  constructor(private readonly isEnabled: boolean) {}

  allowsLoginWithoutCode(normalizedEmail: string): boolean {
    return this.isEnabled && DEMO_ACCOUNT_EMAILS.has(normalizedEmail);
  }
}
