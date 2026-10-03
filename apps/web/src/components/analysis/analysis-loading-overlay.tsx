'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { LuSquare } from 'react-icons/lu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

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
  const progressPercent =
    totalClaimCount > 0 ? (completedClaimCount / totalClaimCount) * 100 : 0;

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
        <Progress
          value={progressPercent}
          aria-label="Progres analisis AI"
          className="h-1.5 w-full max-w-sm shrink-0 bg-subtle [&>[data-slot=progress-indicator]]:bg-primary"
        />
        <p className="w-full max-w-sm text-center text-caption text-ink-secondary">
          Setiap dokumen dibaca oleh LLM, jadi proses ini bisa memakan waktu
          beberapa menit. Biarkan halaman ini tetap terbuka.
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
