import { AmbientLight, DirectionalLight, Group, MathUtils, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import type { CameraPreset } from '../data/cameras';
import type { Pose } from '../data/poses/types';
import type { ScenePropPlacement } from '../data/scenes';
import type { Skin } from '../features/skins/types';
import { fitCamera, presetDirection } from './camera';
import { applyShadowAndGlow, mirrorCanvas, type GlowSettings, type ShadowSettings } from './postprocess/effects';
import { composeFrame, type Background, type FrameId } from './postprocess/frame';
import { applyOutline } from './postprocess/outline';
import { findAlphaBounds, padRect } from './postprocess/trim';
import type { ItemId } from './props/items';
import { BLOCK_SIZE, createPropObject } from './props/meshes';
import { enqueueRender, getRenderer } from './renderer';
import type { Vec3 } from './rig/layout';
import { Character, type HeldItems, type Lighting } from './rig/character';

export type GroundId = 'none' | 'grass' | 'stone' | 'planks' | 'sand';
export const GROUND_IDS: GroundId[] = ['none', 'grass', 'stone', 'planks', 'sand'];

export interface RenderSettings {
  lighting: Lighting;
  bigHead: number;
  outline: { enabled: boolean; /** px at a 2048px render; scaled for other sizes */ width: number; color: string };
  shadow: ShadowSettings;
  glow: GlowSettings;
  mirror: boolean;
  ground: GroundId;
  /** Item in the right hand for single-character pose shots. Scenes define their own items. */
  heldItem: ItemId | 'none';
  background: Background;
  frame: FrameId;
}

export interface ActorSpec {
  skin: Skin;
  pose: Pose;
  position?: Vec3;
  /** Degrees. */
  rotationY?: number;
  items?: HeldItems;
}

export interface ShotSpec {
  actors: ActorSpec[];
  props?: ScenePropPlacement[];
  camera: CameraPreset;
  settings: RenderSettings;
  /** Render resolution (square) before trimming; also the long side of fixed frames. */
  size: number;
}

export interface RenderRequest extends ShotSpec {
  signal?: AbortSignal;
}

const REFERENCE_SIZE = 2048;

/** Key light above-left of the camera plus a soft fill, so shading looks the same from every angle. */
export function addLights(scene: Scene, cameraDirection: Vector3): void {
  scene.add(new AmbientLight(0xffffff, 1.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.copy(cameraDirection).applyAxisAngle(new Vector3(0, 1, 0), -0.7).add(new Vector3(0, 0.8, 0));
  const fill = new DirectionalLight(0xffffff, 0.6);
  fill.position.copy(cameraDirection).applyAxisAngle(new Vector3(0, 1, 0), 1.2);
  scene.add(key, fill);
}

// ---------- Character cache ----------

const CHARACTER_CACHE_LIMIT = 8;
const characters = new Map<string, Character>();

/** `occurrence` distinguishes the same skin appearing more than once in a shot. */
function getCharacter(skin: Skin, lighting: Lighting, occurrence: number): Character {
  const key = `${skin.id}|${skin.model}|${skin.showOverlay}|${lighting}#${occurrence}`;
  let character = characters.get(key);
  if (character) {
    characters.delete(key);
  } else {
    character = new Character(skin.bitmap, { model: skin.model, lighting, overlay: skin.showOverlay });
  }
  characters.set(key, character);
  if (characters.size > CHARACTER_CACHE_LIMIT) {
    const [oldestKey, oldest] = characters.entries().next().value!;
    characters.delete(oldestKey);
    oldest.dispose();
  }
  return character;
}

/** Drops cached characters for a skin (e.g. after it is removed). */
export function forgetSkin(skinId: string): void {
  for (const [key, character] of characters) {
    if (key.startsWith(`${skinId}|`)) {
      character.dispose();
      characters.delete(key);
    }
  }
}

// ---------- Keys & caching ----------

/** Stable identity of everything that affects a render's pixels. */
export function renderKey({ actors, props, camera, settings, size }: ShotSpec): string {
  return JSON.stringify([
    actors.map((a) => [a.skin.id, a.skin.model, a.skin.showOverlay, a.pose.id, a.position, a.rotationY, a.items]),
    props,
    camera.id,
    settings,
    size,
  ]);
}

export function renderShot(request: RenderRequest): Promise<Blob> {
  return enqueueRender(() => renderShotNow(request), request.signal);
}

const URL_CACHE_LIMIT = 250;
const urlCache = new Map<string, string>();

/** Renders (or reuses) an image and returns an object URL. Cached URLs stay valid until evicted. */
export async function renderShotUrl(request: RenderRequest): Promise<string> {
  const key = renderKey(request);
  const hit = urlCache.get(key);
  if (hit) {
    urlCache.delete(key);
    urlCache.set(key, hit); // mark as recently used
    return hit;
  }
  const url = URL.createObjectURL(await renderShot(request));
  urlCache.set(key, url);
  if (urlCache.size > URL_CACHE_LIMIT) {
    const [oldestKey, oldestUrl] = urlCache.entries().next().value!;
    urlCache.delete(oldestKey);
    // Delay revoking so an <img> that is still showing it has time to switch.
    setTimeout(() => URL.revokeObjectURL(oldestUrl), 10_000);
  }
  return url;
}

// ---------- Rendering ----------

function addGround(scene: Scene, ground: Exclude<GroundId, 'none'>, points: Vec3[], lighting: Lighting) {
  const margin = 10;
  const xs = points.map((p) => p[0]);
  const zs = points.map((p) => p[2]);
  const x0 = Math.floor((Math.min(...xs) - margin) / BLOCK_SIZE + 0.5);
  const x1 = Math.ceil((Math.max(...xs) + margin) / BLOCK_SIZE - 0.5);
  const z0 = Math.floor((Math.min(...zs) - margin) / BLOCK_SIZE + 0.5);
  const z1 = Math.ceil((Math.max(...zs) + margin) / BLOCK_SIZE - 0.5);
  for (let bx = x0; bx <= x1; bx++) {
    for (let bz = z0; bz <= z1; bz++) {
      const block = createPropObject(ground, lighting);
      block.position.set(bx * BLOCK_SIZE, -BLOCK_SIZE, bz * BLOCK_SIZE);
      scene.add(block);
    }
  }
}

async function renderShotNow({ actors, props = [], camera: preset, settings, size }: RenderRequest): Promise<Blob> {
  const scale = size / REFERENCE_SIZE;
  const outlinePx = settings.outline.enabled ? settings.outline.width * scale : 0;
  const padding = Math.max(2, Math.round(16 * scale));

  const scene = new Scene();
  const occurrences = new Map<string, number>();
  const placed: Character[] = [];

  for (const actor of actors) {
    const occurrence = occurrences.get(actor.skin.id) ?? 0;
    occurrences.set(actor.skin.id, occurrence + 1);
    const character = getCharacter(actor.skin, settings.lighting, occurrence);
    character.applyPose(actor.pose, settings.bigHead);
    character.setHeldItems(actor.items);

    const placement = new Group();
    placement.position.set(...(actor.position ?? [0, 0, 0]));
    placement.rotation.y = MathUtils.degToRad(actor.rotationY ?? 0);
    placement.add(character.root);
    scene.add(placement);
    placed.push(character);
  }

  for (const prop of props) {
    const object = createPropObject(prop.propId, settings.lighting);
    object.position.set(...prop.position);
    object.rotation.y = MathUtils.degToRad(prop.rotationY ?? 0);
    scene.add(object);
  }

  if (settings.ground !== 'none') {
    const origin: Vec3 = [0, 0, 0];
    addGround(scene, settings.ground, [...actors.map((a) => a.position ?? origin), ...props.map((p) => p.position)], settings.lighting);
  }
  scene.updateMatrixWorld(true);

  const fitMeshes: Mesh[] = [];
  if (preset.focus === 'heads') {
    for (const c of placed) fitMeshes.push(...c.headMeshes);
  } else {
    scene.traverse((o) => o instanceof Mesh && fitMeshes.push(o));
  }

  const camera = new PerspectiveCamera();
  const fill = 1 - (2 * (outlinePx + padding + 2)) / size;
  fitCamera(camera, preset, fitMeshes, preset.focus === 'heads' ? fill * 0.5 : fill);
  if (settings.lighting === 'shaded') addLights(scene, presetDirection(preset));

  const renderer = getRenderer();
  renderer.setSize(size, size, false);
  renderer.render(scene, camera);
  for (const c of placed) c.root.removeFromParent();

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(renderer.domElement, 0, 0);
  const image = ctx.getImageData(0, 0, size, size);

  if (outlinePx > 0) {
    applyOutline(image, outlinePx, settings.outline.color, Math.min(outlinePx / 2, Math.max(1, 3 * scale)));
    ctx.putImageData(image, 0, 0);
  }

  const bounds = findAlphaBounds(image);
  if (!bounds) throw new Error('Render produced an empty image.');
  const crop = padRect(bounds, padding, size, size);
  let result = new OffscreenCanvas(crop.width, crop.height);
  result.getContext('2d')!.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  result = applyShadowAndGlow(result, settings.shadow, settings.glow, scale);
  if (settings.mirror) result = mirrorCanvas(result);
  result = composeFrame(result, settings.background, settings.frame, size);

  return result.convertToBlob({ type: 'image/png' });
}
