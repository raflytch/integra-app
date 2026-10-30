import type { ClaimImportRepository } from '../../domain/imports/claim-import.repository';
import type { ClaimDeletionResult } from '../../domain/imports/imported-claim';

/** Clears every claim so a bad import can be redone from a clean slate. */
export class DeleteAllClaimsUseCase {
  constructor(private readonly claimImportRepository: ClaimImportRepository) {}

  execute(): Promise<ClaimDeletionResult> {
    return this.claimImportRepository.deleteAllClaims();
  }
}
