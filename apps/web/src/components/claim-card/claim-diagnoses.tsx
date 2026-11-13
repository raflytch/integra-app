import { MissingEvidencePill, Pill } from '@/components/claim-pills';
import type {
  ClaimDiagnosis,
  ClaimFinding,
  ClaimProcedure,
} from '@/types/claim.types';

export function ClaimDiagnoses({
  diagnoses,
  procedures,
  findings,
}: {
  diagnoses: ClaimDiagnosis[];
  procedures: ClaimProcedure[];
  findings: ClaimFinding[];
}) {
  const flaggedDiagnosisIds = new Set(
    findings.map((finding) => finding.diagnosisId),
  );

  return (
    <section
      aria-labelledby="claim-diagnoses-heading"
      className="rounded-xl border border-hairline bg-surface shadow-xs p-4"
    >
      <h2
        id="claim-diagnoses-heading"
        className="mb-3 text-body font-semibold tracking-display text-ink"
      >
        Diagnosis
      </h2>
      <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
        {diagnoses.map((diagnosis) => (
          <li key={diagnosis.id} className="flex items-start gap-3 px-3 py-2.5">
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
      <h3 className="mt-4 mb-2 text-caption text-ink-secondary">
        Tindakan (ICD-9-CM)
      </h3>
      {procedures.length === 0 ? (
        <p className="text-small text-ink-secondary">
          Tidak ada kode tindakan.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
          {procedures.map((procedure) => (
            <li
              key={procedure.id}
              className="flex items-start gap-3 px-3 py-2.5"
            >
              <span className="w-14 shrink-0 font-mono text-caption leading-5 text-ink-secondary">
                {procedure.icd9cmCode}
              </span>
              <span className="text-small text-ink">{procedure.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
