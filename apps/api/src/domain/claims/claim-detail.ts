import type { Decision } from '../decisions/decision';

export type ClaimStatus =
  'PENDING' | 'APPROVED' | 'CLARIFICATION_REQUESTED' | 'ESCALATED';
export type FacilityType = 'A' | 'B' | 'C' | 'D';
export type Gender = 'M' | 'F';
export type DocumentType =
  'MEDICAL_RESUME' | 'EXAM_NOTE' | 'DAILY_NOTE' | 'PRESCRIPTION' | 'PROCEDURE';
export type EvidenceType =
  'MEDICATION' | 'PROCEDURE' | 'FINDING' | 'VITAL_SIGN';
export type TestType = 'EXISTENCE' | 'CONSISTENCY' | 'SIMILARITY';

export type FindingCitation =
  | {
      kind: 'MISSING_EVIDENCE';
      evidenceType: EvidenceType;
      expected: string;
      guidelineRef: string;
    }
  | { kind: 'QUOTE'; documentId: string; quote: string }
  | {
      kind: 'IDENTICAL_TEXT';
      documentId: string;
      relatedDocumentId: string;
      text: string;
    };

export interface ClaimFacility {
  id: string;
  code: string;
  name: string;
  type: FacilityType;
  city: string;
}

export interface ClaimPatient {
  id: string;
  medicalRecordNo: string;
  name: string;
  gender: Gender;
  birthDate: Date;
}

export interface ClaimDiagnosis {
  id: string;
  icd10Code: string;
  name: string;
  isPrimary: boolean;
}

export interface ClaimDocument {
  id: string;
  type: DocumentType;
  recordedAt: Date;
  content: string;
  isExtracted: boolean;
}

export interface RelatedClaimSummary {
  id: string;
  claimNo: string;
  facilityName: string;
}

export interface ClaimFinding {
  id: string;
  testType: TestType;
  strength: number;
  summary: string;
  citations: FindingCitation[];
  documentId: string | null;
  relatedDocumentId: string | null;
  diagnosisId: string | null;
  relatedClaim: RelatedClaimSummary | null;
  similarity: number | null;
  tariffGap: number | null;
  createdAt: Date;
}

export interface ClaimDetail {
  id: string;
  claimNo: string;
  status: ClaimStatus;
  admittedAt: Date;
  dischargedAt: Date;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  potentialGap: number;
  priorityScore: number;
  facility: ClaimFacility;
  patient: ClaimPatient;
  diagnoses: ClaimDiagnosis[];
  documents: ClaimDocument[];
  findings: ClaimFinding[];
  decisions: Decision[];
}
