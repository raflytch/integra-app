import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type SessionClaims,
  SessionTokenService,
} from '../../application/ports/session-token.port';
import type { UserRole } from '../../domain/users/user';
import type { Env } from '../config/env.schema';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const USER_ROLES = new Set<UserRole>(['VERIFIER', 'SUPERVISOR']);
const ENCODED_JWT_HEADER = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

interface SessionTokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function isSessionTokenPayload(value: unknown): value is SessionTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Partial<SessionTokenPayload>;
  return (
    typeof payload.sub === 'string' &&
    typeof payload.exp === 'number' &&
    USER_ROLES.has(payload.role as UserRole)
  );
}

function hasSameContent(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

@Injectable()
export class HmacSessionTokenService extends SessionTokenService {
  readonly lifetimeMs = SESSION_LIFETIME_MS;
  private readonly signingKey: Buffer;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    super();
    const jwtSecret = config.get('JWT_SECRET', { infer: true });
    this.signingKey = Buffer.from(jwtSecret, 'utf8');
  }

  issue(claims: SessionClaims): string {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const payload: SessionTokenPayload = {
      sub: claims.userId,
      role: claims.role,
      iat: issuedAtSeconds,
      exp: issuedAtSeconds + SESSION_LIFETIME_MS / 1000,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const unsignedToken = `${ENCODED_JWT_HEADER}.${encodedPayload}`;
    return `${unsignedToken}.${this.sign(unsignedToken)}`;
  }

  read(token: string): SessionClaims | null {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (encodedHeader !== ENCODED_JWT_HEADER || !encodedPayload || !signature) {
      return null;
    }
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);
    if (!hasSameContent(signature, expectedSignature)) return null;

    try {
      const payload: unknown = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      );
      const isExpired =
        isSessionTokenPayload(payload) && payload.exp * 1000 <= Date.now();
      if (!isSessionTokenPayload(payload) || isExpired) return null;
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  private sign(unsignedToken: string): string {
    return createHmac('sha256', this.signingKey)
      .update(unsignedToken)
      .digest('base64url');
  }
}
