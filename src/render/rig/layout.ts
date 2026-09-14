import type { SkinModel } from '../../features/skins/types';

export type PartId = 'head' | 'body' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';
export type Vec3 = [number, number, number];

export interface BoxLayout {
  /** Box size in skin pixels: width (x), height (y), depth (z). */
  size: Vec3;
  /** Top-left corner of the box's UV net in 64px texture units. */
  uv: [number, number];
  overlayUv: [number, number];
  overlayInflate: number;
}

export interface PartLayout extends BoxLayout {
  id: PartId;
  /** Joint position, relative to the parent joint (body parent = hips, others = root). */
  pivot: Vec3;
  /** Box center relative to its pivot. */
  offset: Vec3;
  parent: 'root' | 'body';
}

/**
 * World units are skin pixels. Y is up, feet at y=0, the character faces +Z,
 * so the character's right side is at -X (the viewer's left in a front view).
 * Body pivot is at the hips so leaning the body carries the head and arms with it.
 */
export function getPartLayouts(model: SkinModel): PartLayout[] {
  const armW = model === 'slim' ? 3 : 4;
  const armOffsetX = model === 'slim' ? 0.5 : 1;
  const armPivotY = model === 'slim' ? 9.5 : 10;

  return [
    { id: 'body', parent: 'root', pivot: [0, 12, 0], offset: [0, 6, 0], size: [8, 12, 4], uv: [16, 16], overlayUv: [16, 32], overlayInflate: 0.25 },
    { id: 'head', parent: 'body', pivot: [0, 12, 0], offset: [0, 4, 0], size: [8, 8, 8], uv: [0, 0], overlayUv: [32, 0], overlayInflate: 0.5 },
    { id: 'rightArm', parent: 'body', pivot: [-5, armPivotY, 0], offset: [-armOffsetX, -4, 0], size: [armW, 12, 4], uv: [40, 16], overlayUv: [40, 32], overlayInflate: 0.25 },
    { id: 'leftArm', parent: 'body', pivot: [5, armPivotY, 0], offset: [armOffsetX, -4, 0], size: [armW, 12, 4], uv: [32, 48], overlayUv: [48, 48], overlayInflate: 0.25 },
    { id: 'rightLeg', parent: 'root', pivot: [-2, 12, 0], offset: [0, -6, 0], size: [4, 12, 4], uv: [0, 16], overlayUv: [0, 32], overlayInflate: 0.25 },
    { id: 'leftLeg', parent: 'root', pivot: [2, 12, 0], offset: [0, -6, 0], size: [4, 12, 4], uv: [16, 48], overlayUv: [0, 48], overlayInflate: 0.25 },
  ];
}

export type FaceId = 'right' | 'left' | 'top' | 'bottom' | 'front' | 'back';

/**
 * Texture rectangles [x, y, w, h] (64px units, y down) of each face in a box's UV net:
 *
 *          [top][bottom]
 *   [right][front][left][back]
 */
export function getFaceRects(uv: [number, number], size: Vec3): Record<FaceId, [number, number, number, number]> {
  const [u, v] = uv;
  const [w, h, d] = size;
  return {
    top: [u + d, v, w, d],
    bottom: [u + d + w, v, w, d],
    right: [u, v + d, d, h],
    front: [u + d, v + d, w, h],
    left: [u + d + w, v + d, d, h],
    back: [u + d + w + d, v + d, w, h],
  };
}
