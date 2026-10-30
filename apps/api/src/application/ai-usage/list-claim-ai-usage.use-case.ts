import type {
  ClaimAiUsage,
  ClaimAiUsageQuery,
} from '../../domain/ai-usage/ai-usage';
import type { AiUsageRepository } from '../../domain/ai-usage/ai-usage.repository';
import { estimateCost, type LlmPricing } from './llm-pricing';

export interface ClaimAiUsageListPage {
  items: (ClaimAiUsage & { estimatedCost: number | null })[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListClaimAiUsageUseCase {
  constructor(
    private readonly aiUsageRepository: AiUsageRepository,
    private readonly pricing: LlmPricing | null,
  ) {}

  async execute(query: ClaimAiUsageQuery): Promise<ClaimAiUsageListPage> {
    const usagePage = await this.aiUsageRepository.findClaimUsagePage(query);
    return {
      ...usagePage,
      items: usagePage.items.map((claimUsage) => ({
        ...claimUsage,
        estimatedCost: estimateCost(claimUsage, this.pricing),
      })),
    };
  }
}
