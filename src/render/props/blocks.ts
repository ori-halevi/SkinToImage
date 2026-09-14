import { PixelGrid, pick, seededRandom } from './pixelArt';

export type BlockId = 'grass' | 'dirt' | 'stone' | 'planks' | 'sand' | 'explosive' | 'diamondOre' | 'gold';
export const BLOCK_IDS: BlockId[] = ['grass', 'dirt', 'stone', 'planks', 'sand', 'explosive', 'diamondOre', 'gold'];

export interface BlockTextures {
  top: PixelGrid;
  side: PixelGrid;
  bottom: PixelGrid;
}

const DIRT = ['#86603f', '#77533a', '#9a7150', '#5f422c'];
const GRASS = ['#6aaa40', '#5c9a36', '#7cbc4c', '#4e8a2e'];
const STONE = ['#8a8a8a', '#7c7c7c', '#999999', '#6a6a6a'];
const SAND = ['#e0cf98', '#d6c48a', '#eadba8', '#c8b67c'];

const noise = (seed: number, colors: string[]) => {
  const rand = seededRandom(seed);
  return new PixelGrid().paint(() => pick(rand, colors));
};

function grass(): BlockTextures {
  const rand = seededRandom(11);
  const side = noise(12, DIRT);
  for (let x = 0; x < 16; x++) {
    const depth = 2 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y++) side.set(x, y, pick(rand, GRASS));
  }
  return { top: noise(13, GRASS), side, bottom: noise(14, DIRT) };
}

function planks(): PixelGrid {
  const rand = seededRandom(21);
  const tones = ['#a8794a', '#9c6e41', '#b4855a'];
  return new PixelGrid().paint((x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) return '#6e4a2a';
    if (x === (row % 2 ? 4 : 11)) return '#7d5431';
    return pick(rand, tones);
  });
}

function explosive(): BlockTextures {
  const rand = seededRandom(31);
  const red = ['#d23b2c', '#c23426', '#e04a3a'];
  const side = new PixelGrid().paint((x, y) => {
    if (y >= 6 && y <= 9) return y === 6 || y === 9 ? '#2d2d2d' : '#f2f2f2';
    return x % 4 === 3 ? '#8e2418' : pick(rand, red);
  });
  // A few "warning" marks on the white band instead of text.
  for (const x of [2, 7, 12]) side.rect(x, 7, 2, 2, '#2d2d2d');
  const top = new PixelGrid().paint(() => pick(rand, red)).rect(6, 6, 4, 4, '#2d2d2d').rect(7, 7, 2, 2, '#e8c070');
  return { top, side, bottom: new PixelGrid().paint(() => pick(rand, red)) };
}

function diamondOre(): PixelGrid {
  const rand = seededRandom(41);
  const g = noise(42, STONE);
  for (const [cx, cy] of [[3, 3], [11, 5], [5, 11], [12, 12]]) {
    g.set(cx, cy, '#4ee6e0').set(cx + 1, cy, '#2bb5b8').set(cx, cy + 1, '#8ff5ef');
    if (rand() > 0.4) g.set(cx + 1, cy + 1, '#1e8f94');
  }
  return g;
}

function gold(): PixelGrid {
  const rand = seededRandom(51);
  return new PixelGrid().paint((x, y) => {
    if (x === 0 || y === 0) return '#fff0a0';
    if (x === 15 || y === 15) return '#b8862b';
    return pick(rand, ['#f2c14e', '#e8b53f', '#f7d36b']);
  });
}

const same = (g: PixelGrid): BlockTextures => ({ top: g, side: g, bottom: g });

const FACTORIES: Record<BlockId, () => BlockTextures> = {
  grass,
  dirt: () => same(noise(61, DIRT)),
  stone: () => same(noise(71, STONE)),
  planks: () => same(planks()),
  sand: () => same(noise(81, SAND)),
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
