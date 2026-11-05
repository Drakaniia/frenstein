/**
 * Low-level painting for the procedural wallpapers. Static layers are drawn
 * into packed RGBA buffers (fast per-pixel loops, ordered dithering), then
 * turned into canvases that the animation loop composites every frame.
 */

import { mix, ramp, rgba, type Color, type RGBA } from '@/lib/raster';

export type Rand = () => number;

/** Small, fast, seedable PRNG (mulberry32). */
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rand: Rand, lo: number, hi: number): number => lo + rand() * (hi - lo);
export const pickOne = <T,>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** 1-D value noise in [0, 1], smooth, deterministic for a seed. */
export function noise1(seed: number): (x: number) => number {
  const rand = seeded(seed);
  const table = Array.from({ length: 256 }, () => rand());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255] as number;
    const b = table[(i + 1) & 255] as number;
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

/** Fractal 1-D noise (a few octaves), roughly in [0, 1]. */
export function fbm1(seed: number, octaves = 4): (x: number) => number {
  const layers = Array.from({ length: octaves }, (_, i) => noise1(seed + i * 101));
  return (x: number) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (const layer of layers) {
      sum += layer(x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number): number => BAYER4[(y & 3) * 4 + (x & 3)] as number;

export function pack(color: Color | RGBA): number {
  const [r, g, b, a] = rgba(color);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Expand gradient stops into a banded palette of `n` packed colours. */
export function palette(stops: readonly Color[], n: number): number[] {
  return Array.from({ length: n }, (_, i) => pack(ramp(stops, n <= 1 ? 0 : i / (n - 1))));
}

/** Ordered-dither pick from a packed palette at position t ∈ [0, 1]. */
export function dither(pal: readonly number[], t: number, x: number, y: number): number {
  const k = clamp(t, 0, 1) * (pal.length - 1) + bayer(x, y) - 0.5;
  return pal[clamp(Math.round(k), 0, pal.length - 1)] as number;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  g.imageSmoothingEnabled = false;
  return g;
}

/** A packed RGBA buffer with pixel-art drawing helpers. */
export class Layer {
  readonly w: number;
  readonly h: number;
  readonly image: ImageData;
  readonly px: Uint32Array;

  constructor(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.image = new ImageData(this.w, this.h);
    this.px = new Uint32Array(this.image.data.buffer);
  }

  set(x: number, y: number, c: number): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x: number, y: number): number {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x] as number;
  }

  /** Alpha-blend a colour over the pixel (for glows and haze). */
  blend(x: number, y: number, color: RGBA, alpha: number): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || alpha <= 0) return;
    const i = y * this.w + x;
    const cur = this.px[i] as number;
    const ca = (cur >>> 24) & 255;
    if (ca === 0) {
      this.px[i] = pack([color[0], color[1], color[2], Math.round(alpha * 255)]);
      return;
    }
    const r = cur & 255;
    const g = (cur >>> 8) & 255;
    const b = (cur >>> 16) & 255;
    const a = Math.min(1, alpha);
    this.px[i] = pack([
      Math.round(r + (color[0] - r) * a),
      Math.round(g + (color[1] - g) * a),
      Math.round(b + (color[2] - b) * a),
      ca,
    ]);
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = Math.max(0, y | 0); j < Math.min(this.h, (y + h) | 0); j++) {
      for (let i = Math.max(0, x | 0); i < Math.min(this.w, (x + w) | 0); i++) this.px[j * this.w + i] = c;
    }
  }

  /** Filled disc with a per-pixel colour callback. */
  disc(cx: number, cy: number, r: number, color: (dx: number, dy: number, x: number, y: number) => number | null): void {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        if (dx * dx + dy * dy > 1) continue;
        const c = color(dx, dy, x, y);
        if (c !== null) this.set(x, y, c);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: (dx: number, dy: number, x: number, y: number) => number | null): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const c = color(dx, dy, x, y);
        if (c !== null) this.set(x, y, c);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
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

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    ctx2d(c).putImageData(this.image, 0, 0);
    return c;
  }
}

/** Mix two colours and pack the result. */
export const packMix = (a: Color, b: Color, t: number): number => pack(mix(a, b, t));

/** A classic pixel heart mask, `size` wide. */
export function heartMask(size: number): boolean[][] {
  const hgt = Math.max(2, Math.round(size * 0.9));
  const s = size / 2;
  const rows: boolean[][] = [];
  for (let j = 0; j < hgt; j++) {
    const row: boolean[] = [];
    for (let i = 0; i < size; i++) {
      const u = (i + 0.5 - s) / s;
      const v = 1.15 - ((j + 0.5) / hgt) * 2.3;
      const a = u * u + v * v - 1;
      row.push(a * a * a - u * u * v * v * v <= 0);
    }
    rows.push(row);
  }
  return rows;
}

/** Pre-rendered pixel heart sprite with a highlight and soft rim. */
export function heartSprite(size: number, fill: Color, light: Color, rim: Color): HTMLCanvasElement {
  const mask = heartMask(size);
  const c = makeCanvas(size + 2, mask.length + 2);
  const g = ctx2d(c);
  const at = (i: number, j: number) => mask[j]?.[i] === true;
  mask.forEach((row, j) =>
    row.forEach((on, i) => {
      if (!on) return;
      const edge = !at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1);
      g.fillStyle = edge ? (typeof rim === 'string' ? rim : `rgba(${rim.join(',')})`) : typeof fill === 'string' ? fill : `rgba(${fill.join(',')})`;
      g.fillRect(i + 1, j + 1, 1, 1);
    })
  );
  if (size >= 5) {
    g.fillStyle = typeof light === 'string' ? light : `rgba(${light.join(',')})`;
    const hx = Math.max(1, Math.round(size * 0.25));
    g.fillRect(hx + 1, Math.max(1, Math.round(size * 0.2)) + 1, 1, 1);
    if (size >= 8) g.fillRect(hx + 2, Math.max(1, Math.round(size * 0.2)) + 1, 1, 1);
  }
  return c;
}

/** A soft round glow sprite (for fireflies, stars, sparkles). */
export function glowSprite(radius: number, core: Color, halo: Color): HTMLCanvasElement {
  const d = radius * 2 + 1;
  const c = makeCanvas(d, d);
  const g = ctx2d(c);
  const [cr, cg, cb] = rgba(core);
  const [hr, hg, hb] = rgba(halo);
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const dist = Math.hypot(x - radius, y - radius) / (radius + 0.5);
      if (dist > 1) continue;
      if (dist < 0.3) g.fillStyle = `rgb(${cr},${cg},${cb})`;
      else g.fillStyle = `rgba(${hr},${hg},${hb},${(0.55 * (1 - dist)).toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}
