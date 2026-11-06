/**
 * Start → Run… command resolution. Real program names open apps; a few
 * words open surprises; everything else gets the classic XP error.
 */

import { CONTENT } from '@/data/content';
import type { MessageRequest } from './OsProvider';
import type { AppId, OsEffect, WindowPayload } from './types';

export type RunResult =
  | { kind: 'open'; appId: AppId; payload?: WindowPayload }
  | { kind: 'effect'; effect: OsEffect; message?: MessageRequest }
  | { kind: 'dialog'; action: 'about' | 'shutdown' | 'logoff' }
  | { kind: 'message'; message: MessageRequest }
  | { kind: 'none' };

const OPEN: Record<string, { appId: AppId; payload?: WindowPayload }> = {
  notepad: { appId: 'notepad' },
  'notepad.exe': { appId: 'notepad' },
  letter: { appId: 'notepad' },
  'love letter': { appId: 'notepad' },
  'letter.txt': { appId: 'notepad' },
  winamp: { appId: 'music' },
  fienamp: { appId: 'music' },
  music: { appId: 'music' },
  wmplayer: { appId: 'music' },
  seven: { appId: 'music', payload: 'seven' },
  lover: { appId: 'music', payload: 'lover' },
  enchanted: { appId: 'music', payload: 'enchanted' },
  'the only exception': { appId: 'music', payload: 'the-only-exception' },
  paramore: { appId: 'music', payload: 'the-only-exception' },
  'taylor swift': { appId: 'music', payload: 'lover' },
  explorer: { appId: 'mycomputer' },
  'explorer.exe': { appId: 'mycomputer' },
  'my computer': { appId: 'mycomputer' },
  mycomputer: { appId: 'mycomputer' },
  'c:': { appId: 'mycomputer', payload: 'drive-c' },
  'c:\\': { appId: 'mycomputer', payload: 'drive-c' },
  documents: { appId: 'mydocuments' },
  'my documents': { appId: 'mydocuments' },
  pictures: { appId: 'photos' },
  photos: { appId: 'photos' },
  'my pictures': { appId: 'photos' },
  mspaint: { appId: 'photos' },
  control: { appId: 'settings' },
  'control panel': { appId: 'settings' },
  'desk.cpl': { appId: 'settings', payload: 'desktop' },
  'timedate.cpl': { appId: 'settings', payload: 'datetime' },
  'mmsys.cpl': { appId: 'settings', payload: 'sounds' },
  help: { appId: 'help' },
  winhelp: { appId: 'help' },
  hh: { appId: 'help' },
  secrets: { appId: 'help', payload: 'secrets' },
  cake: { appId: 'birthday' },
  birthday: { appId: 'birthday' },
  'happy birthday': { appId: 'birthday' },
  party: { appId: 'birthday' },
  wish: { appId: 'birthday' },
  hearts: { appId: 'hearts' },
  mshearts: { appId: 'hearts' },
  game: { appId: 'hearts' },
  'heart catcher': { appId: 'hearts' },
  recycle: { appId: 'trash' },
  trash: { appId: 'trash' },
  'recycle bin': { appId: 'trash' },
  screensaver: { appId: 'screensaver' },
  'ssmypics.scr': { appId: 'screensaver' },
};

const LOVE_WORDS = new Set(['love', 'iloveyou', 'i love you', 'love-letter-for-you.txt.vbs', 'te amo', 'mahal kita']);

export function resolveRun(input: string): RunResult {
  const text = input.trim();
  const key = text.toLowerCase().replace(/\s+/g, ' ');
  if (!key) return { kind: 'none' };

  const open = OPEN[key];
  if (open) return { kind: 'open', ...open };

  if (LOVE_WORDS.has(key)) return { kind: 'effect', effect: { kind: 'loveRain' } };
  if (key === 'lovey' || key === 'clippy' || key === 'assistant') return { kind: 'effect', effect: { kind: 'assistant' } };
  if (key === 'winver' || key === 'about') return { kind: 'dialog', action: 'about' };
  if (key === 'shutdown' || key === 'shutdown -s') return { kind: 'dialog', action: 'shutdown' };
  if (key === 'logoff' || key === 'shutdown -l') return { kind: 'dialog', action: 'logoff' };

  const name = CONTENT.user.name.toLowerCase();
  if (key === name || key === 'mi amor' || key === 'fren' || key === 'frenstein' || key === 'my love') {
    return {
      kind: 'effect',
      effect: { kind: 'loveRain' },
      message: {
        title: 'Found it!',
        icon: 'heart',
        message: 'That is the most important program on this computer. It has been running in my heart since the day we met.',
      },
    };
  }

  const reply = (title: string, message: string, icon: MessageRequest['icon'] = 'info'): RunResult => ({
    kind: 'message',
    message: { title, message, icon },
  });

  switch (key) {
    case 'calc':
    case 'calc.exe':
    case 'calculator':
      return reply('Calculator', 'No calculator needed: you + me = forever.');
    case 'cmd':
    case 'cmd.exe':
    case 'command':
    case 'command.com':
      return reply('C:\\WINDOWS\\system32\\cmd.exe', 'C:\\> Bad command or file name.\nDid you mean: love?', 'warning');
    case 'regedit':
      return reply('Registry Editor', 'Registry editing has been disabled by your boyfriend. Everything here is already set to "perfect".', 'warning');
    case 'taskmgr':
      return reply('FrenOS Task Manager', '1 process running: missing_you.exe (100% CPU). It cannot be ended.');
    case 'format c:':
    case 'format':
      return reply('Format Local Disk (C:)', 'Nice try. These memories are write-protected.', 'error');
    case 'ping':
      return reply('Ping', 'Reply from your heart: bytes=32 time<1ms TTL=forever');
    case 'iexplore':
    case 'internet explorer':
      return reply('Internet Explorer', 'Everything worth finding is already on this computer.');
  }

  return {
    kind: 'message',
    message: {
      title: text,
      icon: 'error',
      message: `FrenOS cannot find '${text}'. Make sure you typed the name correctly, and then try again. To search for a file, click Start, and then click Help and Support.`,
    },
  };
}
