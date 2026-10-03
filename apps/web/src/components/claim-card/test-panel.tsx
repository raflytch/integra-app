import Link from 'next/link';
import type { ReactNode } from 'react';
import { Pill } from '@/components/claim-pills';
import { TEST_TYPE_DETAILS } from '@/lib/claim-labels';
import { formatPercent, formatRupiah } from '@/lib/format';
import type {
  ClaimDocument,
  ClaimFinding,
  TestType,
} from '@/types/claim.types';
import { FindingCitationItem } from './finding-citation';

function FindingItem({
  finding,
  documentsById,
}: {
  finding: ClaimFinding;
  documentsById: Map<string, ClaimDocument>;
}) {
  return (
    <article className="flex flex-col gap-3">
      <p className="text-body text-ink">{finding.summary}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-secondary">
        <span>Kekuatan sinyal {formatPercent(finding.strength)}</span>
        {finding.tariffGap !== null && (
          <span>
            Selisih tarif{' '}
            <span className="font-medium text-ink">
              {formatRupiah(finding.tariffGap)}
            </span>
          </span>
        )}
        {finding.similarity !== null && (
          <span>Kemiripan {formatPercent(finding.similarity)}</span>
        )}
      </div>
      {finding.relatedClaim && (
        <Link
          href={`/claims/${finding.relatedClaim.id}`}
          className="w-fit text-small text-primary-hover hover:underline"
        >
          Klaim mirip {finding.relatedClaim.claimNo} ·{' '}
          {finding.relatedClaim.facilityName}
        </Link>
      )}
      {finding.citations.length > 0 && (
        <ul className="flex flex-col gap-2">
          {finding.citations.map((citation, citationIndex) => (
            <li key={citationIndex}>
              <FindingCitationItem
                citation={citation}
                documentsById={documentsById}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function TestPanelShell({
  testType,
  findingCount,
  children,
}: {
  testType: TestType;
  findingCount: number;
  children: ReactNode;
}) {
  const testDetails = TEST_TYPE_DETAILS[testType];
  const headingId = `test-panel-${testType.toLowerCase()}`;
  const hasFindings = findingCount > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-hairline bg-surface shadow-xs"
    >
      <header className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <h2
            id={headingId}
            className="text-body font-semibold tracking-display text-ink"
          >
            {testDetails.title}
          </h2>
          <p className="text-small text-ink-secondary">
            {testDetails.description}
          </p>
        </div>
        <Pill tone={hasFindings ? 'warning' : 'neutral'}>
          {hasFindings ? `${findingCount} tanda` : 'Tidak ada tanda'}
        </Pill>
      </header>
      {hasFindings ? (
        children
      ) : (
        <p className="px-6 py-4 text-small text-ink-secondary">
          {testDetails.emptyMessage}
        </p>
      )}
    </section>
  );
}

export function TestPanel({
  testType,
  findings,
  documentsById,
}: {
  testType: TestType;
  findings: ClaimFinding[];
  documentsById: Map<string, ClaimDocument>;
}) {
  return (
    <TestPanelShell testType={testType} findingCount={findings.length}>
      <ul className="divide-y divide-hairline">
        {findings.map((finding) => (
          <li key={finding.id} className="px-6 py-4">
            <FindingItem finding={finding} documentsById={documentsById} />
          </li>
        ))}
      </ul>
    </TestPanelShell>
  );
}
