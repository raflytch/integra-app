import type { DocumentType, FacilityType } from '../claims/claim-detail';

export const MAX_IMPORT_CLAIMS = 200;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

/** One claim in the `integra-claims/v1` import format. Dates stay as written. */
export interface ImportedClaim {
  claimNo: string;
  facility: { code: string; name: string; type: FacilityType; city: string };
  patient: {
    medicalRecordNo: string;
    name: string;
    gender: 'M' | 'F';
    /** YYYY-MM-DD */
    birthDate: string;
  };
  /** YYYY-MM-DD */
  admittedAt: string;
  /** YYYY-MM-DD */
  dischargedAt: string;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  diagnoses: { icd10Code: string; name: string; isPrimary: boolean }[];
  /** `recordedAt` is ISO 8601 with offset. */
  documents: { type: DocumentType; recordedAt: string; content: string }[];
}

export interface ClaimImportResult {
  importedCount: number;
  skipped: { claimNo: string; reason: string }[];
}
