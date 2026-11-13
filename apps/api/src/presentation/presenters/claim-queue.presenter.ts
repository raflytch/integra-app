import type { ClaimQueuePage } from '../../domain/claims/claim-queue-item';
import { lengthOfStayDays } from '../../domain/claims/length-of-stay';
import { toDateOnly } from './date-only';

export function presentClaimQueuePage(claimQueuePage: ClaimQueuePage) {
  return {
    ...claimQueuePage,
    items: claimQueuePage.items.map((claim) => ({
      ...claim,
      admittedAt: toDateOnly(claim.admittedAt),
      dischargedAt: toDateOnly(claim.dischargedAt),
      lengthOfStayDays: lengthOfStayDays(
        claim.careType,
        claim.admittedAt,
        claim.dischargedAt,
      ),
      analyzedAt: claim.analyzedAt?.toISOString() ?? null,
    })),
  };
}

export type ClaimQueuePageResponse = ReturnType<typeof presentClaimQueuePage>;
