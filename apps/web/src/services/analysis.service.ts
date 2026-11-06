import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

/** A claim taking longer than this is reported to the verifier as timed out. */
export const ANALYSIS_TIMEOUT_MS = 60 * 1000;

export function isAnalysisTimeoutError(error: unknown): boolean {
  return isAxiosError(error) && error.code === 'ECONNABORTED';
}

export interface ClaimAnalysisResult {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  isAnalyzed: boolean;
  /** LLM tokens this call used; zero when no document needed reading. */
  tokenUsage: { inputTokens: number; outputTokens: number };
  findingCount: number;
  potentialGap: number;
}

export async function analyzeClaim(
  claimId: string,
): Promise<ClaimAnalysisResult> {
  const response = await apiClient.post<ClaimAnalysisResult>(
    `/analysis/claims/${claimId}`,
    undefined,
    { timeout: ANALYSIS_TIMEOUT_MS },
  );
  return response.data;
}
