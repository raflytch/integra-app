'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LuBuilding2, LuLock } from 'react-icons/lu';
import { LoadError } from '@/components/load-error';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { isForbiddenError } from '@/services/auth.service';
import { fetchFacilitySummaries } from '@/services/facility.service';
import type { FacilitySummary as FacilitySummaryData } from '@/types/facility.types';
import { FacilitySummaryTable } from './facility-summary-table';

const SKELETON_ROW_COUNT = 4;

function FacilitySummaryTableSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
      aria-busy="true"
    >
      <span className="sr-only">Memuat ringkasan faskes</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-12 rounded-md bg-subtle" />
      ))}
    </div>
  );
}

/** Loads facility summaries and renders the shared loading, access, error, and empty states. */
export function FacilitySummaryGate({
  loadingFallback,
  children,
}: {
  loadingFallback: ReactNode;
  children: (facilitySummaries: FacilitySummaryData[]) => ReactNode;
}) {
  const facilitySummaryQuery = useQuery({
    queryKey: ['facilities', 'summary'],
    queryFn: fetchFacilitySummaries,
  });

  if (facilitySummaryQuery.isPending) return loadingFallback;

  if (
    facilitySummaryQuery.isError &&
    isForbiddenError(facilitySummaryQuery.error)
  ) {
    return (
      <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-subtle text-ink">
            <LuLock />
          </EmptyMedia>
          <EmptyTitle className="text-ink">Khusus supervisor</EmptyTitle>
          <EmptyDescription className="text-ink-secondary">
            Ringkasan per faskes hanya dapat dibuka oleh akun supervisor.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (facilitySummaryQuery.isError) {
    return (
      <LoadError
        title="Ringkasan faskes gagal dimuat"
        onRetry={() => facilitySummaryQuery.refetch()}
      />
    );
  }

  if (facilitySummaryQuery.data.length === 0) {
    return (
      <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-subtle text-ink">
            <LuBuilding2 />
          </EmptyMedia>
          <EmptyTitle className="text-ink">Belum ada data faskes</EmptyTitle>
          <EmptyDescription className="text-ink-secondary">
            Ringkasan muncul setelah data klaim dimuat dan analisis dijalankan.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return children(facilitySummaryQuery.data);
}

export function FacilitySummary() {
  return (
    <FacilitySummaryGate loadingFallback={<FacilitySummaryTableSkeleton />}>
      {(facilitySummaries) => (
        <FacilitySummaryTable facilitySummaries={facilitySummaries} />
      )}
    </FacilitySummaryGate>
  );
}
