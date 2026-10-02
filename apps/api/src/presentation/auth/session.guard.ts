import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionTokenService } from '../../application/ports/session-token.port';
import type { UserRole } from '../../domain/users/user';
import { IS_PUBLIC_ROUTE_KEY, REQUIRED_ROLES_KEY } from './auth.decorators';
import {
  readCookie,
  SESSION_COOKIE_NAME,
  type SessionRequest,
} from './session-request';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionTokenService)
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const decoratedTargets = [context.getHandler(), context.getClass()];
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE_KEY,
      decoratedTargets,
    );
    if (isPublicRoute) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const sessionToken = readCookie(
      request.headers.cookie,
      SESSION_COOKIE_NAME,
    );
    const session = sessionToken
      ? this.sessionTokenService.read(sessionToken)
      : null;
    if (!session)
      throw new UnauthorizedException('Silakan masuk terlebih dahulu');
    request.session = session;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      REQUIRED_ROLES_KEY,
      decoratedTargets,
    );
    if (requiredRoles && !requiredRoles.includes(session.role)) {
      throw new ForbiddenException(
        'Peran Anda tidak memiliki akses ke data ini',
      );
    }
    return true;
  }
}
