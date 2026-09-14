import { detectModel } from './detectModel';
import type { Skin, SkinModel } from './types';
import { validateDimensions, validateFileType, type SkinValidationError } from './validation';

export class SkinLoadError extends Error {
  constructor(readonly code: SkinValidationError) {
    super(code);
  }
}

export interface SkinOverrides {
  id?: string;
  model?: SkinModel;
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

  const dimensionError = validateDimensions(bitmap.width, bitmap.height);
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
    model: overrides.model ?? detectedModel,
    detectedModel,
    size: bitmap.width,
    blob,
    bitmap,
    lastUsedAt: Date.now(),
  };
}

export function sanitizeName(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
}
