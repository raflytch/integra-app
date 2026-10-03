import type { ClaimQueueItem } from '@/types/claim.types';

/** Analyzed once the AI has read every document and the detectors have run. */
export function isClaimAnalyzed(claim: { analyzedAt: string | null }): boolean {
  return claim.analyzedAt !== null;
}

export function isClaimFlagged(claim: ClaimQueueItem): boolean {
  return Object.values(claim.findingCounts).some((count) => count > 0);
}

export function countClaimFindings(claim: ClaimQueueItem): number {
  return Object.values(claim.findingCounts).reduce(
    (total, count) => total + count,
    0,
  );
}
