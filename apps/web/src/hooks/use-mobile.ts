import * as React from 'react';

/** Matches Tailwind `lg`: below it the sidebar becomes a sheet, so tablets keep the full width. */
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
