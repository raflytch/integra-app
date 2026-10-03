import { apiClient } from '@/lib/api-client';

export interface AnalysisRunSummary {
  analyzedClaimCount: number;
  skippedClaimCount: number;
  flaggedClaimCount: number;
  findingCount: number;
}

export async function runAnalysis(): Promise<AnalysisRunSummary> {
  const response = await apiClient.post<AnalysisRunSummary>('/analysis/run');
  return response.data;
}
