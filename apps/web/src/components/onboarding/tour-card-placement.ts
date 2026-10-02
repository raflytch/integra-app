export type TourCardSide = 'bottom' | 'top' | 'right' | 'left';
export type TourCardCorner =
  'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export type TourCardPlacement =
  | { mode: 'anchored'; side: TourCardSide }
  | { mode: 'docked'; corner: TourCardCorner };

const TOUR_CARD_WIDTH_PX = 360;
const TOUR_CARD_HEIGHT_ESTIMATE_PX = 340;
const TOUR_CARD_GAP_PX = 32;
const CARD_TO_TARGET_OFFSET_PX = 14;
const VIEWPORT_MARGIN_PX = 16;
const DOCKING_CORNERS: TourCardCorner[] = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
];

export interface TourCardPosition {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface Viewport {
  width: number;
  height: number;
}

function calculateOverlapArea(
  targetRect: DOMRect,
  corner: TourCardCorner,
  viewport: Viewport,
): number {
  const cardWidth = Math.min(
    TOUR_CARD_WIDTH_PX,
    viewport.width - VIEWPORT_MARGIN_PX * 2,
  );
  const cardLeft = corner.endsWith('right')
    ? viewport.width - VIEWPORT_MARGIN_PX - cardWidth
    : VIEWPORT_MARGIN_PX;
  const cardTop = corner.startsWith('bottom')
    ? viewport.height - VIEWPORT_MARGIN_PX - TOUR_CARD_HEIGHT_ESTIMATE_PX
    : VIEWPORT_MARGIN_PX;
  const overlapWidth =
    Math.min(cardLeft + cardWidth, targetRect.right) -
    Math.max(cardLeft, targetRect.left);
  const overlapHeight =
    Math.min(cardTop + TOUR_CARD_HEIGHT_ESTIMATE_PX, targetRect.bottom) -
    Math.max(cardTop, targetRect.top);
  return Math.max(overlapWidth, 0) * Math.max(overlapHeight, 0);
}

function chooseLeastCoveringCorner(
  targetRect: DOMRect,
  viewport: Viewport,
): TourCardCorner {
  return DOCKING_CORNERS.reduce((bestCorner, corner) =>
    calculateOverlapArea(targetRect, corner, viewport) <
    calculateOverlapArea(targetRect, bestCorner, viewport)
      ? corner
      : bestCorner,
  );
}

export function chooseTourCardPlacement(
  targetRect: DOMRect,
  viewport: Viewport,
): TourCardPlacement {
  const requiredVerticalSpace = TOUR_CARD_HEIGHT_ESTIMATE_PX + TOUR_CARD_GAP_PX;
  const requiredHorizontalSpace = TOUR_CARD_WIDTH_PX + TOUR_CARD_GAP_PX;
  const availableSpaceBySide: Record<TourCardSide, number> = {
    bottom: viewport.height - targetRect.bottom,
    top: targetRect.top,
    right: viewport.width - targetRect.right,
    left: targetRect.left,
  };
  const isVerticalSideReadable = (side: 'bottom' | 'top') =>
    availableSpaceBySide[side] >= requiredVerticalSpace;
  const isHorizontalSideReadable = (side: 'right' | 'left') =>
    availableSpaceBySide[side] >= requiredHorizontalSpace &&
    viewport.height >= TOUR_CARD_HEIGHT_ESTIMATE_PX;

  if (isVerticalSideReadable('bottom')) {
    return { mode: 'anchored', side: 'bottom' };
  }
  if (isVerticalSideReadable('top')) return { mode: 'anchored', side: 'top' };
  if (isHorizontalSideReadable('right')) {
    return { mode: 'anchored', side: 'right' };
  }
  if (isHorizontalSideReadable('left')) {
    return { mode: 'anchored', side: 'left' };
  }
  return {
    mode: 'docked',
    corner: chooseLeastCoveringCorner(targetRect, viewport),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculateTourCardPosition(
  placement: TourCardPlacement,
  targetRect: DOMRect | null,
  viewport: Viewport,
): TourCardPosition {
  if (placement.mode === 'docked' || !targetRect) {
    const corner =
      placement.mode === 'docked' ? placement.corner : 'bottom-right';
    return {
      [corner.startsWith('bottom') ? 'bottom' : 'top']: VIEWPORT_MARGIN_PX,
      [corner.endsWith('right') ? 'right' : 'left']: VIEWPORT_MARGIN_PX,
    };
  }

  const cardWidth = Math.min(
    TOUR_CARD_WIDTH_PX,
    viewport.width - VIEWPORT_MARGIN_PX * 2,
  );
  const alignedLeft = clamp(
    targetRect.left,
    VIEWPORT_MARGIN_PX,
    viewport.width - VIEWPORT_MARGIN_PX - cardWidth,
  );
  const alignedTop = clamp(
    targetRect.top,
    VIEWPORT_MARGIN_PX,
    viewport.height - VIEWPORT_MARGIN_PX - TOUR_CARD_HEIGHT_ESTIMATE_PX,
  );

  switch (placement.side) {
    case 'bottom':
      return {
        top: targetRect.bottom + CARD_TO_TARGET_OFFSET_PX,
        left: alignedLeft,
      };
    case 'top':
      return {
        bottom: viewport.height - targetRect.top + CARD_TO_TARGET_OFFSET_PX,
        left: alignedLeft,
      };
    case 'right':
      return {
        top: alignedTop,
        left: targetRect.right + CARD_TO_TARGET_OFFSET_PX,
      };
    case 'left':
      return {
        top: alignedTop,
        right: viewport.width - targetRect.left + CARD_TO_TARGET_OFFSET_PX,
      };
  }
}
