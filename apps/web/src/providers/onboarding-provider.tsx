'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { useCurrentUser } from '@/hooks/use-current-user';

const StartTourContext = createContext<() => void>(() => {});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isRestartRequested, setIsRestartRequested] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const isVerifier = currentUser?.role === 'VERIFIER';

  return (
    <StartTourContext.Provider value={() => setIsRestartRequested(true)}>
      {children}
      {isVerifier && (
        <OnboardingTour
          isRestartRequested={isRestartRequested}
          onTourClosed={() => setIsRestartRequested(false)}
        />
      )}
    </StartTourContext.Provider>
  );
}

export function useStartTour() {
  return useContext(StartTourContext);
}
