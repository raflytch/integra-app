import type { ClaimImportResult, ImportedClaim } from './imported-claim';

export abstract class ClaimImportRepository {
  /** The given claim numbers that already exist. */
  abstract findExistingClaimNos(claimNos: string[]): Promise<string[]>;
  /**
   * Creates each claim in its own transaction as pending and unanalyzed.
   * Facilities and patients are matched by code and medical record number,
   * created when missing, and never overwritten.
   */
  abstract importClaims(claims: ImportedClaim[]): Promise<ClaimImportResult>;
}
