import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type { DocumentToExtract } from '../../domain/analysis/claim-evidence';
import { groundExtraction } from '../../domain/analysis/clinical-extraction';
import { ExtractionUnavailableError } from '../../domain/analysis/extraction-unavailable.error';
import type { LlmClient, LlmResult } from '../ports/llm-client.port';
import { LlmConfigurationError, LlmError } from '../ports/llm.errors';
import { clinicalExtractionSchema } from './clinical-extraction.schema';
import {
  buildExtractionMessage,
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SYSTEM_PROMPT,
} from './extraction-prompt';

export type LlmTokenUsage = LlmResult<unknown>['usage'];

export interface ClaimExtractionResult {
  extractedDocumentCount: number;
  failedDocumentCount: number;
  /** Tokens billed by the successful extractions of this run. */
  tokenUsage: LlmTokenUsage;
}

/**
 * M-03: the LLM reads each unextracted document of a claim. Documents that
 * fail transiently stay unextracted and are retried on the next run.
 */
export class ExtractClaimDocumentsUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly llmClient: LlmClient,
  ) {}

  async execute(claimId: string): Promise<ClaimExtractionResult> {
    const documents =
      await this.analysisRepository.findDocumentsToExtract(claimId);
    const results = await Promise.allSettled(
      documents.map((document) => this.extractDocument(document)),
    );

    let failedDocumentCount = 0;
    const tokenUsage: LlmTokenUsage = { inputTokens: 0, outputTokens: 0 };
    for (const result of results) {
      if (result.status === 'fulfilled') {
        tokenUsage.inputTokens += result.value.inputTokens;
        tokenUsage.outputTokens += result.value.outputTokens;
        continue;
      }
      if (result.reason instanceof LlmConfigurationError) {
        throw new ExtractionUnavailableError();
      }
      if (!(result.reason instanceof LlmError)) throw result.reason;
      failedDocumentCount += 1;
    }
    return {
      extractedDocumentCount: documents.length - failedDocumentCount,
      failedDocumentCount,
      tokenUsage,
    };
  }

  private async extractDocument(
    document: DocumentToExtract,
  ): Promise<LlmTokenUsage> {
    const { output, model, usage } = await this.llmClient.generateStructured({
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildExtractionMessage(document) }],
      schema: clinicalExtractionSchema,
      temperature: 0,
    });
    await this.analysisRepository.saveExtraction(
      document.id,
      groundExtraction(output, document.content),
      {
        model,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    );
    return usage;
  }
}
