/**
 * Typed storage helpers. No raw `localStorage` / `sessionStorage` calls
 * anywhere else. Every read validates its data before the OS trusts it.
 */

import { DESKTOP_ICONS } from './apps';
import {
  DEFAULT_SETTINGS,
  type AppId,
  type IconSize,
  type ScreensaverId,
  type Settings,
  type ThemeId,
  type WallpaperId,
} from './types';

export const STORAGE_KEYS = {
  session: 'frenos.session.unlocked',
  settings: 'frenos.settings.v3',
  legacySettings: ['frenos.settings.v2', 'frenos.settings'],
  highscore: 'frenos.hearts.highscore',
  trash: 'frenos.trash.v2',
  notepadDraft: 'frenos.notepad.draft.v1',
  heartsFavorites: 'frenos.hearts.favorites.v1',
  welcome: 'frenos.notice.welcome',
  assistant: 'frenos.assistant.seen',
  loveNote: 'frenos.lovenote.index',
  runHistory: 'frenos.run.history',
  wishes: 'frenos.birthday.wishes',
} as const;

function safeGet(store: Storage | undefined, key: string): string | null {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(store: Storage | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* storage disabled — the OS still works, it just forgets. */
  }
}

function local(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function session(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readSessionFlag(): boolean {
  return safeGet(session(), STORAGE_KEYS.session) === '1';
}

export function writeSessionFlag(unlocked: boolean): void {
  if (unlocked) safeSet(session(), STORAGE_KEYS.session, '1');
  else {
    try {
      session()?.removeItem(STORAGE_KEYS.session);
    } catch {
      /* ignore */
    }
  }
}

export function readSessionNumber(key: string): number {
  const raw = safeGet(session(), key);
  const n = raw === null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function writeSessionNumber(key: string, value: number): void {
  safeSet(session(), key, String(value));
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = safeGet(local(), key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  safeSet(local(), key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  try {
    local()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readNumber(key: string, fallback: number): number {
  const raw = safeGet(local(), key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function writeNumber(key: string, value: number): void {
  safeSet(local(), key, String(value));
}

/* ─────────────────────────── settings validation ───────────────────────── */

const WALLPAPERS: WallpaperId[] = ['sunset', 'bliss', 'nightfall', 'sakura'];
const THEMES: ThemeId[] = ['blue', 'olive', 'silver', 'rose'];
const SCREENSAVERS: ScreensaverId[] = ['slideshow', 'hearts', 'starfield'];
const ICON_SIZES: IconSize[] = ['small', 'medium', 'large'];
const IDLE_CHOICES = [60_000, 120_000, 300_000, 600_000, 900_000];
const NOTIFY_CHOICES = [5_000, 9_000, 15_000, 30_000];
const KNOWN_ICONS = new Set<AppId>(DESKTOP_ICONS);

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pick<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && (choices as readonly string[]).includes(value) ? (value as T) : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function nearest(value: unknown, choices: readonly number[], fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return choices.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), choices[0] ?? fallback);
}

function validOrder(value: unknown): AppId[] {
  if (!Array.isArray(value)) return [...DESKTOP_ICONS];
  const seen = new Set<AppId>();
  const order: AppId[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item as AppId;
    if (KNOWN_ICONS.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  // New shortcuts added in a later release must still appear.
  for (const id of DESKTOP_ICONS) if (!seen.has(id)) order.push(id);
  return order;
}

export function sanitizeSettings(value: unknown): Settings {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof Settings, unknown>> & {
    sfxVolume?: unknown;
    musicVolume?: unknown;
  };
  const legacyVolume = typeof raw.sfxVolume === 'number' ? raw.sfxVolume : raw.musicVolume;

  return {
    volume: clampInt(raw.volume ?? legacyVolume, 0, 100, DEFAULT_SETTINGS.volume),
    muted: bool(raw.muted, DEFAULT_SETTINGS.muted),
    cursorEnabled: bool(raw.cursorEnabled, DEFAULT_SETTINGS.cursorEnabled),
    clock24h: bool(raw.clock24h, DEFAULT_SETTINGS.clock24h),
    wallpaper: pick<WallpaperId>(raw.wallpaper, WALLPAPERS, DEFAULT_SETTINGS.wallpaper),
    wallpaperMotion: bool(raw.wallpaperMotion, DEFAULT_SETTINGS.wallpaperMotion),
    theme: pick<ThemeId>(raw.theme, THEMES, DEFAULT_SETTINGS.theme),
    iconSize: pick<IconSize>(raw.iconSize, ICON_SIZES, DEFAULT_SETTINGS.iconSize),
    showLabels: bool(raw.showLabels, DEFAULT_SETTINGS.showLabels),
    screensaverEnabled: bool(raw.screensaverEnabled, DEFAULT_SETTINGS.screensaverEnabled),
    screensaver: pick<ScreensaverId>(raw.screensaver, SCREENSAVERS, DEFAULT_SETTINGS.screensaver),
    idleMs: raw.idleMs === undefined ? DEFAULT_SETTINGS.idleMs : nearest(raw.idleMs, IDLE_CHOICES, DEFAULT_SETTINGS.idleMs),
    notificationsEnabled: bool(raw.notificationsEnabled, DEFAULT_SETTINGS.notificationsEnabled),
    notificationMs:
      raw.notificationMs === undefined
        ? DEFAULT_SETTINGS.notificationMs
        : nearest(raw.notificationMs, NOTIFY_CHOICES, DEFAULT_SETTINGS.notificationMs),
    iconOrder: validOrder(raw.iconOrder),
  };
}

export function loadSettings(): Settings {
  const current = readJson<unknown | null>(STORAGE_KEYS.settings, null);
  if (current) return sanitizeSettings(current);
  // Older releases: keep the owner's sound/clock choices, but start the
  // redesigned desktop from its new layout and wallpaper.
  for (const key of STORAGE_KEYS.legacySettings) {
    const legacy = readJson<Record<string, unknown> | null>(key, null);
    if (legacy && typeof legacy === 'object') {
      const { volume, muted, clock24h, notificationsEnabled } = legacy;
      return sanitizeSettings({ volume, muted, clock24h, notificationsEnabled });
    }
  }
  return sanitizeSettings(null);
}

export function saveSettings(settings: Settings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

export const SETTINGS_CHOICES = { IDLE_CHOICES, NOTIFY_CHOICES } as const;
