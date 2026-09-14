import { detectModel } from './detectModel';
import { upgradeLegacySkin } from './legacySkin';
import { ALL_OVERLAY_PARTS, type OverlayParts, type Skin, type SkinModel } from './types';
import { validateDimensions, validateFileType, type SkinValidationError } from './validation';

export class SkinLoadError extends Error {
  constructor(readonly code: SkinValidationError) {
    super(code);
  }
}

export interface SkinOverrides {
  id?: string;
  /** The user's chosen model (e.g. restored from recent skins). */
  model?: SkinModel;
  /** Authoritative default model (e.g. from the player's profile); falls back to pixel detection. */
  defaultModel?: SkinModel;
  overlay?: Partial<OverlayParts>;
  silhouette?: boolean;
  /** Convert legacy 64×32 skins instead of rejecting them (used for skins fetched by username). */
  upgradeLegacy?: boolean;
}

export async function loadSkinFromBlob(blob: Blob, name: string, overrides: SkinOverrides = {}): Promise<Skin> {
  const typeError = validateFileType({ type: blob.type, name: name.endsWith('.png') ? name : `${name}.png` });
  if (typeError) throw new SkinLoadError(typeError);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  } catch {
    throw new SkinLoadError('not-png');
  }

  let dimensionError = validateDimensions(bitmap.width, bitmap.height);
  if (dimensionError === 'legacy-64x32' && overrides.upgradeLegacy) {
    blob = await upgradeLegacySkin(bitmap);
    bitmap.close();
    bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    dimensionError = validateDimensions(bitmap.width, bitmap.height);
  }
  if (dimensionError) {
    bitmap.close();
    throw new SkinLoadError(dimensionError);
  }

  const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const detectedModel = detectModel(ctx.getImageData(0, 0, bitmap.width, bitmap.height));

  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: sanitizeName(name.replace(/\.png$/i, '')) || 'skin',
    model: overrides.model ?? overrides.defaultModel ?? detectedModel,
    detectedModel,
    defaultModel: overrides.defaultModel ?? detectedModel,
    size: bitmap.width,
    blob,
    bitmap,
    overlay: { ...ALL_OVERLAY_PARTS, ...overrides.overlay },
    silhouette: overrides.silhouette ?? false,
    lastUsedAt: Date.now(),
  };
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
}
