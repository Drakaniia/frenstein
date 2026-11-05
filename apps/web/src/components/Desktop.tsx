import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import { Screensaver } from '@/apps/Screensaver/Screensaver';
import { trashStore, useTrash } from '@/apps/Trash/store';
import { CONTENT } from '@/data/content';
import { APPS, DESKTOP_ICONS } from '@/os/apps';
import { useOs } from '@/os/OsProvider';
import { readNumber, readSessionNumber, STORAGE_KEYS, writeNumber, writeSessionNumber } from '@/os/persistence';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { useCoarsePointer, usePrefersReducedMotion } from '@/os/useMedia';
import type { AppId } from '@/os/types';
import { Assistant } from './Assistant';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { DialogHost } from './DialogHost';
import { IconGrid } from './IconGrid';
import { LoveRain } from './LoveRain';
import { NotificationManager } from './NotificationManager';
import { PixelWallpaper } from './PixelWallpaper';
import { StartMenu } from './StartMenu';
import { Taskbar } from './Taskbar';
import { WindowManager } from './WindowManager';

interface MenuState {
  x: number;
  y: number;
  icon?: AppId;
  keyboard?: boolean;
}

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const VIRUS = 'iloveyou';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null);

/**
 * The desktop: animated pixel wallpaper, shortcuts, windows, the taskbar and
 * every desktop-level surprise (balloons, love notes, secret codes, Lovey).
 */
export function Desktop() {
  const { state, dispatch, openApp, toggleStart, notify, message } = useOs();
  const { compact } = useStage();
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const trash = useTrash();
  const [selected, setSelected] = useState(-1);
  const [focused, setFocused] = useState(0);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [birthdaySeen, setBirthdaySeen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef(0);
  const { settings } = state;

  const icons = useMemo<AppId[]>(() => {
    const order = settings.iconOrder.length > 0 ? settings.iconOrder : DESKTOP_ICONS;
    return order.filter((id, index) => order.indexOf(id) === index && id in APPS);
  }, [settings.iconOrder]);

  const iconFor = useCallback((appId: AppId) => (appId === 'trash' ? (trash.length > 0 ? 'bin-full' : 'bin') : APPS[appId].icon), [trash.length]);

  // The present keeps gently bobbing until it has been opened once.
  useEffect(() => {
    if (state.windows.some((w) => w.appId === 'birthday')) setBirthdaySeen(true);
  }, [state.windows]);

  // Focus the first shortcut after logging on so keyboard users start there.
  useEffect(() => {
    const frame = requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  // The birthday balloon and Lovey, once per browser session.
  useEffect(() => {
    if (readSessionNumber(STORAGE_KEYS.welcome) === 1) return;
    // Flags are written when each surprise fires, so a StrictMode re-run or
    // a very quick log-off never swallows them.
    const balloon = window.setTimeout(() => {
      writeSessionNumber(STORAGE_KEYS.welcome, 1);
      notify({
        title: CONTENT.welcomeBalloon.title,
        body: CONTENT.welcomeBalloon.body,
        icon: 'cake',
        actionApp: 'birthday',
        actionLabel: 'Open my present',
        persistent: true,
      });
    }, 1400);
    const assistant = compact
      ? 0
      : window.setTimeout(() => {
          if (readSessionNumber(STORAGE_KEYS.assistant) === 1) return;
          writeSessionNumber(STORAGE_KEYS.assistant, 1);
          dispatch({ type: 'ASSISTANT', open: true });
        }, 7000);
    return () => {
      window.clearTimeout(balloon);
      window.clearTimeout(assistant);
    };
    // Only on the first mount of the desktop.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: Ctrl+Esc opens Start; secret codes typed on the desktop.
  useEffect(() => {
    const konami: string[] = [];
    let typed = '';
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Escape') {
        e.preventDefault();
        toggleStart();
        return;
      }
      const key = e.key.toLowerCase();
      konami.push(key);
      if (konami.length > KONAMI.length) konami.shift();
      if (konami.length === KONAMI.length && konami.every((k, i) => k === KONAMI[i])) {
        konami.length = 0;
        dispatch({ type: 'LOVE_RAIN' });
        notify({ title: CONTENT.konami.title, body: CONTENT.konami.body, icon: 'game' });
        return;
      }
      if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (key.length === 1 && /[a-z]/.test(key)) {
        typed = (typed + key).slice(-VIRUS.length);
        if (typed === VIRUS) {
          typed = '';
          playSfx('exclamation');
          message({ title: CONTENT.virus.title, message: CONTENT.virus.message, icon: 'warning', confirmLabel: CONTENT.virus.confirm, then: { kind: 'loveRain' } });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, notify, message, toggleStart]);

  // Idle → screen saver. Any input resets it; dialogs and reduced motion suppress it.
  useEffect(() => {
    if (reduced || !settings.screensaverEnabled || state.screensaver) return;
    const reset = () => {
      window.clearTimeout(idleTimer.current);
      if (state.dialog) return;
      idleTimer.current = window.setTimeout(() => dispatch({ type: 'SCREENSAVER', open: true }), settings.idleMs);
    };
    reset();
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer.current);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [reduced, settings.screensaverEnabled, settings.idleMs, state.screensaver, state.dialog, dispatch]);

  const showLoveNote = () => {
    const notes = CONTENT.loveNotes;
    const index = readNumber(STORAGE_KEYS.loveNote, 0) % notes.length;
    writeNumber(STORAGE_KEYS.loveNote, index + 1);
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    notify({ title: `Love note #${index + 1}`, body: notes[index] as string, icon: 'tray-heart' });
  };

  const arrange = () => {
    const sorted = [...DESKTOP_ICONS].sort((a, b) => APPS[a].shortcut.localeCompare(APPS[b].shortcut));
    dispatch({ type: 'SET_SETTINGS', patch: { iconOrder: sorted } });
    setSelected(-1);
    setFocused(0);
  };

  const openIcon = (appId: AppId) => {
    playSfx('navigate');
    openApp(appId);
  };

  const desktopMenu: ContextMenuItem[] = [
    { id: 'arrange', label: 'Arrange Icons By Name', onSelect: arrange },
    { id: 'reset', label: 'Reset Icon Layout', onSelect: () => dispatch({ type: 'SET_SETTINGS', patch: { iconOrder: [...DESKTOP_ICONS] } }) },
    {
      id: 'refresh',
      label: 'Refresh',
      onSelect: () => {
        playSfx('click');
        setRefresh((n) => n + 1);
      },
    },
    { id: 's1', separator: true },
    {
      id: 'labels',
      label: 'Show Icon Labels',
      checked: settings.showLabels,
      onSelect: () => dispatch({ type: 'SET_SETTINGS', patch: { showLabels: !settings.showLabels } }),
    },
    {
      id: 'motion',
      label: 'Animated Wallpaper',
      checked: settings.wallpaperMotion,
      onSelect: () => dispatch({ type: 'SET_SETTINGS', patch: { wallpaperMotion: !settings.wallpaperMotion } }),
    },
    { id: 's2', separator: true },
    { id: 'love', label: 'Make It Rain Hearts', icon: 'heart', onSelect: () => dispatch({ type: 'LOVE_RAIN' }) },
    { id: 'note', label: 'Read a Love Note', icon: 'tray-heart', onSelect: showLoveNote },
    { id: 's3', separator: true },
    { id: 'props', label: 'Properties', onSelect: () => openApp('settings', 'desktop') },
  ];

  const iconMenu = (appId: AppId): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [{ id: 'open', label: 'Open', bold: true, onSelect: () => openIcon(appId) }];
    if (appId === 'trash') {
      items.push(
        { id: 's0', separator: true },
        {
          id: 'empty',
          label: 'Empty Recycle Bin',
          disabled: trash.length === 0,
          disabledReason: 'The Recycle Bin is already empty.',
          onSelect: () => {
            playSfx('recycle');
            trashStore.set([]);
            notify({ title: 'Recycle Bin emptied', body: CONTENT.trashEmptyLine, icon: 'bin' });
          },
        }
      );
    }
    if (appId === 'mycomputer') items.push({ id: 'explore', label: 'Explore', onSelect: () => openIcon('mycomputer') });
    items.push(
      { id: 's1', separator: true },
      {
        id: 'props',
        label: 'Properties',
        onSelect: () => {
          if (appId === 'mycomputer') {
            dispatch({ type: 'OPEN_DIALOG', action: 'about' });
            return;
          }
          const def = APPS[appId];
          message({
            title: `${def.shortcut} Properties`,
            icon: appId === 'birthday' || appId === 'notepad' ? 'heart' : 'info',
            message: `${def.label}\n${def.description}.\n\nLocation: C:\\Documents and Settings\\${CONTENT.user.name}\\Desktop\nMade with love, especially for you.`,
          });
        },
      }
    );
    return items;
  };

  const onDesktopContext = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.target as Element;
    if (el.closest('.window, .icon-cell, .taskbar, .start-menu, .menu-popup, .balloon, .assistant')) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
    if (state.startOpen) toggleStart(false);
  };

  const dim = state.dialog?.action === 'shutdown' || state.dialog?.action === 'logoff';
  const animateWallpaper = settings.wallpaperMotion && !reduced && !state.screensaver;

  return (
    <div className="desktop-root fade-in" data-assistant={state.assistant ? 'true' : undefined}>
      <div className="desktop-dim" data-dim={dim ? 'true' : undefined}>
        <div className="desktop" onContextMenu={onDesktopContext}>
          <PixelWallpaper
            scene={settings.wallpaper}
            animate={animateWallpaper}
            lite={compact}
            onPointerDown={() => {
              setSelected(-1);
              setMenu(null);
            }}
            onWish={() => {
              playSfx('sparkle');
              notify({ title: CONTENT.wish.title, body: CONTENT.wish.body, icon: 'heart' });
            }}
          />

          <IconGrid
            key={refresh}
            items={icons}
            selectedIndex={selected}
            focusedIndex={focused}
            gridRef={gridRef}
            showLabels={settings.showLabels}
            iconSize={settings.iconSize}
            coarse={coarse}
            iconFor={iconFor}
            pulse={birthdaySeen ? null : 'birthday'}
            onSelect={setSelected}
            onFocus={setFocused}
            onOpen={openIcon}
            onContextMenu={(appId, event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenu({ x: event.clientX, y: event.clientY, icon: appId });
            }}
          />

          <WindowManager />
        </div>

        <Taskbar onHeart={showLoveNote} />
      </div>

      {state.startOpen ? <StartMenu onClose={() => toggleStart(false)} /> : null}

      {menu ? (
        <ContextMenu
          clientX={menu.x}
          clientY={menu.y}
          keyboard={menu.keyboard}
          items={menu.icon ? iconMenu(menu.icon) : desktopMenu}
          label={menu.icon ? `${APPS[menu.icon].shortcut} menu` : 'Desktop menu'}
          onClose={() => setMenu(null)}
        />
      ) : null}

      <LoveRain trigger={state.loveRain} />
      <NotificationManager />
      {state.assistant ? <Assistant onClose={() => dispatch({ type: 'ASSISTANT', open: false })} /> : null}

      {state.screensaver ? (
        <Screensaver
          mode={state.screensaver.mode ?? settings.screensaver}
          start={state.screensaver.start}
          onDismiss={() => dispatch({ type: 'SCREENSAVER', open: false })}
        />
      ) : null}

      <DialogHost />
    </div>
  );
}
