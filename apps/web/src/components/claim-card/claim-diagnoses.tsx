import { MissingEvidencePill, Pill } from '@/components/claim-pills';
import type { ClaimDiagnosis, ClaimFinding } from '@/types/claim.types';

export function ClaimDiagnoses({
  diagnoses,
  findings,
}: {
  diagnoses: ClaimDiagnosis[];
  findings: ClaimFinding[];
}) {
  const flaggedDiagnosisIds = new Set(
    findings.map((finding) => finding.diagnosisId),
  );

  return (
    <section
      aria-labelledby="claim-diagnoses-heading"
      data-tour="claim-diagnoses"
      className="rounded-xl border border-hairline bg-surface shadow-xs p-4"
    >
      <h2
        id="claim-diagnoses-heading"
        className="mb-3 text-body font-semibold tracking-display text-ink"
      >
        Diagnosis
      </h2>
      <ul className="flex flex-col gap-3">
        {diagnoses.map((diagnosis) => (
          <li key={diagnosis.id} className="flex items-start gap-3">
            <span className="w-14 shrink-0 font-mono text-caption leading-5 text-ink-secondary">
              {diagnosis.icd10Code}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-small text-ink">{diagnosis.name}</span>
              <div className="flex flex-wrap gap-1">
                <Pill tone={diagnosis.isPrimary ? 'outline' : 'neutral'}>
                  {diagnosis.isPrimary ? 'Utama' : 'Sekunder'}
                </Pill>
                {flaggedDiagnosisIds.has(diagnosis.id) && (
                  <MissingEvidencePill />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
