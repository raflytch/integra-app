import type { ClaimFacility, TestType } from '../claims/claim-detail';

export interface FacilitySummary {
  facility: ClaimFacility;
  claimCount: number;
  flaggedClaimCount: number;
  findingCounts: Record<TestType, number>;
  totalPotentialGap: number;
}
