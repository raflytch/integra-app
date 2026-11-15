import { ClaimNotFoundError } from '../../domain/claims/claim-not-found.error';
import type { ClaimRepository } from '../../domain/claims/claim.repository';
import {
  buildVedikaStatus,
  type VedikaStatus,
} from '../../domain/vedika/vedika-reply';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

export class GetVedikaStatusUseCase {
  constructor(
    private readonly claimRepository: ClaimRepository,
    private readonly vedikaRepository: VedikaRepository,
  ) {}

  async execute(claimId: string): Promise<VedikaStatus> {
    const claim = await this.claimRepository.findDetailById(claimId);
    if (!claim) throw new ClaimNotFoundError(claimId);

    const [attachments, syncedAt] = await Promise.all([
      this.vedikaRepository.listAttachments(claimId),
      this.vedikaRepository.findClaimSyncedAt(claimId),
    ]);
    return buildVedikaStatus(claim, attachments, syncedAt);
  }
}
