import type {
  ClaimQueuePage,
  ClaimQueueQuery,
} from '../../domain/claims/claim-queue-item';
import type { ClaimRepository } from '../../domain/claims/claim.repository';

export class ListClaimQueueUseCase {
  constructor(private readonly claimRepository: ClaimRepository) {}

  execute(query: ClaimQueueQuery): Promise<ClaimQueuePage> {
    return this.claimRepository.findQueuePage(query);
  }
}
