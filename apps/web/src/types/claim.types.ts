export type ClaimStatus =
  'PENDING' | 'APPROVED' | 'CLARIFICATION_REQUESTED' | 'ESCALATED';
export type FacilityType = 'A' | 'B' | 'C' | 'D';
export type Gender = 'M' | 'F';
export type DocumentType =
  'MEDICAL_RESUME' | 'EXAM_NOTE' | 'DAILY_NOTE' | 'PRESCRIPTION' | 'PROCEDURE';
export type EvidenceType =
  'MEDICATION' | 'PROCEDURE' | 'FINDING' | 'VITAL_SIGN';
export type TestType = 'EXISTENCE' | 'CONSISTENCY' | 'SIMILARITY';
export type DecisionAction = 'APPROVE' | 'REQUEST_CLARIFICATION' | 'ESCALATE';

export interface ClaimDecision {
  id: string;
  action: DecisionAction;
  reason: string;
  createdAt: string;
  verifier: { id: string; name: string };
}

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

export interface ClaimDocument {
  id: string;
  type: DocumentType;
  recordedAt: string;
  content: string;
  isExtracted: boolean;
}

export interface ClaimDiagnosis {
  id: string;
  icd10Code: string;
  name: string;
  isPrimary: boolean;
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
  relatedClaim: { id: string; claimNo: string; facilityName: string } | null;
  similarity: number | null;
  tariffGap: number | null;
  createdAt: string;
}

export interface ClaimDetail {
  id: string;
  claimNo: string;
  status: ClaimStatus;
  admittedAt: string;
  dischargedAt: string;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  potentialGap: number;
  priorityScore: number;
  /** ISO timestamp of the last completed AI analysis; null while unanalyzed. */
  analyzedAt: string | null;
  facility: {
    id: string;
    code: string;
    name: string;
    type: FacilityType;
    city: string;
  };
  patient: {
    id: string;
    medicalRecordNo: string;
    name: string;
    gender: Gender;
    birthDate: string;
  };
  diagnoses: ClaimDiagnosis[];
  documents: ClaimDocument[];
  findings: ClaimFinding[];
  decisions: ClaimDecision[];
}

export interface ClaimQueueItem {
  id: string;
  claimNo: string;
  status: ClaimStatus;
  admittedAt: string;
  dischargedAt: string;
  facility: { id: string; name: string; type: FacilityType };
  primaryDiagnosis: { icd10Code: string; name: string } | null;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  potentialGap: number;
  priorityScore: number;
  /** ISO timestamp of the last completed AI analysis; null while unanalyzed. */
  analyzedAt: string | null;
  findingCounts: Record<TestType, number>;
  documentCount: number;
  extractedDocumentCount: number;
}
