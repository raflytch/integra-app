'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';

const StartTourContext = createContext<() => void>(() => {});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isRestartRequested, setIsRestartRequested] = useState(false);

  return (
    <StartTourContext.Provider value={() => setIsRestartRequested(true)}>
      {children}
      <OnboardingTour
        isRestartRequested={isRestartRequested}
        onTourClosed={() => setIsRestartRequested(false)}
      />
    </StartTourContext.Provider>
  );
}

export function useStartTour() {
  return useContext(StartTourContext);
}
