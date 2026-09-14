import { getFaceRects, type FaceId, type Vec3 } from '../../render/rig/layout';

type Rect = [number, number, number, number];

/**
 * Plans the copies that upgrade a legacy 64×32 skin to 64×64 (in 64px units):
 * the left arm and leg reuse the right ones, mirrored, as the game does.
 * Mirroring a box swaps its right/left side faces and flips every face horizontally.
 */
export function legacyUpgradeCopies(): { from: Rect; to: Rect }[] {
  const copies: { from: Rect; to: Rect }[] = [];
  const limbs: { src: [number, number]; dst: [number, number]; size: Vec3 }[] = [
    { src: [0, 16], dst: [16, 48], size: [4, 12, 4] }, // right leg -> left leg
    { src: [40, 16], dst: [32, 48], size: [4, 12, 4] }, // right arm -> left arm
  ];
  const mirrorFace: Record<FaceId, FaceId> = { right: 'left', left: 'right', front: 'front', back: 'back', top: 'top', bottom: 'bottom' };

  for (const { src, dst, size } of limbs) {
    const from = getFaceRects(src, size);
    const to = getFaceRects(dst, size);
    for (const face of Object.keys(mirrorFace) as FaceId[]) copies.push({ from: from[mirrorFace[face]], to: to[face] });
  }
  return copies;
}

/**
 * Old skins often filled the hat layer with opaque color (commonly black). Like the game,
 * treat a hat layer with no transparent pixels at all as unused and clear it.
 */
export function isHatLayerFullyOpaque(alpha: (x: number, y: number) => number, scale: number): boolean {
  for (let y = 0; y < 16 * scale; y++) {
    for (let x = 32 * scale; x < 64 * scale; x++) if (alpha(x, y) < 128) return false;
  }
  return true;
}

function clearOpaqueHatLayer(ctx: OffscreenCanvasRenderingContext2D, scale: number) {
  const data = ctx.getImageData(0, 0, 64 * scale, 16 * scale);
  if (isHatLayerFullyOpaque((x, y) => data.data[(y * data.width + x) * 4 + 3], scale)) {
    ctx.clearRect(32 * scale, 0, 32 * scale, 16 * scale);
  }
}

/** Converts a 64×32 (or HD 2:1) skin image into the modern square layout. */
export async function upgradeLegacySkin(bitmap: ImageBitmap): Promise<Blob> {
  const scale = bitmap.width / 64;
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.width);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0);

  clearOpaqueHatLayer(ctx, scale);

  for (const { from, to } of legacyUpgradeCopies()) {
    const [fx, fy, fw, fh] = from.map((v) => v * scale);
    const [tx, ty, tw, th] = to.map((v) => v * scale);
    ctx.save();
    ctx.translate(tx + tw, ty);
    ctx.scale(-1, 1);
    ctx.drawImage(bitmap, fx, fy, fw, fh, 0, 0, tw, th);
    ctx.restore();
  }
  return canvas.convertToBlob({ type: 'image/png' });
}
