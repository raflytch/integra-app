import type { TestType } from '../claims/claim-detail';
import type {
  ClaimEvidence,
  DocumentToExtract,
  EvidenceRule,
  FindingSignal,
  NewFinding,
} from './claim-evidence';
import type { ClinicalExtraction } from './clinical-extraction';

export abstract class AnalysisRepository {
  abstract findClaimsForAnalysis(): Promise<ClaimEvidence[]>;
  abstract findClaimEvidence(claimId: string): Promise<ClaimEvidence | null>;
  /** Claims with at least one unextracted document, pending claims and newest admissions first. */
  abstract findClaimIdsAwaitingExtraction(limit: number): Promise<string[]>;
  abstract countClaimsAwaitingExtraction(): Promise<number>;
  abstract findDocumentsToExtract(
    claimId: string,
  ): Promise<DocumentToExtract[]>;
  abstract saveExtraction(
    documentId: string,
    extraction: ClinicalExtraction,
  ): Promise<void>;
  abstract findEvidenceRules(icd10Codes: string[]): Promise<EvidenceRule[]>;
  abstract replaceFindings(
    claimId: string,
    testType: TestType,
    findings: NewFinding[],
  ): Promise<void>;
  abstract findFindingSignals(claimId: string): Promise<FindingSignal[]>;
  abstract saveClaimScores(
    claimId: string,
    scores: { potentialGap: number; priorityScore: number },
  ): Promise<void>;
}
