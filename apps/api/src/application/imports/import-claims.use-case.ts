import type { ClaimImportRepository } from '../../domain/imports/claim-import.repository';
import type {
  ClaimImportResult,
  ImportedClaim,
} from '../../domain/imports/imported-claim';

/**
 * Saves previewed claims as pending and unanalyzed. Duplicates are checked
 * again because the database may have changed since the preview.
 */
export class ImportClaimsUseCase {
  constructor(private readonly claimImportRepository: ClaimImportRepository) {}

  async execute(claims: ImportedClaim[]): Promise<ClaimImportResult> {
    const existingClaimNos = new Set(
      await this.claimImportRepository.findExistingClaimNos(
        claims.map((claim) => claim.claimNo),
      ),
    );
    const seenClaimNos = new Set<string>();
    const skipped: ClaimImportResult['skipped'] = [];
    const newClaims = claims.filter(({ claimNo }) => {
      if (existingClaimNos.has(claimNo)) {
        skipped.push({ claimNo, reason: 'Nomor klaim sudah ada di INTEGRA' });
        return false;
      }
      if (seenClaimNos.has(claimNo)) {
        skipped.push({ claimNo, reason: 'Nomor klaim ganda di file' });
        return false;
      }
      seenClaimNos.add(claimNo);
      return true;
    });

    const result = await this.claimImportRepository.importClaims(newClaims);
    return {
      importedCount: result.importedCount,
      skipped: [...skipped, ...result.skipped],
    };
  }
}
