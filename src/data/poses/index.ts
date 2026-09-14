import type { Pose, PoseCategory } from './types';

const modules = import.meta.glob<Pose>('./*.json', { eager: true, import: 'default' });

/** Gallery order. Poses not listed here are appended at the end. */
const ORDER = [
  'wave', 'point', 'shocked', 'facepalm', 'victory', 'thinking', 'pointSide', 'run',
  'jump', 'dab', 'stand', 'salute', 'crouch', 'sit', 'fall', 'tpose',
];

export const POSES: Pose[] = Object.values(modules).sort((a, b) => {
  const ia = ORDER.indexOf(a.id);
  const ib = ORDER.indexOf(b.id);
  return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
});

export const POSE_CATEGORIES: PoseCategory[] = ['emotion', 'action', 'casual', 'funny'];
