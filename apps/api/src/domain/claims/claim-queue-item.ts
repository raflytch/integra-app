import type { ClaimStatus, FacilityType, TestType } from './claim-detail';

export interface ClaimQueueItem {
  id: string;
  claimNo: string;
  status: ClaimStatus;
  admittedAt: Date;
  dischargedAt: Date;
  facility: { id: string; name: string; type: FacilityType };
  primaryDiagnosis: { icd10Code: string; name: string } | null;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  potentialGap: number;
  priorityScore: number;
  findingCounts: Record<TestType, number>;
}

export interface ClaimQueueFilter {
  status?: ClaimStatus;
}
