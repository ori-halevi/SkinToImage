export type CameraId = 'left' | 'front' | 'right' | 'hero' | 'closeUp' | 'wide' | 'back';

/** The display name comes from i18n (`cameras.<id>`). */
export interface CameraPreset {
  id: CameraId;
  /** Horizontal orbit in degrees. 0 = facing the character; negative = camera moves to the viewer's left. */
  yaw: number;
  /** Vertical orbit in degrees. Positive = looking down from above, negative = from below. */
  pitch: number;
  /** Vertical field of view in degrees. Low = flat/telephoto, high = dramatic perspective. */
  fov: number;
  /** Frame the heads only (the rest of the body is cropped by the frame edge). */
  focus?: 'all' | 'heads';
}

export const CAMERAS: CameraPreset[] = [
  { id: 'left', yaw: -30, pitch: 6, fov: 30 },
  { id: 'front', yaw: 0, pitch: 2, fov: 30 },
  { id: 'right', yaw: 30, pitch: 6, fov: 30 },
  { id: 'hero', yaw: -20, pitch: -22, fov: 38 },
  { id: 'closeUp', yaw: -20, pitch: 4, fov: 30, focus: 'heads' },
  { id: 'wide', yaw: -35, pitch: 10, fov: 75 },
  { id: 'back', yaw: 180, pitch: 8, fov: 30 },
];

export function getCamera(id: string): CameraPreset {
  return CAMERAS.find((c) => c.id === id) ?? CAMERAS[0];
}
