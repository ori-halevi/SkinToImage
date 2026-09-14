/** A tiny pixel canvas (y down) used to author original item sprites and block textures in code. */
export class PixelGrid {
  readonly pixels: (string | null)[];

  constructor(readonly size = 16) {
    this.pixels = new Array(size * size).fill(null);
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return null;
    return this.pixels[y * this.size + x];
  }

  set(x: number, y: number, color: string | null): this {
    if (x >= 0 && y >= 0 && x < this.size && y < this.size) this.pixels[y * this.size + x] = color;
    return this;
  }

  fill(color: string): this {
    this.pixels.fill(color);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
    return this;
  }

  /** Bresenham line, inclusive of both ends. */
  line(x0: number, y0: number, x1: number, y1: number, color: string): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) return this;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Calls `paint` for every pixel, so textures can be generated procedurally. */
  paint(fn: (x: number, y: number) => string | null): this {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) this.set(x, y, fn(x, y));
    return this;
  }
}

/** Deterministic PRNG (mulberry32) so procedural textures look identical on every render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one of `colors`, weighted toward the first. */
export function pick(rand: () => number, colors: string[]): string {
  return colors[Math.min(colors.length - 1, Math.floor(rand() ** 1.6 * colors.length))];
}
