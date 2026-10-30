'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Pill } from '@/components/claim-pills';
import { SortableTableHead } from '@/components/data-table/sortable-table-head';
import { TablePagination } from '@/components/data-table/table-pagination';
import {
  NoMatchingRows,
  NoMatchingRowsNotice,
  type SortOption,
  TableSearch,
  TableSortSelect,
  TableToolbar,
} from '@/components/data-table/table-toolbar';
import { LoadError } from '@/components/load-error';
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
import { formatDateTime } from '@/lib/format';
import { fetchClaimAiUsagePage } from '@/services/ai-usage.service';
import { isForbiddenError } from '@/services/auth.service';
import type {
  ClaimAiUsage,
  ClaimAiUsageParams,
  ClaimAiUsageSortKey,
} from '@/types/ai-usage.types';
import { formatEstimatedCost, formatTokens } from './ai-usage-format';
import { ClaimAiUsageTableSkeleton } from './ai-usage-states';

const CLAIMS_PER_PAGE = 10;
const COLUMN_COUNT = 7;

const INITIAL_SORT: TableSort<ClaimAiUsageSortKey> = {
  key: 'lastExtractedAt',
  direction: 'desc',
};

/** Sorting for the card list below `lg`, which has no column headers. */
const SORT_OPTIONS: SortOption<ClaimAiUsageSortKey>[] = [
  { key: 'lastExtractedAt', direction: 'desc', label: 'Terakhir dibaca AI' },
  { key: 'inputTokens', direction: 'desc', label: 'Token input terbanyak' },
  { key: 'outputTokens', direction: 'desc', label: 'Token output terbanyak' },
  { key: 'documentCount', direction: 'desc', label: 'Dokumen terbanyak' },
  { key: 'claimNo', direction: 'asc', label: 'Nomor klaim' },
];

function ClaimIdentity({ usage }: { usage: ClaimAiUsage }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Link
        href={`/claims/${usage.claimId}`}
        className="font-mono text-small font-medium text-primary underline-offset-4 hover:underline"
      >
        {usage.claimNo}
      </Link>
      <span className="text-caption text-ink-secondary">
        {usage.facilityName}
      </span>
    </div>
  );
}

function ModelPills({ models }: { models: string[] }) {
  if (models.length === 0) {
    return <span className="text-small text-ink-secondary">–</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {models.map((model) => (
        <Pill key={model} tone="outline" className="font-mono">
          {model}
        </Pill>
      ))}
    </div>
  );
}

function CardStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd className="text-small text-ink tabular-nums">{children}</dd>
    </div>
  );
}

function ClaimAiUsageSection({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
        Per klaim
      </h2>
      {children}
    </section>
  );
}

/**
 * Server-paged AI usage per claim: the API aggregates, searches, and sorts.
 * Renders nothing without usage, because the overview explains that state.
 */
export function ClaimAiUsageTable() {
  const table = useServerTableControls({ initialSort: INITIAL_SORT });
  const usageParams: ClaimAiUsageParams = {
    search: table.debouncedSearchQuery || undefined,
    sortBy: table.sort.key,
    sortDirection: table.sort.direction,
    page: table.pageIndex + 1,
    pageSize: CLAIMS_PER_PAGE,
  };
  const usageQuery = useQuery({
    queryKey: ['ai-usage', 'claims', usageParams],
    queryFn: () => fetchClaimAiUsagePage(usageParams),
    placeholderData: keepPreviousData,
  });

  if (usageQuery.isPending) {
    return (
      <ClaimAiUsageSection>
        <ClaimAiUsageTableSkeleton />
      </ClaimAiUsageSection>
    );
  }
  if (usageQuery.isError) {
    // The overview already shows the supervisor-only notice.
    if (isForbiddenError(usageQuery.error)) return null;
    return (
      <ClaimAiUsageSection>
        <LoadError
          title="Penggunaan AI per klaim gagal dimuat"
          onRetry={() => usageQuery.refetch()}
        />
      </ClaimAiUsageSection>
    );
  }

  const usagePage = usageQuery.data;
  if (usagePage.total === 0 && !table.debouncedSearchQuery) return null;
  const usages = usagePage.items;
  const firstRowIndex = (usagePage.page - 1) * usagePage.pageSize;
  const pageCount = Math.max(
    1,
    Math.ceil(usagePage.total / usagePage.pageSize),
  );

  function resetSearch() {
    table.setSearchQuery('');
    table.setSort(INITIAL_SORT);
  }

  return (
    <ClaimAiUsageSection>
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
        <TableToolbar>
          <TableSearch
            value={table.searchQuery}
            onChange={table.setSearchQuery}
            placeholder="Cari nomor klaim atau faskes"
          />
          <TableSortSelect
            sort={table.sort}
            options={SORT_OPTIONS}
            onChange={table.setSort}
          />
        </TableToolbar>
        <div
          aria-busy={usageQuery.isPlaceholderData}
          className="motion-safe:transition-opacity motion-safe:duration-200 aria-busy:opacity-60"
        >
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead
                    sortKey="claimNo"
                    sort={table.sort}
                    onSort={table.toggleSort}
                  >
                    Klaim
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="documentCount"
                    sort={table.sort}
                    onSort={table.toggleSort}
                    align="right"
                  >
                    Dokumen
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="inputTokens"
                    sort={table.sort}
                    onSort={table.toggleSort}
                    align="right"
                  >
                    Token input
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="outputTokens"
                    sort={table.sort}
                    onSort={table.toggleSort}
                    align="right"
                  >
                    Token output
                  </SortableTableHead>
                  <TableHead className="text-right">Estimasi biaya</TableHead>
                  <TableHead>Model</TableHead>
                  <SortableTableHead
                    sortKey="lastExtractedAt"
                    sort={table.sort}
                    onSort={table.toggleSort}
                  >
                    Terakhir dibaca
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usages.length === 0 && (
                  <NoMatchingRows
                    columnCount={COLUMN_COUNT}
                    onReset={resetSearch}
                  />
                )}
                {usages.map((usage) => (
                  <TableRow key={usage.claimId}>
                    <TableCell className="min-w-48 whitespace-normal">
                      <ClaimIdentity usage={usage} />
                    </TableCell>
                    <TableCell className="text-right text-ink tabular-nums">
                      {usage.documentCount}
                    </TableCell>
                    <TableCell className="text-right text-ink tabular-nums">
                      {formatTokens(usage.inputTokens)}
                    </TableCell>
                    <TableCell className="text-right text-ink tabular-nums">
                      {formatTokens(usage.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-ink tabular-nums">
                      {formatEstimatedCost(usage.estimatedCost)}
                    </TableCell>
                    <TableCell>
                      <ModelPills models={usage.models} />
                    </TableCell>
                    <TableCell className="text-small text-ink-secondary tabular-nums">
                      {formatDateTime(usage.lastExtractedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-hairline lg:hidden">
            {usages.length === 0 && (
              <li>
                <NoMatchingRowsNotice onReset={resetSearch} />
              </li>
            )}
            {usages.map((usage) => (
              <li key={usage.claimId} className="flex flex-col gap-3 p-4">
                <ClaimIdentity usage={usage} />
                <dl className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
                  <CardStat label="Dokumen">{usage.documentCount}</CardStat>
                  <CardStat label="Token input">
                    {formatTokens(usage.inputTokens)}
                  </CardStat>
                  <CardStat label="Token output">
                    {formatTokens(usage.outputTokens)}
                  </CardStat>
                  <CardStat label="Estimasi biaya">
                    {formatEstimatedCost(usage.estimatedCost)}
                  </CardStat>
                  <CardStat label="Terakhir dibaca">
                    {formatDateTime(usage.lastExtractedAt)}
                  </CardStat>
                </dl>
                <ModelPills models={usage.models} />
              </li>
            ))}
          </ul>
        </div>
        {usages.length > 0 && (
          <TablePagination
            firstRowIndex={firstRowIndex}
            pageRowCount={usages.length}
            matchingRowCount={usagePage.total}
            pageIndex={usagePage.page - 1}
            pageCount={pageCount}
            rowNoun="klaim"
            onPageChange={table.setPageIndex}
          />
        )}
      </div>
    </ClaimAiUsageSection>
  );
}
