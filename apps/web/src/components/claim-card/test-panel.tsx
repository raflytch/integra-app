import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  LuChevronDown,
  LuCircleCheck,
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
import { cn } from '@/lib/utils';
import type {
  ClaimDocument,
  ClaimFinding,
  TestType,
} from '@/types/claim.types';
import { FindingCitationItem } from './finding-citation';

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
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
          {finding.citations.map((citation, citationIndex) => (
            <li key={citationIndex} className="px-3 py-2.5">
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
  const TestIcon = TEST_TYPE_ICONS[testType];
  const headingId = `test-panel-${testType.toLowerCase()}`;
  const hasFindings = findingCount > 0;

  return (
    <Collapsible asChild defaultOpen={hasFindings}>
      <section
        aria-labelledby={headingId}
        className="group rounded-xl border border-hairline bg-surface shadow-xs"
      >
        <div className="flex items-center gap-2 px-6 py-4 group-data-[state=open]:border-b group-data-[state=open]:border-hairline">
          <h2 id={headingId} className="min-w-0">
            <CollapsibleTrigger className="flex items-center gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg',
                  hasFindings
                    ? 'bg-warning/10 text-warning-ink'
                    : 'bg-success/10 text-success-ink',
                )}
              >
                <TestIcon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body font-semibold tracking-display text-ink">
                  {testDetails.title}
                </span>
                <span className="text-small font-normal text-ink-secondary">
                  {testDetails.description}
                </span>
              </span>
            </CollapsibleTrigger>
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 self-start text-ink-secondary"
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
                Tanda berarti klaim perlu diklarifikasi, bukan tuduhan fraud.
                Keputusan tetap di tangan verifikator.
              </p>
            </PopoverContent>
          </Popover>
          <CollapsibleTrigger
            tabIndex={-1}
            aria-hidden="true"
            className="flex flex-1 items-center justify-end gap-4 self-stretch"
          >
            <Pill
              tone={hasFindings ? 'warning' : 'success'}
              icon={hasFindings ? LuFlag : LuCircleCheck}
            >
              {hasFindings ? `${findingCount} tanda` : 'Tidak ada tanda'}
            </Pill>
            <LuChevronDown className="size-4 shrink-0 text-ink-secondary motion-safe:transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
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
