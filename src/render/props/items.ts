import { PixelGrid } from './pixelArt';

export type ItemId = 'sword' | 'pickaxe' | 'axe' | 'bow' | 'torch';
export const ITEM_IDS: ItemId[] = ['sword', 'pickaxe', 'axe', 'bow', 'torch'];

export interface ItemSprite {
  grid: PixelGrid;
  /** Pixel (x, y) that sits in the character's hand. */
  grip: [number, number];
}

const WOOD = '#8b5a2b';
const WOOD_DARK = '#5e3b1a';
const STEEL = '#dfe6ec';
const STEEL_MID = '#a9b4bf';
const STEEL_DARK = '#5f6b77';
const GOLD = '#f2c14e';
const GOLD_DARK = '#b8862b';

/** Handle running diagonally from bottom-left toward the top-right. */
function handle(g: PixelGrid, fromX: number, fromY: number, length: number) {
  for (let i = 0; i < length; i++) g.set(fromX + i, fromY - i, i % 3 === 2 ? WOOD_DARK : WOOD);
}

function sword(): ItemSprite {
  const g = new PixelGrid();
  for (let i = 0; i < 10; i++) {
    const x = 14 - i;
    const y = 1 + i;
    g.set(x, y, STEEL);
    g.set(x + 1, y, STEEL_DARK);
    g.set(x, y + 1, STEEL_MID);
  }
  g.set(15, 0, STEEL_DARK);
  g.line(2, 9, 6, 13, GOLD).set(2, 9, GOLD_DARK).set(6, 13, GOLD_DARK);
  g.set(3, 12, WOOD).set(2, 13, WOOD_DARK);
  g.set(1, 14, GOLD).set(0, 15, GOLD_DARK);
  return { grid: g, grip: [3, 12] };
}

function pickaxe(): ItemSprite {
  const g = new PixelGrid();
  handle(g, 1, 14, 10);
  // Curved head: quarter circle around (3, 12), thickened toward the outside.
  for (let a = 0; a <= 90; a += 2) {
    const rad = (a * Math.PI) / 180;
    for (const [r, color] of [[11, STEEL_MID], [12, STEEL]] as const) {
      g.set(Math.round(3 + r * Math.sin(rad)), Math.round(12 - r * Math.cos(rad)), color);
    }
  }
  g.set(3, 0, STEEL_DARK).set(15, 12, STEEL_DARK);
  return { grid: g, grip: [3, 12] };
}

function axe(): ItemSprite {
  const g = new PixelGrid();
  handle(g, 1, 14, 11);
  g.paint((x, y) => {
    const existing = g.get(x, y);
    const s = (10 - x + (5 - y)) / 2; // distance from the handle toward the top-left
    const u = (x - 10 - (y - 5)) / 2; // position along the handle
    if (s < 0.5 || s > 4.5) return existing;
    if (u < -1.6 || u > 1.6 + s * 0.35) return existing;
    return s > 3.6 ? STEEL : s > 2 ? STEEL_MID : STEEL_DARK;
  });
  return { grid: g, grip: [3, 12] };
}

function bow(): ItemSprite {
  const g = new PixelGrid();
  for (let a = 0; a <= 90; a += 2) {
    const rad = (a * Math.PI) / 180;
    g.set(Math.round(15 - 13 * Math.cos(rad)), Math.round(15 - 13 * Math.sin(rad)), a > 35 && a < 55 ? WOOD_DARK : WOOD);
  }
  g.line(3, 14, 14, 3, '#eeeeee');
  return { grid: g, grip: [6, 9] };
}

function torch(): ItemSprite {
  const g = new PixelGrid();
  g.rect(7, 6, 2, 10, WOOD).rect(7, 9, 2, 1, WOOD_DARK).rect(7, 13, 2, 1, WOOD_DARK);
  g.rect(6, 3, 4, 3, '#ff9d2e').rect(7, 1, 2, 2, '#ffd54a').rect(7, 4, 2, 2, '#fff3b0');
  return { grid: g, grip: [7, 13] };
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
