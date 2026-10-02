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
