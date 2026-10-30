import { apiClient } from '@/lib/api-client';
import type {
  AiUsageSummary,
  ClaimAiUsagePage,
  ClaimAiUsageParams,
} from '@/types/ai-usage.types';

/** Supervisor only: token totals, estimated cost, and the last 30 days. */
export async function fetchAiUsageSummary(): Promise<AiUsageSummary> {
  const response = await apiClient.get<AiUsageSummary>('/ai-usage/summary');
  return response.data;
}

/** One page of per-claim AI usage; the API aggregates, filters, and sorts. */
export async function fetchClaimAiUsagePage(
  params: ClaimAiUsageParams,
): Promise<ClaimAiUsagePage> {
  const response = await apiClient.get<ClaimAiUsagePage>('/ai-usage/claims', {
    params,
  });
  return response.data;
}
