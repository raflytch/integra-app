import type { CareType, ClaimStatus, Gender } from './claim.types';

export interface VedikaAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  syncedAt: string | null;
  uploadedBy: { id: string; name: string };
}

export interface VedikaSep {
  number: string;
  date: string;
  participant: {
    cardNumber: string;
    medicalRecordNo: string;
    name: string;
    birthDate: string;
    gender: Gender;
    phone: string;
    membership: string;
    entitledClass: string;
  };
  service: {
    facilityName: string;
    referringFacility: string;
    careType: string;
    visitType: string;
    specialty: string;
    doctor: string;
    note: string;
  };
  initialDiagnosis: { icd10Code: string; name: string } | null;
}

export interface VedikaReply {
  isSimulated: true;
  syncedAt: string;
  sep: VedikaSep;
  checks: { label: string; isPassed: true }[];
}

export interface VedikaStatus {
  attachments: VedikaAttachment[];
  reply: VedikaReply | null;
}

export interface ScannedSep {
  fileName: string | null;
  fields: { label: string; value: string }[];
}

export type VedikaSyncState = 'LATEST' | 'SENT' | 'VERIFIED';

export type VedikaClaimSortKey =
  'claimNo' | 'facility' | 'admittedAt' | 'syncedAt';

export interface VedikaClaimSummary {
  claimId: string;
  claimNo: string;
  claimStatus: ClaimStatus;
  careType: CareType;
  admittedAt: string;
  patientName: string;
  facilityName: string;
  primaryDiagnosis: string | null;
  attachmentCount: number;
  syncedAt: string | null;
  refreshedAt: string | null;
  syncState: VedikaSyncState;
}

export interface VedikaClaimParams {
  search?: string;
  syncState?: VedikaSyncState;
  sortBy: VedikaClaimSortKey;
  sortDirection: 'asc' | 'desc';
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
  syncedAt: string;
}
