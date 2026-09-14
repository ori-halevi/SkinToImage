import { BufferGeometry, Float32BufferAttribute } from 'three';
import { getFaceRects, type FaceId, type Vec3 } from './layout';

/**
 * For each face: corners as seen in the texture image (bottom-left, bottom-right, top-right, top-left),
 * expressed as signs of the box half-extents, plus the outward normal.
 * Orientation matches the game's player model (character faces +Z, right side at -X).
 */
const FACES: Record<FaceId, { corners: [Vec3, Vec3, Vec3, Vec3]; normal: Vec3 }> = {
  front: { normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  back: { normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  right: { normal: [-1, 0, 0], corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  left: { normal: [1, 0, 0], corners: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  top: { normal: [0, 1, 0], corners: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  bottom: { normal: [0, -1, 0], corners: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]] },
};

/**
 * Builds a box whose faces sample the skin texture's UV net.
 * UVs are normalized to 64px units, so HD skins (128, 256...) map identically.
 * The texture must use flipY = false (image row 0 = v 0).
 */
export function createSkinBoxGeometry(size: Vec3, uv: [number, number], inflate = 0): BufferGeometry {
  const half: Vec3 = [size[0] / 2 + inflate, size[1] / 2 + inflate, size[2] / 2 + inflate];
  const rects = getFaceRects(uv, size);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const faceId of Object.keys(FACES) as FaceId[]) {
    const { corners, normal } = FACES[faceId];
    const [x, y, w, h] = rects[faceId];
    const faceUvs = [
      [x, y + h],
      [x + w, y + h],
      [x + w, y],
      [x, y],
    ];
    const base = positions.length / 3;

    corners.forEach((c, i) => {
      positions.push(c[0] * half[0], c[1] * half[1], c[2] * half[2]);
      normals.push(...normal);
      uvs.push(faceUvs[i][0] / 64, faceUvs[i][1] / 64);
    });

    // Keep counter-clockwise winding when viewed from outside.
    const [a, b, c] = corners;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const outward = cross[0] * normal[0] + cross[1] * normal[1] + cross[2] * normal[2] > 0;
    if (outward) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
