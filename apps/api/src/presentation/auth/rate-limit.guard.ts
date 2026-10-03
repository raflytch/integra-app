import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { SessionRequest } from './session-request';

const RATE_LIMIT_WINDOW_MS = 60_000;

interface AttemptWindow {
  startedAt: number;
  attemptCount: number;
}

/** In-memory, per-client-IP request limit over a one-minute window. */
abstract class ClientRateLimitGuard implements CanActivate {
  protected abstract readonly maxAttemptsPerWindow: number;
  protected abstract readonly limitMessage: string;
  private readonly attemptWindowsByClient = new Map<string, AttemptWindow>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const clientKey = request.ip ?? 'unknown';
    const now = Date.now();
    const attemptWindow = this.attemptWindowsByClient.get(clientKey);

    if (
      !attemptWindow ||
      now - attemptWindow.startedAt >= RATE_LIMIT_WINDOW_MS
    ) {
      this.attemptWindowsByClient.set(clientKey, {
        startedAt: now,
        attemptCount: 1,
      });
      return true;
    }

    attemptWindow.attemptCount += 1;
    if (attemptWindow.attemptCount > this.maxAttemptsPerWindow) {
      throw new HttpException(this.limitMessage, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

/** Guards TOTP code checks (login and sign-up confirmation) against guessing. */
@Injectable()
export class LoginAttemptGuard extends ClientRateLimitGuard {
  protected readonly maxAttemptsPerWindow = 5;
  protected readonly limitMessage =
    'Terlalu banyak percobaan masuk, coba lagi dalam satu menit';
}

/** Looser limit for debounced email checks and new QR codes during sign-up. */
@Injectable()
export class EmailLookupGuard extends ClientRateLimitGuard {
  protected readonly maxAttemptsPerWindow = 30;
  protected readonly limitMessage =
    'Terlalu banyak permintaan, coba lagi dalam satu menit';
}
