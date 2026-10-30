import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetAiUsageSummaryUseCase } from './application/ai-usage/get-ai-usage-summary.use-case';
import { ListClaimAiUsageUseCase } from './application/ai-usage/list-claim-ai-usage.use-case';
import type { LlmPricing } from './application/ai-usage/llm-pricing';
import { AiUsageRepository } from './domain/ai-usage/ai-usage.repository';
import type { Env } from './infrastructure/config/env.schema';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaAiUsageRepository } from './infrastructure/database/prisma/repositories/prisma-ai-usage.repository';
import { AiUsageController } from './presentation/controllers/ai-usage.controller';

const LLM_PRICING = Symbol('LLM_PRICING');

/** Null unless both prices are configured; a half-set price would mislead. */
function readLlmPricing(config: ConfigService<Env, true>): LlmPricing | null {
  const inputPerMillionTokens = config.get('LLM_INPUT_PRICE_PER_MTOK_IDR', {
    infer: true,
  });
  const outputPerMillionTokens = config.get('LLM_OUTPUT_PRICE_PER_MTOK_IDR', {
    infer: true,
  });
  return inputPerMillionTokens === undefined ||
    outputPerMillionTokens === undefined
    ? null
    : { inputPerMillionTokens, outputPerMillionTokens };
}

@Module({
  imports: [PrismaModule],
  controllers: [AiUsageController],
  providers: [
    { provide: AiUsageRepository, useClass: PrismaAiUsageRepository },
    {
      provide: LLM_PRICING,
      useFactory: readLlmPricing,
      inject: [ConfigService],
    },
    {
      provide: GetAiUsageSummaryUseCase,
      useFactory: (
        aiUsageRepository: AiUsageRepository,
        pricing: LlmPricing | null,
      ) => new GetAiUsageSummaryUseCase(aiUsageRepository, pricing),
      inject: [AiUsageRepository, LLM_PRICING],
    },
    {
      provide: ListClaimAiUsageUseCase,
      useFactory: (
        aiUsageRepository: AiUsageRepository,
        pricing: LlmPricing | null,
      ) => new ListClaimAiUsageUseCase(aiUsageRepository, pricing),
      inject: [AiUsageRepository, LLM_PRICING],
    },
  ],
})
export class AiUsageModule {}
