'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LoadError } from '@/components/load-error';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fetchClaimQueue } from '@/services/claim.service';
import type { QueueFilter, QueueFilterOption } from './claim-queue-filters';
import { ClaimQueueEmpty, ClaimQueueSkeleton } from './claim-queue-states';
import { ClaimQueueTable } from './claim-queue-table';

export function ClaimQueue({
  filterOptions,
}: {
  filterOptions: QueueFilterOption[];
}) {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(
    filterOptions[0].value,
  );
  const activeFilterOption =
    filterOptions.find((option) => option.value === queueFilter) ??
    filterOptions[0];
  const claimQueueQuery = useQuery({
    queryKey: ['claims', 'queue', queueFilter],
    queryFn: () =>
      fetchClaimQueue(queueFilter === 'ALL' ? undefined : queueFilter),
  });

  return (
    <div className="flex flex-col gap-4">
      {filterOptions.length > 1 && (
        <ToggleGroup
          type="single"
          value={queueFilter}
          onValueChange={(selectedFilter) =>
            selectedFilter && setQueueFilter(selectedFilter as QueueFilter)
          }
          aria-label="Filter status klaim"
          data-tour="queue-filter"
          className="w-fit rounded-full bg-cloud-surface p-1"
        >
          {filterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-7 rounded-full px-3 text-[13px] font-medium text-quiet-gray data-[state=on]:bg-eggshell-canvas data-[state=on]:text-integra-deep data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,.05)]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {claimQueueQuery.isPending ? (
        <ClaimQueueSkeleton />
      ) : claimQueueQuery.isError ? (
        <LoadError
          title="Antrean klaim gagal dimuat"
          onRetry={() => claimQueueQuery.refetch()}
        />
      ) : claimQueueQuery.data.length === 0 ? (
        <ClaimQueueEmpty
          title={activeFilterOption.emptyTitle}
          description={activeFilterOption.emptyDescription}
        />
      ) : (
        <ClaimQueueTable claims={claimQueueQuery.data} />
      )}
    </div>
  );
}
