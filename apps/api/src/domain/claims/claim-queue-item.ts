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
  /** When the AI analysis last completed; null while the claim is unanalyzed. */
  analyzedAt: Date | null;
  findingCounts: Record<TestType, number>;
  documentCount: number;
  /** Documents already read by the AI; the claim is analyzed when it equals `documentCount`. */
  extractedDocumentCount: number;
}

export const CLAIM_QUEUE_SORT_KEYS = [
  'priority',
  'claimNo',
  'facility',
  'admittedAt',
  'findings',
  'potentialGap',
  'status',
  'analyzedAt',
] as const;

export type ClaimQueueSortKey = (typeof CLAIM_QUEUE_SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';
export type AnalysisFilter = 'ANALYZED' | 'NOT_ANALYZED';
/** Only analyzed claims can be flagged or clean; unanalyzed claims match neither. */
export type SignalFilter = 'FLAGGED' | 'CLEAN';

export const MAX_CLAIM_QUEUE_PAGE_SIZE = 100;

/** One page of the queue, filtered, searched, and sorted by the database. */
export interface ClaimQueueQuery {
  status?: ClaimStatus;
  facilityId?: string;
  /** Matches claim number, primary diagnosis name or ICD-10 code, INA-CBG code, and facility name. */
  search?: string;
  analysis?: AnalysisFilter;
  signal?: SignalFilter;
  sortBy: ClaimQueueSortKey;
  sortDirection: SortDirection;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface ClaimQueuePage {
  items: ClaimQueueItem[];
  /** Claims matching the query across every page. */
  total: number;
  page: number;
  pageSize: number;
}

export interface MonthlyClaimCounts {
  /** Admission month as `YYYY-MM`. */
  month: string;
  notAnalyzed: number;
  clean: number;
  flagged: number;
}

/** Aggregates over every claim, so dashboards never download the whole queue. */
export interface ClaimStatistics {
  totalCount: number;
  analyzedCount: number;
  flaggedCount: number;
  totalPotentialGap: number;
  statusCounts: Record<ClaimStatus, number>;
  monthlyCounts: MonthlyClaimCounts[];
}
