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
import {
  CheckEmailStatusUseCase,
  type EmailStatus,
} from '../../application/auth/check-email-status.use-case';
import { ConfirmEnrollmentUseCase } from '../../application/auth/confirm-enrollment.use-case';
import { GetCurrentUserUseCase } from '../../application/auth/get-current-user.use-case';
import {
  LogInUseCase,
  type LogInResult,
} from '../../application/auth/log-in.use-case';
import {
  type EnrollmentChallenge,
  StartEnrollmentUseCase,
} from '../../application/auth/start-enrollment.use-case';
import {
  type SessionClaims,
  SessionTokenService,
} from '../../application/ports/session-token.port';
import type { User } from '../../domain/users/user';
import { CurrentSession, Public } from '../auth/auth.decorators';
import { EmailLookupGuard, LoginAttemptGuard } from '../auth/rate-limit.guard';
import {
  buildSessionCookieOptions,
  type CookieResponse,
  SESSION_COOKIE_NAME,
} from '../auth/session-request';
import { CheckEmailStatusDto } from '../dtos/check-email-status.dto';
import { ConfirmEnrollmentDto } from '../dtos/confirm-enrollment.dto';
import { LogInDto } from '../dtos/log-in.dto';
import { StartEnrollmentDto } from '../dtos/start-enrollment.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logInUseCase: LogInUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly checkEmailStatus: CheckEmailStatusUseCase,
    private readonly startEnrollment: StartEnrollmentUseCase,
    private readonly confirmEnrollment: ConfirmEnrollmentUseCase,
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
    return this.startSession(
      await this.logInUseCase.execute(credentials),
      response,
    );
  }

  @Public()
  @UseGuards(EmailLookupGuard)
  @Post('email-status')
  @HttpCode(HttpStatus.OK)
  findEmailStatus(
    @Body() { email }: CheckEmailStatusDto,
  ): Promise<EmailStatus> {
    return this.checkEmailStatus.execute(email);
  }

  @Public()
  @UseGuards(EmailLookupGuard)
  @Post('enrollments')
  createEnrollment(
    @Body() enrollment: StartEnrollmentDto,
  ): Promise<EnrollmentChallenge> {
    return this.startEnrollment.execute(enrollment);
  }

  @Public()
  @UseGuards(LoginAttemptGuard)
  @Post('enrollments/confirm')
  @HttpCode(HttpStatus.CREATED)
  async confirmNewAccount(
    @Body() confirmation: ConfirmEnrollmentDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<User> {
    return this.startSession(
      await this.confirmEnrollment.execute(confirmation),
      response,
    );
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

  private startSession(
    { user, sessionToken }: LogInResult,
    response: CookieResponse,
  ): User {
    response.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      buildSessionCookieOptions(this.sessionTokenService.lifetimeMs),
    );
    return user;
  }
}
