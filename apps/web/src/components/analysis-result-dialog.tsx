'use client';

import { LuSparkles } from 'react-icons/lu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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

/** Short summary shown after an AI analysis run succeeds. */
export function AnalysisResultDialog({
  open,
  onOpenChange,
  summary,
  stats,
  continueLabel,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  stats: AnalysisResultStat[];
  /** Offered when more claims still wait for the AI. */
  continueLabel?: string;
  onContinue?: () => void;
}) {
  const canContinue = Boolean(continueLabel && onContinue);

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
          {canContinue ? (
            <>
              <AlertDialogCancel>Tutup</AlertDialogCancel>
              <AlertDialogAction onClick={onContinue}>
                {continueLabel}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction>Tutup</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
