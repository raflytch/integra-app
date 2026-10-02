import type { SessionClaims } from '../../application/ports/session-token.port';

export const SESSION_COOKIE_NAME = 'integra_session';

export interface SessionRequest {
  headers: { cookie?: string };
  ip?: string;
  session?: SessionClaims;
}

export interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge?: number;
}

export interface CookieResponse {
  cookie(name: string, value: string, options: CookieOptions): void;
  clearCookie(name: string, options: CookieOptions): void;
}

export function buildSessionCookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader) return null;
  for (const cookiePair of cookieHeader.split(';')) {
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex === -1) continue;
    if (cookiePair.slice(0, separatorIndex).trim() === cookieName) {
      return decodeURIComponent(cookiePair.slice(separatorIndex + 1).trim());
    }
  }
  return null;
}
