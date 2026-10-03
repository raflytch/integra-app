import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import { isFullyExtracted } from '../../domain/analysis/claim-evidence';
import { ExtractionUnavailableError } from '../../domain/analysis/extraction-unavailable.error';
import { ClaimNotFoundError } from '../../domain/claims/claim-not-found.error';
import {
  collectSecondaryDiagnosisCodes,
  type EvaluateClaimUseCase,
} from './evaluate-claim.use-case';
import type { ExtractClaimDocumentsUseCase } from './extract-claim-documents.use-case';

export interface ClaimAnalysisResult {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  /** False while some documents are still unread by the AI. */
  isAnalyzed: boolean;
  findingCount: number;
  potentialGap: number;
}

/** Reads the claim's remaining documents with the AI, then runs the detectors. */
export class AnalyzeClaimUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly extractClaimDocuments: ExtractClaimDocumentsUseCase,
    private readonly evaluateClaim: EvaluateClaimUseCase,
  ) {}

  async execute(claimId: string): Promise<ClaimAnalysisResult> {
    if (!(await this.analysisRepository.findClaimEvidence(claimId))) {
      throw new ClaimNotFoundError(claimId);
    }
    const { extractedDocumentCount, failedDocumentCount } =
      await this.extractClaimDocuments.execute(claimId);
    if (extractedDocumentCount === 0 && failedDocumentCount > 0) {
      throw new ExtractionUnavailableError();
    }

    const claim = await this.analysisRepository.findClaimEvidence(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId);
    if (!isFullyExtracted(claim)) {
      return {
        extractedDocumentCount,
        failedDocumentCount,
        isAnalyzed: false,
        findingCount: 0,
        potentialGap: 0,
      };
    }

    const evidenceRules = await this.analysisRepository.findEvidenceRules(
      collectSecondaryDiagnosisCodes([claim]),
    );
    const evaluation = await this.evaluateClaim.execute(claim, evidenceRules);
    return {
      extractedDocumentCount,
      failedDocumentCount,
      isAnalyzed: true,
      ...evaluation,
    };
  }
}
