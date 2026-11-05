/**
 * The FrenOS XP cursor set, drawn as pixel art and installed as real CSS
 * cursors (no lag, works everywhere the browser shows a pointer). Each
 * cursor is rasterised at a whole number of device pixels per art pixel and
 * declared at the display's density, so it stays crisp on every screen.
 */

import { Raster } from '@/lib/raster';

interface CursorArt {
  rows: readonly string[];
  hot: [number, number];
  fallback: string;
}

// K = ink, W = white, Y = sand (hourglass), . = clear
const ARROW = [
  'K...........',
  'KK..........',
  'KWK.........',
  'KWWK........',
  'KWWWK.......',
  'KWWWWK......',
  'KWWWWWK.....',
  'KWWWWWWK....',
  'KWWWWWWWK...',
  'KWWWWWWWWK..',
  'KWWWWWWWWWK.',
  'KWWWWWWKKKKK',
  'KWWWKWWK....',
  'KWWKKWWK....',
  'KWK..KWWK...',
  'KK...KWWK...',
  'K.....KWWK..',
  '......KWWK..',
  '.......KK...',
];

const HAND = [
  '.....KK.........',
  '....KWWK........',
  '....KWWK........',
  '....KWWK........',
  '....KWWK........',
  '....KWWKKK......',
  '....KWWKWWKKK...',
  '....KWWKWWKWWKK.',
  '.KK.KWWKWWKWWKWK',
  'KWWKKWWWWWWWWKWK',
  'KWWWKWWWWWWWWWWK',
  '.KWWKWWWWWWWWWWK',
  '..KWWWWWWWWWWWWK',
  '..KWWWWWWWWWWWK.',
  '...KWWWWWWWWWWK.',
  '...KWWWWWWWWWK..',
  '....KWWWWWWWWK..',
  '....KWWWWWWWWK..',
  '....KKKKKKKKKK..',
];

const BEAM = [
  'WWW.WWW',
  'WKKWKKW',
  'WWWKWWW',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  '..WKW..',
  'WWWKWWW',
  'WKKWKKW',
  'WWW.WWW',
];

const NS = [
  '....W....',
  '...WKW...',
  '..WKKKW..',
  '.WKKKKKW.',
  'WWWWKWWWW',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  '...WKW...',
  'WWWWKWWWW',
  '.WKKKKKW.',
  '..WKKKW..',
  '...WKW...',
  '....W....',
];

function transpose(rows: readonly string[]): string[] {
  const w = rows[0]?.length ?? 0;
  return Array.from({ length: w }, (_, x) => rows.map((r) => r[x] ?? '.').join(''));
}

function diagonal(flip: boolean): string[] {
  const n = 15;
  const grid = Array.from({ length: n }, () => Array<string>(n).fill('.'));
  const put = (x: number, y: number, c: string) => {
    const xx = flip ? n - 1 - x : x;
    if (grid[y]?.[xx] !== undefined) (grid[y] as string[])[xx] = c;
  };
  for (let i = 3; i <= 11; i++) put(i, i, 'K');
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) if (x + y <= 7) put(x, y, 'K');
  for (let y = 8; y <= 13; y++) for (let x = 8; x <= 13; x++) if (x + y >= 21) put(x, y, 'K');
  // white outline
  const outline: Array<[number, number]> = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (grid[y]?.[x] !== '.') continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => grid[y + (dy as number)]?.[x + (dx as number)] === 'K');
      if (near) outline.push([x, y]);
    }
  }
  for (const [x, y] of outline) (grid[y] as string[])[x] = 'W';
  return grid.map((r) => r.join(''));
}

function busy(): string[] {
  const glass = ['KKKKKKK', 'KWWWWWK', '.KYYYK.', '..KYK..', '...K...', '..KWK..', '.KWYWK.', 'KWYYYWK', 'KKKKKKK'];
  const rows = ARROW.map((r) => r.padEnd(19, '.'));
  return rows.map((row, y) => {
    const g = glass[y - 9];
    if (!g) return row;
    return row.slice(0, 11) + g + row.slice(18);
  });
}

const CURSORS: Record<string, CursorArt> = {
  arrow: { rows: ARROW, hot: [0, 0], fallback: 'default' },
  hand: { rows: HAND, hot: [5, 0], fallback: 'pointer' },
  text: { rows: BEAM, hot: [3, 8], fallback: 'text' },
  ns: { rows: NS, hot: [4, 9], fallback: 'ns-resize' },
  ew: { rows: transpose(NS), hot: [9, 4], fallback: 'ew-resize' },
  nwse: { rows: diagonal(false), hot: [7, 7], fallback: 'nwse-resize' },
  nesw: { rows: diagonal(true), hot: [7, 7], fallback: 'nesw-resize' },
  busy: { rows: busy(), hot: [0, 0], fallback: 'progress' },
};

const COLORS: Record<string, string> = { K: '#000000', W: '#ffffff', Y: '#ffd23f' };

function draw(art: CursorArt): Raster {
  const h = art.rows.length;
  const w = Math.max(...art.rows.map((r) => r.length));
  const r = new Raster(w + 1, h + 1);
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = COLORS[row[x] as string];
      if (c) r.px(x, y, c);
    }
  });
  r.shadow('#00000040', 1, 1);
  return r;
}

const cache = new Map<string, string>();

/**
 * Build the stylesheet that installs the cursor set for one display.
 * `pixel` = device px per stage px; `dpr` = device px per CSS px.
 */
export function cursorStylesheet(pixel: number, dpr: number): string {
  const key = `${pixel}@${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const decl = (name: string): string => {
    const art = CURSORS[name] as CursorArt;
    const raster = draw(art);
    // Never let a cursor exceed 32 CSS px: browsers refuse larger ones.
    const fit = Math.max(1, Math.floor((32 * dpr) / Math.max(raster.w, raster.h)));
    const device = Math.max(1, Math.min(Math.round(pixel), fit));
    const url = raster.toDataUrl(device);
    const density = device / dpr;
    const hx = Math.round(art.hot[0] * density);
    const hy = Math.round(art.hot[1] * density);
    const res = `${dpr}x`;
    return [
      `cursor: url("${raster.toDataUrl(1)}") ${art.hot[0]} ${art.hot[1]}, ${art.fallback};`,
      `cursor: -webkit-image-set(url("${url}") ${res}) ${hx} ${hy}, ${art.fallback};`,
      `cursor: image-set(url("${url}") ${res}) ${hx} ${hy}, ${art.fallback};`,
    ].join('\n  ');
  };

  const root = '.stage.xp-cursors';
  const css = `
${root}, ${root} * {
  ${decl('arrow')}
}
${root} a[href], ${root} [data-cursor="hand"], ${root} [data-cursor="hand"] * {
  ${decl('hand')}
}
${root} input[type="text"], ${root} input[type="password"], ${root} input[type="search"], ${root} input:not([type]), ${root} textarea, ${root} [data-cursor="text"] {
  ${decl('text')}
}
${root} [data-cursor="ns"] { ${decl('ns')} }
${root} [data-cursor="ew"] { ${decl('ew')} }
${root} [data-cursor="nwse"] { ${decl('nwse')} }
${root} [data-cursor="nesw"] { ${decl('nesw')} }
${root}[data-busy="true"], ${root}[data-busy="true"] * {
  ${decl('busy')}
}
`;
  cache.set(key, css);
  return css;
}
