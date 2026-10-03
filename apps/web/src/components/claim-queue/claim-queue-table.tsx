'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClaimStatusPill,
  FacilityTypePill,
  NeedsClarificationPill,
  PriorityPill,
  SeverityPill,
  TestSignalPill,
} from '@/components/claim-pills';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { countDaysBetween, formatDate, formatRupiah } from '@/lib/format';
import type { ClaimQueueItem } from '@/types/claim.types';

function FindingSignals({ claim }: { claim: ClaimQueueItem }) {
  const flaggedTestTypes = TEST_TYPE_ORDER.filter(
    (testType) => claim.findingCounts[testType] > 0,
  );
  if (flaggedTestTypes.length === 0) {
    return <span className="text-xs text-quiet-gray">Tidak ada tanda</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <NeedsClarificationPill />
      <div className="flex flex-wrap gap-1">
        {flaggedTestTypes.map((testType) => (
          <TestSignalPill
            key={testType}
            testType={testType}
            findingCount={claim.findingCounts[testType]}
          />
        ))}
      </div>
    </div>
  );
}

export function ClaimQueueTable({ claims }: { claims: ClaimQueueItem[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-xl border border-linen-border bg-eggshell-canvas">
      <Table>
        <TableHeader>
          <TableRow className="border-linen-border hover:bg-transparent">
            <TableHead className="w-12 pl-4 text-xs text-quiet-gray">
              #
            </TableHead>
            <TableHead className="text-xs text-quiet-gray">Klaim</TableHead>
            <TableHead className="text-xs text-quiet-gray">Faskes</TableHead>
            <TableHead className="text-xs text-quiet-gray">
              Rawat inap
            </TableHead>
            <TableHead className="text-xs text-quiet-gray">Tanda uji</TableHead>
            <TableHead className="text-right text-xs text-quiet-gray">
              Potensi selisih
            </TableHead>
            <TableHead className="pr-4 text-xs text-quiet-gray">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim, queueIndex) => {
            const claimHref = `/claims/${claim.id}`;
            return (
              <TableRow
                key={claim.id}
                data-tour={queueIndex === 0 ? 'queue-first-claim' : undefined}
                data-tour-href={queueIndex === 0 ? claimHref : undefined}
                onClick={() => router.push(claimHref)}
                className="cursor-pointer border-linen-border hover:bg-cloud-surface"
              >
                <TableCell className="pl-4 align-top font-mono text-xs text-quiet-gray">
                  {queueIndex + 1}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={claimHref}
                      onClick={(event) => event.stopPropagation()}
                      className="font-mono text-xs text-integra-teal hover:underline"
                    >
                      {claim.claimNo}
                    </Link>
                    <span className="text-sm font-medium text-graphite">
                      {claim.primaryDiagnosis?.name ?? claim.inacbgCode}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <PriorityPill priorityScore={claim.priorityScore} />
                      <SeverityPill severityLevel={claim.severityLevel} />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm text-graphite">
                      {claim.facility.name}
                    </span>
                    <FacilityTypePill facilityType={claim.facility.type} />
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-graphite">
                      {formatDate(claim.admittedAt)}
                    </span>
                    <span className="text-xs text-quiet-gray">
                      {countDaysBetween(claim.admittedAt, claim.dischargedAt)}{' '}
                      hari
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <FindingSignals claim={claim} />
                </TableCell>
                <TableCell className="text-right align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-integra-deep">
                      {formatRupiah(claim.potentialGap)}
                    </span>
                    <span className="text-xs text-quiet-gray">
                      dari {formatRupiah(claim.tariffAmount)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="pr-4 align-top">
                  <ClaimStatusPill status={claim.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
