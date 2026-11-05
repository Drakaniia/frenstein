import { useEffect, useRef, useState } from 'react';

import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { formatFullDate, formatTime, useClock } from '@/os/useClock';
import { useCoarsePointer } from '@/os/useMedia';
import type { WindowState } from '@/os/types';
import { ContextMenu } from './ContextMenu';
import { Checkbox, Range } from './controls';
import { Icon } from './Icon';

interface TaskbarProps {
  /** The heart in the tray was clicked. */
  onHeart: () => void;
}

/**
 * The Luna taskbar: the green start button, Quick Launch, one button per
 * window, and the notification area (love notes, volume, clock).
 */
export function Taskbar({ onHeart }: TaskbarProps) {
  const { state, dispatch, toggleStart, focusWindow, minimizeWindow, toggleMaximize, closeWindow, openApp } = useOs();
  const { compact } = useStage();
  const coarse = useCoarsePointer();
  const now = useClock();
  const { settings } = state;
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [taskMenu, setTaskMenu] = useState<{ win: WindowState; x: number; y: number } | null>(null);

  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <button
        type="button"
        className="start-btn"
        data-start-button
        aria-haspopup="menu"
        aria-expanded={state.startOpen}
        aria-label="Start"
        onClick={() => {
          playSfx('click');
          toggleStart();
        }}
      >
        <Icon name="logo-20" size={20} />
        <span className="start-label">start</span>
      </button>

      {!compact ? (
        <div className="quick-launch" role="group" aria-label="Quick Launch">
          <button type="button" className="ql-btn" title="Show Desktop" aria-label="Show Desktop" onClick={() => dispatch({ type: 'SHOW_DESKTOP' })}>
            <Icon name="showdesktop" size={16} />
          </button>
          <button type="button" className="ql-btn" title="Music" aria-label="Music" onClick={() => openApp('music')}>
            <Icon name="fienamp" size={16} />
          </button>
          <button type="button" className="ql-btn" title="Love Letter" aria-label="Love Letter" onClick={() => openApp('notepad')}>
            <Icon name="letter" size={16} />
          </button>
        </div>
      ) : null}

      <div className="taskbar-tasks">
        {state.windows.map((win) => {
          const active = state.activeId === win.id;
          const minimized = win.status === 'minimized';
          return (
            <button
              key={win.id}
              type="button"
              className="task-btn"
              aria-current={active}
              title={win.title}
              aria-label={`${win.title}${minimized ? ', minimized' : active ? ', active' : ''}`}
              onClick={() => {
                if (active) {
                  playSfx('minimize');
                  minimizeWindow(win.id);
                } else {
                  if (minimized) playSfx('maximize');
                  focusWindow(win.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setTaskMenu({ win, x: e.clientX, y: e.clientY });
              }}
            >
              <Icon name={win.icon} size={16} />
              <span className="task-btn-text">{win.title}</span>
            </button>
          );
        })}
      </div>

      <div className="tray">
        <button type="button" className="tray-btn tray-heart" title="A little note for you" aria-label="A little note for you" onClick={onHeart}>
          <Icon name="tray-heart" size={16} />
        </button>
        <button
          type="button"
          className="tray-btn"
          title={settings.muted ? 'Volume (muted)' : `Volume ${settings.volume}%`}
          aria-label="Volume"
          aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((v) => !v)}
        >
          <Icon name={settings.muted || settings.volume === 0 ? 'tray-muted' : 'tray-volume'} size={16} />
        </button>
        <button
          type="button"
          className="tray-clock"
          title={formatFullDate(now)}
          aria-label={`Clock, ${formatFullDate(now)}. Double-click for Date and Time.`}
          onDoubleClick={() => openApp('settings', 'datetime')}
          onClick={() => {
            if (coarse) openApp('settings', 'datetime');
          }}
        >
          {formatTime(now, settings.clock24h)}
        </button>
        {volumeOpen ? <VolumePopup onClose={() => setVolumeOpen(false)} /> : null}
      </div>

      {taskMenu ? (
        <ContextMenu
          clientX={taskMenu.x}
          clientY={taskMenu.y}
          label={`${taskMenu.win.title} menu`}
          onClose={() => setTaskMenu(null)}
          items={[
            { id: 'restore', label: 'Restore', disabled: taskMenu.win.status === 'normal', onSelect: () => focusWindow(taskMenu.win.id) },
            { id: 'min', label: 'Minimize', disabled: taskMenu.win.status === 'minimized', onSelect: () => minimizeWindow(taskMenu.win.id) },
            {
              id: 'max',
              label: 'Maximize',
              disabled: taskMenu.win.status === 'maximized' || !taskMenu.win.resizable || compact,
              onSelect: () => {
                focusWindow(taskMenu.win.id);
                toggleMaximize(taskMenu.win.id);
              },
            },
            { id: 'sep', separator: true },
            { id: 'close', label: 'Close', bold: true, onSelect: () => closeWindow(taskMenu.win.id) },
          ]}
        />
      ) : null}
    </div>
  );
}

/** The little XP volume pop-up above the tray. */
function VolumePopup({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useOs();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { volume, muted } = state.settings;

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (ref.current?.contains(target) || target.closest?.('[aria-label="Volume"]')) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLInputElement>('input[type="range"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="volume-pop" role="dialog" aria-label="Volume">
      <span>Volume</span>
      <Range
        value={volume}
        ariaLabel="Volume"
        onChange={(v) => dispatch({ type: 'SET_SETTINGS', patch: { volume: v, muted: false } })}
      />
      <Checkbox checked={muted} onChange={(v) => dispatch({ type: 'SET_SETTINGS', patch: { muted: v } })}>
        Mute
      </Checkbox>
    </div>
  );
}
