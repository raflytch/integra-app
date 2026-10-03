'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ClaimStatusPill,
  FacilityTypePill,
  NeedsClarificationPill,
  NotAnalyzedPill,
  PriorityPill,
  SeverityPill,
  TestSignalPill,
} from '@/components/claim-pills';
import { SortableTableHead } from '@/components/data-table/sortable-table-head';
import { TablePagination } from '@/components/data-table/table-pagination';
import {
  type FilterOption,
  NoMatchingRows,
  TableFilterSelect,
  TableSearch,
  TableToolbar,
} from '@/components/data-table/table-toolbar';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTableControls } from '@/hooks/use-table-controls';
import {
  countClaimFindings,
  isClaimAnalyzed,
  isClaimFlagged,
} from '@/lib/claim-analysis';
import { TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { countDaysBetween, formatDate, formatRupiah } from '@/lib/format';
import type { ClaimQueueItem, ClaimStatus } from '@/types/claim.types';

const CLAIMS_PER_PAGE = 20;
const COLUMN_COUNT = 7;
const ALL = 'ALL';

type AnalysisFilter = typeof ALL | 'ANALYZED' | 'NOT_ANALYZED';
type SignalFilter = typeof ALL | 'FLAGGED' | 'CLEAN';

const ANALYSIS_FILTER_OPTIONS: FilterOption<AnalysisFilter>[] = [
  { value: ALL, label: 'Semua' },
  { value: 'ANALYZED', label: 'Sudah dianalisis' },
  { value: 'NOT_ANALYZED', label: 'Belum dianalisis' },
];

const SIGNAL_FILTER_OPTIONS: FilterOption<SignalFilter>[] = [
  { value: ALL, label: 'Semua' },
  { value: 'FLAGGED', label: 'Perlu klarifikasi' },
  { value: 'CLEAN', label: 'Tidak ada tanda' },
];

const STATUS_SORT_ORDER: ClaimStatus[] = [
  'PENDING',
  'CLARIFICATION_REQUESTED',
  'ESCALATED',
  'APPROVED',
];

const CLAIM_SORT_VALUES = {
  priority: (claim: ClaimQueueItem) => claim.priorityScore,
  claimNo: (claim: ClaimQueueItem) => claim.claimNo,
  facility: (claim: ClaimQueueItem) => claim.facility.name,
  admittedAt: (claim: ClaimQueueItem) => claim.admittedAt,
  findings: (claim: ClaimQueueItem) => countClaimFindings(claim),
  potentialGap: (claim: ClaimQueueItem) => claim.potentialGap,
  status: (claim: ClaimQueueItem) => STATUS_SORT_ORDER.indexOf(claim.status),
};

function toClaimSearchText(claim: ClaimQueueItem): string {
  return [
    claim.claimNo,
    claim.primaryDiagnosis?.name,
    claim.primaryDiagnosis?.icd10Code,
    claim.inacbgCode,
    claim.facility.name,
  ].join(' ');
}

function FindingSignals({ claim }: { claim: ClaimQueueItem }) {
  if (!isClaimAnalyzed(claim)) {
    return (
      <div className="flex flex-col items-start gap-1">
        <NotAnalyzedPill />
        <span className="text-caption text-ink-secondary tabular-nums">
          {claim.extractedDocumentCount}/{claim.documentCount} dokumen dibaca
        </span>
      </div>
    );
  }
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
  const [facilityFilter, setFacilityFilter] = useState<string>(ALL);
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>(ALL);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>(ALL);

  const facilityOptions: FilterOption<string>[] = [
    { value: ALL, label: 'Semua' },
    ...[
      ...new Map(
        claims.map((claim) => [claim.facility.id, claim.facility.name]),
      ),
    ]
      .sort(([, firstName], [, secondName]) =>
        firstName.localeCompare(secondName, 'id'),
      )
      .map(([facilityId, facilityName]) => ({
        value: facilityId,
        label: facilityName,
      })),
  ];
  const filteredClaims = claims.filter(
    (claim) =>
      (facilityFilter === ALL || claim.facility.id === facilityFilter) &&
      (analysisFilter === ALL ||
        isClaimAnalyzed(claim) === (analysisFilter === 'ANALYZED')) &&
      (signalFilter === ALL ||
        (isClaimAnalyzed(claim) &&
          isClaimFlagged(claim) === (signalFilter === 'FLAGGED'))),
  );
  const table = useTableControls({
    rows: filteredClaims,
    toSearchText: toClaimSearchText,
    sortValues: CLAIM_SORT_VALUES,
    initialSort: { key: 'priority', direction: 'desc' },
    pageSize: CLAIMS_PER_PAGE,
  });

  function changeFilter<Value>(setFilter: (value: Value) => void) {
    return (value: Value) => {
      setFilter(value);
      table.resetPage();
    };
  }

  function resetSearchAndFilters() {
    table.setSearchQuery('');
    setFacilityFilter(ALL);
    setAnalysisFilter(ALL);
    setSignalFilter(ALL);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      <TableToolbar>
        <TableSearch
          value={table.searchQuery}
          onChange={table.setSearchQuery}
          placeholder="Cari no. klaim, diagnosis, faskes"
        />
        <TableFilterSelect
          label="Faskes"
          value={facilityFilter}
          options={facilityOptions}
          onChange={changeFilter(setFacilityFilter)}
        />
        <TableFilterSelect
          label="Analisis AI"
          value={analysisFilter}
          options={ANALYSIS_FILTER_OPTIONS}
          onChange={changeFilter(setAnalysisFilter)}
        />
        <TableFilterSelect
          label="Tanda"
          value={signalFilter}
          options={SIGNAL_FILTER_OPTIONS}
          onChange={changeFilter(setSignalFilter)}
        />
      </TableToolbar>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableTableHead
              sortKey="priority"
              sort={table.sort}
              onSort={table.toggleSort}
              className="w-16"
            >
              #
            </SortableTableHead>
            <SortableTableHead
              sortKey="claimNo"
              sort={table.sort}
              onSort={table.toggleSort}
            >
              Klaim
            </SortableTableHead>
            <SortableTableHead
              sortKey="facility"
              sort={table.sort}
              onSort={table.toggleSort}
            >
              Faskes
            </SortableTableHead>
            <SortableTableHead
              sortKey="admittedAt"
              sort={table.sort}
              onSort={table.toggleSort}
            >
              Rawat inap
            </SortableTableHead>
            <SortableTableHead
              sortKey="findings"
              sort={table.sort}
              onSort={table.toggleSort}
            >
              Tanda uji
            </SortableTableHead>
            <SortableTableHead
              sortKey="potentialGap"
              sort={table.sort}
              onSort={table.toggleSort}
              align="right"
            >
              Potensi selisih
            </SortableTableHead>
            <SortableTableHead
              sortKey="status"
              sort={table.sort}
              onSort={table.toggleSort}
            >
              Status
            </SortableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.length === 0 && (
            <NoMatchingRows
              columnCount={COLUMN_COUNT}
              onReset={resetSearchAndFilters}
            />
          )}
          {table.pageRows.map((claim, pageRowIndex) => {
            const rowIndex = table.firstRowIndex + pageRowIndex;
            const claimHref = `/claims/${claim.id}`;
            return (
              <TableRow
                key={claim.id}
                data-tour={rowIndex === 0 ? 'queue-first-claim' : undefined}
                data-tour-href={rowIndex === 0 ? claimHref : undefined}
                onClick={() => router.push(claimHref)}
                className="cursor-pointer"
              >
                <TableCell className="align-top font-mono text-caption text-ink-secondary tabular-nums">
                  {rowIndex + 1}
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
      {table.pageRows.length > 0 && (
        <TablePagination
          firstRowIndex={table.firstRowIndex}
          pageRowCount={table.pageRows.length}
          matchingRowCount={table.matchingRowCount}
          pageIndex={table.pageIndex}
          pageCount={table.pageCount}
          rowNoun="klaim"
          onPageChange={table.setPageIndex}
        />
      )}
    </div>
  );
}
