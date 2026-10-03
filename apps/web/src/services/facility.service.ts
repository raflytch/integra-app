import { apiClient } from '@/lib/api-client';
import type { FacilitySummary } from '@/types/facility.types';

export async function fetchFacilitySummaries(): Promise<FacilitySummary[]> {
  const response = await apiClient.get<FacilitySummary[]>(
    '/facilities/summary',
  );
  return response.data;
}
