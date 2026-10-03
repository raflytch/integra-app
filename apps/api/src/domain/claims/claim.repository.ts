import type { ClaimDetail } from './claim-detail';
import type {
  ClaimQueuePage,
  ClaimQueueQuery,
  ClaimStatistics,
} from './claim-queue-item';

export abstract class ClaimRepository {
  abstract exists(claimId: string): Promise<boolean>;
  abstract findDetailById(claimId: string): Promise<ClaimDetail | null>;
  abstract findQueuePage(query: ClaimQueueQuery): Promise<ClaimQueuePage>;
  abstract getStatistics(): Promise<ClaimStatistics>;
}
