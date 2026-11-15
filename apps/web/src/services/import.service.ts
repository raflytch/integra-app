import { apiClient } from '@/lib/api-client';
import type { ClaimDeletionResult } from '@/types/import.types';

const DELETE_ALL_CLAIMS_TIMEOUT_MS = 10 * 60 * 1000;

export async function deleteAllClaims(): Promise<ClaimDeletionResult> {
  const response = await apiClient.delete<ClaimDeletionResult>(
    '/imports/claims',
    { timeout: DELETE_ALL_CLAIMS_TIMEOUT_MS },
  );
  return response.data;
}
