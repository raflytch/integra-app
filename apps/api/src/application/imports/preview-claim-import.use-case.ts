import type { ClaimImportRepository } from '../../domain/imports/claim-import.repository';
import {
  ImportAiUnavailableError,
  ImportFileTooLargeError,
  ImportNeedsAiError,
  ImportTooManyClaimsError,
} from '../../domain/imports/claim-import.errors';
import {
  MAX_IMPORT_CLAIMS,
  MAX_IMPORT_FILE_BYTES,
} from '../../domain/imports/imported-claim';
import type { LlmClient } from '../ports/llm-client.port';
import { LlmConfigurationError, LlmError } from '../ports/llm.errors';
import {
  type ImportChunk,
  parseJsonContent,
  splitImportFile,
} from './claim-import-chunks';
import {
  buildClaimImportMessage,
  CLAIM_IMPORT_SYSTEM_PROMPT,
} from './claim-import-prompt';
import {
  type CanonicalClaim,
  canonicalClaimSchema,
  claimImportFileSchema,
  describeClaimIssues,
  normalizedChunkSchema,
  type PreviewClaimImportInput,
} from './claim-import.schema';

export type ClaimImportSource = 'CANONICAL' | 'AI_NORMALIZED';
export type ClaimPreviewStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export interface ClaimPreviewRow {
  index: number;
  claimNo: string | null;
  status: ClaimPreviewStatus;
  issues: string[];
  claim: CanonicalClaim | null;
}

export interface ClaimImportPreview {
  source: ClaimImportSource;
  claims: ClaimPreviewRow[];
  summary: { valid: number; invalid: number; duplicate: number };
}

/** A parsed claim before the duplicate check; `claim` is null when it failed validation. */
interface CheckedClaim {
  claimNo: string | null;
  issues: string[];
  claim: CanonicalClaim | null;
}

const NOT_GROUNDED_ISSUE = 'Isi tidak ditemukan di file asli';

function normalizeForGrounding(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function readClaimNo(rawClaim: unknown): string | null {
  if (typeof rawClaim !== 'object' || rawClaim === null) return null;
  const claimNo = (rawClaim as { claimNo?: unknown }).claimNo;
  return typeof claimNo === 'string' && claimNo.trim() ? claimNo.trim() : null;
}

function checkClaim(rawClaim: unknown): CheckedClaim {
  const result = canonicalClaimSchema.safeParse(rawClaim);
  return result.success
    ? { claimNo: result.data.claimNo, issues: [], claim: result.data }
    : {
        claimNo: readClaimNo(rawClaim),
        issues: describeClaimIssues(result.error),
        claim: null,
      };
}

/** The AI may only rearrange: every document and the claim number must appear in the source chunk. */
function isGrounded(claim: CanonicalClaim, chunk: ImportChunk): boolean {
  const source = normalizeForGrounding(chunk.sourceText);
  return [claim.claimNo, ...claim.documents.map((document) => document.content)]
    .map(normalizeForGrounding)
    .every((text) => source.includes(text));
}

/**
 * Reads an uploaded claim file into a preview. Files in the INTEGRA format
 * never reach the AI; other files are normalized by the AI only after the
 * user confirmed the paid step (`allowAi`). Nothing is saved here.
 */
export class PreviewClaimImportUseCase {
  constructor(
    private readonly claimImportRepository: ClaimImportRepository,
    private readonly llmClient: LlmClient,
  ) {}

  async execute({
    fileName,
    content,
    allowAi,
  }: PreviewClaimImportInput): Promise<ClaimImportPreview> {
    if (Buffer.byteLength(content, 'utf8') > MAX_IMPORT_FILE_BYTES) {
      throw new ImportFileTooLargeError();
    }

    const parsedJson = parseJsonContent(content);
    const canonicalFile = claimImportFileSchema.safeParse(parsedJson);
    if (canonicalFile.success) {
      if (canonicalFile.data.claims.length > MAX_IMPORT_CLAIMS) {
        throw new ImportTooManyClaimsError();
      }
      return this.buildPreview(
        'CANONICAL',
        canonicalFile.data.claims.map(checkClaim),
      );
    }

    const chunks = splitImportFile(fileName, content, parsedJson);
    if (!allowAi) throw new ImportNeedsAiError(chunks.length);
    const checkedClaims = await this.normalizeWithAi(fileName, chunks);
    if (checkedClaims.length > MAX_IMPORT_CLAIMS) {
      throw new ImportTooManyClaimsError();
    }
    return this.buildPreview('AI_NORMALIZED', checkedClaims);
  }

  private async normalizeWithAi(
    fileName: string,
    chunks: ImportChunk[],
  ): Promise<CheckedClaim[]> {
    // LlmClient's semaphore limits how many chunks run at once.
    const results = await Promise.allSettled(
      chunks.map((chunk, chunkIndex) =>
        this.llmClient.generateStructured({
          system: CLAIM_IMPORT_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: buildClaimImportMessage(
                fileName,
                chunk.text,
                chunkIndex + 1,
                chunks.length,
              ),
            },
          ],
          schema: normalizedChunkSchema,
          temperature: 0,
        }),
      ),
    );

    return results.flatMap((result, chunkIndex): CheckedClaim[] => {
      if (result.status === 'rejected') {
        if (result.reason instanceof LlmConfigurationError) {
          throw new ImportAiUnavailableError();
        }
        if (!(result.reason instanceof LlmError)) throw result.reason;
        return [
          {
            claimNo: null,
            issues: [
              `Bagian ${chunkIndex + 1} dari ${chunks.length} gagal dibaca AI; coba lagi atau pecah file menjadi lebih kecil`,
            ],
            claim: null,
          },
        ];
      }
      const { claims, skipped } = result.value.output;
      return [
        ...claims.map((rawClaim) => {
          const checkedClaim = checkClaim(rawClaim);
          if (
            checkedClaim.claim &&
            !isGrounded(checkedClaim.claim, chunks[chunkIndex])
          ) {
            return { ...checkedClaim, issues: [NOT_GROUNDED_ISSUE] };
          }
          return checkedClaim;
        }),
        ...skipped.map(({ reference, reason }) => ({
          claimNo: reference.trim() || null,
          issues: [reason],
          claim: null,
        })),
      ];
    });
  }

  private async buildPreview(
    source: ClaimImportSource,
    checkedClaims: CheckedClaim[],
  ): Promise<ClaimImportPreview> {
    const existingClaimNos = new Set(
      await this.claimImportRepository.findExistingClaimNos(
        checkedClaims.flatMap(({ claim }) => (claim ? [claim.claimNo] : [])),
      ),
    );
    const seenClaimNos = new Set<string>();

    const rows = checkedClaims.map(
      ({ claimNo, issues, claim }, index): ClaimPreviewRow => {
        // Only a valid, grounded claim can be imported or count as a duplicate.
        const isImportable = claim !== null && issues.length === 0;
        if (!isImportable) {
          return { index, claimNo, status: 'INVALID', issues, claim: null };
        }
        if (existingClaimNos.has(claim.claimNo)) {
          return {
            index,
            claimNo,
            status: 'DUPLICATE',
            issues: ['Nomor klaim sudah ada di INTEGRA'],
            claim,
          };
        }
        if (seenClaimNos.has(claim.claimNo)) {
          return {
            index,
            claimNo,
            status: 'DUPLICATE',
            issues: ['Nomor klaim ganda di file'],
            claim,
          };
        }
        seenClaimNos.add(claim.claimNo);
        return { index, claimNo, status: 'VALID', issues: [], claim };
      },
    );

    return {
      source,
      claims: rows,
      summary: {
        valid: rows.filter((row) => row.status === 'VALID').length,
        invalid: rows.filter((row) => row.status === 'INVALID').length,
        duplicate: rows.filter((row) => row.status === 'DUPLICATE').length,
      },
    };
  }
}
