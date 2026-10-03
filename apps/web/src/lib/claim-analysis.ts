import type { ClaimQueueItem } from '@/types/claim.types';

/** The detectors judge a claim only after the AI has read every document. */
export function isClaimAnalyzed(claim: ClaimQueueItem): boolean {
  return (
    claim.documentCount > 0 &&
    claim.extractedDocumentCount === claim.documentCount
  );
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
