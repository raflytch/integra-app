import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type {
  ClaimDecision,
  ClaimDetail,
  ClaimQueueItem,
  ClaimStatus,
  DecisionAction,
} from '@/types/claim.types';

export async function fetchClaimQueue(
  status?: ClaimStatus,
): Promise<ClaimQueueItem[]> {
  const response = await apiClient.get<ClaimQueueItem[]>('/claims', {
    params: { status },
  });
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
