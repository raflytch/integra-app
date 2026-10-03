import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GetCurrentUserUseCase } from '../../application/auth/get-current-user.use-case';
import { LogInUseCase } from '../../application/auth/log-in.use-case';
import {
  type SessionClaims,
  SessionTokenService,
} from '../../application/ports/session-token.port';
import type { User } from '../../domain/users/user';
import { CurrentSession, Public } from '../auth/auth.decorators';
import { LoginAttemptGuard } from '../auth/login-attempt.guard';
import {
  buildSessionCookieOptions,
  type CookieResponse,
  SESSION_COOKIE_NAME,
} from '../auth/session-request';
import { LogInDto } from '../dtos/log-in.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logInUseCase: LogInUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  @Public()
  @UseGuards(LoginAttemptGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async logIn(
    @Body() credentials: LogInDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<User> {
    const { user, sessionToken } = await this.logInUseCase.execute(credentials);
    response.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      buildSessionCookieOptions(this.sessionTokenService.lifetimeMs),
    );
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logOut(@Res({ passthrough: true }) response: CookieResponse): void {
    response.clearCookie(SESSION_COOKIE_NAME, buildSessionCookieOptions());
  }

  @Get('me')
  findCurrentUser(@CurrentSession() session: SessionClaims): Promise<User> {
    return this.getCurrentUser.execute(session.userId);
  }
}
