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

/**
 * "Swap characters": every distinct skin in the cast takes the place of the next one
 * (A,B → B,A; A,B,C → B,C,A; A,B,A → B,A,B). Works on anything with a skin id.
 */
export function swapCast<T>(cast: T[], idOf: (member: T) => string, withId: (member: T, next: T) => T = (_, next) => next): T[] {
  const firsts: T[] = [];
  for (const member of cast) if (!firsts.some((f) => idOf(f) === idOf(member))) firsts.push(member);
  if (firsts.length < 2) return cast;
  return cast.map((member) => {
    const index = firsts.findIndex((f) => idOf(f) === idOf(member));
    return withId(member, firsts[(index + 1) % firsts.length]);
  });
}

/** A character in a rendered shot: which skin, and whether it's blacked out. */
export interface CastMember {
  skin: Skin;
  silhouette: boolean;
}

/** The characters of a shot, in slot order (a single one for poses). */
export function resolveCast(ref: ShotRef, ctx: Pick<ShotContext, 'skins' | 'activeSkin' | 'sceneCast'>): CastMember[] {
  if (ref.kind === 'pose') return [{ skin: ctx.activeSkin, silhouette: ctx.activeSkin.silhouette }];
  const scene = getScene(ref.id);
  return scene ? castForScene(scene, ctx).map((skin) => ({ skin, silhouette: skin.silhouette })) : [];
}

/** Builds a render request for a shot with an explicit cast (used by the editor to re-render images). */
export function buildShotWithCast(ref: ShotRef, cast: CastMember[], settings: RenderSettings, size: number): ShotSpec | null {
  const camera = getCamera(ref.cameraId);
  if (ref.kind === 'pose') {
    const pose = getPose(ref.id);
    if (!pose || !cast[0]) return null;
    const heldItem = settings.heldItem;
    return {
      actors: [{ skin: cast[0].skin, silhouette: cast[0].silhouette, pose, items: heldItem === 'none' ? undefined : { right: heldItem } }],
      camera,
      settings,
      size,
    };
  }

  const scene = getScene(ref.id);
  if (!scene || cast.length < scene.slots.length) return null;
  const actors = scene.slots.flatMap((slot, i) => {
    const pose = getPose(slot.poseId);
    return pose ? [{ skin: cast[i].skin, silhouette: cast[i].silhouette, pose, position: slot.position, rotationY: slot.rotationY, items: slot.items }] : [];
  });
  return { actors, props: scene.props, camera, settings, size };
}

export function buildShot(ref: ShotRef, ctx: ShotContext, size: number): ShotSpec | null {
  return buildShotWithCast(ref, resolveCast(ref, ctx), ctx.settings, size);
}

export function shotFilename(ref: ShotRef, ctx: Pick<ShotContext, 'skins' | 'activeSkin' | 'sceneCast'>): string {
  if (ref.kind === 'pose') return `${ctx.activeSkin.name}_${ref.id}_${ref.cameraId}.png`;
  const scene = getScene(ref.id);
  const names = scene ? [...new Set(castForScene(scene, ctx).map((s) => s.name))].join('+') : 'scene';
  return `${names.slice(0, 60)}_${ref.id}_${ref.cameraId}.png`;
}
