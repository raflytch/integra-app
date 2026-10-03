'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ClaimStatusPill,
  FacilityTypePill,
  NeedsClarificationPill,
  PriorityPill,
  SeverityPill,
  TestSignalPill,
} from '@/components/claim-pills';
import { Button } from '@/components/ui/button';
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

const CLAIMS_PER_PAGE = 20;

function FindingSignals({ claim }: { claim: ClaimQueueItem }) {
  const flaggedTestTypes = TEST_TYPE_ORDER.filter(
    (testType) => claim.findingCounts[testType] > 0,
  );
  if (flaggedTestTypes.length === 0) {
    return (
      <span className="text-small text-ink-secondary">Tidak ada tanda</span>
    );
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
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(claims.length / CLAIMS_PER_PAGE));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const firstClaimIndex = currentPageIndex * CLAIMS_PER_PAGE;
  const pageClaims = claims.slice(
    firstClaimIndex,
    firstClaimIndex + CLAIMS_PER_PAGE,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Klaim</TableHead>
            <TableHead>Faskes</TableHead>
            <TableHead>Rawat inap</TableHead>
            <TableHead>Tanda uji</TableHead>
            <TableHead className="text-right">Potensi selisih</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageClaims.map((claim, pageRowIndex) => {
            const queueIndex = firstClaimIndex + pageRowIndex;
            const claimHref = `/claims/${claim.id}`;
            return (
              <TableRow
                key={claim.id}
                data-tour={queueIndex === 0 ? 'queue-first-claim' : undefined}
                data-tour-href={queueIndex === 0 ? claimHref : undefined}
                onClick={() => router.push(claimHref)}
                className="cursor-pointer"
              >
                <TableCell className="align-top font-mono text-caption text-ink-secondary tabular-nums">
                  {queueIndex + 1}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={claimHref}
                      onClick={(event) => event.stopPropagation()}
                      className="font-mono text-caption text-primary-hover hover:underline"
                    >
                      {claim.claimNo}
                    </Link>
                    <span className="font-medium text-ink">
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
                    <span className="text-ink">{claim.facility.name}</span>
                    <FacilityTypePill facilityType={claim.facility.type} />
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-ink">
                      {formatDate(claim.admittedAt)}
                    </span>
                    <span className="text-caption text-ink-secondary">
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
                    <span className="font-medium text-ink tabular-nums">
                      {formatRupiah(claim.potentialGap)}
                    </span>
                    <span className="text-caption text-ink-secondary tabular-nums">
                      dari {formatRupiah(claim.tariffAmount)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <ClaimStatusPill status={claim.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <nav
          aria-label="Halaman antrean"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3"
        >
          <span className="text-small text-ink-secondary tabular-nums">
            Menampilkan {firstClaimIndex + 1}–
            {firstClaimIndex + pageClaims.length} dari {claims.length} klaim
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft aria-hidden="true" />
              Sebelumnya
            </Button>
            <span className="text-small text-ink-secondary tabular-nums">
              {currentPageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(currentPageIndex + 1)}
              disabled={currentPageIndex === pageCount - 1}
            >
              Berikutnya
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
