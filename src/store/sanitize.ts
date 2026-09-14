import { CAMERAS, type CameraId } from '../data/cameras';
import { FRAME_IDS, type Background } from '../render/postprocess/frame';
import { ITEM_IDS } from '../render/props/items';
import { GROUND_IDS, type RenderSettings } from '../render/renderShot';

export const DEFAULT_SETTINGS: RenderSettings = {
  lighting: 'shaded',
  bigHead: 1,
  outline: { enabled: true, width: 16, color: '#ffffff' },
  shadow: { enabled: false, opacity: 0.45, blur: 24, distance: 24 },
  glow: { enabled: false, color: '#ffd54a', size: 40 },
  mirror: false,
  ground: 'none',
  heldItem: 'none',
  background: { type: 'transparent' },
  frame: 'fit',
};

type Loose = Record<string, unknown> | undefined;

const obj = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined);
const oneOf = <T>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const color = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);

function sanitizeBackground(v: unknown): Background {
  const b = obj(v);
  switch (b?.type) {
    case 'color':
      return { type: 'color', color: color(b.color, '#3a86ff') };
    case 'gradient':
      return { type: 'gradient', from: color(b.from, '#ff006e'), to: color(b.to, '#3a0ca3') };
    case 'sunburst':
      return { type: 'sunburst', color: color(b.color, '#ff8c00'), rays: color(b.rays, '#ffb703') };
    default:
      // Uploaded images only live in memory, so a saved reference to one can't be restored.
      return { type: 'transparent' };
  }
}

/**
 * Rebuilds settings from untrusted saved data (older app versions, hand-edited storage):
 * nested objects are merged field by field and every value is validated, so a removed
 * option or a missing new field can never break rendering.
 */
export function sanitizeSettings(saved: unknown): RenderSettings {
  const s = obj(saved);
  const d = DEFAULT_SETTINGS;
  const outline = obj(s?.outline);
  const shadow = obj(s?.shadow);
  const glow = obj(s?.glow);
  return {
    lighting: oneOf(s?.lighting, ['shaded', 'flat'] as const, d.lighting),
    bigHead: num(s?.bigHead, 1, 2, d.bigHead),
    outline: {
      enabled: bool(outline?.enabled, d.outline.enabled),
      width: num(outline?.width, 2, 40, d.outline.width),
      color: color(outline?.color, d.outline.color),
    },
    shadow: {
      enabled: bool(shadow?.enabled, d.shadow.enabled),
      opacity: num(shadow?.opacity, 0.1, 1, d.shadow.opacity),
      blur: num(shadow?.blur, 0, 80, d.shadow.blur),
      distance: num(shadow?.distance, 0, 80, d.shadow.distance),
    },
    glow: {
      enabled: bool(glow?.enabled, d.glow.enabled),
      color: color(glow?.color, d.glow.color),
      size: num(glow?.size, 8, 120, d.glow.size),
    },
    mirror: bool(s?.mirror, d.mirror),
    ground: oneOf(s?.ground, GROUND_IDS, d.ground),
    heldItem: oneOf(s?.heldItem, ['none', ...ITEM_IDS] as const, d.heldItem),
    background: sanitizeBackground(s?.background),
    frame: oneOf(s?.frame, FRAME_IDS, d.frame),
  };
}

export function sanitizeCameraId(v: unknown, fallback: CameraId): CameraId {
  return oneOf(v, CAMERAS.map((c) => c.id), fallback);
}

export function sanitizeOneOf<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return oneOf(v, allowed, fallback);
}
