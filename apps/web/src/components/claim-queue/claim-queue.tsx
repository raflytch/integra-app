'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fetchClaimStatistics } from '@/services/claim.service';
import type { ClaimStatistics } from '@/types/claim.types';
import type { QueueFilter, QueueFilterOption } from './claim-queue-filters';
import { ClaimQueueTable } from './claim-queue-table';

function countClaims(
  statistics: ClaimStatistics,
  queueFilter: QueueFilter,
): number {
  return queueFilter === 'ALL'
    ? statistics.totalCount
    : statistics.statusCounts[queueFilter];
}

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
  const statisticsQuery = useQuery({
    queryKey: ['claims', 'statistics'],
    queryFn: fetchClaimStatistics,
    enabled: filterOptions.length > 1,
  });

  return (
    <div className="flex flex-col gap-4">
      {filterOptions.length > 1 && (
        <div className="flex flex-col gap-2">
          <ToggleGroup
            type="single"
            value={queueFilter}
            onValueChange={(selectedFilter) =>
              selectedFilter && setQueueFilter(selectedFilter as QueueFilter)
            }
            aria-label="Filter status klaim"
            spacing={2}
            className="flex-wrap"
          >
            {filterOptions.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="group h-8 gap-1.5 rounded-full border border-hairline bg-surface px-3 text-small font-medium text-ink-secondary hover:bg-subtle hover:text-ink data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.label}
                {statisticsQuery.data && (
                  <span className="rounded-full bg-subtle px-1.5 text-caption text-ink-secondary tabular-nums group-data-[state=on]:bg-primary-foreground/20 group-data-[state=on]:text-primary-foreground">
                    {countClaims(
                      statisticsQuery.data,
                      option.value,
                    ).toLocaleString('id-ID')}
                  </span>
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-small text-ink-secondary">
            {activeFilterOption.description}
          </p>
        </div>
      )}
      <ClaimQueueTable
        key={queueFilter}
        status={queueFilter === 'ALL' ? undefined : queueFilter}
        emptyTitle={activeFilterOption.emptyTitle}
        emptyDescription={activeFilterOption.emptyDescription}
      />
    </div>
  );
}
