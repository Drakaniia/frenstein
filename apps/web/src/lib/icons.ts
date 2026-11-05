/**
 * The FrenOS XP icon set — every icon is code-drawn pixel art in the spirit
 * of Windows XP's 32 × 32 icons: a light source at the top left, soft
 * gradients, a dark outline and a 1 px drop shadow so they stay legible on
 * the animated wallpaper.
 */

import { Raster, mix, ramp, rgba, shade, withAlpha, type Color } from './raster';

type Draw = (r: Raster) => void;

interface IconDef {
  size: number;
  draw: Draw;
  /** Outline colour, or `false` for none. */
  outline?: Color | false;
  shadow?: boolean;
}

const INK = '#1f2436';

/* ───────────────────────────── helpers ────────────────────────────────── */

/** Stamp a character grid: `#` (or any listed key) paints, `.` skips. */
function glyph(r: Raster, x: number, y: number, rows: readonly string[], colors: Color | Record<string, Color>): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i] as string;
      if (ch === '.' || ch === ' ') continue;
      const c = typeof colors === 'string' || Array.isArray(colors) ? (colors as Color) : (colors as Record<string, Color>)[ch];
      if (c) r.px(x + i, y + j, c);
    }
  });
}

/** Punch a transparent disc (CD holes, rings). */
function hole(r: Raster, cx: number, cy: number, rad: number): void {
  for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rad * rad) r.clear(x, y);
    }
  }
}

/** A glossy sphere (info / help / error badges). */
function sphere(r: Raster, cx: number, cy: number, rad: number, stops: readonly Color[]): void {
  r.ellipse(cx, cy, rad, rad, (dx, dy) => {
    const d = Math.sqrt(dx * dx + dy * dy);
    return ramp(stops, Math.min(1, d * 0.55 + (dy + dx) * 0.22 + 0.25));
  });
  r.ellipse(cx - rad * 0.32, cy - rad * 0.42, rad * 0.5, rad * 0.32, withAlpha('#ffffff', 0.45));
}

/** A tiny Bliss: blue sky, a white cloud, the green hill. */
function bliss(r: Raster, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const u = i / Math.max(1, w - 1);
      const hill = h * 0.58 + Math.pow(u - 0.32, 2) * h * 0.9 - (u > 0.7 ? (u - 0.7) * h * 0.25 : 0);
      if (j >= hill) r.px(x + i, y + j, ramp(['#7fd04f', '#4aa52c', '#2f7d1d'], (j - hill) / Math.max(1, h - hill)));
      else r.px(x + i, y + j, ramp(['#1f62d6', '#4f97ee', '#a6d2fb'], j / Math.max(1, hill)));
    }
  }
  r.rect(x + Math.round(w * 0.55), y + Math.round(h * 0.22), Math.max(2, Math.round(w * 0.22)), 1, '#ffffff');
  r.rect(x + Math.round(w * 0.5), y + Math.round(h * 0.22) + 1, Math.max(3, Math.round(w * 0.34)), 1, '#eef6ff');
}

/** A pixel-art photo (sunset over hills) used by picture icons. */
function snapshot(r: Raster, x: number, y: number, w: number, h: number): void {
  r.vgrad(x, y, w, h, ['#5a4aa6', '#c2577a', '#f28f3b', '#ffd98a']);
  r.ellipse(x + w * 0.68, y + h * 0.62, w * 0.14, w * 0.14, '#fff3b0');
  for (let i = 0; i < w; i++) {
    const m = Math.round(h * 0.62 + Math.sin(i * 0.7) * 1.2 + (i % 5 === 0 ? -1 : 0));
    r.rect(x + i, y + m, 1, h - m, '#6b3d7a');
    const g = Math.round(h * 0.8 + Math.sin(i * 0.45 + 1) * 1);
    r.rect(x + i, y + g, 1, h - g, i % 3 === 0 ? '#3f8a3c' : '#4e9a3c');
  }
}

/** The XP yellow folder; `content` draws whatever sticks out of it. */
function folder(r: Raster, content?: Draw, emblem?: Draw): void {
  r.rrect(2, 5, 12, 5, 1, '#e3a52d');
  r.rect(3, 6, 10, 1, '#f5c860');
  r.rrect(2, 8, 28, 19, 1, (_i, j) => ramp(['#f1bd47', '#d99b21'], j / 18));
  content?.(r);
  r.poly(
    [
      [2, 12.5],
      [30, 12.5],
      [30, 27],
      [2, 27],
    ],
    (_x, y) => ramp(['#ffeaa0', '#fdd56b', '#f4b632'], (y - 12) / 15)
  );
  r.rect(3, 13, 26, 1, '#fff6d2');
  r.rect(2, 26, 28, 1, '#cf921c');
  r.rect(29, 13, 1, 13, '#e0a52b');
  emblem?.(r);
}

/** White sheet of paper with ruled lines. */
function sheet(r: Raster, x: number, y: number, w: number, h: number, lines = '#93a9cf'): void {
  r.rect(x, y, w, h, '#ffffff');
  r.rect(x + w - 1, y + 1, 1, h - 1, '#dfe4ec');
  for (let j = y + 2; j < y + h - 1; j += 2) r.rect(x + 2, j, Math.max(2, w - 4 - ((j * 7) % 4)), 1, lines);
}

/** Rounded glossy square used by the Start menu footer and Turn Off dialog. */
function badge(r: Raster, stops: readonly Color[]): void {
  r.rrect(1, 1, 30, 30, 7, '#ffffff');
  r.rrect(2, 2, 28, 28, 6, (i, j) => ramp(stops, (j * 0.75 + i * 0.25) / 27));
  r.rrect(4, 3, 24, 12, 5, withAlpha('#ffffff', 0.22));
}

function monitor(r: Raster, x: number, y: number, w: number, h: number, screen: Draw): void {
  r.rrect(x, y, w, h, 2, (_i, j) => ramp(['#fbfbf9', '#dcdfe5', '#c3c7d0'], j / (h - 1)));
  r.rect(x + 1, y + 1, w - 2, 1, '#ffffff');
  r.rect(x + 2, y + 2, w - 4, h - 6, '#4c5466');
  screen(r);
  r.rect(x + w - 5, y + h - 3, 2, 1, '#3fd23f');
}

/* ───────────────────────────── the icons ──────────────────────────────── */

const ICONS: Record<string, IconDef> = {
  computer: {
    size: 32,
    draw: (r) => {
      // tower
      r.rrect(21, 7, 9, 21, 1, (i) => ramp(['#fbfbf8', '#d8dbe1', '#aeb3bd'], i / 8));
      r.rect(22, 10, 6, 2, '#8d929e');
      r.rect(22, 10, 6, 1, '#6b7080');
      r.rect(22, 14, 6, 1, '#a3a8b4');
      r.rect(22, 16, 6, 1, '#a3a8b4');
      r.rect(23, 24, 2, 1, '#3fd23f');
      // monitor
      monitor(r, 2, 3, 21, 18, (s) => bliss(s, 5, 6, 15, 10));
      r.rect(10, 21, 6, 2, '#b4b8c2');
      r.rrect(6, 23, 14, 3, 1, (_i, j) => ramp(['#f0f1f4', '#a9aeb8'], j / 2));
    },
  },

  folder: { size: 32, draw: (r) => folder(r) },

  'folder-open': {
    size: 32,
    draw: (r) => {
      r.rrect(2, 5, 12, 5, 1, '#e3a52d');
      r.rrect(2, 8, 27, 19, 1, (_i, j) => ramp(['#efba44', '#d6961f'], j / 18));
      sheet(r, 6, 6, 18, 12);
      r.poly(
        [
          [6, 14.5],
          [31, 14.5],
          [27, 27],
          [1, 27],
        ],
        (_x, y) => ramp(['#ffeaa0', '#fbd062', '#f0ae2c'], (y - 14) / 13)
      );
      r.rect(7, 15, 23, 1, '#fff6d2');
    },
  },

  documents: {
    size: 32,
    draw: (r) =>
      folder(r, (s) => {
        sheet(s, 6, 3, 15, 11);
        sheet(s, 12, 5, 14, 9, '#b9c7de');
      }),
  },

  pictures: {
    size: 32,
    draw: (r) =>
      folder(r, (s) => {
        s.rect(7, 2, 18, 12, '#ffffff');
        snapshot(s, 8, 3, 16, 10);
      }),
  },

  'music-folder': {
    size: 32,
    draw: (r) =>
      folder(r, undefined, (s) => {
        s.rect(17, 15, 2, 8, '#1d4fd8');
        s.rect(19, 15, 4, 2, '#1d4fd8');
        s.rect(21, 17, 2, 2, '#1d4fd8');
        s.ellipse(16, 22.5, 2.6, 2, '#2a62e8');
        s.px(15, 22, '#9cc0ff');
      }),
  },

  'folder-heart': {
    size: 32,
    draw: (r) =>
      folder(
        r,
        (s) => sheet(s, 7, 4, 17, 10, '#f4a6bd'),
        (s) => {
          s.heart(11, 15, 11, (_i, j) => ramp(['#ff8fae', '#e8335d', '#b5173f'], j / 9));
          s.px(13, 17, '#ffd1dc');
          s.px(14, 17, '#ffd1dc');
        }
      ),
  },

  txt: {
    size: 32,
    outline: '#4b5466',
    draw: (r) => {
      r.poly(
        [
          [7, 3],
          [20, 3],
          [26, 9],
          [26, 29],
          [7, 29],
        ],
        (x, y) => mix('#ffffff', '#e7ebf2', (x - 7 + y - 3) / 44)
      );
      r.poly(
        [
          [20, 3],
          [26, 9],
          [20, 9],
        ],
        '#cfd6e2'
      );
      r.line(20, 3, 20, 9, '#9aa4b6');
      r.line(20, 9, 26, 9, '#9aa4b6');
      for (let y = 12; y <= 26; y += 2) r.rect(10, y, 13 - ((y * 3) % 5), 1, '#8ea2c4');
      r.rect(10, 6, 7, 1, '#8ea2c4');
    },
  },

  photo: {
    size: 32,
    outline: '#3a3f52',
    draw: (r) => {
      r.rect(3, 6, 26, 21, '#ffffff');
      r.rect(3, 26, 26, 1, '#d6dbe4');
      r.rect(28, 6, 1, 21, '#d6dbe4');
      snapshot(r, 5, 8, 22, 16);
    },
  },

  letter: {
    size: 32,
    outline: '#5a2b33',
    draw: (r) => {
      r.rect(3, 9, 26, 18, '#fff7ea');
      r.vgrad(3, 9, 26, 18, ['#fffaf2', '#f6e2c8']);
      // bottom folds
      r.line(3, 26, 13, 18, '#e3c7a3');
      r.line(28, 26, 18, 18, '#e3c7a3');
      // flap
      r.poly(
        [
          [3, 9],
          [29, 9],
          [16, 20],
        ],
        (_x, y) => ramp(['#fff3e0', '#f1d6b4'], (y - 9) / 11)
      );
      r.line(3, 9, 16, 20, '#d8b58c');
      r.line(28, 9, 16, 20, '#d8b58c');
      // wax heart seal
      r.heart(11, 14, 10, (_i, j) => ramp(['#ff7b98', '#e3264f', '#b3123a'], j / 8));
      r.px(13, 16, '#ffc2cf');
      r.px(14, 16, '#ffc2cf');
      // a little heart floating up
      r.heart(23, 2, 7, (_i, j) => ramp(['#ffb0c6', '#ff5d85'], j / 5));
    },
  },

  notepad: {
    size: 32,
    outline: '#28365a',
    draw: (r) => {
      r.rect(6, 6, 20, 23, '#ffffff');
      r.vgrad(6, 6, 20, 23, ['#ffffff', '#eef2f8']);
      for (let y = 11; y <= 26; y += 3) r.rect(8, y, 16, 1, '#9fbbe6');
      r.rect(10, 8, 1, 20, '#f0a0a8');
      r.vgrad(6, 3, 20, 4, ['#7fb2ff', '#2f6fe0']);
      for (let x = 8; x <= 24; x += 3) {
        r.rect(x, 1, 1, 4, '#c9ced8');
        r.px(x, 1, '#ffffff');
      }
    },
  },

  fienamp: {
    size: 32,
    outline: '#16204a',
    draw: (r) => {
      r.ellipse(13, 17, 11.5, 11.5, (dx, dy) => {
        const a = Math.atan2(dy, dx);
        const sheen = (Math.sin(a * 2) + 1) / 2;
        const base = ramp(['#f4f6fb', '#c8cfdc', '#e6ebf4'], (dy + 1) / 2);
        return mix(base, ramp(['#ffd1f0', '#c6e6ff', '#d8ffd1', '#fff1b8'], sheen), 0.35);
      });
      r.ellipse(13, 17, 4.5, 4.5, '#b4bccb');
      hole(r, 13, 17, 2);
      // eighth note
      r.rect(22, 5, 2, 16, '#1d4fd8');
      r.rect(24, 5, 3, 2, '#1d4fd8');
      r.rect(25, 7, 3, 2, '#1d4fd8');
      r.rect(26, 9, 2, 2, '#1d4fd8');
      r.ellipse(20.5, 21, 3.6, 2.8, (_dx, dy) => ramp(['#6aa2ff', '#1f56d9'], (dy + 1) / 2));
      r.px(19, 20, '#cfe0ff');
    },
  },

  game: {
    size: 32,
    outline: '#252a37',
    draw: (r) => {
      const body = (_i: number, j: number) => ramp(['#f1f2f6', '#c3c7d2', '#9ea4b2'], j / 14);
      r.ellipse(8.5, 22.5, 5.5, 5, (_dx, dy) => ramp(['#c9cdd7', '#9aa0ae'], (dy + 1) / 2));
      r.ellipse(23.5, 22.5, 5.5, 5, (_dx, dy) => ramp(['#c9cdd7', '#9aa0ae'], (dy + 1) / 2));
      r.rrect(3, 12, 26, 11, 4, body);
      r.rect(5, 13, 22, 1, '#ffffff');
      r.rect(6, 16, 7, 3, '#3a3f4d');
      r.rect(8, 14, 3, 7, '#3a3f4d');
      r.px(9, 15, '#6d7385');
      r.ellipse(23.5, 14.8, 1.6, 1.6, '#f2c230');
      r.ellipse(26.5, 17.5, 1.6, 1.6, '#e5394d');
      r.ellipse(20.5, 17.5, 1.6, 1.6, '#3f7de0');
      r.ellipse(23.5, 20.2, 1.6, 1.6, '#3fb04a');
      r.rect(14, 18, 2, 1, '#7a8090');
      r.rect(17, 18, 2, 1, '#7a8090');
      r.heart(12, 2, 9, (_i, j) => ramp(['#ff9fb9', '#ff4d77', '#d31d4f'], j / 7));
      r.px(14, 4, '#ffd6e0');
    },
  },

  cake: {
    size: 32,
    outline: '#4f1c38',
    draw: (r) => {
      r.ellipse(16, 27.5, 14, 3, '#e4ebf6');
      r.ellipse(16, 27, 12, 1.8, '#f7fbff');
      r.rrect(4, 17, 24, 10, 1, (_i, j) => ramp(['#ffc4d6', '#f490b0', '#e46f97'], j / 9));
      r.rect(4, 17, 24, 3, '#fff2f6');
      for (const x of [6, 10, 15, 19, 24]) r.rect(x, 20, 2, 1 + (x % 3), '#fff2f6');
      r.rrect(8, 11, 16, 7, 1, (_i, j) => ramp(['#ffdbe6', '#f7a9c2'], j / 6));
      r.rect(8, 11, 16, 2, '#ffffff');
      for (const x of [10, 15, 20]) r.rect(x, 13, 2, 1, '#ffffff');
      for (const [x, y, c] of [
        [7, 23, '#5ec4ff'],
        [12, 24, '#ffd23f'],
        [18, 22, '#7ee06a'],
        [23, 24, '#b07cff'],
        [11, 15, '#5ec4ff'],
        [19, 16, '#ffd23f'],
      ] as const)
        r.px(x, y, c);
      for (const x of [11, 15, 19]) {
        r.rect(x, 6, 2, 5, '#8fd0ff');
        r.px(x, 7, '#ffffff');
        r.px(x + 1, 9, '#ffffff');
        r.rect(x, 4, 2, 2, '#ff9f1c');
        r.px(x, 3, '#ffe066');
        r.px(x + 1, 2, '#fff7c2');
      }
    },
  },

  bin: {
    size: 32,
    outline: '#2b3a50',
    draw: (r) => drawBin(r, false),
  },

  'bin-full': {
    size: 32,
    outline: '#2b3a50',
    draw: (r) => drawBin(r, true),
  },

  control: {
    size: 32,
    outline: '#243760',
    draw: (r) => {
      r.rrect(3, 4, 26, 23, 2, (_i, j) => ramp(['#ffffff', '#e4eaf6'], j / 22));
      r.vgrad(3, 4, 26, 5, ['#3d8bff', '#0a52d6']);
      r.rect(24, 5, 3, 3, '#e8553a');
      for (const [y, kx, c] of [
        [13, 9, '#3fb04a'],
        [18, 19, '#ff9f1c'],
        [23, 13, '#e8417a'],
      ] as const) {
        r.rect(7, y, 18, 1, '#8291ad');
        r.rect(7, y + 1, 18, 1, '#ffffff');
        r.rrect(kx, y - 2, 4, 5, 1, (_i, j) => ramp([shade(c, 0.4), c, shade(c, -0.3)], j / 4));
      }
    },
  },

  help: {
    size: 32,
    outline: '#0b2b72',
    draw: (r) => {
      sphere(r, 16, 16, 13, ['#9ad6ff', '#3a8ff0', '#0b4bbd', '#082f86']);
      glyph(r, 12, 8, ['..####..', '.######.', '##....##', '......##', '.....##.', '....##..', '...##...', '...##...', '........', '...##...', '...##...'], '#ffffff');
    },
  },

  info: {
    size: 32,
    outline: '#0b2b72',
    draw: (r) => {
      sphere(r, 16, 16, 13, ['#9ad6ff', '#3a8ff0', '#0b4bbd', '#082f86']);
      r.rect(14, 7, 4, 3, '#ffffff');
      r.rect(13, 12, 5, 2, '#ffffff');
      r.rect(14, 12, 4, 11, '#ffffff');
      r.rect(12, 22, 8, 2, '#ffffff');
    },
  },

  'msg-warning': {
    size: 32,
    outline: '#5a4100',
    draw: (r) => {
      r.poly(
        [
          [16, 2.5],
          [30.5, 28],
          [1.5, 28],
        ],
        (x, y) => ramp(['#fff6a6', '#ffd93d', '#f0b400'], (y - 2) / 26 + (x - 16) * 0.004)
      );
      r.rect(14, 10, 4, 10, '#20180a');
      r.rect(15, 20, 2, 1, '#20180a');
      r.rect(14, 22, 4, 3, '#20180a');
    },
  },

  'msg-error': {
    size: 32,
    outline: '#5a0b03',
    draw: (r) => {
      sphere(r, 16, 16, 13, ['#ffb0a0', '#f2523a', '#c41d08', '#8a0f02']);
      for (let k = -1; k <= 1; k++) {
        r.line(10 + k, 10, 22 + k, 22, '#ffffff');
        r.line(22 + k, 10, 10 + k, 22, '#ffffff');
      }
    },
  },

  saver: {
    size: 32,
    draw: (r) => {
      monitor(r, 3, 4, 26, 20, (s) => {
        s.vgrad(6, 7, 20, 13, ['#0b1240', '#2b2c78', '#6b3d8a']);
        for (const [x, y] of [
          [8, 9],
          [13, 8],
          [19, 11],
          [11, 13],
          [16, 15],
          [22, 9],
        ] as const)
          s.px(x, y, '#ffe9a0');
        s.ellipse(21.5, 15.5, 2.5, 2.5, '#fff3c4');
        s.ellipse(22.8, 14.6, 2.1, 2.1, '#2b2c78');
      });
      r.rect(13, 24, 6, 2, '#b4b8c2');
      r.rrect(9, 26, 14, 3, 1, (_i, j) => ramp(['#f0f1f4', '#a9aeb8'], j / 2));
    },
  },

  run: {
    size: 32,
    outline: '#1d2f5c',
    draw: (r) => {
      r.rrect(9, 4, 20, 18, 1, (_i, j) => ramp(['#ffffff', '#e6ecf7'], j / 17));
      r.vgrad(9, 4, 20, 4, ['#3d8bff', '#0a52d6']);
      r.rect(12, 11, 13, 1, '#a9b6cf');
      r.rect(12, 14, 9, 1, '#a9b6cf');
      for (let k = 0; k < 3; k++) r.line(3 + k, 27, 15 + k, 15, '#2fae3c');
      r.poly(
        [
          [11, 12],
          [20, 12],
          [20, 21],
        ],
        '#2fae3c'
      );
      r.line(12, 13, 18, 13, '#7fe08a');
    },
  },

  drive: {
    size: 32,
    outline: '#2a2e3c',
    draw: (r) => {
      r.poly(
        [
          [4, 13],
          [8, 8],
          [29, 8],
          [25, 13],
        ],
        '#f4f5f8'
      );
      r.poly(
        [
          [25, 13],
          [29, 8],
          [29, 21],
          [25, 26],
        ],
        (_x, y) => ramp(['#a6abb7', '#7c8291'], (y - 8) / 18)
      );
      r.rect(4, 13, 21, 13, '#d9dce3');
      r.vgrad(4, 13, 21, 13, ['#eceef2', '#b4b9c4']);
      r.rect(4, 13, 21, 1, '#ffffff');
      r.rect(6, 22, 9, 1, '#8b91a0');
      r.rect(20, 22, 3, 2, '#2fd13a');
      r.px(21, 22, '#b8ffbe');
    },
  },

  floppy: {
    size: 32,
    outline: '#14244f',
    draw: (r) => {
      r.poly(
        [
          [4, 4],
          [25, 4],
          [28, 7],
          [28, 28],
          [4, 28],
        ],
        (_x, y) => ramp(['#4a76d8', '#2b4fae'], (y - 4) / 24)
      );
      r.rect(9, 4, 13, 9, '#d7dce6');
      r.rect(9, 4, 13, 1, '#ffffff');
      r.rect(17, 5, 3, 7, '#5b6274');
      r.rect(8, 16, 16, 12, '#ffffff');
      r.rect(10, 19, 12, 1, '#a7b4cc');
      r.rect(10, 22, 9, 1, '#a7b4cc');
      r.heart(19, 21, 4, '#e8335d');
    },
  },

  cd: {
    size: 32,
    outline: '#22283a',
    draw: (r) => {
      r.ellipse(16, 11.5, 11, 9, (dx, dy) => {
        const sheen = (Math.sin(Math.atan2(dy, dx) * 2) + 1) / 2;
        return mix(ramp(['#f6f7fb', '#c5ccd8'], (dy + 1) / 2), ramp(['#ffd1f0', '#c6e6ff', '#d8ffd1', '#fff1b8'], sheen), 0.4);
      });
      r.ellipse(16, 11.5, 3.6, 3, '#b6bdcc');
      hole(r, 16, 11.5, 1.6);
      r.rrect(3, 19, 26, 9, 1, (_i, j) => ramp(['#eef0f4', '#b1b6c1'], j / 8));
      r.rect(5, 22, 22, 2, '#5d6474');
      r.rect(23, 25, 3, 1, '#2fd13a');
    },
  },

  gift: {
    size: 32,
    outline: '#5a1736',
    draw: (r) => {
      r.vgrad(5, 14, 22, 14, ['#ff9cc3', '#e7578f']);
      r.vgrad(3, 10, 26, 5, ['#ffc0da', '#ff8db8']);
      r.vgrad(14, 10, 4, 18, ['#fff09a', '#f1b91c']);
      r.rect(3, 14, 26, 1, '#c94a7b');
      r.ellipse(11.5, 7.5, 4.5, 3.2, (_dx, dy) => ramp(['#fff3a8', '#f1b91c'], (dy + 1) / 2));
      r.ellipse(20.5, 7.5, 4.5, 3.2, (_dx, dy) => ramp(['#fff3a8', '#f1b91c'], (dy + 1) / 2));
      r.ellipse(11.5, 7.5, 1.8, 1.2, '#d99a0e');
      r.ellipse(20.5, 7.5, 1.8, 1.2, '#d99a0e');
      r.rect(14, 6, 4, 4, '#ffd23f');
    },
  },

  heart: {
    size: 32,
    outline: '#5c0a22',
    draw: (r) => {
      r.heart(2, 4, 28, (_i, j) => ramp(['#ffa2bb', '#ff4d6d', '#d0174b', '#a10f37'], j / 24));
      r.ellipse(10, 10, 3.6, 2.4, withAlpha('#ffffff', 0.6));
    },
  },

  showdesktop: {
    size: 16,
    outline: '#13245a',
    shadow: false,
    draw: (r) => {
      r.rect(1, 2, 14, 10, '#e9edf4');
      bliss(r, 2, 3, 12, 8);
      r.rect(5, 12, 6, 1, '#b4b8c2');
      r.rect(3, 13, 10, 1, '#d8dbe1');
    },
  },

  'lovey-1': { size: 40, outline: '#5c0a22', draw: (r) => lovey(r, 'open') },
  'lovey-2': { size: 40, outline: '#5c0a22', draw: (r) => lovey(r, 'blink') },
  'lovey-3': { size: 40, outline: '#5c0a22', draw: (r) => lovey(r, 'happy') },

  clock: {
    size: 32,
    outline: '#253252',
    draw: (r) => {
      r.ellipse(16, 16, 13.5, 13.5, (dx, dy) => ramp(['#7fb2ff', '#2f6fe0', '#0b3fae'], Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.6 + (dy + dx) * 0.2 + 0.2)));
      r.ellipse(16, 16, 10.5, 10.5, (_dx, dy) => ramp(['#ffffff', '#e3e9f4'], (dy + 1) / 2));
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        r.px(16 + Math.round(Math.sin(a) * 8.6) - (Math.sin(a) < 0 ? 1 : 0), 16 - Math.round(Math.cos(a) * 8.6) - (Math.cos(a) > 0 ? 1 : 0), '#56627a');
      }
      r.line(16, 16, 16, 9, '#1c2438');
      r.line(15, 16, 15, 9, '#1c2438');
      r.line(16, 16, 21, 19, '#1c2438');
      r.rect(15, 15, 2, 2, '#e3264f');
    },
  },

  display: {
    size: 32,
    draw: (r) => {
      monitor(r, 3, 4, 26, 20, (s) => bliss(s, 6, 7, 20, 13));
      r.rect(13, 24, 6, 2, '#b4b8c2');
      r.rrect(9, 26, 14, 3, 1, (_i, j) => ramp(['#f0f1f4', '#a9aeb8'], j / 2));
    },
  },

  speaker: {
    size: 32,
    outline: '#1e2a46',
    draw: (r) => {
      r.vgrad(4, 11, 7, 10, ['#f2f4f8', '#b9bfcc']);
      r.poly(
        [
          [10, 11],
          [19, 4],
          [19, 28],
          [10, 21],
        ],
        (_x, y) => ramp(['#e9edf4', '#a4abba'], (y - 4) / 24)
      );
      for (const [rad, c] of [
        [5, '#ffffff'],
        [8.5, '#dfe7f5'],
      ] as const) {
        for (let a = -0.8; a <= 0.8; a += 0.08) r.px(Math.round(21 + Math.cos(a) * rad), Math.round(16 + Math.sin(a) * rad), c);
      }
    },
  },

  avatar: {
    size: 48,
    outline: false,
    shadow: false,
    draw: (r) => {
      r.vgrad(0, 0, 48, 48, ['#6b4bb8', '#c6588c', '#f2875a', '#ffd18a']);
      r.ellipse(36, 30, 7, 7, '#fff1b0');
      for (let i = 0; i < 48; i++) {
        const hill = Math.round(36 + Math.sin(i * 0.18) * 2 + Math.sin(i * 0.5) * 0.8);
        r.rect(i, hill, 1, 48 - hill, i % 4 === 0 ? '#3d8a3a' : '#4c9b3d');
      }
      for (const [x, y] of [
        [6, 6],
        [14, 3],
        [40, 8],
        [30, 4],
        [9, 16],
      ] as const)
        r.px(x, y, '#fff6d8');
      r.heart(11, 10, 26, (_i, j) => ramp(['#ffb5c8', '#ff5b7f', '#e0285a', '#b3153f'], j / 22));
      r.ellipse(18, 16, 3.5, 2.2, withAlpha('#ffffff', 0.7));
      r.outline('#5c0a22');
    },
  },

  /* ── Start menu footer & Turn Off dialog ─────────────────────────────── */

  logoff: {
    size: 32,
    outline: false,
    draw: (r) => {
      badge(r, ['#ffd27a', '#f39a1e', '#d2700a']);
      r.ellipse(11.5, 14.5, 5, 5, '#fff3c0');
      hole(r, 11.5, 14.5, 2);
      r.rect(15, 13, 11, 3, '#fff3c0');
      r.rect(21, 16, 2, 3, '#fff3c0');
      r.rect(24, 16, 2, 4, '#fff3c0');
    },
  },
  switchuser: {
    size: 32,
    outline: false,
    draw: (r) => {
      badge(r, ['#8be28b', '#38a838', '#1f7a1f']);
      r.ellipse(12, 12, 3.6, 3.6, '#ffffff');
      r.rrect(6, 17, 12, 8, 3, '#ffffff');
      r.ellipse(21, 14, 3, 3, '#dfffdc');
      r.rrect(16, 19, 11, 7, 3, '#dfffdc');
    },
  },
  power: {
    size: 32,
    outline: false,
    draw: (r) => {
      badge(r, ['#ff9a7a', '#e8442a', '#b81f0b']);
      for (let a = 0.55; a <= Math.PI * 2 - 0.55; a += 0.05) {
        for (const rad of [7.2, 8.2]) r.px(Math.round(15.5 + Math.sin(a) * rad), Math.round(16.5 - Math.cos(a) * rad), '#ffffff');
      }
      r.rect(15, 6, 2, 10, '#ffffff');
    },
  },
  restart: {
    size: 32,
    outline: false,
    draw: (r) => {
      badge(r, ['#8be28b', '#38a838', '#1f7a1f']);
      for (let a = 0.9; a <= Math.PI * 2 - 0.2; a += 0.05) {
        for (const rad of [7, 8]) r.px(Math.round(15.5 + Math.sin(a) * rad), Math.round(16.5 - Math.cos(a) * rad), '#ffffff');
      }
      r.poly(
        [
          [17, 4],
          [24, 9],
          [16, 12],
        ],
        '#ffffff'
      );
    },
  },
  standby: {
    size: 32,
    outline: false,
    draw: (r) => {
      badge(r, ['#ffe27a', '#f2b51e', '#cf8a06']);
      r.ellipse(15.5, 16, 8, 8, '#fff7d6');
      r.ellipse(19, 13.5, 7, 7, '#f1b01c');
      r.px(10, 20, '#ffffff');
    },
  },

  /* ── toolbar glyphs (24 px) ───────────────────────────────────────────── */

  'tb-back': { size: 24, outline: '#1f5c1f', draw: (r) => roundArrow(r, 'left') },
  'tb-forward': { size: 24, outline: '#1f5c1f', draw: (r) => roundArrow(r, 'right') },
  'tb-up': {
    size: 24,
    outline: '#6b4a0e',
    draw: (r) => {
      r.rrect(1, 5, 9, 4, 1, '#e3a52d');
      r.rrect(1, 7, 22, 14, 1, (_i, j) => ramp(['#ffe597', '#f2b33a'], j / 13));
      r.poly(
        [
          [12, 9],
          [18, 15],
          [14.5, 15],
          [14.5, 19],
          [9.5, 19],
          [9.5, 15],
          [6, 15],
        ],
        '#2fae3c'
      );
    },
  },
  'tb-search': {
    size: 24,
    outline: '#2a3245',
    draw: (r) => {
      r.ellipse(9.5, 9.5, 7, 7, '#d8e6f8');
      r.ellipse(9.5, 9.5, 5, 5, (_dx, dy) => ramp(['#e9f6ff', '#9cc8f2'], (dy + 1) / 2));
      r.px(7, 7, '#ffffff');
      for (let k = 0; k < 3; k++) r.line(14 + k, 15, 20 + k, 21, '#7a5230');
    },
  },
  'tb-views': {
    size: 24,
    outline: '#2a3a63',
    draw: (r) => {
      for (const [x, y, c] of [
        [3, 3, '#4c8ff5'],
        [13, 3, '#f2b33a'],
        [3, 13, '#3fb04a'],
        [13, 13, '#e8417a'],
      ] as const)
        r.rrect(x, y, 8, 8, 1, (_i, j) => ramp([shade(c, 0.35), c], j / 7));
    },
  },
  'tb-folders': {
    size: 24,
    outline: '#6b4a0e',
    draw: (r) => {
      r.rrect(1, 2, 12, 9, 1, (_i, j) => ramp(['#ffe597', '#f2b33a'], j / 8));
      r.rrect(9, 13, 13, 9, 1, (_i, j) => ramp(['#ffe597', '#f2b33a'], j / 8));
      r.rect(5, 11, 1, 6, '#7d8597');
      r.rect(5, 16, 4, 1, '#7d8597');
    },
  },
  'tb-go': {
    size: 16,
    outline: '#1f5c1f',
    draw: (r) => {
      r.rrect(1, 1, 14, 14, 2, (_i, j) => ramp(['#9be89b', '#2fae3c', '#1f7a1f'], j / 13));
      r.poly(
        [
          [5, 4],
          [11, 8],
          [5, 12],
        ],
        '#ffffff'
      );
    },
  },
  'pv-prev': { size: 24, outline: '#173e7a', draw: (r) => roundArrow(r, 'left', ['#a8dcff', '#3d8ff0', '#1452b8']) },
  'pv-next': { size: 24, outline: '#173e7a', draw: (r) => roundArrow(r, 'right', ['#a8dcff', '#3d8ff0', '#1452b8']) },
  'pv-zoomin': { size: 24, outline: '#2a3245', draw: (r) => magnifier(r, '+') },
  'pv-zoomout': { size: 24, outline: '#2a3245', draw: (r) => magnifier(r, '-') },
  'pv-fit': {
    size: 24,
    outline: '#2a3a63',
    draw: (r) => {
      r.rrect(3, 3, 18, 18, 1, (_i, j) => ramp(['#ffffff', '#dbe6f7'], j / 17));
      for (const [x, y, dx, dy] of [
        [5, 5, 1, 1],
        [18, 5, -1, 1],
        [5, 18, 1, -1],
        [18, 18, -1, -1],
      ] as const) {
        r.line(x, y, x + dx * 4, y + dy * 4, '#1f56d9');
        r.rect(Math.min(x, x + dx * 2), y, 3, 1, '#1f56d9');
        r.rect(x, Math.min(y, y + dy * 2), 1, 3, '#1f56d9');
      }
    },
  },
  'pv-rotl': { size: 24, outline: '#1f5c1f', draw: (r) => rotateArrow(r, -1) },
  'pv-rotr': { size: 24, outline: '#1f5c1f', draw: (r) => rotateArrow(r, 1) },
  'pv-slideshow': {
    size: 24,
    outline: '#253252',
    draw: (r) => {
      r.rrect(2, 3, 20, 15, 1, '#e9edf4');
      r.rect(4, 5, 16, 11, '#2b4fae');
      r.poly(
        [
          [10, 7],
          [16, 10.5],
          [10, 14],
        ],
        '#ffffff'
      );
      r.rect(10, 18, 4, 2, '#b4b8c2');
      r.rect(7, 20, 10, 2, '#cfd3db');
    },
  },

  /* ── tray (16 px) ─────────────────────────────────────────────────────── */

  'tray-heart': {
    size: 16,
    outline: '#5c0a22',
    shadow: false,
    draw: (r) => {
      r.heart(1, 2, 14, (_i, j) => ramp(['#ffb0c4', '#ff4d6d', '#c9184a'], j / 11));
      r.px(4, 4, '#ffffff');
      r.px(5, 4, '#ffe0e8');
    },
  },
  'tray-volume': {
    size: 16,
    outline: '#16233f',
    shadow: false,
    draw: (r) => {
      r.rect(2, 6, 3, 4, '#eef2f8');
      r.poly(
        [
          [5, 6],
          [9, 2],
          [9, 14],
          [5, 10],
        ],
        '#d9e0ec'
      );
      r.px(11, 6, '#ffffff');
      r.px(12, 7, '#ffffff');
      r.px(12, 8, '#ffffff');
      r.px(11, 9, '#ffffff');
      r.px(13, 4, '#dfe8f7');
      r.px(14, 6, '#dfe8f7');
      r.px(14, 9, '#dfe8f7');
      r.px(13, 11, '#dfe8f7');
    },
  },
  'tray-muted': {
    size: 16,
    outline: '#16233f',
    shadow: false,
    draw: (r) => {
      r.rect(1, 6, 3, 4, '#eef2f8');
      r.poly(
        [
          [4, 6],
          [8, 2],
          [8, 14],
          [4, 10],
        ],
        '#d9e0ec'
      );
      r.ellipse(12, 11, 3.6, 3.6, '#e8442a');
      r.line(10, 9, 14, 13, '#ffffff');
      r.line(14, 9, 10, 13, '#ffffff');
    },
  },
};

/** The desktop assistant: a small heart with a face. */
function lovey(r: Raster, mood: 'open' | 'blink' | 'happy'): void {
  r.heart(3, 6, 34, (_i, j) => ramp(['#ffb0c6', '#ff5d85', '#e0285a', '#b3153f'], j / 30));
  r.ellipse(11, 12, 3.6, 2.4, withAlpha('#ffffff', 0.65));
  for (const ex of [14, 26]) {
    if (mood === 'open') {
      r.ellipse(ex, 18, 2.6, 3.2, '#ffffff');
      r.ellipse(ex + 0.5, 18.6, 1.4, 1.9, '#2a0d18');
      r.px(ex, 17, '#ffffff');
    } else if (mood === 'blink') {
      r.rect(ex - 2, 18, 5, 1, '#2a0d18');
    } else {
      r.px(ex - 2, 19, '#2a0d18');
      r.px(ex - 1, 18, '#2a0d18');
      r.px(ex, 17, '#2a0d18');
      r.px(ex + 1, 18, '#2a0d18');
      r.px(ex + 2, 19, '#2a0d18');
    }
  }
  r.ellipse(10.5, 23, 2.4, 1.4, withAlpha('#ffd0dc', 0.85));
  r.ellipse(29.5, 23, 2.4, 1.4, withAlpha('#ffd0dc', 0.85));
  r.px(18, 24, '#2a0d18');
  r.px(19, 25, '#2a0d18');
  r.px(20, 25, '#2a0d18');
  r.px(21, 25, '#2a0d18');
  r.px(22, 24, '#2a0d18');
  if (mood === 'happy') {
    r.line(35, 14, 38, 9, '#e0285a');
    r.line(36, 14, 39, 9, '#e0285a');
    r.px(38, 8, '#ffd23f');
  }
}

function drawBin(r: Raster, full: boolean): void {
  if (full) {
    r.rrect(8, 2, 8, 8, 2, '#ffffff');
    r.rect(9, 4, 5, 1, '#e3264f');
    r.rect(10, 6, 4, 1, '#c5ccd8');
    r.rrect(15, 1, 9, 8, 2, '#fdf6e3');
    r.heart(17, 3, 5, '#ff6b8a');
    r.rect(5, 4, 5, 5, '#eef2f8');
  }
  for (let y = 9; y <= 28; y++) {
    const inset = Math.floor((y - 9) / 6);
    const x0 = 5 + inset;
    const w = 22 - inset * 2;
    for (let i = 0; i < w; i++) {
      const u = i / (w - 1);
      let c = ramp(['#f3f7fb', '#c3d1e2', '#9fb3cc', '#6d83a1'], u);
      if ((i + y) % 4 === 0 || (i - y + 400) % 4 === 0) c = mix(c, '#3f5573', 0.35);
      r.px(x0 + i, y, c);
    }
  }
  r.ellipse(16, 9, 12, 3, (_dx, dy) => ramp(['#ffffff', '#dfe8f3'], (dy + 1) / 2));
  r.ellipse(16, 9, 10, 1.8, full ? '#5d7290' : '#4a5d78');
  r.ellipse(16, 28, 8.5, 1.4, '#6d83a1');
  // the little green recycle triangle
  r.line(13, 21, 16, 16, '#2fae3c');
  r.line(16, 16, 19, 21, '#2fae3c');
  r.line(13, 21, 19, 21, '#2fae3c');
  r.px(16, 17, '#7fe08a');
}

function roundArrow(r: Raster, dir: 'left' | 'right', stops: readonly Color[] = ['#a6f0a6', '#36b336', '#1e7a1e']): void {
  sphere(r, 12, 12, 10.5, stops);
  const flip = (x: number) => (dir === 'left' ? x : 24 - x);
  r.poly(
    [
      [flip(5), 12],
      [flip(12), 5.5],
      [flip(12), 9.5],
      [flip(19), 9.5],
      [flip(19), 14.5],
      [flip(12), 14.5],
      [flip(12), 18.5],
    ],
    '#ffffff'
  );
}

function magnifier(r: Raster, sign: '+' | '-'): void {
  r.ellipse(9.5, 9.5, 7, 7, '#c9d9ef');
  r.ellipse(9.5, 9.5, 5.2, 5.2, (_dx, dy) => ramp(['#f2f9ff', '#a9d0f4'], (dy + 1) / 2));
  r.rect(6, 9, 7, 2, '#1f56d9');
  if (sign === '+') r.rect(8.5, 6, 2, 7, '#1f56d9');
  for (let k = 0; k < 3; k++) r.line(14 + k, 15, 20 + k, 21, '#7a5230');
}

function rotateArrow(r: Raster, dir: 1 | -1): void {
  const cx = 12;
  const cy = 13;
  for (let a = 0.4; a <= Math.PI * 1.55; a += 0.04) {
    for (const rad of [6.5, 7.5, 8.5]) {
      const x = cx + Math.sin(a) * rad * dir;
      r.px(Math.round(x), Math.round(cy - Math.cos(a) * rad), '#36b336');
    }
  }
  const tipX = cx + 3 * dir;
  r.poly(
    [
      [tipX, 1],
      [tipX + 6 * dir, 5],
      [tipX, 9],
    ],
    '#36b336'
  );
}

/* ─────────────────────────── the FrenOS logo ──────────────────────────── */

/**
 * The FrenOS XP mark: a waving heart in the four XP flag colours.
 * Drawn per size so small versions stay readable.
 */
export function drawLogo(size: number, opts: { outline?: boolean } = {}): Raster {
  const r = new Raster(size, size);
  const pad = Math.max(1, Math.round(size * 0.06));
  const w = size - pad * 2;
  const gap = size >= 24 ? 1 : 0;
  r.heart(pad, pad + Math.round(size * 0.04), w, (i, j) => {
    const midX = w / 2 + Math.sin((j / w) * Math.PI * 2) * w * 0.035;
    const midY = w * 0.42 + Math.sin((i / w) * Math.PI * 2 + 0.6) * w * 0.05;
    if (gap && (Math.abs(i + 0.5 - midX) < 0.7 || Math.abs(j + 0.5 - midY) < 0.7)) return 'transparent';
    const left = i + 0.5 < midX;
    const top = j + 0.5 < midY;
    const quad = top ? (left ? ['#ff7a45', '#e6421c'] : ['#9be15d', '#3fa52a']) : left ? ['#5aa8ff', '#1d5fd6'] : ['#ffe066', '#f2a50c'];
    return ramp(quad, ((i / w) * 0.4 + (j / w) * 0.6) * 1.2);
  });
  if (size >= 20) r.ellipse(pad + w * 0.28, pad + w * 0.26, w * 0.1, w * 0.06, withAlpha('#ffffff', 0.55));
  if (opts.outline) {
    r.outline(withAlpha('#0b1a4a', 0.75));
  }
  return r;
}

/* ───────────────────────────── registry ───────────────────────────────── */

const rasterCache = new Map<string, Raster>();
const urlCache = new Map<string, string>();

function build(def: IconDef): Raster {
  const r = new Raster(def.size, def.size);
  def.draw(r);
  if (def.outline !== false) r.outline(def.outline ?? INK);
  if (def.shadow !== false) r.shadow(withAlpha('#0a0820', 0.28));
  return r;
}

export function hasIcon(name: string): boolean {
  return name in ICONS || name.startsWith('logo-');
}

/** The raster for an icon name (`logo-<size>` draws the logo at that size). */
export function iconRaster(name: string): Raster {
  const hit = rasterCache.get(name);
  if (hit) return hit;
  let raster: Raster;
  if (name.startsWith('logo-')) {
    const size = Number(name.slice(5)) || 32;
    raster = drawLogo(size, { outline: size <= 24 });
  } else {
    const def = ICONS[name] ?? ICONS.txt;
    raster = build(def as IconDef);
  }
  rasterCache.set(name, raster);
  return raster;
}

/** Native grid size of an icon. */
export function iconSize(name: string): number {
  return iconRaster(name).w;
}

/** A PNG data URL, nearest-upscaled by an integer factor. Memoised. */
export function iconUrl(name: string, upscale = 1): string {
  const key = `${name}@${upscale}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const url = iconRaster(name).toDataUrl(upscale);
  urlCache.set(key, url);
  return url;
}

export { rgba };
