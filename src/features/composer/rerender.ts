import en from '../../i18n/en.json';
import he from '../../i18n/he.json';
import { getCamera } from '../../data/cameras';
import { renderShot } from '../../render/renderShot';
import { useStudio } from '../../store/studio';
import { getRecentSkin } from '../skins/recentSkins';
import type { Skin } from '../skins/types';
import { EDITOR_RENDER_SIZE } from '../studio/editorBridge';
import { buildShotWithCast, resolveCast, swapCast, type ShotRef } from '../studio/shots';
import { assetSize, saveAsset } from './storage';
import { useComposer } from './store';
import type { ImageLayer, ShotSource } from './types';

export class MissingSkinsError extends Error {}

/** Finds skins among the loaded ones first, then in recent skins (the editor may outlive the session). */
async function resolveSkins(ids: string[]): Promise<Map<string, Skin>> {
  const found = new Map<string, Skin>();
  for (const id of new Set(ids)) {
    const skin = useStudio.getState().skins.find((s) => s.id === id) ?? (await getRecentSkin(id));
    if (!skin) throw new MissingSkinsError(id);
    found.set(id, skin);
  }
  return found;
}

/**
 * Re-renders a character image from a (changed) source, keeping the layer's position, rotation
 * and on-canvas height. One undo step.
 */
export async function rerenderLayer(layer: ImageLayer, source: ShotSource): Promise<void> {
  const skins = await resolveSkins(source.cast.map((c) => c.skinId));
  const spec = buildShotWithCast(
    source.shot,
    source.cast.map((c) => ({ skin: skins.get(c.skinId)!, silhouette: c.silhouette })),
    source.settings,
    EDITOR_RENDER_SIZE,
  );
  if (!spec) return;
  const blob = await renderShot(spec);
  const [assetId, size] = await Promise.all([saveAsset(blob), assetSize(blob)]);

  // Keep the same displayed height even if the new render crops differently.
  const factor = layer.height / size.height;
  useComposer.getState().updateLayer(layer.id, {
    assetId,
    width: size.width,
    height: size.height,
    scaleX: layer.scaleX * factor,
    scaleY: layer.scaleY * factor,
    source,
  });
}

export const distinctSkins = (layer: ImageLayer) => new Set(layer.source?.cast.map((c) => c.skinId)).size;

/** "Swap characters" on an editor image. */
export function swapLayerCast(layer: ImageLayer): Promise<void> {
  const source = layer.source!;
  return rerenderLayer(layer, { ...source, cast: swapCast(source.cast, (c) => c.skinId, (_, next) => ({ ...next })) });
}

export function toggleLayerSilhouette(layer: ImageLayer, slot: number): Promise<void> {
  const source = layer.source!;
  return rerenderLayer(layer, { ...source, cast: source.cast.map((c, i) => (i === slot ? { ...c, silhouette: !c.silhouette } : c)) });
}

/**
 * Images added before the editor remembered their origin only have a label (the pose or scene name,
 * in either language). Match it back to a shot and rebuild a source from the current skins and
 * settings, so older images can be swapped and blacked out too.
 */
export function inferSource(layer: ImageLayer): ShotSource | null {
  const studio = useStudio.getState();
  const activeSkin = studio.skins.find((s) => s.id === studio.activeSkinId) ?? studio.skins[0];
  if (!activeSkin) return null;

  const find = (group: 'poses' | 'scenes') => {
    for (const dict of [en, he]) {
      const match = Object.entries(dict[group]).find(([, name]) => name === layer.label);
      if (match) return match[0];
    }
    return null;
  };
  const poseId = find('poses');
  const sceneId = poseId ? null : find('scenes');
  if (!poseId && !sceneId) return null;

  const shot: ShotRef = { kind: poseId ? 'pose' : 'scene', id: (poseId ?? sceneId)!, cameraId: getCamera(studio.cameraId).id };
  const ctx = { skins: studio.skins, activeSkin, sceneCast: studio.sceneCast };
  const cast = resolveCast(shot, ctx).map((c) => ({ skinId: c.skin.id, silhouette: c.silhouette }));
  if (cast.length === 0) return null;
  return { shot, cast, settings: { ...studio.settings, background: { type: 'transparent' }, frame: 'fit' } };
}
