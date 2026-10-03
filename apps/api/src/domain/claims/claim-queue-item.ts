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
  documentCount: number;
  /** Documents already read by the AI; the claim is analyzed when it equals `documentCount`. */
  extractedDocumentCount: number;
}

export interface ClaimQueueFilter {
  status?: ClaimStatus;
}
