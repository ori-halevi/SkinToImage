import type { PixelBuffer, SkinModel } from './types';

/**
 * Slim arms are 3px wide, so on a slim skin the right arm's texture region is 2px narrower
 * and pixels x=54..55, y=20..31 (in 64px units) are unused and fully transparent.
 */
export function detectModel(skin: PixelBuffer): SkinModel {
  const scale = skin.width / 64;
  for (let y = 20 * scale; y < 32 * scale; y++) {
    for (let x = 54 * scale; x < 56 * scale; x++) {
      if (skin.data[(y * skin.width + x) * 4 + 3] !== 0) return 'classic';
    }
  }
  return 'slim';
}
