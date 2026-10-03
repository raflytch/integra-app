import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyzeClaimUseCase } from './application/analysis/analyze-claim.use-case';
import { EvaluateClaimUseCase } from './application/analysis/evaluate-claim.use-case';
import { ExtractClaimDocumentsUseCase } from './application/analysis/extract-claim-documents.use-case';
import { RunConsistencyTestUseCase } from './application/analysis/run-consistency-test.use-case';
import { RunExistenceTestUseCase } from './application/analysis/run-existence-test.use-case';
import { RunSimilarityTestUseCase } from './application/analysis/run-similarity-test.use-case';
import { LlmClient } from './application/ports/llm-client.port';
import { TariffSchedule } from './application/ports/tariff-schedule.port';
import { AnalysisRepository } from './domain/analysis/analysis.repository';
import type { Env } from './infrastructure/config/env.schema';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaAnalysisRepository } from './infrastructure/database/prisma/repositories/prisma-analysis.repository';
import { LlmModule } from './infrastructure/llm/llm.module';
import { SyntheticTariffSchedule } from './infrastructure/tariffs/synthetic-tariff-schedule';
import { AnalysisController } from './presentation/controllers/analysis.controller';

@Module({
  imports: [PrismaModule, LlmModule],
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
      provide: RunConsistencyTestUseCase,
      useFactory: (analysisRepository: AnalysisRepository) =>
        new RunConsistencyTestUseCase(analysisRepository),
      inject: [AnalysisRepository],
    },
    {
      provide: RunSimilarityTestUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        config: ConfigService<Env, true>,
      ) =>
        new RunSimilarityTestUseCase(
          analysisRepository,
          config.get('SIMILARITY_THRESHOLD', { infer: true }),
        ),
      inject: [AnalysisRepository, ConfigService],
    },
    {
      provide: EvaluateClaimUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        runExistenceTest: RunExistenceTestUseCase,
        runConsistencyTest: RunConsistencyTestUseCase,
        runSimilarityTest: RunSimilarityTestUseCase,
      ) =>
        new EvaluateClaimUseCase(
          analysisRepository,
          runExistenceTest,
          runConsistencyTest,
          runSimilarityTest,
        ),
      inject: [
        AnalysisRepository,
        RunExistenceTestUseCase,
        RunConsistencyTestUseCase,
        RunSimilarityTestUseCase,
      ],
    },
    {
      provide: ExtractClaimDocumentsUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        llmClient: LlmClient,
      ) => new ExtractClaimDocumentsUseCase(analysisRepository, llmClient),
      inject: [AnalysisRepository, LlmClient],
    },
    {
      provide: AnalyzeClaimUseCase,
      useFactory: (
        analysisRepository: AnalysisRepository,
        extractClaimDocuments: ExtractClaimDocumentsUseCase,
        evaluateClaim: EvaluateClaimUseCase,
      ) =>
        new AnalyzeClaimUseCase(
          analysisRepository,
          extractClaimDocuments,
          evaluateClaim,
        ),
      inject: [
        AnalysisRepository,
        ExtractClaimDocumentsUseCase,
        EvaluateClaimUseCase,
      ],
    },
  ],
})
export class AnalysisModule {}
