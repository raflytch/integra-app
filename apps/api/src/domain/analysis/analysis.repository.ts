import type { TestType } from '../claims/claim-detail';
import type {
  ClaimEvidence,
  EvidenceRule,
  FindingSignal,
  NewFinding,
} from './claim-evidence';

export abstract class AnalysisRepository {
  abstract findClaimsForAnalysis(): Promise<ClaimEvidence[]>;
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
