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
  TableFilterSelect,
  TableSearch,
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

const ROWS_PER_PAGE = 20;
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
      </TableToolbar>
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
              onReset={() => {
                table.setSearchQuery('');
                setStatusFilter(ALL);
              }}
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
                {row.claim
                  ? `${formatDate(row.claim.admittedAt)} – ${formatDate(row.claim.dischargedAt)}`
                  : '-'}
              </TableCell>
              <TableCell>
                <ImportPreviewStatusPill status={row.status} />
              </TableCell>
              <TableCell className="min-w-56 whitespace-normal">
                {row.issues.length > 0 ? (
                  <ul className="flex list-disc flex-col gap-0.5 pl-4 text-small text-ink-secondary">
                    {row.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-small text-ink-secondary">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
