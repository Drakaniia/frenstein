/**
 * One-colour pixel glyphs (caption buttons, menu checks, media transport,
 * little arrows). Drawn as crisp SVG paths that inherit `currentColor`, so a
 * button's text colour also colours its glyph.
 */

const GLYPHS = {
  minimize: ['........', '........', '........', '........', '........', '........', '######..', '######..'],
  maximize: ['#########', '#########', '#########', '#.......#', '#.......#', '#.......#', '#.......#', '#.......#', '#########'],
  restore: ['..#######', '..#######', '..#.....#', '#######.#', '#######.#', '#.....###', '#.....#..', '#.....#..', '#######..'],
  close: ['##.....##', '###...###', '.###.###.', '..#####..', '...###...', '..#####..', '.###.###.', '###...###', '##.....##'],
  x: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  check: ['......#', '.....##', '#...###', '##.###.', '#####..', '.###...', '..#....'],
  dot: ['.##.', '####', '####', '.##.'],
  submenu: ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  'arrow-left': ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  'arrow-right': ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  'arrow-up': ['...#...', '..###..', '.#####.', '#######'],
  'arrow-down': ['#######', '.#####.', '..###..', '...#...'],
  'chevrons-up': ['...#...', '..###..', '.##.##.', '##...##', '...#...', '..###..', '.##.##.', '##...##'],
  'chevrons-down': ['##...##', '.##.##.', '..###..', '...#...', '##...##', '.##.##.', '..###..', '...#...'],
  play: ['#.....', '###...', '#####.', '######', '#####.', '###...', '#.....'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'],
  stop: ['######', '######', '######', '######', '######', '######'],
  prev: ['#....#', '#...##', '#..###', '#.####', '#..###', '#...##', '#....#'],
  next: ['#....#', '##...#', '###..#', '####.#', '###..#', '##...#', '#....#'],
  eject: ['...#...', '..###..', '.#####.', '#######', '.......', '#######'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  note: ['..####', '..#..#', '..#..#', '..#...', '###...', '###...', '.#....'],
  speaker: ['...#...', '..##.#.', '####..#', '####.#.', '####..#', '..##.#.', '...#...'],
} as const satisfies Record<string, readonly string[]>;

export type GlyphName = keyof typeof GLYPHS;

const pathCache = new Map<string, string>();

function pathFor(name: GlyphName): string {
  const hit = pathCache.get(name);
  if (hit) return hit;
  const rows = GLYPHS[name];
  let d = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== '#') {
        x++;
        continue;
      }
      let w = 0;
      while (row[x + w] === '#') w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w;
    }
  });
  pathCache.set(name, d);
  return d;
}

interface GlyphProps {
  name: GlyphName;
  /** Integer upscale of the glyph grid. */
  scale?: number;
  className?: string;
  label?: string;
}

export function Glyph({ name, scale = 1, className, label }: GlyphProps) {
  const rows = GLYPHS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable={false}
      style={{ display: 'block', flex: 'none' }}
    >
      <path d={pathFor(name)} fill="currentColor" />
    </svg>
  );
}
