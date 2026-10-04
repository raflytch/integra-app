'use client';

import type { CSSProperties } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  calculateTourCardPosition,
  chooseTourCardPlacement,
} from './tour-card-placement';
import { TourStepCard } from './tour-step-card';
import type { TourStep } from './tour-steps';

const SPOTLIGHT_PADDING_PX = 6;
const TITLE_ID = 'tour-step-title';

function buildClickBlockers(spotlightRect: DOMRect): CSSProperties[] {
  const spotlightTop = spotlightRect.top - SPOTLIGHT_PADDING_PX;
  const spotlightBottom = spotlightRect.bottom + SPOTLIGHT_PADDING_PX;
  const spotlightLeft = spotlightRect.left - SPOTLIGHT_PADDING_PX;
  const spotlightRight = spotlightRect.right + SPOTLIGHT_PADDING_PX;
  const spotlightHeight = spotlightBottom - spotlightTop;
  return [
    { top: 0, left: 0, right: 0, height: Math.max(spotlightTop, 0) },
    { top: spotlightBottom, left: 0, right: 0, bottom: 0 },
    {
      top: spotlightTop,
      left: 0,
      width: Math.max(spotlightLeft, 0),
      height: spotlightHeight,
    },
    {
      top: spotlightTop,
      left: spotlightRight,
      right: 0,
      height: spotlightHeight,
    },
  ];
}

/**
 * Renders one tour step: a spotlight around its target with a floating card,
 * or a centered dialog when the step has no target or the target is missing.
 */
export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  isTargetMissing,
  onSkip,
  onBack,
  onNext,
  onSelectPoint,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  isTargetMissing: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
  onSelectPoint?: (label: string) => void;
}) {
  const stepCardProps = {
    step,
    stepIndex,
    totalSteps,
    onSkip,
    onBack,
    onNext,
    onSelectPoint,
  };

  if (!step.target || isTargetMissing) {
    return (
      <Dialog open onOpenChange={(isOpen) => !isOpen && onSkip()}>
        <DialogContent
          showCloseButton={false}
          className="rounded-xl border-hairline bg-surface p-6 sm:max-w-md"
        >
          <DialogDescription className="sr-only">
            Panduan penggunaan INTEGRA
          </DialogDescription>
          <TourStepCard
            {...stepCardProps}
            TitleElement={DialogTitle}
            isTargetMissing={isTargetMissing}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (!targetRect) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55">
        <Spinner
          className="size-6 text-primary-wash"
          aria-label="Memuat langkah panduan"
        />
      </div>
    );
  }

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const cardPosition = calculateTourCardPosition(
    chooseTourCardPlacement(targetRect, viewport),
    targetRect,
    viewport,
  );

  return (
    <>
      {buildClickBlockers(targetRect).map((blockerStyle, blockerIndex) => (
        <div
          key={blockerIndex}
          aria-hidden="true"
          className="fixed z-50 bg-ink/55"
          style={blockerStyle}
        />
      ))}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 rounded-lg border-2 border-primary motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
        style={{
          top: targetRect.top - SPOTLIGHT_PADDING_PX,
          left: targetRect.left - SPOTLIGHT_PADDING_PX,
          width: targetRect.width + SPOTLIGHT_PADDING_PX * 2,
          height: targetRect.height + SPOTLIGHT_PADDING_PX * 2,
        }}
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby={TITLE_ID}
        onKeyDown={(event) => event.key === 'Escape' && onSkip()}
        style={cardPosition}
        className="fixed z-[60] max-h-[calc(100vh-32px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-hairline bg-surface p-5 shadow-lg motion-safe:transition-[top,left,right,bottom] motion-safe:duration-300 motion-safe:ease-out"
      >
        <TourStepCard {...stepCardProps} TitleElement="h2" titleId={TITLE_ID} />
      </div>
    </>
  );
}
