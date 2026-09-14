export type SkinModel = 'classic' | 'slim';

export interface Skin {
  id: string;
  name: string;
  model: SkinModel;
  detectedModel: SkinModel;
  /** Side length in pixels (64, 128, ...). */
  size: number;
  /** Original PNG, kept for persistence. */
  blob: Blob;
  bitmap: ImageBitmap;
  lastUsedAt: number;
}

/** Minimal pixel buffer shape, compatible with ImageData but usable in Node tests. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
