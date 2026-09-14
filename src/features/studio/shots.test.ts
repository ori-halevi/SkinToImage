import { describe, expect, it } from 'vitest';
import { getScene } from '../../data/scenes';
import { DEFAULT_SETTINGS } from '../../store/studio';
import type { Skin } from '../skins/types';
import { buildShot, castForScene, parseShotKey, resolveCast, shotFilename, shotKey, swapCast } from './shots';

const skin = (id: string): Skin => ({
  id,
  name: id,
  model: 'classic',
  detectedModel: 'classic',
  defaultModel: 'classic',
  size: 64,
  blob: new Blob(),
  bitmap: {} as ImageBitmap,
  overlay: { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
  silhouette: false,
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

describe('swapCast', () => {
  const id = (x: string) => x;
  it('rotates distinct skins through the slots', () => {
    expect(swapCast(['a', 'b'], id)).toEqual(['b', 'a']);
    expect(swapCast(['a', 'b', 'c'], id)).toEqual(['b', 'c', 'a']);
    expect(swapCast(['a', 'b', 'a'], id)).toEqual(['b', 'a', 'b']);
  });
  it('leaves single-skin casts alone', () => expect(swapCast(['a', 'a'], id)).toEqual(['a', 'a']));
  it('keeps extra data with the identity when asked', () => {
    const cast = [{ skinId: 'a', silhouette: true }, { skinId: 'b', silhouette: false }];
    expect(swapCast(cast, (c) => c.skinId, (_, next) => next)).toEqual([cast[1], cast[0]]);
  });
});

describe('silhouettes', () => {
  it('follow the skin into the render request', () => {
    const hidden = { ...b, silhouette: true };
    const ctx = { skins: [a, hidden], activeSkin: a, sceneCast: {}, settings: DEFAULT_SETTINGS };
    expect(resolveCast({ kind: 'scene', id: 'faceOff', cameraId: 'left' }, ctx).map((c) => c.silhouette)).toEqual([false, true]);
    const spec = buildShot({ kind: 'scene', id: 'faceOff', cameraId: 'left' }, ctx, 256)!;
    expect(spec.actors.map((x) => x.silhouette)).toEqual([false, true]);
  });
});
