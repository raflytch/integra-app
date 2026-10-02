import type {
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

export interface ClaimEvidence {
  claimId: string;
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  diagnoses: {
    id: string;
    icd10Code: string;
    name: string;
    isPrimary: boolean;
  }[];
  documents: { id: string; extracted: ClinicalExtraction | null }[];
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
