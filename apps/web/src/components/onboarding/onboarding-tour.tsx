'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type CSSProperties, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTourTarget } from '@/hooks/use-tour-target';
import {
  calculateTourCardPosition,
  chooseTourCardPlacement,
} from './tour-card-placement';
import { TourStepCard } from './tour-step-card';
import { TOUR_STEPS } from './tour-steps';

const QUEUE_PATH = '/claims';
const SPOTLIGHT_PADDING_PX = 6;
const FINAL_STEP_INDEX = TOUR_STEPS.length - 1;

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

export function OnboardingTour({
  isRestartRequested,
  onTourClosed,
}: {
  isRestartRequested: boolean;
  onTourClosed: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOnboardingSnoozed, snoozeOnboarding } = useOnboardingStatus();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const isTourOpen = isRestartRequested || !isOnboardingSnoozed;
  const activeStep = TOUR_STEPS[activeStepIndex];
  const isOnStepPage = !activeStep.page || pathname === QUEUE_PATH;
  const { targetRect, isTargetMissing } = useTourTarget(
    isTourOpen && isOnStepPage ? activeStep.target : undefined,
  );

  useEffect(() => {
    if (isTourOpen && activeStep.page === 'queue' && !isOnStepPage) {
      router.push(QUEUE_PATH);
    }
  }, [isTourOpen, activeStep.page, isOnStepPage, router]);

  function finishTour() {
    snoozeOnboarding();
    onTourClosed();
    setActiveStepIndex(0);
  }

  function goToNextStep() {
    if (activeStepIndex === FINAL_STEP_INDEX) return finishTour();
    setActiveStepIndex(activeStepIndex + 1);
  }

  function goToPreviousStep() {
    setActiveStepIndex(Math.max(activeStepIndex - 1, 0));
  }

  if (!isTourOpen) return null;

  const stepCardProps = {
    step: activeStep,
    stepIndex: activeStepIndex,
    totalSteps: TOUR_STEPS.length,
    onSkip: finishTour,
    onBack: goToPreviousStep,
    onNext: goToNextStep,
  };
  const isSpotlightStep = Boolean(activeStep.target) && !isTargetMissing;

  if (!isSpotlightStep) {
    return (
      <Dialog open onOpenChange={(isOpen) => !isOpen && finishTour()}>
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

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const cardPosition = targetRect
    ? calculateTourCardPosition(
        chooseTourCardPlacement(targetRect, viewport),
        targetRect,
        viewport,
      )
    : undefined;
  const titleId = 'onboarding-tour-step-title';

  return (
    <>
      {targetRect ? (
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
        </>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55">
          <Spinner
            className="size-6 text-primary-wash"
            aria-label="Memuat langkah panduan"
          />
        </div>
      )}
      {targetRect && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(event) => event.key === 'Escape' && finishTour()}
          style={cardPosition}
          className="fixed z-[60] max-h-[calc(100vh-32px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-hairline bg-surface p-5 shadow-lg motion-safe:transition-[top,left,right,bottom] motion-safe:duration-300 motion-safe:ease-out"
        >
          <TourStepCard
            {...stepCardProps}
            TitleElement="h2"
            titleId={titleId}
          />
        </div>
      )}
    </>
  );
}
