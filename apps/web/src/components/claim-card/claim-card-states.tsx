import { LuFileQuestion } from 'react-icons/lu';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export function ClaimCardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat Kartu Klaim</span>
      <Skeleton className="h-44 rounded-xl bg-subtle" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-xl bg-subtle" />
          <Skeleton className="h-28 rounded-xl bg-subtle" />
          <Skeleton className="h-28 rounded-xl bg-subtle" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 rounded-xl bg-subtle" />
          <Skeleton className="h-48 rounded-xl bg-subtle" />
        </div>
      </div>
    </div>
  );
}

export function ClaimNotFound() {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuFileQuestion />
        </EmptyMedia>
        <EmptyTitle className="text-ink">Klaim tidak ditemukan</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          Klaim ini tidak ada atau sudah tidak tersedia.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline" size="sm">
          <Link href="/claims">Kembali ke antrean</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
