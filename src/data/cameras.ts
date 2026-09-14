export type CameraId = 'left' | 'front' | 'right';

/** The display name comes from i18n (`cameras.<id>`). */
export interface CameraPreset {
  id: CameraId;
  /** Horizontal orbit in degrees. 0 = facing the character; negative = camera moves to the viewer's left. */
  yaw: number;
  /** Vertical orbit in degrees. Positive = looking down from above. */
  pitch: number;
  /** Vertical field of view in degrees. Low = flat/telephoto, high = dramatic perspective. */
  fov: number;
}

export const CAMERAS: CameraPreset[] = [
  { id: 'left', yaw: -30, pitch: 6, fov: 30 },
  { id: 'front', yaw: 0, pitch: 2, fov: 30 },
  { id: 'right', yaw: 30, pitch: 6, fov: 30 },
];
