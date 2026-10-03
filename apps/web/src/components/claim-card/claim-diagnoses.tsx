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
      className="rounded-xl border border-linen-border bg-eggshell-canvas p-4"
    >
      <h2
        id="claim-diagnoses-heading"
        className="mb-3 text-sm font-medium text-graphite"
      >
        Diagnosis
      </h2>
      <ul className="flex flex-col gap-3">
        {diagnoses.map((diagnosis) => (
          <li key={diagnosis.id} className="flex items-start gap-3">
            <span className="w-14 shrink-0 font-mono text-xs leading-5 text-quiet-gray">
              {diagnosis.icd10Code}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-graphite">{diagnosis.name}</span>
              <div className="flex flex-wrap gap-1">
                <Pill tone={diagnosis.isPrimary ? 'neutral' : 'muted'}>
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
