import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  SRGBColorSpace,
  type Material,
} from 'three';
import type { Lighting } from '../rig/character';
import { getBlockTextures, type BlockId, BLOCK_IDS } from './blocks';
import { getItemSprite, type ItemId } from './items';
import { PixelGrid } from './pixelArt';

export type PropId = BlockId | 'chest' | 'chair';
export const PROP_IDS: PropId[] = [...BLOCK_IDS, 'chest', 'chair'];

/** One block is 16 world units (skin pixels); the player is 32 tall. */
export const BLOCK_SIZE = 16;

const materialFor = (lighting: Lighting, params: ConstructorParameters<typeof MeshBasicMaterial>[0]): Material =>
  lighting === 'shaded' ? new MeshLambertMaterial(params) : new MeshBasicMaterial(params);

// ---------- Item sprites extruded into voxels ----------

const SIDE_SHADE = 0.78;

/**
 * Builds a 1-pixel-thick voxel mesh from a sprite, with per-vertex colors.
 * Only faces bordering empty pixels are emitted. Side faces are darkened so the
 * thickness reads even with flat lighting. Origin is the sprite's top-left corner, Y up.
 */
export function spriteGeometry(grid: PixelGrid, depth = 1): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new Color();
  const hz = depth / 2;

  const quad = (corners: number[][], normal: number[], shade: number) => {
    const [a, b, c, d] = corners;
    for (const v of [a, b, c, a, c, d]) {
      positions.push(...v);
      normals.push(...normal);
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }
  };

  for (let py = 0; py < grid.size; py++) {
    for (let px = 0; px < grid.size; px++) {
      const hex = grid.get(px, py);
      if (!hex) continue;
      color.set(hex);
      const x0 = px;
      const x1 = px + 1;
      const y1 = -py;
      const y0 = -py - 1;
      quad([[x0, y0, hz], [x1, y0, hz], [x1, y1, hz], [x0, y1, hz]], [0, 0, 1], 1);
      quad([[x1, y0, -hz], [x0, y0, -hz], [x0, y1, -hz], [x1, y1, -hz]], [0, 0, -1], 1);
      if (!grid.get(px - 1, py)) quad([[x0, y0, -hz], [x0, y0, hz], [x0, y1, hz], [x0, y1, -hz]], [-1, 0, 0], SIDE_SHADE);
      if (!grid.get(px + 1, py)) quad([[x1, y0, hz], [x1, y0, -hz], [x1, y1, -hz], [x1, y1, hz]], [1, 0, 0], SIDE_SHADE);
      if (!grid.get(px, py - 1)) quad([[x0, y1, hz], [x1, y1, hz], [x1, y1, -hz], [x0, y1, -hz]], [0, 1, 0], SIDE_SHADE);
      if (!grid.get(px, py + 1)) quad([[x0, y0, -hz], [x1, y0, -hz], [x1, y0, hz], [x0, y0, hz]], [0, -1, 0], SIDE_SHADE);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

const itemGeometries = new Map<ItemId, BufferGeometry>();
const itemMaterials = new Map<Lighting, Material>();

/** Scale of one item pixel in world units. */
const ITEM_PIXEL = 0.75;

/**
 * An item whose origin is its grip point. The sprite lies in the YZ plane, so with the arm
 * hanging down it points forward (+Z) for a character facing +Z, like in-game.
 */
export function createItemObject(id: ItemId, lighting: Lighting): Group {
  const sprite = getItemSprite(id);
  let geometry = itemGeometries.get(id);
  if (!geometry) {
    geometry = spriteGeometry(sprite.grid);
    itemGeometries.set(id, geometry);
  }
  let material = itemMaterials.get(lighting);
  if (!material) {
    material = materialFor(lighting, { vertexColors: true });
    itemMaterials.set(lighting, material);
  }

  const mesh = new Mesh(geometry, material);
  const [gx, gy] = sprite.grip;
  mesh.position.set(-(gx + 0.5), gy + 0.5, 0);

  const pivot = new Group();
  pivot.add(mesh);
  pivot.scale.setScalar(ITEM_PIXEL);
  pivot.rotation.y = -Math.PI / 2;
  const holder = new Group();
  holder.add(pivot);
  // Tilt so the item's diagonal points straight out of the fist, perpendicular to the arm.
  holder.rotation.x = Math.PI / 4;
  return holder;
}

// ---------- Blocks and furniture ----------

const textures = new Map<PixelGrid, CanvasTexture>();

function textureFor(grid: PixelGrid): CanvasTexture {
  let texture = textures.get(grid);
  if (!texture) {
    const canvas = new OffscreenCanvas(grid.size, grid.size);
    const ctx = canvas.getContext('2d')!;
    for (let y = 0; y < grid.size; y++) {
      for (let x = 0; x < grid.size; x++) {
        const c = grid.get(x, y);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    texture = new CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    textures.set(grid, texture);
  }
  return texture;
}

const texturedMaterials = new Map<string, Material>();

function texturedMaterial(grid: PixelGrid, lighting: Lighting, key: string): Material {
  const id = `${key}|${lighting}`;
  let material = texturedMaterials.get(id);
  if (!material) {
    material = materialFor(lighting, { map: textureFor(grid) });
    texturedMaterials.set(id, material);
  }
  return material;
}

const boxGeometries = new Map<string, BoxGeometry>();

function box(w: number, h: number, d: number): BoxGeometry {
  const key = `${w}x${h}x${d}`;
  let geometry = boxGeometries.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(w, h, d);
    boxGeometries.set(key, geometry);
  }
  return geometry;
}

function blockMesh(id: BlockId, lighting: Lighting): Mesh {
  const t = getBlockTextures(id);
  const side = texturedMaterial(t.side, lighting, `${id}-side`);
  const top = texturedMaterial(t.top, lighting, `${id}-top`);
  const bottom = texturedMaterial(t.bottom, lighting, `${id}-bottom`);
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  const mesh = new Mesh(box(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), [side, side, top, bottom, side, side]);
  mesh.position.y = BLOCK_SIZE / 2;
  return mesh;
}

let chestGrids: { side: PixelGrid; front: PixelGrid; top: PixelGrid } | null = null;

function chestTextures() {
  if (!chestGrids) {
    const wood = (x: number, y: number) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return '#4a2f16';
      if (y === 6) return '#4a2f16';
      return (x + y * 3) % 7 === 0 ? '#8a5a2c' : '#a36d38';
    };
    const side = new PixelGrid().paint(wood);
    const front = new PixelGrid().paint(wood).rect(7, 5, 2, 4, '#d9d9d9').rect(7, 8, 2, 1, '#7f7f7f');
    const top = new PixelGrid().paint((x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? '#4a2f16' : (x * 5 + y) % 9 === 0 ? '#8a5a2c' : '#a36d38'));
    chestGrids = { side, front, top };
  }
  return chestGrids;
}

function chest(lighting: Lighting): Group {
  const t = chestTextures();
  const side = texturedMaterial(t.side, lighting, 'chest-side');
  const front = texturedMaterial(t.front, lighting, 'chest-front');
  const top = texturedMaterial(t.top, lighting, 'chest-top');
  const mesh = new Mesh(box(14, 14, 14), [side, side, top, top, front, side]);
  mesh.position.y = 7;
  const group = new Group();
  group.add(mesh);
  return group;
}

function chair(lighting: Lighting): Group {
  const wood = texturedMaterial(getBlockTextures('planks').side, lighting, 'planks-side');
  const group = new Group();
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(box(w, h, d), wood);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  add(12, 2, 12, 0, 11, 0); // seat, top at y=12 (hip height)
  for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) add(2, 10, 2, x, 5, z);
  add(12, 14, 2, 0, 19, -5); // backrest
  return group;
}

/** A prop with its origin at the bottom center. */
export function createPropObject(id: PropId, lighting: Lighting): Group {
  if (id === 'chest') return chest(lighting);
  if (id === 'chair') return chair(lighting);
  const group = new Group();
  group.add(blockMesh(id, lighting));
  return group;
}
