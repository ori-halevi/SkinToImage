import { describe, expect, it } from 'vitest';
import { CAMERAS } from '../data/cameras';
import { POSE_CATEGORIES, POSES } from '../data/poses';
import en from './en.json';
import he from './he.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

/** Hebrew has no separate "one" plural form requirement mismatch, so compare base keys. */
const base = (k: string) => k.replace(/_(one|other|two|many)$/, '');

describe('translations', () => {
  it('en and he define the same keys', () => {
    expect([...new Set(keys(he).map(base))].sort()).toEqual([...new Set(keys(en).map(base))].sort());
  });

  it.each([
    ['en', en],
    ['he', he],
  ])('%s names every pose, camera and category', (_, dict) => {
    for (const pose of POSES) expect(dict.poses).toHaveProperty(pose.id);
    for (const camera of CAMERAS) expect(dict.cameras).toHaveProperty(camera.id);
    for (const category of POSE_CATEGORIES) expect(dict.categories).toHaveProperty(category);
  });
});

describe('poses', () => {
  it('have unique ids, valid categories and at least 15 entries', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(POSES.map((p) => p.id)).size).toBe(POSES.length);
    for (const pose of POSES) expect(POSE_CATEGORIES).toContain(pose.category);
  });
});
