import type { ClaimQueueItem } from '../../domain/claims/claim-queue-item';
import { toDateOnly } from './date-only';

export function presentClaimQueue(claimQueue: ClaimQueueItem[]) {
  return claimQueue.map((claim) => ({
    ...claim,
    admittedAt: toDateOnly(claim.admittedAt),
    dischargedAt: toDateOnly(claim.dischargedAt),
  }));
}

export type ClaimQueueResponse = ReturnType<typeof presentClaimQueue>;
