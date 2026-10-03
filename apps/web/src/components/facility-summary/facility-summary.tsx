'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Lock } from 'lucide-react';
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
import { FacilitySummaryCharts } from './facility-summary-charts';
import { FacilitySummaryTable } from './facility-summary-table';

const SKELETON_ROW_COUNT = 4;

export function FacilitySummary() {
  const facilitySummaryQuery = useQuery({
    queryKey: ['facilities', 'summary'],
    queryFn: fetchFacilitySummaries,
  });

  if (facilitySummaryQuery.isPending) {
    return (
      <div
        className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface shadow-xs p-4"
        aria-busy="true"
      >
        <span className="sr-only">Memuat ringkasan faskes</span>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
          <Skeleton key={rowIndex} className="h-12 rounded-md bg-subtle" />
        ))}
      </div>
    );
  }

  if (
    facilitySummaryQuery.isError &&
    isForbiddenError(facilitySummaryQuery.error)
  ) {
    return (
      <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-subtle text-ink">
            <Lock />
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
            <Building2 />
          </EmptyMedia>
          <EmptyTitle className="text-ink">Belum ada data faskes</EmptyTitle>
          <EmptyDescription className="text-ink-secondary">
            Ringkasan muncul setelah data klaim dimuat dan analisis dijalankan.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FacilitySummaryCharts facilitySummaries={facilitySummaryQuery.data} />
      <FacilitySummaryTable facilitySummaries={facilitySummaryQuery.data} />
    </div>
  );
}
