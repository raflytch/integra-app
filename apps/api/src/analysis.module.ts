import { Module } from '@nestjs/common';
import { RunAnalysisUseCase } from './application/analysis/run-analysis.use-case';
import { RunExistenceTestUseCase } from './application/analysis/run-existence-test.use-case';
import { TariffSchedule } from './application/ports/tariff-schedule.port';
import { AnalysisRepository } from './domain/analysis/analysis.repository';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaAnalysisRepository } from './infrastructure/database/prisma/repositories/prisma-analysis.repository';
import { SyntheticTariffSchedule } from './infrastructure/tariffs/synthetic-tariff-schedule';
import { AnalysisController } from './presentation/controllers/analysis.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalysisController],
  providers: [
    { provide: AnalysisRepository, useClass: PrismaAnalysisRepository },
    { provide: TariffSchedule, useClass: SyntheticTariffSchedule },
    {
      provide: RunExistenceTestUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        tariffSchedule: TariffSchedule,
      ) => new RunExistenceTestUseCase(analysisRepository, tariffSchedule),
      inject: [AnalysisRepository, TariffSchedule],
    },
    {
      provide: RunAnalysisUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        runExistenceTest: RunExistenceTestUseCase,
      ) => new RunAnalysisUseCase(analysisRepository, runExistenceTest),
      inject: [AnalysisRepository, RunExistenceTestUseCase],
    },
  ],
})
export class AnalysisModule {}
