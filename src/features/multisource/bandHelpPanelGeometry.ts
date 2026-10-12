export interface BandHelpRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BandHelpViewport {
  width: number;
  height: number;
}

export const BAND_HELP_RESIZE_HANDLES = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw"
] as const;
export type BandHelpResizeHandle = (typeof BAND_HELP_RESIZE_HANDLES)[number];
const MARGIN = 8;
const MIN_WIDTH = 520;
const MIN_HEIGHT = 320;

export function clampBandHelpValue(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.max(minimum, Math.min(value, maximum));
}

export function fitBandHelpRect(
  rect: BandHelpRect,
  viewport: BandHelpViewport
): BandHelpRect {
  const maxWidth = Math.max(1, viewport.width - MARGIN * 2);
  const maxHeight = Math.max(1, viewport.height - MARGIN * 2);
  const width = clampBandHelpValue(
    rect.width,
    Math.min(MIN_WIDTH, maxWidth),
    maxWidth
  );
  const height = clampBandHelpValue(
    rect.height,
    Math.min(MIN_HEIGHT, maxHeight),
    maxHeight
  );
  return {
    width,
    height,
    left: clampBandHelpValue(
      rect.left,
      MARGIN,
      Math.max(MARGIN, viewport.width - width - MARGIN)
    ),
    top: clampBandHelpValue(
      rect.top,
      MARGIN,
      Math.max(MARGIN, viewport.height - height - MARGIN)
    )
  };
}

export function resizeBandHelpRect(
  rect: BandHelpRect,
  handle: BandHelpResizeHandle,
  deltaX: number,
  deltaY: number,
  viewport: BandHelpViewport
): BandHelpRect {
  const initial = fitBandHelpRect(rect, viewport);
  const minWidth = Math.min(MIN_WIDTH, viewport.width - MARGIN * 2);
  const minHeight = Math.min(MIN_HEIGHT, viewport.height - MARGIN * 2);
  let left = initial.left;
  let top = initial.top;
  let right = left + initial.width;
  let bottom = top + initial.height;
  if (handle.includes("w"))
    left = clampBandHelpValue(left + deltaX, MARGIN, right - minWidth);
  if (handle.includes("e"))
    right = clampBandHelpValue(
      right + deltaX,
      left + minWidth,
      viewport.width - MARGIN
    );
  if (handle.includes("n"))
    top = clampBandHelpValue(top + deltaY, MARGIN, bottom - minHeight);
  if (handle.includes("s"))
    bottom = clampBandHelpValue(
      bottom + deltaY,
      top + minHeight,
      viewport.height - MARGIN
    );
  return { left, top, width: right - left, height: bottom - top };
}

export function bandHelpSplitBounds(width: number) {
  const available = Math.max(1, width - 10);
  return {
    available,
    minimum: Math.min(160, available * 0.4),
    maximum: available - Math.min(240, available * 0.5)
  };
}

export function bandHelpSplitWidth(width: number, ratio: number) {
  const bounds = bandHelpSplitBounds(width);
  return clampBandHelpValue(
    bounds.available * ratio,
    bounds.minimum,
    bounds.maximum
  );
}
