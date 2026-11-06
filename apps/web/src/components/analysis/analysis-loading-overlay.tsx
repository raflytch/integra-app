'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LuSquare, LuTimer } from 'react-icons/lu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ANALYSIS_TIMEOUT_MS } from '@/services/analysis.service';

/** Served from `public/`, so the 100 KB animation is fetched only when analysis starts. */
const LOADING_ANIMATION_PATH = '/animations/loading.json';
const ANIMATION_SIZE_CLASS_NAME = 'size-24 sm:size-28';

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

const ANALYSIS_STEPS = [
  'AI membaca dokumen rekam medis klaim.',
  'Sistem menjalankan Uji Ada, Uji Konsisten, dan Uji Bukan Salinan.',
  'Hasilnya tampil di Kartu Klaim untuk Anda putuskan.',
];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The bar never fills on time alone; only a finished claim completes its share. */
const MAX_TIME_BASED_CLAIM_SHARE = 0.9;

/**
 * Progress bar and elapsed time. Mounts with the overlay content, so it starts
 * at zero for every run. The current claim's share grows toward the timeout,
 * so the bar keeps moving even when a single claim is analyzed.
 */
function AnalysisProgress({
  completedClaimCount,
  totalClaimCount,
}: {
  completedClaimCount: number;
  totalClaimCount: number;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentClaim, setCurrentClaim] = useState({
    completedClaimCount,
    startedAtMs: 0,
  });

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(
      () => setElapsedMs(Date.now() - startedAt),
      500,
    );
    return () => window.clearInterval(intervalId);
  }, []);

  if (currentClaim.completedClaimCount !== completedClaimCount) {
    setCurrentClaim({ completedClaimCount, startedAtMs: elapsedMs });
  }

  const currentClaimShare = Math.min(
    (elapsedMs - currentClaim.startedAtMs) / ANALYSIS_TIMEOUT_MS,
    MAX_TIME_BASED_CLAIM_SHARE,
  );
  const progressPercent =
    totalClaimCount > 0
      ? (Math.min(completedClaimCount + currentClaimShare, totalClaimCount) /
          totalClaimCount) *
        100
      : 0;

  return (
    <>
      <Progress
        value={progressPercent}
        aria-label="Progres analisis AI"
        className="h-1.5 w-full max-w-sm shrink-0 bg-subtle [&>[data-slot=progress-indicator]]:bg-primary"
      />
      <p className="flex items-center gap-1.5 text-small text-ink-secondary">
        <LuTimer className="size-4 text-primary" aria-hidden="true" />
        Waktu berjalan
        <span className="font-medium text-ink tabular-nums">
          {formatElapsed(Math.floor(elapsedMs / 1000))}
        </span>
        · maks. {formatElapsed(ANALYSIS_TIMEOUT_MS / 1000)} per klaim
      </p>
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
  completedClaimCount,
  totalClaimCount,
  inFlightClaimNos,
  isStopping,
  onStop,
}: {
  open: boolean;
  completedClaimCount: number;
  totalClaimCount: number;
  inFlightClaimNos: string[];
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
        <div className="flex w-full max-w-md flex-col items-center gap-2 text-center">
          <AlertDialogTitle className="font-display text-body font-semibold tracking-display text-ink">
            AI sedang menganalisis rekam medis
          </AlertDialogTitle>
          <AlertDialogDescription
            aria-live="polite"
            className="break-words tabular-nums"
          >
            {completedClaimCount} dari {totalClaimCount} klaim selesai.
            {inFlightClaimNos.length > 0 &&
              ` Sedang dibaca: ${inFlightClaimNos.join(', ')}.`}
          </AlertDialogDescription>
        </div>
        <AnalysisProgress
          completedClaimCount={completedClaimCount}
          totalClaimCount={totalClaimCount}
        />
        <ol className="flex w-full max-w-sm flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface text-left text-small text-ink-secondary">
          {ANALYSIS_STEPS.map((step, stepIndex) => (
            <li key={step} className="flex gap-3 px-3 py-2">
              <span className="font-medium text-ink tabular-nums">
                {stepIndex + 1}.
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="w-full max-w-sm text-center text-caption text-ink-secondary">
          Biarkan halaman ini tetap terbuka. Jika satu klaim lebih dari 1 menit,
          analisis dihentikan otomatis dan Anda bisa mencobanya lagi.
        </p>
        <Button
          variant="outline"
          onClick={onStop}
          disabled={isStopping}
          className="w-full max-w-sm sm:w-auto"
        >
          <LuSquare aria-hidden="true" />
          {isStopping
            ? 'Menghentikan setelah klaim yang sedang dibaca…'
            : 'Hentikan analisis'}
        </Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}
