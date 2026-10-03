import { apiClient } from '@/lib/api-client';

/** The AI reads documents through a paid LLM; one request can take minutes. */
const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;

export interface AnalysisRunSummary {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  analyzedClaimCount: number;
  flaggedClaimCount: number;
  findingCount: number;
  remainingClaimCount: number;
}

export interface ClaimAnalysisResult {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  isAnalyzed: boolean;
  findingCount: number;
  potentialGap: number;
}

export async function runAnalysis(): Promise<AnalysisRunSummary> {
  const response = await apiClient.post<AnalysisRunSummary>(
    '/analysis/run',
    undefined,
    { timeout: ANALYSIS_TIMEOUT_MS },
  );
  return response.data;
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
