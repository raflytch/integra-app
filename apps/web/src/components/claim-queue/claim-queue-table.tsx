'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import {
  type AnalysisTarget,
  useClaimAnalysisRunner,
} from '@/components/analysis/use-claim-analysis-runner';
import {
  ClaimStatusPill,
  FacilityTypePill,
  NeedsClarificationPill,
  NotAnalyzedPill,
  PriorityPill,
  SeverityPill,
  TestSignalPill,
} from '@/components/claim-pills';
import { ClaimSelectionBar } from '@/components/claim-queue/claim-selection-bar';
import { SortableTableHead } from '@/components/data-table/sortable-table-head';
import { TablePagination } from '@/components/data-table/table-pagination';
import {
  type FilterOption,
  NoMatchingRows,
  NoMatchingRowsNotice,
  type SortOption,
  TableFilterSelect,
  TableSearch,
  TableSortSelect,
  TableToolbar,
} from '@/components/data-table/table-toolbar';
import { LoadError } from '@/components/load-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useServerTableControls } from '@/hooks/use-server-table-controls';
import type { TableSort } from '@/hooks/use-table-controls';
import { isClaimAnalyzed } from '@/lib/claim-analysis';
import { TEST_TYPE_ORDER } from '@/lib/claim-labels';
import {
  countDaysBetween,
  formatDate,
  formatDateTime,
  formatRupiah,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { fetchClaimQueuePage } from '@/services/claim.service';
import { fetchFacilityOptions } from '@/services/facility.service';
import type {
  ClaimQueueItem,
  ClaimQueueParams,
  ClaimQueueSortKey,
  ClaimStatus,
} from '@/types/claim.types';
import { ClaimQueueEmpty, ClaimQueueSkeleton } from './claim-queue-states';

const CLAIMS_PER_PAGE = 10;
const COLUMN_COUNT = 9;
const ALL = 'ALL';

type AnalysisFilter = typeof ALL | 'ANALYZED' | 'NOT_ANALYZED';
type SignalFilter = typeof ALL | 'FLAGGED' | 'CLEAN';
type AnalysisTimeOrder = typeof ALL | 'NEWEST' | 'OLDEST';

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

const ANALYSIS_TIME_ORDER_OPTIONS: FilterOption<AnalysisTimeOrder>[] = [
  { value: ALL, label: 'Semua' },
  { value: 'NEWEST', label: 'Terbaru' },
  { value: 'OLDEST', label: 'Terlama' },
];

const INITIAL_CLAIM_SORT: TableSort<ClaimQueueSortKey> = {
  key: 'priority',
  direction: 'desc',
};

/** Sorting for the card list below `lg`, which has no column headers. */
const CLAIM_SORT_OPTIONS: SortOption<ClaimQueueSortKey>[] = [
  { ...INITIAL_CLAIM_SORT, label: 'Prioritas tertinggi' },
  { key: 'potentialGap', direction: 'desc', label: 'Potensi selisih terbesar' },
  { key: 'findings', direction: 'desc', label: 'Tanda uji terbanyak' },
  { key: 'admittedAt', direction: 'desc', label: 'Rawat inap terbaru' },
  { key: 'admittedAt', direction: 'asc', label: 'Rawat inap terlama' },
  { key: 'claimNo', direction: 'asc', label: 'No. klaim' },
  { key: 'facility', direction: 'asc', label: 'Faskes' },
  { key: 'status', direction: 'asc', label: 'Status' },
  { key: 'analyzedAt', direction: 'desc', label: 'Analisis AI terbaru' },
  { key: 'analyzedAt', direction: 'asc', label: 'Analisis AI terlama' },
];

function toAnalysisTarget(claim: ClaimQueueItem): AnalysisTarget {
  return {
    id: claim.id,
    claimNo: claim.claimNo,
    unreadDocumentCount: claim.documentCount - claim.extractedDocumentCount,
  };
}

function toFilterParam<Value extends string>(
  value: Value | typeof ALL,
): Value | undefined {
  return value === ALL ? undefined : (value as Value);
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

function PotentialGap({
  claim,
  align,
}: {
  claim: ClaimQueueItem;
  align: 'start' | 'end';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        align === 'end' ? 'items-end' : 'items-start',
      )}
    >
      <span className="font-medium text-ink tabular-nums">
        {formatRupiah(claim.potentialGap)}
      </span>
      <span className="text-caption text-ink-secondary tabular-nums">
        dari {formatRupiah(claim.tariffAmount)}
      </span>
    </div>
  );
}

function AnalysisAction({
  claim,
  isAnalysisRunning,
  onAnalyze,
}: {
  claim: ClaimQueueItem;
  isAnalysisRunning: boolean;
  onAnalyze: () => void;
}) {
  if (claim.analyzedAt) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-caption text-ink-secondary">Dianalisis AI</span>
        <time
          dateTime={claim.analyzedAt}
          className="text-small text-ink tabular-nums"
        >
          {formatDateTime(claim.analyzedAt)}
        </time>
      </div>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isAnalysisRunning}
      onClick={(event) => {
        event.stopPropagation();
        onAnalyze();
      }}
    >
      <LuSparkles aria-hidden="true" />
      Analisis
    </Button>
  );
}

export function ClaimQueueTable({
  status,
  emptyTitle,
  emptyDescription,
}: {
  status?: ClaimStatus;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const router = useRouter();
  const [facilityFilter, setFacilityFilter] = useState<string>(ALL);
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>(ALL);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>(ALL);
  const table = useServerTableControls({ initialSort: INITIAL_CLAIM_SORT });
  const [selectedClaimIds, setSelectedClaimIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const analysisRunner = useClaimAnalysisRunner({
    onFinished: () => setSelectedClaimIds(new Set()),
  });

  const queueParams: ClaimQueueParams = {
    status,
    facilityId: toFilterParam(facilityFilter),
    search: table.debouncedSearchQuery || undefined,
    analysis: toFilterParam(analysisFilter),
    signal: toFilterParam(signalFilter),
    sortBy: table.sort.key,
    sortDirection: table.sort.direction,
    page: table.pageIndex + 1,
    pageSize: CLAIMS_PER_PAGE,
  };
  const claimQueueQuery = useQuery({
    queryKey: ['claims', 'queue', queueParams],
    queryFn: () => fetchClaimQueuePage(queueParams),
    placeholderData: keepPreviousData,
  });
  const facilityOptionsQuery = useQuery({
    queryKey: ['facilities', 'options'],
    queryFn: fetchFacilityOptions,
  });

  if (claimQueueQuery.isPending) return <ClaimQueueSkeleton />;
  if (claimQueueQuery.isError) {
    return (
      <LoadError
        title="Antrean klaim gagal dimuat"
        onRetry={() => claimQueueQuery.refetch()}
      />
    );
  }

  const claimPage = claimQueueQuery.data;
  const hasSearchOrFilter =
    Boolean(table.debouncedSearchQuery) ||
    facilityFilter !== ALL ||
    analysisFilter !== ALL ||
    signalFilter !== ALL;
  if (claimPage.total === 0 && !hasSearchOrFilter) {
    return (
      <ClaimQueueEmpty title={emptyTitle} description={emptyDescription} />
    );
  }

  const claims = claimPage.items;
  const firstRowIndex = (claimPage.page - 1) * claimPage.pageSize;
  const pageCount = Math.max(
    1,
    Math.ceil(claimPage.total / claimPage.pageSize),
  );
  // A decision or analysis can empty the last page; step back to the new last page.
  if (
    claims.length === 0 &&
    claimPage.total > 0 &&
    !claimQueueQuery.isPlaceholderData
  ) {
    table.setPageIndex(pageCount - 1);
  }
  // Selection only counts on the visible page, so one run covers at most one page.
  const selectedClaims = claims.filter((claim) =>
    selectedClaimIds.has(claim.id),
  );
  const pageSelectionState =
    selectedClaims.length === 0
      ? false
      : selectedClaims.length === claims.length
        ? true
        : 'indeterminate';
  const unreadDocumentCount = selectedClaims.reduce(
    (total, claim) => total + toAnalysisTarget(claim).unreadDocumentCount,
    0,
  );
  const facilityOptions: FilterOption<string>[] = [
    { value: ALL, label: 'Semua' },
    ...(facilityOptionsQuery.data ?? []).map((facility) => ({
      value: facility.id,
      label: facility.name,
    })),
  ];
  const analysisTimeOrder: AnalysisTimeOrder =
    table.sort.key !== 'analyzedAt'
      ? ALL
      : table.sort.direction === 'desc'
        ? 'NEWEST'
        : 'OLDEST';

  function changeAnalysisTimeOrder(order: AnalysisTimeOrder) {
    table.setSort(
      order === ALL
        ? INITIAL_CLAIM_SORT
        : { key: 'analyzedAt', direction: order === 'NEWEST' ? 'desc' : 'asc' },
    );
  }

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
    table.setSort(INITIAL_CLAIM_SORT);
  }

  function analyzeClaim(claim: ClaimQueueItem) {
    analysisRunner.requestAnalysis([toAnalysisTarget(claim)]);
  }

  function toggleClaimSelection(claimId: string, isSelected: boolean) {
    setSelectedClaimIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (isSelected) nextIds.add(claimId);
      else nextIds.delete(claimId);
      return nextIds;
    });
  }

  function selectPage(isSelected: boolean) {
    setSelectedClaimIds(
      new Set(isSelected ? claims.map((claim) => claim.id) : []),
    );
  }

  function renderSelectionCheckbox(claim: ClaimQueueItem) {
    return (
      <Checkbox
        checked={selectedClaimIds.has(claim.id)}
        onCheckedChange={(checked) =>
          toggleClaimSelection(claim.id, checked === true)
        }
        onClick={(event) => event.stopPropagation()}
        aria-label={`Pilih ${claim.claimNo}`}
      />
    );
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
          label="Waktu analisis"
          value={analysisTimeOrder}
          options={ANALYSIS_TIME_ORDER_OPTIONS}
          onChange={changeAnalysisTimeOrder}
        />
        <TableFilterSelect
          label="Tanda"
          value={signalFilter}
          options={SIGNAL_FILTER_OPTIONS}
          onChange={changeFilter(setSignalFilter)}
        />
        <TableSortSelect
          sort={table.sort}
          options={CLAIM_SORT_OPTIONS}
          onChange={table.setSort}
        />
      </TableToolbar>
      <ClaimSelectionBar
        pageClaimCount={claims.length}
        selectedCount={selectedClaims.length}
        unreadDocumentCount={unreadDocumentCount}
        pageSelectionState={pageSelectionState}
        isRunning={analysisRunner.isRunning}
        onSelectPage={selectPage}
        onAnalyze={() =>
          analysisRunner.requestAnalysis(selectedClaims.map(toAnalysisTarget))
        }
      />
      <div
        aria-busy={claimQueueQuery.isPlaceholderData}
        className="motion-safe:transition-opacity motion-safe:duration-200 aria-busy:opacity-60"
      >
        <div className="hidden lg:block">
          {/* Nine columns: 12px side padding lets them fit from 1280px wide. */}
          <Table className="[&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pr-0">
                  <Checkbox
                    checked={pageSelectionState}
                    onCheckedChange={(checked) => selectPage(checked === true)}
                    disabled={claims.length === 0}
                    aria-label="Pilih semua klaim di halaman ini"
                  />
                </TableHead>
                <SortableTableHead
                  sortKey="priority"
                  sort={table.sort}
                  onSort={table.toggleSort}
                  className="w-12"
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 && (
                <NoMatchingRows
                  columnCount={COLUMN_COUNT}
                  onReset={resetSearchAndFilters}
                />
              )}
              {claims.map((claim, pageRowIndex) => {
                const rowIndex = firstRowIndex + pageRowIndex;
                const claimHref = `/claims/${claim.id}`;
                return (
                  <TableRow
                    key={claim.id}
                    data-tour={rowIndex === 0 ? 'queue-first-claim' : undefined}
                    data-tour-href={rowIndex === 0 ? claimHref : undefined}
                    data-state={
                      selectedClaimIds.has(claim.id) ? 'selected' : undefined
                    }
                    onClick={() => router.push(claimHref)}
                    className="cursor-pointer"
                  >
                    <TableCell className="w-10 pr-0 align-top">
                      {renderSelectionCheckbox(claim)}
                    </TableCell>
                    <TableCell className="align-top font-mono text-caption text-ink-secondary tabular-nums">
                      {rowIndex + 1}
                    </TableCell>
                    <TableCell className="min-w-36 align-top whitespace-normal">
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
                    <TableCell className="min-w-36 align-top whitespace-normal">
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
                          {countDaysBetween(
                            claim.admittedAt,
                            claim.dischargedAt,
                          )}{' '}
                          hari
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <FindingSignals claim={claim} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <PotentialGap claim={claim} align="end" />
                    </TableCell>
                    <TableCell className="align-top">
                      <ClaimStatusPill status={claim.status} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <AnalysisAction
                        claim={claim}
                        isAnalysisRunning={analysisRunner.isRunning}
                        onAnalyze={() => analyzeClaim(claim)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ul className="divide-y divide-hairline lg:hidden">
          {claims.length === 0 && (
            <li>
              <NoMatchingRowsNotice onReset={resetSearchAndFilters} />
            </li>
          )}
          {claims.map((claim, pageRowIndex) => {
            const rowIndex = firstRowIndex + pageRowIndex;
            const claimHref = `/claims/${claim.id}`;
            return (
              <li
                key={claim.id}
                data-tour={rowIndex === 0 ? 'queue-first-claim' : undefined}
                data-tour-href={rowIndex === 0 ? claimHref : undefined}
                data-state={
                  selectedClaimIds.has(claim.id) ? 'selected' : undefined
                }
                onClick={() => router.push(claimHref)}
                className="flex cursor-pointer flex-col gap-3 p-4 hover:bg-subtle data-[state=selected]:bg-primary-wash"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex w-full items-start gap-2">
                    {renderSelectionCheckbox(claim)}
                    <Link
                      href={claimHref}
                      onClick={(event) => event.stopPropagation()}
                      className="font-mono text-caption break-all text-primary-hover hover:underline"
                    >
                      {claim.claimNo}
                    </Link>
                    <span className="ml-auto shrink-0 font-mono text-caption text-ink-secondary tabular-nums">
                      #{rowIndex + 1}
                    </span>
                  </div>
                  <span className="font-medium text-ink">
                    {claim.primaryDiagnosis?.name ?? claim.inacbgCode}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <ClaimStatusPill status={claim.status} />
                    <PriorityPill priorityScore={claim.priorityScore} />
                    <SeverityPill severityLevel={claim.severityLevel} />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 text-small">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
                    {claim.facility.name}
                    <FacilityTypePill facilityType={claim.facility.type} />
                  </span>
                  <span className="text-caption text-ink-secondary">
                    Rawat inap {formatDate(claim.admittedAt)} ·{' '}
                    {countDaysBetween(claim.admittedAt, claim.dischargedAt)}{' '}
                    hari
                  </span>
                </div>
                <FindingSignals claim={claim} />
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <PotentialGap claim={claim} align="start" />
                  <AnalysisAction
                    claim={claim}
                    isAnalysisRunning={analysisRunner.isRunning}
                    onAnalyze={() => analyzeClaim(claim)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {analysisRunner.dialogs}
      {claims.length > 0 && (
        <TablePagination
          firstRowIndex={firstRowIndex}
          pageRowCount={claims.length}
          matchingRowCount={claimPage.total}
          pageIndex={claimPage.page - 1}
          pageCount={pageCount}
          rowNoun="klaim"
          onPageChange={table.setPageIndex}
        />
      )}
    </div>
  );
}
