/** Analyzed once the AI has read every document and the detectors have run. */
export function isClaimAnalyzed(claim: { analyzedAt: string | null }): boolean {
  return claim.analyzedAt !== null;
}
