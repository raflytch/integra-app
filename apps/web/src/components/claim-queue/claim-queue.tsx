'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StatusFilterTabs } from '@/components/status-filter-tabs';
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
        <StatusFilterTabs
          tabs={filterOptions.map((option) => ({
            value: option.value,
            label: option.label,
            count:
              statisticsQuery.data &&
              countClaims(statisticsQuery.data, option.value),
          }))}
          value={queueFilter}
          onChange={setQueueFilter}
          ariaLabel="Filter status klaim"
        />
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
