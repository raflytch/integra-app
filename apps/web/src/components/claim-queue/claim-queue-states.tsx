import { LuListOrdered } from 'react-icons/lu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_ROW_COUNT = 5;

export function ClaimQueueSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface shadow-xs p-4"
      aria-busy="true"
    >
      <span className="sr-only">Memuat antrean klaim</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-14 rounded-md bg-subtle" />
      ))}
    </div>
  );
}

export function ClaimQueueEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuListOrdered />
        </EmptyMedia>
        <EmptyTitle className="text-ink">{title}</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
