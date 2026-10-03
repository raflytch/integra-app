import { apiClient } from '@/lib/api-client';
import type {
  FacilityOption,
  FacilitySummaryPage,
  FacilitySummaryParams,
} from '@/types/facility.types';

/** One page of facility summaries; the API aggregates, filters, and sorts. */
export async function fetchFacilitySummaryPage(
  params: FacilitySummaryParams,
): Promise<FacilitySummaryPage> {
  const response = await apiClient.get<FacilitySummaryPage>(
    '/facilities/summary',
    { params },
  );
  return response.data;
}

/** Facility names for the claim queue filter; readable by every role. */
export async function fetchFacilityOptions(): Promise<FacilityOption[]> {
  const response = await apiClient.get<FacilityOption[]>('/facilities');
  return response.data;
}
