import type { Pose, PoseCategory } from './types';

const modules = import.meta.glob<Pose>('./*.json', { eager: true, import: 'default' });

/** Gallery order: the most thumbnail-friendly poses first. Poses not listed are appended at the end. */
const ORDER = [
  'wave', 'point', 'shocked', 'facepalm', 'victory', 'thinking', 'pointSide', 'scared',
  'angry', 'rage', 'laugh', 'cry', 'confused', 'shrug', 'heartHands', 'please', 'sad', 'bored',
  'thumbsUp', 'flex', 'pointUp', 'pointDown', 'shh', 'lookFar', 'cool',
  'run', 'sprint', 'jump', 'jumpKick', 'punch', 'kick', 'swordSwing', 'guard', 'throw', 'aim', 'fly',
  'sneak', 'climb', 'walk',
  'dab', 'floss', 'disco', 'zombie', 'ninjaRun', 'moonwalk', 'dizzy', 'airplane', 'penguin', 'handstand', 'chicken', 'tpose',
  'stand', 'armsCrossed', 'handsBehind', 'cheer', 'salute', 'pray', 'stretch', 'selfie', 'bow', 'crouch',
  'sit', 'sitGround', 'fall',
];

export const POSES: Pose[] = Object.values(modules).sort((a, b) => {
  const ia = ORDER.indexOf(a.id);
  const ib = ORDER.indexOf(b.id);
  return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
});

export const POSE_CATEGORIES: PoseCategory[] = ['emotion', 'action', 'casual', 'funny'];

export function getPose(id: string): Pose | undefined {
  return POSES.find((p) => p.id === id);
}
