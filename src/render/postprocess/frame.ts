export type FrameId = 'fit' | '16:9' | '1:1' | '9:16';
export const FRAME_IDS: FrameId[] = ['fit', '16:9', '1:1', '9:16'];

export type Background =
  | { type: 'transparent' }
  | { type: 'color'; color: string }
  | { type: 'gradient'; from: string; to: string }
  | { type: 'sunburst'; color: string; rays: string }
  | { type: 'image'; imageId: string };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Output dimensions for a frame; the long side equals `size`. `fit` has no fixed size. */
export function frameDimensions(frame: Exclude<FrameId, 'fit'>, size: number): [number, number] {
  switch (frame) {
    case '16:9':
      return [size, Math.round((size * 9) / 16)];
    case '9:16':
      return [Math.round((size * 9) / 16), size];
    case '1:1':
      return [size, size];
  }
}

/** Scales content to fit inside the frame minus a margin, centered. */
export function layoutInFrame(contentW: number, contentH: number, frameW: number, frameH: number, margin = 0.06): Rect {
  const availW = frameW * (1 - 2 * margin);
  const availH = frameH * (1 - 2 * margin);
  const scale = Math.min(availW / contentW, availH / contentH);
  const width = contentW * scale;
  const height = contentH * scale;
  return { x: (frameW - width) / 2, y: (frameH - height) / 2, width, height };
}

/** Rect for drawing an image so it covers the whole frame (cropping overflow), centered. */
export function coverRect(imageW: number, imageH: number, frameW: number, frameH: number): Rect {
  const scale = Math.max(frameW / imageW, frameH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return { x: (frameW - width) / 2, y: (frameH - height) / 2, width, height };
}

const backgroundImages = new Map<string, ImageBitmap>();

const MAX_BACKGROUND_SIDE = 4096;

/**
 * Decodes an uploaded background (downscaled to at most 4096px on its long side) and makes it the
 * only one kept in memory: a single background is used at a time, and phone photos are huge.
 */
export async function registerBackgroundImage(blob: Blob): Promise<string> {
  let bitmap = await createImageBitmap(blob);
  const scale = MAX_BACKGROUND_SIDE / Math.max(bitmap.width, bitmap.height);
  if (scale < 1) {
    try {
      const resized = await createImageBitmap(bitmap, {
        resizeWidth: Math.round(bitmap.width * scale),
        resizeHeight: Math.round(bitmap.height * scale),
        resizeQuality: 'high',
      });
      bitmap.close();
      bitmap = resized;
    } catch {
      // Resize options unsupported: keep the full-size image.
    }
  }
  releaseBackgroundImages();
  const id = crypto.randomUUID();
  backgroundImages.set(id, bitmap);
  return id;
}

/** Frees decoded background images (call when the image background is no longer used). */
export function releaseBackgroundImages(): void {
  for (const bitmap of backgroundImages.values()) bitmap.close();
  backgroundImages.clear();
}

export function hasBackgroundImage(id: string): boolean {
  return backgroundImages.has(id);
}

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/**
 * Paints a background. `resolveImage` looks up image backgrounds (defaults to the images registered
 * for renders; the editor passes its own asset lookup).
 */
export function paintBackground(
  ctx: Ctx,
  bg: Background,
  w: number,
  h: number,
  focus: { x: number; y: number },
  resolveImage: (id: string) => CanvasImageSource | undefined = (id) => backgroundImages.get(id),
) {
  switch (bg.type) {
    case 'transparent':
      return;
    case 'color':
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, w, h);
      return;
    case 'gradient': {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, bg.from);
      gradient.addColorStop(1, bg.to);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    case 'sunburst': {
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, w, h);
      const rays = 18;
      const radius = Math.hypot(w, h);
      ctx.fillStyle = bg.rays;
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2;
        const a1 = ((i + 0.5) / rays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(focus.x, focus.y);
        ctx.lineTo(focus.x + Math.cos(a0) * radius, focus.y + Math.sin(a0) * radius);
        ctx.lineTo(focus.x + Math.cos(a1) * radius, focus.y + Math.sin(a1) * radius);
        ctx.closePath();
        ctx.fill();
      }
      const glow = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, Math.max(w, h) * 0.6);
      glow.addColorStop(0, 'rgba(255,255,255,0.35)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    case 'image': {
      const image = resolveImage(bg.imageId);
      if (!image) return;
      const { width: iw, height: ih } = image as { width: number; height: number };
      const r = coverRect(iw, ih, w, h);
      ctx.drawImage(image, r.x, r.y, r.width, r.height);
      return;
    }
  }
}

/** Places the (trimmed) render into its frame on top of the background. */
export function composeFrame(content: OffscreenCanvas, background: Background, frame: FrameId, size: number): OffscreenCanvas {
  if (frame === 'fit') {
    if (background.type === 'transparent') return content;
    const out = new OffscreenCanvas(content.width, content.height);
    const ctx = out.getContext('2d')!;
    paintBackground(ctx, background, out.width, out.height, { x: out.width / 2, y: out.height / 2 });
    ctx.drawImage(content, 0, 0);
    return out;
  }

  const [w, h] = frameDimensions(frame, size);
  const out = new OffscreenCanvas(w, h);
  const ctx = out.getContext('2d')!;
  const r = layoutInFrame(content.width, content.height, w, h);
  paintBackground(ctx, background, w, h, { x: r.x + r.width / 2, y: r.y + r.height * 0.4 });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(content, r.x, r.y, r.width, r.height);
  return out;
}
