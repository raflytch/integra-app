import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'integra:show-patient-data';
const visibilityListeners = new Set<() => void>();

function subscribeToVisibility(onVisibilityChange: () => void) {
  visibilityListeners.add(onVisibilityChange);
  window.addEventListener('storage', onVisibilityChange);
  return () => {
    visibilityListeners.delete(onVisibilityChange);
    window.removeEventListener('storage', onVisibilityChange);
  };
}

/**
 * Whether patient names and medical record numbers are shown unmasked.
 * Masked by default; the choice is remembered per browser and shared by
 * every page, so unmasking on one screen unmasks them all.
 */
export function usePatientDataVisibility() {
  const isPatientDataVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => {
      try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    },
    () => false,
  );

  function setPatientDataVisible(isVisible: boolean) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isVisible));
    } catch {}
    visibilityListeners.forEach((notifyListener) => notifyListener());
  }

  return { isPatientDataVisible, setPatientDataVisible };
}
