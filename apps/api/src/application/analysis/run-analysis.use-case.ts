import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type { ClaimEvidence } from '../../domain/analysis/claim-evidence';
import { calculatePriorityScore } from '../../domain/analysis/priority-score';
import type { RunExistenceTestUseCase } from './run-existence-test.use-case';

export interface AnalysisRunSummary {
  analyzedClaimCount: number;
  skippedClaimCount: number;
  flaggedClaimCount: number;
  findingCount: number;
}

function isFullyExtracted(claim: ClaimEvidence): boolean {
  return (
    claim.documents.length > 0 &&
    claim.documents.every((document) => document.extracted !== null)
  );
}

export class RunAnalysisUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly runExistenceTest: RunExistenceTestUseCase,
  ) {}

  async execute(): Promise<AnalysisRunSummary> {
    const claims = await this.analysisRepository.findClaimsForAnalysis();
    const extractedClaims = claims.filter(isFullyExtracted);
    const secondaryDiagnosisCodes = new Set(
      extractedClaims.flatMap((claim) =>
        claim.diagnoses
          .filter((diagnosis) => !diagnosis.isPrimary)
          .map((diagnosis) => diagnosis.icd10Code),
      ),
    );
    const evidenceRules = await this.analysisRepository.findEvidenceRules([
      ...secondaryDiagnosisCodes,
    ]);

    let flaggedClaimCount = 0;
    let findingCount = 0;
    for (const claim of extractedClaims) {
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
      });
      findingCount += findingSignals.length;
      if (findingSignals.length > 0) flaggedClaimCount += 1;
    }

    return {
      analyzedClaimCount: extractedClaims.length,
      skippedClaimCount: claims.length - extractedClaims.length,
      flaggedClaimCount,
      findingCount,
    };
  }
}
