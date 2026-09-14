import type { PartId } from '../../render/rig/layout';

export type SkinModel = 'classic' | 'slim';

/** Which body parts show their second layer (hat, jacket, sleeves, pants legs). */
export type OverlayParts = Record<PartId, boolean>;

export const ALL_OVERLAY_PARTS: OverlayParts = { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true };

export interface Skin {
  id: string;
  name: string;
  model: SkinModel;
  /** Model guessed from the texture's pixels. */
  detectedModel: SkinModel;
  /**
   * The model "reset" returns to: the player profile's model for skins loaded by username
   * (more reliable than pixels), otherwise the detected one.
   */
  defaultModel: SkinModel;
  /** Side length in pixels (64, 128, ...). */
  size: number;
  /** Original PNG, kept for persistence. */
  blob: Blob;
  bitmap: ImageBitmap;
  /** Second-layer visibility per body part. */
  overlay: OverlayParts;
  lastUsedAt: number;
}

/** Minimal pixel buffer shape, compatible with ImageData but usable in Node tests. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
