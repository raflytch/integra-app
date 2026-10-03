import type { ClaimQueuePage } from '../../domain/claims/claim-queue-item';
import { toDateOnly } from './date-only';

export function presentClaimQueuePage(claimQueuePage: ClaimQueuePage) {
  return {
    ...claimQueuePage,
    items: claimQueuePage.items.map((claim) => ({
      ...claim,
      admittedAt: toDateOnly(claim.admittedAt),
      dischargedAt: toDateOnly(claim.dischargedAt),
      analyzedAt: claim.analyzedAt?.toISOString() ?? null,
    })),
  };
}

export type ClaimQueuePageResponse = ReturnType<typeof presentClaimQueuePage>;
