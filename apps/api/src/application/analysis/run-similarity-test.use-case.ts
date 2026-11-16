import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type {
  ClaimEvidence,
  NewFinding,
} from '../../domain/analysis/claim-evidence';
import {
  findSimilarityAnomalyThreshold,
  scoreSimilarClaims,
} from '../../domain/analysis/similarity-test';

const SIMILARITY_DECIMALS = 2;
const MAX_SIMILAR_CLAIMS = 5;

export interface SimilarityCoverage {
  comparedClaimCount: number;
  maxSimilarity: number;
  similarityMean: number | null;
  similarityThreshold: number | null;
}

function roundSimilarity(similarity: number): number {
  return Number(similarity.toFixed(SIMILARITY_DECIMALS));
}

/**
 * Uji Bukan Salinan (M-06). Findings are written only for the analyzed claim;
 * the paired claim gets its own when it is analyzed, so its scores and
 * `analyzedAt` stay consistent.
 */
export class RunSimilarityTestUseCase {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(claim: ClaimEvidence): Promise<SimilarityCoverage> {
    const [candidates, groups] = await Promise.all([
      this.analysisRepository.findSimilarityCandidates(claim),
      this.analysisRepository.findSimilarityGroups(),
    ]);
    const matches = scoreSimilarClaims(claim, candidates);
    const threshold = findSimilarityAnomalyThreshold(groups);
    const similarityFindings: NewFinding[] = matches
      .filter(
        (match) => threshold && match.similarity > threshold.anomalyThreshold,
      )
      .sort((first, second) => second.similarity - first.similarity)
      .slice(0, MAX_SIMILAR_CLAIMS)
      .map((match) => {
        const similarity = Number(
          match.similarity.toFixed(SIMILARITY_DECIMALS),
        );
        return {
          testType: 'SIMILARITY',
          strength: similarity,
          summary: `Rekam medis ${Math.round(similarity * 100)}% mirip dengan klaim ${match.relatedClaimNo} milik pasien lain, di atas ambang ${Math.round((threshold?.anomalyThreshold ?? 0) * 100)}%: ${match.sharedPhraseCount} dari ${match.phraseCount} frasa tiga kata sama, ${match.identicalTexts.length} kalimat identik.`,
          citations: [
            ...match.identicalTexts.map((identicalText) => ({
              kind: 'IDENTICAL_TEXT' as const,
              ...identicalText,
            })),
            ...match.differentTexts.map((differentText) => ({
              kind: 'DIFFERENT_TEXT' as const,
              ...differentText,
            })),
          ],
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
    return {
      comparedClaimCount: matches.length,
      maxSimilarity: roundSimilarity(
        Math.max(0, ...matches.map((match) => match.similarity)),
      ),
      similarityMean: threshold
        ? roundSimilarity(threshold.meanMaxSimilarity)
        : null,
      similarityThreshold: threshold
        ? roundSimilarity(threshold.anomalyThreshold)
        : null,
    };
  }
}
