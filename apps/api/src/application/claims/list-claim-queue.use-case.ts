import type {
  ClaimQueueFilter,
  ClaimQueueItem,
} from '../../domain/claims/claim-queue-item';
import type { ClaimRepository } from '../../domain/claims/claim.repository';

export class ListClaimQueueUseCase {
  constructor(private readonly claimRepository: ClaimRepository) {}

  execute(filter: ClaimQueueFilter): Promise<ClaimQueueItem[]> {
    return this.claimRepository.findQueue(filter);
  }
}
