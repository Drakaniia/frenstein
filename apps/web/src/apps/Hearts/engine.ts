/**
 * Heart Catcher engine (spec 19). Pure and testable: state + `updateGame`,
 * no React, no canvas, no DOM. The component owns input and rendering.
 */

export const CANVAS_W = 240;
export const CANVAS_H = 128;
export const BASKET_W = 16;
export const BASKET_H = 16;
export const PLAYER_SPEED = 90; // px/s
export const FALL_BASE = 30; // px/s
export const FALL_STEP = 12; // +per 20 points
export const SPAWN_START = 700; // ms
export const SPAWN_END = 300; // ms
export const BASKET_MOUTH_H = 4;

export type EntityKind = 'heart' | 'star' | 'bomb';

export interface Entity {
  kind: EntityKind;
  x: number;
  y: number;
}

export type GameEvent = 'catch' | 'star' | 'bomb' | 'gameover';

export interface Game {
  entities: Entity[];
  score: number;
  lives: number;
  playerX: number;
  elapsed: number;
  spawnAcc: number;
  over: boolean;
  events: GameEvent[];
}

export function createGame(): Game {
  return {
    entities: [],
    score: 0,
    lives: 3,
    playerX: (CANVAS_W - BASKET_W) / 2,
    elapsed: 0,
    spawnAcc: 0,
    over: false,
    events: [],
  };
}

export function fallSpeed(score: number): number {
  return FALL_BASE + FALL_STEP * Math.floor(score / 20);
}

export function spawnInterval(elapsed: number): number {
  const t = Math.min(elapsed / 60, 1);
  return SPAWN_START - (SPAWN_START - SPAWN_END) * t;
}

function randomKind(): EntityKind {
  const r = Math.random();
  if (r < 1 / 12) return 'star';
  if (r < 1 / 12 + 1 / 6) return 'bomb';
  return 'heart';
}

/** Basket mouth, used for the AABB catch test (spec 19.3). */
function basketMouth(g: Game): { x: number; y: number } {
  return { x: g.playerX, y: CANVAS_H - 24 };
}

/** Advance the game by `dt` seconds. `dir` is −1, 0 or 1. Mutates `g`. */
export function updateGame(g: Game, dt: number, dir: number): void {
  if (g.over) return;
  g.elapsed += dt;
  g.playerX = Math.max(0, Math.min(CANVAS_W - BASKET_W, g.playerX + dir * PLAYER_SPEED * dt));

  g.spawnAcc += dt * 1000;
  if (g.spawnAcc >= spawnInterval(g.elapsed)) {
    g.spawnAcc = 0;
    g.entities.push({ kind: randomKind(), x: Math.floor(Math.random() * (CANVAS_W - 8)), y: -8 });
  }

  const speed = fallSpeed(g.score);
  const mouth = basketMouth(g);
  const remaining: Entity[] = [];

  for (const e of g.entities) {
    e.y += speed * dt;
    const caught =
      e.y + 8 >= mouth.y &&
      e.y <= mouth.y + BASKET_MOUTH_H + 4 &&
      e.x + 8 >= mouth.x &&
      e.x <= mouth.x + BASKET_W;
    if (caught) {
      if (e.kind === 'bomb') {
        g.lives -= 1;
        g.events.push('bomb');
        if (g.lives <= 0) {
          g.over = true;
          g.events.push('gameover');
        }
      } else {
        g.score += e.kind === 'star' ? 5 : 1;
        g.events.push(e.kind === 'star' ? 'star' : 'catch');
      }
      continue;
    }
    if (e.y > CANVAS_H) continue; // missed — no penalty
    remaining.push(e);
  }
  g.entities = remaining;
}
