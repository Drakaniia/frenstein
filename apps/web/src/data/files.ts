/**
 * The virtual file system behind My Computer and My Documents. Nothing here
 * touches the real disk: text files open in Notepad, pictures in the viewer,
 * and programs open their windows.
 */

import type { AppId, MessageIcon, WindowPayload } from '@/os/types';
import { CONTENT } from './content';
import { LETTER_TEXT } from './letter';
import { PHOTOS } from './photos';

export type FsKind = 'folder' | 'drive' | 'file' | 'app';
export type FsGroup = 'files' | 'drives' | 'removable';

export interface FsNode {
  id: string;
  name: string;
  kind: FsKind;
  /** Explorer "Type" column. */
  type: string;
  size: string;
  icon: string;
  /** Section on the My Computer page. */
  group?: FsGroup;
  /** Program opened by the node. */
  app?: AppId;
  payload?: WindowPayload;
  /** A text document opened in Notepad. */
  document?: { name: string; text: string };
  /** Shown instead of opening (an empty floppy drive, a locked file). */
  alert?: { title: string; message: string; icon: MessageIcon };
  /** Drive capacity, for the usage bar. */
  usage?: { percent: number; free: string; total: string };
  modified?: string;
  children?: FsNode[];
}

const text = (id: string, name: string, body: string, size = '1 KB', modified = '06/11/2026'): FsNode => ({
  id,
  name,
  kind: 'file',
  type: 'Text Document',
  size,
  icon: 'txt',
  modified,
  document: { name, text: body },
});

const folder = (id: string, name: string, children: FsNode[], icon = 'folder'): FsNode => ({
  id,
  name,
  kind: 'folder',
  type: 'File Folder',
  size: '',
  icon,
  children,
});

/* ─────────────────────────────── documents ───────────────────────────── */

const README = `Welcome to ${CONTENT.osName} ${CONTENT.edition}
=============================================

This little computer lives entirely in your browser, and it was made
just for you.

  - Double-click the icons on the desktop to open things.
  - Drag windows by their blue title bars; resize them from any edge.
  - Right-click the desktop for a few extra options.
  - Start -> Control Panel lets you change the wallpaper and colours.
  - Start -> Help and Support lists every hidden surprise.

Nothing here touches your real files.
`;

const AUTOEXEC = `@ECHO OFF
SET PATH=C:\\WINDOWS;C:\\WINDOWS\\COMMAND
SET HEART=FULL
LOADHIGH C:\\WINDOWS\\HUGS.SYS
ECHO Good morning, ${CONTENT.user.name}.
`;

const SYSTEM_INI = `[boot]
shell=frenos.exe
owner=${CONTENT.user.name}
wallpaper=sunset_meadow.bmp

[love]
level=infinite
distance=irrelevant
`;

const HEART_NOTES = `Things worth keeping
====================

A quiet morning.
The smell of rain on warm pavement.
A song that arrives at exactly the right moment.
Someone who listens.

This file is yours. Edit it, save a copy, keep what matters.
`;

const numbered = (title: string, lines: readonly string[]) =>
  `${title}\n${'='.repeat(title.length)}\n\n${lines.map((line, i) => `${String(i + 1).padStart(2, ' ')}. ${line}`).join('\n')}\n`;

const COUPONS = `LOVE COUPONS
============
Valid forever. No expiry date. Present to the boyfriend for redemption.

${CONTENT.coupons.map((c, i) => `[ #${String(i + 1).padStart(2, '0')} ]  ${c}`).join('\n\n')}
`;

const forHer = folder(
  'for-her',
  `${CONTENT.user.name} ♥`,
  [
    text('reasons', 'Reasons I Love You.txt', numbered('Reasons I love you', CONTENT.reasons)),
    text('coupons', 'Love Coupons.txt', COUPONS),
    text('wish', 'A Wish For You.txt', CONTENT.wishText.join('\n')),
    {
      id: 'present',
      name: 'Your Present.exe',
      kind: 'app',
      type: 'Application',
      size: '2,306 KB',
      icon: 'gift',
      app: 'birthday',
      modified: '06/11/2026',
    },
  ],
  'folder-heart'
);

const pictures: FsNode = {
  id: 'pictures',
  name: 'My Pictures',
  kind: 'app',
  type: 'File Folder',
  size: '',
  icon: 'pictures',
  app: 'photos',
};

const music: FsNode = {
  id: 'music',
  name: 'My Music',
  kind: 'app',
  type: 'File Folder',
  size: '',
  icon: 'music-folder',
  app: 'music',
};

export const DOCUMENTS: FsNode = folder('documents', 'My Documents', [
  pictures,
  music,
  folder('drafts', 'Drafts', [text('draft-note', 'note-to-self.txt', 'Buy more pixels.\nWater the meadow.\nWatch the sunset with her.\n')]),
  text('letter', 'Letter.txt', LETTER_TEXT, '4 KB'),
  text('heart-notes', 'hearts.txt', HEART_NOTES),
]);

const SHARED: FsNode = folder('shared', 'Shared Documents', [forHer, text('shared-readme', 'Read Me First.txt', README, '2 KB')]);

const photoFiles: FsNode[] = PHOTOS.map((photo, index) => ({
  id: `photo-${index}`,
  name: photo.filename,
  kind: 'file',
  type: 'JPEG Image',
  size: `${640 + ((index * 137) % 900)} KB`,
  icon: 'photo',
  app: 'viewer',
  payload: index,
  modified: '06/11/2026',
}));

const driveC: FsNode = {
  id: 'drive-c',
  name: 'Local Disk (C:)',
  kind: 'drive',
  type: 'Local Disk',
  size: CONTENT.myComputer.capacity,
  icon: 'drive',
  group: 'drives',
  usage: { percent: CONTENT.myComputer.usedPercent, free: CONTENT.myComputer.freeSpace, total: CONTENT.myComputer.capacity },
  children: [
    folder('docs-settings', 'Documents and Settings', [folder('user-folder', CONTENT.user.name, [DOCUMENTS, SHARED])]),
    folder('program-files', 'Program Files', [
      folder('pf-music', 'Music', [{ id: 'music-exe', name: 'Music.exe', kind: 'app', type: 'Application', size: '1,024 KB', icon: 'fienamp', app: 'music' }]),
      folder('pf-hearts', 'Heart Catcher', [{ id: 'hearts-exe', name: 'HeartCatcher.exe', kind: 'app', type: 'Application', size: '48 KB', icon: 'game', app: 'hearts' }]),
      folder('pf-frenos', 'FrenOS', [text('pf-readme', 'README.txt', README, '2 KB'), text('system-ini', 'SYSTEM.INI', SYSTEM_INI)]),
    ]),
    folder('windows', 'WINDOWS', [
      {
        id: 'hugs-sys',
        name: 'HUGS.SYS',
        kind: 'file',
        type: 'System file',
        size: '∞ KB',
        icon: 'txt',
        alert: { title: 'HUGS.SYS', icon: 'heart', message: 'This file cannot be opened. Hugs only work in person.\nPlease redeem one at your earliest convenience.' },
      },
      {
        id: 'love-dll',
        name: 'LOVE.DLL',
        kind: 'file',
        type: 'Application Extension',
        size: '2,306 KB',
        icon: 'txt',
        alert: { title: 'LOVE.DLL', icon: 'info', message: 'LOVE.DLL is in use by every program on this computer and cannot be opened.' },
      },
    ]),
    text('autoexec', 'AUTOEXEC.BAT', AUTOEXEC),
  ],
};

const floppy: FsNode = {
  id: 'drive-a',
  name: '3½ Floppy (A:)',
  kind: 'drive',
  type: '3½-Inch Floppy Disk',
  size: '',
  icon: 'floppy',
  group: 'removable',
  alert: { title: 'Insert disk', icon: 'warning', message: 'Please insert a disk into drive A:.\n\n(Or just insert yourself into my arms.)' },
};

const memories: FsNode = {
  id: 'drive-d',
  name: 'Memories (D:)',
  kind: 'drive',
  type: 'CD Drive',
  size: '650 MB',
  icon: 'cd',
  group: 'removable',
  usage: { percent: 100, free: '0 bytes', total: '650 MB' },
  children: photoFiles,
};

export const FS_ROOT: FsNode = {
  id: 'root',
  name: 'My Computer',
  kind: 'folder',
  type: 'System Folder',
  size: '',
  icon: 'computer',
  children: [
    { ...SHARED, group: 'files' },
    { ...DOCUMENTS, name: `${CONTENT.user.name}'s Documents`, group: 'files' },
    driveC,
    floppy,
    memories,
  ],
};

/** Path ids from the root to well-known places. */
export const PLACES = {
  myComputer: [] as string[],
  documents: ['drive-c', 'docs-settings', 'user-folder', 'documents'],
  shared: ['drive-c', 'docs-settings', 'user-folder', 'shared'],
  forHer: ['drive-c', 'docs-settings', 'user-folder', 'shared', 'for-her'],
  driveC: ['drive-c'],
  memories: ['drive-d'],
};

export function findPath(root: FsNode, id: string, trail: string[] = []): string[] | null {
  for (const child of root.children ?? []) {
    const path = [...trail, child.id];
    if (child.id === id) return path;
    const hit = findPath(child, id, path);
    if (hit) return hit;
  }
  return null;
}

/**
 * Resolve an id path against the tree. My Computer's shortcut entries
 * ("Shared Documents", "X's Documents") resolve through their real location.
 */
export function resolvePath(ids: readonly string[]): FsNode[] {
  const nodes: FsNode[] = [FS_ROOT];
  let cursor = FS_ROOT;
  for (const id of ids) {
    const child = (cursor.children ?? []).find((node) => node.id === id);
    if (!child) break;
    nodes.push(child);
    cursor = child;
  }
  return nodes;
}

/** A readable Windows path for the address bar. */
export function addressFor(nodes: readonly FsNode[]): string {
  if (nodes.length <= 1) return 'My Computer';
  const last = nodes[nodes.length - 1] as FsNode;
  if (last.id === 'documents' || last.id === 'shared' || last.id === 'for-her') {
    const tail = nodes.slice(nodes.findIndex((n) => n.id === 'documents' || n.id === 'shared'));
    return tail.map((n) => n.name).join('\\');
  }
  const drive = nodes[1] as FsNode;
  const letter = drive.name.match(/\(([A-Z]:)\)/)?.[1] ?? drive.name;
  const rest = nodes.slice(2).map((n) => n.name);
  return [letter, ...rest].join('\\') + (rest.length === 0 ? '\\' : '');
}
