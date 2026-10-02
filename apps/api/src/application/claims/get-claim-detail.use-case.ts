import type { ClaimDetail } from '../../domain/claims/claim-detail';
import { ClaimNotFoundError } from '../../domain/claims/claim-not-found.error';
import type { ClaimRepository } from '../../domain/claims/claim.repository';

export class GetClaimDetailUseCase {
  constructor(private readonly claimRepository: ClaimRepository) {}

  async execute(claimId: string): Promise<ClaimDetail> {
    const claimDetail = await this.claimRepository.findDetailById(claimId);
    if (!claimDetail) throw new ClaimNotFoundError(claimId);
    return claimDetail;
  }
}
