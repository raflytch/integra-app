import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CheckEmailStatusUseCase } from './application/auth/check-email-status.use-case';
import { ConfirmEnrollmentUseCase } from './application/auth/confirm-enrollment.use-case';
import { DemoLoginPolicy } from './application/auth/demo-login-policy';
import { GetCurrentUserUseCase } from './application/auth/get-current-user.use-case';
import { LogInUseCase } from './application/auth/log-in.use-case';
import { StartEnrollmentUseCase } from './application/auth/start-enrollment.use-case';
import { QrCodeRenderer } from './application/ports/qr-code-renderer.port';
import { SecretCipher } from './application/ports/secret-cipher.port';
import { SessionTokenService } from './application/ports/session-token.port';
import { TotpVerifier } from './application/ports/totp-verifier.port';
import { UserRepository } from './domain/users/user.repository';
import type { Env } from './infrastructure/config/env.schema';
import { SessionTokenModule } from './infrastructure/auth/session-token.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaUserRepository } from './infrastructure/database/prisma/repositories/prisma-user.repository';
import { SecurityModule } from './infrastructure/security/security.module';
import {
  EmailLookupGuard,
  LoginAttemptGuard,
} from './presentation/auth/rate-limit.guard';
import { SessionGuard } from './presentation/auth/session.guard';
import { AuthController } from './presentation/controllers/auth.controller';

@Module({
  imports: [PrismaModule, SecurityModule, SessionTokenModule],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    {
      provide: DemoLoginPolicy,
      useFactory: (config: ConfigService<Env, true>) =>
        new DemoLoginPolicy(config.get('DEMO_LOGIN_ENABLED', { infer: true })),
      inject: [ConfigService],
    },
    {
      provide: LogInUseCase,
      useFactory: (
        userRepository: UserRepository,
        secretCipher: SecretCipher,
        totpVerifier: TotpVerifier,
        sessionTokenService: SessionTokenService,
        demoLoginPolicy: DemoLoginPolicy,
      ) =>
        new LogInUseCase(
          userRepository,
          secretCipher,
          totpVerifier,
          sessionTokenService,
          demoLoginPolicy,
        ),
      inject: [
        UserRepository,
        SecretCipher,
        TotpVerifier,
        SessionTokenService,
        DemoLoginPolicy,
      ],
    },
    {
      provide: GetCurrentUserUseCase,
      useFactory: (userRepository: UserRepository) =>
        new GetCurrentUserUseCase(userRepository),
      inject: [UserRepository],
    },
    {
      provide: CheckEmailStatusUseCase,
      useFactory: (
        userRepository: UserRepository,
        demoLoginPolicy: DemoLoginPolicy,
      ) => new CheckEmailStatusUseCase(userRepository, demoLoginPolicy),
      inject: [UserRepository, DemoLoginPolicy],
    },
    {
      provide: StartEnrollmentUseCase,
      useFactory: (
        userRepository: UserRepository,
        secretCipher: SecretCipher,
        totpVerifier: TotpVerifier,
        qrCodeRenderer: QrCodeRenderer,
      ) =>
        new StartEnrollmentUseCase(
          userRepository,
          secretCipher,
          totpVerifier,
          qrCodeRenderer,
        ),
      inject: [UserRepository, SecretCipher, TotpVerifier, QrCodeRenderer],
    },
    {
      provide: ConfirmEnrollmentUseCase,
      useFactory: (
        userRepository: UserRepository,
        secretCipher: SecretCipher,
        totpVerifier: TotpVerifier,
        sessionTokenService: SessionTokenService,
      ) =>
        new ConfirmEnrollmentUseCase(
          userRepository,
          secretCipher,
          totpVerifier,
          sessionTokenService,
        ),
      inject: [UserRepository, SecretCipher, TotpVerifier, SessionTokenService],
    },
    LoginAttemptGuard,
    EmailLookupGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
