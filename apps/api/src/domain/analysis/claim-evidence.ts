import type {
  DocumentType,
  EvidenceType,
  FindingCitation,
  TestType,
} from '../claims/claim-detail';
import type { ClinicalExtraction } from './clinical-extraction';

export interface EvidenceRule {
  icd10Code: string;
  evidenceType: EvidenceType;
  expected: string;
  guidelineRef: string;
}

export interface ClaimEvidenceDocument {
  id: string;
  type: DocumentType;
  recordedAt: Date;
  content: string;
  extracted: ClinicalExtraction | null;
}

export interface ClaimEvidence {
  claimId: string;
  claimNo: string;
  patientId: string;
  /** Date-only column, stored as UTC midnight. */
  admittedAt: Date;
  /** Date-only column, stored as UTC midnight. */
  dischargedAt: Date;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  diagnoses: {
    id: string;
    icd10Code: string;
    name: string;
    isPrimary: boolean;
  }[];
  /** Ordered by `recordedAt` ascending. */
  documents: ClaimEvidenceDocument[];
}

/** Detectors only judge a claim once the AI has read every document. */
export function isFullyExtracted(claim: ClaimEvidence): boolean {
  return (
    claim.documents.length > 0 &&
    claim.documents.every((document) => document.extracted !== null)
  );
}

export interface DocumentToExtract {
  id: string;
  type: DocumentType;
  content: string;
}

export interface NewFinding {
  testType: TestType;
  strength: number;
  summary: string;
  citations: FindingCitation[];
  documentId: string | null;
  relatedDocumentId: string | null;
  diagnosisId: string | null;
  relatedClaimId: string | null;
  similarity: number | null;
  tariffGap: number | null;
}

export interface FindingSignal {
  testType: TestType;
  strength: number;
  tariffGap: number | null;
}
