import type { Background } from '../../render/postprocess/frame';
import type { RenderSettings } from '../../render/renderShot';
import type { ShotRef } from '../studio/shots';

export type CanvasPresetId = 'youtube' | 'youtubeHd' | 'square' | 'shorts';

export const CANVAS_PRESETS: Record<CanvasPresetId, { width: number; height: number }> = {
  youtube: { width: 1280, height: 720 },
  youtubeHd: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  shorts: { width: 1080, height: 1920 },
};

export const CANVAS_PRESET_IDS = Object.keys(CANVAS_PRESETS) as CanvasPresetId[];

export function presetFor(width: number, height: number): CanvasPresetId | null {
  return CANVAS_PRESET_IDS.find((id) => CANVAS_PRESETS[id].width === width && CANVAS_PRESETS[id].height === height) ?? null;
}

interface BaseLayer {
  id: string;
  /** Center of the layer in canvas pixels. */
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
  /** Negative values flip the layer. */
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  assetId: string;
  /** Natural size of the asset in pixels. */
  width: number;
  height: number;
  /** What the image is, for the layers list (e.g. a pose name or file name). */
  label: string;
  /** How a character image was rendered, so the editor can re-render it (swap characters, silhouettes). */
  source?: ShotSource;
  /** Draw the whole image flat black, keeping its transparency. */
  silhouette?: boolean;
  /** Soft colored glow behind the image (sizes are in canvas pixels). */
  glow?: { enabled: boolean; color: string; size: number; strength: number };
}

export interface ShotSource {
  shot: ShotRef;
  /** Per character slot: which skin (by id) and whether it's blacked out. */
  cast: { skinId: string; silhouette: boolean }[];
  settings: RenderSettings;
}

export type FontId = 'impact' | 'pixel' | 'bold';

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  font: FontId;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadow: boolean;
  align: 'left' | 'center' | 'right';
}

export type Layer = ImageLayer | TextLayer;

/** Everything that undo/redo tracks. */
export interface ComposerDoc {
  width: number;
  height: number;
  background: Background;
  /** Bottom to top. */
  layers: Layer[];
}

export interface Project extends ComposerDoc {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Small JPEG data URL for the projects list. */
  thumbnail?: string;
}
