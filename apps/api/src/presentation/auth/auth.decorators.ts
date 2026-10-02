import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { SessionClaims } from '../../application/ports/session-token.port';
import type { UserRole } from '../../domain/users/user';
import type { SessionRequest } from './session-request';

export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';
export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);

export const Roles = (...requiredRoles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, requiredRoles);

export const CurrentSession = createParamDecorator(
  (_: unknown, context: ExecutionContext): SessionClaims | undefined =>
    context.switchToHttp().getRequest<SessionRequest>().session,
);
