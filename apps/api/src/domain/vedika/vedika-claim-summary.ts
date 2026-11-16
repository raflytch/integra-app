import type { CareType, ClaimStatus } from '../claims/claim-detail';
import type { SortDirection } from '../claims/claim-queue-item';

export const VEDIKA_SYNC_STATES = ['LATEST', 'SENT', 'VERIFIED'] as const;
export type VedikaSyncState = (typeof VEDIKA_SYNC_STATES)[number];

export const VEDIKA_CLAIM_SORT_KEYS = [
  'claimNo',
  'facility',
  'admittedAt',
  'syncedAt',
] as const;
export type VedikaClaimSortKey = (typeof VEDIKA_CLAIM_SORT_KEYS)[number];

export const MAX_VEDIKA_CLAIM_PAGE_SIZE = 100;

export interface VedikaClaimSummary {
  claimId: string;
  claimNo: string;
  claimStatus: ClaimStatus;
  careType: CareType;
  admittedAt: Date;
  patientName: string;
  facilityName: string;
  primaryDiagnosis: string | null;
  attachmentCount: number;
  syncedAt: Date | null;
  refreshedAt: Date | null;
  syncState: VedikaSyncState;
}

export interface VedikaClaimQuery {
  search?: string;
  syncState?: VedikaSyncState;
  sortBy: VedikaClaimSortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

export interface VedikaClaimPage {
  items: VedikaClaimSummary[];
  total: number;
  page: number;
  pageSize: number;
  syncStateCounts: Record<VedikaSyncState, number>;
}

export interface VedikaBulkRefreshResult {
  refreshedClaimCount: number;
  verifiedClaimCount: number;
  syncedAt: Date;
}

export function toVedikaSyncState(
  claimStatus: ClaimStatus,
  syncedAt: Date | null,
): VedikaSyncState {
  if (claimStatus !== 'APPROVED') return 'LATEST';
  return syncedAt ? 'VERIFIED' : 'SENT';
}
