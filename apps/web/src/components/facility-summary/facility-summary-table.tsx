'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { FacilityTypePill, Pill } from '@/components/claim-pills';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadError } from '@/components/load-error';
import { useServerTableControls } from '@/hooks/use-server-table-controls';
import type { TableSort } from '@/hooks/use-table-controls';
import { TEST_TYPE_DETAILS, TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { formatRupiah } from '@/lib/format';
import type { FacilityType } from '@/types/claim.types';
import { isForbiddenError } from '@/services/auth.service';
import { fetchFacilitySummaryPage } from '@/services/facility.service';
import type {
  FacilitySummary,
  FacilitySummaryParams,
  FacilitySummarySortKey,
} from '@/types/facility.types';
import {
  FacilitySummaryEmpty,
  FacilitySummaryForbidden,
  FacilitySummaryTableSkeleton,
} from './facility-summary-states';

const FACILITIES_PER_PAGE = 10;
const COLUMN_COUNT = 4 + TEST_TYPE_ORDER.length;
const ALL = 'ALL';

type FacilityTypeFilter = typeof ALL | FacilityType;

const FACILITY_TYPE_OPTIONS: FilterOption<FacilityTypeFilter>[] = [
  { value: ALL, label: 'Semua' },
  ...(['A', 'B', 'C', 'D'] as const).map((facilityType) => ({
    value: facilityType,
    label: `Tipe ${facilityType}`,
  })),
];

const INITIAL_FACILITY_SORT: TableSort<FacilitySummarySortKey> = {
  key: 'totalPotentialGap',
  direction: 'desc',
};

/** Sorting for the card list below `lg`, which has no column headers. */
const FACILITY_SORT_OPTIONS: SortOption<FacilitySummarySortKey>[] = [
  {
    key: 'totalPotentialGap',
    direction: 'desc',
    label: 'Potensi selisih terbesar',
  },
  {
    key: 'flaggedClaimCount',
    direction: 'desc',
    label: 'Perlu klarifikasi terbanyak',
  },
  { key: 'claimCount', direction: 'desc', label: 'Klaim terbanyak' },
  { key: 'facility', direction: 'asc', label: 'Nama faskes' },
];

function CountPill({ count }: { count: number }) {
  return (
    <Pill tone={count > 0 ? 'warning' : 'neutral'} className="tabular-nums">
      {count}
    </Pill>
  );
}

function FacilityIdentity({ summary }: { summary: FacilitySummary }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-medium text-ink">{summary.facility.name}</span>
      <div className="flex flex-wrap items-center gap-2">
        <FacilityTypePill facilityType={summary.facility.type} />
        <span className="font-mono text-caption text-ink-secondary">
          {summary.facility.code} · {summary.facility.city}
        </span>
      </div>
    </div>
  );
}

function FacilityCardStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Server-paged facility summaries: the API aggregates, searches, filters, and sorts. */
export function FacilitySummaryTable() {
  const [facilityTypeFilter, setFacilityTypeFilter] =
    useState<FacilityTypeFilter>(ALL);
  const table = useServerTableControls({ initialSort: INITIAL_FACILITY_SORT });
  const summaryParams: FacilitySummaryParams = {
    search: table.debouncedSearchQuery || undefined,
    type: facilityTypeFilter === ALL ? undefined : facilityTypeFilter,
    sortBy: table.sort.key,
    sortDirection: table.sort.direction,
    page: table.pageIndex + 1,
    pageSize: FACILITIES_PER_PAGE,
  };
  const summaryQuery = useQuery({
    queryKey: ['facilities', 'summary', summaryParams],
    queryFn: () => fetchFacilitySummaryPage(summaryParams),
    placeholderData: keepPreviousData,
  });

  if (summaryQuery.isPending) return <FacilitySummaryTableSkeleton />;
  if (summaryQuery.isError) {
    return isForbiddenError(summaryQuery.error) ? (
      <FacilitySummaryForbidden />
    ) : (
      <LoadError
        title="Ringkasan faskes gagal dimuat"
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const summaryPage = summaryQuery.data;
  const hasSearchOrFilter =
    Boolean(table.debouncedSearchQuery) || facilityTypeFilter !== ALL;
  if (summaryPage.total === 0 && !hasSearchOrFilter) {
    return <FacilitySummaryEmpty />;
  }
  const summaries = summaryPage.items;
  const firstRowIndex = (summaryPage.page - 1) * summaryPage.pageSize;
  const pageCount = Math.max(
    1,
    Math.ceil(summaryPage.total / summaryPage.pageSize),
  );

  function resetSearchAndFilter() {
    table.setSearchQuery('');
    setFacilityTypeFilter(ALL);
    table.setSort(INITIAL_FACILITY_SORT);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      <TableToolbar>
        <TableSearch
          value={table.searchQuery}
          onChange={table.setSearchQuery}
          placeholder="Cari nama, kode, atau kota faskes"
        />
        <TableFilterSelect
          label="Tipe"
          value={facilityTypeFilter}
          options={FACILITY_TYPE_OPTIONS}
          onChange={(facilityType) => {
            setFacilityTypeFilter(facilityType);
            table.resetPage();
          }}
        />
        <TableSortSelect
          sort={table.sort}
          options={FACILITY_SORT_OPTIONS}
          onChange={table.setSort}
        />
      </TableToolbar>
      <div
        aria-busy={summaryQuery.isPlaceholderData}
        className="motion-safe:transition-opacity motion-safe:duration-200 aria-busy:opacity-60"
      >
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  sortKey="facility"
                  sort={table.sort}
                  onSort={table.toggleSort}
                >
                  Faskes
                </SortableTableHead>
                <SortableTableHead
                  sortKey="claimCount"
                  sort={table.sort}
                  onSort={table.toggleSort}
                  align="right"
                >
                  Klaim
                </SortableTableHead>
                <SortableTableHead
                  sortKey="flaggedClaimCount"
                  sort={table.sort}
                  onSort={table.toggleSort}
                  align="right"
                >
                  Perlu klarifikasi
                </SortableTableHead>
                {TEST_TYPE_ORDER.map((testType) => (
                  <SortableTableHead
                    key={testType}
                    sortKey={testType}
                    sort={table.sort}
                    onSort={table.toggleSort}
                    align="right"
                  >
                    {TEST_TYPE_DETAILS[testType].title}
                  </SortableTableHead>
                ))}
                <SortableTableHead
                  sortKey="totalPotentialGap"
                  sort={table.sort}
                  onSort={table.toggleSort}
                  align="right"
                >
                  Potensi selisih
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 && (
                <NoMatchingRows
                  columnCount={COLUMN_COUNT}
                  onReset={resetSearchAndFilter}
                />
              )}
              {summaries.map((summary) => (
                <TableRow key={summary.facility.id}>
                  <TableCell className="min-w-56 whitespace-normal">
                    <FacilityIdentity summary={summary} />
                  </TableCell>
                  <TableCell className="text-right text-ink tabular-nums">
                    {summary.claimCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <CountPill count={summary.flaggedClaimCount} />
                  </TableCell>
                  {TEST_TYPE_ORDER.map((testType) => (
                    <TableCell key={testType} className="text-right">
                      <CountPill count={summary.findingCounts[testType]} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium text-ink tabular-nums">
                    {formatRupiah(summary.totalPotentialGap)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="divide-y divide-hairline lg:hidden">
          {summaries.length === 0 && (
            <li>
              <NoMatchingRowsNotice onReset={resetSearchAndFilter} />
            </li>
          )}
          {summaries.map((summary) => (
            <li key={summary.facility.id} className="flex flex-col gap-3 p-4">
              <FacilityIdentity summary={summary} />
              <dl className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
                <FacilityCardStat label="Klaim">
                  <span className="text-ink tabular-nums">
                    {summary.claimCount}
                  </span>
                </FacilityCardStat>
                <FacilityCardStat label="Perlu klarifikasi">
                  <CountPill count={summary.flaggedClaimCount} />
                </FacilityCardStat>
                {TEST_TYPE_ORDER.map((testType) => (
                  <FacilityCardStat
                    key={testType}
                    label={TEST_TYPE_DETAILS[testType].title}
                  >
                    <CountPill count={summary.findingCounts[testType]} />
                  </FacilityCardStat>
                ))}
                <FacilityCardStat label="Potensi selisih">
                  <span className="font-medium text-ink tabular-nums">
                    {formatRupiah(summary.totalPotentialGap)}
                  </span>
                </FacilityCardStat>
              </dl>
            </li>
          ))}
        </ul>
      </div>
      {summaries.length > 0 && (
        <TablePagination
          firstRowIndex={firstRowIndex}
          pageRowCount={summaries.length}
          matchingRowCount={summaryPage.total}
          pageIndex={summaryPage.page - 1}
          pageCount={pageCount}
          rowNoun="faskes"
          onPageChange={table.setPageIndex}
        />
      )}
    </div>
  );
}
