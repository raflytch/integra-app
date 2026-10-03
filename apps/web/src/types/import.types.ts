import type { DocumentType, FacilityType } from './claim.types';

/** One claim in the `integra-claims/v1` import format. */
export interface CanonicalClaim {
  claimNo: string;
  facility: { code: string; name: string; type: FacilityType; city: string };
  patient: {
    medicalRecordNo: string;
    name: string;
    gender: 'M' | 'F';
    birthDate: string;
  };
  admittedAt: string;
  dischargedAt: string;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  diagnoses: { icd10Code: string; name: string; isPrimary: boolean }[];
  documents: { type: DocumentType; recordedAt: string; content: string }[];
}

export type ClaimImportSource = 'CANONICAL' | 'AI_NORMALIZED';
export type ClaimPreviewStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export interface ClaimPreviewRow {
  index: number;
  claimNo: string | null;
  status: ClaimPreviewStatus;
  issues: string[];
  claim: CanonicalClaim | null;
}

export interface ClaimImportPreview {
  source: ClaimImportSource;
  claims: ClaimPreviewRow[];
  summary: { valid: number; invalid: number; duplicate: number };
}

export interface ClaimImportResult {
  importedCount: number;
  skipped: { claimNo: string; reason: string }[];
}
