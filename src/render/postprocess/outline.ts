import type { PixelBuffer } from '../../features/skins/types';
import { findAlphaBounds, padRect } from './trim';

const INF = 1e20;

/**
 * 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher).
 * Reads f[offset + i*stride] for i < n and writes the result back in place.
 */
function edt1d(f: Float32Array, offset: number, stride: number, n: number, d: Float32Array, v: Int32Array, z: Float64Array) {
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

/**
 * Squared distance from each pixel to the nearest pixel whose mask value equals `target`, written into `out`.
 * Float32 keeps a 4096² field at 64 MB (distances stay exact well past any outline radius).
 */
function distanceField(mask: Uint8Array, width: number, height: number, target: 0 | 1, out: Float32Array): Float32Array {
  for (let i = 0; i < out.length; i++) out[i] = mask[i] === target ? 0 : INF;
  const n = Math.max(width, height);
  const d = new Float32Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) edt1d(out, x, width, height, d, v, z);
  for (let y = 0; y < height; y++) edt1d(out, y * width, 1, width, d, v, z);
  return out;
}

/** Squared distance from each pixel to the nearest pixel where `inside` is true. */
export function squaredDistanceField(inside: Uint8Array, width: number, height: number): Float32Array {
  return distanceField(inside, width, height, 1, new Float32Array(width * height));
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

  // One float buffer is reused for both passes to keep peak memory low on large renders.
  const field = new Float32Array(mask.length);

  // Morphological opening: erode by `smoothing` here (in place), then dilate by radius + smoothing below.
  if (smoothing > 0) {
    distanceField(mask, region.width, region.height, 0, field);
    const limit = smoothing * smoothing;
    let survivors = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i] && field[i] > limit) survivors++;
    if (survivors > 0) {
      for (let i = 0; i < mask.length; i++) mask[i] = mask[i] && field[i] > limit ? 1 : 0;
    } else {
      smoothing = 0; // everything is thinner than the smoothing size; outline it as-is
    }
  }

  const dist2 = distanceField(mask, region.width, region.height, 1, field);
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
