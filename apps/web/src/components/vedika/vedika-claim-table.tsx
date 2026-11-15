'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  LuCircleCheck,
  LuFileText,
  LuInbox,
  LuRefreshCw,
} from 'react-icons/lu';
import { CareTypePill, ClaimStatusPill } from '@/components/claim-pills';
import { CENTERED_COLUMN_CLASS_NAME } from '@/components/data-table/centered-column';
import { SortableTableHead } from '@/components/data-table/sortable-table-head';
import { TablePagination } from '@/components/data-table/table-pagination';
import {
  NoMatchingRows,
  TableSearch,
  TableToolbar,
} from '@/components/data-table/table-toolbar';
import { LoadError } from '@/components/load-error';
import { StatusFilterTabs } from '@/components/status-filter-tabs';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  fetchVedikaClaimPage,
  refreshAllVedika,
} from '@/services/vedika.service';
import type {
  VedikaClaimParams,
  VedikaClaimSortKey,
  VedikaSyncState,
} from '@/types/vedika.types';
import {
  FRIENDLY_RETRY_MESSAGE,
  VEDIKA_SYNC_STATE_APPEARANCE,
  VedikaSyncPill,
} from './vedika-details';
import { VedikaStatusDialog } from './vedika-status-dialog';

const CLAIMS_PER_PAGE = 10;
const COLUMN_COUNT = 7;
const SKELETON_ROW_COUNT = 4;

const ALL = 'ALL';
const SYNC_STATE_FILTERS: VedikaSyncState[] = ['LATEST', 'SENT', 'VERIFIED'];

type SyncStateFilter = typeof ALL | VedikaSyncState;

const INITIAL_VEDIKA_SORT: TableSort<VedikaClaimSortKey> = {
  key: 'admittedAt',
  direction: 'desc',
};

function VedikaClaimTableSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
      aria-busy="true"
    >
      <span className="sr-only">Memuat rincian klaim</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-12 rounded-md bg-subtle" />
      ))}
    </div>
  );
}

function VedikaClaimEmpty() {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuInbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-ink">Belum ada klaim</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          Rincian klaim tampil di sini setelah klaim tersedia.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function VedikaClaimTable() {
  const queryClient = useQueryClient();
  const [syncStateFilter, setSyncStateFilter] = useState<SyncStateFilter>(ALL);
  const table = useServerTableControls({ initialSort: INITIAL_VEDIKA_SORT });
  const claimParams: VedikaClaimParams = {
    search: table.debouncedSearchQuery || undefined,
    syncState: syncStateFilter === ALL ? undefined : syncStateFilter,
    sortBy: table.sort.key,
    sortDirection: table.sort.direction,
    page: table.pageIndex + 1,
    pageSize: CLAIMS_PER_PAGE,
  };
  const claimQuery = useQuery({
    queryKey: ['vedika', 'claims', claimParams],
    queryFn: () => fetchVedikaClaimPage(claimParams),
    placeholderData: keepPreviousData,
  });
  const refreshAllMutation = useMutation({
    mutationFn: refreshAllVedika,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vedika'] }),
        queryClient.invalidateQueries({ queryKey: ['claims'] }),
      ]),
  });

  if (claimQuery.isPending) return <VedikaClaimTableSkeleton />;
  if (claimQuery.isError) {
    return (
      <LoadError
        title="Rincian klaim gagal dimuat"
        onRetry={() => claimQuery.refetch()}
      />
    );
  }

  const claimPage = claimQuery.data;
  const hasSearchOrFilter =
    Boolean(table.debouncedSearchQuery) || syncStateFilter !== ALL;
  if (claimPage.total === 0 && !hasSearchOrFilter) {
    return <VedikaClaimEmpty />;
  }
  const claims = claimPage.items;
  const firstRowIndex = (claimPage.page - 1) * claimPage.pageSize;
  const pageCount = Math.max(
    1,
    Math.ceil(claimPage.total / claimPage.pageSize),
  );
  const bulkRefreshResult = refreshAllMutation.data;

  function resetSearchAndFilter() {
    table.setSearchQuery('');
    setSyncStateFilter(ALL);
    table.setSort(INITIAL_VEDIKA_SORT);
  }

  const syncStateCounts = claimPage.syncStateCounts;
  const allClaimCount = SYNC_STATE_FILTERS.reduce(
    (total, syncState) => total + syncStateCounts[syncState],
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <StatusFilterTabs<SyncStateFilter>
        tabs={[
          ...SYNC_STATE_FILTERS.map((syncState) => ({
            value: syncState,
            label: VEDIKA_SYNC_STATE_APPEARANCE[syncState].label,
            count: syncStateCounts[syncState],
          })),
          { value: ALL, label: 'Semua', count: allClaimCount },
        ]}
        value={syncStateFilter}
        onChange={(selectedFilter) => {
          setSyncStateFilter(selectedFilter);
          table.resetPage();
        }}
        ariaLabel="Filter status VEDIKA"
      />
      {bulkRefreshResult && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-small text-success-ink"
        >
          <LuCircleCheck aria-hidden="true" className="size-4 shrink-0" />
          {bulkRefreshResult.refreshedClaimCount > 0
            ? `${bulkRefreshResult.refreshedClaimCount.toLocaleString('id-ID')} klaim terkirim terverifikasi pada ${formatDateTime(bulkRefreshResult.syncedAt)}.`
            : 'Belum ada klaim terkirim untuk diverifikasi.'}
        </p>
      )}
      {refreshAllMutation.isError && (
        <p role="alert" className="text-small text-error-ink">
          Data VEDIKA gagal diperbarui. {FRIENDLY_RETRY_MESSAGE}
        </p>
      )}
      <div className="overflow-hidden border border-hairline bg-surface shadow-xs">
        <TableToolbar>
          <TableSearch
            value={table.searchQuery}
            onChange={table.setSearchQuery}
            placeholder="Cari no. klaim, pasien, atau faskes"
          />
          <Button
            className="sm:ml-auto"
            disabled={refreshAllMutation.isPending}
            onClick={() => refreshAllMutation.mutate()}
          >
            <LuRefreshCw
              aria-hidden="true"
              className={cn(
                refreshAllMutation.isPending && 'motion-safe:animate-spin',
              )}
            />
            {refreshAllMutation.isPending
              ? 'Menarik semua data…'
              : 'Refresh semua data'}
          </Button>
        </TableToolbar>
        <div
          aria-busy={claimQuery.isPlaceholderData}
          className="motion-safe:transition-opacity motion-safe:duration-200 aria-busy:opacity-60"
        >
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
                <TableHead>Diagnosis utama</TableHead>
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
                  className={CENTERED_COLUMN_CLASS_NAME}
                >
                  Perawatan
                </SortableTableHead>
                <TableHead className={CENTERED_COLUMN_CLASS_NAME}>
                  Status VEDIKA
                </TableHead>
                <SortableTableHead
                  sortKey="syncedAt"
                  sort={table.sort}
                  onSort={table.toggleSort}
                  className={CENTERED_COLUMN_CLASS_NAME}
                >
                  Diperbarui
                </SortableTableHead>
                <TableHead className={CENTERED_COLUMN_CLASS_NAME}>
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.length === 0 && (
                <NoMatchingRows
                  columnCount={COLUMN_COUNT}
                  onReset={resetSearchAndFilter}
                />
              )}
              {claims.map((claim) => (
                <TableRow key={claim.claimId}>
                  <TableCell className="min-w-44 whitespace-normal">
                    <div className="flex flex-col items-start gap-1">
                      <Link
                        href={`/claims/${claim.claimId}`}
                        className="font-mono text-caption font-medium text-primary-hover hover:underline"
                      >
                        {claim.claimNo}
                      </Link>
                      <span className="text-small text-ink">
                        {claim.patientName}
                      </span>
                      <ClaimStatusPill status={claim.claimStatus} />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-40 whitespace-normal text-ink">
                    {claim.primaryDiagnosis ?? '-'}
                  </TableCell>
                  <TableCell className="min-w-36 whitespace-normal text-ink">
                    {claim.facilityName}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <CareTypePill careType={claim.careType} />
                      <span className="text-caption text-ink-secondary">
                        {formatDate(claim.admittedAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <VedikaSyncPill syncState={claim.syncState} />
                      {claim.attachmentCount > 0 && (
                        <span className="text-caption text-ink-secondary tabular-nums">
                          {claim.attachmentCount} lampiran
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-ink-secondary">
                    {claim.syncState === 'VERIFIED' && claim.syncedAt
                      ? formatDateTime(claim.syncedAt)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <VedikaStatusDialog
                      claimId={claim.claimId}
                      claimNo={claim.claimNo}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Lihat dokumen dan rincian ${claim.claimNo}`}
                        >
                          <LuFileText aria-hidden="true" />
                          Lihat
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          firstRowIndex={firstRowIndex}
          pageRowCount={claims.length}
          matchingRowCount={claimPage.total}
          pageIndex={claimPage.page - 1}
          pageCount={pageCount}
          rowNoun="klaim"
          onPageChange={table.setPageIndex}
        />
      </div>
    </div>
  );
}
