import type {
  ClaimDeletionResult,
  ClaimImportResult,
  ImportedClaim,
} from './imported-claim';

export abstract class ClaimImportRepository {
  /** The given claim numbers that already exist. */
  abstract findExistingClaimNos(claimNos: string[]): Promise<string[]>;
  /**
   * Creates each claim in its own transaction as pending and unanalyzed.
   * Facilities and patients are matched by code and medical record number,
   * created when missing, and never overwritten.
   */
  abstract importClaims(claims: ImportedClaim[]): Promise<ClaimImportResult>;
  /**
   * Deletes every claim with its documents, diagnoses, findings, and
   * decisions, then the facilities and patients left without claims.
   * Runs in one transaction so a failure leaves the data untouched.
   */
  abstract deleteAllClaims(): Promise<ClaimDeletionResult>;
}
