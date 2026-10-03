import { useSyncExternalStore } from 'react';

/** A tour stays hidden this long after it is finished or skipped, then shows again. */
const TOUR_SNOOZE_MS = 24 * 60 * 60 * 1000;
const statusListeners = new Set<() => void>();

function subscribeToTourStatus(onStatusChange: () => void) {
  statusListeners.add(onStatusChange);
  window.addEventListener('storage', onStatusChange);
  return () => {
    statusListeners.delete(onStatusChange);
    window.removeEventListener('storage', onStatusChange);
  };
}

/**
 * Per-browser 24-hour snooze for one tour, keyed by `storageKey`: the tour
 * shows on any visit at least 24 hours after it was last closed.
 */
export function useTourSnooze(storageKey: string) {
  const isTourSnoozed = useSyncExternalStore(
    subscribeToTourStatus,
    () => {
      try {
        const dismissedAt = Number(window.localStorage.getItem(storageKey));
        return dismissedAt > 0 && Date.now() - dismissedAt < TOUR_SNOOZE_MS;
      } catch {
        return false;
      }
    },
    () => true,
  );

  function snoozeTour() {
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {}
    statusListeners.forEach((notifyListener) => notifyListener());
  }

  return { isTourSnoozed, snoozeTour };
}
