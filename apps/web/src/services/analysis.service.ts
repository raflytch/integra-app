import { apiClient } from '@/lib/api-client';

/** The AI reads every document of a claim through a paid LLM; one claim can take minutes. */
const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;

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
