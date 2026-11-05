import { CHROME } from './useChrome';
import type { AppId } from './types';

export interface AppDef {
  id: AppId;
  /** Program name (Start menu, All Programs, Run). */
  label: string;
  /** Desktop shortcut label. */
  shortcut: string;
  /** Start menu subtitle for pinned entries. */
  description: string;
  /** Default window caption (apps may rename their window at runtime). */
  title: string;
  /** Icon registry name (see `lib/icons`). */
  icon: string;
  /** `false` for overlays/dialogs that are not windows (Screensaver, About, Run). */
  windowed: boolean;
  resizable: boolean;
  /** Only one window of this app may be open (re-opening focuses it). */
  single: boolean;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

const app = (def: Omit<AppDef, 'single'> & { single?: boolean }): AppDef => ({ single: true, ...def });

/** Default geometry, in logical stage px. */
export const APPS: Record<AppId, AppDef> = {
  mycomputer: app({
    id: 'mycomputer',
    label: 'My Computer',
    shortcut: 'My Computer',
    description: 'Browse drives and folders',
    title: 'My Computer',
    icon: 'computer',
    windowed: true,
    resizable: true,
    w: 640,
    h: 440,
    minW: 300,
    minH: 240,
  }),
  mydocuments: app({
    id: 'mydocuments',
    label: 'My Documents',
    shortcut: 'My Documents',
    description: 'Letters, notes and secrets',
    title: 'My Documents',
    icon: 'documents',
    windowed: true,
    resizable: true,
    w: 620,
    h: 430,
    minW: 300,
    minH: 240,
  }),
  photos: app({
    id: 'photos',
    label: 'My Pictures',
    shortcut: 'My Pictures',
    description: 'Our favourite moments',
    title: 'My Pictures',
    icon: 'pictures',
    windowed: true,
    resizable: true,
    w: 640,
    h: 450,
    minW: 300,
    minH: 260,
  }),
  viewer: app({
    id: 'viewer',
    label: 'Picture Viewer',
    shortcut: 'Picture Viewer',
    description: 'Look at one photo up close',
    title: 'Picture Viewer',
    icon: 'photo',
    windowed: true,
    resizable: true,
    w: 580,
    h: 470,
    minW: 300,
    minH: 280,
  }),
  music: app({
    id: 'music',
    label: 'Music',
    shortcut: 'Music',
    description: 'Play our songs',
    title: 'Music',
    icon: 'fienamp',
    windowed: true,
    resizable: true,
    w: 430,
    h: 480,
    minW: 290,
    minH: 400,
  }),
  notepad: app({
    id: 'notepad',
    label: 'Notepad',
    shortcut: 'Love Letter',
    description: 'A letter, just for you',
    title: 'Letter.txt - Notepad',
    icon: 'letter',
    windowed: true,
    resizable: true,
    w: 580,
    h: 450,
    minW: 260,
    minH: 200,
  }),
  hearts: app({
    id: 'hearts',
    label: 'Heart Catcher',
    shortcut: 'Heart Catcher',
    description: 'Catch hearts, keep memories',
    title: 'Heart Catcher',
    icon: 'game',
    windowed: true,
    resizable: true,
    w: 540,
    h: 500,
    minW: 290,
    minH: 380,
  }),
  birthday: app({
    id: 'birthday',
    label: 'Happy Birthday!',
    shortcut: 'Happy Birthday!',
    description: 'Make a wish',
    title: 'Happy Birthday!',
    icon: 'cake',
    windowed: true,
    resizable: true,
    w: 560,
    h: 500,
    minW: 290,
    minH: 400,
  }),
  trash: app({
    id: 'trash',
    label: 'Recycle Bin',
    shortcut: 'Recycle Bin',
    description: 'Things we let go of',
    title: 'Recycle Bin',
    icon: 'bin-full',
    windowed: true,
    resizable: true,
    w: 600,
    h: 400,
    minW: 300,
    minH: 240,
  }),
  settings: app({
    id: 'settings',
    label: 'Control Panel',
    shortcut: 'Control Panel',
    description: 'Make this computer yours',
    title: 'Control Panel',
    icon: 'control',
    windowed: true,
    resizable: true,
    w: 470,
    h: 520,
    minW: 290,
    minH: 420,
  }),
  help: app({
    id: 'help',
    label: 'Help and Support',
    shortcut: 'Help and Support',
    description: 'Tips, tricks and secrets',
    title: 'Help and Support Center',
    icon: 'help',
    windowed: true,
    resizable: true,
    w: 660,
    h: 470,
    minW: 290,
    minH: 300,
  }),
  screensaver: app({
    id: 'screensaver',
    label: 'Screen Saver',
    shortcut: 'Screen Saver',
    description: 'A little slideshow',
    title: 'Screen Saver',
    icon: 'saver',
    windowed: false,
    resizable: false,
    w: 0,
    h: 0,
    minW: 0,
    minH: 0,
  }),
  about: app({
    id: 'about',
    label: 'About FrenOS',
    shortcut: 'About FrenOS',
    description: 'Version and credits',
    title: 'About FrenOS XP',
    icon: 'info',
    windowed: false,
    resizable: false,
    w: 0,
    h: 0,
    minW: 0,
    minH: 0,
  }),
  run: app({
    id: 'run',
    label: 'Run...',
    shortcut: 'Run',
    description: 'Open a program by name',
    title: 'Run',
    icon: 'run',
    windowed: false,
    resizable: false,
    w: 0,
    h: 0,
    minW: 0,
    minH: 0,
  }),
};

/** Default desktop shortcut order (column-first, top-left). */
export const DESKTOP_ICONS: AppId[] = [
  'mycomputer',
  'mydocuments',
  'birthday',
  'notepad',
  'photos',
  'music',
  'hearts',
  'trash',
];

/** Start menu "All Programs" list. */
export const PROGRAM_APPS: AppId[] = ['birthday', 'notepad', 'music', 'photos', 'hearts', 'mycomputer', 'help', 'settings'];

export const TASKBAR_H = CHROME.taskbarH;
export const WIN_MIN_VISIBLE = 40;
