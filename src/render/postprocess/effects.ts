
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

/** Stay under iOS Safari's per-canvas limit (16,777,216 px). */
const MAX_CANVAS_PIXELS = 16_000_000;

/** Frees a canvas's backing memory now instead of waiting for GC (matters on iOS). */
export function releaseCanvas(canvas: OffscreenCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Adds a glow and/or drop shadow behind the image and crops to where they can reach.
 * Values are scaled by `scale`. Consumes `image` (its memory is released).
 */
export function applyShadowAndGlow(image: OffscreenCanvas, shadow: ShadowSettings, glow: GlowSettings, scale: number): OffscreenCanvas {
  if (!shadow.enabled && !glow.enabled) return image;

  const blur = shadow.blur * scale;
  const distance = shadow.distance * scale;
  const glowSize = glow.size * scale;
  // A canvas shadow with shadowBlur b fades out at roughly 1.5·b from the shape.
  const reachBefore = Math.max(shadow.enabled ? blur * 1.5 - distance : 0, glow.enabled ? glowSize * 1.5 : 0, 0);
  const reachAfter = Math.max(shadow.enabled ? blur * 1.5 + distance : 0, glow.enabled ? glowSize * 1.5 : 0);

  let pad = Math.ceil(Math.max(reachBefore, reachAfter)) + 2;
  while (pad > 2 && (image.width + pad * 2) * (image.height + pad * 2) > MAX_CANVAS_PIXELS) pad = Math.floor(pad * 0.8);

  const canvas = new OffscreenCanvas(image.width + pad * 2, image.height + pad * 2);
  const ctx = canvas.getContext('2d')!;

  if (shadow.enabled) {
    drawShadowOnly(ctx, image, pad, pad, `rgba(0,0,0,${shadow.opacity})`, blur, distance, distance);
  }
  if (glow.enabled) {
    // Stack passes: a single canvas shadow is too faint to read as a glow.
    for (const factor of [1, 0.5, 0.25]) drawShadowOnly(ctx, image, pad, pad, glow.color, glowSize * factor, 0, 0);
  }
  ctx.drawImage(image, pad, pad);

  const x = Math.max(0, Math.floor(pad - reachBefore));
  const y = x;
  const right = Math.min(canvas.width, Math.ceil(pad + image.width + reachAfter));
  const bottom = Math.min(canvas.height, Math.ceil(pad + image.height + reachAfter));
  releaseCanvas(image);

  const out = new OffscreenCanvas(right - x, bottom - y);
  out.getContext('2d')!.drawImage(canvas, x, y, out.width, out.height, 0, 0, out.width, out.height);
  releaseCanvas(canvas);
  return out;
}

export function mirrorCanvas(image: OffscreenCanvas): OffscreenCanvas {
  const out = new OffscreenCanvas(image.width, image.height);
  const ctx = out.getContext('2d')!;
  ctx.translate(image.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  releaseCanvas(image);
  return out;
}
