import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  EvidenceRule,
} from '../../domain/analysis/claim-evidence';
import { calculatePriorityScore } from '../../domain/analysis/priority-score';
import type { RunConsistencyTestUseCase } from './run-consistency-test.use-case';
import type { RunExistenceTestUseCase } from './run-existence-test.use-case';
import type { RunSimilarityTestUseCase } from './run-similarity-test.use-case';

/** A detector about to run, reported so the client can show live progress. */
export type DetectorStep = 'EXISTENCE' | 'CONSISTENCY' | 'SIMILARITY';

export interface ClaimEvaluation {
  findingCount: number;
  potentialGap: number;
}

/** Runs every available detector on one extracted claim and rescores it. */
export class EvaluateClaimUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly runExistenceTest: RunExistenceTestUseCase,
    private readonly runConsistencyTest: RunConsistencyTestUseCase,
    private readonly runSimilarityTest: RunSimilarityTestUseCase,
  ) {}

  async execute(
    claim: ClaimEvidence,
    evidenceRules: EvidenceRule[],
    onStep: (step: DetectorStep) => void = () => {},
  ): Promise<ClaimEvaluation> {
    onStep('EXISTENCE');
    await this.runExistenceTest.execute(claim, evidenceRules);
    onStep('CONSISTENCY');
    await this.runConsistencyTest.execute(claim);
    onStep('SIMILARITY');
    await this.runSimilarityTest.execute(claim);

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
