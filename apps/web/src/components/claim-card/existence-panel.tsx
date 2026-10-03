import { CircleX, MessageSquareText } from 'lucide-react';
import { MissingEvidencePill } from '@/components/claim-pills';
import { Button } from '@/components/ui/button';
import { EVIDENCE_TYPE_LABELS } from '@/lib/claim-labels';
import { formatPercent, formatRupiah } from '@/lib/format';
import type {
  ClaimDiagnosis,
  ClaimDocument,
  ClaimFinding,
  FindingCitation,
} from '@/types/claim.types';
import { FindingCitationItem } from './finding-citation';
import { TestPanelShell } from './test-panel';

type MissingEvidence = Extract<FindingCitation, { kind: 'MISSING_EVIDENCE' }>;

function isMissingEvidence(
  citation: FindingCitation,
): citation is MissingEvidence {
  return citation.kind === 'MISSING_EVIDENCE';
}

function buildClarificationReason(
  diagnosis: ClaimDiagnosis | undefined,
  missingEvidence: MissingEvidence[],
): string {
  const diagnosisLabel = diagnosis
    ? `${diagnosis.name} (${diagnosis.icd10Code})`
    : 'diagnosis sekunder ini';
  const expectedEvidence = missingEvidence
    .map((evidence) => evidence.expected)
    .join(', ');
  return `Mohon lengkapi bukti untuk diagnosis sekunder ${diagnosisLabel}: ${expectedEvidence}. Bukti tersebut belum ditemukan di rekam medis klaim ini.`;
}

function UnsupportedDiagnosis({
  finding,
  diagnosis,
  tariffBeforeCorrection,
  documentsById,
  onRequestClarification,
}: {
  finding: ClaimFinding;
  diagnosis: ClaimDiagnosis | undefined;
  tariffBeforeCorrection: number;
  documentsById: Map<string, ClaimDocument>;
  onRequestClarification: (reason: string) => void;
}) {
  const missingEvidence = finding.citations.filter(isMissingEvidence);
  const diagnosisMentions = finding.citations.filter(
    (citation) => citation.kind === 'QUOTE',
  );

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-ink-secondary">
            Diagnosis sekunder
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-medium text-ink">
              {diagnosis?.name ?? 'Diagnosis tidak dikenal'}
            </span>
            {diagnosis && (
              <span className="font-mono text-caption text-ink-secondary">
                {diagnosis.icd10Code}
              </span>
            )}
            <MissingEvidencePill />
          </div>
          <span className="text-caption text-ink-secondary">
            {missingEvidence.length} bukti tidak ditemukan · kekuatan sinyal{' '}
            {formatPercent(finding.strength)}
          </span>
        </div>
        {finding.tariffGap !== null && (
          <div className="flex shrink-0 flex-col gap-0.5 sm:items-end">
            <span className="text-caption text-ink-secondary">
              Potensi selisih
            </span>
            <span className="font-display text-subhead font-semibold tracking-display text-ink tabular-nums">
              {formatRupiah(finding.tariffGap)}
            </span>
            <span className="text-caption text-ink-secondary">
              {formatRupiah(tariffBeforeCorrection)} →{' '}
              {formatRupiah(tariffBeforeCorrection - finding.tariffGap)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-caption font-medium text-ink-secondary">
          Bukti yang dicari di rekam medis
        </h3>
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {missingEvidence.map((evidence) => (
            <li
              key={`${evidence.evidenceType}-${evidence.expected}`}
              className="flex items-start gap-3 px-3 py-2.5"
            >
              <CircleX
                className="mt-0.5 size-4 shrink-0 text-ink-secondary"
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-small text-ink">{evidence.expected}</span>
                <span className="text-caption text-ink-secondary">
                  {EVIDENCE_TYPE_LABELS[evidence.evidenceType]} ·{' '}
                  {evidence.guidelineRef}
                </span>
              </span>
              <span className="shrink-0 text-caption text-ink-secondary">
                Tidak ditemukan
              </span>
            </li>
          ))}
        </ul>
      </div>

      {diagnosisMentions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-caption font-medium text-ink-secondary">
            Tercantum di
          </h3>
          <ul className="flex flex-col gap-2">
            {diagnosisMentions.map((mention, mentionIndex) => (
              <li key={mentionIndex}>
                <FindingCitationItem
                  citation={mention}
                  documentsById={documentsById}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          onRequestClarification(
            buildClarificationReason(diagnosis, missingEvidence),
          )
        }
      >
        <MessageSquareText aria-hidden="true" />
        Gunakan untuk minta klarifikasi
      </Button>
    </article>
  );
}

export function ExistencePanel({
  findings,
  diagnoses,
  tariffAmount,
  documentsById,
  onRequestClarification,
}: {
  findings: ClaimFinding[];
  diagnoses: ClaimDiagnosis[];
  tariffAmount: number;
  documentsById: Map<string, ClaimDocument>;
  onRequestClarification: (reason: string) => void;
}) {
  const diagnosesById = new Map(
    diagnoses.map((diagnosis) => [diagnosis.id, diagnosis]),
  );
  const tariffsBeforeCorrection = findings.map(
    (_, findingIndex) =>
      tariffAmount -
      findings
        .slice(0, findingIndex)
        .reduce((gapTotal, finding) => gapTotal + (finding.tariffGap ?? 0), 0),
  );

  return (
    <TestPanelShell testType="EXISTENCE" findingCount={findings.length}>
      <ul className="divide-y divide-hairline">
        {findings.map((finding, findingIndex) => (
          <li key={finding.id} className="px-6 py-5">
            <UnsupportedDiagnosis
              finding={finding}
              diagnosis={
                finding.diagnosisId
                  ? diagnosesById.get(finding.diagnosisId)
                  : undefined
              }
              tariffBeforeCorrection={tariffsBeforeCorrection[findingIndex]}
              documentsById={documentsById}
              onRequestClarification={onRequestClarification}
            />
          </li>
        ))}
      </ul>
    </TestPanelShell>
  );
}
