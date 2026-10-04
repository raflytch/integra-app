'use client';

import { useState, useSyncExternalStore } from 'react';
import { LuCircleHelp } from 'react-icons/lu';
import { TourOverlay } from '@/components/onboarding/tour-overlay';
import type { TourStep } from '@/components/onboarding/tour-steps';
import { Button } from '@/components/ui/button';
import { useTourTarget } from '@/hooks/use-tour-target';

const LOGIN_TOUR_STEPS: TourStep[] = [
  {
    id: 'login-welcome',
    title: 'Selamat datang di INTEGRA',
    description:
      'Asisten verifikasi klaim JKN yang menandai klaim dengan bukti kurang, tidak konsisten, atau tersalin. Panduan singkat ini menunjukkan cara masuk, termasuk dengan akun demo.',
    showsLogo: true,
  },
  {
    id: 'login-email',
    target: 'login-email',
    title: 'Masukkan email',
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
      'Belum punya akun? Pilih Pakai akun ini pada salah satu akun demo berikut. Emailnya langsung terisi, lalu klik Masuk tanpa kode authenticator.',
    points: [
      {
        label: 'verifikator@integra.local',
        detail: 'Antrean klaim, analisis AI, dan keputusan.',
        selectable: true,
      },
      {
        label: 'supervisor@integra.local',
        detail: 'Ditambah Ikhtisar, Eskalasi, dan Ringkasan Faskes.',
        selectable: true,
      },
    ],
    nextLabel: 'Mulai',
  },
];
const FINAL_STEP_INDEX = LOGIN_TOUR_STEPS.length - 1;

function subscribeToNothing() {
  return () => {};
}

/**
 * Four-step login guide, opened on every visit to the login page. Choosing a
 * demo account fills the email field and closes the guide.
 */
export function LoginTour({
  onUseDemoAccount,
}: {
  onUseDemoAccount: (email: string) => void;
}) {
  const [isTourOpen, setIsTourOpen] = useState(true);
  // The overlay measures the window, so it only renders after hydration.
  const isHydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = LOGIN_TOUR_STEPS[activeStepIndex];
  const { targetRect, isTargetMissing } = useTourTarget(
    isTourOpen && isHydrated ? activeStep.target : undefined,
  );

  function openTour() {
    setActiveStepIndex(0);
    setIsTourOpen(true);
  }

  function finishTour() {
    setIsTourOpen(false);
    setActiveStepIndex(0);
  }

  function selectDemoAccount(email: string) {
    onUseDemoAccount(email);
    finishTour();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-ink-secondary"
        onClick={openTour}
      >
        <LuCircleHelp aria-hidden="true" />
        Lihat panduan masuk
      </Button>
      {isTourOpen && isHydrated && (
        <TourOverlay
          step={activeStep}
          stepIndex={activeStepIndex}
          totalSteps={LOGIN_TOUR_STEPS.length}
          targetRect={targetRect}
          isTargetMissing={isTargetMissing}
          onSkip={finishTour}
          onSelectPoint={selectDemoAccount}
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
