import { describe, expect, it } from 'vitest';
import type { PixelBuffer } from '../../features/skins/types';
import { applyOutline, hexToRgb, squaredDistanceField } from './outline';
import { findAlphaBounds, padRect } from './trim';

function image(width: number, height: number) {
  return { data: new Uint8ClampedArray(width * height * 4), width, height };
}

function setPixel(img: ReturnType<typeof image>, x: number, y: number, rgba: [number, number, number, number]) {
  img.data.set(rgba, (y * img.width + x) * 4);
}

const alphaAt = (img: PixelBuffer, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

describe('findAlphaBounds', () => {
  it('returns null for a fully transparent image', () => expect(findAlphaBounds(image(8, 8))).toBeNull());

  it('finds the tight box around visible pixels', () => {
    const img = image(10, 10);
    setPixel(img, 2, 3, [0, 0, 0, 255]);
    setPixel(img, 6, 8, [0, 0, 0, 1]);
    expect(findAlphaBounds(img)).toEqual({ x: 2, y: 3, width: 5, height: 6 });
  });
});

describe('padRect', () => {
  it('pads and clamps to the image', () => {
    expect(padRect({ x: 1, y: 5, width: 3, height: 3 }, 2, 10, 9)).toEqual({ x: 0, y: 3, width: 6, height: 6 });
  });
});

describe('squaredDistanceField', () => {
  it('matches brute force', () => {
    const w = 13;
    const h = 9;
    const inside = new Uint8Array(w * h);
    const seeds = [[2, 2], [10, 7], [6, 0]];
    for (const [x, y] of seeds) inside[y * w + x] = 1;

    const field = squaredDistanceField(inside, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const expected = Math.min(...seeds.map(([sx, sy]) => (sx - x) ** 2 + (sy - y) ** 2));
        expect(field[y * w + x]).toBe(expected);
      }
    }
  });
});

describe('applyOutline', () => {
  it('surrounds opaque pixels with the outline color without altering them', () => {
    const img = image(21, 21);
    setPixel(img, 10, 10, [10, 20, 30, 255]);
    applyOutline(img, 3, '#ff0000');

    expect(Array.from(img.data.slice((10 * 21 + 10) * 4, (10 * 21 + 10) * 4 + 4))).toEqual([10, 20, 30, 255]);
    expect(Array.from(img.data.slice((10 * 21 + 12) * 4, (10 * 21 + 12) * 4 + 4))).toEqual([255, 0, 0, 255]);
    expect(alphaAt(img, 14, 10)).toBe(0);
    expect(alphaAt(img, 10, 6)).toBe(0);
  });

  it('ignores thin slivers when smoothing is enabled', () => {
    const make = () => {
      const img = image(40, 40);
      for (let y = 10; y < 30; y++) for (let x = 10; x < 20; x++) setPixel(img, x, y, [0, 0, 0, 255]);
      for (let x = 20; x < 26; x++) setPixel(img, x, 20, [0, 0, 0, 255]); // 1px sliver
      return img;
    };
    // Just past the sliver's tip: covered by a plain outline, but not a smoothed one.
    expect(alphaAt(applyOutline(make(), 3, '#ffffff'), 27, 20)).toBe(255);
    const smoothed = applyOutline(make(), 3, '#ffffff', 2);
    expect(alphaAt(smoothed, 27, 20)).toBe(0);
    expect(alphaAt(smoothed, 21, 15)).toBe(255); // still outlines the block itself
  });

  it('is a no-op for radius 0 or empty images', () => {
    const img = image(5, 5);
    applyOutline(img, 4, '#ffffff');
    expect(findAlphaBounds(img)).toBeNull();
  });

  it('parses hex colors', () => expect(hexToRgb('#12abEF')).toEqual([0x12, 0xab, 0xef]));
});
