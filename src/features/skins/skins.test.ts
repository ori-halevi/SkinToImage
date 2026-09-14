import { describe, expect, it } from 'vitest';
import { detectModel } from './detectModel';
import { sanitizeName } from './loadSkin';
import { validateDimensions, validateFileType } from './validation';

function blankSkin(size: number, alpha: number) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = alpha;
  return { data, width: size, height: size };
}

function clearRegion(skin: ReturnType<typeof blankSkin>, x0: number, y0: number, w: number, h: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) skin.data[(y * skin.width + x) * 4 + 3] = 0;
}

describe('validateDimensions', () => {
  it.each([64, 128, 256, 1024])('accepts %i×%i', (s) => expect(validateDimensions(s, s)).toBeNull());
  it('rejects legacy 64×32', () => expect(validateDimensions(64, 32)).toBe('legacy-64x32'));
  it('rejects non-multiples of 64', () => expect(validateDimensions(100, 100)).toBe('bad-dimensions'));
  it('rejects non-square', () => expect(validateDimensions(64, 128)).toBe('bad-dimensions'));
  it('rejects oversized', () => expect(validateDimensions(2048, 2048)).toBe('too-large'));
});

describe('validateFileType', () => {
  it('accepts png by mime or extension', () => {
    expect(validateFileType({ type: 'image/png', name: 'a' })).toBeNull();
    expect(validateFileType({ type: '', name: 'skin.PNG' })).toBeNull();
  });
  it('rejects other types', () => expect(validateFileType({ type: 'image/jpeg', name: 'a.jpg' })).toBe('not-png'));
});

describe('detectModel', () => {
  it('detects classic when the 4th arm column is painted', () => {
    expect(detectModel(blankSkin(64, 255))).toBe('classic');
  });

  it('detects slim when the unused arm columns are transparent', () => {
    const skin = blankSkin(64, 255);
    clearRegion(skin, 54, 20, 2, 12);
    expect(detectModel(skin)).toBe('slim');
  });

  it('scales the check for HD skins', () => {
    const skin = blankSkin(128, 255);
    clearRegion(skin, 108, 40, 4, 24);
    expect(detectModel(skin)).toBe('slim');
    skin.data[(50 * 128 + 110) * 4 + 3] = 255;
    expect(detectModel(skin)).toBe('classic');
  });
});

describe('sanitizeName', () => {
  it('keeps safe filename characters', () => expect(sanitizeName(' My Skin (v2)! ')).toBe('My_Skin_v2_'));
});
