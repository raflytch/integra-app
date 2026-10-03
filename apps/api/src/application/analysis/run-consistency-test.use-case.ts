import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  NewFinding,
} from '../../domain/analysis/claim-evidence';
import { findInconsistencies } from '../../domain/analysis/consistency-test';

const STRENGTH_DECIMALS = 2;

export class RunConsistencyTestUseCase {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(claim: ClaimEvidence): Promise<void> {
    const consistencyFindings: NewFinding[] = findInconsistencies(claim).map(
      ({ strength, summary, documentId, relatedDocumentId, quotes }) => ({
        testType: 'CONSISTENCY',
        strength: Number(strength.toFixed(STRENGTH_DECIMALS)),
        summary,
        citations: quotes,
        documentId,
        relatedDocumentId,
        diagnosisId: null,
        relatedClaimId: null,
        similarity: null,
        tariffGap: null,
      }),
    );

    await this.analysisRepository.replaceFindings(
      claim.claimId,
      'CONSISTENCY',
      consistencyFindings,
    );
  }
}
