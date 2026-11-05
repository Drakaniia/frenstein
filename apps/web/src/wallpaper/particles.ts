/**
 * Animated wallpaper elements. Every system is tiny: it updates a handful of
 * floats per frame and paints pre-rendered sprites at whole art pixels.
 */

import { rgba, type Color } from '@/lib/raster';
import { between, clamp, ctx2d, glowSprite, heartSprite, makeCanvas, pickOne, type Rand } from './paint';

type G = CanvasRenderingContext2D;

const css = (c: Color, a = 1): string => {
  const [r, g, b] = rgba(c);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

/* ───────────────────────────── stars ──────────────────────────────────── */

interface Star {
  x: number;
  y: number;
  phase: number;
  speed: number;
  kind: 0 | 1 | 2;
  color: string;
  base: number;
}

export class StarField {
  private stars: Star[] = [];

  constructor(rand: Rand, w: number, top: number, bottom: number, count: number, colors: readonly Color[], brightness = 1) {
    for (let i = 0; i < count; i++) {
      const y = between(rand, top, bottom);
      // Fewer, fainter stars toward the horizon.
      const depth = (y - top) / Math.max(1, bottom - top);
      if (rand() < depth * 0.6) continue;
      const r = rand();
      this.stars.push({
        x: Math.floor(rand() * w),
        y: Math.floor(y),
        phase: rand() * Math.PI * 2,
        speed: between(rand, 0.6, 2.4),
        kind: r > 0.97 ? 2 : r > 0.82 ? 1 : 0,
        color: css(pickOne(rand, colors)),
        base: clamp((1 - depth * 0.7) * brightness, 0.15, 1),
      });
    }
  }

  /** Add hand-placed stars (constellations). */
  add(points: ReadonlyArray<readonly [number, number]>, color: Color, rand: Rand): void {
    for (const [x, y] of points) {
      this.stars.push({ x: Math.round(x), y: Math.round(y), phase: rand() * 6, speed: 1.1, kind: 1, color: css(color), base: 1 });
    }
  }

  draw(g: G, t: number): void {
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
      const a = clamp(s.base * (0.35 + 0.65 * tw), 0, 1);
      g.globalAlpha = a;
      g.fillStyle = s.color;
      g.fillRect(s.x, s.y, 1, 1);
      if (s.kind >= 1 && tw > 0.55) {
        g.globalAlpha = a * 0.45;
        g.fillRect(s.x - 1, s.y, 1, 1);
        g.fillRect(s.x + 1, s.y, 1, 1);
        g.fillRect(s.x, s.y - 1, 1, 1);
        g.fillRect(s.x, s.y + 1, 1, 1);
      }
      if (s.kind === 2 && tw > 0.8) {
        g.globalAlpha = a * 0.3;
        g.fillRect(s.x - 2, s.y, 1, 1);
        g.fillRect(s.x + 2, s.y, 1, 1);
        g.fillRect(s.x, s.y - 2, 1, 1);
        g.fillRect(s.x, s.y + 2, 1, 1);
      }
    }
    g.globalAlpha = 1;
  }
}

/* ───────────────────────────── clouds ─────────────────────────────────── */

export interface CloudStyle {
  /** Shadow → base → light. */
  tones: readonly [Color, Color, Color];
  /** Flat streaky sunset clouds vs puffy cumulus. */
  puffy: boolean;
}

/** Draw one pixel cloud sprite. */
export function cloudSprite(rand: Rand, w: number, h: number, style: CloudStyle): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const g = ctx2d(c);
  const mask: boolean[][] = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const blobs = style.puffy ? Math.max(3, Math.round(w / 9)) : Math.max(2, Math.round(w / 14));
  for (let b = 0; b < blobs; b++) {
    const cx = between(rand, w * 0.15, w * 0.85);
    const ry = style.puffy ? between(rand, h * 0.3, h * 0.5) : between(rand, h * 0.25, h * 0.45);
    const rx = style.puffy ? ry * between(rand, 1.1, 1.6) : between(rand, w * 0.18, w * 0.32);
    const cy = style.puffy ? h - ry - 1 - rand() * h * 0.15 : between(rand, h * 0.35, h * 0.65);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) (mask[y] as boolean[])[x] = true;
      }
    }
  }
  const floor = Math.round(h * 0.82);
  if (style.puffy) {
    // Flat cumulus bottoms.
    for (let y = floor + 1; y < h; y++) (mask[y] as boolean[]).fill(false);
  }
  const on = (x: number, y: number) => mask[y]?.[x] === true;
  const [shadow, base, light] = style.tones.map((t) => css(t)) as [string, string, string];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      const topEdge = !on(x, y - 1);
      const bottomEdge = !on(x, y + 1);
      let fill = base;
      if (style.puffy) {
        // Lit from above: bright crowns, a shaded flat belly.
        if (topEdge || !on(x, y - 2)) fill = light;
        else if (bottomEdge || y >= floor - 1) fill = shadow;
      } else {
        // Sunset streaks are lit from below by the low sun.
        if (bottomEdge) fill = light;
        else if (topEdge) fill = shadow;
      }
      g.fillStyle = fill;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

interface Cloud {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  speed: number;
}

export class CloudDrift {
  private clouds: Cloud[] = [];
  private readonly w: number;

  constructor(rand: Rand, w: number, bands: ReadonlyArray<{ y0: number; y1: number; count: number; width: [number, number]; height: [number, number]; speed: [number, number]; style: CloudStyle }>) {
    this.w = w;
    for (const band of bands) {
      for (let i = 0; i < band.count; i++) {
        const cw = Math.round(between(rand, band.width[0], band.width[1]));
        const ch = Math.round(between(rand, band.height[0], band.height[1]));
        this.clouds.push({
          sprite: cloudSprite(rand, cw, ch, band.style),
          x: between(rand, -cw, w),
          y: Math.round(between(rand, band.y0, band.y1)),
          speed: between(rand, band.speed[0], band.speed[1]),
        });
      }
    }
    this.clouds.sort((a, b) => a.speed - b.speed);
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > this.w + 2) c.x = -c.sprite.width - 2;
    }
  }

  draw(g: G): void {
    for (const c of this.clouds) g.drawImage(c.sprite, Math.round(c.x), c.y);
  }
}

/* ───────────────────────────── hearts ─────────────────────────────────── */

interface Heart {
  x: number;
  y: number;
  vy: number;
  vx: number;
  sway: number;
  phase: number;
  sprite: HTMLCanvasElement;
  life: number;
  max: number;
  spin: number;
}

export class HeartRise {
  private hearts: Heart[] = [];
  private sprites: HTMLCanvasElement[];
  private acc = 0;
  private readonly rand: Rand;

  constructor(
    rand: Rand,
    private readonly area: { x0: number; x1: number; y0: number; y1: number; top: number },
    private readonly rate: number,
    colors: ReadonlyArray<readonly [Color, Color, Color]> = [
      ['#ff5d85', '#ffd0dc', '#d3204a'],
      ['#ff8fb1', '#ffe6ee', '#e0507a'],
      ['#ffffff', '#ffffff', '#ffc2d4'],
      ['#e23b4e', '#ffb3c0', '#a81a35'],
    ]
  ) {
    this.rand = rand;
    this.sprites = [];
    for (const size of [5, 7, 9]) for (const [fill, light, rim] of colors) this.sprites.push(heartSprite(size, fill, light, rim));
    // Start mid-flight so the wallpaper never looks empty.
    const initial = Math.round(rate * 6);
    for (let i = 0; i < initial; i++) this.spawn(true);
  }

  private spawn(anywhere = false, at?: { x: number; y: number; vx: number; vy: number }): void {
    const r = this.rand;
    const max = between(r, 7, 12);
    const y = at ? at.y : anywhere ? between(r, this.area.top, this.area.y1) : between(r, this.area.y0, this.area.y1);
    this.hearts.push({
      x: at ? at.x : between(r, this.area.x0, this.area.x1),
      y,
      vy: at ? at.vy : -between(r, 3, 8),
      vx: at ? at.vx : between(r, -0.6, 0.6),
      sway: between(r, 0.6, 2.2),
      phase: r() * Math.PI * 2,
      sprite: pickOne(r, at ? this.sprites.slice(0, 8) : this.sprites),
      life: anywhere ? between(r, 0, max * 0.7) : 0,
      max,
      spin: between(r, 0.8, 1.6),
    });
  }

  /** A little burst of hearts at a point (clicks on the wallpaper). */
  burst(x: number, y: number, count = 7): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rand();
      this.spawn(false, { x, y, vx: Math.cos(a) * between(this.rand, 6, 14), vy: Math.sin(a) * between(this.rand, 4, 10) - 8 });
      const h = this.hearts[this.hearts.length - 1] as Heart;
      h.max = between(this.rand, 1.4, 2.4);
      h.sway = 0;
    }
  }

  update(dt: number): void {
    this.acc += dt * this.rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (this.hearts.length < 60) this.spawn();
    }
    for (const h of this.hearts) {
      h.life += dt;
      h.y += h.vy * dt;
      h.x += (h.vx + Math.sin(h.life * h.spin + h.phase) * h.sway) * dt;
      if (h.sway === 0) {
        h.vx *= 1 - Math.min(1, dt * 2.5);
        h.vy = h.vy * (1 - Math.min(1, dt * 2)) - 4 * dt;
      }
    }
    this.hearts = this.hearts.filter((h) => h.life < h.max && h.y > this.area.top - 12);
  }

  draw(g: G): void {
    for (const h of this.hearts) {
      const fadeIn = clamp(h.life / 1.2, 0, 1);
      const fadeOut = clamp((h.max - h.life) / 2, 0, 1);
      const nearTop = clamp((h.y - this.area.top) / 30, 0, 1);
      g.globalAlpha = fadeIn * fadeOut * nearTop * 0.92;
      g.drawImage(h.sprite, Math.round(h.x), Math.round(h.y));
    }
    g.globalAlpha = 1;
  }
}

/* ───────────────────────────── fireflies ──────────────────────────────── */

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

export class Fireflies {
  private flies: Fly[] = [];
  private glow: HTMLCanvasElement;

  constructor(
    private readonly rand: Rand,
    private readonly area: { x0: number; x1: number; y0: number; y1: number },
    count: number,
    core: Color = '#fff7b0',
    halo: Color = '#d8ff70'
  ) {
    this.glow = glowSprite(2, core, halo);
    for (let i = 0; i < count; i++) {
      this.flies.push({
        x: between(rand, area.x0, area.x1),
        y: between(rand, area.y0, area.y1),
        vx: between(rand, -3, 3),
        vy: between(rand, -2, 2),
        phase: rand() * Math.PI * 2,
        speed: between(rand, 0.6, 1.6),
      });
    }
  }

  update(dt: number): void {
    const a = this.area;
    for (const f of this.flies) {
      f.vx += between(this.rand, -6, 6) * dt;
      f.vy += between(this.rand, -5, 5) * dt;
      f.vx = clamp(f.vx, -4, 4);
      f.vy = clamp(f.vy, -3, 3);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < a.x0 || f.x > a.x1) f.vx *= -1;
      if (f.y < a.y0 || f.y > a.y1) f.vy *= -1;
      f.x = clamp(f.x, a.x0, a.x1);
      f.y = clamp(f.y, a.y0, a.y1);
    }
  }

  draw(g: G, t: number): void {
    for (const f of this.flies) {
      const pulse = 0.5 + 0.5 * Math.sin(t * f.speed * 2.2 + f.phase);
      if (pulse < 0.15) continue;
      g.globalAlpha = pulse;
      g.drawImage(this.glow, Math.round(f.x) - 2, Math.round(f.y) - 2);
    }
    g.globalAlpha = 1;
  }
}

/* ─────────────────────────── shooting stars ───────────────────────────── */

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export class ShootingStars {
  private shot: Shot | null = null;
  private wait: number;

  constructor(
    private readonly rand: Rand,
    private readonly area: { w: number; top: number; bottom: number },
    private readonly every: [number, number],
    private readonly color: Color = '#fff6d0'
  ) {
    this.wait = between(rand, every[0] * 0.3, every[1] * 0.6);
  }

  update(dt: number): void {
    if (!this.shot) {
      this.wait -= dt;
      if (this.wait <= 0) {
        const speed = between(this.rand, 90, 140);
        const angle = between(this.rand, 0.25, 0.5);
        const dir = this.rand() < 0.65 ? 1 : -1;
        this.shot = {
          x: dir > 0 ? between(this.rand, 0, this.area.w * 0.6) : between(this.rand, this.area.w * 0.4, this.area.w),
          y: between(this.rand, this.area.top, this.area.bottom * 0.6),
          vx: Math.cos(angle) * speed * dir,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: between(this.rand, 0.8, 1.3),
        };
      }
      return;
    }
    const s = this.shot;
    s.life += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life > s.max || s.y > this.area.bottom) {
      this.shot = null;
      this.wait = between(this.rand, this.every[0], this.every[1]);
    }
  }

  /** Is (x, y) close to the head of a visible shooting star? */
  hit(x: number, y: number): boolean {
    const s = this.shot;
    if (!s) return false;
    const tail = 14;
    for (let k = 0; k <= tail; k += 2) {
      const px = s.x - (s.vx / 120) * k;
      const py = s.y - (s.vy / 120) * k;
      if (Math.hypot(px - x, py - y) < 10) return true;
    }
    return false;
  }

  draw(g: G): void {
    const s = this.shot;
    if (!s) return;
    const fade = clamp(1 - s.life / s.max, 0, 1) * clamp(s.life * 6, 0, 1);
    const len = 16;
    for (let k = 0; k < len; k++) {
      const px = Math.round(s.x - (s.vx / 120) * k);
      const py = Math.round(s.y - (s.vy / 120) * k);
      g.globalAlpha = fade * (1 - k / len) * (k === 0 ? 1 : 0.8);
      g.fillStyle = k < 2 ? '#ffffff' : css(this.color);
      g.fillRect(px, py, 1, 1);
      if (k === 0) {
        g.globalAlpha = fade * 0.5;
        g.fillRect(px - 1, py, 1, 1);
        g.fillRect(px, py - 1, 1, 1);
        g.fillRect(px + 1, py, 1, 1);
        g.fillRect(px, py + 1, 1, 1);
      }
    }
    g.globalAlpha = 1;
  }
}

/* ───────────────────────────── birds ──────────────────────────────────── */

interface Bird {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

export class Birds {
  private flock: Bird[] = [];
  private wait: number;

  constructor(
    private readonly rand: Rand,
    private readonly area: { w: number; y0: number; y1: number },
    private readonly every: [number, number],
    private readonly color: Color = '#2b1d3a'
  ) {
    this.wait = between(rand, 2, every[0]);
  }

  update(dt: number): void {
    if (this.flock.length === 0) {
      this.wait -= dt;
      if (this.wait <= 0) {
        const n = 2 + Math.floor(this.rand() * 4);
        const dir = this.rand() < 0.5 ? 1 : -1;
        const y = between(this.rand, this.area.y0, this.area.y1);
        const speed = between(this.rand, 10, 18) * dir;
        for (let i = 0; i < n; i++) {
          this.flock.push({
            x: (dir > 0 ? -8 : this.area.w + 8) - i * 7 * dir + between(this.rand, -2, 2),
            y: y + i * 3 * (i % 2 ? 1 : -1) + between(this.rand, -1, 1),
            vx: speed * between(this.rand, 0.95, 1.05),
            phase: this.rand() * 6,
          });
        }
      }
      return;
    }
    for (const b of this.flock) {
      b.x += b.vx * dt;
      b.phase += dt * 7;
      b.y += Math.sin(b.phase * 0.25) * dt * 1.5;
    }
    if (this.flock.every((b) => b.x < -20 || b.x > this.area.w + 20)) {
      this.flock = [];
      this.wait = between(this.rand, this.every[0], this.every[1]);
    }
  }

  draw(g: G): void {
    g.fillStyle = css(this.color);
    for (const b of this.flock) {
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const up = Math.sin(b.phase) > 0;
      g.fillRect(x, y, 1, 1);
      if (up) {
        g.fillRect(x - 1, y - 1, 1, 1);
        g.fillRect(x + 1, y - 1, 1, 1);
        g.fillRect(x - 2, y - 1, 1, 1);
        g.fillRect(x + 2, y - 1, 1, 1);
      } else {
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x - 2, y + 1, 1, 1);
        g.fillRect(x + 2, y + 1, 1, 1);
      }
    }
  }
}

/* ───────────────────────────── petals ─────────────────────────────────── */

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  color: string;
}

export class Petals {
  private petals: Petal[] = [];

  constructor(
    private readonly rand: Rand,
    private readonly area: { w: number; h: number; x0: number; x1: number },
    count: number,
    private readonly colors: readonly Color[] = ['#ffc1d4', '#ff9fbf', '#ffe2ec', '#ffb0c8']
  ) {
    for (let i = 0; i < count; i++) this.petals.push(this.make(true));
  }

  private make(anywhere: boolean): Petal {
    const r = this.rand;
    return {
      x: between(r, this.area.x0, this.area.x1),
      y: anywhere ? between(r, -10, this.area.h) : between(r, -16, -4),
      vx: between(r, 4, 11),
      vy: between(r, 5, 11),
      phase: r() * Math.PI * 2,
      color: css(pickOne(r, this.colors)),
    };
  }

  update(dt: number): void {
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i] as Petal;
      p.phase += dt * 2.2;
      p.x += (p.vx + Math.sin(p.phase) * 6) * dt;
      p.y += p.vy * dt;
      if (p.y > this.area.h + 4 || p.x > this.area.w + 6) this.petals[i] = this.make(false);
    }
  }

  draw(g: G): void {
    for (const p of this.petals) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const f = Math.floor(((p.phase % (Math.PI * 2)) / (Math.PI * 2)) * 4);
      g.fillStyle = p.color;
      if (f === 0) g.fillRect(x, y, 2, 1);
      else if (f === 1) {
        g.fillRect(x, y, 1, 1);
        g.fillRect(x + 1, y + 1, 1, 1);
      } else if (f === 2) g.fillRect(x, y, 1, 2);
      else {
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x, y + 1, 1, 1);
      }
    }
  }
}

/* ───────────────────────────── butterflies ────────────────────────────── */

interface Butterfly {
  x: number;
  y: number;
  tx: number;
  ty: number;
  phase: number;
  wing: string;
  body: string;
}

export class Butterflies {
  private list: Butterfly[] = [];

  constructor(
    private readonly rand: Rand,
    private readonly area: { x0: number; x1: number; y0: number; y1: number },
    count: number,
    colors: readonly Color[] = ['#ffb3d1', '#fff1a8', '#a8d8ff']
  ) {
    for (let i = 0; i < count; i++) {
      const x = between(rand, area.x0, area.x1);
      const y = between(rand, area.y0, area.y1);
      this.list.push({ x, y, tx: x, ty: y, phase: rand() * 6, wing: css(pickOne(rand, colors)), body: '#3a2a3a' });
    }
  }

  update(dt: number): void {
    for (const b of this.list) {
      b.phase += dt * 14;
      if (Math.hypot(b.tx - b.x, b.ty - b.y) < 2) {
        b.tx = between(this.rand, this.area.x0, this.area.x1);
        b.ty = between(this.rand, this.area.y0, this.area.y1);
      }
      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      b.x += (dx / d) * 9 * dt;
      b.y += ((dy / d) * 7 + Math.sin(b.phase * 0.3) * 4) * dt;
    }
  }

  draw(g: G): void {
    for (const b of this.list) {
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const open = Math.sin(b.phase) > 0;
      g.fillStyle = b.wing;
      if (open) {
        g.fillRect(x - 2, y - 1, 2, 2);
        g.fillRect(x + 1, y - 1, 2, 2);
      } else {
        g.fillRect(x - 1, y - 1, 1, 2);
        g.fillRect(x + 1, y - 1, 1, 2);
      }
      g.fillStyle = b.body;
      g.fillRect(x, y - 1, 1, 2);
    }
  }
}
