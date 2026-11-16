import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  LuChevronDown,
  LuCircleCheck,
  LuCircleDashed,
  LuCopy,
  LuFileSearch,
  LuFlag,
  LuGitCompareArrows,
  LuInfo,
} from 'react-icons/lu';
import { Pill } from '@/components/claim-pills';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TEST_TYPE_DETAILS } from '@/lib/claim-labels';
import { formatPercent, formatRupiah } from '@/lib/format';
import type {
  ClaimDocument,
  ClaimFinding,
  TestType,
} from '@/types/claim.types';
import { FindingCitationItem } from './finding-citation';
import { ClaimLink, LinkedClaimText } from './linked-claim-text';

const TEST_TYPE_ICONS: Record<TestType, IconType> = {
  EXISTENCE: LuFileSearch,
  CONSISTENCY: LuGitCompareArrows,
  SIMILARITY: LuCopy,
};

function FindingItem({
  finding,
  documentsById,
}: {
  finding: ClaimFinding;
  documentsById: Map<string, ClaimDocument>;
}) {
  const sharedCitations = finding.citations.filter(
    (citation) => citation.kind !== 'DIFFERENT_TEXT',
  );
  const differentTextSides: { side: string; label: ReactNode }[] = [
    { side: 'CLAIM', label: 'Hanya di klaim ini' },
    {
      side: 'RELATED_CLAIM',
      label: finding.relatedClaim ? (
        <>
          Hanya di klaim <ClaimLink claim={finding.relatedClaim} />
        </>
      ) : (
        'Hanya di klaim pembanding'
      ),
    },
  ];
  const differentTextGroups = differentTextSides.map(({ side, label }) => ({
    side,
    label,
    citations: finding.citations.filter(
      (citation) =>
        citation.kind === 'DIFFERENT_TEXT' && citation.side === side,
    ),
  }));
  const hasDifferentTexts = differentTextGroups.some(
    ({ citations }) => citations.length > 0,
  );

  return (
    <article className="flex flex-col gap-3">
      <p className="text-body text-ink">
        <LinkedClaimText
          text={finding.summary}
          relatedClaims={finding.relatedClaim ? [finding.relatedClaim] : []}
        />
      </p>
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
      {sharedCitations.length > 0 && (
        <div className="flex flex-col gap-2">
          {hasDifferentTexts && (
            <h3 className="text-caption font-medium text-ink-secondary">
              Yang sama persis
            </h3>
          )}
          <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
            {sharedCitations.map((citation, citationIndex) => (
              <li key={citationIndex} className="px-3 py-2.5">
                <FindingCitationItem
                  citation={citation}
                  documentsById={documentsById}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasDifferentTexts && (
        <div className="grid gap-3 md:grid-cols-2">
          {differentTextGroups.map(({ side, label, citations }) => (
            <div key={side} className="flex flex-col gap-2">
              <h3 className="text-caption font-medium text-ink-secondary">
                Yang beda: {label}
              </h3>
              {citations.length === 0 ? (
                <p className="text-small text-ink-secondary">
                  Tidak ada kalimat yang berbeda.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
                  {citations.map((citation, citationIndex) => (
                    <li key={citationIndex} className="px-3 py-2.5">
                      <FindingCitationItem
                        citation={citation}
                        documentsById={documentsById}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function TestPanelShell({
  testType,
  findingCount,
  isUnassessed = false,
  overview,
  children,
}: {
  testType: TestType;
  findingCount: number;
  isUnassessed?: boolean;
  overview?: ReactNode;
  children: ReactNode;
}) {
  const testDetails = TEST_TYPE_DETAILS[testType];
  const TestIcon = TEST_TYPE_ICONS[testType];
  const headingId = `test-panel-${testType.toLowerCase()}`;
  const hasFindings = findingCount > 0;

  return (
    <Collapsible asChild defaultOpen={hasFindings}>
      <section
        id={`panel-${testType.toLowerCase()}`}
        aria-labelledby={headingId}
        className="group rounded-xl border border-hairline bg-surface shadow-xs"
      >
        <div className="flex items-center gap-4 px-6 py-4 group-data-[state=open]:border-b group-data-[state=open]:border-hairline">
          <CollapsibleTrigger
            tabIndex={-1}
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary-wash text-primary-hover"
          >
            <TestIcon className="size-4" aria-hidden="true" />
          </CollapsibleTrigger>
          {/* The info button sits right after the title, so it lines up the same on every panel. */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h2 id={headingId} className="min-w-0">
                <CollapsibleTrigger
                  aria-describedby={`${headingId}-description`}
                  className="rounded-md text-left text-body font-semibold tracking-display text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {testDetails.title}
                </CollapsibleTrigger>
              </h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-ink-secondary"
                    aria-label={`Apa itu ${testDetails.title}?`}
                  >
                    <LuInfo aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="flex w-80 flex-col gap-1.5 border-hairline bg-surface p-4"
                >
                  <p className="text-small font-semibold text-ink">
                    Apa itu {testDetails.title}?
                  </p>
                  <p className="text-small leading-normal text-ink-secondary">
                    {testDetails.explanation}
                  </p>
                  <p className="text-caption leading-normal text-ink-secondary">
                    Tanda berarti klaim perlu diklarifikasi, bukan tuduhan
                    fraud. Keputusan tetap di tangan verifikator.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <CollapsibleTrigger
              tabIndex={-1}
              aria-hidden="true"
              id={`${headingId}-description`}
              className="text-left text-small font-normal text-ink-secondary"
            >
              {testDetails.description}
            </CollapsibleTrigger>
          </div>
          <CollapsibleTrigger
            tabIndex={-1}
            aria-hidden="true"
            className="flex flex-1 items-center justify-end gap-4 self-stretch"
          >
            {hasFindings ? (
              <Pill tone="warning" icon={LuFlag}>
                {findingCount} tanda
              </Pill>
            ) : isUnassessed ? (
              <Pill tone="outline" icon={LuCircleDashed}>
                Belum bisa dinilai
              </Pill>
            ) : (
              <Pill tone="success" icon={LuCircleCheck}>
                Tidak ada tanda
              </Pill>
            )}
            <LuChevronDown className="size-4 shrink-0 text-ink-secondary motion-safe:transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {overview && (
            <div className="border-b border-hairline px-6 py-4">{overview}</div>
          )}
          {hasFindings ? (
            children
          ) : (
            <p className="px-6 py-4 text-small text-ink-secondary">
              {testDetails.emptyMessage}
            </p>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function TestPanel({
  testType,
  findings,
  overview,
  documentsById,
}: {
  testType: TestType;
  findings: ClaimFinding[];
  overview?: ReactNode;
  documentsById: Map<string, ClaimDocument>;
}) {
  return (
    <TestPanelShell
      testType={testType}
      findingCount={findings.length}
      overview={overview}
    >
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
