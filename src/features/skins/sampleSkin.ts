import { getFaceRects, getPartLayouts, type FaceId } from '../../render/rig/layout';

/**
 * Draws an original sample skin ("Blocky Explorer") so people can try the app without a file.
 * Intentionally not based on any official character.
 */
export function createSampleSkinBlob(): Promise<Blob> {
  const canvas = new OffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d')!;
  const parts = Object.fromEntries(getPartLayouts('classic').map((p) => [p.id, p]));

  const SKIN = '#e0a878';
  const SKIN_SHADE = '#c98d5f';
  const HAIR = '#5a3a1e';
  const HOODIE = '#2a9d8f';
  const HOODIE_DARK = '#1f7a70';
  const PANTS = '#34405a';
  const SHOE = '#2b2b2b';

  const fillFaces = (uv: [number, number], size: [number, number, number], colors: Partial<Record<FaceId, string>>) => {
    const rects = getFaceRects(uv, size);
    for (const [face, color] of Object.entries(colors) as [FaceId, string][]) {
      ctx.fillStyle = color;
      ctx.fillRect(...rects[face]);
    }
  };
  const px = (color: string, x: number, y: number, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const all = (color: string) => ({ top: color, bottom: color, right: color, left: color, front: color, back: color });

  // Head
  fillFaces(parts.head.uv, parts.head.size, { ...all(SKIN), top: HAIR, back: HAIR });
  const head = getFaceRects(parts.head.uv, parts.head.size);
  for (const face of ['front', 'right', 'left'] as const) px(HAIR, head[face][0], head[face][1], head[face][2], 2);
  const [fx, fy] = head.front;
  px('#ffffff', fx + 1, fy + 4, 2, 1);
  px('#ffffff', fx + 5, fy + 4, 2, 1);
  px('#3b6fd8', fx + 2, fy + 4);
  px('#3b6fd8', fx + 5, fy + 4);
  px(SKIN_SHADE, fx + 3, fy + 5, 2, 1);
  px('#8a4b3a', fx + 3, fy + 6, 2, 1);

  // Hat layer: side fringe
  const hat = getFaceRects(parts.head.overlayUv, parts.head.size);
  px(HAIR, hat.front[0], hat.front[1] + 2, 1, 1);
  px(HAIR, hat.front[0] + 7, hat.front[1] + 2, 1, 1);

  // Body (hoodie with a zip and pocket)
  fillFaces(parts.body.uv, parts.body.size, all(HOODIE));
  const body = getFaceRects(parts.body.uv, parts.body.size);
  px('#e9c46a', body.front[0] + 3, body.front[1], 2, 1);
  px(HOODIE_DARK, body.front[0] + 2, body.front[1] + 7, 4, 3);
  px('#d9d9d9', body.front[0] + 4, body.front[1] + 1, 1, 6);

  // Arms: sleeves + hands; right wrist gets a gold band so left/right mix-ups are obvious.
  for (const id of ['rightArm', 'leftArm'] as const) {
    const arm = parts[id];
    fillFaces(arm.uv, arm.size, { ...all(HOODIE), bottom: SKIN });
    const rects = getFaceRects(arm.uv, arm.size);
    for (const face of ['front', 'back', 'left', 'right'] as const) {
      px(SKIN, rects[face][0], rects[face][1] + 9, rects[face][2], 3);
      if (id === 'rightArm') px('#e9c46a', rects[face][0], rects[face][1] + 8, rects[face][2], 1);
    }
  }

  // Legs: pants + shoes
  for (const id of ['rightLeg', 'leftLeg'] as const) {
    const leg = parts[id];
    fillFaces(leg.uv, leg.size, { ...all(PANTS), bottom: SHOE });
    const rects = getFaceRects(leg.uv, leg.size);
    for (const face of ['front', 'back', 'left', 'right'] as const) {
      px(SHOE, rects[face][0], rects[face][1] + 10, rects[face][2], 2);
    }
  }

  return canvas.convertToBlob({ type: 'image/png' });
}
