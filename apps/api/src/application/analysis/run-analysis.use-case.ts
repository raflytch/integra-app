import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import { isFullyExtracted } from '../../domain/analysis/claim-evidence';
import { ExtractionUnavailableError } from '../../domain/analysis/extraction-unavailable.error';
import {
  collectSecondaryDiagnosisCodes,
  type EvaluateClaimUseCase,
} from './evaluate-claim.use-case';
import type {
  ClaimExtractionResult,
  ExtractClaimDocumentsUseCase,
} from './extract-claim-documents.use-case';

export interface AnalysisRunSummary {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  analyzedClaimCount: number;
  flaggedClaimCount: number;
  findingCount: number;
  /** Claims whose documents the AI has not read yet; the next run continues with them. */
  remainingClaimCount: number;
}

/**
 * Reads the next batch of unextracted claims with the AI, then reruns the
 * detectors on every fully extracted claim. Batching keeps one request short.
 */
export class RunAnalysisUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly extractClaimDocuments: ExtractClaimDocumentsUseCase,
    private readonly evaluateClaim: EvaluateClaimUseCase,
    private readonly extractionBatchSize: number,
  ) {}

  async execute(): Promise<AnalysisRunSummary> {
    const claimIdsToExtract =
      await this.analysisRepository.findClaimIdsAwaitingExtraction(
        this.extractionBatchSize,
      );
    const extractionResults = await Promise.allSettled(
      claimIdsToExtract.map((claimId) =>
        this.extractClaimDocuments.execute(claimId),
      ),
    );
    const rejectedExtraction = extractionResults.find(
      (result) => result.status === 'rejected',
    );
    if (rejectedExtraction) throw rejectedExtraction.reason;
    const extractions = extractionResults.map(
      (result) =>
        (result as PromiseFulfilledResult<ClaimExtractionResult>).value,
    );
    const extractedDocumentCount = sum(
      extractions.map((extraction) => extraction.extractedDocumentCount),
    );
    const failedDocumentCount = sum(
      extractions.map((extraction) => extraction.failedDocumentCount),
    );
    if (extractedDocumentCount === 0 && failedDocumentCount > 0) {
      throw new ExtractionUnavailableError();
    }

    const extractedClaims = (
      await this.analysisRepository.findClaimsForAnalysis()
    ).filter(isFullyExtracted);
    const evidenceRules = await this.analysisRepository.findEvidenceRules(
      collectSecondaryDiagnosisCodes(extractedClaims),
    );

    let flaggedClaimCount = 0;
    let findingCount = 0;
    for (const claim of extractedClaims) {
      const evaluation = await this.evaluateClaim.execute(claim, evidenceRules);
      findingCount += evaluation.findingCount;
      if (evaluation.findingCount > 0) flaggedClaimCount += 1;
    }

    return {
      extractedDocumentCount,
      failedDocumentCount,
      analyzedClaimCount: extractedClaims.length,
      flaggedClaimCount,
      findingCount,
      remainingClaimCount:
        await this.analysisRepository.countClaimsAwaitingExtraction(),
    };
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
