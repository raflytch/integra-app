import Link from 'next/link';
import { ClaimStatusPill } from '@/components/claim-pills';
import { formatDate } from '@/lib/format';
import type { ClaimDetail, SimilarPattern } from '@/types/claim.types';

export function SimilarPatternPanel({
  claim,
  similarPattern,
}: {
  claim: ClaimDetail;
  similarPattern: SimilarPattern;
}) {
  const diagnosisCodes = claim.diagnoses
    .map((diagnosis) => diagnosis.icd10Code)
    .join(' + ');

  return (
    <section
      aria-labelledby="similar-pattern-heading"
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-col gap-0.5">
        <h2
          id="similar-pattern-heading"
          className="text-body font-semibold tracking-display text-ink"
        >
          Pola mirip
        </h2>
        <p className="text-caption text-ink-secondary">
          {similarPattern.claims.length} klaim lain dari {claim.facility.name}{' '}
          dengan diagnosis {diagnosisCodes} dan INA-CBG {claim.inacbgCode} yang
          sama, dalam {similarPattern.dayWindow} hari.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
        {similarPattern.claims.map((similarClaim) => (
          <li
            key={similarClaim.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/claims/${similarClaim.id}`}
                className="font-mono text-caption whitespace-nowrap text-primary-hover hover:underline"
              >
                {similarClaim.claimNo}
              </Link>
              <span className="text-caption text-ink-secondary tabular-nums">
                Masuk {formatDate(similarClaim.admittedAt)}
              </span>
            </div>
            <ClaimStatusPill status={similarClaim.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
