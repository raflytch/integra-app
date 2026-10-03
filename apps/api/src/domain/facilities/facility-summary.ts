import type {
  ClaimFacility,
  FacilityType,
  TestType,
} from '../claims/claim-detail';
import type { SortDirection } from '../claims/claim-queue-item';

export interface FacilitySummary {
  facility: ClaimFacility;
  claimCount: number;
  flaggedClaimCount: number;
  findingCounts: Record<TestType, number>;
  totalPotentialGap: number;
}

export const FACILITY_SUMMARY_SORT_KEYS = [
  'facility',
  'claimCount',
  'flaggedClaimCount',
  'EXISTENCE',
  'CONSISTENCY',
  'SIMILARITY',
  'totalPotentialGap',
] as const;

export type FacilitySummarySortKey =
  (typeof FACILITY_SUMMARY_SORT_KEYS)[number];

export const MAX_FACILITY_SUMMARY_PAGE_SIZE = 100;

/** One page of facility summaries, aggregated, filtered, and sorted by the database. */
export interface FacilitySummaryQuery {
  /** Matches facility name, code, or city. */
  search?: string;
  type?: FacilityType;
  sortBy: FacilitySummarySortKey;
  sortDirection: SortDirection;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface FacilitySummaryPage {
  items: FacilitySummary[];
  /** Facilities matching the query across every page. */
  total: number;
  page: number;
  pageSize: number;
}
