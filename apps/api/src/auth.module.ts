import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GetCurrentUserUseCase } from './application/auth/get-current-user.use-case';
import { LogInUseCase } from './application/auth/log-in.use-case';
import { SecretCipher } from './application/ports/secret-cipher.port';
import { SessionTokenService } from './application/ports/session-token.port';
import { TotpVerifier } from './application/ports/totp-verifier.port';
import { UserRepository } from './domain/users/user.repository';
import { SessionTokenModule } from './infrastructure/auth/session-token.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaUserRepository } from './infrastructure/database/prisma/repositories/prisma-user.repository';
import { SecurityModule } from './infrastructure/security/security.module';
import { LoginAttemptGuard } from './presentation/auth/login-attempt.guard';
import { SessionGuard } from './presentation/auth/session.guard';
import { AuthController } from './presentation/controllers/auth.controller';

@Module({
  imports: [PrismaModule, SecurityModule, SessionTokenModule],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    {
      provide: LogInUseCase,
      useFactory: (
        userRepository: UserRepository,
        secretCipher: SecretCipher,
        totpVerifier: TotpVerifier,
        sessionTokenService: SessionTokenService,
      ) =>
        new LogInUseCase(
          userRepository,
          secretCipher,
          totpVerifier,
          sessionTokenService,
        ),
      inject: [UserRepository, SecretCipher, TotpVerifier, SessionTokenService],
    },
    {
      provide: GetCurrentUserUseCase,
      useFactory: (userRepository: UserRepository) =>
        new GetCurrentUserUseCase(userRepository),
      inject: [UserRepository],
    },
    LoginAttemptGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
