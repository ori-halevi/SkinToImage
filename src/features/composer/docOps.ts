import { CANVAS_PRESETS, type CanvasPresetId, type ComposerDoc, type ImageLayer, type Layer, type TextLayer } from './types';

const newId = () => crypto.randomUUID();

export function emptyDoc(preset: CanvasPresetId = 'youtube'): ComposerDoc {
  return { ...CANVAS_PRESETS[preset], background: { type: 'sunburst', color: '#ff8c00', rays: '#ffb703' }, layers: [] };
}

/** Horizontal slots (fractions of the canvas width) for successive images: center, left, right, … */
const IMAGE_SLOTS = [0.5, 0.25, 0.75, 0.12, 0.88];

/**
 * An image layer sized to `heightFraction` of the canvas height (and never wider than the canvas),
 * placed in the next free-looking slot so several added images don't pile up in the middle.
 */
export function createImageLayer(doc: ComposerDoc, asset: { assetId: string; width: number; height: number; label: string }, heightFraction = 0.8): ImageLayer {
  const scale = Math.min((doc.height * heightFraction) / asset.height, (doc.width * 0.9) / asset.width);
  const slot = IMAGE_SLOTS[doc.layers.filter((l) => l.type === 'image').length % IMAGE_SLOTS.length];
  return {
    id: newId(),
    type: 'image',
    ...asset,
    x: doc.width * slot,
    y: doc.height / 2,
    rotation: 0,
    scaleX: scale,
    scaleY: scale,
    opacity: 1,
  };
}

export function createTextLayer(doc: ComposerDoc, text: string): TextLayer {
  const unit = Math.min(doc.width, doc.height) / 720;
  return {
    id: newId(),
    type: 'text',
    text,
    font: 'impact',
    fontSize: Math.round(140 * unit),
    fill: '#ffe14d',
    stroke: '#000000',
    strokeWidth: Math.round(14 * unit),
    shadow: true,
    align: 'center',
    x: doc.width / 2,
    y: doc.height * 0.2,
    rotation: -4,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };
}

export const DEFAULT_GLOW = { enabled: true, color: '#ffd54a', size: 40, strength: 0.9 };

export const addLayer = (doc: ComposerDoc, layer: Layer): ComposerDoc => ({ ...doc, layers: [...doc.layers, layer] });

export function updateLayer(doc: ComposerDoc, id: string, patch: Partial<Layer>): ComposerDoc {
  return { ...doc, layers: doc.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) };
}

export const removeLayer = (doc: ComposerDoc, id: string): ComposerDoc => ({ ...doc, layers: doc.layers.filter((l) => l.id !== id) });

/** Copies a layer right above the original, offset slightly so the copy is visible. Returns the new id. */
export function duplicateLayer(doc: ComposerDoc, id: string): { doc: ComposerDoc; id: string | null } {
  const index = doc.layers.findIndex((l) => l.id === id);
  if (index < 0) return { doc, id: null };
  const shift = Math.min(doc.width, doc.height) * 0.03;
  const copy = { ...doc.layers[index], id: newId(), x: doc.layers[index].x + shift, y: doc.layers[index].y + shift };
  const layers = [...doc.layers];
  layers.splice(index + 1, 0, copy);
  return { doc: { ...doc, layers }, id: copy.id };
}

export type ReorderMove = 'up' | 'down' | 'top' | 'bottom';

export function reorderLayer(doc: ComposerDoc, id: string, move: ReorderMove): ComposerDoc {
  const index = doc.layers.findIndex((l) => l.id === id);
  if (index < 0) return doc;
  const layers = [...doc.layers];
  const [layer] = layers.splice(index, 1);
  const target = { up: Math.min(index + 1, layers.length), down: Math.max(index - 1, 0), top: layers.length, bottom: 0 }[move];
  layers.splice(target, 0, layer);
  return { ...doc, layers };
}

/**
 * Changes the canvas size, keeping each layer at the same relative position and scaling sizes by the
 * smaller of the two ratios so nothing grows out of the new frame.
 */
export function resizeCanvas(doc: ComposerDoc, preset: CanvasPresetId): ComposerDoc {
  const { width, height } = CANVAS_PRESETS[preset];
  const sx = width / doc.width;
  const sy = height / doc.height;
  const s = Math.min(sx, sy);
  const layers = doc.layers.map((l): Layer => {
    const moved = { ...l, x: l.x * sx, y: l.y * sy };
    return l.type === 'text'
      ? { ...(moved as TextLayer), fontSize: l.fontSize * s, strokeWidth: l.strokeWidth * s }
      : { ...(moved as ImageLayer), scaleX: l.scaleX * s, scaleY: l.scaleY * s };
  });
  return { ...doc, width, height, layers };
}

/** Folds a transform's scale into font size for text, so strokes stay proportional and crisp. */
export function bakeTextScale(layer: TextLayer): TextLayer {
  const factor = Math.abs(layer.scaleY);
  if (factor === 1) return layer;
  return {
    ...layer,
    fontSize: Math.max(4, layer.fontSize * factor),
    strokeWidth: layer.strokeWidth * factor,
    scaleX: Math.sign(layer.scaleX) || 1,
    scaleY: Math.sign(layer.scaleY) || 1,
  };
}

// ---------- History ----------

export interface History {
  past: ComposerDoc[];
  future: ComposerDoc[];
  /** Consecutive edits with the same tag (e.g. typing, dragging a slider) merge into one undo step. */
  lastTag: string | null;
  lastTime: number;
}

export const HISTORY_LIMIT = 100;
export const MERGE_WINDOW_MS = 800;

export const emptyHistory = (): History => ({ past: [], future: [], lastTag: null, lastTime: 0 });

/** Records `before` as an undo step unless this edit continues the previous one (same tag, soon after). */
export function recordChange(history: History, before: ComposerDoc, tag: string | undefined, now: number): History {
  if (tag && tag === history.lastTag && now - history.lastTime < MERGE_WINDOW_MS) {
    return { ...history, future: [], lastTime: now };
  }
  return { past: [...history.past, before].slice(-HISTORY_LIMIT), future: [], lastTag: tag ?? null, lastTime: now };
}

export function undo(history: History, current: ComposerDoc): { history: History; doc: ComposerDoc } | null {
  const previous = history.past.at(-1);
  if (!previous) return null;
  return {
    doc: previous,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future], lastTag: null, lastTime: 0 },
  };
}

export function redo(history: History, current: ComposerDoc): { history: History; doc: ComposerDoc } | null {
  const next = history.future[0];
  if (!next) return null;
  return {
    doc: next,
    history: { past: [...history.past, current], future: history.future.slice(1), lastTag: null, lastTime: 0 },
  };
}
