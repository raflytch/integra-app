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
          spacing={2}
          className="flex-wrap"
        >
          {filterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-8 rounded-full border border-hairline bg-surface px-3 text-small font-medium text-ink-secondary hover:bg-subtle hover:text-ink data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
        <ClaimQueueTable key={queueFilter} claims={claimQueueQuery.data} />
      )}
    </div>
  );
}
