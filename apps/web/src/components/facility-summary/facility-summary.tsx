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
        className="flex flex-col gap-2 rounded-xl border border-linen-border bg-eggshell-canvas p-4"
        aria-busy="true"
      >
        <span className="sr-only">Memuat ringkasan faskes</span>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
          <Skeleton
            key={rowIndex}
            className="h-12 rounded-md bg-cloud-surface"
          />
        ))}
      </div>
    );
  }

  if (
    facilitySummaryQuery.isError &&
    isForbiddenError(facilitySummaryQuery.error)
  ) {
    return (
      <Empty className="rounded-xl border border-dashed border-linen-border bg-cloud-surface">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-paper-beige text-graphite">
            <Lock />
          </EmptyMedia>
          <EmptyTitle className="text-graphite">Khusus supervisor</EmptyTitle>
          <EmptyDescription className="text-quiet-gray">
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
      <Empty className="rounded-xl border border-dashed border-linen-border bg-cloud-surface">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-paper-beige text-graphite">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle className="text-graphite">
            Belum ada data faskes
          </EmptyTitle>
          <EmptyDescription className="text-quiet-gray">
            Ringkasan muncul setelah data klaim dimuat dan analisis dijalankan.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <FacilitySummaryTable facilitySummaries={facilitySummaryQuery.data} />;
}
