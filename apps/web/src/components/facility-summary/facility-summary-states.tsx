import { LuHospital, LuLock } from 'react-icons/lu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_ROW_COUNT = 4;

export function FacilitySummaryTableSkeleton() {
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

export function FacilitySummaryForbidden() {
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

export function FacilitySummaryEmpty() {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuHospital />
        </EmptyMedia>
        <EmptyTitle className="text-ink">Belum ada data faskes</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          Ringkasan muncul setelah data klaim dimuat dan analisis dijalankan.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
