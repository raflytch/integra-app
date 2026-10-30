import type { AiUsageDay, AiUsageTotals } from '../../domain/ai-usage/ai-usage';
import type { AiUsageRepository } from '../../domain/ai-usage/ai-usage.repository';
import { estimateCost, type LlmPricing } from './llm-pricing';

/** Days shown in the daily chart, today included. */
export const AI_USAGE_DAY_COUNT = 30;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AiUsageSummary {
  pricing: LlmPricing | null;
  totals: AiUsageTotals & { estimatedCost: number | null };
  averageCostPerClaim: number | null;
  /** Every day of the window, including days without usage. */
  daily: (AiUsageDay & { estimatedCost: number | null })[];
}

/** `YYYY-MM-DD` of the Jakarta calendar day containing `instant`. */
function toJakartaDate(instant: Date): string {
  return new Date(instant.getTime() + JAKARTA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export class GetAiUsageSummaryUseCase {
  constructor(
    private readonly aiUsageRepository: AiUsageRepository,
    private readonly pricing: LlmPricing | null,
  ) {}

  async execute(now = new Date()): Promise<AiUsageSummary> {
    const firstDate = toJakartaDate(
      new Date(now.getTime() - (AI_USAGE_DAY_COUNT - 1) * DAY_MS),
    );
    // Midnight of the first day in Jakarta, as a UTC instant.
    const since = new Date(
      new Date(`${firstDate}T00:00:00.000Z`).getTime() - JAKARTA_OFFSET_MS,
    );
    const [totals, usageDays] = await Promise.all([
      this.aiUsageRepository.findTotals(),
      this.aiUsageRepository.findDailyUsage(since),
    ]);

    const usageByDate = new Map(usageDays.map((day) => [day.date, day]));
    const daily = Array.from({ length: AI_USAGE_DAY_COUNT }, (_, index) => {
      const date = toJakartaDate(
        new Date(since.getTime() + JAKARTA_OFFSET_MS + index * DAY_MS),
      );
      const day = usageByDate.get(date) ?? {
        date,
        documentCount: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      return { ...day, estimatedCost: estimateCost(day, this.pricing) };
    });

    const totalCost = estimateCost(totals, this.pricing);
    return {
      pricing: this.pricing,
      totals: { ...totals, estimatedCost: totalCost },
      averageCostPerClaim:
        totalCost !== null && totals.claimCount > 0
          ? totalCost / totals.claimCount
          : null,
      daily,
    };
  }
}
