import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type {
  CanonicalClaim,
  ClaimDeletionResult,
  ClaimImportPreview,
  ClaimImportResult,
} from '@/types/import.types';

/**
 * Files have no size limit and AI normalization makes several paid LLM
 * calls, so a preview or an import can take minutes.
 */
const IMPORT_TIMEOUT_MS = 10 * 60 * 1000;

export async function previewClaimImport(input: {
  fileName: string;
  content: string;
  allowAi: boolean;
}): Promise<ClaimImportPreview> {
  const response = await apiClient.post<ClaimImportPreview>(
    '/imports/claims/preview',
    input,
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return response.data;
}

export async function importClaims(
  claims: CanonicalClaim[],
): Promise<ClaimImportResult> {
  const response = await apiClient.post<ClaimImportResult>(
    '/imports/claims',
    { claims },
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return response.data;
}

export async function deleteAllClaims(): Promise<ClaimDeletionResult> {
  const response = await apiClient.delete<ClaimDeletionResult>(
    '/imports/claims',
    { timeout: IMPORT_TIMEOUT_MS },
  );
  return response.data;
}

/** The number of AI calls to confirm when the file is not in the INTEGRA format, else null. */
export function readImportNeedsAi(error: unknown): number | null {
  if (!isAxiosError<{ code?: string; estimatedAiCalls?: number }>(error)) {
    return null;
  }
  const body = error.response?.data;
  return body?.code === 'IMPORT_NEEDS_AI' ? (body.estimatedAiCalls ?? 1) : null;
}

const IMPORT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  IMPORT_AI_UNAVAILABLE:
    'AI tidak dapat menyesuaikan file saat ini. Coba lagi nanti atau gunakan format INTEGRA.',
  INVALID_IMPORT_REQUEST: 'Isi file tidak dapat dibaca.',
};

/** A plain-language message for a failed preview or import. */
export function describeImportError(error: unknown): string {
  if (isAxiosError<{ code?: string }>(error)) {
    const code = error.response?.data?.code;
    if (code && IMPORT_ERROR_MESSAGES[code]) return IMPORT_ERROR_MESSAGES[code];
    // Only the server's memory safeguard (hundreds of MB) answers 413.
    if (error.response?.status === 413) {
      return 'File terlalu besar untuk diproses sekaligus. Pecah file lalu impor bertahap.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Server terlalu lama merespons. Coba lagi dengan file yang lebih kecil.';
    }
  }
  return 'Periksa koneksi ke server, lalu coba lagi.';
}
