import { findAlphaBounds, padRect } from './trim';

export interface ShadowSettings {
  enabled: boolean;
  /** 0–1 */
  opacity: number;
  /** Blur radius in px at the 2048px reference size. */
  blur: number;
  /** Offset down-right in px at the reference size. */
  distance: number;
}

export interface GlowSettings {
  enabled: boolean;
  color: string;
  /** Glow radius in px at the reference size. */
  size: number;
}

/** Canvas shadows are drawn from far off-canvas so only the shadow lands, never a second copy of the image. */
const OFFSCREEN = 100_000;

function drawShadowOnly(ctx: OffscreenCanvasRenderingContext2D, image: OffscreenCanvas, x: number, y: number, color: string, blur: number, dx: number, dy: number) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = OFFSCREEN + dx;
  ctx.shadowOffsetY = dy;
  ctx.drawImage(image, x - OFFSCREEN, y);
  ctx.restore();
}

/**
 * Adds a glow and/or drop shadow behind the image, growing the canvas as needed
 * and trimming it back to the visible result. Values are scaled by `scale`.
 */
export function applyShadowAndGlow(image: OffscreenCanvas, shadow: ShadowSettings, glow: GlowSettings, scale: number): OffscreenCanvas {
  if (!shadow.enabled && !glow.enabled) return image;

  const blur = shadow.blur * scale;
  const distance = shadow.distance * scale;
  const glowSize = glow.size * scale;
  const pad = Math.ceil(Math.max(shadow.enabled ? blur * 2 + distance : 0, glow.enabled ? glowSize * 2 : 0)) + 2;

  const canvas = new OffscreenCanvas(image.width + pad * 2, image.height + pad * 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  if (shadow.enabled) {
    drawShadowOnly(ctx, image, pad, pad, `rgba(0,0,0,${shadow.opacity})`, blur, distance, distance);
  }
  if (glow.enabled) {
    // Stack passes: a single canvas shadow is too faint to read as a glow.
    for (const factor of [1, 0.5, 0.25]) drawShadowOnly(ctx, image, pad, pad, glow.color, glowSize * factor, 0, 0);
  }
  ctx.drawImage(image, pad, pad);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findAlphaBounds(data, 2);
  if (!bounds) return canvas;
  const crop = padRect(bounds, Math.max(2, Math.round(8 * scale)), canvas.width, canvas.height);
  const out = new OffscreenCanvas(crop.width, crop.height);
  out.getContext('2d')!.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return out;
}

export function mirrorCanvas(image: OffscreenCanvas): OffscreenCanvas {
  const out = new OffscreenCanvas(image.width, image.height);
  const ctx = out.getContext('2d')!;
  ctx.translate(image.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  return out;
}
