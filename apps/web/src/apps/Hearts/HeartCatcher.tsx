import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { Button, StatusBar, StatusField } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Raster, ramp } from '@/lib/raster';
import { readNumber, STORAGE_KEYS, writeNumber } from '@/os/persistence';
import { playSfx } from '@/os/sfx';
import { useCoarsePointer, usePrefersReducedMotion } from '@/os/useMedia';
import { dither, heartSprite, Layer, palette } from '@/wallpaper/paint';
import { BASKET_W, CANVAS_H, CANVAS_W, createGame, updateGame, type EntityKind, type Game } from './engine';

type Phase = 'idle' | 'playing' | 'paused' | 'over';

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/* ── art, drawn once ──────────────────────────────────────────────────── */

let art: { backdrop: HTMLCanvasElement; sprites: Record<EntityKind, HTMLCanvasElement>; basket: HTMLCanvasElement } | null = null;

function makeArt() {
  if (art) return art;
  const sky = new Layer(CANVAS_W, CANVAS_H);
  const skyPal = palette(['#3a2e78', '#7c4a9c', '#cb5a7c', '#f3854a', '#ffc760'], 12);
  for (let y = 0; y < CANVAS_H; y++) for (let x = 0; x < CANVAS_W; x++) sky.set(x, y, dither(skyPal, y / 92, x, y));
  const hill = palette(['#7cae4c', '#4f8f3a', '#30692b'], 6);
  for (let x = 0; x < CANVAS_W; x++) {
    const top = Math.round(96 + Math.sin(x * 0.04) * 4 + Math.sin(x * 0.13) * 1.5);
    for (let y = top; y < CANVAS_H; y++) sky.set(x, y, dither(hill, (y - top) / 30, x, y));
  }
  for (let i = 0; i < 26; i++) sky.set((i * 97) % CANVAS_W, (i * 53) % 40, 0xffffffff);
  const backdrop = sky.toCanvas();

  const star = new Raster(9, 9);
  const rows = ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '##.....##'];
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && star.px(x, y, ramp(['#fff6b0', '#ffd23f', '#f2a50c'], y / 8))));
  star.px(4, 4, '#ffffff');
  star.outline('#7a4a00');

  const bomb = new Raster(10, 10);
  bomb.ellipse(4.5, 5.5, 4, 4, (dx, dy) => ramp(['#6a6a80', '#2a2a36', '#0e0e14'], (dx + dy + 2) / 4));
  bomb.px(3, 4, '#c8c8d8');
  bomb.rect(4, 0, 2, 2, '#6b5030');
  bomb.px(6, 0, '#ffd23f');
  bomb.px(7, 0, '#ff7a1a');

  const basket = new Raster(BASKET_W, 12);
  basket.rrect(0, 0, BASKET_W, 3, 1, '#ffb3c9');
  for (let y = 3; y < 12; y++) {
    const inset = Math.floor((y - 3) / 4);
    for (let x = inset; x < BASKET_W - inset; x++) basket.px(x, y, (x + y) % 3 === 0 ? '#c2185b' : y % 2 ? '#f06292' : '#ec407a');
  }
  basket.heart(5, 4, 6, '#ffffff');
  basket.outline('#5c0a22');

  art = {
    backdrop,
    sprites: { heart: heartSprite(8, '#ff4d6d', '#ffd0dc', '#a10f37'), star: star.toCanvas(), bomb: bomb.toCanvas() },
    basket: basket.toCanvas(),
  };
  return art;
}

/**
 * Heart Catcher: catch the falling hearts and stars in the basket, dodge the
 * bombs. A fixed 240 × 128 game buffer, a fixed-timestep loop, and React state
 * only for the HUD. Works with the keyboard, the mouse, or a finger.
 */
export function HeartCatcher() {
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game>(createGame());
  const dirRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const sparkles = useRef<Sparkle[]>([]);
  const bestRef = useRef(readNumber(STORAGE_KEYS.highscore, 0));
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [hi, setHi] = useState(bestRef.current);
  const [newBest, setNewBest] = useState(false);
  const [mood, setMood] = useState<1 | 2 | 3>(1);
  const [zoom, setZoom] = useState(1);

  // Integer zoom that fits the window.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? CANVAS_W;
      setZoom(Math.max(1, Math.min(3, Math.floor((width - 24) / CANVAS_W))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const draw = useCallback(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g) return;
    const a = makeArt();
    const game = gameRef.current;
    g.imageSmoothingEnabled = false;
    g.drawImage(a.backdrop, 0, 0);
    for (const e of game.entities) g.drawImage(a.sprites[e.kind], Math.round(e.x), Math.round(e.y));
    g.drawImage(a.basket, Math.round(game.playerX), CANVAS_H - 20);
    for (const s of sparkles.current) {
      g.globalAlpha = Math.max(0, s.life * 2);
      g.fillStyle = s.color;
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    g.globalAlpha = 1;
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  const start = useCallback(() => {
    gameRef.current = createGame();
    dirRef.current = 0;
    sparkles.current = [];
    setScore(0);
    setLives(3);
    setNewBest(false);
    setMood(1);
    setPhase('playing');
    canvasRef.current?.focus();
  }, []);

  // The game loop runs only while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 60;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        last = now;
        return;
      }
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      const game = gameRef.current;
      while (acc >= STEP) {
        acc -= STEP;
        let dir = dirRef.current;
        const target = targetRef.current;
        if (dir === 0 && target !== null) {
          const centre = game.playerX + BASKET_W / 2;
          dir = Math.abs(target - centre) < 2 ? 0 : Math.sign(target - centre);
        }
        const before = game.entities.slice();
        updateGame(game, STEP, dir);
        for (const ev of game.events) {
          if (ev === 'catch' || ev === 'star') {
            playSfx('catch');
            const caught = before.find((e) => !game.entities.includes(e) && e.kind !== 'bomb');
            const x = caught ? caught.x + 4 : game.playerX + 8;
            for (let i = 0; i < 6; i++) {
              sparkles.current.push({
                x,
                y: CANVAS_H - 22,
                vx: (Math.random() - 0.5) * 50,
                vy: -20 - Math.random() * 30,
                life: 0.5,
                color: ev === 'star' ? '#ffe066' : '#ff9fbf',
              });
            }
          } else if (ev === 'bomb') {
            playSfx('miss');
            setMood(2);
            window.setTimeout(() => setMood(1), 500);
          } else if (ev === 'gameover') {
            playSfx('gameover');
          }
        }
        game.events.length = 0;
        sparkles.current = sparkles.current.filter((s) => {
          s.life -= STEP;
          s.x += s.vx * STEP;
          s.y += s.vy * STEP;
          s.vy += 90 * STEP;
          return s.life > 0;
        });
      }
      setScore(game.score);
      setLives(game.lives);
      draw();
      if (game.over) {
        cancelAnimationFrame(raf);
        if (game.score > bestRef.current) {
          bestRef.current = game.score;
          writeNumber(STORAGE_KEYS.highscore, game.score);
          setHi(game.score);
          setNewBest(true);
          setMood(3);
          playSfx('highscore');
        } else {
          setMood(2);
        }
        setPhase('over');
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, draw]);

  const togglePause = () => setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p));

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') {
      e.preventDefault();
      dirRef.current = -1;
      targetRef.current = null;
    } else if (key === 'arrowright' || key === 'd') {
      e.preventDefault();
      dirRef.current = 1;
      targetRef.current = null;
    } else if (key === ' ' || key === 'p') {
      e.preventDefault();
      togglePause();
    } else if (key === 'enter') {
      e.preventDefault();
      if (phase === 'idle' || phase === 'over') start();
      else if (phase === 'paused') togglePause();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if ((key === 'arrowleft' || key === 'a') && dirRef.current === -1) dirRef.current = 0;
    if ((key === 'arrowright' || key === 'd') && dirRef.current === 1) dirRef.current = 0;
  };

  const pointerToTarget = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    targetRef.current = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
  };

  const overlay =
    phase === 'idle'
      ? `HEART CATCHER\n\n${coarse ? 'TAP' : 'PRESS ENTER'} TO START`
      : phase === 'paused'
        ? 'PAUSED'
        : phase === 'over'
          ? `${newBest ? 'NEW BEST!\n' : ''}GAME OVER\nSCORE ${score}\n\n${coarse ? 'TAP' : 'ENTER'} TO PLAY AGAIN`
          : null;

  const hold = (dir: -1 | 1) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dirRef.current = dir;
      targetRef.current = null;
    },
    onPointerUp: () => {
      dirRef.current = 0;
    },
    onPointerCancel: () => {
      dirRef.current = 0;
    },
  });

  return (
    <div className="hc" ref={wrapRef}>
      <div className="hc-frame">
        <div className="hc-hud">
          <span className="led" title="Score" aria-label={`Score ${score}`}>
            {String(Math.min(999, score)).padStart(3, '0')}
          </span>
          <button type="button" className="hc-face" aria-label="New game" title="New game" onClick={start}>
            <Icon name={`lovey-${phase === 'paused' ? 2 : mood}`} size={24} />
          </button>
          <span className="led" title="Best" aria-label={`Best ${hi}`}>
            {String(Math.min(999, hi)).padStart(3, '0')}
          </span>
        </div>
        <div className="hc-lives" aria-label={`${lives} lives left`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ opacity: i < lives ? 1 : 0.25, lineHeight: 0 }}>
              <Icon name="tray-heart" size={16} />
            </span>
          ))}
        </div>
        <div className="hc-well" style={{ transform: undefined }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            tabIndex={0}
            role="img"
            aria-label={`Heart Catcher. Score ${score}, ${lives} lives.`}
            style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, touchAction: 'none', outline: 'none' }}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onPointerDown={(e) => {
              e.currentTarget.focus();
              if (phase === 'idle' || phase === 'over') {
                start();
                return;
              }
              if (phase === 'paused') togglePause();
              pointerToTarget(e);
            }}
            onPointerMove={(e) => {
              if (phase === 'playing' && (e.buttons > 0 || e.pointerType === 'mouse')) pointerToTarget(e);
            }}
            onPointerLeave={() => {
              targetRef.current = null;
            }}
          />
          {overlay ? (
            <div className="hc-overlay" style={reduced ? undefined : { animation: 'xp-fade-in 300ms ease-out both' }}>
              {overlay}
            </div>
          ) : null}
        </div>
      </div>

      {coarse ? (
        <div className="hc-pads">
          <Button aria-label="Move left" {...hold(-1)}>
            ◀
          </Button>
          <Button aria-label={phase === 'playing' ? 'Pause' : 'Play'} onClick={() => (phase === 'idle' || phase === 'over' ? start() : togglePause())}>
            {phase === 'playing' ? '❚❚' : '▶'}
          </Button>
          <Button aria-label="Move right" {...hold(1)}>
            ▶
          </Button>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">{phase === 'over' ? `Game over. Score ${score}.` : ''}</span>

      <div style={{ alignSelf: 'stretch' }}>
        <StatusBar grip={false}>
          <StatusField>{coarse ? 'Hold ◀ ▶ or drag on the game to move' : '← → or the mouse to move · Space pauses · Enter starts'}</StatusField>
        </StatusBar>
      </div>
    </div>
  );
}
