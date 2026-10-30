import { LuCpu, LuLock } from 'react-icons/lu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_ROW_COUNT = 4;

export function ClaimAiUsageTableSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-4 shadow-xs"
      aria-busy="true"
    >
      <span className="sr-only">Memuat penggunaan AI per klaim</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-12 rounded-md bg-subtle" />
      ))}
    </div>
  );
}

export function AiUsageForbidden() {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuLock />
        </EmptyMedia>
        <EmptyTitle className="text-ink">Khusus supervisor</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          Penggunaan dan biaya AI hanya dapat dibuka oleh akun supervisor.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AiUsageEmpty() {
  return (
    <Empty className="rounded-xl border border-hairline bg-surface shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-subtle text-ink">
          <LuCpu />
        </EmptyMedia>
        <EmptyTitle className="text-ink">Belum ada penggunaan AI</EmptyTitle>
        <EmptyDescription className="text-ink-secondary">
          Token tercatat setiap kali AI membaca dokumen saat Analisis AI
          dijalankan.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
