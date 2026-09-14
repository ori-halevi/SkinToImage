import { PixelGrid } from './pixelArt';

export type ItemId = 'sword' | 'pickaxe' | 'axe' | 'bow' | 'torch';
export const ITEM_IDS: ItemId[] = ['sword', 'pickaxe', 'axe', 'bow', 'torch'];

export interface ItemSprite {
  grid: PixelGrid;
  /** Pixel (x, y) that sits in the character's hand. */
  grip: [number, number];
  /**
   * Tilt in degrees around the hand's side-to-side axis. At 0 the sprite's up/right diagonal points
   * back toward the shoulder; ~110 continues the arm line with a slight forward lean (tools),
   * ~45 holds the diagonal perpendicular to the arm (bows).
   */
  hold: number;
}

const WOOD = '#8b5a2b';
const WOOD_LIGHT = '#a8763f';
const WOOD_DARK = '#5e3b1a';
const STEEL = '#f4f7f9';
const STEEL_MID = '#c9d1d8';
const STEEL_DARK = '#8b96a1';

/**
 * Items are drawn as 16×16 diagonal sprites (handle bottom-left, business end top-right).
 * `a = x + y` measures across the diagonal and `b = y - x` runs along it (tip → handle),
 * which makes blades and handles easy to describe as bands.
 */
const diagonal = (x: number, y: number) => ({ a: x + y, b: y - x });

/** Darkens a #rrggbb color by `factor` (0–1). */
function darken(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * factor);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

/**
 * Surrounds the sprite with a 1px border in a darker shade of the neighboring pixel
 * (gray around steel, dark brown around wood), like hand-made item sprites.
 */
function addOutline(g: PixelGrid, factor = 0.5): PixelGrid {
  const border: [number, number, string][] = [];
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      if (g.get(x, y)) continue;
      const neighbor = g.get(x - 1, y) ?? g.get(x + 1, y) ?? g.get(x, y - 1) ?? g.get(x, y + 1);
      if (neighbor) border.push([x, y, darken(neighbor, factor)]);
    }
  }
  for (const [x, y, color] of border) g.set(x, y, color);
  return g;
}

function sword(): ItemSprite {
  const g = new PixelGrid().paint((x, y) => {
    const { a, b } = diagonal(x, y);
    // Blade: a 3px-wide band from the tip down to the guard, with a light edge and a darker spine.
    if (b >= -13 && b <= 0 && a >= 14 && a <= 16) return a === 14 ? STEEL : a === 15 ? STEEL_MID : STEEL_DARK;
    // Cross guard.
    if (b >= 1 && b <= 2 && a >= 10 && a <= 20) return a <= 11 || a >= 19 ? WOOD_DARK : '#6b4a2a';
    // Handle.
    if (b >= 3 && b <= 8 && a >= 14 && a <= 16) return b % 3 === 0 ? WOOD_DARK : WOOD;
    // Pommel.
    if (b >= 9 && b <= 10 && a >= 13 && a <= 17) return '#6b4a2a';
    return null;
  });
  return { grid: addOutline(g), grip: [5, 11], hold: 110 };
}

function pickaxe(): ItemSprite {
  const g = new PixelGrid().paint((x, y) => {
    const { a, b } = diagonal(x, y);
    if (b >= -4 && b <= 12 && a >= 14 && a <= 15) return a === 14 ? WOOD_LIGHT : WOOD;
    return null;
  });
  // Curved head: a thick arc around the handle's top end, bulging toward the top-right corner.
  for (let deg = 0; deg <= 90; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    for (const [r, color] of [[10, STEEL_DARK], [11, STEEL_MID], [12, STEEL]] as const) {
      g.set(Math.round(2 + r * Math.sin(rad)), Math.round(13 - r * Math.cos(rad)), color);
    }
  }
  return { grid: addOutline(g), grip: [4, 11], hold: 110 };
}

function axe(): ItemSprite {
  const g = new PixelGrid().paint((x, y) => {
    const { a, b } = diagonal(x, y);
    if (b >= -8 && b <= 12 && a >= 14 && a <= 15) return a === 14 ? WOOD_LIGHT : WOOD;
    // Blade: a wedge on the upper-left side of the handle's top, widening away from it.
    const across = 14 - a; // distance from the handle toward the top-left
    if (across >= 1 && across <= 6 && b >= -8 - across * 0.5 && b <= -2 + across * 0.3) {
      return across >= 5 ? STEEL : across >= 3 ? STEEL_MID : STEEL_DARK;
    }
    return null;
  });
  return { grid: addOutline(g), grip: [4, 11], hold: 110 };
}

function bow(): ItemSprite {
  const g = new PixelGrid();
  // The limbs bulge toward the bottom-right so, once held, they curve away from the body.
  for (let deg = 0; deg <= 90; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    for (const [r, color] of [[12, WOOD], [13, WOOD_DARK]] as const) {
      const grip = deg > 38 && deg < 52;
      g.set(Math.round(1 + r * Math.cos(rad)), Math.round(1 + r * Math.sin(rad)), grip ? '#4a2f16' : color);
    }
  }
  g.line(1, 13, 13, 1, '#e8e8e8');
  return { grid: addOutline(g), grip: [10, 10], hold: 45 };
}

function torch(): ItemSprite {
  const g = new PixelGrid();
  g.rect(7, 6, 2, 10, WOOD).rect(7, 6, 1, 10, WOOD_LIGHT);
  g.rect(6, 2, 4, 4, '#ff9d2e').rect(7, 1, 2, 2, '#ffd54a').rect(7, 3, 2, 2, '#fff3b0');
  return { grid: addOutline(g), grip: [7, 12], hold: 150 };
}

const FACTORIES: Record<ItemId, () => ItemSprite> = { sword, pickaxe, axe, bow, torch };
const cache = new Map<ItemId, ItemSprite>();

export function getItemSprite(id: ItemId): ItemSprite {
  let sprite = cache.get(id);
  if (!sprite) {
    sprite = FACTORIES[id]();
    cache.set(id, sprite);
  }
  return sprite;
}
