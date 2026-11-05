/**
 * A tiny raster toolkit for code-drawn pixel art.
 *
 * Every sprite in FrenOS XP (icons, cursors, the logo) is drawn here, one
 * pixel at a time, with hard alpha. A `Raster` is plain RGBA memory, so it
 * can be drawn without a DOM and rasterised to a data URL once per session.
 */

export type RGBA = readonly [number, number, number, number];
export type Color = string | RGBA;

const colorCache = new Map<string, RGBA>();

/** `#rgb`, `#rrggbb`, `#rrggbbaa`, or `transparent`. */
export function rgba(color: Color): RGBA {
  if (typeof color !== 'string') return color;
  const hit = colorCache.get(color);
  if (hit) return hit;
  let out: RGBA = [0, 0, 0, 0];
  if (color !== 'transparent') {
    let h = color.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
    out = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  colorCache.set(color, out);
  return out;
}

export function mix(a: Color, b: Color, t: number): RGBA {
  const x = rgba(a);
  const y = rgba(b);
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(x[0] + (y[0] - x[0]) * k),
    Math.round(x[1] + (y[1] - x[1]) * k),
    Math.round(x[2] + (y[2] - x[2]) * k),
    Math.round(x[3] + (y[3] - x[3]) * k),
  ];
}

/** Sample a multi-stop ramp at `t` (0–1), stops evenly spaced. */
export function ramp(stops: readonly Color[], t: number): RGBA {
  if (stops.length === 1) return rgba(stops[0] as Color);
  const k = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(stops[i] as Color, stops[i + 1] as Color, k - i);
}

export function shade(color: Color, amount: number): RGBA {
  return amount >= 0 ? mix(color, '#ffffff', amount) : mix(color, '#000000', -amount);
}

export function withAlpha(color: Color, alpha: number): RGBA {
  const c = rgba(color);
  return [c[0], c[1], c[2], Math.round(Math.max(0, Math.min(1, alpha)) * 255)];
}

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3] as number;
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    const d = this.data;
    return [d[i] as number, d[i + 1] as number, d[i + 2] as number, d[i + 3] as number];
  }

  /** Paint one pixel. Translucent colours blend over what is there. */
  px(x: number, y: number, color: Color): this {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return this;
    const c = rgba(color);
    const i = (y * this.w + x) * 4;
    const d = this.data;
    if (c[3] >= 255 || d[i + 3] === 0) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = c[3];
      return this;
    }
    if (c[3] === 0) return this;
    const a = c[3] / 255;
    const b = (d[i + 3] as number) / 255;
    const out = a + b * (1 - a);
    d[i] = Math.round((c[0] * a + (d[i] as number) * b * (1 - a)) / out);
    d[i + 1] = Math.round((c[1] * a + (d[i + 1] as number) * b * (1 - a)) / out);
    d[i + 2] = Math.round((c[2] * a + (d[i + 2] as number) * b * (1 - a)) / out);
    d[i + 3] = Math.round(out * 255);
    return this;
  }

  clear(x: number, y: number): this {
    if (!this.inside(x, y)) return this;
    const i = (y * this.w + x) * 4;
    this.data[i + 3] = 0;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: Color): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, color);
    return this;
  }

  /** A 1 px frame around a w × h box. */
  frame(x: number, y: number, w: number, h: number, color: Color): this {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
    return this;
  }

  /** Vertical gradient, evenly spaced stops, one colour per row. */
  vgrad(x: number, y: number, w: number, h: number, stops: readonly Color[]): this {
    for (let j = 0; j < h; j++) this.rect(x, y + j, w, 1, ramp(stops, h <= 1 ? 0 : j / (h - 1)));
    return this;
  }

  /** Horizontal gradient, evenly spaced stops, one colour per column. */
  hgrad(x: number, y: number, w: number, h: number, stops: readonly Color[]): this {
    for (let i = 0; i < w; i++) this.rect(x + i, y, 1, h, ramp(stops, w <= 1 ? 0 : i / (w - 1)));
    return this;
  }

  /** Diagonal gradient (top-left → bottom-right) clipped to a box. */
  dgrad(x: number, y: number, w: number, h: number, stops: readonly Color[]): this {
    const span = Math.max(1, w + h - 2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, ramp(stops, (i + j) / span));
    return this;
  }

  /** Filled rectangle with its corners cut by `r` px (pixel-art rounding). */
  rrect(x: number, y: number, w: number, h: number, r: number, color: Color | ((i: number, j: number) => Color)): this {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (r > 0) {
          const dx = i < r ? r - i : i > w - 1 - r ? i - (w - 1 - r) : 0;
          const dy = j < r ? r - j : j > h - 1 - r ? j - (h - 1 - r) : 0;
          if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r + r * 0.6) continue;
        }
        this.px(x + i, y + j, typeof color === 'function' ? color(i, j) : color);
      }
    }
    return this;
  }

  /** Filled ellipse centred at (cx, cy); half-pixel centres are allowed. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: Color | ((dx: number, dy: number) => Color)): this {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, typeof color === 'function' ? color(dx, dy) : color);
      }
    }
    return this;
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: Color): this {
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
      this.px(x0, y0, color);
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
    return this;
  }

  /** Scanline polygon fill (pixel centres). */
  poly(points: ReadonlyArray<readonly [number, number]>, color: Color | ((x: number, y: number) => Color)): this {
    if (points.length < 3) return this;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i] as readonly [number, number];
        const [bx, by] = points[(i + 1) % points.length] as readonly [number, number];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.ceil((xs[k] as number) - 0.5);
        const to = Math.floor((xs[k + 1] as number) - 0.5);
        for (let x = from; x <= to; x++) this.px(x, y, typeof color === 'function' ? color(x, y) : color);
      }
    }
    return this;
  }

  /** A classic pixel heart, `size` px wide, top-left at (x, y). */
  heart(x: number, y: number, size: number, color: Color | ((i: number, j: number) => Color)): this {
    const s = size / 2;
    const hgt = Math.round(size * 0.9);
    for (let j = 0; j < hgt; j++) {
      for (let i = 0; i < size; i++) {
        const u = (i + 0.5 - s) / s;
        const v = 1.15 - ((j + 0.5) / hgt) * 2.3;
        const a = u * u + v * v - 1;
        if (a * a * a - u * u * v * v * v <= 0) this.px(x + i, y + j, typeof color === 'function' ? color(i, j) : color);
      }
    }
    return this;
  }

  /** Paint `color` on every transparent pixel touching an opaque one. */
  outline(color: Color, diagonal = false): this {
    const spots: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        const near =
          this.alpha(x - 1, y) > 96 ||
          this.alpha(x + 1, y) > 96 ||
          this.alpha(x, y - 1) > 96 ||
          this.alpha(x, y + 1) > 96 ||
          (diagonal &&
            (this.alpha(x - 1, y - 1) > 96 ||
              this.alpha(x + 1, y - 1) > 96 ||
              this.alpha(x - 1, y + 1) > 96 ||
              this.alpha(x + 1, y + 1) > 96));
        if (near) spots.push(x, y);
      }
    }
    for (let k = 0; k < spots.length; k += 2) this.px(spots[k] as number, spots[k + 1] as number, color);
    return this;
  }

  /** A soft 1 px drop shadow down-right of the opaque shape. */
  shadow(color: Color = '#00000048', dx = 1, dy = 1): this {
    const spots: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) === 0 && this.alpha(x - dx, y - dy) > 128) spots.push(x, y);
      }
    }
    for (let k = 0; k < spots.length; k += 2) this.px(spots[k] as number, spots[k + 1] as number, color);
    return this;
  }

  /** Recolour opaque pixels through `fn` (used for disabled/selected looks). */
  map(fn: (c: RGBA, x: number, y: number) => Color): this {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const n = rgba(fn(c, x, y));
        const i = (y * this.w + x) * 4;
        this.data[i] = n[0];
        this.data[i + 1] = n[1];
        this.data[i + 2] = n[2];
        this.data[i + 3] = n[3];
      }
    }
    return this;
  }

  blit(src: Raster, ox: number, oy: number): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c[3] > 0) this.px(ox + x, oy + y, c);
      }
    }
    return this;
  }

  /** Copy into a canvas at an integer upscale (nearest neighbour). */
  toCanvas(scale = 1): HTMLCanvasElement {
    const base = document.createElement('canvas');
    base.width = this.w;
    base.height = this.h;
    const bctx = base.getContext('2d');
    if (!bctx) return base;
    const image = bctx.createImageData(this.w, this.h);
    image.data.set(this.data);
    bctx.putImageData(image, 0, 0);
    if (scale === 1) return base;
    const out = document.createElement('canvas');
    out.width = this.w * scale;
    out.height = this.h * scale;
    const octx = out.getContext('2d');
    if (!octx) return base;
    octx.imageSmoothingEnabled = false;
    octx.drawImage(base, 0, 0, out.width, out.height);
    return out;
  }

  toDataUrl(scale = 1): string {
    return this.toCanvas(scale).toDataURL('image/png');
  }
}
