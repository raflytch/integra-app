import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  EvidenceRule,
} from '../../domain/analysis/claim-evidence';
import { calculatePriorityScore } from '../../domain/analysis/priority-score';
import type { RunExistenceTestUseCase } from './run-existence-test.use-case';

export interface ClaimEvaluation {
  findingCount: number;
  potentialGap: number;
}

/** Runs every available detector on one extracted claim and rescores it. */
export class EvaluateClaimUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly runExistenceTest: RunExistenceTestUseCase,
  ) {}

  async execute(
    claim: ClaimEvidence,
    evidenceRules: EvidenceRule[],
  ): Promise<ClaimEvaluation> {
    await this.runExistenceTest.execute(claim, evidenceRules);

    const findingSignals = await this.analysisRepository.findFindingSignals(
      claim.claimId,
    );
    const potentialGap = findingSignals.reduce(
      (gapTotal, signal) => gapTotal + (signal.tariffGap ?? 0),
      0,
    );
    await this.analysisRepository.saveClaimScores(claim.claimId, {
      potentialGap,
      priorityScore: calculatePriorityScore(
        findingSignals.map((signal) => signal.strength),
        potentialGap,
        claim.tariffAmount,
      ),
      analyzedAt: new Date(),
    });
    return { findingCount: findingSignals.length, potentialGap };
  }
}

/** Secondary diagnosis codes whose evidence rules the detectors need. */
export function collectSecondaryDiagnosisCodes(
  claims: ClaimEvidence[],
): string[] {
  return [
    ...new Set(
      claims.flatMap((claim) =>
        claim.diagnoses
          .filter((diagnosis) => !diagnosis.isPrimary)
          .map((diagnosis) => diagnosis.icd10Code),
      ),
    ),
  ];
}
