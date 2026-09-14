import { renderShot } from '../../render/renderShot';
import { useStudio } from '../../store/studio';
import { getRecentSkin } from '../skins/recentSkins';
import type { Skin } from '../skins/types';
import { EDITOR_RENDER_SIZE } from '../studio/editorBridge';
import { buildShotWithCast } from '../studio/shots';
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
 * Re-renders a character image with a changed cast (swap, silhouettes), keeping the layer's
 * position, rotation and on-canvas height. One undo step.
 */
export async function rerenderLayer(layer: ImageLayer, cast: ShotSource['cast']): Promise<void> {
  const source = layer.source;
  if (!source) return;
  const skins = await resolveSkins(cast.map((c) => c.skinId));
  const spec = buildShotWithCast(
    source.shot,
    cast.map((c) => ({ skin: skins.get(c.skinId)!, silhouette: c.silhouette })),
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
    source: { ...source, cast },
  });
}
