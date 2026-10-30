import type {
  AiUsageDay,
  AiUsageTotals,
  ClaimAiUsagePage,
  ClaimAiUsageQuery,
} from './ai-usage';

export abstract class AiUsageRepository {
  abstract findTotals(): Promise<AiUsageTotals>;
  /** Days with at least one recorded extraction from `since` on, oldest first. */
  abstract findDailyUsage(since: Date): Promise<AiUsageDay[]>;
  abstract findClaimUsagePage(
    query: ClaimAiUsageQuery,
  ): Promise<ClaimAiUsagePage>;
}
