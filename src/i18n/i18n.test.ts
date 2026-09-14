import { describe, expect, it } from 'vitest';
import { CAMERAS } from '../data/cameras';
import { POSE_CATEGORIES, POSES, getPose } from '../data/poses';
import { SCENES } from '../data/scenes';
import { FRAME_IDS } from '../render/postprocess/frame';
import { ITEM_IDS } from '../render/props/items';
import { PROP_IDS } from '../render/props/meshes';
import { GROUND_IDS } from '../render/renderShot';
import en from './en.json';
import he from './he.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

/** Plural suffixes may differ between languages, so compare base keys. */
const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');

describe('translations', () => {
  it.each([
    ['en', en],
    ['he', he],
  ])('%s defines every plural form its language needs', (lang, dict) => {
    const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    const pluralBases = new Set(keys(dict).filter((k) => /_(zero|one|two|few|many|other)$/.test(k)).map(base));
    for (const key of pluralBases) {
      // i18next falls back to English (not "other") when a category is missing.
      for (const category of categories) expect(keys(dict), `${lang}: ${key}_${category}`).toContain(`${key}_${category}`);
    }
  });

  it('en and he define the same keys', () => {
    expect([...new Set(keys(he).map(base))].sort()).toEqual([...new Set(keys(en).map(base))].sort());
  });

  it.each([
    ['en', en],
    ['he', he],
  ])('%s names every pose, scene, camera, category, item, ground and frame', (_, dict) => {
    for (const pose of POSES) expect(dict.poses).toHaveProperty(pose.id);
    for (const scene of SCENES) expect(dict.scenes).toHaveProperty(scene.id);
    for (const camera of CAMERAS) expect(dict.cameras).toHaveProperty(camera.id);
    for (const category of POSE_CATEGORIES) expect(dict.categories).toHaveProperty(category);
    for (const item of ['none', ...ITEM_IDS]) expect(dict.items).toHaveProperty(item);
    for (const ground of GROUND_IDS) expect(dict.grounds).toHaveProperty(ground);
    for (const frame of FRAME_IDS) expect(dict.frames).toHaveProperty([frame]);
  });
});

describe('poses', () => {
  it('have unique ids, valid categories and at least 40 entries', () => {
    expect(POSES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(POSES.map((p) => p.id)).size).toBe(POSES.length);
    for (const pose of POSES) expect(POSE_CATEGORIES).toContain(pose.category);
  });
});

describe('scenes', () => {
  it('reference existing poses, items and props, with 1–4 characters', () => {
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    for (const scene of SCENES) {
      expect(scene.slots.length).toBeGreaterThanOrEqual(1);
      expect(scene.slots.length).toBeLessThanOrEqual(4);
      for (const slot of scene.slots) {
        expect(getPose(slot.poseId), `${scene.id}: ${slot.poseId}`).toBeDefined();
        for (const item of Object.values(slot.items ?? {})) expect(ITEM_IDS).toContain(item);
      }
      for (const prop of scene.props ?? []) expect(PROP_IDS).toContain(prop.propId);
    }
  });
});
