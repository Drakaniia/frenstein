import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

import { CONTENT } from '@/data/content';
import { APPS, WIN_MIN_VISIBLE } from './apps';
import { loadSettings, readSessionFlag, saveSettings, writeSessionFlag } from './persistence';
import { configureSfx } from './sfx';
import { computeStage } from './useStageScale';
import { CHROME } from './useChrome';
import {
  DEFAULT_SETTINGS,
  type AppId,
  type DialogAction,
  type DialogState,
  type MessageIcon,
  type OsEffect,
  type OsNotification,
  type OsPhase,
  type ScreensaverId,
  type Settings,
  type ShutdownMode,
  type WindowGeometry,
  type WindowPayload,
  type WindowState,
} from './types';

/* ─────────────────────────────── state ────────────────────────────────── */

export interface StageDims {
  w: number;
  h: number;
}

export interface ScreensaverState {
  /** Overrides the configured screen saver for this run only. */
  mode: ScreensaverId | null;
  /** First photo for the slideshow. */
  start: number;
}

export interface OsState {
  phase: OsPhase;
  shutdownMode: ShutdownMode;
  windows: WindowState[];
  activeId: string | null;
  startOpen: boolean;
  dialog: DialogState | null;
  settings: Settings;
  screensaver: ScreensaverState | null;
  /** Windows hidden by "Show Desktop", restored by the second click. */
  peek: PeekEntry[] | null;
  /** Bumped to start a fresh shower of hearts. */
  loveRain: number;
  assistant: boolean;
  counter: number;
  zCounter: number;
  notifications: OsNotification[];
  noticeCounter: number;
  stage: StageDims;
}

export interface PeekEntry {
  id: string;
  status: 'normal' | 'maximized';
}

export interface MessageRequest {
  title: string;
  message: string;
  icon?: MessageIcon;
  confirmLabel?: string;
  then?: OsEffect;
}

export type OsAction =
  | { type: 'BOOT_DONE' }
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'LOCK' }
  | { type: 'OPEN_APP'; appId: AppId; payload?: WindowPayload }
  | { type: 'FOCUS_WINDOW'; id: string }
  | { type: 'MOVE_WINDOW'; id: string; x: number; y: number }
  | { type: 'RESIZE_WINDOW'; id: string; x?: number; y?: number; w: number; h: number }
  | { type: 'MINIMIZE'; id: string }
  | { type: 'RESTORE'; id: string }
  | { type: 'TOGGLE_MAXIMIZE'; id: string }
  | { type: 'CLOSE_WINDOW'; id: string }
  | { type: 'SET_WINDOW_TITLE'; id: string; title: string }
  | { type: 'SHOW_DESKTOP' }
  | { type: 'TOGGLE_START'; open?: boolean }
  | { type: 'OPEN_DIALOG'; action: Exclude<DialogAction, 'message'> }
  | { type: 'MESSAGE'; message: MessageRequest }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'LOG_OFF' }
  | { type: 'SHUT_DOWN'; mode?: ShutdownMode }
  | { type: 'SHUTDOWN_DONE' }
  | { type: 'RESTART' }
  | { type: 'SCREENSAVER'; open: boolean; mode?: ScreensaverId; start?: number }
  | { type: 'SET_STAGE'; stage: StageDims }
  | { type: 'NOTIFY'; notification: Omit<OsNotification, 'id'> }
  | { type: 'DISMISS_NOTIFICATION'; id: number }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'LOVE_RAIN' }
  | { type: 'ASSISTANT'; open: boolean };

/* ─────────────────────────── geometry helpers ─────────────────────────── */

export const isCompactStage = (stage: StageDims): boolean => stage.w < 600 || stage.h < 380;

const desktopHeight = (stage: StageDims): number => Math.max(160, stage.h - CHROME.taskbarH);

function maximized(stage: StageDims): WindowGeometry {
  return { x: 0, y: 0, w: Math.max(160, stage.w), h: desktopHeight(stage) };
}

function clampGeometry(g: WindowGeometry, stage: StageDims, minW = 160, minH = 120): WindowGeometry {
  const maxW = Math.max(160, stage.w);
  const maxH = Math.max(120, desktopHeight(stage));
  const w = Math.round(Math.min(Math.max(g.w, Math.min(minW, maxW)), maxW));
  const h = Math.round(Math.min(Math.max(g.h, Math.min(minH, maxH)), maxH));
  // Keep enough of the caption on screen to grab it again.
  const x = Math.min(Math.max(g.x, -(w - WIN_MIN_VISIBLE)), stage.w - WIN_MIN_VISIBLE);
  const y = Math.min(Math.max(g.y, 0), Math.max(0, desktopHeight(stage) - CHROME.captionH));
  return { x: Math.round(x), y: Math.round(y), w, h };
}

/** Cascade each new window, but always keep it fully inside the work area. */
function cascade(n: number, w: number, h: number, stage: StageDims): WindowGeometry {
  const step = n % 8;
  const width = Math.min(w, Math.max(160, stage.w - 24));
  const height = Math.min(h, Math.max(120, desktopHeight(stage) - 20));
  // Keep clear of the desktop icon column whenever the window fits beside it.
  const iconColumn = CHROME.iconOrigin + CHROME.iconCellW + 14;
  const minX = stage.w - width - 8 >= iconColumn ? iconColumn : 8;
  const baseX = Math.max(minX, Math.round((stage.w - width) / 2) - 90);
  const baseY = Math.max(6, Math.round((desktopHeight(stage) - height) / 2) - 60);
  return clampGeometry(
    {
      x: Math.min(baseX + step * 24, Math.max(4, stage.w - width - 6)),
      y: Math.min(baseY + step * 22, Math.max(4, desktopHeight(stage) - height - 6)),
      w: width,
      h: height,
    },
    stage
  );
}

/* ─────────────────────────────── dialogs ──────────────────────────────── */

function makeDialog(action: Exclude<DialogAction, 'message'>): DialogState {
  switch (action) {
    case 'logoff':
      return { action, title: `Log Off ${CONTENT.osName}`, message: '' };
    case 'shutdown':
      return { action, title: 'Turn off computer', message: '' };
    case 'run':
      return { action, title: 'Run', message: '' };
    case 'about':
    default:
      return { action: 'about', title: `About ${CONTENT.osName}`, message: '' };
  }
}

/* ─────────────────────────── window operations ────────────────────────── */

function topVisibleWindow(windows: WindowState[]): WindowState | null {
  const visible = windows.filter((w) => w.status !== 'minimized');
  if (visible.length === 0) return null;
  return visible.reduce((a, b) => (a.z > b.z ? a : b));
}

function raise(state: OsState, id: string, restore = false): OsState {
  const target = state.windows.find((w) => w.id === id);
  if (!target) return state;
  const isTop = state.windows.every((w) => w.id === id || w.z < target.z);
  if (state.activeId === id && isTop && target.status !== 'minimized' && state.peek === null) return state;
  const z = state.zCounter + 1;
  return {
    ...state,
    zCounter: z,
    activeId: id,
    peek: null,
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, z, status: restore && w.status === 'minimized' ? 'normal' : w.status } : w
    ),
  };
}

function initialTitle(appId: AppId): string {
  if (appId === 'birthday') return CONTENT.birthday.label;
  return APPS[appId].title;
}

function openApp(state: OsState, appId: AppId, payload?: WindowPayload): OsState {
  const def = APPS[appId];
  const closed = { ...state, startOpen: false };

  if (!def.windowed) {
    if (appId === 'screensaver') return { ...closed, screensaver: { mode: null, start: 0 }, dialog: null };
    if (appId === 'run') return { ...closed, dialog: makeDialog('run') };
    return { ...closed, dialog: makeDialog('about') };
  }

  if (def.single) {
    const existing = state.windows.find((w) => w.appId === appId);
    if (existing) {
      const raised = raise({ ...closed, dialog: null }, existing.id, true);
      if (payload === undefined) return raised;
      return {
        ...raised,
        windows: raised.windows.map((w) =>
          w.id === existing.id ? { ...w, payload, payloadRev: w.payloadRev + 1 } : w
        ),
      };
    }
  }

  const counter = state.counter + 1;
  const z = state.zCounter + 1;
  const compact = isCompactStage(state.stage);
  const normal = cascade(state.windows.length, def.w, def.h, state.stage);
  const id = `${appId}:${counter}`;

  const win: WindowState = {
    id,
    appId,
    title: initialTitle(appId),
    icon: def.icon,
    ...(compact ? maximized(state.stage) : normal),
    minW: def.minW,
    minH: def.minH,
    z,
    resizable: def.resizable,
    status: compact ? 'maximized' : 'normal',
    prev: compact ? normal : undefined,
    payload,
    payloadRev: 0,
  };

  return {
    ...closed,
    windows: [...state.windows, win],
    activeId: id,
    zCounter: z,
    counter,
    dialog: null,
    peek: null,
  };
}

const SESSION_RESET = {
  windows: [] as WindowState[],
  activeId: null,
  startOpen: false,
  dialog: null,
  screensaver: null,
  peek: null,
  notifications: [] as OsNotification[],
  assistant: false,
} as const;

/* ──────────────────────────────── reducer ──────────────────────────────── */

export function osReducer(state: OsState, action: OsAction): OsState {
  switch (action.type) {
    case 'BOOT_DONE':
      return { ...state, phase: 'login' };

    case 'LOGIN_SUCCESS':
      writeSessionFlag(true);
      return { ...state, phase: 'desktop' };

    case 'LOCK':
      writeSessionFlag(false);
      return { ...state, phase: 'login', startOpen: false, dialog: null, screensaver: null, assistant: false };

    case 'OPEN_APP':
      return openApp(state, action.appId, action.payload);

    case 'FOCUS_WINDOW':
    case 'RESTORE':
      return raise(state, action.id, true);

    case 'MOVE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id && w.status === 'normal'
            ? { ...w, ...clampGeometry({ x: action.x, y: action.y, w: w.w, h: w.h }, state.stage, w.minW, w.minH) }
            : w
        ),
      };

    case 'RESIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.id || w.status !== 'normal') return w;
          return {
            ...w,
            ...clampGeometry(
              { x: action.x ?? w.x, y: action.y ?? w.y, w: action.w, h: action.h },
              state.stage,
              w.minW,
              w.minH
            ),
          };
        }),
      };

    case 'MINIMIZE': {
      const windows = state.windows.map((w) => (w.id === action.id ? { ...w, status: 'minimized' as const } : w));
      const next = topVisibleWindow(windows);
      return { ...state, windows, activeId: next ? next.id : null };
    }

    case 'TOGGLE_MAXIMIZE':
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.id) return w;
          if (w.status === 'maximized') {
            if (isCompactStage(state.stage)) return w;
            const prev = w.prev ?? cascade(0, APPS[w.appId].w, APPS[w.appId].h, state.stage);
            return { ...w, status: 'normal' as const, ...clampGeometry(prev, state.stage, w.minW, w.minH), prev: undefined };
          }
          return {
            ...w,
            status: 'maximized' as const,
            prev: w.status === 'normal' ? { x: w.x, y: w.y, w: w.w, h: w.h } : w.prev,
            ...maximized(state.stage),
          };
        }),
      };

    case 'CLOSE_WINDOW': {
      const windows = state.windows.filter((w) => w.id !== action.id);
      const wasActive = state.activeId === action.id;
      const next = wasActive ? topVisibleWindow(windows) : null;
      return {
        ...state,
        windows,
        activeId: wasActive ? (next ? next.id : null) : state.activeId,
        peek: state.peek ? state.peek.filter((entry) => entry.id !== action.id) : null,
      };
    }

    case 'SET_WINDOW_TITLE': {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target || target.title === action.title) return state;
      return {
        ...state,
        windows: state.windows.map((w) => (w.id === action.id ? { ...w, title: action.title } : w)),
      };
    }

    case 'SHOW_DESKTOP': {
      if (state.peek) {
        // Second click: bring back exactly what "Show Desktop" hid, in order.
        const hidden = new Map(state.peek.map((entry) => [entry.id, entry.status]));
        const windows = state.windows.map((w) => {
          const status = hidden.get(w.id);
          return status && w.status === 'minimized' ? { ...w, status } : w;
        });
        const next = topVisibleWindow(windows);
        return { ...state, windows, activeId: next ? next.id : null, peek: null, startOpen: false };
      }
      const visible = state.windows.filter((w) => w.status !== 'minimized');
      if (visible.length === 0) return { ...state, startOpen: false };
      return {
        ...state,
        startOpen: false,
        activeId: null,
        peek: visible.map((w) => ({ id: w.id, status: w.status === 'maximized' ? 'maximized' : 'normal' })),
        windows: state.windows.map((w) => (w.status === 'minimized' ? w : { ...w, status: 'minimized' as const })),
      };
    }

    case 'TOGGLE_START':
      return { ...state, startOpen: action.open ?? !state.startOpen };

    case 'OPEN_DIALOG':
      return { ...state, dialog: makeDialog(action.action), startOpen: false };

    case 'MESSAGE':
      return {
        ...state,
        startOpen: false,
        dialog: { action: 'message', ...action.message },
      };

    case 'CLOSE_DIALOG':
      return { ...state, dialog: null };

    case 'SET_SETTINGS': {
      const settings = { ...state.settings, ...action.patch };
      saveSettings(settings);
      configureSfx({ volume: settings.volume, muted: settings.muted });
      return { ...state, settings };
    }

    case 'LOG_OFF':
      writeSessionFlag(false);
      return { ...state, ...SESSION_RESET, phase: 'shutdown', shutdownMode: 'logoff' };

    case 'SHUT_DOWN':
      writeSessionFlag(false);
      return { ...state, ...SESSION_RESET, phase: 'shutdown', shutdownMode: action.mode ?? 'off' };

    case 'SHUTDOWN_DONE':
      if (state.phase !== 'shutdown') return state;
      if (state.shutdownMode === 'logoff') return { ...state, phase: 'login' };
      if (state.shutdownMode === 'restart') return { ...state, phase: 'boot' };
      return state;

    case 'RESTART':
      return { ...state, ...SESSION_RESET, phase: 'boot' };

    case 'SCREENSAVER':
      return {
        ...state,
        startOpen: false,
        screensaver: action.open ? { mode: action.mode ?? null, start: action.start ?? 0 } : null,
      };

    case 'SET_STAGE': {
      const stage = action.stage;
      if (stage.w === state.stage.w && stage.h === state.stage.h) return state;
      const compact = isCompactStage(stage);
      return {
        ...state,
        stage,
        windows: state.windows.map((w) => {
          // Phones and small tablets use full-screen apps, including ones
          // opened before the viewport changed.
          if (compact) {
            return {
              ...w,
              status: w.status === 'minimized' ? w.status : ('maximized' as const),
              prev: w.prev ?? (w.status === 'normal' ? { x: w.x, y: w.y, w: w.w, h: w.h } : undefined),
              ...maximized(stage),
            };
          }
          if (w.status === 'maximized') return { ...w, ...maximized(stage) };
          return { ...w, ...clampGeometry(w, stage, w.minW, w.minH) };
        }),
      };
    }

    case 'NOTIFY': {
      if (!state.settings.notificationsEnabled) return state;
      const id = state.noticeCounter + 1;
      return {
        ...state,
        noticeCounter: id,
        notifications: [...state.notifications, { ...action.notification, id }].slice(-20),
      };
    }

    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'LOVE_RAIN':
      return { ...state, loveRain: state.loveRain + 1, startOpen: false };

    case 'ASSISTANT':
      return { ...state, assistant: action.open };

    default:
      return state;
  }
}

/* ─────────────────────────────── context ───────────────────────────────── */

export interface OsApi {
  state: OsState;
  dispatch: Dispatch<OsAction>;
  openApp: (appId: AppId, payload?: WindowPayload) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  toggleStart: (open?: boolean) => void;
  notify: (notification: Omit<OsNotification, 'id'>) => void;
  message: (request: MessageRequest) => void;
  runEffect: (effect: OsEffect) => void;
}

const OsContext = createContext<OsApi | null>(null);

export function createInitialState(): OsState {
  const settings = loadSettings();
  configureSfx({ volume: settings.volume, muted: settings.muted });
  const stage =
    typeof window === 'undefined'
      ? computeStage(1280, 720, 1)
      : computeStage(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  return {
    phase: readSessionFlag() ? 'desktop' : 'boot',
    shutdownMode: 'off',
    windows: [],
    activeId: null,
    startOpen: false,
    dialog: null,
    settings,
    screensaver: null,
    peek: null,
    loveRain: 0,
    assistant: false,
    counter: 0,
    zCounter: 0,
    notifications: [],
    noticeCounter: 0,
    stage: { w: stage.w, h: stage.h },
  };
}

export function OsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(osReducer, undefined, createInitialState);

  useEffect(() => {
    configureSfx({ volume: state.settings.volume, muted: state.settings.muted });
  }, [state.settings.volume, state.settings.muted]);

  const openApp = useCallback(
    (appId: AppId, payload?: WindowPayload) => dispatch({ type: 'OPEN_APP', appId, payload }),
    []
  );
  const closeWindow = useCallback((id: string) => dispatch({ type: 'CLOSE_WINDOW', id }), []);
  const focusWindow = useCallback((id: string) => dispatch({ type: 'FOCUS_WINDOW', id }), []);
  const minimizeWindow = useCallback((id: string) => dispatch({ type: 'MINIMIZE', id }), []);
  const toggleMaximize = useCallback((id: string) => dispatch({ type: 'TOGGLE_MAXIMIZE', id }), []);
  const toggleStart = useCallback((open?: boolean) => dispatch({ type: 'TOGGLE_START', open }), []);
  const notify = useCallback(
    (notification: Omit<OsNotification, 'id'>) => dispatch({ type: 'NOTIFY', notification }),
    []
  );
  const message = useCallback((request: MessageRequest) => dispatch({ type: 'MESSAGE', message: request }), []);
  const runEffect = useCallback((effect: OsEffect) => {
    if (effect.kind === 'open') dispatch({ type: 'OPEN_APP', appId: effect.appId, payload: effect.payload });
    else if (effect.kind === 'loveRain') dispatch({ type: 'LOVE_RAIN' });
    else dispatch({ type: 'ASSISTANT', open: true });
  }, []);

  const value = useMemo<OsApi>(
    () => ({
      state,
      dispatch,
      openApp,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      toggleStart,
      notify,
      message,
      runEffect,
    }),
    [state, openApp, closeWindow, focusWindow, minimizeWindow, toggleMaximize, toggleStart, notify, message, runEffect]
  );

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOs(): OsApi {
  const ctx = useContext(OsContext);
  if (!ctx) throw new Error('useOs must be used inside <OsProvider>');
  return ctx;
}

export { DEFAULT_SETTINGS };
