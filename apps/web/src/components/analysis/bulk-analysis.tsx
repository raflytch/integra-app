'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  LuCircleCheck,
  LuListChecks,
  LuSparkles,
  LuSquare,
  LuX,
} from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  type BulkAnalysisProgress,
  fetchBulkAnalysis,
  startBulkAnalysis,
  stopBulkAnalysis,
} from '@/services/analysis.service';

const BULK_ANALYSIS_QUERY_KEY = ['analysis', 'bulk'] as const;
const POLL_INTERVAL_MS = 1500;
const RULE_CLAIMS_PER_SECOND = 25;
const AI_CLAIMS_PER_SECOND = 2;
const EXPECTED_FLAGGED_SHARE = 0.2;
const AI_TOKENS_PER_CLAIM = 3000;

function formatCount(count: number): string {
  return count.toLocaleString('id-ID');
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `±${Math.max(1, Math.round(seconds))} detik`;
  return `±${Math.round(seconds / 60)} menit`;
}

function percentOf(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function useBulkAnalysis() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: BULK_ANALYSIS_QUERY_KEY,
    queryFn: fetchBulkAnalysis,
    refetchInterval: (state) =>
      state.state.data?.status === 'RUNNING' ? POLL_INTERVAL_MS : false,
  });
  const startMutation = useMutation({
    mutationFn: ({
      claimIds,
      confirmWithAi,
    }: {
      claimIds: string[];
      confirmWithAi: boolean;
    }) => startBulkAnalysis(claimIds, confirmWithAi),
    onSuccess: (progress) =>
      queryClient.setQueryData(BULK_ANALYSIS_QUERY_KEY, progress),
  });
  const stopMutation = useMutation({
    mutationFn: stopBulkAnalysis,
    onSuccess: (progress) =>
      queryClient.setQueryData(BULK_ANALYSIS_QUERY_KEY, progress),
  });

  const status = query.data?.status;
  const previousStatusRef = useRef(status);
  useEffect(() => {
    if (previousStatusRef.current === 'RUNNING' && status !== 'RUNNING') {
      void queryClient.invalidateQueries({ queryKey: ['claims'] });
    }
    previousStatusRef.current = status;
  }, [status, queryClient]);

  return {
    progress: query.data ?? null,
    isRunning: status === 'RUNNING',
    start: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    stop: () => stopMutation.mutate(),
    isStopping: stopMutation.isPending,
  };
}

export function BulkSelectionBar({
  selectedCount,
  resultCount,
  pageSelectionState,
  isSelectingAll,
  isBusy,
  onSelectPage,
  onSelectAllResults,
  onClear,
  onAnalyze,
}: {
  selectedCount: number;
  resultCount: number;
  pageSelectionState: boolean | 'indeterminate';
  isSelectingAll: boolean;
  isBusy: boolean;
  onSelectPage: (isSelected: boolean) => void;
  onSelectAllResults: () => void;
  onClear: () => void;
  onAnalyze: () => void;
}) {
  const hasSelection = selectedCount > 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-canvas px-3 py-2.5 lg:px-4">
      <div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-small text-ink lg:hidden">
          <Checkbox
            checked={pageSelectionState}
            onCheckedChange={(checked) => onSelectPage(checked === true)}
          />
          Pilih halaman ini
        </label>
        <p
          aria-live="polite"
          className="text-small text-ink-secondary tabular-nums"
        >
          {hasSelection ? (
            <span className="font-medium text-ink">
              {formatCount(selectedCount)} klaim dipilih
            </span>
          ) : (
            'Centang klaim untuk analisis massal.'
          )}
        </p>
        {selectedCount < resultCount && (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            disabled={isSelectingAll || isBusy}
            onClick={onSelectAllResults}
          >
            <LuListChecks aria-hidden="true" />
            Pilih semua {formatCount(resultCount)} hasil filter
          </Button>
        )}
      </div>
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        {hasSelection && (
          <Button
            variant="outline"
            className="h-9 flex-1 sm:flex-none"
            onClick={onClear}
            disabled={isBusy}
          >
            <LuX aria-hidden="true" />
            Batal pilih
          </Button>
        )}
        <Button
          className="h-9 flex-1 sm:flex-none"
          onClick={onAnalyze}
          disabled={!hasSelection || isBusy}
        >
          <LuSparkles aria-hidden="true" />
          Analisis massal{hasSelection && ` (${formatCount(selectedCount)})`}
        </Button>
      </div>
    </div>
  );
}

export function BulkAnalysisDialog({
  claimCount,
  isOpen,
  isStarting,
  onOpenChange,
  onConfirm,
}: {
  claimCount: number;
  isOpen: boolean;
  isStarting: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (confirmWithAi: boolean) => void;
}) {
  const [confirmWithAi, setConfirmWithAi] = useState(true);
  const expectedFlagged = Math.round(claimCount * EXPECTED_FLAGGED_SHARE);
  const ruleSeconds = claimCount / RULE_CLAIMS_PER_SECOND;
  const aiSeconds = expectedFlagged / AI_CLAIMS_PER_SECOND;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Analisis massal {formatCount(claimCount)} klaim
          </DialogTitle>
          <DialogDescription>
            Berjalan di server, jadi halaman ini boleh ditutup.
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-small text-ink">
          <li className="flex flex-col gap-0.5">
            <span className="font-medium">1. Pembacaan cepat oleh aturan</span>
            <span className="text-ink-secondary">
              Semua klaim dibaca dengan aturan INTEGRA (istilah PNPK, tanda
              vital, kata negasi) lalu diuji. {formatDuration(ruleSeconds)},
              tanpa biaya token.
            </span>
          </li>
          <li className="flex flex-col gap-0.5">
            <span className="font-medium">2. Konfirmasi AI</span>
            <span className="text-ink-secondary">
              AI membaca ulang klaim yang ditandai, yang terbesar potensi
              selisihnya lebih dulu. Biasanya ±{formatCount(expectedFlagged)}{' '}
              klaim, {formatDuration(aiSeconds)}, ±
              {formatCount(expectedFlagged * AI_TOKENS_PER_CLAIM)} token.
            </span>
          </li>
        </ol>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5 text-small text-ink">
          Konfirmasi klaim yang ditandai dengan AI
          <Switch checked={confirmWithAi} onCheckedChange={setConfirmWithAi} />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={isStarting}
            onClick={() => onConfirm(confirmWithAi)}
          >
            <LuSparkles aria-hidden="true" />
            Mulai analisis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgressRow({
  label,
  done,
  total,
  hint,
}: {
  label: string;
  done: number;
  total: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-small">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-secondary tabular-nums">
          {formatCount(done)} / {formatCount(total)}
        </span>
      </div>
      <Progress value={percentOf(done, total)} aria-label={label} />
      {hint && <span className="text-caption text-ink-secondary">{hint}</span>}
    </div>
  );
}

function elapsedSeconds(from: string, to: string | null): number {
  return (
    ((to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()) /
    1000
  );
}

export function BulkAnalysisProgressCard({
  progress,
  isStopping,
  onStop,
  onDismiss,
}: {
  progress: BulkAnalysisProgress;
  isStopping: boolean;
  onStop: () => void;
  onDismiss: () => void;
}) {
  const isRunning = progress.status === 'RUNNING';
  const triageSeconds = elapsedSeconds(
    progress.startedAt,
    progress.triageFinishedAt,
  );
  const totalSeconds = elapsedSeconds(progress.startedAt, progress.finishedAt);

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-4 border-b border-hairline bg-primary-wash px-4 py-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        {isRunning ? (
          <LuSparkles
            className="size-4 text-primary-hover motion-safe:animate-pulse"
            aria-hidden="true"
          />
        ) : (
          <LuCircleCheck
            className="size-4 text-primary-hover"
            aria-hidden="true"
          />
        )}
        <h2 className="text-small font-semibold text-ink">
          {isRunning
            ? 'Analisis massal berjalan'
            : progress.status === 'STOPPED'
              ? 'Analisis massal dihentikan'
              : 'Analisis massal selesai'}
        </h2>
        <span className="text-caption text-ink-secondary tabular-nums">
          {formatDuration(totalSeconds)}
        </span>
        <div className="ml-auto flex gap-2">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isStopping}
              onClick={onStop}
            >
              <LuSquare aria-hidden="true" />
              Hentikan
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <LuX aria-hidden="true" />
              Tutup
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressRow
          label="Pembacaan cepat oleh aturan"
          done={progress.triagedCount}
          total={progress.claimCount}
          hint={
            progress.triageFinishedAt
              ? `Selesai ${formatDuration(triageSeconds)}. ${formatCount(progress.flaggedCount)} klaim ditandai.`
              : `${formatCount(progress.flaggedCount)} klaim ditandai sejauh ini.`
          }
        />
        {progress.confirmWithAi ? (
          <ProgressRow
            label="Konfirmasi AI"
            done={progress.aiConfirmedCount}
            total={progress.aiTargetCount}
            hint={
              progress.triageFinishedAt
                ? 'Klaim yang ditandai dibaca ulang AI, potensi selisih terbesar lebih dulu.'
                : 'Mulai setelah pembacaan cepat selesai.'
            }
          />
        ) : (
          <p className="self-center text-small text-ink-secondary">
            Konfirmasi AI tidak dijalankan. Klaim yang ditandai bisa
            dikonfirmasi satu per satu lewat tombol Konfirmasi AI.
          </p>
        )}
      </div>
      {progress.failedCount > 0 && (
        <p className="text-caption text-error-ink">
          {formatCount(progress.failedCount)} klaim gagal diproses dan bisa
          dicoba lagi.
        </p>
      )}
    </section>
  );
}
