import Link from 'next/link';
import { ClaimStatusPill } from '@/components/claim-pills';
import { formatDate, formatPercent } from '@/lib/format';
import type { ClaimDetail, SimilarPattern } from '@/types/claim.types';

export function SimilarPatternPanel({
  claim,
  similarPattern,
}: {
  claim: ClaimDetail;
  similarPattern: SimilarPattern;
}) {
  const primaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  const diagnosisCodes = claim.diagnoses
    .map((diagnosis) => diagnosis.icd10Code)
    .join(' + ');
  const procedureCodes =
    claim.procedures.length > 0
      ? `tindakan ${claim.procedures.map((procedure) => procedure.icd9cmCode).join(' + ')}`
      : 'tanpa kode tindakan';

  return (
    <section
      aria-labelledby="similar-pattern-heading"
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="similar-pattern-heading"
          className="text-body font-semibold tracking-display text-ink"
        >
          Pola mirip
        </h2>
        <p className="text-small text-ink">
          {claim.facility.name} mencantumkan diagnosis sekunder pada{' '}
          <span className="font-semibold tabular-nums">
            {formatPercent(similarPattern.facilityRate)}
          </span>{' '}
          dari {similarPattern.facilityCaseCount} klaim{' '}
          {primaryDiagnosis?.name ?? similarPattern.primaryIcd10Code}.
        </p>
        <p className="text-caption text-ink-secondary">
          Di atas persentil ke-80 dari {similarPattern.comparedFacilityCount}{' '}
          faskes yang punya minimal {similarPattern.minFacilityCaseCount} klaim{' '}
          {primaryDiagnosis?.name ?? similarPattern.primaryIcd10Code} (ambang{' '}
          {formatPercent(similarPattern.percentileThreshold)}, median faskes
          lain {formatPercent(similarPattern.peerMedianRate)}). Penanda ini
          untuk penelusuran, bukan bukti kecurangan.
        </p>
      </div>
      {similarPattern.claims.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-caption text-ink-secondary">
            Nomor SEP lain dari faskes ini dengan diagnosis {diagnosisCodes} dan{' '}
            {procedureCodes} yang sama
          </h3>
          <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
            {similarPattern.claims.map((similarClaim) => (
              <li
                key={similarClaim.id}
                className="flex flex-col items-start gap-1 px-3 py-2.5"
              >
                <Link
                  href={`/claims/${similarClaim.id}`}
                  className="font-mono text-caption break-all text-primary-hover hover:underline"
                >
                  {similarClaim.claimNo}
                </Link>
                <span className="text-caption text-ink-secondary tabular-nums">
                  Masuk {formatDate(similarClaim.admittedAt)}
                </span>
                <ClaimStatusPill status={similarClaim.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
