import Link from 'next/link';
import type { ClaimFinding } from '@/types/claim.types';

type RelatedClaim = NonNullable<ClaimFinding['relatedClaim']>;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function relatedClaimsOf(findings: ClaimFinding[]): RelatedClaim[] {
  const relatedClaims = new Map<string, RelatedClaim>();
  for (const finding of findings) {
    if (finding.relatedClaim) {
      relatedClaims.set(finding.relatedClaim.id, finding.relatedClaim);
    }
  }
  return [...relatedClaims.values()];
}

export function ClaimLink({ claim }: { claim: RelatedClaim }) {
  return (
    <Link
      href={`/claims/${claim.id}`}
      className="font-mono break-all text-primary-hover hover:underline"
    >
      {claim.claimNo}
    </Link>
  );
}

export function LinkedClaimText({
  text,
  relatedClaims,
}: {
  text: string;
  relatedClaims: RelatedClaim[];
}) {
  if (relatedClaims.length === 0) return text;
  const claimByNo = new Map(
    relatedClaims.map((relatedClaim) => [relatedClaim.claimNo, relatedClaim]),
  );
  const pattern = new RegExp(
    `(${relatedClaims.map((relatedClaim) => escapeRegExp(relatedClaim.claimNo)).join('|')})`,
  );
  return text.split(pattern).map((part, partIndex) => {
    const relatedClaim = claimByNo.get(part);
    return relatedClaim ? (
      <ClaimLink key={partIndex} claim={relatedClaim} />
    ) : (
      part
    );
  });
}
