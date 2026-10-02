import type { UserRole } from '../../domain/users/user';

export interface SessionClaims {
  userId: string;
  role: UserRole;
}

export abstract class SessionTokenService {
  abstract readonly lifetimeMs: number;
  abstract issue(claims: SessionClaims): string;
  abstract read(token: string): SessionClaims | null;
}
