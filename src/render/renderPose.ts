import { AmbientLight, DirectionalLight, PerspectiveCamera, Scene, Vector3 } from 'three';
import type { CameraPreset } from '../data/cameras';
import type { Pose } from '../data/poses/types';
import type { Skin } from '../features/skins/types';
import { fitCamera, presetDirection } from './camera';
import { Character, type Lighting } from './rig/character';
import { applyOutline } from './postprocess/outline';
import { findAlphaBounds, padRect } from './postprocess/trim';
import { enqueueRender, getRenderer } from './renderer';

export interface RenderSettings {
  lighting: Lighting;
  bigHead: number;
  outline: { enabled: boolean; /** px at a 2048px render; scaled for other sizes */ width: number; color: string };
}

export interface RenderRequest {
  skin: Skin;
  pose: Pose;
  camera: CameraPreset;
  settings: RenderSettings;
  /** Render resolution (square) before trimming. */
  size: number;
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

let cached: { key: string; character: Character } | null = null;

function getCharacter(skin: Skin, lighting: Lighting): Character {
  const key = `${skin.id}|${skin.model}|${lighting}`;
  if (cached?.key !== key) {
    cached?.character.dispose();
    cached = { key, character: new Character(skin.bitmap, { model: skin.model, lighting }) };
  }
  return cached.character;
}

export function renderPose(request: RenderRequest): Promise<Blob> {
  return enqueueRender(() => renderPoseNow(request), request.signal);
}

/** Stable identity of everything that affects a render's pixels. */
export function renderKey({ skin, pose, camera, settings, size }: Omit<RenderRequest, 'signal'>): string {
  return JSON.stringify([skin.id, skin.model, pose.id, camera.id, settings, size]);
}

const THUMB_CACHE_LIMIT = 200;
const thumbCache = new Map<string, string>();

/** Renders (or reuses) an image and returns an object URL. Cached URLs stay valid until evicted. */
export async function renderPoseUrl(request: RenderRequest): Promise<string> {
  const key = renderKey(request);
  const hit = thumbCache.get(key);
  if (hit) {
    thumbCache.delete(key);
    thumbCache.set(key, hit); // mark as recently used
    return hit;
  }
  const url = URL.createObjectURL(await renderPose(request));
  thumbCache.set(key, url);
  if (thumbCache.size > THUMB_CACHE_LIMIT) {
    const [oldestKey, oldestUrl] = thumbCache.entries().next().value!;
    thumbCache.delete(oldestKey);
    // Delay revoking so an <img> that is still showing it has time to switch.
    setTimeout(() => URL.revokeObjectURL(oldestUrl), 10_000);
  }
  return url;
}

async function renderPoseNow({ skin, pose, camera: preset, settings, size }: RenderRequest): Promise<Blob> {
  const scale = size / REFERENCE_SIZE;
  const outlinePx = settings.outline.enabled ? settings.outline.width * scale : 0;
  const padding = Math.max(2, Math.round(16 * scale));

  const character = getCharacter(skin, settings.lighting);
  character.applyPose(pose, settings.bigHead);

  const scene = new Scene();
  scene.add(character.root);

  const camera = new PerspectiveCamera();
  fitCamera(camera, preset, character.meshes, 1 - (2 * (outlinePx + padding + 2)) / size);

  if (settings.lighting === 'shaded') addLights(scene, presetDirection(preset));

  const renderer = getRenderer();
  renderer.setSize(size, size, false);
  renderer.render(scene, camera);
  scene.remove(character.root);

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

  const output = new OffscreenCanvas(crop.width, crop.height);
  output.getContext('2d')!.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return output.convertToBlob({ type: 'image/png' });
}
