import { describe, expect, it } from 'vitest';
import { getScene } from '../../data/scenes';
import { DEFAULT_SETTINGS } from '../../store/studio';
import type { Skin } from '../skins/types';
import { buildShot, castForScene, parseShotKey, shotFilename, shotKey } from './shots';

const skin = (id: string): Skin => ({
  id,
  name: id,
  model: 'classic',
  detectedModel: 'classic',
  size: 64,
  blob: new Blob(),
  bitmap: {} as ImageBitmap,
  overlay: { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
  lastUsedAt: 0,
});

const [a, b, c] = [skin('alex'), skin('bo'), skin('cy')];

describe('shot keys', () => {
  it('round-trip', () => {
    const ref = { kind: 'scene', id: 'faceOff', cameraId: 'hero' } as const;
    expect(parseShotKey(shotKey(ref))).toEqual(ref);
  });
});

describe('castForScene', () => {
  const squad = getScene('squad')!;

  it('starts with the active skin and cycles through the others', () => {
    const cast = castForScene(squad, { skins: [a, b], activeSkin: b, sceneCast: {} });
    expect(cast.map((s) => s.id)).toEqual(['bo', 'alex', 'bo']);
  });

  it('honors explicit slot choices and ignores removed skins', () => {
    const cast = castForScene(squad, { skins: [a, b, c], activeSkin: a, sceneCast: { squad: ['cy', 'gone', 'alex'] } });
    expect(cast.map((s) => s.id)).toEqual(['cy', 'bo', 'alex']);
  });
});

describe('buildShot', () => {
  const ctx = { skins: [a, b], activeSkin: a, sceneCast: {}, settings: { ...DEFAULT_SETTINGS, heldItem: 'sword' as const } };

  it('puts the global held item in the right hand for poses', () => {
    const spec = buildShot({ kind: 'pose', id: 'wave', cameraId: 'left' }, ctx, 512)!;
    expect(spec.actors).toHaveLength(1);
    expect(spec.actors[0].items).toEqual({ right: 'sword' });
  });

  it('uses scene-defined positions, items and props', () => {
    const spec = buildShot({ kind: 'scene', id: 'diamondFind', cameraId: 'front' }, ctx, 512)!;
    expect(spec.actors[0].items).toEqual({ right: 'pickaxe' });
    expect(spec.props?.length).toBeGreaterThan(0);
  });

  it('returns null for unknown ids', () => {
    expect(buildShot({ kind: 'pose', id: 'nope', cameraId: 'left' }, ctx, 512)).toBeNull();
  });

  it('names files after the cast', () => {
    expect(shotFilename({ kind: 'pose', id: 'wave', cameraId: 'left' }, ctx)).toBe('alex_wave_left.png');
    expect(shotFilename({ kind: 'scene', id: 'faceOff', cameraId: 'hero' }, ctx)).toBe('alex+bo_faceOff_hero.png');
  });
});
