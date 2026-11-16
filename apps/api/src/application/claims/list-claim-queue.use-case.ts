import type {
  ClaimQueuePage,
  ClaimQueueQuery,
} from '../../domain/claims/claim-queue-item';
import type { ClaimRepository } from '../../domain/claims/claim.repository';
import { MAX_BULK_ANALYSIS_CLAIMS } from '../analysis/bulk-analysis';

export class ListClaimQueueUseCase {
  constructor(private readonly claimRepository: ClaimRepository) {}

  execute(query: ClaimQueueQuery): Promise<ClaimQueuePage> {
    return this.claimRepository.findQueuePage(query);
  }

  findClaimIds(query: ClaimQueueQuery): Promise<string[]> {
    return this.claimRepository.findQueueClaimIds(
      query,
      MAX_BULK_ANALYSIS_CLAIMS,
    );
  }
}
