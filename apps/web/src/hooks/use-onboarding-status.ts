import { useSyncExternalStore } from 'react';

const ONBOARDING_DISMISSED_AT_STORAGE_KEY = 'integra:onboarding-dismissed-at';
/** The tour stays hidden this long after it is finished or skipped, then shows again. */
const ONBOARDING_SNOOZE_MS = 24 * 60 * 60 * 1000;
const statusListeners = new Set<() => void>();

function readIsOnboardingSnoozed(): boolean {
  try {
    const dismissedAt = Number(
      window.localStorage.getItem(ONBOARDING_DISMISSED_AT_STORAGE_KEY),
    );
    return dismissedAt > 0 && Date.now() - dismissedAt < ONBOARDING_SNOOZE_MS;
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

function snoozeOnboarding() {
  try {
    window.localStorage.setItem(
      ONBOARDING_DISMISSED_AT_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {}
  statusListeners.forEach((notifyListener) => notifyListener());
}

/** Shows the tour on any visit at least 24 hours after it was last closed. */
export function useOnboardingStatus() {
  const isOnboardingSnoozed = useSyncExternalStore(
    subscribeToOnboardingStatus,
    readIsOnboardingSnoozed,
    () => true,
  );
  return { isOnboardingSnoozed, snoozeOnboarding };
}
