import type { ClaimStatus } from './claim-detail';

export const SIMILAR_PATTERN_DAY_WINDOW = 60;
export const MIN_SIMILAR_PATTERN_CLUSTER_SIZE = 3;

export interface SimilarPatternClaim {
  id: string;
  claimNo: string;
  admittedAt: Date;
  status: ClaimStatus;
}

export interface SimilarPattern {
  dayWindow: number;
  claims: SimilarPatternClaim[];
}

export function toSimilarPattern(
  peers: SimilarPatternClaim[],
): SimilarPattern | null {
  if (peers.length + 1 < MIN_SIMILAR_PATTERN_CLUSTER_SIZE) return null;
  return { dayWindow: SIMILAR_PATTERN_DAY_WINDOW, claims: peers };
}
