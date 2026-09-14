import type { PixelBuffer } from '../../features/skins/types';
import { findAlphaBounds, padRect } from './trim';

const INF = 1e20;

/**
 * 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher).
 * Reads f[offset + i*stride] for i < n and writes the result back in place.
 */
function edt1d(f: Float64Array, offset: number, stride: number, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    const fq = f[offset + q * stride];
    let s: number;
    do {
      const r = v[k];
      s = (fq + q * q - (f[offset + r * stride] + r * r)) / (2 * (q - r));
    } while (s <= z[k] && --k >= 0);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    d[q] = (q - r) * (q - r) + f[offset + r * stride];
  }
  for (let q = 0; q < n; q++) f[offset + q * stride] = d[q];
}

/** Squared distance from each pixel to the nearest pixel where `inside` is true. */
export function squaredDistanceField(inside: Uint8Array, width: number, height: number): Float64Array {
  const f = new Float64Array(width * height);
  for (let i = 0; i < f.length; i++) f[i] = inside[i] ? 0 : INF;

  const n = Math.max(width, height);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) edt1d(f, x, width, height, d, v, z);
  for (let y = 0; y < height; y++) edt1d(f, y * width, 1, width, d, v, z);
  return f;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Draws an anti-aliased solid outline of `radius` pixels around all opaque content, beneath it.
 * `smoothing` ignores slivers thinner than ~2×smoothing px (e.g. anti-aliased edges poking out),
 * which would otherwise get odd round bumps in the outline.
 * Mutates and returns `image`. Content closer than `radius` to the edges is clipped.
 */
export function applyOutline(image: PixelBuffer, radius: number, color: string, smoothing = 0): PixelBuffer {
  if (radius <= 0) return image;
  const { data, width, height } = image;
  const bounds = findAlphaBounds(image, 0);
  if (!bounds) return image;

  // Only process the region that the outline can reach.
  const region = padRect(bounds, Math.ceil(radius) + 1, width, height);
  const mask = new Uint8Array(region.width * region.height);
  for (let y = 0; y < region.height; y++) {
    for (let x = 0; x < region.width; x++) {
      mask[y * region.width + x] = data[((region.y + y) * width + region.x + x) * 4 + 3] >= 128 ? 1 : 0;
    }
  }

  // Morphological opening: erode by `smoothing` here, then dilate by radius + smoothing below.
  let source = mask;
  if (smoothing > 0) {
    const outside = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) outside[i] = 1 - mask[i];
    const toOutside = squaredDistanceField(outside, region.width, region.height);
    const eroded = new Uint8Array(mask.length);
    let any = false;
    for (let i = 0; i < mask.length; i++) {
      if (toOutside[i] > smoothing * smoothing) {
        eroded[i] = 1;
        any = true;
      }
    }
    if (any) source = eroded;
    else smoothing = 0;
  }

  const dist2 = squaredDistanceField(source, region.width, region.height);
  const reach = radius + smoothing + 0.5;
  const [r, g, b] = hexToRgb(color);

  for (let y = 0; y < region.height; y++) {
    for (let x = 0; x < region.width; x++) {
      const coverage = Math.min(1, Math.max(0, reach - Math.sqrt(dist2[y * region.width + x])));
      if (coverage === 0) continue;

      const i = ((region.y + y) * width + region.x + x) * 4;
      const srcA = data[i + 3] / 255;
      const outA = srcA + coverage * (1 - srcA);
      const under = coverage * (1 - srcA);
      data[i] = (data[i] * srcA + r * under) / outA;
      data[i + 1] = (data[i + 1] * srcA + g * under) / outA;
      data[i + 2] = (data[i + 2] * srcA + b * under) / outA;
      data[i + 3] = outA * 255;
    }
  }
  return image;
}
