'use client';

import { LuSparkles } from 'react-icons/lu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface AnalysisResultStat {
  label: string;
  value: string;
}

/** Short summary shown after an AI analysis run. Keep `stats` to an even count for the 2×2 grid. */
export function AnalysisResultDialog({
  open,
  onOpenChange,
  summary,
  stats,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  stats: AnalysisResultStat[];
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-10">
            <LuSparkles aria-hidden="true" className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Hasil analisis AI</AlertDialogTitle>
          <AlertDialogDescription>{summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-0.5 bg-canvas p-3"
            >
              <dt className="text-caption text-ink-secondary">{stat.label}</dt>
              <dd className="font-display text-body font-semibold text-ink tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <AlertDialogFooter>
          <AlertDialogAction>Tutup</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
