import type { ClaimDetail } from './claim-detail';
import type { ClaimQueueFilter, ClaimQueueItem } from './claim-queue-item';

export abstract class ClaimRepository {
  abstract exists(claimId: string): Promise<boolean>;
  abstract findDetailById(claimId: string): Promise<ClaimDetail | null>;
  abstract findQueue(filter: ClaimQueueFilter): Promise<ClaimQueueItem[]>;
}
