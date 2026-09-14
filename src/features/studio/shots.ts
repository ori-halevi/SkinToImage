import { getCamera, type CameraId } from '../../data/cameras';
import { getPose } from '../../data/poses';
import { getScene, type Scene } from '../../data/scenes';
import type { RenderSettings, ShotSpec } from '../../render/renderShot';
import type { Skin } from '../skins/types';

export type ShotKind = 'pose' | 'scene';

/** A gallery item: a pose (active skin) or a scene, seen from one camera. */
export interface ShotRef {
  kind: ShotKind;
  id: string;
  cameraId: CameraId;
}

export const shotKey = (shot: ShotRef) => `${shot.kind}|${shot.id}|${shot.cameraId}`;

export function parseShotKey(key: string): ShotRef {
  const [kind, id, cameraId] = key.split('|');
  return { kind: kind as ShotKind, id, cameraId: cameraId as CameraId };
}

export interface ShotContext {
  skins: Skin[];
  activeSkin: Skin;
  /** Per scene: skin id for each slot. Missing entries fall back to cycling through `skins`. */
  sceneCast: Record<string, string[]>;
  settings: RenderSettings;
}

/** Which skin plays each slot of a scene. */
export function castForScene(scene: Scene, ctx: Pick<ShotContext, 'skins' | 'activeSkin' | 'sceneCast'>): Skin[] {
  const chosen = ctx.sceneCast[scene.id] ?? [];
  const ordered = [ctx.activeSkin, ...ctx.skins.filter((s) => s.id !== ctx.activeSkin.id)];
  return scene.slots.map((_, i) => ctx.skins.find((s) => s.id === chosen[i]) ?? ordered[i % ordered.length]);
}

export function buildShot(ref: ShotRef, ctx: ShotContext, size: number): ShotSpec | null {
  const camera = getCamera(ref.cameraId);
  if (ref.kind === 'pose') {
    const pose = getPose(ref.id);
    if (!pose) return null;
    const heldItem = ctx.settings.heldItem;
    return {
      actors: [{ skin: ctx.activeSkin, pose, items: heldItem === 'none' ? undefined : { right: heldItem } }],
      camera,
      settings: ctx.settings,
      size,
    };
  }

  const scene = getScene(ref.id);
  if (!scene) return null;
  const cast = castForScene(scene, ctx);
  const actors = scene.slots.flatMap((slot, i) => {
    const pose = getPose(slot.poseId);
    return pose ? [{ skin: cast[i], pose, position: slot.position, rotationY: slot.rotationY, items: slot.items }] : [];
  });
  return { actors, props: scene.props, camera, settings: ctx.settings, size };
}

export function shotFilename(ref: ShotRef, ctx: Pick<ShotContext, 'skins' | 'activeSkin' | 'sceneCast'>): string {
  if (ref.kind === 'pose') return `${ctx.activeSkin.name}_${ref.id}_${ref.cameraId}.png`;
  const scene = getScene(ref.id);
  const names = scene ? [...new Set(castForScene(scene, ctx).map((s) => s.name))].join('+') : 'scene';
  return `${names.slice(0, 60)}_${ref.id}_${ref.cameraId}.png`;
}
