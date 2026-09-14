import { describe, expect, it } from 'vitest';
import { coverRect, frameDimensions, layoutInFrame } from './frame';

describe('frameDimensions', () => {
  it('keeps the long side at the export size', () => {
    expect(frameDimensions('16:9', 1920)).toEqual([1920, 1080]);
    expect(frameDimensions('9:16', 1920)).toEqual([1080, 1920]);
    expect(frameDimensions('1:1', 1024)).toEqual([1024, 1024]);
  });
});

describe('layoutInFrame', () => {
  it('fits a tall character into a wide frame, centered, within the margin', () => {
    const r = layoutInFrame(500, 1000, 1600, 900, 0.05);
    expect(r.height).toBeCloseTo(810);
    expect(r.width).toBeCloseTo(405);
    expect(r.x + r.width / 2).toBeCloseTo(800);
    expect(r.y).toBeCloseTo(45);
  });
});

describe('coverRect', () => {
  it('covers the frame and crops the overflow evenly', () => {
    const r = coverRect(1000, 1000, 1600, 900);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(1600);
    expect(r.y).toBe(-350);
  });
});
