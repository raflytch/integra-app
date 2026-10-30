import type { UserRole } from '@/types/auth.types';

export const HOME_PATH_BY_ROLE: Record<UserRole, string> = {
  VERIFIER: '/claims',
  SUPERVISOR: '/overview',
};

/** Only same-origin paths, so `?next=` cannot redirect to another site. */
export function toSafeReturnPath(
  requestedPath: string | null,
  role: UserRole,
): string {
  const isInternalPath =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//');
  return isInternalPath ? requestedPath! : HOME_PATH_BY_ROLE[role];
}
