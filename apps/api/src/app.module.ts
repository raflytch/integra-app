import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { AnalysisModule } from './analysis.module';
import { AuthModule } from './auth.module';
import { ClaimsModule } from './claims.module';
import { FacilitiesModule } from './facilities.module';
import { ImportsModule } from './imports.module';
import { validateEnv } from './infrastructure/config/env.schema';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { LlmModule } from './infrastructure/llm/llm.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { HealthController } from './presentation/controllers/health.controller';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    HttpModule,
    PrismaModule,
    LlmModule,
    SecurityModule,
    AuthModule,
    AnalysisModule,
    ClaimsModule,
    FacilitiesModule,
    ImportsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
