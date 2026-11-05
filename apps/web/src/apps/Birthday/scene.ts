/**
 * The birthday party scene: a pixel-art room with bunting, a two-tier cake
 * with candles, floating balloons, confetti and candle smoke. Static parts
 * are painted once per size; the loop only draws flames, balloons and
 * particles.
 */

import { mix, Raster, withAlpha } from '@/lib/raster';
import { between, dither, glowSprite, Layer, pack, palette, pickOne, seeded, type Rand } from '@/wallpaper/paint';

type G = CanvasRenderingContext2D;

const DIGITS: Record<string, readonly string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

const BALLOON_COLORS = ['#ff5d85', '#ffd23f', '#5ec4ff', '#9be15d', '#c9a8ff', '#ff9a3c'];
const CONFETTI = ['#ff5d85', '#ffd23f', '#5ec4ff', '#9be15d', '#c9a8ff', '#ffffff', '#ff9a3c'];

interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  phase: number;
}

interface Balloon {
  x: number;
  y: number;
  homeY: number;
  sprite: HTMLCanvasElement;
  color: string;
  phase: number;
  popped: boolean;
  respawn: number;
}

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  kind: 'confetti' | 'smoke' | 'pop';
  spin: number;
}

function balloonSprite(color: string): HTMLCanvasElement {
  const r = new Raster(13, 30);
  r.ellipse(6.5, 7.5, 6, 7.4, (dx, dy) => ((dx + dy) * 0.5 > 0.35 ? mix(color, '#000000', 0.22) : color));
  r.ellipse(4.2, 4.6, 1.6, 2.2, withAlpha('#ffffff', 0.75));
  r.rect(5, 15, 3, 1, color);
  r.px(6, 16, color);
  for (let y = 17; y < 30; y++) r.px(6 + Math.round(Math.sin(y * 0.6) * 1), y, '#f4f0ff');
  r.outline(withAlpha('#2a0d18', 0.55));
  return r.toCanvas();
}

export class PartyScene {
  readonly w: number;
  readonly h: number;
  private readonly backdrop: HTMLCanvasElement;
  private readonly glow: HTMLCanvasElement;
  private readonly rand: Rand;
  private readonly lights: Array<{ x: number; y: number; color: string; phase: number }> = [];
  readonly candles: Candle[] = [];
  private readonly balloons: Balloon[] = [];
  private bits: Bit[] = [];

  constructor(w: number, h: number, age: number) {
    this.w = w;
    this.h = h;
    this.rand = seeded(1106 + w * 7 + h);
    this.glow = glowSprite(4, '#fff6c0', '#ffb84a');
    const layer = new Layer(w, h);
    const tableY = Math.round(h * 0.74);

    // the wall, with a soft spotlight behind the cake
    const wall = palette(['#2a1b4f', '#45266a', '#6b3283', '#93408f', '#b9508f'], 14);
    for (let y = 0; y < tableY; y++) {
      for (let x = 0; x < w; x++) {
        const spot = Math.max(0, 1 - Math.hypot((x - w / 2) / (w * 0.45), (y - tableY) / (h * 0.75)));
        const stripe = (x + y) % 14 < 7 ? 0.03 : 0;
        layer.set(x, y, dither(wall, (y / tableY) * 0.55 + spot * 0.45 + stripe, x, y));
      }
    }

    // bunting with fairy lights
    const sag = Math.max(4, h * 0.06);
    const curve = (x: number) => 4 + sag * Math.sin((Math.PI * x) / w);
    const string = pack('#f6e7ff');
    for (let x = 0; x < w; x++) layer.set(x, Math.round(curve(x)), string);
    const flagColors = ['#ff6b8a', '#ffd23f', '#7fd4ff', '#9be15d', '#c9a8ff'];
    for (let fx = 4, i = 0; fx < w - 8; fx += 14, i++) {
      const top = Math.round(curve(fx + 4));
      const c = pack(flagColors[i % flagColors.length] as string);
      for (let j = 0; j < 9; j++) {
        const half = Math.round((1 - j / 9) * 4);
        for (let k = -half; k <= half; k++) layer.set(fx + 4 + k, top + 1 + j, c);
      }
      this.lights.push({ x: fx + 11, y: Math.round(curve(fx + 11)) + 1, color: pickOne(this.rand, ['#fff3b0', '#ffd1e0', '#bfe8ff']), phase: this.rand() * 6 });
    }

    // the table and its cloth
    const cloth = palette(['#ffd6e6', '#f9b2cd', '#e98fb3'], 6);
    for (let y = tableY; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dot = (x % 10 === 3 && y % 8 === 3) || (x % 10 === 8 && y % 8 === 7);
        layer.set(x, y, dot ? pack('#ffffff') : dither(cloth, (y - tableY) / Math.max(1, h - tableY), x, y));
      }
    }
    for (let x = 0; x < w; x++) layer.set(x, tableY, pack('#fff1f7'));

    // the cake
    const cx = Math.round(w / 2);
    const scale = Math.max(0.7, Math.min(1.3, h / 150));
    const bw = Math.round(Math.min(w * 0.5, 72 * scale));
    const bh = Math.round(22 * scale);
    const tw = Math.round(bw * 0.64);
    const th = Math.round(15 * scale);
    const plate = pack('#f4f7ff');
    layer.ellipse(cx, tableY + 1, bw / 2 + 7, 4, (_dx, dy) => (dy < 0 ? plate : pack('#c9d2ea')));
    const bottom = tableY - 1;
    const tier = (x0: number, y0: number, tw0: number, th0: number, body: string[], frost: string, sprinkle: boolean) => {
      const bodyPal = palette(body, 6);
      for (let y = y0; y < y0 + th0; y++) {
        for (let x = x0; x < x0 + tw0; x++) {
          const edge = x === x0 || x === x0 + tw0 - 1;
          layer.set(x, y, edge ? pack(body[body.length - 1] as string) : dither(bodyPal, (x - x0) / tw0 * 0.6 + (y - y0) / th0 * 0.4, x, y));
        }
      }
      const f = pack(frost);
      const r = seeded(x0 * 31 + y0);
      for (let x = x0; x < x0 + tw0; x++) {
        const drip = x % 6 === 2 ? 3 + Math.floor(r() * 3) : x % 6 === 3 ? 2 : 1;
        for (let k = 0; k < drip + 1; k++) layer.set(x, y0 + k, f);
        if (sprinkle && r() < 0.18) {
          const sy = y0 + 4 + Math.floor(r() * (th0 - 6));
          layer.set(x, sy, pack(pickOne(r, ['#5ec4ff', '#ffd23f', '#9be15d', '#ffffff', '#c9a8ff'])));
        }
      }
      for (let x = x0 - 1; x <= x0 + tw0; x++) layer.set(x, y0 - 1, f);
    };
    tier(cx - Math.round(bw / 2), bottom - bh, bw, bh, ['#ffb3c9', '#f490b0', '#e46f97'], '#fff4f8', true);
    tier(cx - Math.round(tw / 2), bottom - bh - th, tw, th, ['#fff7ec', '#ffe6cc', '#f6cfa6'], '#ffe2ee', true);
    // piped hearts on the bottom tier
    for (const offset of [-0.32, 0, 0.32]) {
      const hx = Math.round(cx + offset * bw) - 2;
      const hy = bottom - Math.round(bh * 0.55);
      [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([dx, dy]) => layer.set(hx + (dx as number), hy + (dy as number), pack('#e8335d')));
    }

    // candles: the age as two number candles, with a thin candle each side
    const topY = bottom - bh - th - 1;
    const digits = String(Math.max(0, Math.round(age))).slice(0, 2).split('');
    const digitW = 6;
    const gap = 3;
    const totalW = digits.length * digitW + (digits.length - 1) * gap;
    let x = cx - Math.round(totalW / 2);
    const waxColors = ['#7fd4ff', '#ff8fb1'];
    digits.forEach((d, i) => {
      const rows = DIGITS[d] ?? DIGITS['0'];
      const wax = pack(waxColors[i % 2] as string);
      const shade = pack(i % 2 ? '#d9547f' : '#3d9be0');
      (rows as readonly string[]).forEach((row, ry) =>
        [...row].forEach((ch, rx) => {
          if (ch !== '#') return;
          for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) layer.set(x + rx * 2 + sx, topY - 10 + ry * 2 + sy, sx === 1 && rx === 2 ? shade : wax);
        })
      );
      layer.set(x + 2, topY - 11, pack('#3a2a1e'));
      layer.set(x + 3, topY - 11, pack('#3a2a1e'));
      this.candles.push({ x: x + 2, y: topY - 11, w: 2, h: 11, lit: true, phase: this.rand() * 6 });
      x += digitW + gap;
    });
    for (const side of [-1, 1]) {
      const sx = cx + side * Math.round(tw * 0.36) - (side > 0 ? 1 : 0);
      for (let y = topY - 9; y < topY; y++) {
        layer.set(sx, y, pack((y + sx) % 3 === 0 ? '#ffffff' : '#ffd23f'));
        layer.set(sx + 1, y, pack((y + sx) % 3 === 1 ? '#ffffff' : '#f2a50c'));
      }
      layer.set(sx, topY - 10, pack('#3a2a1e'));
      this.candles.push({ x: sx, y: topY - 10, w: 2, h: 10, lit: true, phase: this.rand() * 6 });
    }

    // a present on the table
    const gx = Math.round(w * 0.12);
    const gw = Math.max(12, Math.round(16 * scale));
    const gy = tableY - gw + 2;
    for (let yy = gy; yy < tableY + 2; yy++) {
      for (let xx = gx; xx < gx + gw; xx++) {
        const ribbon = Math.abs(xx - (gx + gw / 2)) < 1.5 || Math.abs(yy - (gy + gw / 2)) < 1.5;
        layer.set(xx, yy, pack(ribbon ? '#ffd23f' : (xx + yy) % 2 === 0 ? '#5ec4ff' : '#4ab1ee'));
      }
    }
    layer.disc(gx + gw / 2 - 3, gy - 1, 2.5, () => pack('#ffd23f'));
    layer.disc(gx + gw / 2 + 3, gy - 1, 2.5, () => pack('#ffd23f'));

    this.backdrop = layer.toCanvas();

    const count = w > 260 ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length] as string;
      const side = i % 2 === 0 ? -1 : 1;
      const bx = side < 0 ? between(this.rand, 6, w * 0.3) : between(this.rand, w * 0.68, w - 18);
      const homeY = between(this.rand, h * 0.14, h * 0.42);
      this.balloons.push({ x: bx, y: homeY, homeY, sprite: balloonSprite(color), color, phase: this.rand() * 6, popped: false, respawn: 0 });
    }
  }

  get litCount(): number {
    return this.candles.filter((c) => c.lit).length;
  }

  blow(candle: Candle): void {
    if (!candle.lit) return;
    candle.lit = false;
    for (let i = 0; i < 6; i++) {
      this.bits.push({ x: candle.x + 1, y: candle.y - 2, vx: between(this.rand, -3, 3), vy: -between(this.rand, 6, 14), life: between(this.rand, 1, 1.8), color: '#d8d0e4', kind: 'smoke', spin: 0 });
    }
  }

  relight(): void {
    for (const c of this.candles) c.lit = true;
  }

  /** Candle under an art-space point, if any. */
  candleAt(x: number, y: number): Candle | null {
    return this.candles.find((c) => c.lit && x >= c.x - 3 && x <= c.x + c.w + 3 && y >= c.y - 8 && y <= c.y + c.h) ?? null;
  }

  /** Pops the balloon under a point; returns true when one popped. */
  pop(x: number, y: number): boolean {
    for (const b of this.balloons) {
      if (b.popped) continue;
      if (Math.hypot(x - (b.x + 6.5), y - (b.y + 7.5)) < 8) {
        b.popped = true;
        b.respawn = between(this.rand, 4, 7);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.bits.push({ x: b.x + 6, y: b.y + 7, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.45, color: b.color, kind: 'pop', spin: 0 });
        }
        return true;
      }
    }
    return false;
  }

  confetti(count = 140): void {
    for (let i = 0; i < count; i++) {
      this.bits.push({
        x: between(this.rand, 0, this.w),
        y: between(this.rand, -this.h * 0.6, -2),
        vx: between(this.rand, -6, 6),
        vy: between(this.rand, 14, 34),
        life: 9,
        color: pickOne(this.rand, CONFETTI),
        kind: 'confetti',
        spin: this.rand() * 6,
      });
    }
  }

  draw(g: G, t: number, dt: number): void {
    g.drawImage(this.backdrop, 0, 0);

    for (const l of this.lights) {
      const on = Math.sin(t * 2.2 + l.phase) > -0.2;
      g.fillStyle = on ? l.color : '#6b4a7a';
      g.fillRect(l.x, l.y, 1, 1);
      if (on) {
        g.globalAlpha = 0.35;
        g.fillRect(l.x - 1, l.y, 3, 1);
        g.fillRect(l.x, l.y - 1, 1, 3);
        g.globalAlpha = 1;
      }
    }

    for (const b of this.balloons) {
      if (b.popped) {
        b.respawn -= dt;
        if (b.respawn <= 0) {
          b.popped = false;
          b.y = this.h + 4;
        }
        continue;
      }
      if (b.y > b.homeY) b.y = Math.max(b.homeY, b.y - dt * 22);
      const bob = Math.sin(t * 1.3 + b.phase) * 2;
      g.drawImage(b.sprite, Math.round(b.x + Math.sin(t * 0.7 + b.phase) * 1.5), Math.round(b.y + bob));
    }

    for (const c of this.candles) {
      if (!c.lit) continue;
      const flick = Math.sin(t * 13 + c.phase) > 0 ? 1 : 0;
      const fx = c.x + (c.w > 1 ? 0 : 0);
      g.globalAlpha = 0.55 + 0.2 * Math.sin(t * 7 + c.phase);
      g.drawImage(this.glow, fx - 3, c.y - 7);
      g.globalAlpha = 1;
      g.fillStyle = '#e8442a';
      g.fillRect(fx, c.y - 2, 2, 1);
      g.fillStyle = '#ff9f1c';
      g.fillRect(fx, c.y - 4, 2, 2);
      g.fillStyle = '#ffd23f';
      g.fillRect(fx + flick, c.y - 5, 1, 2);
      g.fillStyle = '#fff6c0';
      g.fillRect(fx + (1 - flick), c.y - 3, 1, 1);
    }

    this.bits = this.bits.filter((p) => {
      p.life -= dt;
      if (p.kind === 'confetti') {
        p.spin += dt * 8;
        p.x += (p.vx + Math.sin(p.spin) * 8) * dt;
        p.y += p.vy * dt;
        if (p.y > this.h + 2) return false;
      } else if (p.kind === 'smoke') {
        p.x += (p.vx + Math.sin(t * 3 + p.y) * 2) * dt;
        p.y += p.vy * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
      if (p.life <= 0) return false;
      g.globalAlpha = p.kind === 'smoke' ? Math.min(0.7, p.life * 0.5) : p.kind === 'pop' ? Math.min(1, p.life * 3) : 1;
      g.fillStyle = p.color;
      if (p.kind === 'confetti') {
        if (Math.sin(p.spin) > 0) g.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        else g.fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      } else {
        g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
      return true;
    });
    g.globalAlpha = 1;
  }
}

