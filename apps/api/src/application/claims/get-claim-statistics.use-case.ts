import type { ClaimStatistics } from '../../domain/claims/claim-queue-item';
import type { ClaimRepository } from '../../domain/claims/claim.repository';

export class GetClaimStatisticsUseCase {
  constructor(private readonly claimRepository: ClaimRepository) {}

  execute(): Promise<ClaimStatistics> {
    return this.claimRepository.getStatistics();
  }
}
