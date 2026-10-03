'use client';

import { useState } from 'react';
import type { IconType } from 'react-icons';
import { LuCircleCheck, LuCircleX, LuCopy } from 'react-icons/lu';
import { Pill } from '@/components/claim-pills';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTableControls } from '@/hooks/use-table-controls';
import { formatDate } from '@/lib/format';
import type { ClaimPreviewRow, ClaimPreviewStatus } from '@/types/import.types';

const ROWS_PER_PAGE = 10;
const COLUMN_COUNT = 6;
const ALL = 'ALL';

type StatusFilter = typeof ALL | ClaimPreviewStatus;

const STATUS_APPEARANCE: Record<
  ClaimPreviewStatus,
  { label: string; tone: 'success' | 'error' | 'warning'; icon: IconType }
> = {
  VALID: { label: 'Valid', tone: 'success', icon: LuCircleCheck },
  INVALID: { label: 'Tidak valid', tone: 'error', icon: LuCircleX },
  DUPLICATE: { label: 'Duplikat', tone: 'warning', icon: LuCopy },
};

const STATUS_OPTIONS: FilterOption<StatusFilter>[] = [
  { value: ALL, label: 'Semua' },
  ...(Object.keys(STATUS_APPEARANCE) as ClaimPreviewStatus[]).map((status) => ({
    value: status,
    label: STATUS_APPEARANCE[status].label,
  })),
];

const STATUS_ORDER: Record<ClaimPreviewStatus, number> = {
  INVALID: 0,
  DUPLICATE: 1,
  VALID: 2,
};

const PREVIEW_SORT_VALUES = {
  index: (row: ClaimPreviewRow) => row.index,
  claimNo: (row: ClaimPreviewRow) => row.claimNo ?? '',
  admittedAt: (row: ClaimPreviewRow) => row.claim?.admittedAt ?? '',
  status: (row: ClaimPreviewRow) => STATUS_ORDER[row.status],
};

type PreviewSortKey = keyof typeof PREVIEW_SORT_VALUES;

/** Sorting for the phone card list, which has no column headers. */
const PREVIEW_SORT_OPTIONS: SortOption<PreviewSortKey>[] = [
  { key: 'index', direction: 'asc', label: 'Urutan file' },
  { key: 'status', direction: 'asc', label: 'Bermasalah dulu' },
  { key: 'claimNo', direction: 'asc', label: 'Nomor klaim' },
  { key: 'admittedAt', direction: 'desc', label: 'Rawat inap terbaru' },
];

function formatAdmission({ claim }: ClaimPreviewRow): string {
  return claim
    ? `${formatDate(claim.admittedAt)} – ${formatDate(claim.dischargedAt)}`
    : '-';
}

function PreviewIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return <span className="text-small text-ink-secondary">-</span>;
  }
  return (
    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-small text-ink-secondary">
      {issues.map((issue) => (
        <li key={issue}>{issue}</li>
      ))}
    </ul>
  );
}

function toPreviewSearchText({ claimNo, claim, issues }: ClaimPreviewRow) {
  return [
    claimNo,
    claim?.facility.name,
    claim?.facility.code,
    claim?.patient.name,
    ...issues,
  ].join(' ');
}

export function ImportPreviewStatusPill({
  status,
}: {
  status: ClaimPreviewStatus;
}) {
  const { label, tone, icon } = STATUS_APPEARANCE[status];
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}

export function ImportPreviewTable({ rows }: { rows: ClaimPreviewRow[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const table = useTableControls({
    rows: rows.filter(
      (row) => statusFilter === ALL || row.status === statusFilter,
    ),
    toSearchText: toPreviewSearchText,
    sortValues: PREVIEW_SORT_VALUES,
    initialSort: { key: 'index', direction: 'asc' },
    pageSize: ROWS_PER_PAGE,
  });

  function resetSearchAndFilter() {
    table.setSearchQuery('');
    setStatusFilter(ALL);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      <TableToolbar>
        <TableSearch
          value={table.searchQuery}
          onChange={table.setSearchQuery}
          placeholder="Cari nomor klaim, faskes, pasien, atau masalah"
        />
        <TableFilterSelect
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(status) => {
            setStatusFilter(status);
            table.resetPage();
          }}
        />
        <TableSortSelect
          sort={table.sort}
          options={PREVIEW_SORT_OPTIONS}
          onChange={table.setSort}
        />
      </TableToolbar>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableTableHead
                sortKey="index"
                sort={table.sort}
                onSort={table.toggleSort}
              >
                No
              </SortableTableHead>
              <SortableTableHead
                sortKey="claimNo"
                sort={table.sort}
                onSort={table.toggleSort}
              >
                Nomor klaim
              </SortableTableHead>
              <TableHead>Faskes dan pasien</TableHead>
              <SortableTableHead
                sortKey="admittedAt"
                sort={table.sort}
                onSort={table.toggleSort}
              >
                Rawat inap
              </SortableTableHead>
              <SortableTableHead
                sortKey="status"
                sort={table.sort}
                onSort={table.toggleSort}
              >
                Status
              </SortableTableHead>
              <TableHead>Masalah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.length === 0 && (
              <NoMatchingRows
                columnCount={COLUMN_COUNT}
                onReset={resetSearchAndFilter}
              />
            )}
            {table.pageRows.map((row) => (
              <TableRow key={row.index} className="align-top">
                <TableCell className="text-ink-secondary tabular-nums">
                  {row.index + 1}
                </TableCell>
                <TableCell className="font-mono text-small text-ink">
                  {row.claimNo ?? (
                    <span className="font-sans text-ink-secondary">
                      Tanpa nomor
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.claim ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-small text-ink">
                        {row.claim.facility.name}
                      </span>
                      <span className="text-caption text-ink-secondary">
                        {row.claim.patient.name} · {row.claim.documents.length}{' '}
                        dokumen
                      </span>
                    </div>
                  ) : (
                    <span className="text-small text-ink-secondary">-</span>
                  )}
                </TableCell>
                <TableCell className="text-small whitespace-nowrap text-ink-secondary tabular-nums">
                  {formatAdmission(row)}
                </TableCell>
                <TableCell>
                  <ImportPreviewStatusPill status={row.status} />
                </TableCell>
                <TableCell className="min-w-56 whitespace-normal">
                  <PreviewIssues issues={row.issues} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y divide-hairline lg:hidden">
        {table.pageRows.length === 0 && (
          <li>
            <NoMatchingRowsNotice onReset={resetSearchAndFilter} />
          </li>
        )}
        {table.pageRows.map((row) => (
          <li key={row.index} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 font-mono text-small break-all text-ink">
                {row.claimNo ?? (
                  <span className="font-sans text-ink-secondary">
                    Tanpa nomor
                  </span>
                )}
              </span>
              <span className="shrink-0 text-caption text-ink-secondary tabular-nums">
                #{row.index + 1}
              </span>
            </div>
            <ImportPreviewStatusPill status={row.status} />
            {row.claim && (
              <div className="flex flex-col gap-0.5">
                <span className="text-small text-ink">
                  {row.claim.facility.name}
                </span>
                <span className="text-caption text-ink-secondary">
                  {row.claim.patient.name} · {row.claim.documents.length}{' '}
                  dokumen · {formatAdmission(row)}
                </span>
              </div>
            )}
            {row.issues.length > 0 && <PreviewIssues issues={row.issues} />}
          </li>
        ))}
      </ul>
      {table.matchingRowCount > 0 && (
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
