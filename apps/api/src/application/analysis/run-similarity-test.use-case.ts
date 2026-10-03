import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  NewFinding,
} from '../../domain/analysis/claim-evidence';
import { findSimilarClaims } from '../../domain/analysis/similarity-test';

const SIMILARITY_DECIMALS = 2;
const MAX_SIMILAR_CLAIMS = 5;

/**
 * Uji Bukan Salinan (M-06). Findings are written only for the analyzed claim;
 * the paired claim gets its own when it is analyzed, so its scores and
 * `analyzedAt` stay consistent.
 */
export class RunSimilarityTestUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly threshold: number,
  ) {}

  async execute(claim: ClaimEvidence): Promise<void> {
    const candidates =
      await this.analysisRepository.findSimilarityCandidates(claim);
    const similarityFindings: NewFinding[] = findSimilarClaims(
      claim,
      candidates,
      this.threshold,
    )
      .slice(0, MAX_SIMILAR_CLAIMS)
      .map((match) => {
        const similarity = Number(
          match.similarity.toFixed(SIMILARITY_DECIMALS),
        );
        return {
          testType: 'SIMILARITY',
          strength: similarity,
          summary: `Rekam medis ${Math.round(similarity * 100)}% mirip dengan klaim ${match.relatedClaimNo} milik pasien lain.`,
          citations: match.identicalTexts.map((identicalText) => ({
            kind: 'IDENTICAL_TEXT' as const,
            ...identicalText,
          })),
          documentId: match.documentId,
          relatedDocumentId: match.relatedDocumentId,
          diagnosisId: null,
          relatedClaimId: match.relatedClaimId,
          similarity,
          tariffGap: null,
        };
      });

    await this.analysisRepository.replaceFindings(
      claim.claimId,
      'SIMILARITY',
      similarityFindings,
    );
  }
}
