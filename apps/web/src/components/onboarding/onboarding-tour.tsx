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
import {
  OPEN_FIRST_CLAIM_STEP_ID,
  TOUR_STEPS,
  type TourPage,
} from './tour-steps';

const QUEUE_PATH = '/claims';
const SPOTLIGHT_PADDING_PX = 6;
const FINAL_STEP_INDEX = TOUR_STEPS.length - 1;
const OVERLAY_SHADOW =
  'shadow-[0_0_0_1px_rgba(0,0,0,.04),0_14px_32px_rgba(0,0,0,.10),0_28px_70px_rgba(0,0,0,.14)]';

function getCurrentTourPage(pathname: string): TourPage | null {
  if (pathname === QUEUE_PATH) return 'queue';
  if (pathname.startsWith(`${QUEUE_PATH}/`)) return 'claim';
  return null;
}

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
  const { hasCompletedOnboarding, markOnboardingCompleted } =
    useOnboardingStatus();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isClaimPageUnavailable, setIsClaimPageUnavailable] = useState(false);

  const isTourOpen = isRestartRequested || !hasCompletedOnboarding;
  const activeStep = TOUR_STEPS[activeStepIndex];
  const isOnStepPage =
    !activeStep.page || getCurrentTourPage(pathname) === activeStep.page;
  const { targetElement, targetRect, isTargetMissing, isTargetCurrent } =
    useTourTarget(isTourOpen && isOnStepPage ? activeStep.target : undefined);

  useEffect(() => {
    if (isTourOpen && activeStep.page === 'queue' && !isOnStepPage) {
      router.push(QUEUE_PATH);
    }
  }, [isTourOpen, activeStep.page, isOnStepPage, router]);

  useEffect(() => {
    if (!activeStep.advancesOnTargetClick || !isTargetCurrent) return;
    if (!targetElement) return;
    const advanceToNextStep = () => setActiveStepIndex(activeStepIndex + 1);
    targetElement.addEventListener('click', advanceToNextStep);
    return () => targetElement.removeEventListener('click', advanceToNextStep);
  }, [
    activeStep.advancesOnTargetClick,
    activeStepIndex,
    isTargetCurrent,
    targetElement,
  ]);

  function finishTour() {
    markOnboardingCompleted();
    onTourClosed();
    setActiveStepIndex(0);
    setIsClaimPageUnavailable(false);
  }

  function goToNextStep() {
    if (activeStepIndex === FINAL_STEP_INDEX) return finishTour();
    if (activeStep.id === OPEN_FIRST_CLAIM_STEP_ID) {
      const firstClaimHref = isTargetCurrent
        ? targetElement?.dataset.tourHref
        : undefined;
      if (!firstClaimHref) {
        setIsClaimPageUnavailable(true);
        return setActiveStepIndex(FINAL_STEP_INDEX);
      }
      router.push(firstClaimHref);
    }
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
  const isStepPageUnavailable =
    isClaimPageUnavailable && activeStep.page === 'claim';
  const isSpotlightStep =
    Boolean(activeStep.target) && !isTargetMissing && !isStepPageUnavailable;

  if (!isSpotlightStep) {
    return (
      <Dialog open onOpenChange={(isOpen) => !isOpen && finishTour()}>
        <DialogContent
          showCloseButton={false}
          className={`rounded-xl border-linen-border bg-eggshell-canvas p-6 sm:max-w-md ${OVERLAY_SHADOW}`}
        >
          <DialogDescription className="sr-only">
            Panduan penggunaan INTEGRA
          </DialogDescription>
          <TourStepCard
            {...stepCardProps}
            TitleElement={DialogTitle}
            isTargetMissing={isTargetMissing || isStepPageUnavailable}
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
              className="fixed z-50"
              style={blockerStyle}
            />
          ))}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 rounded-lg shadow-[0_0_0_9999px_rgba(46,46,46,.55)] ring-2 ring-integra-mint motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING_PX,
              left: targetRect.left - SPOTLIGHT_PADDING_PX,
              width: targetRect.width + SPOTLIGHT_PADDING_PX * 2,
              height: targetRect.height + SPOTLIGHT_PADDING_PX * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/55">
          <Spinner
            className="size-6 text-eggshell-canvas"
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
          className={`fixed z-[60] max-h-[calc(100vh-32px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-linen-border bg-eggshell-canvas p-5 motion-safe:transition-[top,left,right,bottom] motion-safe:duration-300 motion-safe:ease-out ${OVERLAY_SHADOW}`}
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
