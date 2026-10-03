'use client';

import { useState } from 'react';
import { FacilityTypePill, Pill } from '@/components/claim-pills';
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
import { TEST_TYPE_DETAILS, TEST_TYPE_ORDER } from '@/lib/claim-labels';
import { formatRupiah } from '@/lib/format';
import type { FacilityType } from '@/types/claim.types';
import type { FacilitySummary } from '@/types/facility.types';

const FACILITIES_PER_PAGE = 20;
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

const FACILITY_SORT_VALUES = {
  facility: (summary: FacilitySummary) => summary.facility.name,
  claimCount: (summary: FacilitySummary) => summary.claimCount,
  flaggedClaimCount: (summary: FacilitySummary) => summary.flaggedClaimCount,
  EXISTENCE: (summary: FacilitySummary) => summary.findingCounts.EXISTENCE,
  CONSISTENCY: (summary: FacilitySummary) => summary.findingCounts.CONSISTENCY,
  SIMILARITY: (summary: FacilitySummary) => summary.findingCounts.SIMILARITY,
  totalPotentialGap: (summary: FacilitySummary) => summary.totalPotentialGap,
};

function toFacilitySearchText(summary: FacilitySummary): string {
  const { name, code, city } = summary.facility;
  return `${name} ${code} ${city}`;
}

function CountPill({ count }: { count: number }) {
  return (
    <Pill tone={count > 0 ? 'warning' : 'neutral'} className="tabular-nums">
      {count}
    </Pill>
  );
}

export function FacilitySummaryTable({
  facilitySummaries,
}: {
  facilitySummaries: FacilitySummary[];
}) {
  const [facilityTypeFilter, setFacilityTypeFilter] =
    useState<FacilityTypeFilter>(ALL);
  const table = useTableControls({
    rows: facilitySummaries.filter(
      (summary) =>
        facilityTypeFilter === ALL ||
        summary.facility.type === facilityTypeFilter,
    ),
    toSearchText: toFacilitySearchText,
    sortValues: FACILITY_SORT_VALUES,
    initialSort: { key: 'totalPotentialGap', direction: 'desc' },
    pageSize: FACILITIES_PER_PAGE,
  });

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
      </TableToolbar>
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
          {table.pageRows.length === 0 && (
            <NoMatchingRows
              columnCount={COLUMN_COUNT}
              onReset={() => {
                table.setSearchQuery('');
                setFacilityTypeFilter(ALL);
              }}
            />
          )}
          {table.pageRows.map((summary) => (
            <TableRow key={summary.facility.id}>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium text-ink">
                    {summary.facility.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <FacilityTypePill facilityType={summary.facility.type} />
                    <span className="font-mono text-caption text-ink-secondary">
                      {summary.facility.code} · {summary.facility.city}
                    </span>
                  </div>
                </div>
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
      {table.pageRows.length > 0 && (
        <TablePagination
          firstRowIndex={table.firstRowIndex}
          pageRowCount={table.pageRows.length}
          matchingRowCount={table.matchingRowCount}
          pageIndex={table.pageIndex}
          pageCount={table.pageCount}
          rowNoun="faskes"
          onPageChange={table.setPageIndex}
        />
      )}
    </div>
  );
}
