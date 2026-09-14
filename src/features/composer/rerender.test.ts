import { beforeEach, describe, expect, it } from 'vitest';
import { useStudio } from '../../store/studio';
import type { Skin } from '../skins/types';
import { inferSource } from './rerender';
import type { ImageLayer } from './types';

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

const layer = (label: string): ImageLayer => ({
  id: 'l1', type: 'image', assetId: 'a', width: 10, height: 10, label, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
});

describe('inferSource', () => {
  beforeEach(() => useStudio.setState({ skins: [skin('a'), skin('b')], activeSkinId: 'a', sceneCast: {}, cameraId: 'hero' }));

  it('recognizes scene and pose names in English and Hebrew', () => {
    expect(inferSource(layer('Face-off'))).toMatchObject({ shot: { kind: 'scene', id: 'faceOff', cameraId: 'hero' }, cast: [{ skinId: 'a' }, { skinId: 'b' }] });
    expect(inferSource(layer('עימות'))?.shot.id).toBe('faceOff');
    expect(inferSource(layer('Wave'))).toMatchObject({ shot: { kind: 'pose', id: 'wave' }, cast: [{ skinId: 'a' }] });
  });

  it('renders editor images transparent and tightly cropped', () => {
    expect(inferSource(layer('Wave'))!.settings).toMatchObject({ background: { type: 'transparent' }, frame: 'fit' });
  });

  it('gives up on unknown labels or when no skins are loaded', () => {
    expect(inferSource(layer('my-photo'))).toBeNull();
    useStudio.setState({ skins: [], activeSkinId: null });
    expect(inferSource(layer('Wave'))).toBeNull();
  });
});
