import { ListOrdered } from 'lucide-react';
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
      className="flex flex-col gap-2 rounded-xl border border-linen-border bg-eggshell-canvas p-4"
      aria-busy="true"
    >
      <span className="sr-only">Memuat antrean klaim</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-14 rounded-md bg-cloud-surface" />
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
    <Empty className="rounded-xl border border-dashed border-linen-border bg-cloud-surface">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-paper-beige text-graphite">
          <ListOrdered />
        </EmptyMedia>
        <EmptyTitle className="text-graphite">{title}</EmptyTitle>
        <EmptyDescription className="text-quiet-gray">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
