'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { IconType } from 'react-icons';
import {
  LuCheck,
  LuChevronDown,
  LuCircle,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuMinus,
  LuSquare,
  LuTimer,
  LuX,
} from 'react-icons/lu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  ANALYSIS_STEPS,
  ANALYSIS_TIMEOUT_MS,
  type AnalysisStep,
  type ClaimAnalysisResult,
} from '@/services/analysis.service';

/** Served from `public/`, so the 100 KB animation is fetched only when analysis starts. */
const LOADING_ANIMATION_PATH = '/animations/loading.json';
const ANIMATION_SIZE_CLASS_NAME = 'size-20 sm:size-24';

// lottie-web touches `document` on import, so it only loads in the browser.
const Lottie = dynamic(
  () => import('lottie-react').then((module) => module.LottieSvg),
  {
    ssr: false,
    loading: () => <div className={ANIMATION_SIZE_CLASS_NAME} />,
  },
);

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

type FailureReason = 'TIMED_OUT' | 'AI_UNAVAILABLE' | 'NOT_FOUND';

/** One selected claim and where it is in the run. */
export interface ClaimRun {
  id: string;
  claimNo: string;
  unreadDocumentCount: number;
  /** Stages the API reported, with the time each one arrived. */
  steps: { step: AnalysisStep; startedAt: number }[];
  state:
    | { status: 'QUEUED' }
    | { status: 'RUNNING'; startedAt: number }
    | {
        status: 'DONE';
        startedAt: number;
        durationMs: number;
        result: ClaimAnalysisResult;
      }
    | {
        status: 'FAILED';
        startedAt: number;
        durationMs: number;
        reason: FailureReason;
      };
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} dtk`;
}

function formatCount(count: number): string {
  return count.toLocaleString('id-ID');
}

function totalTokens(result: ClaimAnalysisResult): number {
  return result.tokenUsage.inputTokens + result.tokenUsage.outputTokens;
}

/** Current time, refreshed every 200ms while the overlay is open. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(intervalId);
  }, []);
  return now;
}

/** The bar never fills on time alone; only a finished claim completes its share. */
const MAX_TIME_BASED_CLAIM_SHARE = 0.9;

function progressPercent(claimRuns: ClaimRun[], now: number): number {
  if (claimRuns.length === 0) return 0;
  const progressedClaims = claimRuns.reduce((total, run) => {
    if (run.state.status === 'RUNNING') {
      return (
        total +
        Math.min(
          (now - run.state.startedAt) / ANALYSIS_TIMEOUT_MS,
          MAX_TIME_BASED_CLAIM_SHARE,
        )
      );
    }
    return run.state.status === 'QUEUED' ? total : total + 1;
  }, 0);
  return (progressedClaims / claimRuns.length) * 100;
}

const FAILURE_DETAILS: Record<FailureReason, string> = {
  TIMED_OUT: 'Lebih dari 1 menit, dihentikan',
  AI_UNAVAILABLE: 'AI tidak dapat dihubungi',
  NOT_FOUND: 'Klaim sudah dihapus, dilewati',
};

interface RunLine {
  icon: IconType | typeof Spinner;
  iconClassName: string;
  detail: string;
  detailClassName?: string;
  duration?: string;
}

function describeClaimRun(
  run: ClaimRun,
  now: number,
  isWindingDown: boolean,
): RunLine {
  const { state } = run;
  if (state.status === 'QUEUED') {
    return {
      icon: LuCircleDashed,
      iconClassName: 'text-ink-muted',
      detail: isWindingDown ? 'Tidak dijalankan' : 'Menunggu giliran',
      detailClassName: 'text-ink-muted',
    };
  }
  if (state.status === 'RUNNING') {
    const currentStep = run.steps.at(-1)?.step;
    return {
      icon: Spinner,
      iconClassName: 'text-primary motion-reduce:animate-none',
      detail: currentStep
        ? `${stepLabel(currentStep, run.unreadDocumentCount)}…`
        : 'Memulai analisis…',
      duration: formatElapsed(Math.floor((now - state.startedAt) / 1000)),
    };
  }
  const duration = formatDuration(state.durationMs);
  if (state.status === 'FAILED') {
    return {
      icon: LuCircleX,
      iconClassName: 'text-error',
      detail: FAILURE_DETAILS[state.reason],
      detailClassName: 'text-error-ink',
      duration,
    };
  }

  const { result } = state;
  const tokenCount = totalTokens(result);
  const tokenText =
    tokenCount > 0 ? ` · ${formatCount(tokenCount)} token` : ' · tanpa AI';
  if (!result.isAnalyzed) {
    return {
      icon: LuCircleAlert,
      iconClassName: 'text-warning',
      detail: `${formatCount(result.failedDocumentCount)} dokumen gagal dibaca; analisis ulang untuk mencoba lagi`,
      detailClassName: 'text-warning-ink',
      duration,
    };
  }
  return result.findingCount > 0
    ? {
        icon: LuCircleAlert,
        iconClassName: 'text-warning',
        detail: `${formatCount(result.findingCount)} temuan perlu klarifikasi${tokenText}`,
        detailClassName: 'text-warning-ink',
        duration,
      }
    : {
        icon: LuCircleCheck,
        iconClassName: 'text-success',
        detail: `Tidak ada temuan${tokenText}`,
        duration,
      };
}

function stepLabel(step: AnalysisStep, unreadDocumentCount: number): string {
  if (step === 'READING') {
    return unreadDocumentCount > 0
      ? `AI membaca ${formatCount(unreadDocumentCount)} dokumen`
      : 'Memuat bukti yang sudah dibaca AI';
  }
  return {
    EXISTENCE: 'Uji Ada',
    CONSISTENCY: 'Uji Konsisten',
    SIMILARITY: 'Uji Bukan Salinan',
  }[step];
}

type StepStatus = 'PENDING' | 'ACTIVE' | 'DONE' | 'FAILED' | 'SKIPPED';

const STEP_ICONS: Record<
  StepStatus,
  { icon: IconType | typeof Spinner; className: string }
> = {
  PENDING: { icon: LuCircle, className: 'text-hairline' },
  ACTIVE: {
    icon: Spinner,
    className: 'text-primary motion-reduce:animate-none',
  },
  DONE: { icon: LuCheck, className: 'text-success' },
  FAILED: { icon: LuX, className: 'text-error' },
  SKIPPED: { icon: LuMinus, className: 'text-ink-muted' },
};

/**
 * Every stage of a claim with its status and real duration: a stage ends
 * when the next one is reported, the last one when the claim finishes.
 */
function describeSteps(run: ClaimRun, now: number) {
  const { state } = run;
  const finishedAt =
    state.status === 'DONE' || state.status === 'FAILED'
      ? state.startedAt + state.durationMs
      : null;
  return ANALYSIS_STEPS.map((step) => {
    const markIndex = run.steps.findIndex((mark) => mark.step === step);
    const label = stepLabel(step, run.unreadDocumentCount);
    if (markIndex < 0) {
      return {
        step,
        label,
        status: (state.status === 'RUNNING'
          ? 'PENDING'
          : 'SKIPPED') as StepStatus,
      };
    }
    const endedAt = run.steps[markIndex + 1]?.startedAt ?? finishedAt;
    const isLastMark = markIndex === run.steps.length - 1;
    const status: StepStatus =
      endedAt === null
        ? 'ACTIVE'
        : state.status === 'FAILED' && isLastMark
          ? 'FAILED'
          : 'DONE';
    const durationMs = (endedAt ?? now) - run.steps[markIndex].startedAt;
    return { step, label, status, duration: formatDuration(durationMs) };
  });
}

function RunSteps({ run, now }: { run: ClaimRun; now: number }) {
  return (
    <ol
      aria-label={`Langkah analisis ${run.claimNo}`}
      className="mt-2 flex flex-col gap-1.5 border-l border-hairline pl-3"
    >
      {describeSteps(run, now).map(({ step, label, status, duration }) => {
        const { icon: Icon, className } = STEP_ICONS[status];
        return (
          <li key={step} className="flex items-center gap-2 text-caption">
            <Icon
              aria-hidden="true"
              className={cn('size-3.5 shrink-0', className)}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                status === 'ACTIVE'
                  ? 'font-medium text-ink'
                  : 'text-ink-secondary',
                (status === 'PENDING' || status === 'SKIPPED') &&
                  'text-ink-muted',
              )}
            >
              {label}
              {status === 'SKIPPED' && ' · dilewati'}
            </span>
            {duration && (
              <span className="shrink-0 font-mono text-ink-secondary tabular-nums">
                {duration}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function RunDetails({ result }: { result: ClaimAnalysisResult }) {
  const details = [
    {
      label: 'Dokumen dibaca AI',
      value:
        result.failedDocumentCount > 0
          ? `${formatCount(result.extractedDocumentCount)} · ${formatCount(result.failedDocumentCount)} gagal`
          : formatCount(result.extractedDocumentCount),
    },
    {
      label: 'Token AI',
      value:
        totalTokens(result) > 0
          ? `${formatCount(result.tokenUsage.inputTokens)} masuk · ${formatCount(result.tokenUsage.outputTokens)} keluar`
          : 'Tanpa panggilan AI',
    },
    { label: 'Temuan', value: formatCount(result.findingCount) },
    { label: 'Potensi selisih', value: formatRupiah(result.potentialGap) },
  ];
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-canvas px-3 py-2 text-caption">
      {details.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-ink-secondary">{label}</dt>
          <dd className="text-right font-mono text-ink tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RunSummary({ claimRuns }: { claimRuns: ClaimRun[] }) {
  const results = claimRuns.flatMap((run) =>
    run.state.status === 'DONE' ? [run.state.result] : [],
  );
  const findingCount = results.reduce(
    (total, result) => total + result.findingCount,
    0,
  );
  const potentialGap = results.reduce(
    (total, result) => total + result.potentialGap,
    0,
  );
  const tokenCount = results.reduce(
    (total, result) => total + totalTokens(result),
    0,
  );
  const stats = [
    {
      label: 'Temuan',
      value: formatCount(findingCount),
      className: findingCount > 0 ? 'text-warning-ink' : undefined,
    },
    {
      label: 'Potensi selisih',
      value: formatRupiah(potentialGap),
      className: potentialGap > 0 ? 'text-warning-ink' : undefined,
    },
    { label: 'Token AI', value: formatCount(tokenCount) },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline bg-canvas">
      {stats.map(({ label, value, className }) => (
        <div key={label} className="min-w-0 px-3 py-2">
          <dt className="truncate text-caption text-ink-secondary">{label}</dt>
          <dd
            className={cn(
              'truncate font-mono text-small font-medium text-ink tabular-nums',
              className,
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Live log of the run, one row per claim, like an agent's task list. The
 * running claim shows its stages as the API reports them; a finished claim
 * opens to show them with its numbers.
 */
function AnalysisRunLog({
  claimRuns,
  now,
  isWindingDown,
}: {
  claimRuns: ClaimRun[];
  now: number;
  isWindingDown: boolean;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const [expandedClaimIds, setExpandedClaimIds] = useState<Set<string>>(
    () => new Set(),
  );
  const firstRunningIndex = claimRuns.findIndex(
    (run) => run.state.status === 'RUNNING',
  );
  const runningCount = claimRuns.filter(
    (run) => run.state.status === 'RUNNING',
  ).length;
  const queuedCount = claimRuns.filter(
    (run) => run.state.status === 'QUEUED',
  ).length;

  // Keep the claim being read in view as the run moves down a long list.
  useEffect(() => {
    if (firstRunningIndex < 0) return;
    listRef.current?.children[firstRunningIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [firstRunningIndex]);

  function toggleExpanded(claimId: string) {
    setExpandedClaimIds((claimIds) => {
      const nextClaimIds = new Set(claimIds);
      if (!nextClaimIds.delete(claimId)) nextClaimIds.add(claimId);
      return nextClaimIds;
    });
  }

  return (
    <section
      aria-label="Log analisis per klaim"
      className="w-full max-w-lg overflow-hidden rounded-lg border border-hairline bg-surface text-left shadow-xs"
    >
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
        <h3 className="text-overline font-medium tracking-wider text-ink-secondary uppercase">
          Log analisis
        </h3>
        <p className="text-caption text-ink-secondary tabular-nums">
          {formatCount(runningCount)} berjalan · {formatCount(queuedCount)}{' '}
          antre
        </p>
      </header>
      <RunSummary claimRuns={claimRuns} />
      <ol
        ref={listRef}
        className="max-h-80 divide-y divide-hairline overflow-y-auto"
      >
        {claimRuns.map((run) => {
          const line = describeClaimRun(run, now, isWindingDown);
          const Icon = line.icon;
          const isRunning = run.state.status === 'RUNNING';
          const isExpandable =
            run.state.status === 'DONE' || run.state.status === 'FAILED';
          const isExpanded = isExpandable && expandedClaimIds.has(run.id);
          const detailsId = `analysis-run-${run.id}`;
          const summary = (
            <>
              <Icon
                aria-hidden="true"
                className={cn('mt-0.5 size-4 shrink-0', line.iconClassName)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-small font-medium text-ink">
                    {run.claimNo}
                  </span>
                  {line.duration && (
                    <span className="shrink-0 font-mono text-caption text-ink-secondary tabular-nums">
                      {line.duration}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-caption text-ink-secondary',
                    line.detailClassName,
                  )}
                >
                  {line.detail}
                </p>
              </div>
            </>
          );
          return (
            <li key={run.id} className={cn(isRunning && 'bg-subtle')}>
              {isExpandable ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  onClick={() => toggleExpanded(run.id)}
                  className="flex w-full gap-3 px-3 py-2.5 text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset motion-safe:transition-colors"
                >
                  {summary}
                  <LuChevronDown
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-ink-muted motion-safe:transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </button>
              ) : (
                <div className="flex gap-3 px-3 py-2.5">{summary}</div>
              )}
              {(isRunning || isExpanded) && (
                <div id={detailsId} className="px-3 pb-3 pl-10">
                  <RunSteps run={run} now={now} />
                  {run.state.status === 'DONE' && (
                    <RunDetails result={run.state.result} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Everything below the animation. Mounts with the overlay content, so the
 * clock starts at zero for every run.
 */
function AnalysisRunStatus({
  claimRuns,
  isStopping,
  onStop,
}: {
  claimRuns: ClaimRun[];
  isStopping: boolean;
  onStop: () => void;
}) {
  const now = useNow();
  const [startedAt] = useState(() => Date.now());
  const completedClaimCount = claimRuns.filter(
    (run) => run.state.status === 'DONE' || run.state.status === 'FAILED',
  ).length;
  // A timeout or an unreachable AI ends the run like a stop does.
  const isWindingDown =
    isStopping ||
    claimRuns.some(
      (run) =>
        run.state.status === 'FAILED' && run.state.reason !== 'NOT_FOUND',
    );

  return (
    <>
      <div className="flex w-full max-w-lg flex-col items-center gap-2 text-center">
        <AlertDialogTitle className="font-display text-body font-semibold tracking-display text-ink">
          AI sedang menganalisis rekam medis
        </AlertDialogTitle>
        <AlertDialogDescription aria-live="polite" className="tabular-nums">
          {formatCount(completedClaimCount)} dari{' '}
          {formatCount(claimRuns.length)} klaim selesai.
        </AlertDialogDescription>
      </div>
      <div className="flex w-full max-w-lg flex-col gap-2">
        <Progress
          value={progressPercent(claimRuns, now)}
          aria-label="Progres analisis AI"
          className="h-1.5 w-full shrink-0 bg-subtle [&>[data-slot=progress-indicator]]:bg-primary"
        />
        <p className="flex items-center justify-center gap-1.5 text-small text-ink-secondary">
          <LuTimer className="size-4 text-primary" aria-hidden="true" />
          Waktu berjalan
          <span className="font-medium text-ink tabular-nums">
            {formatElapsed(Math.floor((now - startedAt) / 1000))}
          </span>
          · maks. {formatElapsed(ANALYSIS_TIMEOUT_MS / 1000)} per klaim
        </p>
      </div>
      <AnalysisRunLog
        claimRuns={claimRuns}
        now={now}
        isWindingDown={isWindingDown}
      />
      <p className="w-full max-w-lg text-center text-caption text-ink-secondary">
        Biarkan halaman ini tetap terbuka. Jika satu klaim lebih dari 1 menit,
        analisis dihentikan otomatis dan Anda bisa mencobanya lagi.
      </p>
      <Button
        variant="outline"
        onClick={onStop}
        disabled={isStopping}
        className="w-full max-w-lg sm:w-auto"
      >
        <LuSquare aria-hidden="true" />
        {isStopping
          ? 'Menghentikan setelah klaim yang sedang dibaca…'
          : 'Hentikan analisis'}
      </Button>
    </>
  );
}

/**
 * Full-screen, non-dismissable loading state while the AI reads medical
 * records. The page behind stays visible but blurred. Stopping waits for the
 * claims already in flight, because their LLM calls are already paid for.
 */
export function AnalysisLoadingOverlay({
  open,
  claimRuns,
  isStopping,
  onStop,
}: {
  open: boolean;
  claimRuns: ClaimRun[];
  isStopping: boolean;
  onStop: () => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        overlayClassName="bg-canvas/75 backdrop-blur-md"
        className="flex h-dvh max-h-none w-screen max-w-none flex-col items-center justify-center gap-4 overflow-y-auto rounded-none border-0 bg-transparent px-4 py-10 shadow-none sm:p-8 data-[size=default]:sm:max-w-none"
      >
        <Lottie
          src={LOADING_ANIMATION_PATH}
          loop={!prefersReducedMotion}
          autoplay={!prefersReducedMotion}
          className={`${ANIMATION_SIZE_CLASS_NAME} shrink-0`}
          aria-hidden="true"
        />
        <AnalysisRunStatus
          claimRuns={claimRuns}
          isStopping={isStopping}
          onStop={onStop}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
