import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type {
  ClaimDecision,
  ClaimDetail,
  ClaimQueuePage,
  ClaimQueueParams,
  ClaimStatistics,
  DecisionAction,
} from '@/types/claim.types';

/** One page of the queue; the API filters, searches, and sorts. */
export async function fetchClaimQueuePage(
  params: ClaimQueueParams,
): Promise<ClaimQueuePage> {
  const response = await apiClient.get<ClaimQueuePage>('/claims', { params });
  return response.data;
}

export async function fetchClaimStatistics(): Promise<ClaimStatistics> {
  const response = await apiClient.get<ClaimStatistics>('/claims/statistics');
  return response.data;
}

export async function fetchClaimDetail(claimId: string): Promise<ClaimDetail> {
  const response = await apiClient.get<ClaimDetail>(`/claims/${claimId}`);
  return response.data;
}

export async function recordDecision(
  claimId: string,
  decisionInput: { action: DecisionAction; reason: string },
): Promise<ClaimDecision> {
  const response = await apiClient.post<ClaimDecision>(
    `/claims/${claimId}/decisions`,
    decisionInput,
  );
  return response.data;
}

export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
