import { useSyncExternalStore } from 'react';

const ONBOARDING_STORAGE_KEY = 'integra:onboarding-completed';
const statusListeners = new Set<() => void>();

function readHasCompletedOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function subscribeToOnboardingStatus(onStatusChange: () => void) {
  statusListeners.add(onStatusChange);
  window.addEventListener('storage', onStatusChange);
  return () => {
    statusListeners.delete(onStatusChange);
    window.removeEventListener('storage', onStatusChange);
  };
}

function markOnboardingCompleted() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {}
  statusListeners.forEach((notifyListener) => notifyListener());
}

export function useOnboardingStatus() {
  const hasCompletedOnboarding = useSyncExternalStore(
    subscribeToOnboardingStatus,
    readHasCompletedOnboarding,
    () => true,
  );
  return { hasCompletedOnboarding, markOnboardingCompleted };
}
