/**
 * The four FrenOS XP wallpapers, painted procedurally at "art resolution"
 * (a few hundred pixels across) and upscaled crisply by the stage.
 *
 *   sunset    — the sunset meadow from the original desktop PNG, now alive
 *   bliss     — a pixel-art homage to XP's rolling green hill
 *   nightfall — a starry night with a heart-shaped constellation
 *   sakura    — a cherry-blossom morning with drifting petals
 */

import { mix, rgba, type Color } from '@/lib/raster';
import type { WallpaperId } from '@/os/types';
import {
  between,
  bayer,
  clamp,
  ctx2d,
  dither,
  fbm1,
  Layer,
  pack,
  palette,
  pickOne,
  seeded,
  smooth,
  type Rand,
} from './paint';
import { Birds, Butterflies, CloudDrift, Fireflies, HeartRise, Petals, ShootingStars, StarField } from './particles';

type G = CanvasRenderingContext2D;

export interface SceneOptions {
  /** Fewer particles for phones and low-power devices. */
  lite: boolean;
}

export interface Scene {
  /** Advance the animation by `dt` seconds and paint the frame. */
  draw(g: G, t: number, dt: number): void;
  /** Click feedback: a puff of hearts at art px (x, y). */
  burst(x: number, y: number): void;
  /** Did the click land on a shooting star? */
  wish(x: number, y: number): boolean;
}

/* ───────────────────────────── shared art ─────────────────────────────── */

interface TreePalette {
  dark: Color;
  mid: Color;
  light: Color;
  rim?: Color;
  trunk: Color;
}

/** A tiered pixel pine. `lit` is the side the light comes from. */
function pine(layer: Layer, cx: number, base: number, height: number, pal: TreePalette, lit: 1 | -1 = 1): void {
  const dark = pack(pal.dark);
  const mid = pack(pal.mid);
  const light = pack(pal.light);
  const rim = pal.rim ? pack(pal.rim) : light;
  const trunk = pack(pal.trunk);
  const top = base - height;
  const maxHalf = Math.max(2, height * 0.3);
  const tiers = Math.max(2, Math.round(height / 7));
  layer.rect(cx - (height > 20 ? 1 : 0), base - Math.max(2, Math.round(height * 0.12)), height > 20 ? 2 : 1, Math.max(2, Math.round(height * 0.12)) + 1, trunk);
  for (let y = top; y < base - Math.round(height * 0.08); y++) {
    const p = (y - top) / height;
    const tierPos = (p * tiers) % 1;
    const half = Math.max(0.5, maxHalf * (0.25 + 0.75 * p) * (0.45 + 0.55 * tierPos));
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const side = (x - cx) / Math.max(1, half);
      let c = mid;
      if (side * lit > 0.45) c = light;
      if (side * lit < -0.35) c = dark;
      if (tierPos > 0.82 && side * lit < 0.2) c = dark;
      if (Math.abs(x - Math.round(cx + half * lit)) === 0 && side * lit > 0.6) c = rim;
      layer.set(x, y, c);
    }
  }
}

/** A round leafy tree built from overlapping clumps. */
function roundTree(layer: Layer, rand: Rand, cx: number, base: number, r: number, pal: TreePalette, lit: 1 | -1 = 1): void {
  const trunk = pack(pal.trunk);
  layer.rect(cx - 1, base - Math.round(r * 0.9), 2, Math.round(r * 0.9) + 1, trunk);
  const cy = base - r * 1.5;
  const clumps = 5 + Math.round(r / 3);
  const shades = [pack(pal.dark), pack(pal.mid), pack(pal.light)];
  for (let k = 0; k < clumps; k++) {
    const a = (k / clumps) * Math.PI * 2;
    const ox = Math.cos(a) * r * 0.45 + between(rand, -1, 1);
    const oy = Math.sin(a) * r * 0.35 + between(rand, -1, 1);
    const cr = r * between(rand, 0.48, 0.66);
    layer.disc(cx + ox, cy + oy, cr, (dx, dy, x, y) => {
      const l = -dx * lit * 0.6 + dy * 0.8 + (bayer(x, y) - 0.5) * 0.5;
      return shades[l < -0.35 ? 2 : l > 0.35 ? 0 : 1] as number;
    });
  }
}

/** Three pre-rendered frames of foreground grass so the meadow can sway. */
function grassFrames(
  W: number,
  H: number,
  rand: Rand,
  y0: number,
  count: number,
  colors: readonly Color[],
  tip: Color
): HTMLCanvasElement[] {
  const blades = Array.from({ length: count }, () => {
    const base = between(rand, y0, H + 2);
    const depth = (base - y0) / Math.max(1, H - y0);
    return {
      x: Math.floor(rand() * W),
      base: Math.round(base),
      h: Math.round(2 + depth * between(rand, 3, 8)),
      c: pack(pickOne(rand, colors)),
    };
  });
  blades.sort((a, b) => a.base - b.base);
  const tipC = pack(tip);
  return [-1, 0, 1].map((lean) => {
    const layer = new Layer(W, H);
    for (const b of blades) {
      for (let k = 0; k <= b.h; k++) {
        const bend = b.h >= 4 && k > b.h * 0.55 ? lean : 0;
        layer.set(b.x + bend, b.base - k, k === b.h && b.h >= 5 ? tipC : b.c);
      }
    }
    return layer.toCanvas();
  });
}

/** Scatter little pixel flowers over a ground region. */
function flowers(layer: Layer, rand: Rand, W: number, H: number, ground: (x: number) => number, count: number, colors: readonly Color[]): void {
  const centre = pack('#ffd23f');
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * W);
    const g0 = ground(x);
    const y = Math.round(g0 + (H - g0) * Math.sqrt(rand()));
    const depth = (y - g0) / Math.max(1, H - g0);
    const c = pack(pickOne(rand, colors));
    if (depth > 0.62 && rand() < 0.5) {
      layer.set(x - 1, y, c);
      layer.set(x + 1, y, c);
      layer.set(x, y - 1, c);
      layer.set(x, y + 1, c);
      layer.set(x, y, centre);
    } else if (depth > 0.3 && rand() < 0.35) {
      layer.set(x, y, c);
      layer.set(x + 1, y, c);
    } else {
      layer.set(x, y, c);
    }
  }
}

/** A soft dithered glow (sun, moon, lamps) blended into a layer. */
function halo(layer: Layer, cx: number, cy: number, r: number, color: Color, strength: number, clipY = Infinity): void {
  const c = rgba(color);
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r) && y < clipY; y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d >= 1) continue;
      const level = Math.pow(1 - d, 1.7) * strength * 3 + bayer(x, y) - 0.5;
      const q = Math.round(level);
      if (q > 0) layer.blend(x, y, c, Math.min(0.85, q * 0.2));
    }
  }
}

/** Mirror-row water with wobble and glints, for scenes with a lake. */
class Water {
  private readonly src: HTMLCanvasElement;
  private readonly top: number;
  private readonly rows: number;
  private readonly glintX: number;
  private readonly glintHalf: number;
  private readonly glint: string;

  constructor(
    sky: Layer,
    W: number,
    top: number,
    rows: number,
    opts: { tint: Color; deep: Color; glintX: number; glintHalf: number; glint: Color; reflect: Color; streak: Color }
  ) {
    this.top = top;
    this.rows = rows;
    this.glintX = opts.glintX;
    this.glintHalf = opts.glintHalf;
    const [gr, gg, gb] = rgba(opts.glint);
    this.glint = `rgb(${gr},${gg},${gb})`;
    const layer = new Layer(W + 4, rows);
    const reflect = rgba(opts.reflect);
    const streak = pack(opts.streak);
    for (let d = 0; d < rows; d++) {
      const depth = d / Math.max(1, rows - 1);
      const sy = clamp(top - 1 - Math.floor(d * 1.7), 0, sky.h - 1);
      for (let x = -2; x < W + 2; x++) {
        const s = sky.get(clamp(x, 0, W - 1), sy);
        let c = mix([s & 255, (s >>> 8) & 255, (s >>> 16) & 255, 255], opts.tint, 0.28 + depth * 0.2);
        c = mix(c, opts.deep, depth * 0.35);
        const dx = Math.abs(x - opts.glintX) / (opts.glintHalf * (0.6 + depth * 0.6));
        if (dx < 1 && d % 3 !== 2) c = mix(c, reflect, (1 - dx) * (0.85 - depth * 0.45));
        layer.set(x + 2, d, pack(c));
      }
      if (d % 4 === 1) {
        const rand = seeded(d * 97 + 13);
        for (let k = 0; k < W / 26; k++) {
          const x = Math.floor(rand() * W);
          for (let i = 0; i < 3 + Math.floor(rand() * 4); i++) layer.set(x + i + 2, d, streak);
        }
      }
    }
    this.src = layer.toCanvas();
  }

  draw(g: G, t: number): void {
    const W = this.src.width - 4;
    for (let d = 0; d < this.rows; d++) {
      const amp = 0.6 + (d / this.rows) * 1.1;
      const off = Math.round(Math.sin(t * 1.25 + d * 0.85) * amp);
      g.drawImage(this.src, 2 - off, d, W, 1, 0, this.top + d, W, 1);
    }
    // Glints dance on the reflection column.
    const tick = Math.floor(t * 4);
    g.fillStyle = this.glint;
    for (let d = 0; d < this.rows; d += 2) {
      const r = seeded(tick * 131 + d * 7)();
      if (r > 0.55) continue;
      const half = this.glintHalf * (0.5 + (d / this.rows) * 0.7);
      const x = Math.round(this.glintX + (r * 2 - 0.55) * half);
      g.fillRect(x, this.top + d, 2 + Math.floor(r * 4), 1);
    }
  }
}

/** Parametric heart, centred, `size` tall, as `n` points. */
function heartPoints(cx: number, cy: number, size: number, n: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([cx + (x / 34) * size, cy - (y / 34) * size]);
  }
  return pts;
}

/* ───────────────────────────── sunset meadow ──────────────────────────── */

function sunset(W: number, H: number, { lite }: SceneOptions): Scene {
  const rand = seeded(2306);
  const portrait = H > W * 1.15;
  const horizon = Math.round(H * (portrait ? 0.55 : 0.52));
  const sunX = Math.round(W * (portrait ? 0.66 : 0.72));
  const sunR = Math.max(5, Math.round(Math.min(H * 0.075, W * 0.1)));
  const sunY = horizon - Math.round(sunR * 0.4);

  /* sky */
  const sky = new Layer(W, H);
  const skyPal = palette(['#3a2e78', '#593e90', '#7c4a9c', '#a4528f', '#cb5a7c', '#e66a60', '#f3854a', '#f9a64c', '#ffc760'], 20);
  for (let y = 0; y < H; y++) {
    const t = Math.pow(Math.min(1, y / horizon), 0.92);
    for (let x = 0; x < W; x++) {
      const dx = (x - sunX) / (W * 0.5);
      const warm = Math.max(0, 1 - dx * dx) * smooth(0.35, 1, t) * 0.12;
      sky.set(x, y, dither(skyPal, t + warm, x, y));
    }
  }
  halo(sky, sunX, sunY, sunR * 3.4, '#ffc468', 0.9, horizon);
  halo(sky, sunX, sunY, sunR * 1.9, '#ffe08a', 1, horizon);
  const sunPal = palette(['#fff8cc', '#ffe680', '#ffc84a'], 5);
  sky.disc(sunX, sunY, sunR, (_dx, dy, x, y) => {
    if (y >= horizon) return null;
    if (dy > 0.2 && (y - sunY) % 3 === 0) return null;
    return dither(sunPal, (dy + 1) / 2, x, y);
  });

  const stars = new StarField(rand, W, 0, horizon * 0.42, Math.round((W * H) / (lite ? 5200 : 3400)), ['#ffffff', '#ffe9c8', '#d9d0ff'], 0.75);
  const clouds = new CloudDrift(rand, W, [
    { y0: H * 0.04, y1: H * 0.15, count: 3, width: [W * 0.12, W * 0.24], height: [4, 7], speed: [0.7, 1.4], style: { puffy: false, tones: ['#6e4486', '#a3568c', '#e2829a'] } },
    { y0: H * 0.15, y1: H * 0.3, count: 4, width: [W * 0.1, W * 0.2], height: [4, 8], speed: [1.1, 2.0], style: { puffy: false, tones: ['#a14c7a', '#de6e5e', '#ffb06e'] } },
    { y0: H * 0.3, y1: Math.max(H * 0.31, horizon - sunR * 2.2), count: 3, width: [W * 0.07, W * 0.15], height: [3, 5], speed: [1.5, 2.6], style: { puffy: false, tones: ['#cf5e4c', '#f59249', '#ffd47c'] } },
  ]);

  /* mountains */
  const mtn = new Layer(W, H);
  const farN = fbm1(11);
  const nearN = fbm1(23);
  const farPal = palette(['#b06a9a', '#9c6198', '#8a5896'], 5);
  const nearPal = palette(['#7a4f8e', '#664487', '#563b7a'], 6);
  const litFar = pack('#d2849a');
  const litNear = pack('#a35c8c');
  const farTop: number[] = [];
  const nearTop: number[] = [];
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const valley = 0.3 + 0.7 * smooth(0.03, 0.24, Math.abs(u - sunX / W));
    const leftPeak = Math.max(0, 1 - Math.abs(u - 0.16) / 0.2);
    const rightPeak = Math.max(0, 1 - Math.abs(u - 0.95) / 0.12);
    farTop.push(Math.round(horizon - H * (0.045 + 0.075 * farN(u * 3.4)) * valley - H * 0.07 * leftPeak));
    nearTop.push(Math.round(horizon - H * (0.02 + 0.045 * nearN(u * 6.5)) * valley - H * 0.13 * leftPeak * leftPeak - H * 0.06 * rightPeak));
  }
  for (let x = 0; x < W; x++) {
    const ft = farTop[x] as number;
    const slopeF = (farTop[Math.min(W - 1, x + 1)] as number) - (farTop[Math.max(0, x - 1)] as number);
    for (let y = ft; y < horizon; y++) {
      const t = (y - ft) / Math.max(1, horizon - ft);
      const lit = x < sunX ? slopeF > 0 : slopeF < 0;
      mtn.set(x, y, lit && y - ft < 3 ? litFar : dither(farPal, t, x, y));
    }
    const nt = nearTop[x] as number;
    const slopeN = (nearTop[Math.min(W - 1, x + 1)] as number) - (nearTop[Math.max(0, x - 1)] as number);
    for (let y = nt; y < horizon; y++) {
      const t = (y - nt) / Math.max(1, horizon - nt);
      const lit = x < sunX ? slopeN > 0 : slopeN < 0;
      mtn.set(x, y, lit && y - nt < 2 + Math.round(H * 0.006) ? litNear : dither(nearPal, 0.15 + t * 0.85, x, y));
    }
  }
  // far tree line along the water's edge
  const shoreTrees = pack('#2c3f3a');
  const shoreLight = pack('#45604a');
  const shoreN = fbm1(5);
  for (let x = 0; x < W; x++) {
    const h = Math.round(1 + shoreN(x * 0.35) * 3);
    for (let k = 0; k < h; k++) mtn.set(x, horizon - 1 - k, k === h - 1 && x % 3 === 0 ? shoreLight : shoreTrees);
  }

  /* water */
  const lakeRows = Math.round(H * (portrait ? 0.11 : 0.14));
  const water = new Water(sky, W, horizon, lakeRows, {
    tint: '#6a5aa6',
    deep: '#4a3f86',
    glintX: sunX,
    glintHalf: sunR * 1.1,
    glint: '#fff2b8',
    reflect: '#ffcf6a',
    streak: '#c99ad0',
  });

  /* land */
  const land = new Layer(W, H);
  const groundN = fbm1(77);
  const ground = (x: number): number => {
    const u = x / W;
    const shore = smooth(0.38, 0.62, u);
    return Math.round(horizon + H * 0.008 + shore * lakeRows + (groundN(u * 4) - 0.5) * H * 0.03);
  };
  const midHill = (x: number): number => ground(x) + Math.round(H * 0.06 + (groundN(x * 0.02 + 9) - 0.5) * H * 0.05);
  const meadowPal = palette(['#9aa95a', '#7cae4c', '#62a042', '#4f8f3a', '#3f7d33', '#30692b', '#265a25'], 16);
  const rimLight = pack('#b9c86a');
  const texN = fbm1(31);
  for (let x = 0; x < W; x++) {
    const g0 = ground(x);
    const m = midHill(x);
    for (let y = g0; y < H; y++) {
      const depth = (y - horizon) / Math.max(1, H - horizon);
      let t = depth * 0.95 + (texN(x * 0.09 + y * 0.31) - 0.5) * 0.14;
      if (y >= m && y < m + 3) t += 0.1;
      if (y - g0 < 1 || (y >= m - 1 && y < m)) land.set(x, y, rimLight);
      else land.set(x, y, dither(meadowPal, t, x, y));
    }
  }
  // far right bank (in front of the lake)
  const bank = palette(['#5d8a45', '#4a7a3c', '#3c6a34'], 4);
  for (let x = Math.round(W * 0.86); x < W; x++) {
    const u = (x - W * 0.86) / (W * 0.14);
    const top = horizon + Math.round(1 + (1 - u) * 2);
    const bottom = horizon + Math.round(smooth(0, 0.5, u) * lakeRows * 0.35) + 2;
    for (let y = top; y < bottom; y++) land.set(x, y, dither(bank, (y - top) / Math.max(1, bottom - top), x, y));
  }

  const treePal: TreePalette = { dark: '#1b3524', mid: '#2b5530', light: '#4c8a3e', rim: '#8aa556', trunk: '#3a2a1e' };
  const farPine: TreePalette = { dark: '#24402e', mid: '#335a38', light: '#4f7e45', rim: '#7d9a58', trunk: '#3a2a1e' };
  const s = H / 225;
  // round trees along the meadow's far edge
  for (const u of [0.22, 0.27, 0.31, 0.36, 0.66]) {
    const x = Math.round(W * u + between(rand, -2, 2));
    roundTree(land, rand, x, ground(x) + 1, Math.max(3, Math.round(between(rand, 5, 8) * s)), treePal, 1);
  }
  for (const [u, hgt] of [
    [0.45, 0.11],
    [0.5, 0.08],
    [0.555, 0.06],
  ] as const) {
    const x = Math.round(W * u);
    pine(land, x, ground(x) + 1, Math.round(H * hgt), farPine, 1);
  }
  for (const [u, hgt] of [
    [0.93, 0.07],
    [0.97, 0.05],
  ] as const) {
    const x = Math.round(W * u);
    pine(land, x, horizon + 3, Math.round(H * hgt), farPine, -1);
  }
  // the tall pines on the left and the pair on the right
  for (const [u, hgt] of [
    [0.03, 0.23],
    [0.075, 0.3],
    [0.12, 0.2],
    [0.165, 0.14],
  ] as const) {
    const x = Math.round(W * u);
    pine(land, x, ground(x) + Math.round(H * 0.03), Math.round(H * hgt), treePal, 1);
  }
  for (const [u, hgt] of [
    [0.83, 0.18],
    [0.875, 0.22],
  ] as const) {
    const x = Math.round(W * u);
    pine(land, x, ground(x) + Math.round(H * 0.02), Math.round(H * hgt), treePal, -1);
  }

  flowers(land, rand, W, H, ground, Math.round((W * H) / (lite ? 90 : 55)), ['#ff7aa8', '#ff4d6d', '#ffe066', '#ffffff', '#9fd0ff', '#ff9f1c', '#f27ba0', '#d0a8ff']);

  // the wooden fence, receding from the bottom-left corner
  const wood = pack('#7a5638');
  const woodLight = pack('#a37a4f');
  const woodDark = pack('#4a3222');
  const fx0 = -4;
  const fy0 = H * (portrait ? 0.86 : 0.84);
  const fx1 = W * (portrait ? 0.5 : 0.56);
  const fy1 = H * (portrait ? 0.74 : 0.7);
  const posts: Array<{ x: number; y: number; h: number; w: number }> = [];
  for (let k = 0, sPos = 0; sPos <= 1.0001; k++) {
    const x = fx0 + (fx1 - fx0) * sPos;
    const y = fy0 + (fy1 - fy0) * sPos;
    const near = 1 - sPos;
    posts.push({ x: Math.round(x), y: Math.round(y), h: Math.round(H * (0.035 + 0.075 * near)), w: near > 0.55 ? 3 : near > 0.2 ? 2 : 1 });
    sPos += 0.07 + 0.07 * (1 - near) + (k === 0 ? 0.02 : 0);
  }
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i] as (typeof posts)[number];
    const b = posts[i + 1] as (typeof posts)[number];
    for (const level of [0.3, 0.68]) {
      const thick = a.w >= 3 ? 2 : 1;
      for (let k = 0; k < thick; k++) {
        land.line(a.x, a.y - a.h * level + k, b.x, b.y - b.h * level + k, k === 0 ? woodLight : wood);
      }
    }
  }
  for (const p of posts) {
    land.rect(p.x, p.y - p.h, p.w, p.h + 1, wood);
    land.rect(p.x, p.y - p.h, 1, p.h + 1, woodLight);
    if (p.w > 1) land.rect(p.x + p.w - 1, p.y - p.h, 1, p.h + 1, woodDark);
    land.rect(p.x, p.y - p.h, p.w, 1, woodLight);
  }

  const skyC = sky.toCanvas();
  const mtnC = mtn.toCanvas();
  const landC = land.toCanvas();
  const sway = grassFrames(W, H, rand, H * 0.8, Math.round(W * (lite ? 0.6 : 1.1)), ['#2a5a25', '#3f7a33', '#56963c', '#7fbf52', '#a8d96a'], '#d5e27a');

  const hearts = new HeartRise(rand, { x0: W * 0.04, x1: W * 0.96, y0: H * 0.72, y1: H, top: H * 0.08 }, lite ? 0.5 : 0.95);
  const flies = new Fireflies(rand, { x0: 0, x1: W, y0: horizon + lakeRows * 0.6, y1: H * 0.96 }, lite ? 6 : 12, '#fff6c0', '#ffc95a');
  const birds = new Birds(rand, { w: W, y0: H * 0.1, y1: H * 0.3 }, [16, 30], '#3a2346');
  const shots = new ShootingStars(rand, { w: W, top: 2, bottom: horizon * 0.55 }, [26, 48]);

  return {
    draw(g, t, dt) {
      g.drawImage(skyC, 0, 0);
      stars.draw(g, t);
      shots.update(dt);
      shots.draw(g);
      birds.update(dt);
      birds.draw(g);
      clouds.update(dt);
      clouds.draw(g);
      g.drawImage(mtnC, 0, 0);
      water.draw(g, t);
      g.drawImage(landC, 0, 0);
      const s3 = Math.sin(t * 0.9);
      g.drawImage(sway[s3 < -0.35 ? 0 : s3 > 0.35 ? 2 : 1] as HTMLCanvasElement, 0, 0);
      flies.update(dt);
      flies.draw(g, t);
      hearts.update(dt);
      hearts.draw(g);
    },
    burst: (x, y) => hearts.burst(x, y),
    wish: (x, y) => shots.hit(x, y),
  };
}

/* ───────────────────────────── bliss ──────────────────────────────────── */

function bliss(W: number, H: number, { lite }: SceneOptions): Scene {
  const rand = seeded(2001);
  const skyPal = palette(['#1545bb', '#1b58d0', '#276cdb', '#3b83e5', '#559bed', '#74b2f3', '#97c8f7', '#bfe0fb'], 22);
  const sky = new Layer(W, H);
  const bottom = H * 0.8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, y / bottom) * 0.92 + (x / W) * 0.08;
      sky.set(x, y, dither(skyPal, t, x, y));
    }
  }
  const clouds = new CloudDrift(rand, W, [
    { y0: H * 0.04, y1: H * 0.18, count: 3, width: [W * 0.16, W * 0.28], height: [H * 0.09, H * 0.15], speed: [0.5, 1.0], style: { puffy: true, tones: ['#b9cde9', '#e4eefa', '#ffffff'] } },
    { y0: H * 0.2, y1: H * 0.38, count: 3, width: [W * 0.1, W * 0.18], height: [H * 0.06, H * 0.1], speed: [0.8, 1.5], style: { puffy: true, tones: ['#c2d5ee', '#e9f2fb', '#ffffff'] } },
  ]);

  const hills = new Layer(W, H);
  const backPal = palette(['#5cae4a', '#4a9a3e', '#3a8434', '#2d6e2a'], 10);
  const mainPal = palette(['#a6ea62', '#8ad850', '#6fc642', '#59b337', '#479f2f', '#388a28', '#2b7422', '#215f1c'], 22);
  const streak = fbm1(42);
  const back = (u: number) => H * 0.6 + Math.pow((u - 0.86) / 0.36, 2) * H * 0.16;
  const main = (u: number) => H * 0.55 + Math.pow(u - 0.4, 2) * (u < 0.4 ? H * 0.95 : H * 0.72);
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const bt = Math.round(back(u));
    const mt = Math.round(main(u));
    for (let y = bt; y < mt; y++) hills.set(x, y, dither(backPal, (y - bt) / Math.max(1, H * 0.25), x, y));
    for (let y = mt; y < H; y++) {
      const d = (y - mt) / Math.max(1, H - mt);
      let t = d * 0.78 + Math.max(0, u - 0.4) * 0.32 + (streak(u * 7 + d * 3.5) - 0.5) * 0.18;
      if (y - mt < 1) t = -0.2;
      hills.set(x, y, dither(mainPal, t, x, y));
    }
  }

  const skyC = sky.toCanvas();
  const hillsC = hills.toCanvas();
  const sway = grassFrames(W, H, rand, H * 0.86, Math.round(W * (lite ? 0.35 : 0.6)), ['#2b7422', '#388a28', '#59b337', '#8ad850'], '#b8f07a');
  const hearts = new HeartRise(rand, { x0: W * 0.05, x1: W * 0.95, y0: H * 0.72, y1: H, top: H * 0.1 }, lite ? 0.3 : 0.5);
  const flutter = new Butterflies(rand, { x0: W * 0.12, x1: W * 0.88, y0: H * 0.48, y1: H * 0.8 }, lite ? 1 : 3);
  const birds = new Birds(rand, { w: W, y0: H * 0.12, y1: H * 0.35 }, [20, 36], '#1d3570');

  return {
    draw(g, t, dt) {
      g.drawImage(skyC, 0, 0);
      birds.update(dt);
      birds.draw(g);
      clouds.update(dt);
      clouds.draw(g);
      g.drawImage(hillsC, 0, 0);
      const s3 = Math.sin(t * 0.8);
      g.drawImage(sway[s3 < -0.35 ? 0 : s3 > 0.35 ? 2 : 1] as HTMLCanvasElement, 0, 0);
      flutter.update(dt);
      flutter.draw(g);
      hearts.update(dt);
      hearts.draw(g);
    },
    burst: (x, y) => hearts.burst(x, y),
    wish: () => false,
  };
}

/* ───────────────────────────── nightfall ──────────────────────────────── */

function nightfall(W: number, H: number, { lite }: SceneOptions): Scene {
  const rand = seeded(1106);
  const portrait = H > W * 1.15;
  const horizon = Math.round(H * (portrait ? 0.6 : 0.62));
  const sky = new Layer(W, H);
  const skyPal = palette(['#050820', '#0a0f2e', '#111744', '#1a1f58', '#242a6c', '#31307c', '#443888', '#5d418e', '#7c4d93'], 22);
  const band = fbm1(8);
  for (let y = 0; y < H; y++) {
    const t = Math.pow(Math.min(1, y / horizon), 1.15);
    for (let x = 0; x < W; x++) sky.set(x, y, dither(skyPal, t, x, y));
  }
  // the milky way, a soft diagonal band of dust
  const dust = rgba('#6a68b8');
  for (let y = 0; y < horizon; y++) {
    for (let x = 0; x < W; x++) {
      const along = (x / W) * 0.9 + (y / H) * 0.4;
      const centre = H * 0.08 + (x / W) * H * 0.32;
      const d = Math.abs(y - centre) / (H * 0.12);
      if (d >= 1) continue;
      const v = (1 - d) * band(along * 9) * 0.9;
      if (v * 0.8 > bayer(x, y) + 0.12) sky.blend(x, y, dust, 0.3);
    }
  }
  const moonX = Math.round(W * (portrait ? 0.74 : 0.78));
  const moonY = Math.round(H * 0.17);
  const moonR = Math.max(5, Math.round(Math.min(H * 0.06, W * 0.08)));
  halo(sky, moonX, moonY, moonR * 4, '#7f86d8', 0.8, horizon);
  halo(sky, moonX, moonY, moonR * 2, '#c9c6ff', 0.8, horizon);
  const moonPal = palette(['#fffbe6', '#fff1c4', '#e8d9a6'], 5);
  const craters = Array.from({ length: 5 }, () => [between(rand, -0.5, 0.5), between(rand, -0.5, 0.5), between(rand, 0.12, 0.24)] as const);
  sky.disc(moonX, moonY, moonR, (dx, dy, x, y) => {
    for (const [cx, cy, cr] of craters) if (Math.hypot(dx - cx, dy - cy) < cr) return pack('#e0cf98');
    return dither(moonPal, (dx + dy + 2) / 4, x, y);
  });

  const stars = new StarField(rand, W, 0, horizon * 0.92, Math.round((W * H) / (lite ? 1500 : 800)), ['#ffffff', '#fff2d0', '#cfe0ff', '#ffd6f0'], 1);
  // A heart-shaped constellation, faintly joined.
  const hc = heartPoints(W * (portrait ? 0.34 : 0.3), H * 0.25, Math.min(W, H) * 0.17, 12);
  const lineC = rgba('#b8a8ff');
  for (let i = 0; i < hc.length; i++) {
    const [ax, ay] = hc[i] as [number, number];
    const [bx, by] = hc[(i + 1) % hc.length] as [number, number];
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
    for (let k = 1; k < steps; k++) {
      if (k % 2 === 0) continue;
      sky.blend(Math.round(ax + ((bx - ax) * k) / steps), Math.round(ay + ((by - ay) * k) / steps), lineC, 0.28);
    }
  }
  stars.add(hc, '#fff4f8', rand);

  const land = new Layer(W, H);
  const farN = fbm1(3);
  const nearN = fbm1(19);
  const farPal = palette(['#2a2f6a', '#22275a', '#1c2050'], 4);
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const ft = Math.round(horizon - H * (0.04 + 0.08 * farN(u * 3)));
    for (let y = ft; y < horizon; y++) land.set(x, y, dither(farPal, (y - ft) / Math.max(1, horizon - ft), x, y));
  }
  const lakeRows = Math.round(H * 0.09);
  const water = new Water(sky, W, horizon, lakeRows, {
    tint: '#1c2364',
    deep: '#0c1036',
    glintX: moonX,
    glintHalf: moonR * 0.9,
    glint: '#f3efff',
    reflect: '#c9c6ff',
    streak: '#3a428c',
  });
  const ground = (x: number) => {
    const u = x / W;
    const dip = smooth(0.42, 0.62, u) * (1 - smooth(0.82, 0.98, u));
    return Math.round(horizon + 2 + dip * lakeRows + (nearN(u * 4) - 0.5) * H * 0.04);
  };
  const meadow = palette(['#1a2550', '#141d42', '#101736', '#0c122c', '#090e24'], 10);
  const rim = pack('#33447a');
  for (let x = 0; x < W; x++) {
    const g0 = ground(x);
    for (let y = g0; y < H; y++) {
      if (y === g0) land.set(x, y, rim);
      else land.set(x, y, dither(meadow, (y - g0) / Math.max(1, H - g0) + (nearN(x * 0.1 + y * 0.2) - 0.5) * 0.1, x, y));
    }
  }
  const nightTree: TreePalette = { dark: '#070a1c', mid: '#0b0f26', light: '#141c3c', rim: '#26345e', trunk: '#070a1c' };
  for (const [u, hgt] of [
    [0.04, 0.24],
    [0.09, 0.3],
    [0.14, 0.19],
    [0.88, 0.2],
    [0.93, 0.26],
  ] as const) {
    const x = Math.round(W * u);
    pine(land, x, ground(x) + Math.round(H * 0.03), Math.round(H * hgt), nightTree, u < 0.5 ? 1 : -1);
  }
  // a tiny cabin with a warm window
  const cabinX = Math.round(W * 0.27);
  const cabinY = ground(cabinX) + 1;
  const cw = Math.max(9, Math.round(W * 0.035));
  const ch = Math.round(cw * 0.65);
  land.rect(cabinX, cabinY - ch, cw, ch, pack('#0a0d22'));
  for (let k = 0; k <= Math.ceil(cw / 2); k++) land.rect(cabinX - 1 + k, cabinY - ch - k, cw + 2 - k * 2, 1, pack('#0d1130'));
  land.rect(cabinX + 2, cabinY - ch + 2, 2, 2, pack('#ffd36a'));
  land.rect(cabinX + cw - 4, cabinY - ch + 2, 2, 2, pack('#ffc24a'));
  halo(land, cabinX + cw / 2, cabinY - ch / 2, cw * 1.4, '#ffb24a', 0.35);
  flowers(land, rand, W, H, ground, Math.round((W * H) / (lite ? 260 : 160)), ['#6a7fd0', '#9aa8ff', '#d0c8ff', '#ff9fc4']);

  const skyC = sky.toCanvas();
  const landC = land.toCanvas();
  const sway = grassFrames(W, H, rand, H * 0.84, Math.round(W * (lite ? 0.5 : 0.9)), ['#0e1430', '#15204a', '#1f2c5c', '#2a3a70'], '#4a5a9a');
  const flies = new Fireflies(rand, { x0: 0, x1: W, y0: horizon + 4, y1: H * 0.97 }, lite ? 10 : 24);
  const hearts = new HeartRise(rand, { x0: W * 0.05, x1: W * 0.95, y0: H * 0.75, y1: H, top: H * 0.05 }, lite ? 0.35 : 0.6, [
    ['#ff8fb1', '#ffe0ea', '#d34d78'],
    ['#ffd1e0', '#ffffff', '#ff8fb1'],
    ['#c9a8ff', '#f3eaff', '#8f6ad8'],
  ]);
  const shots = new ShootingStars(rand, { w: W, top: 2, bottom: horizon * 0.8 }, [7, 16]);

  return {
    draw(g, t, dt) {
      g.drawImage(skyC, 0, 0);
      stars.draw(g, t);
      shots.update(dt);
      shots.draw(g);
      water.draw(g, t);
      g.drawImage(landC, 0, 0);
      const s3 = Math.sin(t * 0.7);
      g.drawImage(sway[s3 < -0.35 ? 0 : s3 > 0.35 ? 2 : 1] as HTMLCanvasElement, 0, 0);
      flies.update(dt);
      flies.draw(g, t);
      hearts.update(dt);
      hearts.draw(g);
    },
    burst: (x, y) => hearts.burst(x, y),
    wish: (x, y) => shots.hit(x, y),
  };
}

/* ───────────────────────────── sakura ─────────────────────────────────── */

interface Blossom {
  x: number;
  y: number;
  r: number;
}

/** A tapered limb, lit on its upper-right side. */
function limb(layer: Layer, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, dark: number, light: number): void {
  const len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const steps = Math.ceil(len * 1.6);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    const half = Math.max(0.5, (w0 + (w1 - w0) * t) / 2);
    for (let k = -Math.ceil(half); k <= Math.ceil(half); k++) {
      if (Math.abs(k) > half + 0.2) continue;
      layer.set(Math.round(cx + nx * k), Math.round(cy + ny * k), k > half * 0.25 && half >= 1 ? light : dark);
    }
  }
}

/** Recursive forking branches; every tip and fork collects blossoms. */
function grow(
  layer: Layer,
  rand: Rand,
  x: number,
  y: number,
  angle: number,
  len: number,
  width: number,
  depth: number,
  out: Blossom[],
  dark: number,
  light: number
): void {
  const a = angle + between(rand, -0.16, 0.16);
  const x1 = x + Math.cos(a) * len;
  const y1 = y + Math.sin(a) * len;
  limb(layer, x, y, x1, y1, width, Math.max(1, width * 0.62), dark, light);
  if (depth <= 1) out.push({ x: (x + x1) / 2, y: (y + y1) / 2, r: Math.max(2.5, len * 0.55) });
  if (depth === 0 || len < 4) {
    out.push({ x: x1, y: y1, r: Math.max(3, len * 0.8) });
    return;
  }
  const spread = between(rand, 0.32, 0.58);
  grow(layer, rand, x1, y1, a - spread, len * between(rand, 0.66, 0.8), width * 0.62, depth - 1, out, dark, light);
  grow(layer, rand, x1, y1, a + spread, len * between(rand, 0.66, 0.8), width * 0.62, depth - 1, out, dark, light);
  if (rand() < 0.3) grow(layer, rand, x1, y1, a + between(rand, -0.12, 0.12), len * 0.55, width * 0.5, depth - 1, out, dark, light);
}

/** Paint each blossom as a cluster of small shaded puffs (lit from the top right). */
function paintBlossoms(layer: Layer, rand: Rand, blossoms: readonly Blossom[]): void {
  const tones = [pack('#e0628f'), pack('#f57ea6'), pack('#ff9fbf'), pack('#ffbdd2'), pack('#ffe2ec')];
  const puffs: Blossom[] = [];
  for (const b of blossoms) {
    const count = 3 + Math.round(b.r / 2.2);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * b.r * 0.75;
      puffs.push({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d * 0.8, r: Math.max(1.6, b.r * between(rand, 0.3, 0.52)) });
    }
  }
  // Lower puffs first, so the sunlit tops overlap the shaded bellies.
  puffs.sort((p, q) => q.y - p.y);
  for (const p of puffs) {
    layer.disc(p.x, p.y, p.r, (dx, dy, x, y) => {
      const l = dx * 0.45 - dy * 0.85 + (bayer(x, y) - 0.5) * 0.6;
      return tones[l > 0.75 ? 4 : l > 0.25 ? 3 : l > -0.25 ? 2 : l > -0.7 ? 1 : 0] as number;
    });
  }
  // A few loose single petals and bright specks break up the outline.
  for (const p of puffs) {
    if (rand() < 0.5) layer.set(p.x + between(rand, -p.r, p.r) * 1.3, p.y - p.r - rand() * 2, tones[3] as number);
    if (rand() < 0.3) layer.set(p.x + between(rand, -p.r, p.r) * 0.6, p.y + between(rand, -p.r, p.r) * 0.6, pack('#ffffff'));
  }
}

function sakura(W: number, H: number, { lite }: SceneOptions): Scene {
  const rand = seeded(214);
  const portrait = H > W * 1.15;
  const horizon = Math.round(H * (portrait ? 0.64 : 0.68));
  const sky = new Layer(W, H);
  const skyPal = palette(['#94cdff', '#acd9ff', '#c6e5ff', '#dfeeff', '#ffe9f1', '#ffd8e4', '#ffcad7'], 20);
  for (let y = 0; y < H; y++) {
    const t = Math.min(1, y / horizon);
    for (let x = 0; x < W; x++) sky.set(x, y, dither(skyPal, t, x, y));
  }
  halo(sky, W * 0.82, H * 0.2, Math.min(W, H) * 0.25, '#fff6e6', 0.8);

  const clouds = new CloudDrift(rand, W, [
    { y0: H * 0.08, y1: H * 0.3, count: 4, width: [W * 0.12, W * 0.24], height: [4, 7], speed: [0.6, 1.3], style: { puffy: false, tones: ['#e9cfe4', '#f8e8f3', '#ffffff'] } },
  ]);

  const land = new Layer(W, H);
  // distant hills
  const hillN = fbm1(64);
  const distant = palette(['#c3cdee', '#b6c1e8'], 3);
  for (let x = 0; x < W; x++) {
    const top = Math.round(horizon - H * (0.03 + 0.04 * hillN(x * 0.012)));
    for (let y = top; y < horizon; y++) land.set(x, y, dither(distant, (y - top) / Math.max(1, horizon - top), x, y));
  }
  // the mountain with a snow cap
  const peakX = W * (portrait ? 0.6 : 0.64);
  const peakY = horizon - H * (portrait ? 0.24 : 0.36);
  const halfW = W * (portrait ? 0.48 : 0.34);
  const mtnPal = palette(['#a3aee2', '#96a2da', '#8796cf'], 6);
  const snow = pack('#ffffff');
  const snowShade = pack('#dfe5fb');
  for (let x = Math.floor(peakX - halfW); x <= Math.ceil(peakX + halfW); x++) {
    const d = Math.abs(x - peakX) / halfW;
    if (d > 1) continue;
    const top = Math.round(peakY + (horizon - peakY) * Math.pow(d, 0.72));
    const snowLine = peakY + (horizon - peakY) * 0.3 + Math.sin(x * 0.9) * 2 + (x % 5 === 0 ? 2 : 0);
    for (let y = top; y < horizon; y++) {
      if (y < snowLine) land.set(x, y, x < peakX - 1 ? snowShade : snow);
      else land.set(x, y, dither(mtnPal, (y - top) / Math.max(1, horizon - top) + (x < peakX ? 0.25 : 0), x, y));
    }
  }
  const ground = (x: number) => Math.round(horizon + Math.sin(x * 0.012 + 1) * H * 0.02 + Math.sin(x * 0.05) * 1.5);
  const meadow = palette(['#cdeea0', '#b7e28c', '#9dd27a', '#86c268', '#70b05a', '#5c9c4c'], 14);
  const tex = fbm1(9);
  for (let x = 0; x < W; x++) {
    const g0 = ground(x);
    for (let y = g0; y < H; y++) {
      const t = (y - g0) / Math.max(1, H - g0) + (tex(x * 0.08 + y * 0.25) - 0.5) * 0.12;
      land.set(x, y, y === g0 ? pack('#e2f7b8') : dither(meadow, t, x, y));
    }
  }
  flowers(land, rand, W, H, ground, Math.round((W * H) / (lite ? 110 : 65)), ['#ffb3c9', '#ffffff', '#ff8fb1', '#fff2a8', '#ffd1e0']);

  // the cherry tree: a curved trunk, forking branches and fluffy blossom puffs
  const unit = Math.min(W, H);
  const bark = pack('#4f3236');
  const barkLight = pack('#7a5258');
  const trunkTop = { x: W * (portrait ? 0.16 : 0.15), y: horizon - unit * 0.36 };
  const trunkMid = { x: W * 0.1, y: (H + trunkTop.y) / 2 };
  const trunkW = Math.max(3, unit * 0.045);
  limb(land, W * 0.13, H + 2, trunkMid.x, trunkMid.y, trunkW * 1.15, trunkW, bark, barkLight);
  limb(land, trunkMid.x, trunkMid.y, trunkTop.x, trunkTop.y, trunkW, trunkW * 0.8, bark, barkLight);
  const blossoms: Blossom[] = [];
  const reach = unit * 0.15;
  for (const angle of [-Math.PI / 2 - 0.95, -Math.PI / 2 - 0.15, -Math.PI / 2 + 0.7]) {
    grow(land, rand, trunkTop.x, trunkTop.y, angle, reach, trunkW * 0.7, 3, blossoms, bark, barkLight);
  }
  // a branch reaching in from the top-right corner
  grow(land, rand, W + 3, H * 0.03, Math.PI - 0.38, unit * 0.12, Math.max(2, trunkW * 0.45), 2, blossoms, bark, barkLight);
  paintBlossoms(land, rand, blossoms);

  const skyC = sky.toCanvas();
  const landC = land.toCanvas();
  const sway = grassFrames(W, H, rand, H * 0.86, Math.round(W * (lite ? 0.4 : 0.7)), ['#5c9c4c', '#70b05a', '#86c268', '#b7e28c'], '#e2f7b8');
  const petals = new Petals(rand, { w: W, h: H, x0: -W * 0.1, x1: W * 0.85 }, lite ? 22 : 46);
  const flutter = new Butterflies(rand, { x0: W * 0.25, x1: W * 0.9, y0: H * 0.6, y1: H * 0.88 }, lite ? 1 : 2, ['#fff1a8', '#ffffff', '#a8d8ff']);
  const hearts = new HeartRise(rand, { x0: W * 0.05, x1: W * 0.95, y0: H * 0.75, y1: H, top: H * 0.1 }, lite ? 0.3 : 0.55);

  return {
    draw(g, t, dt) {
      g.drawImage(skyC, 0, 0);
      clouds.update(dt);
      clouds.draw(g);
      g.drawImage(landC, 0, 0);
      const s3 = Math.sin(t * 0.85);
      g.drawImage(sway[s3 < -0.35 ? 0 : s3 > 0.35 ? 2 : 1] as HTMLCanvasElement, 0, 0);
      flutter.update(dt);
      flutter.draw(g);
      hearts.update(dt);
      hearts.draw(g);
      petals.update(dt);
      petals.draw(g);
    },
    burst: (x, y) => hearts.burst(x, y),
    wish: () => false,
  };
}

/* ───────────────────────────── registry ───────────────────────────────── */

const BUILDERS: Record<WallpaperId, (w: number, h: number, o: SceneOptions) => Scene> = {
  sunset,
  bliss,
  nightfall,
  sakura,
};

export function buildScene(id: WallpaperId, w: number, h: number, opts: SceneOptions): Scene {
  return (BUILDERS[id] ?? sunset)(w, h, opts);
}

/** Paint one still frame of a scene into a canvas (Control Panel previews). */
export function paintStill(id: WallpaperId, canvas: HTMLCanvasElement, seconds = 24): void {
  const g = ctx2d(canvas);
  const scene = buildScene(id, canvas.width, canvas.height, { lite: true });
  // Step the simulation so clouds and hearts are mid-flight.
  for (let t = 0; t < seconds; t += 0.5) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    scene.draw(g, t, 0.5);
  }
}

