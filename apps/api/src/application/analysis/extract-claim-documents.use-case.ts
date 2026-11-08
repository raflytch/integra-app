import type { AnalysisRepository } from '../../domain/analysis/analysis.repository';
import type { DocumentToExtract } from '../../domain/analysis/claim-evidence';
import { groundExtraction } from '../../domain/analysis/clinical-extraction';
import { ExtractionUnavailableError } from '../../domain/analysis/extraction-unavailable.error';
import type { LlmClient, LlmResult } from '../ports/llm-client.port';
import { LlmConfigurationError, LlmError } from '../ports/llm.errors';
import { claimDocumentsExtractionSchema } from './clinical-extraction.schema';
import {
  buildExtractionMessage,
  documentLabel,
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
 * Documents read in one LLM call. One call per claim avoids resending the
 * system prompt per document and queueing behind `LLM_CONCURRENCY`.
 */
const DOCUMENTS_PER_CALL = 8;

/**
 * M-03: the LLM reads the unextracted documents of a claim, several per call.
 * Documents that fail transiently, or that the model leaves out, stay
 * unextracted and are retried on the next run.
 */
export class ExtractClaimDocumentsUseCase {
  constructor(
    private readonly analysisRepository: AnalysisRepository,
    private readonly llmClient: LlmClient,
  ) {}

  async execute(claimId: string): Promise<ClaimExtractionResult> {
    const documents =
      await this.analysisRepository.findDocumentsToExtract(claimId);
    const batches: DocumentToExtract[][] = [];
    for (let index = 0; index < documents.length; index += DOCUMENTS_PER_CALL) {
      batches.push(documents.slice(index, index + DOCUMENTS_PER_CALL));
    }
    const results = await Promise.allSettled(
      batches.map((batch) => this.extractBatch(batch)),
    );

    let extractedDocumentCount = 0;
    const tokenUsage: LlmTokenUsage = { inputTokens: 0, outputTokens: 0 };
    for (const result of results) {
      if (result.status === 'fulfilled') {
        extractedDocumentCount += result.value.extractedDocumentCount;
        tokenUsage.inputTokens += result.value.usage.inputTokens;
        tokenUsage.outputTokens += result.value.usage.outputTokens;
        continue;
      }
      if (result.reason instanceof LlmConfigurationError) {
        throw new ExtractionUnavailableError();
      }
      if (!(result.reason instanceof LlmError)) throw result.reason;
    }
    return {
      extractedDocumentCount,
      failedDocumentCount: documents.length - extractedDocumentCount,
      tokenUsage,
    };
  }

  private async extractBatch(
    batch: DocumentToExtract[],
  ): Promise<{ extractedDocumentCount: number; usage: LlmTokenUsage }> {
    const { output, model, usage } = await this.llmClient.generateStructured({
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildExtractionMessage(batch) }],
      schema: claimDocumentsExtractionSchema,
      temperature: 0,
    });
    const extractions = new Map(
      output.documents.map(({ documentId, ...extraction }) => [
        documentId.trim(),
        extraction,
      ]),
    );
    const extracted = batch.flatMap((document, index) => {
      const extraction = extractions.get(documentLabel(index));
      return extraction ? [{ document, extraction }] : [];
    });

    // The call is billed once; each saved document records an even share.
    const inputShares = splitEvenly(usage.inputTokens, extracted.length);
    const outputShares = splitEvenly(usage.outputTokens, extracted.length);
    await Promise.all(
      extracted.map(({ document, extraction }, index) =>
        this.analysisRepository.saveExtraction(
          document.id,
          groundExtraction(extraction, document.content),
          {
            model,
            promptVersion: EXTRACTION_PROMPT_VERSION,
            inputTokens: inputShares[index],
            outputTokens: outputShares[index],
          },
        ),
      ),
    );
    return { extractedDocumentCount: extracted.length, usage };
  }
}

/** Integer shares that add up to `total`; the first shares take the remainder. */
function splitEvenly(total: number, parts: number): number[] {
  const share = Math.floor(total / parts);
  return Array.from(
    { length: parts },
    (_, index) => share + (index < total - share * parts ? 1 : 0),
  );
}
