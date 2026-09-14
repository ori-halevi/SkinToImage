import type { PixelBuffer } from '../../features/skins/types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding box of all pixels with alpha > threshold, or null if the image is fully transparent. */
export function findAlphaBounds(image: PixelBuffer, threshold = 0): Rect | null {
  const { data, width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (data[(row + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Expands a rect by `padding` on every side, clamped to the image bounds. */
export function padRect(rect: Rect, padding: number, width: number, height: number): Rect {
  const x = Math.max(0, rect.x - padding);
  const y = Math.max(0, rect.y - padding);
  return {
    x,
    y,
    width: Math.min(width, rect.x + rect.width + padding) - x,
    height: Math.min(height, rect.y + rect.height + padding) - y,
  };
}
