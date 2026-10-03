'use client';

import { useState } from 'react';
import { LuCircleHelp } from 'react-icons/lu';
import { TourOverlay } from '@/components/onboarding/tour-overlay';
import type { TourStep } from '@/components/onboarding/tour-steps';
import { Button } from '@/components/ui/button';
import { useTourSnooze } from '@/hooks/use-tour-snooze';
import { useTourTarget } from '@/hooks/use-tour-target';

const LOGIN_TOUR_DISMISSED_AT_STORAGE_KEY = 'integra:login-tour-dismissed-at';

const LOGIN_TOUR_STEPS: TourStep[] = [
  {
    id: 'login-email',
    target: 'login-email',
    title: 'Masukkan email kerja',
    description:
      'INTEGRA langsung memeriksa akun Anda. Jika email belum terdaftar, Anda ditawari membuat akun baru dan menghubungkan aplikasi authenticator.',
  },
  {
    id: 'login-code',
    target: 'login-code',
    title: 'Masukkan kode authenticator',
    description:
      'Buka aplikasi authenticator, lalu ketik 6 digit kode INTEGRA. Kode berganti setiap 30 detik dan hanya bisa dipakai sekali.',
    missingTargetDescription:
      'Kolom kode muncul untuk akun yang memakai authenticator. Akun demo dan email baru tidak memerlukannya.',
  },
  {
    id: 'login-demo',
    title: 'Coba dengan akun demo',
    description:
      'Belum punya akun? Ketik salah satu email demo berikut dan klik Masuk, tanpa kode authenticator.',
    points: [
      {
        label: 'verifikator@integra.local',
        detail: 'Antrean klaim, analisis AI, dan keputusan.',
      },
      {
        label: 'supervisor@integra.local',
        detail: 'Ditambah Ikhtisar, Eskalasi, dan Ringkasan Faskes.',
      },
    ],
    nextLabel: 'Mulai',
  },
];
const FINAL_STEP_INDEX = LOGIN_TOUR_STEPS.length - 1;

/** Three-step login guide, shown again 24 hours after it is closed. */
export function LoginTour() {
  const { isTourSnoozed, snoozeTour } = useTourSnooze(
    LOGIN_TOUR_DISMISSED_AT_STORAGE_KEY,
  );
  const [isRestartRequested, setIsRestartRequested] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const isTourOpen = isRestartRequested || !isTourSnoozed;
  const activeStep = LOGIN_TOUR_STEPS[activeStepIndex];
  const { targetRect, isTargetMissing } = useTourTarget(
    isTourOpen ? activeStep.target : undefined,
  );

  function finishTour() {
    snoozeTour();
    setIsRestartRequested(false);
    setActiveStepIndex(0);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-ink-secondary"
        onClick={() => setIsRestartRequested(true)}
      >
        <LuCircleHelp aria-hidden="true" />
        Lihat panduan masuk
      </Button>
      {isTourOpen && (
        <TourOverlay
          step={activeStep}
          stepIndex={activeStepIndex}
          totalSteps={LOGIN_TOUR_STEPS.length}
          targetRect={targetRect}
          isTargetMissing={isTargetMissing}
          onSkip={finishTour}
          onBack={() => setActiveStepIndex(Math.max(activeStepIndex - 1, 0))}
          onNext={() =>
            activeStepIndex === FINAL_STEP_INDEX
              ? finishTour()
              : setActiveStepIndex(activeStepIndex + 1)
          }
        />
      )}
    </>
  );
}
