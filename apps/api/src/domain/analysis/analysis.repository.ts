import type { TestType } from '../claims/claim-detail';
import type {
  ClaimEvidence,
  DocumentToExtract,
  EvidenceRule,
  FindingSignal,
  NewFinding,
  SimilarityCandidate,
} from './claim-evidence';
import type { ClinicalExtraction } from './clinical-extraction';

export abstract class AnalysisRepository {
  abstract findClaimEvidence(claimId: string): Promise<ClaimEvidence | null>;
  abstract findDocumentsToExtract(
    claimId: string,
  ): Promise<DocumentToExtract[]>;
  abstract saveExtraction(
    documentId: string,
    extraction: ClinicalExtraction,
  ): Promise<void>;
  abstract findEvidenceRules(icd10Codes: string[]): Promise<EvidenceRule[]>;
  /** Other claims that share a primary diagnosis with the given claim, excluding the same patient. */
  abstract findSimilarityCandidates(
    claim: ClaimEvidence,
  ): Promise<SimilarityCandidate[]>;
  abstract replaceFindings(
    claimId: string,
    testType: TestType,
    findings: NewFinding[],
  ): Promise<void>;
  abstract findFindingSignals(claimId: string): Promise<FindingSignal[]>;
  abstract saveClaimScores(
    claimId: string,
    scores: {
      potentialGap: number;
      priorityScore: number;
      analyzedAt: Date;
    },
  ): Promise<void>;
}
