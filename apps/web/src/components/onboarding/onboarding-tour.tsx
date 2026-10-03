'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTourSnooze } from '@/hooks/use-tour-snooze';
import { useTourTarget } from '@/hooks/use-tour-target';
import { TourOverlay } from './tour-overlay';
import {
  OPEN_FIRST_CLAIM_STEP_ID,
  TOUR_STEPS,
  type TourPage,
} from './tour-steps';

const QUEUE_PATH = '/claims';
const FINAL_STEP_INDEX = TOUR_STEPS.length - 1;
const ONBOARDING_DISMISSED_AT_STORAGE_KEY = 'integra:onboarding-dismissed-at';

function getCurrentTourPage(pathname: string): TourPage | null {
  if (pathname === QUEUE_PATH) return 'queue';
  if (pathname.startsWith(`${QUEUE_PATH}/`)) return 'claim';
  return null;
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
  const { isTourSnoozed, snoozeTour } = useTourSnooze(
    ONBOARDING_DISMISSED_AT_STORAGE_KEY,
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isClaimPageUnavailable, setIsClaimPageUnavailable] = useState(false);

  const isTourOpen = isRestartRequested || !isTourSnoozed;
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
    snoozeTour();
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

  const isStepPageUnavailable =
    isClaimPageUnavailable && activeStep.page === 'claim';

  return (
    <TourOverlay
      step={activeStep}
      stepIndex={activeStepIndex}
      totalSteps={TOUR_STEPS.length}
      targetRect={isStepPageUnavailable ? null : targetRect}
      isTargetMissing={isTargetMissing || isStepPageUnavailable}
      onSkip={finishTour}
      onBack={goToPreviousStep}
      onNext={goToNextStep}
    />
  );
}
