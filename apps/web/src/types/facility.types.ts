import type { FacilityType, TestType } from './claim.types';

export interface FacilitySummary {
  facility: {
    id: string;
    code: string;
    name: string;
    type: FacilityType;
    city: string;
  };
  claimCount: number;
  flaggedClaimCount: number;
  findingCounts: Record<TestType, number>;
  totalPotentialGap: number;
}

export interface FacilityOption {
  id: string;
  name: string;
}

export type FacilitySummarySortKey =
  | 'facility'
  | 'claimCount'
  | 'flaggedClaimCount'
  | TestType
  | 'totalPotentialGap';

export interface FacilitySummaryParams {
  search?: string;
  type?: FacilityType;
  sortBy: FacilitySummarySortKey;
  sortDirection: 'asc' | 'desc';
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface FacilitySummaryPage {
  items: FacilitySummary[];
  /** Facilities matching the params across every page. */
  total: number;
  page: number;
  pageSize: number;
}
