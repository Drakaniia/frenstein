/**
 * OS data model. Pure types only — no React, no DOM.
 */

export type AppId =
  | 'mycomputer'
  | 'mydocuments'
  | 'photos'
  | 'viewer'
  | 'music'
  | 'notepad'
  | 'hearts'
  | 'birthday'
  | 'trash'
  | 'settings'
  | 'help'
  | 'screensaver'
  | 'about'
  | 'run';

export type WindowStatus = 'normal' | 'minimized' | 'maximized';

export interface WindowGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** App-specific opener payload (the viewer's photo index, a settings tab, …). */
export type WindowPayload = number | string;

export interface WindowState extends WindowGeometry {
  /** `${appId}:${counter}` — lets a viewer sit alongside the folder. */
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  minW: number;
  minH: number;
  z: number;
  resizable: boolean;
  status: WindowStatus;
  /** Restore geometry after maximize. */
  prev?: WindowGeometry;
  payload?: WindowPayload;
  /** Bumped when an already-open app is asked to open with a new payload. */
  payloadRev: number;
}

export type OsPhase = 'boot' | 'login' | 'desktop' | 'shutdown';

/** What the shutdown sequence ends in. */
export type ShutdownMode = 'off' | 'restart' | 'logoff';

export type DialogAction = 'about' | 'logoff' | 'shutdown' | 'run' | 'message';

export type MessageIcon = 'info' | 'warning' | 'error' | 'question' | 'heart';

/** Side effects a dialog or Run command may ask the shell to perform. */
export type OsEffect =
  | { kind: 'open'; appId: AppId; payload?: WindowPayload }
  | { kind: 'loveRain' }
  | { kind: 'assistant' };

export interface DialogState {
  action: DialogAction;
  title: string;
  message: string;
  icon?: MessageIcon;
  confirmLabel?: string;
  /** Optional effect fired when a message box is confirmed. */
  then?: OsEffect;
}

export type WallpaperId = 'sunset' | 'bliss' | 'nightfall' | 'sakura';
export type ThemeId = 'blue' | 'olive' | 'silver' | 'rose';
export type ScreensaverId = 'slideshow' | 'hearts' | 'starfield';
export type IconSize = 'small' | 'medium' | 'large';

export interface Settings {
  /** Master output level, 0–100. */
  volume: number;
  muted: boolean;
  /** FrenOS XP cursor set instead of the system cursors. */
  cursorEnabled: boolean;
  clock24h: boolean;
  wallpaper: WallpaperId;
  /** Animate the pixel-art wallpaper (off = a still frame, saves battery). */
  wallpaperMotion: boolean;
  theme: ThemeId;
  iconSize: IconSize;
  showLabels: boolean;
  screensaverEnabled: boolean;
  screensaver: ScreensaverId;
  idleMs: number;
  notificationsEnabled: boolean;
  notificationMs: number;
  /** Ordering of desktop shortcuts, persisted across refreshes. */
  iconOrder: AppId[];
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 60,
  muted: false,
  cursorEnabled: true,
  clock24h: false,
  wallpaper: 'sunset',
  wallpaperMotion: true,
  theme: 'blue',
  iconSize: 'medium',
  showLabels: true,
  screensaverEnabled: true,
  screensaver: 'slideshow',
  idleMs: 120_000,
  notificationsEnabled: true,
  notificationMs: 9_000,
  iconOrder: [],
};

export const ICON_PIXELS: Record<IconSize, number> = {
  small: 24,
  medium: 32,
  large: 48,
};

/** A transient tray balloon. */
export interface OsNotification {
  id: number;
  title: string;
  body: string;
  icon: string;
  /** Optional app opened by the balloon's action. */
  actionApp?: AppId;
  actionPayload?: WindowPayload;
  actionLabel?: string;
  /** Important notifications do not auto-dismiss. */
  persistent?: boolean;
}
