import { useEffect, useState } from 'react';

const TARGET_LOOKUP_TIMEOUT_MS = 2500;
const PREVIOUS_TARGET_GRACE_MS = 400;
const TALL_TARGET_VIEWPORT_RATIO = 0.6;

interface TourTargetState {
  targetId: string;
  element: HTMLElement | null;
  rect: DOMRect | null;
  isMissing: boolean;
}

export function useTourTarget(targetId: string | undefined) {
  const [targetState, setTargetState] = useState<TourTargetState | null>(null);
  const [slowLookupTargetId, setSlowLookupTargetId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!targetId) return;
    let element: HTMLElement | null = null;
    let lookupFrameId = 0;
    const lookupStartedAt = performance.now();
    const slowLookupTimer = window.setTimeout(
      () => setSlowLookupTargetId(targetId),
      PREVIOUS_TARGET_GRACE_MS,
    );

    function measureTarget() {
      if (!element) return;
      setTargetState({
        targetId: targetId!,
        element,
        rect: element.getBoundingClientRect(),
        isMissing: false,
      });
    }

    function findTarget() {
      const candidate = document.querySelector<HTMLElement>(
        `[data-tour="${targetId}"]`,
      );
      const isVisible = Boolean(candidate?.getClientRects().length);
      if (candidate && isVisible) {
        element = candidate;
        const isTallTarget =
          candidate.getBoundingClientRect().height >
          window.innerHeight * TALL_TARGET_VIEWPORT_RATIO;
        element.scrollIntoView({ block: isTallTarget ? 'start' : 'center' });
        measureTarget();
        return;
      }
      if (performance.now() - lookupStartedAt > TARGET_LOOKUP_TIMEOUT_MS) {
        setTargetState({
          targetId: targetId!,
          element: null,
          rect: null,
          isMissing: true,
        });
        return;
      }
      lookupFrameId = requestAnimationFrame(findTarget);
    }

    lookupFrameId = requestAnimationFrame(findTarget);
    window.addEventListener('scroll', measureTarget, true);
    window.addEventListener('resize', measureTarget);
    return () => {
      window.clearTimeout(slowLookupTimer);
      cancelAnimationFrame(lookupFrameId);
      window.removeEventListener('scroll', measureTarget, true);
      window.removeEventListener('resize', measureTarget);
    };
  }, [targetId]);

  const isCurrentTarget =
    Boolean(targetId) && targetState?.targetId === targetId;
  const canKeepPreviousTarget =
    Boolean(targetId) &&
    !isCurrentTarget &&
    slowLookupTargetId !== targetId &&
    Boolean(targetState?.element?.isConnected);
  const visibleTargetState =
    isCurrentTarget || canKeepPreviousTarget ? targetState : null;

  return {
    targetElement: visibleTargetState?.element ?? null,
    targetRect: visibleTargetState?.rect ?? null,
    isTargetMissing: isCurrentTarget && Boolean(targetState?.isMissing),
    isTargetCurrent: isCurrentTarget && !targetState?.isMissing,
  };
}
