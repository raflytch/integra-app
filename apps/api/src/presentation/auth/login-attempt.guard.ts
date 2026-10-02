import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { SessionRequest } from './session-request';

const LOGIN_ATTEMPT_WINDOW_MS = 60_000;
const MAX_LOGIN_ATTEMPTS_PER_WINDOW = 5;

interface LoginAttemptWindow {
  startedAt: number;
  attemptCount: number;
}

@Injectable()
export class LoginAttemptGuard implements CanActivate {
  private readonly attemptWindowsByClient = new Map<
    string,
    LoginAttemptWindow
  >();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const clientKey = request.ip ?? 'unknown';
    const now = Date.now();
    const attemptWindow = this.attemptWindowsByClient.get(clientKey);

    if (
      !attemptWindow ||
      now - attemptWindow.startedAt >= LOGIN_ATTEMPT_WINDOW_MS
    ) {
      this.attemptWindowsByClient.set(clientKey, {
        startedAt: now,
        attemptCount: 1,
      });
      return true;
    }

    attemptWindow.attemptCount += 1;
    if (attemptWindow.attemptCount > MAX_LOGIN_ATTEMPTS_PER_WINDOW) {
      throw new HttpException(
        'Terlalu banyak percobaan masuk, coba lagi dalam satu menit',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
