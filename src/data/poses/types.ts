import type { PartId, Vec3 } from '../../render/rig/layout';

export type PoseCategory = 'emotion' | 'action' | 'casual' | 'funny';

/**
 * Joint rotations in degrees (Euler XYZ), relative to the neutral standing pose.
 * The display name comes from i18n (`poses.<id>`).
 * Conventions for a character facing the camera:
 *  - X: negative swings a limb forward (toward the viewer); for head/body, positive leans forward/down.
 *  - Y: positive turns toward the character's left.
 *  - Z: negative raises the right arm/leg outward; positive raises the left one outward.
 *    For head/body, positive tilts toward the character's right.
 */
export interface Pose {
  id: string;
  category: PoseCategory;
  bones: Partial<Record<PartId, Vec3>>;
  root?: { position?: Vec3; rotation?: Vec3 };
}
