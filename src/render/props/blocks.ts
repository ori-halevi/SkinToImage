import { PixelGrid, pick, seededRandom } from './pixelArt';

export type BlockId = 'grass' | 'dirt' | 'stone' | 'planks' | 'sand' | 'explosive' | 'diamondOre' | 'gold';
export const BLOCK_IDS: BlockId[] = ['grass', 'dirt', 'stone', 'planks', 'sand', 'explosive', 'diamondOre', 'gold'];

export interface BlockTextures {
  top: PixelGrid;
  side: PixelGrid;
  bottom: PixelGrid;
}

const DIRT = ['#8a6242', '#7a5638', '#9b7250', '#634630'];
const GRASS = ['#6fae4a', '#62a03f', '#7fbf55', '#58913a'];
const STONE = ['#808080', '#747474', '#8d8d8d', '#686868'];
const SAND = ['#dccfa3', '#d2c595', '#e6dbb0', '#c8ba89'];

/**
 * Clustered noise: 2×2 patches with a sprinkle of single-pixel variation. Reads like hand-made
 * block textures far better than independent per-pixel noise.
 */
function patchy(seed: number, colors: string[], speckle = 0.28): PixelGrid {
  const rand = seededRandom(seed);
  const coarse = Array.from({ length: 64 }, () => pick(rand, colors));
  return new PixelGrid().paint((x, y) => (rand() < speckle ? pick(rand, colors) : coarse[(y >> 1) * 8 + (x >> 1)]));
}

function grass(): BlockTextures {
  const rand = seededRandom(11);
  const side = patchy(12, DIRT);
  for (let x = 0; x < 16; x++) {
    // A solid green lip with irregular drips, like grass hanging over the edge.
    const depth = 3 + (rand() < 0.35 ? 1 : 0) + (rand() < 0.15 ? 1 : 0);
    for (let y = 0; y < depth; y++) side.set(x, y, pick(rand, GRASS));
  }
  return { top: patchy(13, GRASS), side, bottom: patchy(14, DIRT) };
}

function planks(): PixelGrid {
  const rand = seededRandom(21);
  const tones = ['#b08d57', '#a3814d', '#ba9862', '#9a7846'];
  return new PixelGrid().paint((x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return '#6e5430';
    if (x === [3, 11, 7, 14][row]) return '#7d6138';
    // Horizontal grain: tone mostly follows the row with small streaks.
    return rand() < 0.2 ? pick(rand, tones) : tones[(row + (x > 8 ? 1 : 0)) % tones.length];
  });
}

function explosive(): BlockTextures {
  const rand = seededRandom(31);
  const red = ['#db3b2b', '#c9331f', '#e8513f'];
  const sticks = (x: number, y: number) => (x % 4 === 3 ? '#8e2418' : y === 0 || y === 15 ? '#a32c1c' : pick(rand, red));
  const side = new PixelGrid().paint((x, y) => {
    if (y >= 5 && y <= 10) return y === 5 || y === 10 ? '#d9d9d9' : '#f4f4f4';
    return sticks(x, y);
  });
  // Warning stripes on the label instead of lettering.
  for (let x = 1; x < 15; x += 3) side.rect(x, 7, 2, 2, '#2d2d2d');
  const top = new PixelGrid().paint(sticks).rect(6, 6, 4, 4, '#3a3a3a').rect(7, 7, 2, 2, '#d9b36a');
  return { top, side, bottom: new PixelGrid().paint(sticks) };
}

function diamondOre(): PixelGrid {
  const g = patchy(42, STONE);
  const gem = (cx: number, cy: number) => {
    g.set(cx, cy - 1, '#1f8a8a').set(cx - 1, cy, '#1f8a8a').set(cx + 1, cy, '#1f8a8a').set(cx, cy + 1, '#1f8a8a');
    g.set(cx, cy, '#6ff0e8').set(cx + 1, cy - 1, '#b8fff9');
  };
  for (const [cx, cy] of [[4, 3], [11, 5], [5, 11], [12, 12], [8, 8]]) gem(cx, cy);
  return g;
}

function gold(): PixelGrid {
  const rand = seededRandom(51);
  return new PixelGrid().paint((x, y) => {
    if (x === 0 || y === 0) return '#fff3a6';
    if (x === 15 || y === 15) return '#b8862b';
    if (x === 1 || y === 1) return '#fbe27a';
    if (x === 14 || y === 14) return '#d9a63a';
    return rand() < 0.15 ? '#f7d36b' : '#f0c24c';
  });
}

const same = (g: PixelGrid): BlockTextures => ({ top: g, side: g, bottom: g });

const FACTORIES: Record<BlockId, () => BlockTextures> = {
  grass,
  dirt: () => same(patchy(61, DIRT)),
  stone: () => same(patchy(71, STONE)),
  planks: () => same(planks()),
  sand: () => same(patchy(81, SAND)),
  explosive,
  diamondOre: () => same(diamondOre()),
  gold: () => same(gold()),
};

const cache = new Map<BlockId, BlockTextures>();

export function getBlockTextures(id: BlockId): BlockTextures {
  let textures = cache.get(id);
  if (!textures) {
    textures = FACTORIES[id]();
    cache.set(id, textures);
  }
  return textures;
}
